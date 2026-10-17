import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Problem } from '../models/problem.model';

@Injectable({
  providedIn: 'root'
})
export class ProblemService {
  private readonly apiUrl = 'http://localhost:5000/api/problems';

  // Active problem selected by student from Problem Library or Switcher
  private selectedProblemSubject = new BehaviorSubject<Problem | null>(null);
  public selectedProblem$ = this.selectedProblemSubject.asObservable();

  setSelectedProblem(problem: Problem | null): void {
    this.selectedProblemSubject.next(problem);
  }

  getSelectedProblem(): Problem | null {
    return this.selectedProblemSubject.value;
  }

  constructor(private http: HttpClient) {}

  /**
   * Check Backend & Database Health
   */
  checkHealth(): Observable<any> {
    return this.http.get<{ status: string; database: { status: string; connected: boolean; host: string } }>('http://localhost:5000/api/health').pipe(
      catchError((err) => {
        console.error('[ProblemService] Health check failed:', err);
        return of({ status: 'offline', database: { status: 'disconnected', connected: false } });
      })
    );
  }

  /**
   * Fetch all problems from MongoDB Atlas
   */
  getAllProblems(): Observable<{ success: boolean; count: number; problems: Problem[] }> {
    return this.http.get<{ success: boolean; count: number; problems: Problem[] }>(this.apiUrl).pipe(
      catchError((err) => {
        console.error('[ProblemService] Failed to fetch problems from MongoDB Atlas:', err);
        return of({ success: false, count: 0, problems: [] });
      })
    );
  }

  /**
   * Fetch today's scheduled challenge from MongoDB (strictly staff-selected within 24h)
   */
  getTodayProblem(): Observable<{
    success: boolean;
    isScheduled: boolean;
    expired?: boolean;
    message?: string;
    remainingSeconds?: number;
    scheduledAt?: string;
    expiresAt?: string;
    serverTime?: string;
    problem: Problem | null;
  }> {
    return this.http.get<any>(`${this.apiUrl}/daily/today?_t=${Date.now()}`).pipe(
      catchError((err) => {
        console.error('[ProblemService] getTodayProblem error:', err);
        return of({ success: false, isScheduled: false, message: 'Staff has not yet selected today\'s problem.', problem: null });
      })
    );
  }

  /**
   * Fetch all daily problem schedules
   */
  getDailySchedule(): Observable<{ success: boolean; count: number; schedules: any[] }> {
    return this.http.get<{ success: boolean; count: number; schedules: any[] }>(`${this.apiUrl}/daily/schedule`).pipe(
      catchError(() => of({ success: false, count: 0, schedules: [] }))
    );
  }

  /**
   * Clear or unschedule daily problem for a date
   */
  clearDailyProblem(date: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/daily/${date}`);
  }

  /**
   * Create a new problem in the Problem Bank
   */
  createProblem(problemData: Partial<Problem>): Observable<{ success: boolean; message: string; problem: Problem }> {
    return this.http.post<{ success: boolean; message: string; problem: Problem }>(this.apiUrl, problemData);
  }

  /**
   * Bind a problem to a calendar date
   */
  scheduleDailyProblem(date: string, problemId: string): Observable<{ success: boolean; message: string; dailyProblem: any }> {
    return this.http.post<{ success: boolean; message: string; dailyProblem: any }>(`${this.apiUrl}/schedule`, {
      date,
      problemId
    });
  }

  /**
   * Delete a problem from Problem Bank
   */
  deleteProblem(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }
}
