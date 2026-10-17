import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExecutionService } from '../../core/services/execution.service';
import { AuthService } from '../../core/services/auth.service';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  rollNumber: string;
  department: string;
  batch: string;
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  accuracyRate: number; // percentage
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  selectedDepartment: string = 'All';
  selectedBatch: string = 'All';

  // Logged-in Student Identity Tracking
  currentStudentRoll: string = '';
  currentStudentName: string = '';
  currentUserEmail: string = '';
  myRankEntry: LeaderboardEntry | null = null;

  departments: string[] = ['All', 'CSE', 'IT', 'AI&DS', 'ECE', 'MECH'];
  batches: string[] = ['All', '2022-2026', '2023-2027', '2024-2028'];

  allEntries: LeaderboardEntry[] = [
    {
      rank: 1,
      name: 'Priya Sharma',
      rollNumber: '22CS089',
      department: 'CSE',
      batch: '2022-2026',
      currentStreak: 28,
      longestStreak: 35,
      totalSolved: 142,
      accuracyRate: 96.5
    },
    {
      rank: 2,
      name: 'Rohan Verma',
      rollNumber: '22IT045',
      department: 'IT',
      batch: '2022-2026',
      currentStreak: 24,
      longestStreak: 24,
      totalSolved: 138,
      accuracyRate: 94.2
    },
    {
      rank: 3,
      name: 'Kavya Nair',
      rollNumber: '23AI012',
      department: 'AI&DS',
      batch: '2023-2027',
      currentStreak: 21,
      longestStreak: 21,
      totalSolved: 129,
      accuracyRate: 97.0
    },
    {
      rank: 4,
      name: 'Alex Johnson',
      rollNumber: '22CS104',
      department: 'CSE',
      batch: '2022-2026',
      currentStreak: 7,
      longestStreak: 18,
      totalSolved: 115,
      accuracyRate: 91.8
    },
    {
      rank: 5,
      name: 'Aditya Patel',
      rollNumber: '22EC067',
      department: 'ECE',
      batch: '2022-2026',
      currentStreak: 14,
      longestStreak: 19,
      totalSolved: 104,
      accuracyRate: 88.5
    },
    {
      rank: 6,
      name: 'Sneha Reddy',
      rollNumber: '23CS152',
      department: 'CSE',
      batch: '2023-2027',
      currentStreak: 12,
      longestStreak: 15,
      totalSolved: 98,
      accuracyRate: 93.1
    },
    {
      rank: 7,
      name: 'Farhan Akhtar',
      rollNumber: '23IT088',
      department: 'IT',
      batch: '2023-2027',
      currentStreak: 9,
      longestStreak: 14,
      totalSolved: 91,
      accuracyRate: 89.4
    },
    {
      rank: 8,
      name: 'Ananya Deshmukh',
      rollNumber: '22ME031',
      department: 'MECH',
      batch: '2022-2026',
      currentStreak: 8,
      longestStreak: 11,
      totalSolved: 84,
      accuracyRate: 85.0
    }
  ];

  filteredEntries: LeaderboardEntry[] = [];
  isLoading = false;

  constructor(
    private executionService: ExecutionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Track currently authenticated student profile
    this.authService.currentUser$.subscribe((u) => {
      this.currentStudentName = u ? u.name : '';
      this.currentUserEmail = u ? u.email : '';
      this.updateMyRank();
    });

    this.authService.currentProfile$.subscribe((p) => {
      if (p && 'rollNumber' in p) {
        this.currentStudentRoll = (p as any).rollNumber || '';
      } else {
        this.currentStudentRoll = '';
      }
      this.updateMyRank();
    });

    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.isLoading = true;
    this.executionService.getLeaderboard(this.selectedDepartment, this.selectedBatch).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && res.leaderboard && res.leaderboard.length > 0) {
          this.filteredEntries = res.leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.totalSolved - a.totalSolved);
        } else {
          this.applyLocalFilters();
        }
        this.updateMyRank();
      },
      error: () => {
        this.isLoading = false;
        this.applyLocalFilters();
        this.updateMyRank();
      }
    });
  }

  applyLocalFilters(): void {
    this.filteredEntries = this.allEntries
      .filter((item) => {
        const matchDept = this.selectedDepartment === 'All' || item.department === this.selectedDepartment;
        const matchBatch = this.selectedBatch === 'All' || item.batch === this.selectedBatch;
        return matchDept && matchBatch;
      })
      .sort((a, b) => b.totalSolved - a.totalSolved);

    // Explicitly reassign ranks and calculate accuracy: (student total solved / total problems) * 100
    const totalProblemsEstimate = 150;
    this.filteredEntries.forEach((entry, idx) => {
      entry.rank = idx + 1;
      entry.accuracyRate = Math.min(100, Number(((entry.totalSolved / totalProblemsEstimate) * 100).toFixed(1)));
    });
    this.updateMyRank();
  }

  updateMyRank(): void {
    if (!this.filteredEntries || this.filteredEntries.length === 0) {
      this.myRankEntry = null;
      return;
    }

    // Match by student rollNumber or student name
    this.myRankEntry = this.filteredEntries.find((e) => this.isCurrentStudent(e)) || null;
  }

  isCurrentStudent(item: LeaderboardEntry): boolean {
    if (!item) return false;
    if (this.currentStudentRoll && item.rollNumber && item.rollNumber.toUpperCase() === this.currentStudentRoll.toUpperCase()) {
      return true;
    }
    if (this.currentStudentName && item.name && item.name.trim().toLowerCase() === this.currentStudentName.trim().toLowerCase()) {
      return true;
    }
    return false;
  }

  onDepartmentChange(dept: string): void {
    this.selectedDepartment = dept;
    this.loadLeaderboard();
  }

  onBatchChange(batch: string): void {
    this.selectedBatch = batch;
    this.loadLeaderboard();
  }
}
