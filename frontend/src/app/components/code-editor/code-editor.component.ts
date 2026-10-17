import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ExecutionService } from '../../core/services/execution.service';
import { ProblemService } from '../../core/services/problem.service';
import {
  Problem,
  SupportedLanguage,
  ExecutionResult,
  TestCase
} from '../../core/models/problem.model';

declare const window: any;

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css']
})
export class CodeEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef<HTMLDivElement>;

  // Problem Input Property with Default Sample Problem
  @Input() problem: Problem = {
    _id: 'prob-001',
    title: 'Two Sum Problem',
    difficulty: 'Easy',
    topic: 'Arrays & Hashing',
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.`,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    inputFormat: 'Line 1: space-separated integers representing nums.\nLine 2: target integer.',
    outputFormat: 'Return an array/list of two indices [i, j].',
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      }
    ],
    testCases: [
      { input: '2 7 11 15\n9', expectedOutput: '[0, 1]', isHidden: false },
      { input: '3 2 4\n6', expectedOutput: '[1, 2]', isHidden: false },
      { input: '3 3\n6', expectedOutput: '[0, 1]', isHidden: false }
    ],
    hiddenTestCases: [
      { input: '1 5 8 10 14\n19', expectedOutput: '[1, 4]', isHidden: true },
      { input: '-3 4 3 90\n0', expectedOutput: '[0, 2]', isHidden: true }
    ],
    allowedLanguages: ['python', 'c', 'cpp', 'java']
  };

  // Supported Languages & Boilerplate Templates
  languages: { label: string; value: SupportedLanguage; monacoLang: string }[] = [
    { label: 'Python 3', value: 'python', monacoLang: 'python' },
    { label: 'C (GCC 11)', value: 'c', monacoLang: 'c' },
    { label: 'C++ (G++ 20)', value: 'cpp', monacoLang: 'cpp' },
    { label: 'Java (OpenJDK 17)', value: 'java', monacoLang: 'java' }
  ];

  selectedLanguage: SupportedLanguage = 'python';

  codeTemplates: Record<SupportedLanguage, string> = {
    python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Lookup table for complement values
    lookup = {}
    for index, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], index]
        lookup[num] = index
    return []
`,
    c: `#include <stdio.h>
#include <stdlib.h>

/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 2;
    int* result = (int*)malloc(2 * sizeof(int));
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                result[0] = i;
                result[1] = j;
                return result;
            }
        }
    }
    return NULL;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> lookup;
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (lookup.find(complement) != lookup.end()) {
                return {lookup[complement], i};
            }
            lookup[nums[i]] = i;
        }
        return {};
    }
};
`,
    java: `import java.util.HashMap;
import java.util.Map;

public class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}
`
  };

  currentCode: string = '';
  monacoEditor: any = null;
  isMonacoLoaded: boolean = false;

  // Execution & Test State
  isExecuting: boolean = false;
  isSubmitting: boolean = false;
  activeTestTabIndex: number = 0;
  activeBottomTab: 'testcases' | 'output' = 'testcases';
  executionResult: ExecutionResult | null = null;
  activeResultTestCaseIndex: number = 0;
  availableProblems: Problem[] = [];
  dbConnected: boolean = false;
  isLoadingProblems: boolean = false;

  isDailyProblemActive: boolean = false;
  isPracticeMode: boolean = false;
  isEditorActive: boolean = false;
  selectedPickerProblemId: string = '';
  remainingSeconds: number = 0;
  timerCountdownString: string = '';
  challengeExpiresAtMs: number = 0;
  dailyStatusMessage: string = 'Staff has not yet selected today\'s daily problem. You can solve any other problem from the Problem Bank below.';
  private countdownInterval: any = null;
  private problemSubscription: Subscription | null = null;

  solvedProblemIds: Set<string> = new Set();
  solvedProblemTitles: Set<string> = new Set();
  filterOnlyUnsolved: boolean = false;

  constructor(
    private executionService: ExecutionService,
    private problemService: ProblemService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentCode = this.codeTemplates[this.selectedLanguage];
    this.checkDatabaseStatus();
    this.loadProblems();
    this.loadSolvedSubmissions();
    this.loadMonacoEditor();

    // Listen to problem selections triggered from Problem Library or anywhere in the app
    this.problemSubscription = this.problemService.selectedProblem$.subscribe((selectedProb) => {
      if (selectedProb) {
        this.isPracticeMode = true;
        this.isEditorActive = true;
        this.selectProblem(selectedProb);
        this.cdr.detectChanges();
      }
    });
  }

  loadSolvedSubmissions(): void {
    this.http.get<{ success: boolean; submissions: any[] }>('http://localhost:5000/api/submissions/my').subscribe({
      next: (res) => {
        if (res && res.submissions && res.submissions.length > 0) {
          for (const s of res.submissions) {
            if (s.status === 'Accepted' && s.problemId) {
              const pid = typeof s.problemId === 'object' && s.problemId._id
                ? s.problemId._id.toString()
                : (s.problemId ? s.problemId.toString() : '');
              if (pid) this.solvedProblemIds.add(pid);
              if (s.problemId.title) this.solvedProblemTitles.add(s.problemId.title.trim().toLowerCase());
            }
          }
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  checkDatabaseStatus(): void {
    this.problemService.checkHealth().subscribe({
      next: (res) => {
        this.dbConnected = res && res.database && res.database.connected;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dbConnected = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadProblems(): void {
    this.isLoadingProblems = true;

    // Load available problems for switcher and empty-state picker
    this.problemService.getAllProblems().subscribe({
      next: (res) => {
        if (res && res.problems && res.problems.length > 0) {
          this.availableProblems = res.problems;
          if (!this.selectedPickerProblemId) {
            this.selectedPickerProblemId = res.problems[0]._id;
          }
        }
      }
    });

    // Check today's scheduled challenge strictly without fallback
    this.problemService.getTodayProblem().subscribe({
      next: (todayRes) => {
        this.isLoadingProblems = false;

        // If the user already opened a specific challenge from the library, respect their choice!
        const chosen = this.problemService.getSelectedProblem();
        if (chosen) {
          this.isPracticeMode = true;
          this.isEditorActive = true;
          this.selectProblem(chosen);
        } else if (todayRes && todayRes.isScheduled && todayRes.problem) {
          this.isDailyProblemActive = true;
          this.isPracticeMode = false;
          this.isEditorActive = true;
          
          if (todayRes.expiresAt) {
            this.challengeExpiresAtMs = new Date(todayRes.expiresAt).getTime();
          } else if (todayRes.remainingSeconds) {
            this.challengeExpiresAtMs = Date.now() + (todayRes.remainingSeconds * 1000);
          } else {
            this.challengeExpiresAtMs = Date.now() + (24 * 3600 * 1000);
          }

          this.selectProblem(todayRes.problem);
          this.startCountdownTimer();
        } else {
          this.isDailyProblemActive = false;
          this.isPracticeMode = false;
          this.isEditorActive = false;
          this.dailyStatusMessage = todayRes?.message || 'Staff has not yet selected today\'s daily problem. You can solve any other problem from the Problem Bank below.';
          this.stopCountdownTimer();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingProblems = false;
        const chosen = this.problemService.getSelectedProblem();
        if (chosen) {
          this.isPracticeMode = true;
          this.isEditorActive = true;
          this.selectProblem(chosen);
        } else {
          this.isDailyProblemActive = false;
          this.isPracticeMode = false;
          this.isEditorActive = false;
          this.dailyStatusMessage = 'Staff has not yet selected today\'s daily problem. You can solve any other problem from the Problem Bank below.';
          this.stopCountdownTimer();
        }
        this.cdr.detectChanges();
      }
    });
  }

  startCountdownTimer(): void {
    this.stopCountdownTimer();
    this.updateCountdownFromClock();
    this.countdownInterval = setInterval(() => {
      this.updateCountdownFromClock();
    }, 1000);
  }

  stopCountdownTimer(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  updateCountdownFromClock(): void {
    if (!this.challengeExpiresAtMs) return;
    const now = Date.now();
    const diffSeconds = Math.max(0, Math.floor((this.challengeExpiresAtMs - now) / 1000));
    this.remainingSeconds = diffSeconds;

    if (diffSeconds > 0) {
      this.updateTimerString();
    } else {
      this.stopCountdownTimer();
      this.isDailyProblemActive = false;
      this.isEditorActive = false;
      this.dailyStatusMessage = 'Staff has not yet selected today\'s daily problem. The previous 24-hour challenge has expired.';
      this.cdr.detectChanges();
    }
  }

  updateTimerString(): void {
    const hours = Math.floor(this.remainingSeconds / 3600);
    const minutes = Math.floor((this.remainingSeconds % 3600) / 60);
    const seconds = this.remainingSeconds % 60;
    this.timerCountdownString = `${hours}h ${minutes}m ${seconds}s`;
  }

  startPracticeWithProblem(id: string): void {
    const found = this.availableProblems.find((p) => p._id === id);
    if (found) {
      this.isPracticeMode = true;
      this.isEditorActive = true;
      this.problemService.setSelectedProblem(found);
      this.selectProblem(found);
    }
  }

  onSelectProblemById(id: string): void {
    const found = this.availableProblems.find((p) => p._id === id);
    if (found) {
      this.isPracticeMode = true;
      this.isEditorActive = true;
      this.problemService.setSelectedProblem(found);
      this.selectProblem(found);
    }
  }

  selectProblem(prob: Problem): void {
    // If examples array is empty, synthesize example cards from public testCases
    const safeProblem: Problem = { ...prob };
    if ((!safeProblem.examples || safeProblem.examples.length === 0) && safeProblem.testCases && safeProblem.testCases.length > 0) {
      safeProblem.examples = safeProblem.testCases.map((tc, idx) => ({
        input: tc.input,
        output: tc.expectedOutput,
        explanation: `Evaluation case ${idx + 1}`
      }));
    }

    this.problem = safeProblem;
    this.updateTemplatesForProblem(safeProblem);
    this.currentCode = this.codeTemplates[this.selectedLanguage];
    if (this.monacoEditor) {
      this.monacoEditor.setValue(this.currentCode);
    }
    this.executionResult = null;
    this.activeBottomTab = 'testcases';
    this.cdr.detectChanges();
  }

  updateTemplatesForProblem(prob: Problem): void {
    const title = (prob.title || '').toLowerCase();
    if (title.includes('two sum')) {
      this.codeTemplates = {
        python: `def twoSum(nums: list[int], target: int) -> list[int]:
    lookup = {}
    for index, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], index]
        lookup[num] = index
    return []
`,
        c: `#include <stdio.h>\n#include <stdlib.h>\n\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 2;\n    int* res = (int*)malloc(2 * sizeof(int));\n    return res;\n}\n`,
        cpp: `#include <vector>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        return {};\n    }\n};\n`,
        java: `import java.util.HashMap;\n\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[0];\n    }\n}\n`
      };
    } else if (title.includes('anagram')) {
      this.codeTemplates = {
        python: `def isAnagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    return sorted(s) == sorted(t)
`,
        c: `bool isAnagram(char* s, char* t) {\n    return true;\n}\n`,
        cpp: `class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        return true;\n    }\n};\n`,
        java: `public class Solution {\n    public boolean isAnagram(String s, String t) {\n        return true;\n    }\n}\n`
      };
    } else if (title.includes('print')) {
      this.codeTemplates = {
        python: `def printNumbers(n: int) -> str:
    return " ".join(str(i) for i in range(1, n + 1))
`,
        c: `void printNumbers(int n) {\n    for(int i = 1; i <= n; i++) printf("%d ", i);\n}\n`,
        cpp: `void printNumbers(int n) {\n    for(int i = 1; i <= n; i++) cout << i << " ";\n}\n`,
        java: `public class Solution {\n    public static void printNumbers(int n) {\n        for(int i = 1; i <= n; i++) System.out.print(i + " ");\n    }\n}\n`
      };
    } else {
      this.codeTemplates = {
        python: `def solve(*args):\n    # Problem: ${prob.title}\n    # Return the expected result matching the output format\n    return ""\n`,
        c: `// Problem: ${prob.title}\nvoid solve() {\n    // Implement solution\n}\n`,
        cpp: `// Problem: ${prob.title}\nclass Solution {\npublic:\n    void solve() {}\n};\n`,
        java: `// Problem: ${prob.title}\npublic class Solution {\n    public void solve() {}\n}\n`
      };
    }
  }

  /**
   * Dynamically inject Monaco Editor AMD loader from CDN with automatic fallback
   */
  private loadMonacoEditor(): void {
    if (typeof window !== 'undefined' && window.monaco) {
      this.initMonaco();
      return;
    }

    // Check if loader script already injected
    if (document.getElementById('monaco-loader-script')) {
      const checkInterval = setInterval(() => {
        if (window.monaco) {
          clearInterval(checkInterval);
          this.initMonaco();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'monaco-loader-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
    script.onload = () => {
      window.require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
        }
      });
      window.require(['vs/editor/editor.main'], () => {
        this.defineNeumorphicMonacoTheme();
        this.initMonaco();
      });
    };
    script.onerror = () => {
      console.warn('Monaco CDN loader failed. Falling back to native enhanced textarea.');
      this.isMonacoLoaded = false;
      this.cdr.detectChanges();
    };
    document.body.appendChild(script);
  }

  /**
   * Define customized soft dark theme matching Neumorphic palette
   */
  private defineNeumorphicMonacoTheme(): void {
    if (!window.monaco) return;

    window.monaco.editor.defineTheme('neu-soft-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '60a5fa' }
      ],
      colors: {
        'editor.background': '#1b2028',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#818cf8',
        'editor.selectionBackground': '#4338ca50',
        'editor.inactiveSelectionBackground': '#4338ca25',
        'editorCursor.foreground': '#818cf8',
        'editorWhitespace.foreground': '#374151'
      }
    });
  }

  /**
   * Mount Monaco editor into DOM container
   */
  private initMonaco(): void {
    if (!this.editorContainer || !this.editorContainer.nativeElement) {
      setTimeout(() => this.initMonaco(), 100);
      return;
    }

    const currentLangConfig = this.languages.find((l) => l.value === this.selectedLanguage);
    const monacoLang = currentLangConfig ? currentLangConfig.monacoLang : 'python';

    this.monacoEditor = window.monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.currentCode,
      language: monacoLang,
      theme: 'neu-soft-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      roundedSelection: true,
      padding: { top: 12, bottom: 12 },
      lineNumbers: 'on',
      lineDecorationsWidth: 10,
      renderLineHighlight: 'all',
      tabSize: 4
    });

    this.monacoEditor.onDidChangeModelContent(() => {
      this.currentCode = this.monacoEditor.getValue();
    });

    this.isMonacoLoaded = true;
    this.cdr.detectChanges();
  }

  /**
   * Handle language change: updates template and editor language model
   */
  onLanguageChange(lang: SupportedLanguage): void {
    this.selectedLanguage = lang;
    this.currentCode = this.codeTemplates[lang];

    if (this.monacoEditor && window.monaco) {
      const currentLangConfig = this.languages.find((l) => l.value === lang);
      const monacoLang = currentLangConfig ? currentLangConfig.monacoLang : 'python';
      const model = this.monacoEditor.getModel();
      if (model) {
        window.monaco.editor.setModelLanguage(model, monacoLang);
        this.monacoEditor.setValue(this.currentCode);
      }
    }
  }

  /**
   * Reset code back to default starter boilerplate
   */
  resetCode(): void {
    if (confirm('Reset code to the default starter template for this language?')) {
      this.currentCode = this.codeTemplates[this.selectedLanguage];
      if (this.monacoEditor) {
        this.monacoEditor.setValue(this.currentCode);
      }
    }
  }

  /**
   * Run public test cases only (Dry Run)
   */
  runCode(): void {
    if (this.isExecuting || this.isSubmitting) return;

    this.isExecuting = true;
    this.activeBottomTab = 'output';

    const publicCases: TestCase[] = this.problem.testCases;

    this.executionService
      .runPublicTestCases(this.problem._id, this.selectedLanguage, this.currentCode, publicCases)
      .subscribe({
        next: (result) => {
          this.executionResult = result;
          this.isExecuting = false;
          this.activeResultTestCaseIndex = 0;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isExecuting = false;
          this.executionResult = {
            status: 'Runtime Error',
            testCasesPassed: 0,
            totalTestCases: publicCases.length,
            executionTime: 0,
            memoryUsed: 0,
            testCaseResults: [],
            errorOutput: err?.message || 'Server execution error occurred.'
          };
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Submit complete solution against all test cases including hidden cases
   */
  submitSolution(): void {
    if (this.isExecuting || this.isSubmitting) return;

    this.isSubmitting = true;
    this.activeBottomTab = 'output';

    const allCases: TestCase[] = [
      ...this.problem.testCases,
      ...(this.problem.hiddenTestCases || [])
    ];

    this.executionService
      .submitSolution(this.problem._id, this.selectedLanguage, this.currentCode, allCases)
      .subscribe({
        next: (result) => {
          this.executionResult = result;
          this.isSubmitting = false;
          this.activeResultTestCaseIndex = 0;
          if (result.status === 'Accepted' && this.problem) {
            if (this.problem._id) this.solvedProblemIds.add(this.problem._id.toString());
            if (this.problem.title) this.solvedProblemTitles.add(this.problem.title.trim().toLowerCase());
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.executionResult = {
            status: 'Runtime Error',
            testCasesPassed: 0,
            totalTestCases: allCases.length,
            executionTime: 0,
            memoryUsed: 0,
            testCaseResults: [],
            errorOutput: err?.message || 'Failed to submit solution.'
          };
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Helpers for template styling & question attribution
   */
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

  isProblemSolved(p: Problem): boolean {
    if (!p) return false;
    const pid = p._id ? p._id.toString() : '';
    const title = p.title ? p.title.trim().toLowerCase() : '';
    return (pid !== '' && this.solvedProblemIds.has(pid)) || (title !== '' && this.solvedProblemTitles.has(title));
  }

  get displayedProblems(): Problem[] {
    if (this.filterOnlyUnsolved) {
      return this.availableProblems.filter((p) => !this.isProblemSolved(p));
    }
    return this.availableProblems;
  }

  toggleFilterOnlyUnsolved(): void {
    this.filterOnlyUnsolved = !this.filterOnlyUnsolved;
    const list = this.displayedProblems;
    if (list.length > 0) {
      const currentExists = list.some((p) => p._id === this.selectedPickerProblemId);
      if (!currentExists) {
        this.selectedPickerProblemId = list[0]._id;
      }
    }
    this.cdr.detectChanges();
  }

  getDifficultyClass(diff: string): string {
    switch (diff) {
      case 'Easy':
        return 'neu-badge-easy';
      case 'Medium':
        return 'neu-badge-medium';
      case 'Hard':
        return 'neu-badge-hard';
      default:
        return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Accepted':
        return 'status-accepted';
      case 'Wrong Answer':
        return 'status-wrong';
      case 'Time Limit Exceeded':
        return 'status-tle';
      case 'Compilation Error':
      case 'Runtime Error':
        return 'status-error';
      default:
        return '';
    }
  }

  ngOnDestroy(): void {
    this.stopCountdownTimer();
    if (this.problemSubscription) {
      this.problemSubscription.unsubscribe();
    }
    if (this.monacoEditor) {
      this.monacoEditor.dispose();
    }
  }
}
