const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'], 
  },
  password: {
    type: String,
    required: true,
    
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'hr_admin'], 
    default: 'employee', 
    required: true,
  },

}, {
  timestamps: true, 
});

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) { 
    const salt = await bcrypt.genSalt(10); 
    this.password = await bcrypt.hash(this.password, salt); 
  }
  next(); 
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
