import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { SupervisorService } from '../../../services/supervisor.service';
import { BlackoutService } from '../../../services/blackout.service';

@Component({
  selector: 'app-supervisor',
  templateUrl: './supervisor.component.html',
  styleUrls: ['./supervisor.component.css']
})
export class SupervisorComponent implements OnInit {

  activeTab: 'workload' | 'assignments' | 'performance' | 'coverage' | 'handoffs' | 'escalations' = 'workload';

  orgUserId!: number;
  isLoading = true;

  // ── Workload ──────────────────────────────────────────────────────────────
  workload: any[]       = [];
  workloadFilter        = 'ALL';

  // ── Job Assignments ───────────────────────────────────────────────────────
  jobAssignments: any[] = [];
  assignmentFilter      = 'ALL';

  // Assign modal
  assignModal: any      = null;
  selectedNurseUserId   = '';
  isAssigning           = false;
  assignError           = '';
  assignSuccess         = '';
  assignBlackoutWarning = '';

  // ── Performance ───────────────────────────────────────────────────────────
  performance: any[]    = [];

  // ── Team Roster / Coverage ────────────────────────────────────────────────
  rosterDeptFilter        = '';
  rosterModal: any        = null;   // nurse being reassigned
  selectedNewJobId        = '';
  isRosterReassigning     = false;
  rosterReassignError     = '';
  rosterReassignSuccess   = '';

  // ── Remove Nurse ──────────────────────────────────────────────────────────
  removingNurseUserId: number | null = null;
  removeError   = '';
  removeSuccess = '';

  // ── Handoff Notes ─────────────────────────────────────────────────────────
  handoffs: any[]         = [];
  handoffNurseId          = '';
  handoffJobId            = '';
  handoffNote             = '';
  isSendingHandoff        = false;
  handoffError            = '';
  handoffSuccess          = '';

  // ── Escalations ───────────────────────────────────────────────────────────
  escalations: any[]      = [];
  escalationFilter        = 'ALL';
  escIssueType            = '';
  escEntityType           = '';
  escEntityId             = '';
  escDescription          = '';
  isEscalating            = false;
  escalationError         = '';
  escalationSuccess       = '';

  readonly ISSUE_TYPES = [
    { value: 'NURSE_PERFORMANCE',    label: 'Nurse Performance' },
    { value: 'SCHEDULING_CONFLICT',  label: 'Scheduling Conflict' },
    { value: 'PATIENT_CONCERN',      label: 'Patient Concern' },
    { value: 'QUALITY_ISSUE',        label: 'Quality Issue' },
    { value: 'OTHER',                label: 'Other' },
  ];

  constructor(
    private auth: AuthService,
    private supervisorSvc: SupervisorService,
    private blackoutSvc: BlackoutService
  ) {}

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading = true;
    let loaded = 0;
    const done = () => { if (++loaded === 4) this.isLoading = false; };

    this.supervisorSvc.getWorkload(this.orgUserId).subscribe({
      next: (data) => { this.workload = data || []; this.buildPerformance(); done(); },
      error: () => done()
    });
    this.supervisorSvc.getJobAssignments(this.orgUserId).subscribe({
      next: (data) => { this.jobAssignments = data || []; done(); },
      error: () => done()
    });
    this.supervisorSvc.getHandoffs(this.orgUserId).subscribe({
      next: (data) => { this.handoffs = data || []; done(); },
      error: () => done()
    });
    this.supervisorSvc.getEscalations(this.orgUserId).subscribe({
      next: (data) => { this.escalations = data || []; done(); },
      error: () => done()
    });
  }

  private buildPerformance(): void {
    this.performance = this.workload.map(n => ({
      nurseName:     n.nurseName,
      specialization:n.specialization,
      experience:    n.experienceYears,
      license:       n.licenseNumber,
      activeJobs:    n.activeJobs,
      completedJobs: n.completedJobs,
      totalJobs:     n.totalJobs,
      status:        n.workloadStatus,
      nurseRating:   n.nurseRating
    }));
  }

  ratingStars(rating: number | null): string {
    if (!rating) return '—';
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5 ? 1 : 0;
    return '★'.repeat(full) + (half ? '½' : '') + ` (${rating.toFixed(1)})`;
  }

  ratingClass(rating: number | null): string {
    if (!rating) return '';
    if (rating >= 4) return 'perf-rating-green';
    if (rating >= 3) return 'perf-rating-amber';
    return 'perf-rating-red';
  }

  get satisfactionSummary(): string {
    const rated = this.performance.filter(n => n.nurseRating != null);
    if (!rated.length) return 'No ratings yet';
    const high = rated.filter(n => n.nurseRating >= 4).length;
    return `${high}/${rated.length} nurses rated ≥ 4★`;
  }

  // ── Workload ──────────────────────────────────────────────────────────────

  get filteredWorkload(): any[] {
    if (this.workloadFilter === 'ALL') return this.workload;
    return this.workload.filter(n => n.workloadStatus === this.workloadFilter);
  }

  workloadStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':  return 'ws-available';
      case 'ACTIVE':     return 'ws-active';
      case 'OVERLOADED': return 'ws-overloaded';
      default:           return 'ws-available';
    }
  }

  workloadBarWidth(n: any): number {
    const max = Math.max(...this.workload.map(w => w.activeJobs), 1);
    return Math.round((n.activeJobs / max) * 100);
  }

  get totalAvailable(): number  { return this.workload.filter(n => n.workloadStatus === 'AVAILABLE').length; }
  get totalActive(): number     { return this.workload.filter(n => n.workloadStatus === 'ACTIVE').length; }
  get totalOverloaded(): number { return this.workload.filter(n => n.workloadStatus === 'OVERLOADED').length; }

  // ── Job Assignments ───────────────────────────────────────────────────────

  get filteredAssignments(): any[] {
    if (this.assignmentFilter === 'UNASSIGNED') return this.jobAssignments.filter(j => !j.assignedNurseId);
    if (this.assignmentFilter === 'ASSIGNED')   return this.jobAssignments.filter(j =>  j.assignedNurseId);
    if (this.assignmentFilter === 'ACTIVE')     return this.jobAssignments.filter(j => j.jobStatus === 'ACTIVE');
    if (this.assignmentFilter === 'CLOSED')     return this.jobAssignments.filter(j => j.jobStatus === 'CLOSED');
    return this.jobAssignments;
  }

  get unassignedCount(): number { return this.jobAssignments.filter(j => !j.assignedNurseId).length; }
  get assignedCount():   number { return this.jobAssignments.filter(j =>  j.assignedNurseId).length; }

  openAssignModal(job: any): void {
    this.assignModal          = job;
    this.selectedNurseUserId  = '';
    this.assignError          = '';
    this.assignSuccess        = '';
    this.assignBlackoutWarning = '';
  }

  closeAssignModal(): void { this.assignModal = null; }

  onNurseSelect(): void {
    this.assignBlackoutWarning = '';
    const nurseUserId = +this.selectedNurseUserId;
    if (!nurseUserId || !this.assignModal) return;
    this.blackoutSvc.getByNurse(nurseUserId).subscribe({
      next: (dates) => {
        if (!dates.length) return;
        const jobStart    = this.assignModal.jobStartDate?.slice(0, 10);
        const jobDeadline = this.assignModal.jobDeadline?.slice(0, 10);
        const blocked = dates.filter(d =>
          (jobStart    && d >= jobStart    && (!jobDeadline || d <= jobDeadline)) ||
          (jobDeadline && d === jobDeadline)
        );
        if (blocked.length) {
          this.assignBlackoutWarning =
            `This nurse has blocked ${blocked.length} date(s) within this job period: ${blocked.slice(0,3).join(', ')}${blocked.length > 3 ? '…' : ''}.`;
        }
      },
      error: () => {}
    });
  }

  isReassigning(job: any): boolean { return !!job.assignedNurseId; }

  confirmAssign(): void {
    if (!this.selectedNurseUserId) { this.assignError = 'Please select a nurse.'; return; }
    const nurseUserId = +this.selectedNurseUserId;
    this.isAssigning  = true;
    this.assignError  = '';

    const action$ = this.isReassigning(this.assignModal)
      ? this.supervisorSvc.reassignNurse(this.orgUserId, this.assignModal.jobId, nurseUserId)
      : this.supervisorSvc.assignNurse(this.orgUserId, this.assignModal.jobId, nurseUserId);

    action$.subscribe({
      next: (updated) => {
        const idx = this.jobAssignments.findIndex(j => j.jobId === this.assignModal.jobId);
        if (idx !== -1) this.jobAssignments[idx] = updated;
        // Update workload too
        this.supervisorSvc.getWorkload(this.orgUserId).subscribe({
          next: (data) => { this.workload = data || []; this.buildPerformance(); }
        });
        this.isAssigning   = false;
        this.assignSuccess = 'Nurse assigned successfully!';
        setTimeout(() => this.closeAssignModal(), 1800);
      },
      error: (err: Error) => {
        this.assignError = err.message;
        this.isAssigning = false;
      }
    });
  }

  jobStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE': return 'js-active';
      case 'CLOSED': return 'js-closed';
      default:       return 'js-active';
    }
  }

  formatSalary(min: number, max: number): string {
    if (!min && !max) return '—';
    const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return fmt(min || max);
  }

  formatDeadline(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Performance sort ──────────────────────────────────────────────────────

  perfSort: 'totalJobs' | 'activeJobs' | 'completedJobs' = 'totalJobs';

  get sortedPerformance(): any[] {
    return [...this.performance].sort((a, b) => b[this.perfSort] - a[this.perfSort]);
  }

  // ── Team Roster / Coverage ────────────────────────────────────────────────

  // All unique departments from ALL org jobs (for filter chips)
  get departments(): string[] {
    const depts = this.jobAssignments.map(j => j.department).filter(Boolean);
    return [...new Set(depts)].sort();
  }

  // Nurse-centric roster: one row per hired nurse, enriched with their current job info
  get filteredRoster(): any[] {
    const rows = this.workload.map(nurse => {
      const job = this.jobAssignments.find(j => j.assignedNurseUserId === nurse.nurseUserId) || null;
      return {
        nurseUserId:       nurse.nurseUserId,
        nurseName:         nurse.nurseName,
        specialization:    nurse.specialization,
        workloadStatus:    nurse.workloadStatus,
        activeJobs:        nurse.activeJobs,
        department:        job?.department   || null,
        jobTitle:          job?.jobTitle     || null,
        jobType:           job?.jobType      || null,
        jobId:             job?.jobId        || null,
        location:          job?.location     || null,
        currentJob:        job,
      };
    });
    if (!this.rosterDeptFilter) return rows;
    return rows.filter(r => r.department === this.rosterDeptFilter);
  }

  openRosterReassign(nurse: any): void {
    this.rosterModal          = nurse;
    this.selectedNewJobId     = '';
    this.rosterReassignError  = '';
    this.rosterReassignSuccess= '';
  }
  closeRosterReassign(): void { this.rosterModal = null; }

  confirmRosterReassign(): void {
    if (!this.selectedNewJobId) { this.rosterReassignError = 'Please select a job.'; return; }
    this.isRosterReassigning = true;
    this.rosterReassignError = '';
    this.supervisorSvc.assignNurse(this.orgUserId, +this.selectedNewJobId, this.rosterModal.nurseUserId).subscribe({
      next: (updated) => {
        const idx = this.jobAssignments.findIndex(j => j.jobId === +this.selectedNewJobId);
        if (idx !== -1) this.jobAssignments[idx] = updated;
        this.isRosterReassigning  = false;
        this.rosterReassignSuccess = 'Nurse assigned to new department!';
        setTimeout(() => this.closeRosterReassign(), 1800);
      },
      error: (err: Error) => { this.rosterReassignError = err.message; this.isRosterReassigning = false; }
    });
  }

  dutyTypeLabel(jobType: string): string {
    const map: Record<string, string> = {
      FULL_TIME:  'Full Time',
      PART_TIME:  'Part Time',
      CONTRACT:   'Contract',
      TEMPORARY:  'Temporary',
      PER_DIEM:   'Per Diem',
    };
    return map[jobType] || jobType || '—';
  }

  dutyTypeClass(jobType: string): string {
    const map: Record<string, string> = {
      FULL_TIME: 'dt-full',
      PART_TIME: 'dt-part',
      CONTRACT:  'dt-contract',
      TEMPORARY: 'dt-temp',
      PER_DIEM:  'dt-perdiem',
    };
    return map[jobType] || 'dt-full';
  }

  // ── Handoff Notes ─────────────────────────────────────────────────────────

  sendHandoff(): void {
    if (!this.handoffNurseId || !this.handoffNote.trim()) {
      this.handoffError = 'Please select a nurse and enter a note.'; return;
    }
    this.isSendingHandoff = true;
    this.handoffError     = '';
    this.supervisorSvc.sendHandoff(
      this.orgUserId, +this.handoffNurseId,
      this.handoffJobId ? +this.handoffJobId : null,
      this.handoffNote.trim()
    ).subscribe({
      next: (note) => {
        this.handoffs.unshift(note);
        this.handoffNurseId    = '';
        this.handoffJobId      = '';
        this.handoffNote       = '';
        this.handoffSuccess    = 'Handoff note sent!';
        this.isSendingHandoff  = false;
        setTimeout(() => this.handoffSuccess = '', 3000);
      },
      error: (err: Error) => { this.handoffError = err.message; this.isSendingHandoff = false; }
    });
  }

  // ── Escalations ───────────────────────────────────────────────────────────

  get filteredEscalations(): any[] {
    if (this.escalationFilter === 'OPEN')     return this.escalations.filter(e => e.status === 'OPEN');
    if (this.escalationFilter === 'RESOLVED') return this.escalations.filter(e => e.status === 'RESOLVED');
    return this.escalations;
  }

  get openEscalationCount(): number { return this.escalations.filter(e => e.status === 'OPEN').length; }

  submitEscalation(): void {
    if (!this.escIssueType || !this.escDescription.trim()) {
      this.escalationError = 'Issue type and description are required.'; return;
    }
    this.isEscalating     = true;
    this.escalationError  = '';
    this.supervisorSvc.createEscalation(
      this.orgUserId, this.escIssueType,
      this.escEntityType || null,
      this.escEntityId ? +this.escEntityId : null,
      this.escDescription.trim()
    ).subscribe({
      next: (e) => {
        this.escalations.unshift(e);
        this.escIssueType    = '';
        this.escEntityType   = '';
        this.escEntityId     = '';
        this.escDescription  = '';
        this.escalationSuccess = 'Escalation raised!';
        this.isEscalating    = false;
        setTimeout(() => this.escalationSuccess = '', 3000);
      },
      error: (err: Error) => { this.escalationError = err.message; this.isEscalating = false; }
    });
  }

  resolveEscalation(esc: any): void {
    this.supervisorSvc.resolveEscalation(this.orgUserId, esc.id).subscribe({
      next: (updated) => {
        const idx = this.escalations.findIndex(e => e.id === esc.id);
        if (idx !== -1) this.escalations[idx] = updated;
      }
    });
  }

  issueTypeLabel(val: string): string {
    return this.ISSUE_TYPES.find(t => t.value === val)?.label ?? val;
  }

  escalationStatusClass(status: string): string {
    return status === 'RESOLVED' ? 'esc-resolved' : 'esc-open';
  }

  removeNurse(nurse: any): void {
    if (!confirm(`Remove ${nurse.nurseName} from this organisation? All their approved applications will be rejected.`)) return;
    this.removingNurseUserId = nurse.nurseUserId;
    this.removeError   = '';
    this.removeSuccess = '';
    this.supervisorSvc.removeNurse(this.orgUserId, nurse.nurseUserId).subscribe({
      next: () => {
        this.workload = this.workload.filter(n => n.nurseUserId !== nurse.nurseUserId);
        this.buildPerformance();
        this.removingNurseUserId = null;
        this.removeSuccess = `${nurse.nurseName} removed from organisation.`;
        setTimeout(() => this.removeSuccess = '', 4000);
      },
      error: (err: Error) => {
        this.removeError = err.message;
        this.removingNurseUserId = null;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
