const express = require('express');
const router = express.Router();
const {
  registerStudent,
  registerStaff,
  login,
  getMe
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public Authentication Endpoints
router.post('/register/student', registerStudent);
router.post('/register/staff', registerStaff);
router.post('/login', login);

// Protected Identity & Profile Endpoint
router.get('/me', authenticateToken, getMe);

module.exports = router;
