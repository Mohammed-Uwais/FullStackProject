const jwt = require('jsonwebtoken');
const { User, Student, Staff } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'college_dailycoding_super_secret_jwt_key_2026';

/**
 * Middleware: Verify Bearer JWT token and load authenticated user context
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Missing or malformed Bearer token.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user without password
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User no longer exists.'
      });
    }

    // Attach user information
    req.user = user;

    // Attach role-specific profile (Student or Staff)
    if (user.role === 'student') {
      let studentProfile = await Student.findOne({ userId: user._id });
      if (!studentProfile) {
        studentProfile = await Student.create({
          userId: user._id,
          rollNumber: 'ROLL-' + user._id.toString().substring(18).toUpperCase(),
          department: 'Computer Science & Engineering',
          batch: '2022-2026',
          currentStreak: 0,
          longestStreak: 0,
          totalSolved: 0
        });
      }
      req.student = studentProfile;
      req.profile = studentProfile;
    } else if (user.role === 'staff') {
      let staffProfile = await Staff.findOne({ userId: user._id });
      req.staff = staffProfile;
      req.profile = staffProfile;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or tampered authentication token.'
    });
  }
};

/**
 * Optional Auth: Attaches user and student context if valid token is provided,
 * but does not reject unauthenticated/guest requests.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        if (user.role === 'student') {
          let studentProfile = await Student.findOne({ userId: user._id });
          if (!studentProfile) {
            studentProfile = await Student.create({
              userId: user._id,
              rollNumber: 'ROLL-' + user._id.toString().substring(18).toUpperCase(),
              department: 'Computer Science & Engineering',
              batch: '2022-2026',
              currentStreak: 0,
              longestStreak: 0,
              totalSolved: 0
            });
          }
          req.student = studentProfile;
          req.profile = studentProfile;
        } else if (user.role === 'staff') {
          let staffProfile = await Staff.findOne({ userId: user._id });
          req.staff = staffProfile;
          req.profile = staffProfile;
        }
      }
    }
  } catch (err) {
    // Token missing or invalid, proceed as guest
  }
  next();
};

/**
 * Middleware: Enforce role-based access control (STRICTLY 'student' OR 'staff')
 * @param {'student' | 'staff'} allowedRole 
 */
const requireRole = (allowedRole) => {
  // Validate that allowedRole is strictly student or staff
  const VALID_ROLES = ['student', 'staff'];
  if (!VALID_ROLES.includes(allowedRole)) {
    throw new Error(`Invalid role specification in route configuration: ${allowedRole}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated request.'
      });
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This resource is restricted to ${allowedRole} accounts only.`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET
};
