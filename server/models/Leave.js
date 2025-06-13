const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Reference to the Employee model
    required: true,
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'bereavement', 'other'],
    default: 'casual',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    required: true,
  },
  appliedDate: {
    type: Date,
    default: Date.now,
  },
  approvedBy: { // Who approved/rejected the leave
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvalDate: {
    type: Date,
    default: null,
  },
  // You might add fields like leave balance, attachments, etc.
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Leave', LeaveSchema);