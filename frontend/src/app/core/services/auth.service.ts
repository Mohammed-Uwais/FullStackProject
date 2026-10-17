import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthResponse, User, UserRole, StudentProfile, StaffProfile } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:5000/api/auth';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private currentProfileSubject = new BehaviorSubject<StudentProfile | StaffProfile | null>(null);
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('cd_user');
    const storedProfile = localStorage.getItem('cd_profile');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('cd_user');
      }
    }
    if (storedProfile) {
      try {
        this.currentProfileSubject.next(JSON.parse(storedProfile));
      } catch (e) {
        localStorage.removeItem('cd_profile');
      }
    }
  }

  /**
   * Register a new Student account
   */
  registerStudent(payload: {
    name: string;
    email: string;
    password: string;
    rollNumber: string;
    department: string;
    batch: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/student`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  /**
   * Register a new Staff account
   */
  registerStaff(payload: {
    name: string;
    email: string;
    password: string;
    employeeId: string;
    department: string;
    designation: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/staff`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  /**
   * Universal Login for Student or Staff
   */
  login(credentials: { email: string; password: string; role?: UserRole }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }


  private handleAuthSuccess(res: AuthResponse): void {
    if (res.success && res.token) {
      localStorage.setItem('cd_auth_token', res.token);
      localStorage.setItem('cd_user', JSON.stringify(res.user));
      localStorage.setItem('cd_profile', JSON.stringify(res.profile));
      this.currentUserSubject.next(res.user);
      this.currentProfileSubject.next(res.profile);
    }
  }

  logout(): void {
    localStorage.removeItem('cd_auth_token');
    localStorage.removeItem('cd_user');
    localStorage.removeItem('cd_profile');
    this.currentUserSubject.next(null);
    this.currentProfileSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('cd_auth_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentProfile(): StudentProfile | StaffProfile | null {
    return this.currentProfileSubject.value;
  }

  getCurrentUserRole(): UserRole | null {
    const user = this.currentUserSubject.value;
    return user ? user.role : null;
  }
}
