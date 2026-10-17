require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const { User, Student, Staff, Problem, DailyProblem, Submission } = require('../models');

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI || mongoURI.includes('PASTE_YOUR_MONGODB_ATLAS_URL_HERE')) {
      console.error('\n❌ ERROR: Please update your MONGODB_URI in "backend/.env" with your real MongoDB Atlas connection string before running the seeder.\n');
      process.exit(1);
    }

    console.log(`\nConnecting to MongoDB Atlas...`);
    await mongoose.connect(mongoURI);
    console.log(`✅ Successfully connected to MongoDB Atlas!`);

    const shouldClean = process.argv.includes('--clean') || process.argv.includes('--force');
    const existingCount = await User.countDocuments();
    if (existingCount > 0 && !shouldClean) {
      console.log(`⚠️ Database already contains ${existingCount} users. Seeder will NOT overwrite your existing data.`);
      console.log(`💡 To force a full wipe and reseed, run: npm run seed -- --clean\n`);
      process.exit(0);
    }

    if (shouldClean) {
      console.log(`Clearing existing records (clean reseed requested)...`);
      await User.deleteMany({});
      await Student.deleteMany({});
      await Staff.deleteMany({});
      await Problem.deleteMany({});
      await DailyProblem.deleteMany({});
      await Submission.deleteMany({});
    }

    console.log(`Seeding Staff and Student accounts...`);

    // 1. Create Staff Account
    const staffUser = new User({
      name: 'Dr. Sarah Mitchell',
      email: 's.mitchell@college.edu',
      password: 'StaffPass123!',
      role: 'staff'
    });
    const savedStaffUser = await staffUser.save();

    const staffProfile = new Staff({
      userId: savedStaffUser._id,
      employeeId: 'EMP-9041',
      department: 'Computer Science & Engineering',
      designation: 'Associate Professor & Academic Head'
    });
    await staffProfile.save();

    // 2. Create Student Account
    const studentUser = new User({
      name: 'Alex Johnson',
      email: 'alex.johnson@college.edu',
      password: 'StudentPass123!',
      role: 'student'
    });
    const savedStudentUser = await studentUser.save();

    const studentProfile = new Student({
      userId: savedStudentUser._id,
      rollNumber: '22CS104',
      department: 'Computer Science & Engineering',
      batch: '2022-2026',
      currentStreak: 7,
      longestStreak: 18,
      totalSolved: 12
    });
    const savedStudentProfile = await studentProfile.save();

    // 3. Create Additional Top Students for Leaderboard
    const student2User = await new User({
      name: 'Priya Sharma',
      email: 'priya.s@college.edu',
      password: 'Password123!',
      role: 'student'
    }).save();

    await new Student({
      userId: student2User._id,
      rollNumber: '22CS089',
      department: 'Computer Science & Engineering',
      batch: '2022-2026',
      currentStreak: 28,
      longestStreak: 35,
      totalSolved: 142
    }).save();

    const student3User = await new User({
      name: 'Rohan Verma',
      email: 'rohan.v@college.edu',
      password: 'Password123!',
      role: 'student'
    }).save();

    await new Student({
      userId: student3User._id,
      rollNumber: '22IT045',
      department: 'Information Technology',
      batch: '2022-2026',
      currentStreak: 24,
      longestStreak: 24,
      totalSolved: 138
    }).save();

    console.log(`Seeding Problem Bank with test cases...`);

    // 4. Seed Problems
    const prob1 = await new Problem({
      title: 'Two Sum Problem',
      difficulty: 'Easy',
      topic: 'Arrays & Hashing',
      statement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.'],
      inputFormat: 'Space-separated integers on Line 1, target on Line 2.',
      outputFormat: 'Array of two indices [i, j].',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 9, return [0, 1].' }
      ],
      testCases: [
        { input: '2 7 11 15\n9', expectedOutput: '[0, 1]', isHidden: false },
        { input: '3 2 4\n6', expectedOutput: '[1, 2]', isHidden: false }
      ],
      hiddenTestCases: [
        { input: '1 5 8 10 14\n19', expectedOutput: '[1, 4]' },
        { input: '-3 4 3 90\n0', expectedOutput: '[0, 2]' }
      ],
      allowedLanguages: ['python', 'c', 'cpp', 'java'],
      createdBy: savedStaffUser._id
    }).save();

    const prob2 = await new Problem({
      title: 'Valid Anagram Check',
      difficulty: 'Easy',
      topic: 'Strings & Maps',
      statement: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn Anagram is a word formed by rearranging the letters of a different word.',
      constraints: ['1 <= s.length, t.length <= 5 * 10^4'],
      inputFormat: 'Line 1: string s, Line 2: string t.',
      outputFormat: 'true or false',
      examples: [
        { input: 's = "anagram", t = "nagaram"', output: 'true' }
      ],
      testCases: [
        { input: 'anagram\nnagaram', expectedOutput: 'true', isHidden: false }
      ],
      hiddenTestCases: [
        { input: 'rat\ncar', expectedOutput: 'false' },
        { input: 'a\nab', expectedOutput: 'false' }
      ],
      allowedLanguages: ['python', 'c', 'cpp', 'java'],
      createdBy: savedStaffUser._id
    }).save();

    // 5. Bind Today's Problem
    const today = new Date().toISOString().split('T')[0];
    await new DailyProblem({
      date: today,
      problemId: prob1._id,
      publishedBy: savedStaffUser._id
    }).save();

    // 6. Seed Submissions
    await new Submission({
      studentId: savedStudentProfile._id,
      problemId: prob1._id,
      language: 'python',
      code: `def twoSum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        if target - num in lookup:\n            return [lookup[target - num], i]\n        lookup[num] = i\n    return []`,
      status: 'Accepted',
      testCasesPassed: 4,
      totalTestCases: 4,
      executionTime: 24,
      memoryUsed: 14200,
      submittedAt: new Date()
    }).save();

    console.log(`\n🎉 Seed Completed Successfully!`);
    console.log(`-----------------------------------------------------`);
    console.log(`MongoDB Atlas Database populated with:`);
    console.log(`- 3 Users (1 Staff, 2 Students)`);
    console.log(`- 1 Staff Profile (${staffProfile.employeeId})`);
    console.log(`- 2 Student Profiles (${savedStudentProfile.rollNumber}, 22CS089)`);
    console.log(`- 2 Problems in Problem Bank (Two Sum, Valid Anagram)`);
    console.log(`- 1 Daily Problem bound to today: ${today}`);
    console.log(`- 1 Accepted Submission`);
    console.log(`-----------------------------------------------------\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
