require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5002; // <--- MAKE SURE THIS IS 5002 if your frontend uses 5002 consistently

// --- Middleware ---
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Import Route Files ---
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes'); // <--- NEW: Import attendance routes

// --- Routes ---
app.get('/', (req, res) => {
  res.send('HRMS Backend API is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes); // <--- NEW: Use attendance routes

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});