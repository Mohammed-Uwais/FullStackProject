export type UserRole = 'student' | 'staff';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface StudentProfile {
  _id: string;
  userId: string;
  rollNumber: string;
  department: string;
  batch: string;
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
}

export interface StaffProfile {
  _id: string;
  userId: string;
  employeeId: string;
  department: string;
  designation: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
  profile: StudentProfile | StaffProfile;
}
