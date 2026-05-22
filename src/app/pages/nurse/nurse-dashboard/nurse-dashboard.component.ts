import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { AppointmentService } from '../../../services/appointment.service';
import { PaymentService } from '../../../services/payment.service';
import { NotificationService } from '../../../services/notification.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';

interface DashJob {
  type:      'org' | 'patient';
  id:        number;
  title:     string;
  subtitle:  string;
  location:  string;
  salaryText:string;
  salaryRaw: number;
  priority?: string;
  raw:       any;
}

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css']
})
export class NurseDashboardComponent implements OnInit, OnDestroy {

  isLoading = true;

  nurseName         = 'Nurse';
  nurseSpecialty    = '—';
  nurseExperience   = '—';
  profileCompletion = 0;
  avatarLetter      = 'N';

  upcomingShifts    = 0;
  monthlyEarnings   = '—';
  applicationsCount = 0;

  quickActions = [
    { icon: 'bi-briefcase-fill',        label: 'Browse Jobs',   route: '/nurse-available-jobs', bgColor: '#e3f6ef', color: '#1aa37a' },
    { icon: 'bi-journal-bookmark-fill', label: 'Applications',  route: '/nurse-applications',   bgColor: '#e8f0fe', color: '#1a73e8' },
    { icon: 'bi-calendar3',             label: 'My Schedule',   route: '/nurse-schedule',        bgColor: '#fef3e2', color: '#d68910' },
    { icon: 'bi-person-badge',          label: 'My Profile',    route: '/nurse-profile',         bgColor: '#fde8e8', color: '#c0392b' },
  ];

  isAvailable       = true;
  isVerifiedByAdmin = false;

  recentAppointments: any[] = [];
  recentApplications: any[] = [];
  topJobs: DashJob[]   = [];
  selectedDashJob: DashJob | null = null;

  // Mark Shift Done modal
  shiftModal: any = null;      // the appointment being marked
  shiftRate         = '';
  shiftNotes        = '';
  shiftRateError    = '';
  isMarkingShift    = false;
  shiftSuccessMsg   = '';

  unreadCount = 0;
  private notifSub!: Subscription;

  constructor(
    private auth:        AuthService,
    private nurseSvc:    NurseService,
    private apptService: AppointmentService,
    private paymentSvc:  PaymentService,
    private notifSvc:    NotificationService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }
    this.notifSvc.initSSE(userId);
    this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);

    forkJoin({
      profile:      this.nurseSvc.getProfile(userId),
      appointments: this.apptService.getByNurse(userId),
      applications: this.nurseSvc.getApplications(userId),
      orgJobs:      this.nurseSvc.getJobs(),
      openRequests: this.apptService.getOpen(),
    }).subscribe({
      next: ({ profile, appointments, applications, orgJobs, openRequests }) => {
        this.buildProfile(profile);
        this.buildAppointments(appointments);
        this.buildApplications(applications);
        this.buildTopJobs(orgJobs, openRequests);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Builders ────────────────────────────────────────────────────────────────

  private buildProfile(profile: any): void {
    this.nurseName        = profile.firstName ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : (profile.fullName || 'Nurse');
    this.nurseSpecialty   = profile.specialization || '—';
    this.nurseExperience  = profile.experienceYears != null ? profile.experienceYears + ' Yrs Exp' : '—';
    this.avatarLetter     = (this.nurseName || 'N')[0].toUpperCase();
    this.profileCompletion = this.calcCompletion(profile);
    this.isVerifiedByAdmin = !!profile.verifiedByAdmin;
  }

  private buildAppointments(appointments: any[]): void {
    const now      = new Date();
    const upcoming = (appointments || []).filter((a: any) => {
      const d = new Date(a.appointmentDate);
      return d > now && (a.status === 'PENDING' || a.status === 'CONFIRMED');
    });
    this.upcomingShifts    = upcoming.length;
    this.recentAppointments = upcoming.slice(0, 3);
  }

  private buildApplications(applications: any[]): void {
    this.applicationsCount  = (applications || []).length;
    this.recentApplications = (applications || []).slice(0, 3).map((a: any) => ({
      jobTitle: a.jobTitle,
      status:   a.status
    }));
  }

  private buildTopJobs(orgJobs: any[], openRequests: any[]): void {
    const dashJobs: DashJob[] = [];

    // Org / hospital jobs
    for (const j of (orgJobs || [])) {
      const salaryMax = j.salaryMax || j.salaryMin || 0;
      dashJobs.push({
        type:       'org',
        id:         j.id,
        title:      j.jobTitle,
        subtitle:   j.organizationName || 'Organisation',
        location:   j.location || '—',
        salaryText: salaryMax ? `₹${Number(salaryMax).toLocaleString('en-IN')}/mo` : 'Negotiable',
        salaryRaw:  salaryMax,
        priority:   j.priority,
        raw:        j,
      });
    }

    // Patient requests
    for (const r of (openRequests || [])) {
      const loc = [r.patientCity, r.patientState].filter(Boolean).join(', ') || 'India';
      dashJobs.push({
        type:       'patient',
        id:         r.id,
        title:      r.careNeeds || 'Home Care',
        subtitle:   'Patient Request',
        location:   loc,
        salaryText: 'Open Bid',
        salaryRaw:  0,
        priority:   r.priority,
        raw:        r,
      });
    }

    // Sort: newest first (highest id = most recently posted)
    dashJobs.sort((a, b) => b.id - a.id);

    this.topJobs = dashJobs.slice(0, 5);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private calcCompletion(profile: any): number {
    const fields = ['fullName', 'licenseNumber', 'phone', 'specialization',
                    'education', 'availability', 'expertise', 'addressLine1'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  openDashJob(job: DashJob): void  { this.selectedDashJob = job; }
  closeDashJob(): void             { this.selectedDashJob = null; }

  formatJobType(jt: string): string {
    const m: Record<string,string> = { PERMANENT:'Permanent', TEMPORARY:'Temporary', CONTRACT:'Contract', EMERGENCY:'Emergency' };
    return m[jt] ?? jt;
  }

  toggleAvailability(): void { this.isAvailable = !this.isAvailable; }

  priorityClass(p?: string): string {
    if (!p) return '';
    const u = p.toUpperCase();
    return u === 'EMERGENCY' ? 'badge-emergency' : u === 'URGENT' ? 'badge-urgent' : 'badge-normal';
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 's-accepted' : s === 'REJECTED' ? 's-rejected' : s === 'PENDING' ? 's-applied' : 's-default';
  }

  displayStatus(s: string): string {
    const m: Record<string,string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
    return m[(s||'').toUpperCase()] || s;
  }

  // ── Mark Shift Done ──────────────────────────────────────────────────────

  openShiftModal(appt: any): void {
    this.shiftModal    = appt;
    this.shiftRate     = '';
    this.shiftNotes    = '';
    this.shiftRateError = '';
    this.shiftSuccessMsg = '';
  }

  closeShiftModal(): void { this.shiftModal = null; }

  submitShiftDone(): void {
    const rate = parseFloat(this.shiftRate);
    if (!this.shiftRate || isNaN(rate) || rate < 1) {
      this.shiftRateError = 'Please enter a valid rate (min ₹1).';
      return;
    }
    this.shiftRateError  = '';
    this.isMarkingShift  = true;
    const apptId = this.shiftModal.id ?? this.shiftModal.raw?.id;
    this.paymentSvc.markShiftComplete(this.auth.getUserId()!, apptId, rate, this.shiftNotes).subscribe({
      next: () => {
        this.isMarkingShift  = false;
        this.shiftSuccessMsg = 'Shift marked complete! Patient will be notified.';
        setTimeout(() => { this.closeShiftModal(); }, 2000);
      },
      error: (err: Error) => {
        this.shiftRateError = err.message;
        this.isMarkingShift = false;
      }
    });
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  logout(): void { this.auth.logout(); }
}
