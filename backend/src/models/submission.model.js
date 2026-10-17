const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem reference is required'],
      index: true
    },
    language: {
      type: String,
      enum: {
        values: ['python', 'c', 'cpp', 'java'],
        message: '{VALUE} is not a supported submission language'
      },
      required: [true, 'Programming language is required']
    },
    code: {
      type: String,
      required: [true, 'Source code is required']
    },
    status: {
      type: String,
      enum: {
        values: [
          'Accepted',
          'Wrong Answer',
          'Time Limit Exceeded',
          'Compilation Error',
          'Runtime Error'
        ],
        message: '{VALUE} is not a recognized submission status'
      },
      required: [true, 'Execution status verdict is required'],
      index: true
    },
    testCasesPassed: {
      type: Number,
      required: [true, 'Number of passed test cases is required'],
      min: 0,
      default: 0
    },
    totalTestCases: {
      type: Number,
      required: [true, 'Total number of test cases is required'],
      min: 1
    },
    executionTime: {
      type: Number,
      default: 0, // in milliseconds
      min: 0
    },
    memoryUsed: {
      type: Number,
      default: 0, // in kilobytes (KB)
      min: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

// Compound index to quickly fetch student submissions per problem sorted by recent
SubmissionSchema.index({ studentId: 1, problemId: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
