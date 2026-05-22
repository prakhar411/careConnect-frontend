import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { AppointmentService } from '../../../services/appointment.service';
import { NotificationService } from '../../../services/notification.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit, OnDestroy {

  filterForm!: FormGroup;
  isLoading = true;
  activeTab: 'available' | 'applied' = 'available';
  unreadCount   = 0;
  private notifSub!: Subscription;

  // ── Available: Org jobs ──────────────────────────────────────
  allJobs:       any[] = [];   // backend jobs minus already-applied
  filteredJobs:  any[] = [];
  emergencyJobs: any[] = [];   // emergency-flagged jobs

  // ── Available: Patient requests ──────────────────────────────
  openRequests:      any[] = [];   // regular open requests minus applied/declined
  emergencyRequests: any[] = [];   // emergency open requests minus applied/declined

  // ── Applied section ──────────────────────────────────────────
  appliedOrgJobs:      any[] = [];  // ApplicationResponse list
  appliedPatientBids:  any[] = [];  // AppointmentApplicationResponse list

  // Lookup sets (rebuilt on every load)
  private appliedJobIds      = new Set<number>();
  private appliedRequestIds  = new Set<number>();
  private declinedRequestIds = new Set<number>();

  // ── Org job modal ─────────────────────────────────────────────
  selectedJob:  any  = null;
  isApplying        = false;
  applyError        = '';
  applySuccess      = false;

  // ── Patient request modal ─────────────────────────────────────
  selectedRequest:     any  = null;
  applySalary:         number | null = null;
  applyNote            = '';
  isApplyingRequest    = false;
  applyRequestError    = '';
  applyRequestSuccess  = false;
  isWithdrawing        = false;
  withdrawError        = '';

  // ── Filter dropdowns ─────────────────────────────────────────
  locations:          string[] = ['All'];
  specialties:        string[] = ['All'];
  facilityTypes:      string[] = ['All'];
  patientPopulations: string[] = ['All'];
  jobTypes    = ['All', 'PERMANENT', 'TEMPORARY', 'CONTRACT', 'EMERGENCY'];
  jobTypeLabels: Record<string, string> = {
    All: 'All Types', PERMANENT: 'Permanent', TEMPORARY: 'Temporary',
    CONTRACT: 'Contract', EMERGENCY: 'Emergency'
  };

  savedSearchExists = false;
  private get searchKey(): string { return `cc_saved_search_${this.auth.getUserId() ?? 'nurse'}`; }

  constructor(
    private auth:        AuthService,
    private nurseSvc:    NurseService,
    private apptService: AppointmentService,
    private fb:          FormBuilder,
    private notifSvc:    NotificationService
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      location: ['All'], specialty: ['All'], jobType: ['All'],
      facilityType: ['All'], patientPopulation: ['All'], search: ['']
    });
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
    this.savedSearchExists = !!localStorage.getItem(this.searchKey);
    const uid = this.auth.getUserId();
    if (uid) {
      this.notifSvc.initSSE(uid);
      this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
    }
    this.nurseSvc.getEmergencyJobs().subscribe(jobs => this.emergencyJobs = jobs);
    this.loadAll();
  }

  // ── localStorage helpers for declined requests ────────────────
  private declineKey(): string {
    return `cc_declined_appts_${this.auth.getUserId()}`;
  }
  private loadDeclined(): Set<number> {
    try {
      const raw = localStorage.getItem(this.declineKey());
      if (raw) return new Set<number>(JSON.parse(raw));
    } catch {}
    return new Set<number>();
  }
  private saveDeclined(): void {
    localStorage.setItem(this.declineKey(), JSON.stringify([...this.declinedRequestIds]));
  }

  // ── Data loading ──────────────────────────────────────────────
  loadAll(): void {
    const userId = this.auth.getUserId();
    this.isLoading = true;
    this.declinedRequestIds = this.loadDeclined();

    forkJoin({
      jobs:    this.nurseSvc.getJobs(),
      open:    this.apptService.getOpen(),
      myJobs:  userId ? this.nurseSvc.getApplications(userId) : [[]],
      myBids:  userId ? this.apptService.getNurseAppointmentApplications(userId) : [[]]
    }).subscribe({
      next: (result: any) => {
        const myJobs: any[] = result.myJobs || [];
        const myBids: any[] = result.myBids || [];

        // Build lookup sets from backend data
        this.appliedJobIds     = new Set(myJobs.map((a: any) => a.jobId));
        this.appliedRequestIds = new Set(myBids.map((b: any) => b.appointmentId));

        // Applied section arrays
        this.appliedOrgJobs     = myJobs;
        this.appliedPatientBids = myBids;

        // Available: exclude already-applied and declined
        const rawJobs = result.jobs || [];
        this.allJobs  = rawJobs
          .filter((j: any) => !this.appliedJobIds.has(j.id))
          .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        this.filteredJobs = [...this.allJobs];

        const allOpen = ((result.open || []) as any[])
          .filter((r: any) => !this.appliedRequestIds.has(r.id) && !this.declinedRequestIds.has(r.id))
          .sort((a: any, b: any) => new Date(b.createdAt ?? b.appointmentDate ?? 0).getTime() - new Date(a.createdAt ?? a.appointmentDate ?? 0).getTime());
        this.emergencyRequests = allOpen.filter((r: any) => r.isEmergency);
        this.openRequests      = allOpen.filter((r: any) => !r.isEmergency);

        // Build filter dropdowns from backend data
        const locs    = [...new Set(rawJobs.map((j: any) => j.location).filter(Boolean))];
        const specs   = [...new Set(rawJobs.map((j: any) => j.specialization).filter(Boolean))];
        const facTypes = [...new Set(rawJobs.map((j: any) => j.facilityType).filter(Boolean))];
        const pops    = [...new Set(rawJobs.map((j: any) => j.patientPopulation).filter(Boolean))];
        this.locations          = ['All', ...(locs as string[])];
        this.specialties        = ['All', ...(specs as string[])];
        this.facilityTypes      = ['All', ...(facTypes as string[])];
        this.patientPopulations = ['All', ...(pops as string[])];

        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilters(): void {
    const { location, specialty, jobType, facilityType, patientPopulation, search } = this.filterForm.value;
    this.filteredJobs = this.allJobs.filter(j => {
      const matchLoc  = location         === 'All' || (j.location         || '').toLowerCase().includes(location.toLowerCase());
      const matchType = jobType          === 'All' || (j.jobType          || '').toUpperCase() === jobType;
      const matchSpec = specialty        === 'All' || (j.specialization   || '').toLowerCase().includes(specialty.toLowerCase());
      const matchFac  = facilityType     === 'All' || (j.facilityType     || '').toLowerCase() === facilityType.toLowerCase();
      const matchPop  = patientPopulation === 'All' || (j.patientPopulation || '').toLowerCase() === patientPopulation.toLowerCase();
      const matchSrch = !search || (j.jobTitle        || '').toLowerCase().includes(search.toLowerCase())
                                || (j.organizationName || '').toLowerCase().includes(search.toLowerCase());
      return matchLoc && matchType && matchSpec && matchFac && matchPop && matchSrch;
    });
  }

  saveSearch(): void {
    localStorage.setItem(this.searchKey, JSON.stringify(this.filterForm.value));
    this.savedSearchExists = true;
  }

  loadSearch(): void {
    const raw = localStorage.getItem(this.searchKey);
    if (raw) { this.filterForm.setValue(JSON.parse(raw)); }
  }

  clearSearch(): void {
    localStorage.removeItem(this.searchKey);
    this.savedSearchExists = false;
    this.filterForm.reset({ location: 'All', specialty: 'All', jobType: 'All', facilityType: 'All', patientPopulation: 'All', search: '' });
  }

  // ── Org job actions ──────────────────────────────────────────
  openDetails(job: any): void { this.selectedJob = job; this.applySuccess = false; this.applyError = ''; }
  closeModal(): void           { this.selectedJob = null; }

  applyToJob(job: any): void {
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.isApplying = true;
    this.applyError = '';
    this.nurseSvc.applyToJob(userId, job.id).subscribe({
      next: (res: any) => {
        // Move job from available to applied
        this.appliedJobIds.add(job.id);
        this.allJobs      = this.allJobs.filter(j => j.id !== job.id);
        this.filteredJobs = this.filteredJobs.filter(j => j.id !== job.id);
        this.appliedOrgJobs = [res, ...this.appliedOrgJobs];
        this.isApplying   = false;
        this.applySuccess = true;
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (err: Error) => { this.isApplying = false; this.applyError = err.message; }
    });
  }

  // ── Patient request modal ─────────────────────────────────────
  openRequest(appt: any): void {
    this.selectedRequest     = appt;
    this.applySalary         = null;
    this.applyNote           = '';
    this.applyRequestError   = '';
    this.applyRequestSuccess = false;
    this.withdrawError       = '';
  }
  closeRequest(): void { this.selectedRequest = null; this.withdrawError = ''; }

  hasAppliedToRequest(apptId: number): boolean { return this.appliedRequestIds.has(apptId); }

  submitRequestApplication(): void {
    const userId = this.auth.getUserId();
    if (!userId || !this.selectedRequest) return;
    this.isApplyingRequest  = true;
    this.applyRequestError  = '';

    this.apptService.applyToAppointment(this.selectedRequest.id, userId, this.applySalary, this.applyNote).subscribe({
      next: (res: any) => {
        const reqId = this.selectedRequest.id;
        this.appliedRequestIds.add(reqId);
        this.openRequests       = this.openRequests.filter(r => r.id !== reqId);
        this.emergencyRequests  = this.emergencyRequests.filter(r => r.id !== reqId);
        this.appliedPatientBids = [res, ...this.appliedPatientBids];
        this.isApplyingRequest   = false;
        this.applyRequestSuccess = true;
        setTimeout(() => this.closeRequest(), 1500);
      },
      error: (err: Error) => { this.isApplyingRequest = false; this.applyRequestError = err.message; }
    });
  }

  declineRequest(): void {
    if (!this.selectedRequest) return;
    const id = this.selectedRequest.id;
    this.declinedRequestIds.add(id);
    this.saveDeclined();
    this.openRequests      = this.openRequests.filter(r => r.id !== id);
    this.emergencyRequests = this.emergencyRequests.filter(r => r.id !== id);
    this.closeRequest();
  }

  withdrawApplication(): void {
    const userId = this.auth.getUserId();
    if (!userId || !this.selectedRequest) return;
    this.isWithdrawing = true;
    this.withdrawError = '';

    this.apptService.withdrawAppointmentApplication(this.selectedRequest.id, userId).subscribe({
      next: () => {
        const reqId = this.selectedRequest.id;
        this.appliedRequestIds.delete(reqId);
        this.appliedPatientBids = this.appliedPatientBids.filter(b => b.appointmentId !== reqId);
        // Put it back in available (if not declined)
        this.loadAll();
        this.isWithdrawing = false;
        this.closeRequest();
      },
      error: (err: Error) => { this.withdrawError = err.message; this.isWithdrawing = false; }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  formatSalary(job: any): string {
    if (job.salaryMin && job.salaryMax) return `₹${job.salaryMin}–${job.salaryMax}`;
    if (job.salaryMin) return `₹${job.salaryMin}+`;
    if (job.salaryMax) return `upto ₹${job.salaryMax}`;
    return '—';
  }

  urgencyClass(priority: string): string {
    const p = (priority || '').toLowerCase();
    return p === 'urgent' ? 'badge-urgent' : p === 'high' ? 'badge-high' : 'badge-normal';
  }

  appStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    return s === 'APPROVED' ? 'app-approved' : s === 'REJECTED' ? 'app-rejected' : 'app-pending';
  }

  formatJobType(jt: string): string { return this.jobTypeLabels[jt] ?? jt; }

  patientFullName(req: any): string {
    return [req.patientFirstName, req.patientMiddleName, req.patientLastName]
      .filter((s: string) => !!s).join(' ') || req.patientName || '—';
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  logout(): void { this.auth.logout(); }
}
