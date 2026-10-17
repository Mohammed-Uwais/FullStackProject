const { Problem, DailyProblem, User } = require('../models');

/**
 * Create a new Problem in the Problem Bank (Staff only)
 * POST /api/problems
 */
const createProblem = async (req, res) => {
  try {
    const {
      title,
      statement,
      difficulty,
      topic,
      constraints,
      inputFormat,
      outputFormat,
      examples,
      testCases,
      hiddenTestCases,
      allowedLanguages
    } = req.body;

    if (!title || !title.trim() || !statement || !statement.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Problem Title and Statement are mandatory.'
      });
    }

    // Sanitize test cases
    let finalTestCases = Array.isArray(testCases) && testCases.length > 0 
      ? testCases.filter(tc => tc && tc.input !== undefined && tc.expectedOutput !== undefined)
      : [];

    if (finalTestCases.length === 0) {
      finalTestCases = [{ input: '5', expectedOutput: '1 2 3 4 5', isHidden: false }];
    }

    // Sanitize hidden test cases
    let finalHiddenTestCases = Array.isArray(hiddenTestCases) && hiddenTestCases.length > 0
      ? hiddenTestCases.filter(tc => tc && tc.input !== undefined && tc.expectedOutput !== undefined)
      : [];

    // Auto-generate examples from public test cases if not explicitly provided
    let finalExamples = Array.isArray(examples) && examples.length > 0 ? examples : [];
    if (finalExamples.length === 0 && finalTestCases.length > 0) {
      finalExamples = finalTestCases.slice(0, 2).map((tc, idx) => ({
        input: String(tc.input).trim(),
        output: String(tc.expectedOutput).trim(),
        explanation: `Sample evaluation case ${idx + 1}`
      }));
    }

    // Normalize constraints
    let finalConstraints = [];
    if (Array.isArray(constraints) && constraints.length > 0) {
      finalConstraints = constraints;
    } else if (typeof constraints === 'string' && constraints.trim()) {
      finalConstraints = constraints.split('\n').map(c => c.trim()).filter(Boolean);
    } else {
      finalConstraints = ['1 <= n <= 10^5'];
    }

    // Resolve creator ID: if req.user exists, use it. Otherwise, fallback to an active staff user
    let creatorId = req.user ? req.user._id : null;
    if (!creatorId) {
      const defaultStaff = await User.findOne({ role: 'staff' });
      if (defaultStaff) {
        creatorId = defaultStaff._id;
      } else {
        const anyUser = await User.findOne();
        if (anyUser) creatorId = anyUser._id;
      }
    }

    const problem = new Problem({
      title: title.trim(),
      statement: statement.trim(),
      difficulty: difficulty || 'Medium',
      topic: (topic && topic.trim()) ? topic.trim() : 'General Algorithms',
      constraints: finalConstraints,
      inputFormat: (inputFormat && inputFormat.trim()) ? inputFormat.trim() : 'Standard Input parameters',
      outputFormat: (outputFormat && outputFormat.trim()) ? outputFormat.trim() : 'Standard Output result',
      examples: finalExamples,
      testCases: finalTestCases,
      hiddenTestCases: finalHiddenTestCases,
      allowedLanguages: allowedLanguages || ['python', 'c', 'cpp', 'java'],
      createdBy: creatorId
    });

    const savedProblem = await problem.save();
    console.log(`[Problem Controller] New Problem created in MongoDB: "${savedProblem.title}" (ID: ${savedProblem._id})`);

    return res.status(201).json({
      success: true,
      message: 'Problem authored and saved to MongoDB.',
      problem: savedProblem
    });
  } catch (error) {
    console.error('[Problem Controller - Create]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to author problem in database.',
      error: error.message
    });
  }
};

/**
 * Get all Problems in the Problem Bank
 * GET /api/problems
 */
const getAllProblems = async (req, res) => {
  try {
    const { difficulty, topic, search } = req.query;
    const filter = {};

    if (difficulty) filter.difficulty = difficulty;
    if (topic) filter.topic = topic;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // If requester is student, omit hidden test cases
    const isStaff = req.user && req.user.role === 'staff';
    const projection = isStaff ? {} : { hiddenTestCases: 0 };

    const problems = await Problem.find(filter, projection)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('[Problem Controller - GetAll]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve problems from database.',
      error: error.message
    });
  }
};

/**
 * Get Single Problem by ID
 * GET /api/problems/:id
 */
const getProblemById = async (req, res) => {
  try {
    const isStaff = req.user && req.user.role === 'staff';
    const projection = isStaff ? {} : { hiddenTestCases: 0 };

    const problem = await Problem.findById(req.params.id, projection)
      .populate('createdBy', 'name email role');
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.'
      });
    }

    return res.status(200).json({
      success: true,
      problem
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching problem details.',
      error: error.message
    });
  }
};

/**
 * Schedule a Problem as the Daily Challenge (Staff only)
 * POST /api/problems/schedule
 */
const scheduleDailyProblem = async (req, res) => {
  try {
    const { date, problemId } = req.body;

    if (!date || !problemId) {
      return res.status(400).json({
        success: false,
        message: 'Both date (YYYY-MM-DD) and problemId are required.'
      });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem does not exist in Problem Bank.'
      });
    }

    // Resolve publisher ID safely
    let publishedById = req.user ? req.user._id : null;
    if (!publishedById) {
      const defaultStaff = await User.findOne({ role: 'staff' });
      if (defaultStaff) publishedById = defaultStaff._id;
      else {
        const anyUser = await User.findOne();
        if (anyUser) publishedById = anyUser._id;
      }
    }

    // Upsert calendar binding
    const daily = await DailyProblem.findOneAndUpdate(
      { date },
      {
        date,
        problemId: problem._id,
        publishedBy: publishedById,
        createdAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('problemId');

    return res.status(200).json({
      success: true,
      message: `Problem "${problem.title}" successfully scheduled for ${date}.`,
      dailyProblem: daily
    });
  } catch (error) {
    console.error('[Problem Controller - Schedule]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule daily problem.',
      error: error.message
    });
  }
};

/**
 * Get Today's Daily Problem
 * GET /api/problems/daily/today
 */
const getTodayProblem = async (req, res) => {
  try {
    // Disable HTTP caching so client always gets fresh server timestamp
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const today = new Date().toISOString().split('T')[0];
    let daily = await DailyProblem.findOne({ date: today })
      .populate({
        path: 'problemId',
        populate: { path: 'createdBy', select: 'name email role' }
      });

    // Also check if there is an active challenge scheduled within the last 24h if today not explicitly bound
    if (!daily || !daily.problemId) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      daily = await DailyProblem.findOne({ createdAt: { $gte: cutoff } })
        .sort({ createdAt: -1 })
        .populate({
          path: 'problemId',
          populate: { path: 'createdBy', select: 'name email role' }
        });
    }

    // If staff has not selected a problem -> return empty
    if (!daily || !daily.problemId) {
      return res.status(200).json({
        success: true,
        isScheduled: false,
        date: today,
        message: 'Staff has not yet selected today\'s daily problem. You can solve any other problem from the Problem Bank below.',
        problem: null
      });
    }

    // 24-hour expiration rule: count starts at 0 upon scheduling, expires after 24 hours
    const now = new Date();
    const scheduledAt = new Date(daily.createdAt || daily._id.getTimestamp());
    const elapsedMs = now.getTime() - scheduledAt.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (elapsedMs >= twentyFourHoursMs) {
      // 24 hours have elapsed -> automatically remove from daily problem section
      await DailyProblem.deleteOne({ _id: daily._id });
      return res.status(200).json({
        success: true,
        isScheduled: false,
        expired: true,
        date: today,
        message: 'Staff has not yet selected today\'s daily problem. The previous challenge 24-hour window has expired.',
        problem: null
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((twentyFourHoursMs - elapsedMs) / 1000));
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const expiresAt = new Date(scheduledAt.getTime() + twentyFourHoursMs).toISOString();

    // Omit hidden test cases for students
    const isStaff = req.user && req.user.role === 'staff';
    const problemObj = daily.problemId.toObject ? daily.problemId.toObject() : daily.problemId;
    if (!isStaff && problemObj.hiddenTestCases) {
      delete problemObj.hiddenTestCases;
    }

    return res.status(200).json({
      success: true,
      isScheduled: true,
      date: daily.date,
      scheduledAt: daily.createdAt,
      expiresAt: expiresAt,
      serverTime: now.toISOString(),
      elapsedSeconds,
      remainingSeconds,
      problem: problemObj
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily problem.',
      error: error.message
    });
  }
};

/**
 * Get All Scheduled Daily Problems
 * GET /api/problems/daily/schedule
 */
const getDailySchedule = async (req, res) => {
  try {
    const list = await DailyProblem.find()
      .populate('problemId')
      .populate('publishedBy', 'name email')
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: list.length,
      schedules: list
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily schedules.',
      error: error.message
    });
  }
};

/**
 * Clear Daily Problem for a Date
 * DELETE /api/problems/daily/:date
 */
const clearDailyProblem = async (req, res) => {
  try {
    const { date } = req.params;
    await DailyProblem.findOneAndDelete({ date });
    return res.status(200).json({
      success: true,
      message: `Daily problem for ${date} removed.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to clear daily problem.',
      error: error.message
    });
  }
};

/**
 * Delete a Problem (Staff only)
 * DELETE /api/problems/:id
 */
const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.'
      });
    }

    // Also remove calendar bindings
    await DailyProblem.deleteMany({ problemId: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Problem and associated calendar schedules removed from database.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete problem.',
      error: error.message
    });
  }
};

module.exports = {
  createProblem,
  getAllProblems,
  getProblemById,
  scheduleDailyProblem,
  getTodayProblem,
  getDailySchedule,
  clearDailyProblem,
  deleteProblem
};
