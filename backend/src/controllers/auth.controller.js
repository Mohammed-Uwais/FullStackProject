const jwt = require('jsonwebtoken');
const { User, Student, Staff } = require('../models');
const { JWT_SECRET } = require('../middleware/auth.middleware');

/**
 * Generate standard signed JWT token for student or staff
 */
const generateToken = (userId, role, profileId) => {
  return jwt.sign(
    {
      id: userId,
      role: role,
      profileId: profileId
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Register a new Student account
 * POST /api/auth/register/student
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, rollNumber, department, batch } = req.body;

    // Field presence validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Resolve or generate unique roll number
    const finalRoll = (rollNumber && rollNumber.trim()) 
      ? rollNumber.toUpperCase().trim() 
      : ('ROLL-' + Date.now().toString(36).toUpperCase());

    const existingRoll = await Student.findOne({ rollNumber: finalRoll });
    if (existingRoll) {
      return res.status(409).json({
        success: false,
        message: 'A student profile with this roll number is already registered.'
      });
    }

    // 1. Create Base User with role 'student'
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: 'student'
    });
    const savedUser = await newUser.save();

    // 2. Create Student Profile
    const newStudent = new Student({
      userId: savedUser._id,
      rollNumber: rollNumber.toUpperCase().trim(),
      department: department.trim(),
      batch: batch.trim(),
      currentStreak: 0,
      longestStreak: 0,
      totalSolved: 0
    });
    const savedStudent = await newStudent.save();

    // 3. Issue JWT Token
    const token = generateToken(savedUser._id, 'student', savedStudent._id);

    return res.status(201).json({
      success: true,
      message: 'Student registration completed successfully.',
      token,
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        createdAt: savedUser.createdAt
      },
      profile: savedStudent
    });
  } catch (error) {
    console.error('[Auth Error - Register Student]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating student account.',
      error: error.message
    });
  }
};

/**
 * Register a new Staff account
 * POST /api/auth/register/staff
 */
const registerStaff = async (req, res) => {
  try {
    const { name, email, password, employeeId, department, designation } = req.body;

    // Field presence validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Check or generate employeeId
    const finalEmp = (employeeId && employeeId.trim())
      ? employeeId.toUpperCase().trim()
      : ('EMP-' + Date.now().toString(36).toUpperCase());

    const existingEmployee = await Staff.findOne({ employeeId: finalEmp });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'A staff profile with this employee ID is already registered.'
      });
    }

    // 1. Create Base User with role 'staff'
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: 'staff'
    });
    const savedUser = await newUser.save();

    // 2. Create Staff Profile
    const newStaff = new Staff({
      userId: savedUser._id,
      employeeId: employeeId.toUpperCase().trim(),
      department: department.trim(),
      designation: designation.trim()
    });
    const savedStaff = await newStaff.save();

    // 3. Issue JWT Token
    const token = generateToken(savedUser._id, 'staff', savedStaff._id);

    return res.status(201).json({
      success: true,
      message: 'Staff registration completed successfully.',
      token,
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        createdAt: savedUser.createdAt
      },
      profile: savedStaff
    });
  } catch (error) {
    console.error('[Auth Error - Register Staff]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating staff account.',
      error: error.message
    });
  }
};

/**
 * Universal Login for Student and Staff
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Retrieve user including password hash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.'
      });
    }

    // Fetch corresponding profile
    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      profile = await Staff.findOne({ userId: user._id });
    }

    // Issue JWT Token
    const token = generateToken(user._id, user.role, profile ? profile._id : null);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      profile
    });
  } catch (error) {
    console.error('[Auth Error - Login]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: error.message
    });
  }
};

/**
 * Get authenticated user profile and permissions
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      },
      profile: req.profile
    });
  } catch (error) {
    console.error('[Auth Error - GetMe]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile data.',
      error: error.message
    });
  }
};

module.exports = {
  registerStudent,
  registerStaff,
  login,
  getMe
};
