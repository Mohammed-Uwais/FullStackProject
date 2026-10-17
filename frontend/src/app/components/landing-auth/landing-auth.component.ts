import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/auth.model';

@Component({
  selector: 'app-landing-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-auth.component.html',
  styleUrls: ['./landing-auth.component.css']
})
export class LandingAuthComponent {
  @Output() openGuestPractice = new EventEmitter<void>();

  // Auth State
  authMode: 'login' | 'register' = 'login';
  selectedRole: UserRole = 'student';

  // Form Fields
  name: string = '';
  email: string = '';
  password: string = '';
  
  // Student Specific
  rollNumber: string = '';
  department: string = 'Computer Science & Engineering';
  batch: string = '2022-2026';

  // Staff Specific
  employeeId: string = '';
  staffDepartment: string = 'Computer Science & Engineering';
  designation: string = 'Assistant Professor';

  // UI State
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  departments: string[] = [
    'Computer Science & Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication Engineering',
    'Mechanical Engineering'
  ];

  batches: string[] = ['2021-2025', '2022-2026', '2023-2027', '2024-2028'];

  designations: string[] = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Head of Department (HOD)'
  ];

  constructor(private authService: AuthService) {}

  switchRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage = '';
    this.successMessage = '';
  }

  switchMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.isLoading = true;

    if (this.authMode === 'login') {
      this.authService.login({
        email: this.email,
        password: this.password,
        role: this.selectedRole
      }).subscribe({
        next: () => {
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Login failed. Please verify your credentials.';
        }
      });
    } else {
      // Registration Flow
      if (!this.name) {
        this.isLoading = false;
        this.errorMessage = 'Full name is required.';
        return;
      }

      if (this.selectedRole === 'student') {
        const studentRoll = this.rollNumber ? this.rollNumber.trim() : ('STU-' + Math.floor(1000 + Math.random() * 9000));

        this.authService.registerStudent({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password,
          rollNumber: studentRoll,
          department: this.department,
          batch: this.batch
        }).subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Account created successfully! Signing in...';
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err?.error?.message || 'Failed to create student account.';
          }
        });
      } else {
        // Staff Registration
        const staffEmp = this.employeeId ? this.employeeId.trim() : ('EMP-' + Math.floor(1000 + Math.random() * 9000));

        this.authService.registerStaff({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password,
          employeeId: staffEmp,
          department: this.staffDepartment,
          designation: this.designation
        }).subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Staff account created successfully! Signing in...';
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err?.error?.message || 'Failed to create staff account.';
          }
        });
      }
    }
  }
}
