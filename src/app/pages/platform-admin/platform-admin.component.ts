import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService }          from '../../services/auth.service';
import { PlatformAdminService } from '../../services/platform-admin.service';

type PlatformTab = 'overview' | 'compliance' | 'incidents' | 'policies' | 'security' | 'audit' | 'staff' | 'orgs';

@Component({
  selector: 'app-platform-admin',
  templateUrl: './platform-admin.component.html',
  styleUrls: ['./platform-admin.component.css']
})
export class PlatformAdminComponent implements OnInit {

  activeTab: PlatformTab = 'overview';
  isLoading  = true;

  stats:         any    = {};
  compliance:    any[]  = [];
  escalations:   any[]  = [];
  allUsers:      any[]  = [];
  policies:      any[]  = [];
  auditTrail:    any[]  = [];
  nurseProfiles: any[]  = [];
  orgs:          any[]  = [];

  // Filters
  userRoleFilter     = 'ALL';
  complianceFilter   = 'ALL';
  auditTypeFilter    = 'ALL';
  staffOnboardFilter = 'ALL';
  isTogglingUser     = new Set<number>();
  isVerifyingNurse   = new Set<number>();
  isVerifyingOrg     = new Set<number>();

  // Policy form
  policyFormOpen  = false;
  isSavingPolicy  = false;
  policySuccess   = '';
  policyError     = '';
  policyForm!: FormGroup;

  private adminUserId!: number;

  readonly POLICY_CATEGORIES = ['HIPAA', 'GDPR', 'SAFETY', 'DATA', 'GENERAL'];

  readonly SECURITY_CHECKS = [
    { item: 'Passwords BCrypt-hashed (strength 10)',          status: true  },
    { item: 'Role-based access control (NURSE/PATIENT/ORG)',  status: true  },
    { item: 'Placeholder JWT authentication (Base64)',         status: true  },
    { item: 'GlobalExceptionHandler — centralized errors',    status: true  },
    { item: 'Bean Validation on all request DTOs',            status: true  },
    { item: 'CORS configured for frontend origin',            status: true  },
    { item: 'SQL Injection prevention via JPA/Hibernate',     status: true  },
    { item: 'Swagger API documentation at /swagger-ui.html',  status: true  },
    { item: 'HTTPS / TLS encryption',                         status: false },
    { item: 'Full JWT with expiry (Phase 2)',                  status: false },
    { item: 'JUnit test coverage ≥ 80%',                      status: false },
    { item: 'SonarQube analysis (Security A, Reliability A)', status: false },
  ];

  constructor(
    private fb:          FormBuilder,
    private auth:        AuthService,
    private platformSvc: PlatformAdminService
  ) {}

  ngOnInit(): void {
    this.adminUserId = this.auth.getUserId()!;
    this.policyForm  = this.fb.group({
      title:         ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      category:      ['GENERAL', Validators.required],
      effectiveDate: [''],
      content:       ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
    });
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      stats:         this.platformSvc.getStats(),
      compliance:    this.platformSvc.getAllCompliance(),
      escalations:   this.platformSvc.getAllEscalations(),
      users:         this.platformSvc.getAllUsers(),
      policies:      this.platformSvc.getPolicies(),
      auditTrail:    this.platformSvc.getAuditTrail(),
      nurseProfiles: this.platformSvc.getNurseProfiles(),
      orgs:          this.platformSvc.getOrgs()
    }).subscribe({
      next: ({ stats, compliance, escalations, users, policies, auditTrail, nurseProfiles, orgs }) => {
        this.stats         = stats         || {};
        this.compliance    = compliance    || [];
        this.escalations   = escalations   || [];
        this.allUsers      = users         || [];
        this.policies      = policies      || [];
        this.auditTrail    = auditTrail    || [];
        this.nurseProfiles = nurseProfiles || [];
        this.orgs          = orgs          || [];
        this.isLoading     = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get filteredUsers(): any[] {
    if (this.userRoleFilter === 'ALL') return this.allUsers;
    return this.allUsers.filter(u => u.role === this.userRoleFilter);
  }

  get filteredCompliance(): any[] {
    if (this.complianceFilter === 'ALL') return this.compliance;
    return this.compliance.filter(c => c.status === this.complianceFilter);
  }

  get openEscalations(): any[] {
    return this.escalations.filter(e => e.status === 'OPEN');
  }

  get filteredAudit(): any[] {
    if (this.auditTypeFilter === 'ALL') return this.auditTrail;
    return this.auditTrail.filter(a => a.eventType === this.auditTypeFilter);
  }

  get filteredNurses(): any[] {
    if (this.staffOnboardFilter === 'ALL') return this.nurseProfiles;
    return this.nurseProfiles.filter(n => n.onboardingStatus === this.staffOnboardFilter);
  }

  get nurseCompleteCount(): number  { return this.nurseProfiles.filter(n => n.onboardingStatus === 'COMPLETE').length; }
  get nursePartialCount(): number   { return this.nurseProfiles.filter(n => n.onboardingStatus === 'PARTIAL').length; }
  get nurseNoneCount(): number      { return this.nurseProfiles.filter(n => n.onboardingStatus === 'NONE').length; }

  onboardingClass(status: string): string {
    return status === 'COMPLETE' ? 'ob-complete'
         : status === 'PARTIAL'  ? 'ob-partial'
         : 'ob-none';
  }

  onboardingLabel(status: string): string {
    return status === 'COMPLETE' ? '✔ Complete'
         : status === 'PARTIAL'  ? '~ Partial'
         : '✗ Not Started';
  }

  auditTypeColor(type: string): string {
    return type === 'MEDICAL_RECORD' ? '#0f5241'
         : type === 'COMPLIANCE'     ? '#1d4ed8'
         : '#b45309';
  }

  auditTypeLabel(type: string): string {
    return type === 'MEDICAL_RECORD' ? 'Medical Record'
         : type === 'COMPLIANCE'     ? 'Compliance'
         : 'Credential';
  }

  toggleUser(user: any): void {
    this.isTogglingUser.add(user.id);
    this.platformSvc.toggleUser(user.id).subscribe({
      next: (updated) => {
        user.isActive = updated.isActive;
        this.isTogglingUser.delete(user.id);
      },
      error: () => { this.isTogglingUser.delete(user.id); }
    });
  }

  get securityScore(): number {
    return Math.round((this.implementedChecksCount / this.SECURITY_CHECKS.length) * 100);
  }

  get implementedChecksCount(): number {
    return this.SECURITY_CHECKS.filter(c => c.status).length;
  }

  // ── Policies ──────────────────────────────────────────────────────────────

  get pf() { return this.policyForm.controls; }

  addPolicy(): void {
    if (this.policyForm.invalid) { this.policyForm.markAllAsTouched(); return; }
    this.isSavingPolicy = true;
    this.policyError    = '';
    const v = this.policyForm.value;
    this.platformSvc.addPolicy({
      title:         v.title,
      category:      v.category,
      effectiveDate: v.effectiveDate || null,
      content:       v.content,
      adminId:       this.adminUserId
    }).subscribe({
      next: (p) => {
        this.policies.unshift(p);
        this.policyFormOpen  = false;
        this.isSavingPolicy  = false;
        this.policySuccess   = 'Policy added successfully.';
        this.policyForm.reset({ category: 'GENERAL' });
        setTimeout(() => this.policySuccess = '', 4000);
      },
      error: (err: Error) => { this.policyError = err.message; this.isSavingPolicy = false; }
    });
  }

  deletePolicy(id: number): void {
    this.platformSvc.deletePolicy(id).subscribe({
      next: () => { this.policies = this.policies.filter(p => p.id !== id); }
    });
  }

  // ── Report ────────────────────────────────────────────────────────────────

  generateReport(): void {
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<html><head><title>CareConnect QA Report</title>
    <style>
      body{font-family:Calibri,Arial,sans-serif;margin:2cm;color:#1a1a2e;}
      h1{color:#1F3864;border-bottom:3px solid #1F3864;padding-bottom:8px;}
      h2{color:#2d4a8a;margin-top:20px;}
      table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt;}
      th{background:#1F3864;color:white;padding:6px 10px;text-align:left;}
      td{border:1px solid #ccc;padding:5px 10px;}
      tr:nth-child(even){background:#f5f8ff;}
      .pass{color:#155724;font-weight:700;} .fail{color:#721c24;font-weight:700;}
    </style></head><body>
    <h1>CareConnect — Platform QA & Compliance Report</h1>
    <p>Generated: ${now} | Platform Administrator Portal</p>
    <h2>Platform Overview</h2>
    <table><tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Nurses</td><td>${this.stats.totalNurses ?? 0}</td></tr>
      <tr><td>Total Patients</td><td>${this.stats.totalPatients ?? 0}</td></tr>
      <tr><td>Total Organizations</td><td>${this.stats.totalOrgs ?? 0}</td></tr>
      <tr><td>Total Appointments</td><td>${this.stats.totalAppointments ?? 0}</td></tr>
      <tr><td>Platform Compliance Rate</td><td>${this.stats.complianceRate ?? 0}%</td></tr>
      <tr><td>Open Escalations</td><td>${this.stats.openEscalations ?? 0}</td></tr>
      <tr><td>Expired Credentials</td><td>${this.stats.expiredCredentials ?? 0}</td></tr>
    </table>
    <h2>Security Checklist</h2>
    <table><tr><th>Security Control</th><th>Status</th></tr>
      ${this.SECURITY_CHECKS.map(c =>
        `<tr><td>${c.item}</td><td class="${c.status ? 'pass' : 'fail'}">${c.status ? '✔ Pass' : '✘ Pending'}</td></tr>`
      ).join('')}
    </table>
    <h2>Platform Policies (${this.policies.length})</h2>
    <table><tr><th>Title</th><th>Category</th><th>Effective Date</th></tr>
      ${this.policies.map(p =>
        `<tr><td>${p.title}</td><td>${p.category}</td><td>${p.effectiveDate ?? '—'}</td></tr>`
      ).join('')}
    </table>
    <p style="margin-top:30px;font-size:8.5pt;color:#888;border-top:1px solid #ddd;padding-top:10px;">
      CareConnect Platform QA Report | ${now} | Confidential
    </p></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  statusClass(status: string): string {
    return status === 'COMPLIANT' || status === 'RESOLVED' ? 'badge-ok'
         : status === 'NON_COMPLIANT' || status === 'OPEN' ? 'badge-bad'
         : 'badge-mid';
  }

  roleColor(role: string): string {
    return role === 'NURSE' ? '#0f5241' : role === 'PATIENT' ? '#1d4ed8' : '#9c4a00';
  }

  secCheckIconClass(chk: any): string {
    return chk.status
      ? 'bi bi-check-circle-fill sec-icon-ok'
      : 'bi bi-x-circle-fill sec-icon-fail';
  }

  secCheckTextClass(chk: any): string {
    return chk.status ? 'sec-item-text sec-text-active' : 'sec-item-text';
  }

  secCheckLabelClass(chk: any): string {
    return 'sec-status-label ' + (chk.status ? 'sec-lbl-ok' : 'sec-lbl-pending');
  }

  verifyNurse(nurse: any): void {
    this.isVerifyingNurse.add(nurse.id);
    this.platformSvc.verifyNurse(nurse.id).subscribe({
      next: (updated) => {
        nurse.verifiedByAdmin = updated.verifiedByAdmin;
        this.isVerifyingNurse.delete(nurse.id);
      },
      error: () => { this.isVerifyingNurse.delete(nurse.id); }
    });
  }

  verifyOrg(org: any): void {
    this.isVerifyingOrg.add(org.id);
    this.platformSvc.verifyOrg(org.id).subscribe({
      next: (updated) => {
        org.verifiedByAdmin = updated.verifiedByAdmin;
        this.isVerifyingOrg.delete(org.id);
      },
      error: () => { this.isVerifyingOrg.delete(org.id); }
    });
  }

  get verifiedNurseCount(): number { return this.nurseProfiles.filter(n => n.verifiedByAdmin).length; }
  get verifiedOrgCount(): number   { return this.orgs.filter(o => o.verifiedByAdmin).length; }

  logout(): void { this.auth.logout(); }
}
