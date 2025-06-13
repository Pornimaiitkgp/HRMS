const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true, // Employee ID must be unique
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Employee email must be unique
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'],
  },
  phone: {
    type: String,
    trim: true,
    // Optional: add regex for phone number validation if needed
  },
  dateOfJoining: {
    type: Date,
    required: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  salary: { // Basic salary field
    type: Number,
    required: true,
    min: 0,
  },
  status: { // e.g., 'Active', 'On Leave', 'Terminated'
    type: String,
    enum: ['active', 'on_leave', 'terminated'],
    default: 'active',
  },
  manager: { // Reference to another employee (manager's employeeId or _id)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming managers are also users in the User collection
    default: null,
  },
  // You can add more fields as needed: address, dateOfBirth, gender, photo, emergency contacts, etc.
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Employee', EmployeeSchema);