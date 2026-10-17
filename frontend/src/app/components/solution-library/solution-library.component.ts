import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProblemService } from '../../core/services/problem.service';
import { Problem } from '../../core/models/problem.model';

export interface SolvedItem {
  id: string;
  problemId?: any;
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  language: string;
  code: string;
  solvedAt: string;
  executionTime: number; // ms
  memoryUsed: number; // KB
}

@Component({
  selector: 'app-solution-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solution-library.component.html',
  styleUrls: ['./solution-library.component.css']
})
export class SolutionLibraryComponent implements OnInit {
  @Output() solveProblem = new EventEmitter<Problem>();

  activeSection: 'all' | 'solved' | 'unsolved' = 'all';
  showOnlyUnsolved: boolean = false;
  searchQuery: string = '';
  selectedDifficulty: string = 'All';

  allProblems: Problem[] = [];
  solvedProblems: SolvedItem[] = [
    {
      id: 'sol-01',
      problemTitle: 'Two Sum Problem',
      difficulty: 'Easy',
      topic: 'Arrays & Hashing',
      language: 'python',
      code: `def twoSum(nums: list[int], target: int) -> list[int]:
    lookup = {}
    for index, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], index]
        lookup[num] = index
    return []`,
      solvedAt: '2026-10-02 08:35 AM',
      executionTime: 24,
      memoryUsed: 14200
    },
    {
      id: 'sol-02',
      problemTitle: 'Valid Anagram Check',
      difficulty: 'Easy',
      topic: 'Strings & Maps',
      language: 'cpp',
      code: `#include <iostream>
#include <string>
#include <vector>

bool isAnagram(std::string s, std::string t) {
    if (s.length() != t.length()) return false;
    std::vector<int> counts(26, 0);
    for (char c : s) counts[c - 'a']++;
    for (char c : t) {
        if (--counts[c - 'a'] < 0) return false;
    }
    return true;
}`,
      solvedAt: '2026-10-01 07:15 PM',
      executionTime: 12,
      memoryUsed: 9800
    },
    {
      id: 'sol-03',
      problemTitle: 'sum of n numbers',
      difficulty: 'Easy',
      topic: 'Math & Loops',
      language: 'python',
      code: `n = int(input())
print(n * (n + 1) // 2)`,
      solvedAt: '2026-10-11 09:40 PM',
      executionTime: 18,
      memoryUsed: 12400
    }
  ];

  activeSolvedItem: SolvedItem | null = null;
  selectedProblemForDetail: Problem | null = null;
  isCodeModalOpen: boolean = false;
  isProblemDetailModalOpen: boolean = false;
  isLoading: boolean = false;

  constructor(
    private problemService: ProblemService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAllProblems();
    this.loadSolvedProblems();
  }

  loadAllProblems(): void {
    this.isLoading = true;
    this.problemService.getAllProblems().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.problems) {
          this.allProblems = res.problems;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadSolvedProblems(): void {
    // Attempt fetching real authenticated student submissions
    this.http.get<{ success: boolean; submissions: any[] }>('http://localhost:5000/api/submissions/my').subscribe({
      next: (res) => {
        if (res && res.submissions && res.submissions.length > 0) {
          // Deduplicate by problem: each problem should appear only ONCE in Solved Library
          const uniqueByProblem = new Map<string, any>();
          for (const s of res.submissions) {
            if (s.status === 'Accepted' && s.problemId) {
              const probKey = s.problemId._id ? s.problemId._id.toString() : (s.problemId.title || String(s.problemId));
              // Submissions are already sorted latest first, so keep the most recent accepted solution
              if (!uniqueByProblem.has(probKey)) {
                uniqueByProblem.set(probKey, s);
              }
            }
          }

          const userSolved: SolvedItem[] = Array.from(uniqueByProblem.values()).map((s: any, idx: number) => {
            const rawDate = s.submittedAt || s.createdAt;
            const parsedDate = rawDate ? new Date(rawDate) : null;
            const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
              ? parsedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Verified Solution';

            return {
              id: s._id || `sub-${idx}`,
              problemId: s.problemId._id || s.problemId,
              problemTitle: s.problemId.title || 'Algorithmic Problem',
              difficulty: s.problemId.difficulty || 'Medium',
              topic: s.problemId.topic || 'Algorithms',
              language: s.language || 'python',
              code: s.code || '# Code verified',
              solvedAt: formattedDate,
              executionTime: s.executionTime || 20,
              memoryUsed: s.memoryUsed || 14000
            };
          });

          if (userSolved.length > 0) {
            this.solvedProblems = userSolved;
          }
        }
      },
      error: () => {
        // Retain verified demo solutions if unauthenticated
      }
    });
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

  isProblemSolved(problem: Problem): boolean {
    if (!problem) return false;
    const pid = problem._id ? problem._id.toString() : '';
    const title = problem.title ? problem.title.trim().toLowerCase() : '';
    return this.solvedProblems.some((s) => {
      const sPid = typeof s.problemId === 'object' && s.problemId?._id
        ? s.problemId._id.toString()
        : (s.problemId ? s.problemId.toString() : '');
      const sTitle = s.problemTitle ? s.problemTitle.trim().toLowerCase() : '';
      return (pid && sPid && pid === sPid) || (title && sTitle && title === sTitle);
    });
  }

  get unsolvedProblems(): Problem[] {
    return this.allProblems.filter((p) => !this.isProblemSolved(p));
  }

  get filteredUnsolvedProblems(): Problem[] {
    return this.unsolvedProblems.filter((p) => {
      const matchSearch =
        !this.searchQuery ||
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.topic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.statement.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchDifficulty =
        this.selectedDifficulty === 'All' || p.difficulty === this.selectedDifficulty;

      return matchSearch && matchDifficulty;
    });
  }

  get filteredAllProblems(): Problem[] {
    const list = this.showOnlyUnsolved ? this.unsolvedProblems : this.allProblems;
    return list.filter((p) => {
      const matchSearch =
        !this.searchQuery ||
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.topic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.statement.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchDifficulty =
        this.selectedDifficulty === 'All' || p.difficulty === this.selectedDifficulty;

      return matchSearch && matchDifficulty;
    });
  }

  get filteredSolvedProblems(): SolvedItem[] {
    return this.solvedProblems.filter((s) => {
      const matchSearch =
        !this.searchQuery ||
        s.problemTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.topic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.language.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchDifficulty =
        this.selectedDifficulty === 'All' || s.difficulty === this.selectedDifficulty;

      return matchSearch && matchDifficulty;
    });
  }

  toggleShowOnlyUnsolved(): void {
    this.showOnlyUnsolved = !this.showOnlyUnsolved;
    if (this.showOnlyUnsolved) {
      this.activeSection = 'unsolved';
    } else {
      this.activeSection = 'all';
    }
  }

  viewSolution(item: SolvedItem): void {
    this.activeSolvedItem = item;
    this.isCodeModalOpen = true;
  }

  closeCodeModal(): void {
    this.isCodeModalOpen = false;
  }

  viewProblemDetail(p: Problem): void {
    this.selectedProblemForDetail = p;
    this.isProblemDetailModalOpen = true;
  }

  closeProblemDetailModal(): void {
    this.selectedProblemForDetail = null;
    this.isProblemDetailModalOpen = false;
  }

  /**
   * Navigate directly to the Code Editor to solve this challenge
   */
  onSolveProblem(p: Problem | null): void {
    if (!p) return;
    this.closeProblemDetailModal();
    this.problemService.setSelectedProblem(p);
    this.solveProblem.emit(p);
  }

  /**
   * Reopen solved item in the editor
   */
  onSolveFromSolvedItem(item: SolvedItem | null): void {
    if (!item) return;
    this.closeCodeModal();

    // Look for full problem matching this solved submission
    const found = this.allProblems.find(
      (p) => (item.problemId && p._id === item.problemId) || p.title.toLowerCase() === item.problemTitle.toLowerCase()
    );

    if (found) {
      this.onSolveProblem(found);
    } else {
      // Synthesize problem object if not directly found in current loaded list
      const syntheticProblem: Problem = {
        _id: item.problemId || item.id,
        title: item.problemTitle,
        difficulty: item.difficulty,
        topic: item.topic,
        statement: `Practice challenge for ${item.problemTitle}.`,
        constraints: ['Standard algorithmic constraints apply.'],
        inputFormat: 'Read from standard input (stdin).',
        outputFormat: 'Print to standard output (stdout).',
        examples: [],
        testCases: [{ input: '0', expectedOutput: '0', isHidden: false }],
        allowedLanguages: ['python', 'c', 'cpp', 'java']
      };
      this.onSolveProblem(syntheticProblem);
    }
  }
}
