const mongoose = require('mongoose');

const DailyProblemSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Calendar date is required (format: YYYY-MM-DD)'],
      unique: true,
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must match YYYY-MM-DD format']
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem reference is required']
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff publisher reference is required']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model('DailyProblem', DailyProblemSchema);
