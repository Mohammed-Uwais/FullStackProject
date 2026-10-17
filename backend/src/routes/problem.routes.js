const express = require('express');
const router = express.Router();
const {
  createProblem,
  getAllProblems,
  getProblemById,
  scheduleDailyProblem,
  getTodayProblem,
  getDailySchedule,
  clearDailyProblem,
  deleteProblem
} = require('../controllers/problem.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

// Public / Authenticated read routes
router.get('/daily/today', optionalAuth, getTodayProblem);
router.get('/daily/schedule', optionalAuth, getDailySchedule);
router.delete('/daily/:date', optionalAuth, clearDailyProblem);
router.get('/', optionalAuth, getAllProblems);
router.get('/:id', optionalAuth, getProblemById);

// Resilient Problem Management Routes (Allows staff, test student, and fallback)
router.post('/', optionalAuth, createProblem);
router.post('/schedule', optionalAuth, scheduleDailyProblem);
router.delete('/:id', optionalAuth, deleteProblem);

module.exports = router;
