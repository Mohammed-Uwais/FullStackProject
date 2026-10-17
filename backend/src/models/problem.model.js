const mongoose = require('mongoose');

const ExampleSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: '' }
  },
  { _id: false }
);

const TestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false }
  },
  { _id: false }
);

const HiddenTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true }
  },
  { _id: false }
);

const ProblemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      index: true
    },
    statement: {
      type: String,
      required: [true, 'Problem statement is required']
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid difficulty level (Easy, Medium, Hard)'
      },
      required: [true, 'Difficulty is required'],
      index: true
    },
    topic: {
      type: String,
      required: [true, 'Topic tag is required (e.g., Arrays, Dynamic Programming)'],
      trim: true,
      index: true
    },
    constraints: {
      type: [String],
      default: []
    },
    inputFormat: {
      type: String,
      required: [true, 'Input format specification is required']
    },
    outputFormat: {
      type: String,
      required: [true, 'Output format specification is required']
    },
    examples: {
      type: [ExampleSchema],
      default: []
    },
    testCases: {
      type: [TestCaseSchema],
      default: []
    },
    hiddenTestCases: {
      type: [HiddenTestCaseSchema],
      default: []
    },
    allowedLanguages: {
      type: [String],
      enum: ['python', 'c', 'cpp', 'java'],
      default: ['python', 'c', 'cpp', 'java']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (Staff User) ID is required']
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

module.exports = mongoose.model('Problem', ProblemSchema);
