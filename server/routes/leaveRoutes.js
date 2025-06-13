const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee'); // We'll need this to link leaves to employees
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Helper to check if a user is linked to an employee record
const getEmployeeIdForUser = async (userId) => {
  // This is a crucial step: in a real system, you'd link User to Employee
  // For now, let's assume if an employee user logs in, they are an employee.
  // You will need a way to find the Employee document associated with the logged-in User
  // E.g., by adding a 'userId' field to the Employee model
  // For this example, let's just return a placeholder for now,
  // or assume the User's _id is the Employee's _id for simplicity if they are directly mapped.
  // A more robust solution involves: Employee.findOne({ userRef: userId });
  // Or, the User model has an employeeId field that links to Employee.employeeId

  // TEMP: For now, assuming User._id is roughly equivalent to an employee.
  // In a real app, User.findById(userId) would return a user, which has an 'employeeRef' or similar
  const user = await Employee.findOne({ /* some field linking to User, e.g., userAccount: userId */ email: 'test@example.com' }); // Placeholder
  // If your Employee model has a `userAccount` field that refers to `User._id`:
  const employee = await Employee.findOne({ userAccount: userId }); // Example if you add 'userAccount' field
  if (employee) return employee._id;
  return null; // No linked employee found
};

// @desc    Get all leave requests (for HR Admin/Manager)
//          Or get self leaves (for Employee)
// @route   GET /api/leaves
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let leaves;
    if (req.user.role === 'hr_admin') {
      // HR Admin sees all leaves, including terminated employees (for records)
      leaves = await Leave.find({})
        .populate('employee', 'firstName lastName employeeId email department')
        .populate('approvedBy', 'name email');
    } else if (req.user.role === 'manager') {
      // Manager sees leaves of their direct reports (need to implement this linkage)
      // For now, managers see all leaves for simplicity, or we filter later by managerId
      // This requires a `manager` field in Employee model that references the manager's User._id
      const managerEmployee = await Employee.findOne({ manager: req.user.id }); // If manager field links to User _id
      if (managerEmployee) {
          // Get employees reporting to this manager
          const managedEmployees = await Employee.find({ manager: req.user.id });
          const managedEmployeeIds = managedEmployees.map(emp => emp._id);
          leaves = await Leave.find({ employee: { $in: managedEmployeeIds } })
            .populate('employee', 'firstName lastName employeeId email department')
            .populate('approvedBy', 'name email');
      } else {
          leaves = []; // No employees managed by this user
      }

    } else if (req.user.role === 'employee') {
      // Employee sees only their own leaves
      const employeeId = await getEmployeeIdForUser(req.user.id); // Get employee ID linked to the logged-in user
      if (!employeeId) {
        return res.status(404).json({ message: 'Employee profile not found for this user.' });
      }
      leaves = await Leave.find({ employee: employeeId })
        .populate('employee', 'firstName lastName employeeId email department')
        .populate('approvedBy', 'name email');
    } else {
      return res.status(403).json({ message: 'Not authorized to view leaves.' });
    }
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching leaves' });
  }
});

// @desc    Get a single leave request
// @route   GET /api/leaves/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Authorization: HR Admin, Manager (if it's their direct report's leave), or the employee themselves
    const employeeIdForUser = await getEmployeeIdForUser(req.user.id); // For employee role
    const managerEmployee = await Employee.findOne({ manager: req.user.id }); // For manager role

    if (req.user.role === 'hr_admin' ||
        (req.user.role === 'manager' && managerEmployee && leave.employee._id.equals(managerEmployee._id)) || // Simplified check
        (req.user.role === 'employee' && employeeIdForUser && leave.employee._id.equals(employeeIdForUser))) {
      res.json(leave);
    } else {
      return res.status(403).json({ message: 'Not authorized to view this leave request.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching leave request' });
  }
});

// @desc    Apply for a new leave
// @route   POST /api/leaves
// @access  Private (Employee or HR Admin on behalf of employee)
router.post('/', protect, async (req, res) => {
  const { employee, leaveType, startDate, endDate, reason } = req.body; // 'employee' here is the Employee._id

  // Determine who is applying for leave
  let employeeToApplyFor = employee; // If HR is applying for someone else
  if (req.user.role === 'employee') {
    // If an employee is logged in, they can only apply for themselves
    employeeToApplyFor = await getEmployeeIdForUser(req.user.id);
    if (!employeeToApplyFor) {
      return res.status(400).json({ message: 'Cannot apply for leave without a linked employee profile.' });
    }
  } else if (req.user.role === 'manager' && employeeToApplyFor) {
    // Manager can apply for direct reports (needs more robust check)
    // For simplicity, manager can't apply for others for now.
    return res.status(403).json({ message: 'Managers cannot apply for leave on behalf of others at this time.' });
  }

  if (!employeeToApplyFor) {
    return res.status(400).json({ message: 'Employee ID is required.' });
  }

  try {
    const newLeave = new Leave({
      employee: employeeToApplyFor,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'pending', // Always pending upon creation
    });

    const createdLeave = await newLeave.save();
    res.status(201).json(createdLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error applying for leave' });
  }
});

// @desc    Update leave status (approve/reject/cancel)
// @route   PUT /api/leaves/:id/status
// @access  Private (HR Admin, Manager)
router.put('/:id/status', protect, authorizeRoles('hr_admin', 'manager'), async (req, res) => {
  const { status } = req.body; // Can be 'approved', 'rejected', 'cancelled'

  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Authorization specific to manager role: Manager can only approve/reject their direct reports' leaves
    if (req.user.role === 'manager') {
        const employeeBeingApproved = await Employee.findById(leave.employee);
        if (!employeeBeingApproved || employeeBeingApproved.manager.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to approve/reject this leave request.' });
        }
    }
    // HR Admin can approve/reject any leave

    // Validate new status
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    // Prevent updating if already approved/rejected/cancelled (unless specific business logic allows)
    if (leave.status !== 'pending') {
      // You might allow 'cancelled' if already approved, depending on policy
      // For now, let's keep it simple: only 'pending' can be updated to other statuses
      if (leave.status === 'approved' && status === 'cancelled') {
          // Allow approved leaves to be cancelled by HR/Manager if needed
          leave.status = status;
          leave.approvedBy = req.user.id;
          leave.approvalDate = Date.now();
      } else {
          return res.status(400).json({ message: `Leave is already ${leave.status}. Cannot change status from pending.` });
      }
    } else {
        leave.status = status;
        leave.approvedBy = req.user.id;
        leave.approvalDate = Date.now();
    }


    const updatedLeave = await leave.save();
    res.json(updatedLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating leave status' });
  }
});

// @desc    Delete a leave request (HR Admin only, typically for erroneous entries)
// @route   DELETE /api/leaves/:id
// @access  Private (HR Admin only)
router.delete('/:id', protect, authorizeRoles('hr_admin'), async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id); // Or update status to 'deleted'
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting leave request' });
  }
});

module.exports = router;