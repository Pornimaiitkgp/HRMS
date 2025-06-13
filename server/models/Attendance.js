const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Links to the Employee model
    required: true,
  },
  date: {
    type: Date,
    required: true,
    // Ensures only one attendance record per employee per day
    // This is important for check-in/check-out logic and manual entry
    // The index ensures `date` is stored at the start of the day (00:00:00)
    // and combined with employee, makes a unique entry.
  },
  checkInTime: {
    type: Date,
    default: null, // Can be null if manually marked absent
  },
  checkOutTime: {
    type: Date,
    default: null, // Can be null if not checked out yet or manually marked absent
  },
  hoursWorked: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'partial-present', 'leave'], // Add 'leave' if you link with leave module
    default: 'absent',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Create a unique compound index to ensure only one attendance record per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);