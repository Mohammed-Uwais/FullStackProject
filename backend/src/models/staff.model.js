const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true
    },
    employeeId: {
      type: String,
      required: [true, 'Staff employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required (e.g., Assistant Professor, HOD)'],
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Staff', StaffSchema);
