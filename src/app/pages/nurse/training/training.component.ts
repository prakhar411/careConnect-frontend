import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { TrainingService } from '../../../services/training.service';
import { AdminService } from '../../../services/admin.service';
import { NurseService } from '../../../services/nurse.service';

@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit, OnDestroy {

  unreadCount = 0;
  private notifSub!: Subscription;
  private userId!: number;

  isLoading = true;

  activeTab: 'courses' | 'mandatory' | 'transcript' | 'career' = 'courses';
  filterCategory = 'All';
  categories = ['All', 'Critical Care', 'Emergency', 'Pediatric', 'Compliance', 'Leadership', 'General'];

  // ── Static course catalog ─────────────────────────────────────────────────
  readonly STATIC_COURSES = [
    { title: 'Advanced ICU Nursing Protocols',    category: 'Critical Care', credits: 12, duration: '12 hrs', provider: 'NurseEdu Online' },
    { title: 'BLS Recertification',               category: 'Emergency',    credits: 4,  duration: '4 hrs',  provider: 'American Heart Association' },
    { title: 'Pediatric Emergency Care',          category: 'Pediatric',    credits: 8,  duration: '8 hrs',  provider: 'NurseEdu Online' },
    { title: 'HIPAA Compliance & Privacy',        category: 'Compliance',   credits: 2,  duration: '2 hrs',  provider: 'CareConnect Learning' },
    { title: 'Nurse Leadership & Team Management',category: 'Leadership',   credits: 6,  duration: '6 hrs',  provider: 'NurseEdu Online' },
    { title: 'Infection Control & Prevention',    category: 'Compliance',   credits: 3,  duration: '3 hrs',  provider: 'WHO Learning' },
    { title: 'Wound Care Management',             category: 'General',      credits: 4,  duration: '4 hrs',  provider: 'NurseEdu Online' },
    { title: 'Medication Administration Safety',  category: 'General',      credits: 3,  duration: '3 hrs',  provider: 'INC Learning' },
    { title: 'Stroke Recognition & Response',     category: 'Emergency',    credits: 5,  duration: '5 hrs',  provider: 'NurseEdu Online' },
    { title: 'Dementia & Elderly Care',           category: 'General',      credits: 6,  duration: '6 hrs',  provider: 'CareConnect Learning' },
    { title: 'Neonatal Care Essentials',          category: 'Pediatric',    credits: 8,  duration: '8 hrs',  provider: 'NurseEdu Online' },
    { title: 'Critical Care Ventilator Management',category: 'Critical Care',credits: 10, duration: '10 hrs', provider: 'AACN Learning' },
  ];

  // ── Completed course names from DB ────────────────────────────────────────
  completedCourseNames = new Set<string>();
  completingTitle = '';
  completions: any[] = [];

  // ── Org mandatory courses (only from nurse's active orgs) ────────────────
  orgCourses: any[] = [];
  private activeOrgMap = new Map<number, string>(); // orgUserId → orgName

  // ── Credentials for renewal tracker ──────────────────────────────────────
  credentials: any[] = [];

  // ── Summary stats ─────────────────────────────────────────────────────────
  get totalCredits(): number {
    return this.completions.reduce((s, c) => s + (c.creditPoints || 0), 0);
  }
  get thisYearCredits(): number {
    const y = new Date().getFullYear();
    return this.completions
      .filter(c => new Date(c.completedAt).getFullYear() === y)
      .reduce((s, c) => s + (c.creditPoints || 0), 0);
  }

  // ── Career resources (AC 11.5) ────────────────────────────────────────────
  readonly CAREER_PATHS = [
    { role: 'ICU / Critical Care Nurse',   icon: '🫀', skills: ['ACLS', 'Ventilator Mgmt', 'CCRN Cert'], avg: '₹45,000–₹70,000/mo' },
    { role: 'Emergency / ER Nurse',        icon: '🚨', skills: ['BLS', 'TNCC', 'Triage Protocols'],      avg: '₹40,000–₹65,000/mo' },
    { role: 'Pediatric Nurse',             icon: '👶', skills: ['PALS', 'Neonatal Care', 'PALS Cert'],   avg: '₹35,000–₹55,000/mo' },
    { role: 'Nurse Educator / Trainer',    icon: '📚', skills: ['Leadership', 'Curriculum Dev', 'CNE'],  avg: '₹50,000–₹80,000/mo' },
    { role: 'Home Healthcare Nurse',       icon: '🏠', skills: ['Wound Care', 'IV Therapy', 'Patient Ed'],avg: '₹30,000–₹50,000/mo' },
  ];

  readonly MENTORSHIP_TIPS = [
    'Aim for 30 CEU credits per year to stay current with nursing best practices',
    'ACLS and BLS certifications are required for most critical care positions',
    'Document all professional development activities — transcripts matter for promotion',
    'Join nursing associations (INC, TNAI) for networking and career advancement',
    'Specialization certifications (CCRN, CPN) significantly increase earning potential',
  ];

  constructor(
    private auth:        AuthService,
    private notifSvc:    NotificationService,
    private trainingSvc: TrainingService,
    private adminSvc:    AdminService,
    private nurseSvc:    NurseService
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.notifSvc.initSSE(this.userId);
    this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
    this.loadAll();
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  private loadAll(): void {
    this.isLoading = true;
    forkJoin({
      completions:  this.trainingSvc.getNurseHistory(this.userId),
      allCourses:   this.trainingSvc.getAllOrgCourses(),
      credentials:  this.adminSvc.getOrgCredentials(this.userId),
      applications: this.nurseSvc.getApplications(this.userId)
    }).subscribe({
      next: ({ completions, allCourses, credentials, applications }) => {
        this.completions = completions || [];
        this.completedCourseNames = new Set(this.completions.map((c: any) => c.courseName));

        // Build map of orgUserId → orgName from APPROVED applications only
        this.activeOrgMap.clear();
        (applications || [])
          .filter((a: any) => (a.status || '').toUpperCase() === 'APPROVED' && a.orgUserId)
          .forEach((a: any) => this.activeOrgMap.set(a.orgUserId, a.organizationName || 'Organization'));

        // Show only courses from orgs the nurse actively works for
        this.orgCourses = (allCourses || [])
          .filter((c: any) => this.activeOrgMap.has(c.orgUserId));

        this.credentials = credentials || [];
        this.isLoading   = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  offeredBy(course: any): string {
    return this.activeOrgMap.get(course.orgUserId) || 'Organization';
  }

  // ── Filtered static courses ───────────────────────────────────────────────
  get filteredStaticCourses(): any[] {
    const list = this.filterCategory === 'All'
      ? this.STATIC_COURSES
      : this.STATIC_COURSES.filter(c => c.category === this.filterCategory);
    return list;
  }

  isCompleted(title: string): boolean { return this.completedCourseNames.has(title); }

  markComplete(course: any, source = 'STATIC', orgCourseId?: number): void {
    if (this.isCompleted(course.title) || this.completingTitle === course.title) return;
    this.completingTitle = course.title;
    this.trainingSvc.completeTraining(this.userId, {
      courseName:   course.title,
      category:     course.category,
      creditPoints: course.creditPoints || course.credits,
      source,
      orgCourseId:  orgCourseId
    }).subscribe({
      next: (rec) => {
        this.completions.unshift(rec);
        this.completedCourseNames.add(course.title);
        this.completingTitle = '';
      },
      error: () => { this.completingTitle = ''; }
    });
  }

  // ── Credential renewal tracker ────────────────────────────────────────────
  expiryDaysLeft(d: string): number | null {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  }

  expiryClass(d: string): string {
    const days = this.expiryDaysLeft(d);
    if (days === null) return '';
    return days < 0 ? 'renew-expired' : days <= 30 ? 'renew-soon' : 'renew-ok';
  }

  expiryLabel(d: string): string {
    const days = this.expiryDaysLeft(d);
    if (days === null) return '';
    return days < 0 ? 'Expired' : days <= 30 ? `${days}d left` : 'Valid';
  }

  get expiringCredentials(): any[] {
    return this.credentials.filter(c => {
      const d = this.expiryDaysLeft(c.expiryDate);
      return d !== null && d <= 60;
    }).sort((a, b) => {
      return (this.expiryDaysLeft(a.expiryDate) ?? 0) - (this.expiryDaysLeft(b.expiryDate) ?? 0);
    });
  }

  // ── Transcript ────────────────────────────────────────────────────────────
  downloadTranscript(): void {
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows = this.completions.map(c => `
      <tr>
        <td>${c.courseName}</td>
        <td>${c.category || '—'}</td>
        <td>${c.creditPoints || 0} CEUs</td>
        <td>${c.source || 'STATIC'}</td>
        <td>${c.completedAt ? new Date(c.completedAt).toLocaleDateString('en-IN') : '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Professional Development Transcript</title>
<style>
  body{font-family:Arial,sans-serif;margin:30px;color:#1a1a2e;}
  h1{color:#0f5241;font-size:18pt;border-bottom:3px solid #0f5241;padding-bottom:8px;}
  .meta{color:#666;font-size:10pt;margin-bottom:20px;}
  .summary{background:#f0fdf4;border:1.5px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:11pt;}
  table{width:100%;border-collapse:collapse;font-size:10pt;}
  th{background:#0f5241;color:white;padding:8px 10px;text-align:left;}
  td{border:1px solid #ccc;padding:6px 10px;}
  tr:nth-child(even){background:#f5f8ff;}
  .footer{text-align:center;margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;}
</style></head><body>
<h1>Professional Development Transcript</h1>
<div class="meta">Generated: ${date} &nbsp;|&nbsp; CareConnect Platform</div>
<div class="summary">
  <strong>Total CEU Credits Earned:</strong> ${this.totalCredits} &nbsp;|&nbsp;
  <strong>Courses Completed:</strong> ${this.completions.length} &nbsp;|&nbsp;
  <strong>This Year:</strong> ${this.thisYearCredits} CEUs
</div>
<table>
  <tr><th>Course Name</th><th>Category</th><th>Credits</th><th>Source</th><th>Completed On</th></tr>
  ${rows}
</table>
<div class="footer">CareConnect — Official Professional Development Transcript</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  logout(): void { this.auth.logout(); }
}
