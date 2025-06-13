const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee'); // Import the Employee model
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Import middleware

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (HR Admin, Manager can view all; Employees can view limited)
router.get('/', protect, async (req, res) => {
  try {
    let employees;
    if (req.user.role === 'hr_admin' || req.user.role === 'manager') {
      // HR Admins and Managers can see all active employees
      employees = await Employee.find({ status: { $ne: 'terminated' } }).populate('manager', 'name email'); // Populate manager details
    } else {
      // Regular employees can only see their own profile
      // This assumes an employee's user ID matches their employee ID (or we link them)
      // For simplicity, let's say an employee can only view themselves here for now.
      // Later, you'll link User._id to Employee.userId or Employee.employeeId
      // For now, let's just send a generic unauthorized or only their own.
      // A proper HRMS would link Users to Employees
      return res.status(403).json({ message: 'Not authorized to view all employees. Access denied.' });
    }
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching employees' });
  }
});

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
// @access  Private (HR Admin, Manager, or the employee themselves)
router.get('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('manager', 'name email');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Authorization logic:
    // HR Admin or Manager can view any employee.
    // An employee can only view their own profile.
    // NOTE: This assumes employee._id is the same as req.user.id IF req.user.role is 'employee'.
    // In a real HRMS, you'd likely have a specific 'employee_ref_id' on the User model
    // that links to the Employee model's _id or employeeId.
    if (req.user.role === 'employee' && employee._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this employee profile.' });
    }

    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching employee' });
  }
});

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private (HR Admin only)
router.post('/', protect, authorizeRoles('hr_admin'), async (req, res) => {
  const { employeeId, firstName, lastName, email, phone, dateOfJoining, department, designation, salary, manager } = req.body;

  try {
    // Check if employeeId or email already exists
    const employeeExists = await Employee.findOne({ $or: [{ employeeId }, { email }] });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee with this ID or Email already exists.' });
    }

    const employee = new Employee({
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfJoining,
      department,
      designation,
      salary,
      manager: manager || null, // Allow manager to be optional initially
    });

    const createdEmployee = await employee.save();
    res.status(201).json(createdEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating employee' });
  }
});

// @desc    Update an employee
// @route   PUT /api/employees/:id
// @access  Private (HR Admin only)
router.put('/:id', protect, authorizeRoles('hr_admin'), async (req, res) => {
  const { firstName, lastName, email, phone, dateOfJoining, department, designation, salary, status, manager } = req.body;

  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update fields
    employee.firstName = firstName || employee.firstName;
    employee.lastName = lastName || employee.lastName;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.dateOfJoining = dateOfJoining || employee.dateOfJoining;
    employee.department = department || employee.department;
    employee.designation = designation || employee.designation;
    employee.salary = salary || employee.salary;
    employee.status = status || employee.status;
    employee.manager = manager || employee.manager;


    const updatedEmployee = await employee.save();
    res.json(updatedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating employee' });
  }
});

// @desc    Delete an employee (or change status to 'terminated')
// @route   DELETE /api/employees/:id
// @access  Private (HR Admin only)
router.delete('/:id', protect, authorizeRoles('hr_admin'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Instead of true deletion, often in HRMS, we change status to 'terminated'
    employee.status = 'terminated';
    await employee.save();
    // Or to permanently delete:
    // await Employee.deleteOne({ _id: req.params.id });

    res.json({ message: 'Employee removed successfully (status set to terminated)' });
    // Or if you opt for actual deletion:
    // res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting employee' });
  }
});

module.exports = router;