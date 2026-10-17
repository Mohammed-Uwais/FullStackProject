const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true
    },
    rollNumber: {
      type: String,
      required: [true, 'College roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    department: {
      type: String,
      required: [true, 'Department is required (e.g., CSE, IT, ECE, AI&DS)'],
      trim: true,
      index: true
    },
    batch: {
      type: String,
      required: [true, 'Batch year is required (e.g., 2022-2026)'],
      trim: true,
      index: true
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: [0, 'Streak cannot be negative']
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: [0, 'Longest streak cannot be negative']
    },
    totalSolved: {
      type: Number,
      default: 0,
      min: [0, 'Total solved count cannot be negative']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Student', StudentSchema);
