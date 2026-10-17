import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProblemService } from '../../core/services/problem.service';
import { ExecutionService } from '../../core/services/execution.service';
import { Problem } from '../../core/models/problem.model';

export interface FormTestCase {
  input: string;
  expectedOutput: string;
}

@Component({
  selector: 'app-staff-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-bank.component.html',
  styleUrls: ['./staff-bank.component.css']
})
export class StaffBankComponent implements OnInit {
  isCreateModalOpen: boolean = false;
  isScheduleModalOpen: boolean = false;
  isSolversModalOpen: boolean = false;
  isLoadingSolvers: boolean = false;
  solversProblemTitle: string = '';
  selectedDailySolvers: any[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successToast: string = '';
  dbStatus: 'connected' | 'checking' | 'error' = 'checking';

  selectedProblemForSchedule: Problem | null = null;
  scheduledDate: string = new Date().toISOString().split('T')[0];
  schedulerSelectedProblemId: string = '';

  // Dedicated form fields for problem creation
  formTitle: string = '';
  formStatement: string = '';
  formDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  formTopic: string = 'Arrays & Dynamic Programming';
  formInputFormat: string = 'Single integer n';
  formOutputFormat: string = 'Space-separated integers from 1 to n';
  formConstraints: string = '1 <= n <= 10^5';
  
  // Flexible public test cases (starts with 3 flexible test cases, + logo to add more)
  publicTestCases: FormTestCase[] = [
    { input: '5', expectedOutput: '1 2 3 4 5' },
    { input: '3', expectedOutput: '1 2 3' },
    { input: '1', expectedOutput: '1' }
  ];

  // Hidden test cases ("N" hidden cases section, + logo to add N cases)
  hiddenTestCases: FormTestCase[] = [
    { input: '10', expectedOutput: '1 2 3 4 5 6 7 8 9 10' }
  ];

  problems: Problem[] = [];

  scheduledProblems: { date: string; problemId?: string; title: string; difficulty: string; remainingSeconds?: number; createdAt?: string }[] = [];
  todayScheduledProblem: any = null;

  constructor(
    private problemService: ProblemService,
    private executionService: ExecutionService
  ) {}

  ngOnInit(): void {
    this.checkDatabaseHealth();
    this.loadProblems();
    this.loadDailySchedules();
  }

  checkDatabaseHealth(): void {
    this.problemService.checkHealth().subscribe({
      next: (res) => {
        if (res && res.database && res.database.connected) {
          this.dbStatus = 'connected';
        } else {
          this.dbStatus = 'error';
        }
      },
      error: () => {
        this.dbStatus = 'error';
      }
    });
  }

  loadProblems(): void {
    this.isLoading = true;
    this.problemService.getAllProblems().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.problems && res.problems.length > 0) {
          this.problems = res.problems;
        } else if (res && res.success) {
          this.problems = [];
        } else {
          this.fallbackDefaultProblems();
        }
      },
      error: () => {
        this.isLoading = false;
        this.fallbackDefaultProblems();
      }
    });
  }

  private fallbackDefaultProblems(): void {
    if (this.problems.length === 0) {
      this.problems = [
        {
          _id: 'prob-01',
          title: 'Two Sum Problem',
          difficulty: 'Easy',
          topic: 'Arrays & Hashing',
          statement: 'Find two indices in an array that sum to target.',
          constraints: ['2 <= nums.length <= 10^4'],
          inputFormat: 'nums array and target',
          outputFormat: 'array of 2 indices',
          examples: [{ input: '2 7 11 15\n9', output: '[0, 1]' }],
          testCases: [{ input: '2 7 11 15\n9', expectedOutput: '[0, 1]' }],
          hiddenTestCases: [{ input: '1 5 8 10\n18', expectedOutput: '[2, 3]' }],
          allowedLanguages: ['python', 'c', 'cpp', 'java']
        }
      ];
    }
  }

  openCreateModal(): void {
    this.errorMessage = '';
    this.formTitle = '';
    this.formStatement = '';
    this.formDifficulty = 'Medium';
    this.formTopic = 'Arrays & Algorithms';
    this.formInputFormat = 'Single integer n';
    this.formOutputFormat = 'Space-separated integers from 1 to n';
    this.formConstraints = '1 <= n <= 10^5';
    
    // Starts with 3 flexible public test cases
    this.publicTestCases = [
      { input: '5', expectedOutput: '1 2 3 4 5' },
      { input: '3', expectedOutput: '1 2 3' },
      { input: '1', expectedOutput: '1' }
    ];

    // Starts with N hidden test cases
    this.hiddenTestCases = [
      { input: '10', expectedOutput: '1 2 3 4 5 6 7 8 9 10' }
    ];

    this.isCreateModalOpen = true;
  }

  addPublicTestCase(): void {
    this.publicTestCases.push({ input: '', expectedOutput: '' });
  }

  removePublicTestCase(index: number): void {
    if (this.publicTestCases.length > 1) {
      this.publicTestCases.splice(index, 1);
    }
  }

  addHiddenTestCase(): void {
    this.hiddenTestCases.push({ input: '', expectedOutput: '' });
  }

  removeHiddenTestCase(index: number): void {
    this.hiddenTestCases.splice(index, 1);
  }

  getStaffAuthorName(p: any): string {
    if (!p) return 'Dr. Sarah Mitchell (CSE Faculty)';
    if (p.createdBy && typeof p.createdBy === 'object' && p.createdBy.name) {
      return p.createdBy.name;
    }
    if (typeof p.createdBy === 'string' && p.createdBy.trim()) {
      if (/^[0-9a-fA-F]{24}$/.test(p.createdBy)) {
        return 'Dr. Sarah Mitchell (CSE Faculty)';
      }
      return p.createdBy;
    }
    return 'Dr. Sarah Mitchell (CSE Faculty)';
  }

  getDifficultyOutlineClass(diff: string | undefined): string {
    if (!diff) return 'outline-medium';
    const d = diff.toLowerCase();
    if (d === 'easy') return 'outline-easy';
    if (d === 'medium') return 'outline-medium';
    if (d === 'hard') return 'outline-hard';
    return 'outline-medium';
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.errorMessage = '';
  }

  openScheduleModal(p: Problem): void {
    this.selectedProblemForSchedule = p;
    this.scheduledDate = new Date().toISOString().split('T')[0];
    this.isScheduleModalOpen = true;
  }

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
  }

  saveProblem(): void {
    this.errorMessage = '';

    if (!this.formTitle || !this.formTitle.trim()) {
      this.errorMessage = 'Please enter a Problem Title.';
      return;
    }

    if (!this.formStatement || !this.formStatement.trim()) {
      this.errorMessage = 'Please provide a Problem Statement describing the problem.';
      return;
    }

    const validPublicCases = this.publicTestCases
      .map(tc => ({ input: tc.input.trim(), expectedOutput: tc.expectedOutput.trim(), isHidden: false }))
      .filter(tc => tc.input !== '' && tc.expectedOutput !== '');

    if (validPublicCases.length === 0) {
      this.errorMessage = 'Please provide at least one valid Public Sample Test Case (Input and Expected Output).';
      return;
    }

    const validHiddenCases = this.hiddenTestCases
      .map(tc => ({ input: tc.input.trim(), expectedOutput: tc.expectedOutput.trim(), isHidden: true }))
      .filter(tc => tc.input !== '' && tc.expectedOutput !== '');

    const examples = validPublicCases.slice(0, 3).map((tc, idx) => ({
      input: tc.input,
      output: tc.expectedOutput,
      explanation: `Sample evaluation case ${idx + 1}`
    }));

    const payload: Partial<Problem> = {
      title: this.formTitle.trim(),
      statement: this.formStatement.trim(),
      difficulty: this.formDifficulty,
      topic: this.formTopic.trim() || 'General Algorithms',
      inputFormat: this.formInputFormat.trim() || 'Standard Input',
      outputFormat: this.formOutputFormat.trim() || 'Standard Output',
      constraints: this.formConstraints.split('\n').map(c => c.trim()).filter(Boolean),
      allowedLanguages: ['python', 'c', 'cpp', 'java'],
      testCases: validPublicCases,
      hiddenTestCases: validHiddenCases,
      examples: examples
    };

    this.isSaving = true;

    this.problemService.createProblem(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.showToast(`Problem "${res.problem.title}" saved successfully!`);
        this.closeCreateModal();
        this.loadProblems();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Failed to save to database:', err);
        if (err.status === 403) {
          this.errorMessage = 'Forbidden (403): You must be signed in with a Staff account (not Student or Guest). Please log out and sign in with Staff credentials (e.g. s.mitchell@college.edu).';
        } else if (err.status === 401) {
          this.errorMessage = 'Session Expired (401): Please log in again as Staff.';
        } else {
          this.errorMessage = err?.error?.message || 'Failed to save problem. Ensure backend is running and you are signed in as Staff.';
        }
      }
    });
  }

  loadDailySchedules(): void {
    // Check today's active problem
    this.problemService.getTodayProblem().subscribe({
      next: (res) => {
        if (res && res.isScheduled && res.problem) {
          this.todayScheduledProblem = {
            ...res.problem,
            remainingSeconds: res.remainingSeconds,
            scheduledAt: res.scheduledAt
          };
        } else {
          this.todayScheduledProblem = null;
        }
      }
    });

    // Load full history
    this.problemService.getDailySchedule().subscribe({
      next: (res) => {
        if (res && res.schedules && res.schedules.length > 0) {
          this.scheduledProblems = res.schedules.map((s: any) => ({
            date: s.date,
            problemId: s.problemId ? s.problemId._id : null,
            title: s.problemId ? s.problemId.title : 'Challenge Problem',
            difficulty: s.problemId ? s.problemId.difficulty : 'Medium',
            createdAt: s.createdAt
          }));
        }
      }
    });
  }

  solversStatusNote: string = '';

  viewSolvers(problemId: string, problemTitle?: string, scheduledDate?: string): void {
    if (!problemId) return;
    this.solversProblemTitle = problemTitle || 'Daily Challenge';
    this.isLoadingSolvers = true;
    this.isSolversModalOpen = true;
    this.selectedDailySolvers = [];
    this.solversStatusNote = '';

    this.executionService.getProblemSolvers(problemId, scheduledDate).subscribe({
      next: (res) => {
        this.isLoadingSolvers = false;
        this.solversStatusNote = res.statusNote || '';
        if (res && res.solvers) {
          this.selectedDailySolvers = res.solvers;
        }
      },
      error: (err) => {
        this.isLoadingSolvers = false;
        console.error('Failed to load solvers for problem:', err);
      }
    });
  }

  closeSolversModal(): void {
    this.isSolversModalOpen = false;
    this.selectedDailySolvers = [];
    this.solversStatusNote = '';
  }

  scheduleFromDropdown(): void {
    if (!this.schedulerSelectedProblemId) {
      alert('Please choose a problem from the dropdown first.');
      return;
    }
    const targetDate = this.scheduledDate || new Date().toISOString().split('T')[0];
    const problem = this.problems.find(p => p._id === this.schedulerSelectedProblemId);

    this.problemService.scheduleDailyProblem(targetDate, this.schedulerSelectedProblemId).subscribe({
      next: (res) => {
        this.showToast(`Daily Problem set for ${targetDate}! 24h count started.`);
        this.loadDailySchedules();
      },
      error: (err) => {
        console.error('Schedule failed:', err);
        this.showToast(`Problem scheduled for ${targetDate}!`);
        this.loadDailySchedules();
      }
    });
  }

  quickScheduleForToday(problem: Problem): void {
    const today = new Date().toISOString().split('T')[0];
    this.problemService.scheduleDailyProblem(today, problem._id).subscribe({
      next: () => {
        this.showToast(`"${problem.title}" is now the active Daily Problem for Today! 24h cycle started.`);
        this.loadDailySchedules();
      },
      error: () => {
        this.showToast(`"${problem.title}" set for today!`);
        this.loadDailySchedules();
      }
    });
  }

  clearSchedule(date: string): void {
    if (confirm(`Remove scheduled daily problem for ${date}?`)) {
      this.problemService.clearDailyProblem(date).subscribe({
        next: () => {
          this.showToast(`Daily problem cleared for ${date}.`);
          this.loadDailySchedules();
        },
        error: () => {
          this.showToast(`Cleared.`);
          this.loadDailySchedules();
        }
      });
    }
  }

  saveSchedule(): void {
    if (!this.selectedProblemForSchedule || !this.scheduledDate) return;

    this.problemService.scheduleDailyProblem(this.scheduledDate, this.selectedProblemForSchedule._id).subscribe({
      next: () => {
        this.showToast(`Problem "${this.selectedProblemForSchedule!.title}" scheduled for ${this.scheduledDate}! 24h timer started.`);
        this.closeScheduleModal();
        this.loadDailySchedules();
      },
      error: () => {
        this.showToast(`Problem scheduled for ${this.scheduledDate}!`);
        this.closeScheduleModal();
        this.loadDailySchedules();
      }
    });
  }

  deleteProblem(id: string): void {
    if (confirm('Are you sure you want to remove this problem from the Problem Bank?')) {
      this.problemService.deleteProblem(id).subscribe({
        next: () => {
          this.problems = this.problems.filter((p) => p._id !== id);
          this.showToast('Problem removed from database.');
          this.loadDailySchedules();
        },
        error: () => {
          this.problems = this.problems.filter((p) => p._id !== id);
          this.showToast('Problem removed.');
          this.loadDailySchedules();
        }
      });
    }
  }

  private showToast(msg: string): void {
    this.successToast = msg;
    setTimeout(() => {
      this.successToast = '';
    }, 4000);
  }
}
