const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee'); // We need this to link users to employees
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Your middleware

// Helper to get employee ID for the logged-in user
// THIS IS CRUCIAL: You MUST have a way to link a User (req.user.id) to an Employee document.
// The best way is to add 'employeeProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }'
// to your server/models/User.js file. Then when a user logs in, their employeeProfile can be populated.
const getEmployeeIdForUser = async (userId) => {
  // Assuming your User model now has an 'employeeProfile' field that links to Employee._id
  const User = require('../models/User'); // Import User model here if not already
  const user = await User.findById(userId); // Find the user by ID
  if (user && user.employeeProfile) {
    return user.employeeProfile; // Return the linked employee profile ID
  }
  // Fallback: If no direct link on User model, try to find by email (less robust)
  // You would need to import the User model at the top of this file for this.
  // const userByEmail = await User.findById(userId);
  // if (userByEmail) {
  //   const employeeByEmail = await Employee.findOne({ email: userByEmail.email });
  //   if (employeeByEmail) return employeeByEmail._id;
  // }
  return null; // No linked employee found
};


// @desc    Employee checks in
// @route   POST /api/attendance/check-in
// @access  Private (Employee, HR Admin can also check-in for others if needed, but typically employee self-service)
router.post('/check-in', protect, async (req, res) => {
  const userId = req.user.id;
  const employeeId = await getEmployeeIdForUser(userId);

  if (!employeeId) {
    return res.status(404).json({ message: 'Employee profile not found for this user.' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize date to start of today

  try {
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Up to end of today
      }
    });

    if (attendance && attendance.checkInTime) {
      return res.status(400).json({ message: 'Already checked in for today.' });
    }

    if (attendance) {
      // If a record exists but no check-in (e.g., manually created absent record), update it
      attendance.checkInTime = new Date();
      attendance.status = 'present';
    } else {
      // Create new attendance record
      attendance = new Attendance({
        employee: employeeId,
        date: today, // Store as start of day for unique index
        checkInTime: new Date(),
        status: 'present',
      });
    }

    await attendance.save();
    res.status(201).json({ message: 'Check-in successful!', attendance });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'You have already checked in for today.' });
    }
    res.status(500).json({ message: 'Server error during check-in.' });
  }
});

// @desc    Employee checks out
// @route   POST /api/attendance/check-out
// @access  Private (Employee)
router.post('/check-out', protect, async (req, res) => {
  const userId = req.user.id;
  const employeeId = await getEmployeeIdForUser(userId);

  if (!employeeId) {
    return res.status(404).json({ message: 'Employee profile not found for this user.' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'Already checked out for today.' });
    }
    if (!attendance.checkInTime) {
        return res.status(400).json({ message: 'Cannot check out without a check-in time.' });
    }

    attendance.checkOutTime = new Date();

    // Calculate hours worked
    const durationMs = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
    attendance.hoursWorked = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2)); // Hours with 2 decimal places

    // Optionally update status based on hours worked (e.g., full-day, half-day)
    if (attendance.hoursWorked >= 4 && attendance.hoursWorked < 8) { // Example for half-day
        attendance.status = 'half-day';
    } else if (attendance.hoursWorked >= 8) { // Example for full day
        attendance.status = 'present';
    } else if (attendance.hoursWorked > 0 && attendance.hoursWorked < 4) {
        attendance.status = 'partial-present'; // Custom status for very short periods
    }


    await attendance.save();
    res.json({ message: 'Check-out successful!', attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during check-out.' });
  }
});

// @desc    Get attendance records (for HR Admin, Manager, or self)
// @route   GET /api/attendance
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    const { employeeId, startDate, endDate } = req.query; // Filters

    if (req.user.role === 'employee') {
      const selfEmployeeId = await getEmployeeIdForUser(req.user.id);
      if (!selfEmployeeId) {
        return res.status(404).json({ message: 'Employee profile not found for this user.' });
      }
      query.employee = selfEmployeeId;
    } else if (req.user.role === 'manager') {
      // Managers only see their direct reports' attendance
      const managedEmployees = await Employee.find({ manager: req.user.id }); // Assuming Employee has a 'manager' field referencing User._id
      const managedEmployeeIds = managedEmployees.map(emp => emp._id);
      query.employee = { $in: managedEmployeeIds };
    }
    // HR Admin sees all if no specific employeeId is provided, or filters if it is.

    if (employeeId && (req.user.role === 'hr_admin' || (req.user.role === 'manager' && query.employee && query.employee.$in.some(id => id.toString() === employeeId)))) {
        // If manager, ensure the queried employeeId is one of their direct reports
        if (req.user.role === 'manager' && query.employee && !query.employee.$in.some(id => id.toString() === employeeId)) {
            return res.status(403).json({ message: 'Not authorized to view this employee\'s attendance.' });
        }
        query.employee = employeeId;
    }

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    } else if (startDate) {
        query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.date = { $lte: new Date(endDate) };
    }


    const attendanceRecords = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId email department')
      .sort({ date: -1 }); // Newest first

    res.json(attendanceRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching attendance records.' });
  }
});

// @desc    Get attendance records for a specific employee
// @route   GET /api/attendance/employee/:id
// @access  Private (HR Admin, Manager, or the employee themselves)
router.get('/employee/:id', protect, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const selfEmployeeId = await getEmployeeIdForUser(req.user.id);

    // Authorization:
    // HR Admin can view any employee's attendance.
    // Employee can view only their own attendance.
    // Manager can view their direct reports' attendance.
    const managerManagedEmployees = req.user.role === 'manager' ? await Employee.find({ manager: req.user.id }) : [];
    const isDirectReport = managerManagedEmployees.some(emp => emp._id.toString() === employeeId);


    if (req.user.role === 'hr_admin' ||
        (req.user.role === 'employee' && selfEmployeeId && selfEmployeeId.toString() === employeeId) ||
        (req.user.role === 'manager' && isDirectReport)) {

        const attendanceRecords = await Attendance.find({ employee: employeeId })
            .populate('employee', 'firstName lastName employeeId email department')
            .sort({ date: -1 });
        res.json(attendanceRecords);
    } else {
        return res.status(403).json({ message: 'Not authorized to view this employee\'s attendance records.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching employee attendance.' });
  }
});

// @desc    Manually add/edit attendance (HR Admin only)
// @route   POST /api/attendance/manual
// @access  Private (HR Admin)
router.post('/manual', protect, authorizeRoles('hr_admin'), async (req, res) => {
    const { employee, date, checkInTime, checkOutTime, status, notes } = req.body;

    if (!employee || !date) {
        return res.status(400).json({ message: 'Employee ID and Date are required.' });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0); // Normalize date for consistency

    try {
        let attendance = await Attendance.findOne({
            employee: employee,
            date: {
                $gte: normalizedDate,
                $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        let hoursWorked = 0;
        let finalStatus = status || 'absent'; // Default to absent if no status provided

        // Calculate hours worked if both times are provided
        if (checkInTime && checkOutTime) {
            const checkIn = new Date(checkInTime);
            const checkOut = new Date(checkOutTime);
            if (checkOut < checkIn) {
                return res.status(400).json({ message: 'Check-out time cannot be before check-in time.' });
            }
            const durationMs = checkOut.getTime() - checkIn.getTime();
            hoursWorked = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
            // Only force 'present' if it's a full check-in/out
            if (!status || status === 'present') { // If status wasn't explicitly set, assume present for full times
                finalStatus = 'present';
            }
        } else if (checkInTime || checkOutTime) {
            // If only one time is provided manually, it's a partial entry, status remains as provided or absent
            finalStatus = status || 'partial-entry'; // Custom status for incomplete manual entry
        }


        if (attendance) {
            // Update existing record
            attendance.checkInTime = checkInTime ? new Date(checkInTime) : attendance.checkInTime;
            attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : attendance.checkOutTime;
            attendance.status = finalStatus;
            attendance.hoursWorked = hoursWorked;
            attendance.notes = notes || attendance.notes;
        } else {
            // Create new record
            attendance = new Attendance({
                employee: employee,
                date: normalizedDate,
                checkInTime: checkInTime ? new Date(checkInTime) : null,
                checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
                status: finalStatus,
                hoursWorked: hoursWorked,
                notes: notes,
            });
        }

        await attendance.save();
        res.status(200).json({ message: 'Attendance updated successfully!', attendance });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An attendance record for this employee on this date already exists.' });
        }
        res.status(500).json({ message: 'Server error manually updating attendance.' });
    }
});


// @desc    Delete an attendance record (HR Admin only)
// @route   DELETE /api/attendance/:id
// @access  Private (HR Admin)
router.delete('/:id', protect, authorizeRoles('hr_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting attendance record.' });
  }
});


module.exports = router;