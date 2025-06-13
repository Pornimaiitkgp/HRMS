require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5002;

// --- Middleware ---
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Routes ---
app.get('/', (req, res) => {
  res.send('HRMS Backend API is running!');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes')); // Use employee routes

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});