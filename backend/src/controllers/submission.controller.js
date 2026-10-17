const mongoose = require('mongoose');
const { Submission, Problem, Student, DailyProblem } = require('../models');
const { executeCode } = require('../utils/runner');

/**
 * Safely resolves problem by ObjectId, title or fallback to latest problem
 */
async function resolveProblem(problemId) {
  if (problemId && mongoose.Types.ObjectId.isValid(problemId)) {
    const p = await Problem.findById(problemId);
    if (p) return p;
  }
  if (typeof problemId === 'string' && problemId.trim()) {
    const byTitle = await Problem.findOne({ title: { $regex: problemId, $options: 'i' } });
    if (byTitle) return byTitle;
  }
  return await Problem.findOne().sort({ createdAt: -1 });
}

/**
 * Execute test cases against code (Dry-run mode)
 * POST /api/submissions/execute
 */
const executeTestCases = async (req, res) => {
  try {
    const { problemId, language, code, testCases } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Source code is required.'
      });
    }

    const problem = await resolveProblem(problemId);
    const targetCases = (testCases && testCases.length) ? testCases : (problem ? problem.testCases : []);

    if (!targetCases || targetCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No test cases available for execution.'
      });
    }

    // Real sandbox evaluation
    const result = await executeCode(language || 'python', code, targetCases);

    return res.status(200).json({
      success: true,
      status: result.status,
      testCasesPassed: result.testCasesPassed,
      totalTestCases: result.totalTestCases,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      testCaseResults: result.testCaseResults
    });
  } catch (error) {
    console.error('[Submission - Execute Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Sandbox execution error: ' + error.message,
      error: error.message
    });
  }
};

/**
 * Submit Solution & Persist Submission into MongoDB Atlas (Updates Streaks & Solved counts)
 * POST /api/submissions
 */
const submitSolution = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Source code is required.'
      });
    }

    const problem = await resolveProblem(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found in database.'
      });
    }

    // Combine public and hidden test cases for final assessment
    const allCases = [...problem.testCases, ...(problem.hiddenTestCases || [])];
    const targetCases = allCases.length > 0 ? allCases : [{ input: '0', expectedOutput: '0' }];

    // Real sandbox evaluation
    const result = await executeCode(language || 'python', code, targetCases);

    // Persist Submission document to MongoDB Atlas
    let studentId = req.student ? req.student._id : null;
    if (!studentId && req.user && req.user.role === 'student') {
      let student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        student = await Student.create({
          userId: req.user._id,
          rollNumber: 'ROLL-' + req.user._id.toString().substring(18).toUpperCase(),
          department: 'Computer Science & Engineering',
          batch: '2022-2026',
          currentStreak: 0,
          longestStreak: 0,
          totalSolved: 0
        });
      }
      studentId = student._id;
    }

    let savedSubmission = null;
    if (studentId) {
      const submission = new Submission({
        studentId,
        problemId: problem._id,
        language: language || 'python',
        code,
        status: result.status,
        testCasesPassed: result.testCasesPassed,
        totalTestCases: result.totalTestCases,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        submittedAt: new Date()
      });

      savedSubmission = await submission.save();

      // If solution is accepted, update Student streak & totalSolved in MongoDB Atlas (prevent double-counting)
      if (result.status === 'Accepted') {
        const student = await Student.findById(studentId);
        if (student) {
          const alreadySolved = await Submission.exists({
            studentId,
            problemId: problem._id,
            status: 'Accepted',
            _id: { $ne: savedSubmission._id }
          });

          if (!alreadySolved) {
            student.totalSolved += 1;
            student.currentStreak += 1;
            if (student.currentStreak > student.longestStreak) {
              student.longestStreak = student.currentStreak;
            }
            await student.save();
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Submission evaluated and stored in MongoDB Atlas.',
      status: result.status,
      testCasesPassed: result.testCasesPassed,
      totalTestCases: result.totalTestCases,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      testCaseResults: result.testCaseResults,
      submission: savedSubmission
    });
  } catch (error) {
    console.error('[Submission - Submit Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process submission in database: ' + error.message,
      error: error.message
    });
  }
};

/**
 * Retrieve personal submission history for logged in student
 * GET /api/submissions/my
 */
const getMySubmissions = async (req, res) => {
  try {
    if (!req.student) {
      return res.status(403).json({
        success: false,
        message: 'Only students can view personal submission libraries.'
      });
    }

    const submissions = await Submission.find({ studentId: req.student._id })
      .populate('problemId', 'title difficulty topic statement inputFormat outputFormat constraints examples testCases allowedLanguages')
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal submission library.',
      error: error.message
    });
  }
};

/**
 * Get Department & Batch Leaderboard from MongoDB Atlas
 * GET /api/submissions/leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const { department, batch } = req.query;
    const filter = {};

    if (department && department !== 'All') {
      filter.department = department;
    }
    if (batch && batch !== 'All') {
      filter.batch = batch;
    }

    const totalProblems = await Problem.countDocuments();

    const students = await Student.find(filter)
      .populate('userId', 'name email')
      .sort({ totalSolved: -1, currentStreak: -1 })
      .limit(50);

    const rankings = students.map((std, idx) => {
      const solved = std.totalSolved || 0;
      const accuracyRate = totalProblems > 0
        ? Math.min(100, Number(((solved / totalProblems) * 100).toFixed(1)))
        : 0;

      return {
        rank: idx + 1,
        name: std.userId ? std.userId.name : 'Engineering Student',
        rollNumber: std.rollNumber,
        department: std.department,
        batch: std.batch,
        currentStreak: std.currentStreak,
        longestStreak: std.longestStreak,
        totalSolved: solved,
        accuracyRate: accuracyRate
      };
    });

    return res.status(200).json({
      success: true,
      count: rankings.length,
      totalProblems,
      leaderboard: rankings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate leaderboard from database.',
      error: error.message
    });
  }
};

/**
 * Get Students who have successfully solved a specific problem (e.g. today's daily problem)
 * GET /api/submissions/problem/:problemId/solvers
 */
const getProblemSolvers = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { date } = req.query;

    if (!problemId || !mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid problem ID is required.'
      });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.'
      });
    }

    const submissionFilter = {
      problemId: problem._id,
      status: 'Accepted'
    };

    let statusNote = '';

    // If staff is inspecting solvers for a scheduled daily problem date
    if (date) {
      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        // Scheduled for a future date (e.g. tomorrow) -> has not started yet!
        return res.status(200).json({
          success: true,
          problemId: problem._id,
          problemTitle: problem.title,
          scheduledDate: date,
          statusNote: `Scheduled for ${date}. This daily challenge has not started yet.`,
          totalSolvedCount: 0,
          solvers: []
        });
      }

      // Check daily problem binding timestamp
      const dailyBinding = await DailyProblem.findOne({ date, problemId: problem._id });
      if (dailyBinding && dailyBinding.createdAt) {
        const windowStart = dailyBinding.createdAt;
        const windowEnd = new Date(windowStart.getTime() + (24 * 60 * 60 * 1000));
        submissionFilter.submittedAt = { $gte: windowStart, $lte: windowEnd };
        statusNote = `Showing verified solvers submitted during the 24-hour daily window for ${date}.`;
      } else {
        const dayStart = new Date(date + 'T00:00:00.000Z');
        const dayEnd = new Date(date + 'T23:59:59.999Z');
        submissionFilter.submittedAt = { $gte: dayStart, $lte: dayEnd };
        statusNote = `Showing verified solvers submitted on ${date}.`;
      }
    }

    // Retrieve all accepted submissions matching filter
    const submissions = await Submission.find(submissionFilter)
      .populate({
        path: 'studentId',
        select: 'rollNumber department batch userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ submittedAt: -1 });

    // Deduplicate by student, keeping their latest accepted submission
    const studentMap = new Map();
    submissions.forEach((sub) => {
      if (sub.studentId) {
        const studentKey = sub.studentId._id.toString();
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, {
            submissionId: sub._id,
            studentId: sub.studentId._id,
            name: sub.studentId.userId ? sub.studentId.userId.name : 'Student',
            email: sub.studentId.userId ? sub.studentId.userId.email : '',
            rollNumber: sub.studentId.rollNumber,
            department: sub.studentId.department,
            batch: sub.studentId.batch,
            language: sub.language,
            executionTime: sub.executionTime,
            memoryUsed: sub.memoryUsed,
            testCasesPassed: sub.testCasesPassed,
            totalTestCases: sub.totalTestCases,
            submittedAt: sub.submittedAt
          });
        }
      }
    });

    const solvers = Array.from(studentMap.values());

    return res.status(200).json({
      success: true,
      problemId: problem._id,
      problemTitle: problem.title,
      statusNote,
      totalSolvedCount: solvers.length,
      solvers
    });
  } catch (error) {
    console.error('[Submission - Solvers Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve solved students list: ' + error.message,
      error: error.message
    });
  }
};

module.exports = {
  executeTestCases,
  submitSolution,
  getMySubmissions,
  getLeaderboard,
  getProblemSolvers
};
