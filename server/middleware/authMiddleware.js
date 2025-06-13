const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes (ensure user is logged in)
const protect = async (req, res, next) => {
  let token;

  // Check for 'Bearer' token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID and attach to request object (excluding password)
      req.user = await User.findById(decoded.id).select('-password');
      req.user.role = decoded.role; // Ensure role is attached from token for quick access

      next(); // Continue to the next middleware/route handler
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check user roles for authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to access this route' });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };