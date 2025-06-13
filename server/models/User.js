const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Email must be unique for each user
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'], // Basic email validation
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Minimum password length
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'hr_admin'], // Define possible roles
    default: 'employee', // Default role for new users if not specified
    required: true,
  },
  employeeProfile: { // <--- NEW FIELD: Link to Employee model
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null, // Can be null if not yet linked, or for HR/Manager roles directly
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

// Hash password before saving the user (pre-save hook)
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) { // Only hash if password is new or modified
    const salt = await bcrypt.genSalt(10); // Generate a salt
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
  }
  next(); // Continue with the save operation
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);