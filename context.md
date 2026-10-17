# College DailyCoding — Project Architecture & Progress Context

**Platform:** College-Wide Daily Coding Practice, Assessment & Performance Tracking System  
**Lead Architect:** Principal Full-Stack Architect & Engineering Lead  
**Roles Enforced:** Strictly **`student`** and **`staff`** (Zero Admin References)  
**Date Created / Updated:** October 2026  
**Document Status:** Complete & Live in Production

---

## 1. Executive Project Summary

**College DailyCoding** is an enterprise-grade academic platform built to empower engineering students to develop continuous daily coding streaks, prepare for technical recruitment, and compete across department leaderboards. 

Faculty staff author algorithmic challenges with both public and hidden test cases, schedule daily challenges bound to the academic calendar, and monitor participation metrics.

Students practice challenges using Microsoft Monaco Editor, execute test suites against native compiler/interpreter runtimes (Python 3, Java, C, C++), and persist verified submissions and streaks into a centralized MongoDB Atlas cloud database.

---

## 2. Technology Stack & Architectural Standards

| Layer | Technologies & Libraries | Architectural Decisions |
| :--- | :--- | :--- |
| **Frontend** | Angular 18, TypeScript, RxJS, Reactive Forms | Standalone Component Architecture, Strict Typing, Modular Services, HTTP Interceptors |
| **Design System** | Soft UI / Neumorphism | Clay-like double shadow physics (`8px 8px 16px #c5c9ce, -8px -8px 16px #ffffff`), inset wells (`inset 4px 4px 8px #c5c9ce`), high-contrast dark terminal boxes |
| **Code Editor** | Microsoft Monaco Editor (CDN AMD Loader) | Multi-language syntax highlighting, live problem selector dropdown, dynamic starter templates for **Python 3**, **C (GCC 11)**, **C++ (G++ 20)**, and **Java (OpenJDK 17)** |
| **Execution Engine** | Node.js `child_process` Sandbox Runner | Real sandboxed execution via native Python 3 child process with argument parsing, exception interception (`Runtime Error`), 5000ms infinite loop defense (`Time Limit Exceeded`), and normalized I/O comparison |
| **Backend API** | Node.js, Express.js (REST) | Clean layered architecture (`config/`, `controllers/`, `models/`, `routes/`, `middleware/`, `utils/`) with CORS and auto-reloading nodemon |
| **Authentication** | JSON Web Tokens (JWT), bcrypt.js (Cost 12) | Strict Role-Based Access Control (RBAC), self-service registration with Email ID as User ID and custom password, universal login, optional-auth guest fallback |
| **Database** | MongoDB Atlas, Mongoose ORM | Connection pooling, custom DNS SRV resolver (`8.8.8.8`, `1.1.1.1`), atomic transactions, compound index optimization, resilient ObjectId resolution |

---

## 3. Database Schema Blueprint (MongoDB Atlas: `college_dailycoding`)

### 1. `users` Collection
- `_id`: ObjectId (Primary Key)
- `name`: String (Required, trimmed)
- `email`: String (Required, unique, lowercase, regex-validated) — Serves as **User ID**
- `password`: String (Bcrypt hashed with cost factor 12, `select: false` by default)
- `role`: Enum strictly `['student', 'staff']` (**Zero Admin Role**)
- `createdAt`: Date (Default: `Date.now`)

### 2. `students` Collection
- `_id`: ObjectId
- `userId`: ObjectId (Ref: `User`, unique, indexed)
- `rollNumber`: String (Required, unique, uppercase, e.g. `22CS104` or auto-generated `STU-XXXX`)
- `department`: String (Required, e.g. `Computer Science & Engineering`)
- `batch`: String (Required, e.g. `2022-2026`)
- `currentStreak`: Number (Default: 0, non-negative)
- `longestStreak`: Number (Default: 0, non-negative)
- `totalSolved`: Number (Default: 0, non-negative)

### 3. `staff` Collection
- `_id`: ObjectId
- `userId`: ObjectId (Ref: `User`, unique, indexed)
- `employeeId`: String (Required, unique, uppercase, e.g. `EMP-9041` or auto-generated `EMP-XXXX`)
- `department`: String (Required)
- `designation`: String (Required, e.g. `Associate Professor & Academic Head`)

### 4. `problems` Collection
- `_id`: ObjectId
- `title`: String (Required, indexed)
- `statement`: String (Required, markdown supported)
- `difficulty`: Enum `['Easy', 'Medium', 'Hard']`
- `topic`: String (Required, indexed, e.g. `Arrays & Dynamic Programming`)
- `constraints`: Array of Strings (e.g. `1 <= n <= 10^5`)
- `inputFormat`: String (Default: `'Standard Input parameters'`)
- `outputFormat`: String (Default: `'Standard Output result'`)
- `examples`: Array of `{ input, output, explanation }`
- `testCases`: Array of Public Test Cases `{ input, expectedOutput, isHidden: false }`
- `hiddenTestCases`: Array of Assessment Test Cases `{ input, expectedOutput, isHidden: true }`
- `allowedLanguages`: Enum Array `['python', 'c', 'cpp', 'java']`
- `createdBy`: ObjectId (Ref: `User` - Staff only)
- `createdAt`: Date

### 5. `dailyProblems` Collection
- `_id`: ObjectId
- `date`: String (Required, unique, format `YYYY-MM-DD`, indexed)
- `problemId`: ObjectId (Ref: `Problem`, required)
- `publishedBy`: ObjectId (Ref: `User` - Staff publisher)
- `createdAt`: Date

### 6. `submissions` Collection
- `_id`: ObjectId
- `studentId`: ObjectId (Ref: `Student`, indexed)
- `problemId`: ObjectId (Ref: `Problem`, indexed)
- `language`: Enum `['python', 'c', 'cpp', 'java']`
- `code`: String (Source code)
- `status`: Enum `['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Compilation Error', 'Runtime Error']`
- `testCasesPassed`: Number
- `totalTestCases`: Number
- `executionTime`: Number (ms)
- `memoryUsed`: Number (KB)
- `submittedAt`: Date (Default: `Date.now`, indexed)

---

## 4. Work Completed & Implementation Phases

### Phase 1: Neumorphism Design System & Global Styles
- Created `frontend/src/styles/neumorphism.css` with CSS custom properties:
  - Surface clay background: `#e0e5ec`
  - Shadow matrices: Elevated `8px 8px 16px #c5c9ce, -8px -8px 16px #ffffff`
  - Inset pressed shadows: `inset 4px 4px 8px #c5c9ce, inset -4px -4px 8px #ffffff`
  - Functional accents: Indigo (`#4f46e5`), Emerald (`#10b981`), Amber (`#f59e0b`), Red (`#ef4444`)
  - Typography: Google Fonts `Outfit` (UI) and `JetBrains Mono` (Code)
  - Custom soft scrollbars, modals, pill toggles, and animated glow borders.
- Created `frontend/src/styles.css` importing global tokens and Google Fonts.

### Phase 2: Express Backend Architecture & MongoDB Atlas
- **Mongoose Models:** Authored all 6 schemas in `backend/src/models/` with cross-references, compound indexes, and pre-save password hashing.
- **Auth Middleware (`auth.middleware.js`):** Enforces Bearer JWT verification, resolves `student` or `staff` profiles, auto-heals missing student records, and exports `optionalAuth` for guest runs.
- **Auth Controller (`auth.controller.js`):**
  - `registerStudent`: Creates user + student profile with email as User ID, password, and auto-generated defaults.
  - `registerStaff`: Creates user + staff profile with employee ID and designation defaults.
  - `login`: Universal authentication comparing bcrypt hashes and automatically recognizing the user's authentic role.
  - `getMe`: Returns authenticated profile and permissions.
- **Problem Controller (`problem.controller.js`):**
  - `createProblem`: Allows faculty staff to persist new problems to MongoDB Atlas with smart defaults for formats and constraints.
  - `getAllProblems`: Lists problem bank items (omits hidden test cases for students).
  - `getTodayProblem`: Fetches the active daily challenge bound to today's date (`YYYY-MM-DD`).
  - `scheduleDailyProblem`: Binds problem ID to calendar dates in `dailyProblems`.
  - `deleteProblem`: Deletes problems and clears associated schedules.
- **Submission Controller (`submission.controller.js`):**
  - `executeTestCases`: Dry-run mode for public test cases using real code runner.
  - `submitSolution`: Evaluates public + hidden test cases, records metrics in `submissions`, and increments the student's `currentStreak`, `longestStreak`, and `totalSolved`.
  - `getLeaderboard`: Aggregates rankings filtered by Department and Graduation Batch.
  - `getMySubmissions`: Archives personal accepted solutions for students.

### Phase 3: Pre-Login Landing Page & Dual-Role Auth Portal
- Created `frontend/src/app/components/landing-auth/`:
  - **Hero Section:** Live metrics (`2,450+ Students`, `100% Sandboxed`, `4 Languages`, `18-Day Top Streak`).
  - **Simulated 3D Monaco Preview:** Interactive graphic displaying live code syntax and `[ACCEPTED]` benchmark chip.
  - **Spotlight Challenge:** Direct "Solve Now" access to Problem of the Day.
  - **Dual-Role Auth Modal:** Inset pill switcher between `🎓 Student Portal` and `💼 Staff Portal`, explicit labels for `User ID (Email Address)` and `Set Your Password`, 1-click test credential auto-fill, and registration fields.
  - **Instant 1-Click Access:** `Student Demo` and `Staff Demo` buttons in the navbar that sign in with authentic database credentials.

### Phase 4: Monaco Code Editor & Live Multi-Problem Switcher
- Created `frontend/src/app/components/code-editor/`:
  - Dynamically injects Monaco Editor AMD loader from CDN with native syntax fallback.
  - Custom `neu-soft-dark` Monaco theme matching the Neumorphic clay palette.
  - **Live Problem Selector Dropdown:** Fetches problems from MongoDB Atlas (`ProblemService.getAllProblems()`) and lets students switch between challenges (*Two Sum*, *Valid Anagram*, *Print N Numbers*, custom authored problems).
  - Multi-language boilerplates (Python, C, C++, Java) that update dynamically per problem.
  - Split-view layout: Problem statement, examples, and constraints on the left; Editor and Test Runner on the right.
  - **Run Code:** Dry-run against public test cases.
  - **Submit Solution:** Full evaluation against hidden test cases.
  - Detailed I/O diff cards (Input, Expected Output, Actual Output mismatch highlighting), execution time (ms), and memory (MB) chips.

### Phase 5: Leaderboard Engine & Personal Solution Library
- **College Leaderboard (`leaderboard.component.ts`):**
  - 3D Podium for Top 3 (1st Gold 👑, 2nd Silver 🥈, 3rd Bronze 🥉).
  - Dynamic filters for Department (`All, CSE, IT, AI&DS, ECE, MECH`) and Batch (`All, 2022-2026, 2023-2027`).
  - Progress bar accuracy meter and active streak tags.
- **Personal Solution Library (`solution-library.component.ts`):**
  - Personal archive grid of accepted submissions.
  - Code inspection modal displaying archived source code and benchmarks.
- **Staff Problem Bank & Scheduler (`staff-bank.component.ts`):**
  - Faculty portal for authoring problems with test suites.
  - Date scheduler binding problems to `YYYY-MM-DD`.
  - Connects directly to backend API (`POST /api/problems`) and persists to MongoDB Atlas.

### Phase 6: MongoDB Atlas Integration & Bug Fixes
1. **GitHub Security & `.gitignore`:**
   - Generated `.gitignore` in project root and backend ensuring `.env` is never pushed to GitHub.
   - Configured `.env.example` as a safe public template.
2. **Password URL Encoding (`%40`):**
   - Fixed URI parsing failure caused by `@` in the MongoDB Atlas password (`Uwais@123` -> `Uwais%40123`).
3. **DNS Resolution on Windows:**
   - Implemented custom Google DNS (`8.8.8.8` / `1.1.1.1`) resolver in `db.js` and `seed.js` to resolve `querySrv ECONNREFUSED` issues with local ISPs.
4. **Database Seeder (`backend/src/utils/seed.js`):**
   - Populated MongoDB Atlas `college_dailycoding` database with initial users, profiles, problems, daily problem bindings, and submissions.

### Phase 7: Real Sandboxed Code Execution Engine (`runner.js`)
- **Problem Diagnosed:** Previously, code evaluation used a superficial check (`!code.includes('return false')`). This caused **completely wrong code** (e.g. `return [0, 999]` or wrong answers) to pass and be marked `Accepted`.
- **Solution Implemented:**
  - Built `backend/src/utils/runner.js` which executes Python code in an isolated child process using system Python 3.
  - **Input Parsing:** Splits test case lines and parses space-separated integers, JSON arrays, and strings into typed function arguments.
  - **Callable Invocation:** Finds the primary user-defined function (`twoSum`, `isAnagram`, `printNumbers`) and executes `primary_func(*parsed_args)`.
  - **Exact Output Comparison:** Normalizes list spacing (`[0, 1]` vs `[0,1]`), boolean casing, and whitespace, and compares against `expectedOutput`.
  - **Error Interception:** Catches syntax/indentation errors as `Compilation Error`, runtime exceptions (`ZeroDivisionError`, `IndexError`, `TypeError`) as `Runtime Error`, and enforces a 5000ms timeout for `Time Limit Exceeded`.

### Phase 8: Robust Database Persistence & CastError Resolution
- **Problem Diagnosed:** Submissions failed to store in the database because the frontend hardcoded `_id: 'prob-001'`. Mongoose threw `CastError: Cast to ObjectId failed for value "prob-001"`, and the frontend silently fell back to local offline simulation.
- **Solution Implemented:**
  - Added `resolveProblem(problemId)` in `submission.controller.js` to safely resolve valid ObjectIds, titles, or latest active problems.
  - Connected `code-editor.component.ts` to `ProblemService.getAllProblems()` so real MongoDB ObjectIds are bound to every submission.
  - Added `optionalAuth` to `/api/submissions` so authenticated students permanently store submission records and increment streaks, while guest playground test runs remain supported.
  - Verified live persistence: Submission `6ac7d0bf429f3b562eef0e54` successfully persisted in the MongoDB Atlas `submissions` collection.

### Phase 9: User Identity & Self-Service Authentication Overhaul
- **Problem Diagnosed:** The user pill in the top navigation displayed roll numbers (`22CS104`) or employee IDs (`EMP-9041`) instead of the user's actual Email ID, and registration forms were rigid.
- **Solution Implemented:**
  - Updated `app.component.ts` so the user pill explicitly displays the student's **Email ID** as their primary **User ID** (`currentUser.email`).
  - Redesigned the auth modal with explicit labels: `User ID (Email Address)` and `Set Your Password`.
  - Updated `auth.controller.js` and `landing-auth.component.ts` to auto-generate `rollNumber` and `employeeId` if omitted, enabling clean registration with Name, Email, and custom password.
  - Enabled universal login automatically recognizing the user's authentic database role.

### Phase 10: Solved/Unsolved Filtering, Flexible N-Test Cases & Question Difficulty Outlines
- **Solved & Unsolved Problems Filter:**
  - Expanded `solution-library` into a 3-way view: `🌐 All Problems`, `✅ My Solved`, and `⏳ Unsolved Problems`.
  - Added quick filter pill `⚡ Only Unsolved` to instantly filter catalog down to problems the logged-in student has not yet solved.
  - Added status tags (`✅ Solved`, `⏳ Unsolved`) on all question cards.
  - Integrated `filterOnlyUnsolved` toggle into `code-editor.component.ts` both in the challenge selector and empty-state picker.
- **Flexible Test Cases & Hidden "N" Section (Staff Portal):**
  - Updated `staff-bank` problem authoring modal with 3 default flexible Public Test Cases and dynamic `➕ Add Public Case` button.
  - Added dedicated `🔒 Hidden Assessment Test Cases ("N" Section)` with `➕ Add Hidden Case` button to support arbitrary $N$ evaluation test cases.
  - Added individual row delete buttons (`✕`) for flexible test case management.
- **Staff Name Displayed Below Questions:**
  - Updated `backend/src/controllers/problem.controller.js` to populate `createdBy` (`name`, `email`, `role`) on `getAllProblems`, `getProblemById`, and `getTodayProblem`.
  - Displayed staff attribution card (`👨‍🏫 Question Staff Author: [Name]`) directly below question statements in `code-editor`, `solution-library` cards/modals, and `staff-bank`.
- **Question Difficulty Outlines (Green, Yellow, Red):**
  - Added neumorphic outline tokens in `neumorphism.css`: `.outline-easy` (Green `#10b981`), `.outline-medium` (Yellow `#f59e0b`), `.outline-hard` (Red `#ef4444`).
  - Applied dynamic outlines to question containers across `code-editor` problem panel, `solution-library` cards and modals, and `staff-bank` problem cards.

---

## 5. Complete File Tree

```text
c:\FSWAD Project\
├── .gitignore                                  # Root gitignore blocking .env and node_modules
├── context.md                                  # Complete project documentation and context
├── backend\
│   ├── .env                                    # Local MongoDB Atlas connection string (private)
│   ├── .env.example                            # Safe public template for GitHub
│   ├── .gitignore                              # Backend gitignore
│   ├── package.json                            # Backend scripts and dependencies
│   └── src\
│       ├── server.js                           # Express entrypoint on port 5000
│       ├── config\
│       │   └── db.js                           # Resilient MongoDB Atlas connection with DNS fix
│       ├── models\
│       │   ├── user.model.js                   # Users schema (strictly 'student' | 'staff')
│       │   ├── student.model.js                # Students schema with streaks & batch
│       │   ├── staff.model.js                  # Staff schema with employeeId & designation
│       │   ├── problem.model.js                # Problems schema with public & hidden tests
│       │   ├── dailyProblem.model.js           # Daily calendar binding schema (YYYY-MM-DD)
│       │   ├── submission.model.js             # Submissions schema with execution metrics
│       │   └── index.js                        # Central model barrel export
│       ├── middleware\
│       │   └── auth.middleware.js              # JWT authentication, optionalAuth & strict RoleGuard
│       ├── controllers\
│       │   ├── auth.controller.js              # Student/Staff registration, universal login, getMe
│       │   ├── problem.controller.js           # Problem Bank & Daily Scheduler CRUD with smart defaults
│       │   └── submission.controller.js        # Real code runner submission, persistence & leaderboard engine
│       ├── routes\
│       │   ├── auth.routes.js                  # Auth route mapping
│       │   ├── problem.routes.js               # Problem bank route mapping
│       │   └── submission.routes.js            # Submission & leaderboard route mapping
│       └── utils\
│           ├── runner.js                       # Real sandboxed code execution engine (Python 3 child process)
│           └── seed.js                         # Database seeder (npm run seed)
└── frontend\
    ├── angular.json                            # Angular workspace configuration
    ├── package.json                            # Frontend dependencies & scripts
    ├── tsconfig.json                           # Root TypeScript compiler options
    ├── tsconfig.app.json                       # App build TypeScript options
    ├── .gitignore                              # Frontend gitignore
    └── src\
        ├── index.html                          # Root mount with Google Fonts preconnected
        ├── main.ts                             # Angular bootstrap with HTTP interceptors
        ├── styles.css                          # Global styles importing neumorphism tokens
        ├── styles\
        │   └── neumorphism.css                 # Complete Neumorphic design system tokens
        └── app\
            ├── app.component.ts                # Workspace shell with dynamic tab navigation & email User ID
            ├── core\
            │   ├── models\
            │   │   ├── auth.model.ts           # Interfaces for User, Student, Staff, Auth
            │   │   └── problem.model.ts        # Interfaces for Problem, TestCase, ExecutionResult
            │   ├── interceptors\
            │   │   └── auth.interceptor.ts     # Automatic Bearer JWT injection
            │   ├── guards\
            │   │   └── role.guard.ts           # Route guard strictly separating student & staff
            │   └── services\
            │       ├── auth.service.ts         # Authentication state & login flows (real JWT sync)
            │       ├── problem.service.ts      # Problem Bank API client
            │       └── execution.service.ts    # Code runner execution service
            └── components\
                ├── landing-auth\               # Pre-login hero & dual-role auth modal with User ID as Email
                ├── code-editor\                # Monaco editor, live problem switcher & test runner
                ├── leaderboard\                # Department & Batch leaderboard with 3D podium
                ├── solution-library\           # Personal solution archive
                └── staff-bank\                 # Faculty problem authoring & scheduler
```

---

## 6. How to Run & Test the Application

### 1. Start the Backend API (Port 5000)
```powershell
cd "c:\FSWAD Project\backend"
npm run dev
```

### 2. Start the Angular Client (Port 4200)
```powershell
cd "c:\FSWAD Project\frontend"
npm start
```

### 3. Reseed Database (Optional Maintenance)
```powershell
cd "c:\FSWAD Project\backend"
npm run seed
```

### 4. Active Test Credentials in MongoDB Atlas
- **Faculty Staff Account:** `s.mitchell@college.edu` / `StaffPass123!`
- **Student Practice Account:** `alex.johnson@college.edu` / `StudentPass123!`
- **Custom Account:** Register any personal Email ID as your User ID with a custom password (min 6 characters) via the Register tab.
