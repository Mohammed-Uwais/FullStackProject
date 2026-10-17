export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java';

export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Compilation Error'
  | 'Runtime Error';

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Problem {
  _id: string;
  title: string;
  statement: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  examples: Example[];
  testCases: TestCase[];
  hiddenTestCases?: TestCase[];
  allowedLanguages: SupportedLanguage[];
  createdBy?: string | { _id?: string; name?: string; email?: string; role?: string } | any;
  createdAt?: string;
}

export interface TestCaseResult {
  testCaseIndex: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number; // in milliseconds
  errorMessage?: string;
}

export interface ExecutionResult {
  status: SubmissionStatus;
  testCasesPassed: number;
  totalTestCases: number;
  executionTime: number; // in milliseconds
  memoryUsed: number; // in KB
  testCaseResults: TestCaseResult[];
  errorOutput?: string;
}

export interface SubmissionPayload {
  problemId: string;
  language: SupportedLanguage;
  code: string;
}
