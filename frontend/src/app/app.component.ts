import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { User, StudentProfile, StaffProfile } from './core/models/auth.model';
import { LandingAuthComponent } from './components/landing-auth/landing-auth.component';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { SolutionLibraryComponent } from './components/solution-library/solution-library.component';
import { StaffBankComponent } from './components/staff-bank/staff-bank.component';

type WorkspaceTab = 'editor' | 'leaderboard' | 'library' | 'staff-bank';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LandingAuthComponent,
    CodeEditorComponent,
    LeaderboardComponent,
    SolutionLibraryComponent,
    StaffBankComponent
  ],
  template: `
    <!-- Case 1: Pre-login Landing Page & Auth Portal -->
    <app-landing-auth
      *ngIf="!currentUser && !isGuestMode"
      (openGuestPractice)="enableGuestPractice()"
    ></app-landing-auth>

    <!-- Case 2: Authenticated Workspace (Or Guest Playground) -->
    <div class="workspace-wrapper" *ngIf="currentUser || isGuestMode">
      <!-- Neumorphic Workspace Top Navigation -->
      <header class="workspace-header">
        <nav class="neu-navbar neu-card">
          <!-- Left: Brand Identity -->
          <div class="nav-left">
            <div class="brand-box" (click)="returnToLanding()">
              <div class="brand-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </div>
              <div class="brand-text">
                <span class="brand-name">College DailyCoding</span>
                <span class="portal-tag">
                  {{ isGuestMode ? 'Guest Sandbox Playground' : (currentUser?.role === 'staff' ? 'Staff Faculty Portal' : 'Student Practice Portal') }}
                </span>
              </div>
            </div>

            <!-- Workspace Tabs Navigation -->
            <div class="tabs-group neu-card-inset">
              <!-- Student Tabs -->
              <ng-container *ngIf="!currentUser || currentUser.role === 'student'">
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'editor'"
                  (click)="activeTab = 'editor'"
                >
                  <span>💻</span> Daily Problem
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'leaderboard'"
                  (click)="activeTab = 'leaderboard'"
                >
                  <span>🏆</span> Leaderboard
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'library'"
                  (click)="activeTab = 'library'"
                  *ngIf="currentUser"
                >
                  <span>📚</span> Problems & Solutions Library
                </button>
              </ng-container>

              <!-- Staff Tabs -->
              <ng-container *ngIf="currentUser?.role === 'staff'">
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'staff-bank'"
                  (click)="activeTab = 'staff-bank'"
                >
                  <span>📁</span> Problem Bank & Scheduler
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'editor'"
                  (click)="activeTab = 'editor'"
                >
                  <span>💻</span> Code Runner Sandbox
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'leaderboard'"
                  (click)="activeTab = 'leaderboard'"
                >
                  <span>🏆</span> College Leaderboard
                </button>
              </ng-container>
            </div>
          </div>

          <!-- Right: Profile & Actions -->
          <div class="nav-right">
            <!-- Role Badge -->
            <span
              class="neu-badge"
              [ngClass]="currentUser.role === 'staff' ? 'neu-badge-staff' : 'neu-badge-student'"
              *ngIf="currentUser"
            >
              {{ currentUser.role === 'staff' ? 'Faculty Staff' : 'Student' }}
            </span>

            <!-- User Info Pill -->
            <div class="user-pill neu-card-flat" *ngIf="currentUser">
              <div class="avatar-sm">
                {{ currentUser.name.charAt(0) }}
              </div>
              <div class="user-meta">
                <span class="user-name">{{ currentUser.name }}</span>
                <span class="user-id" [title]="'User ID: ' + currentUser.email">
                  {{ currentUser.email }}
                </span>
              </div>
            </div>

            <!-- Guest Mode Badge -->
            <div class="guest-indicator neu-card-flat" *ngIf="isGuestMode && !currentUser">
              <span class="guest-dot"></span>
              <span>Guest Session</span>
            </div>

            <!-- Sign Out / Exit Guest Mode -->
            <button
              type="button"
              class="neu-btn neu-btn-sm"
              (click)="onSignOut()"
              [title]="currentUser ? 'Sign out of your session' : 'Return to landing page'"
            >
              <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {{ currentUser ? 'Sign Out' : 'Exit Playground' }}
            </button>
          </div>
        </nav>
      </header>

      <!-- Main Dynamic Content Workspace -->
      <main class="workspace-body">
        <!-- Tab 1: Monaco Code Editor & Test Case Runner -->
        <div class="tab-pane" *ngIf="activeTab === 'editor'">
          <app-code-editor></app-code-editor>
        </div>

        <!-- Tab 2: College Leaderboard Engine -->
        <div class="tab-pane" *ngIf="activeTab === 'leaderboard'">
          <app-leaderboard></app-leaderboard>
        </div>

        <!-- Tab 3: Personal Solution Library -->
        <div class="tab-pane" *ngIf="activeTab === 'library'">
          <app-solution-library (solveProblem)="onSolveProblem($event)"></app-solution-library>
        </div>

        <!-- Tab 4: Staff Problem Bank & Scheduler -->
        <div class="tab-pane" *ngIf="activeTab === 'staff-bank'">
          <app-staff-bank></app-staff-bank>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .workspace-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--neu-bg);
    }

    .workspace-header {
      padding: 1rem 1.5rem 0.5rem 1.5rem;
    }

    .neu-navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 1.25rem;
      border-radius: var(--neu-radius-lg);
      gap: 1rem;
      flex-wrap: nowrap;
      overflow-x: auto;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-shrink: 0;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      cursor: pointer;
    }

    .brand-logo-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--neu-radius-md);
      background: var(--neu-primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 4px 4px 10px rgba(79, 70, 229, 0.4), -4px -4px 10px #ffffff;
    }

    .brand-logo-icon svg {
      width: 22px;
      height: 22px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--neu-text-primary);
      letter-spacing: -0.01em;
    }

    .portal-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--neu-text-muted);
    }

    /* Tabs Group */
    .tabs-group {
      display: flex;
      align-items: center;
      padding: 0.25rem 0.4rem;
      border-radius: var(--neu-radius-pill);
      gap: 0.35rem;
    }

    .tab-btn {
      font-family: var(--neu-font-sans);
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.45rem 1rem;
      border-radius: var(--neu-radius-pill);
      background: transparent;
      border: none;
      color: var(--neu-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: var(--neu-transition-fast);
    }

    .tab-btn:hover {
      color: var(--neu-primary);
    }

    .tab-btn.active {
      background: var(--neu-bg);
      color: var(--neu-primary);
      box-shadow: var(--neu-shadow-sm);
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.35rem 0.85rem;
      border-radius: var(--neu-radius-pill);
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--neu-primary-gradient);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--neu-text-primary);
      line-height: 1.2;
    }

    .user-id {
      font-size: 0.7rem;
      color: var(--neu-text-muted);
    }

    .guest-indicator {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--neu-text-muted);
      padding: 0.35rem 0.75rem;
      border-radius: var(--neu-radius-pill);
    }

    .guest-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
    }

    .logout-icon {
      width: 15px;
      height: 15px;
    }

    .workspace-body {
      flex: 1;
      padding-bottom: 2rem;
    }

    .tab-pane {
      animation: tab-enter 0.25s ease-out;
    }

    @keyframes tab-enter {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AppComponent implements OnInit {
  currentUser: User | null = null;
  studentProfile: StudentProfile | null = null;
  staffProfile: StaffProfile | null = null;

  isGuestMode: boolean = false;
  activeTab: WorkspaceTab = 'editor';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.isGuestMode = false;
        // Default tabs based on role
        if (user.role === 'staff') {
          this.activeTab = 'staff-bank';
        } else {
          this.activeTab = 'editor';
        }
      }
    });

    this.authService.currentProfile$.subscribe((profile) => {
      if (this.currentUser?.role === 'student') {
        this.studentProfile = profile as StudentProfile;
      } else if (this.currentUser?.role === 'staff') {
        this.staffProfile = profile as StaffProfile;
      }
    });
  }

  enableGuestPractice(): void {
    this.isGuestMode = true;
    this.activeTab = 'editor';
  }

  returnToLanding(): void {
    if (this.isGuestMode && !this.currentUser) {
      this.isGuestMode = false;
    }
  }

  onSolveProblem(problem: any): void {
    this.activeTab = 'editor';
  }

  onSignOut(): void {
    this.authService.logout();
    this.isGuestMode = false;
    this.activeTab = 'editor';
  }
}
