const express = require('express');
const router = express.Router();
const {
  executeTestCases,
  submitSolution,
  getMySubmissions,
  getLeaderboard,
  getProblemSolvers
} = require('../controllers/submission.controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');

// Public / Playground Dry-run execution
router.post('/execute', executeTestCases);

// Public / Department Leaderboard
router.get('/leaderboard', getLeaderboard);

// View Students who solved a specific problem (Daily challenge or Problem Bank)
router.get('/problem/:problemId/solvers', getProblemSolvers);

// Student Submission (Persists to Atlas if authenticated)
router.post('/', optionalAuth, submitSolution);
router.get('/my', authenticateToken, getMySubmissions);

module.exports = router;
