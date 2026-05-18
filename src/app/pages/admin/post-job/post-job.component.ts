import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { PaymentService } from '../../../services/payment.service';


@Component({
  selector: 'app-post-job',
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.css']
})
export class PostJobComponent implements OnInit {

  activeTab: 'post' | 'jobs' | 'salary' = 'post';

  jobForm: FormGroup;
  isPosting   = false;
  successMsg  = '';
  errorMsg    = '';

  myJobs:       any[] = [];
  isLoadingJobs = false;

  orgLocation   = '';
  jobTitles:    string[] = [];
  showOtherTitle = false;
  selectedBenefits = new Set<string>();

  private userId!: number;

  // ── Salary tab ──────────────────────────────────────────────────
  hiredNurses:        any[] = [];
  salaryHistory:      any[] = [];
  isLoadingSalary     = false;
  selectedNurse:      any   = null;
  salaryMonth         = '';
  baseSalary          = '';
  hra                 = '';
  travelAllowance     = '';
  otherAllowances     = '';
  salarySuccessMsg    = '';
  salaryErrorMsg      = '';
  isProcessingSalary  = false;

  readonly MONTH_OPTIONS = [
    'January 2026','February 2026','March 2026','April 2026',
    'May 2026','June 2026','July 2026','August 2026',
    'September 2026','October 2026','November 2026','December 2026'
  ];

  readonly today       = new Date().toISOString().split('T')[0];
  readonly minDeadline = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  readonly DEPARTMENTS = [
    'Critical Care / ICU', 'Emergency', 'Surgery / OT', 'Medical Ward',
    'Pediatrics', 'Geriatrics', 'Maternity / Gynecology', 'Oncology',
    'Cardiology', 'Neurology', 'Orthopedics', 'Psychiatry',
    'Rehabilitation', 'Home Care', 'General Ward', 'Other'
  ];

  readonly DEPT_JOBS: Record<string, string[]> = {
    'Critical Care / ICU': ['ICU Nurse', 'Critical Care Specialist', 'Ventilator Nurse', 'ICU In-Charge', 'Other'],
    'Emergency':           ['Emergency Nurse', 'Trauma Nurse', 'Triage Nurse', 'ER In-Charge', 'Other'],
    'Surgery / OT':        ['OT Nurse', 'Scrub Nurse', 'Recovery Nurse', 'Anaesthesia Nurse', 'Other'],
    'Medical Ward':        ['Staff Nurse', 'Senior Nurse', 'Ward In-Charge', 'General Duty Nurse', 'Other'],
    'Pediatrics':          ['Pediatric Nurse', 'NICU Nurse', 'Child Care Nurse', 'Pediatric In-Charge', 'Other'],
    'Geriatrics':          ['Geriatric Care Nurse', 'Elder Care Specialist', 'Palliative Care Nurse', 'Other'],
    'Maternity / Gynecology': ['Midwife', 'Labour Room Nurse', 'Post-natal Nurse', 'Gynecology Nurse', 'Other'],
    'Oncology':            ['Oncology Nurse', 'Chemotherapy Nurse', 'Palliative Care Nurse', 'Other'],
    'Cardiology':          ['Cardiac Nurse', 'Cath Lab Nurse', 'CCU Nurse', 'Cardiac In-Charge', 'Other'],
    'Neurology':           ['Neurology Nurse', 'Neuro ICU Nurse', 'Stroke Care Nurse', 'Other'],
    'Orthopedics':         ['Ortho Nurse', 'Physiotherapy Assistant', 'Plaster Room Nurse', 'Other'],
    'Psychiatry':          ['Psychiatric Nurse', 'Mental Health Nurse', 'De-addiction Nurse', 'Other'],
    'Rehabilitation':      ['Rehab Nurse', 'Physiotherapy Nurse', 'OT Technician', 'Other'],
    'Home Care':           ['Home Care Nurse', 'Visiting Nurse', 'Palliative Home Care Nurse', 'Other'],
    'General Ward':        ['General Duty Nurse', 'Staff Nurse', 'Ward In-Charge', 'Other'],
    'Other':               ['Other'],
  };

  readonly SPECIALIZATIONS = [
    'ICU / Critical Care', 'Emergency / Trauma', 'General Nursing', 'Home Care',
    'Pediatrics', 'Geriatrics', 'Maternity & Gynecology', 'Oncology',
    'Cardiology', 'Neurology', 'Orthopedics', 'Psychiatry',
    'Wound Care', 'Palliative Care', 'Physiotherapy', 'Other'
  ];

  readonly PATIENT_POPULATION_OPTIONS = [
    'All Ages', 'Pediatric (Children)', 'Adult', 'Geriatric (Elderly)',
    'Maternity & Newborn', 'Post-Surgical', 'Critical / ICU Patients', 'Home Care Patients'
  ];

  readonly SHIFT_OPTIONS = [
    'Morning (6 AM – 2 PM)', 'Afternoon (2 PM – 10 PM)', 'Night (10 PM – 6 AM)',
    'Rotational', '12-Hour Day Shift', '12-Hour Night Shift', 'Flexible'
  ];

  readonly OPENINGS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];

  readonly EMERGENCY_COUNTRY_CODES = [
    { label: '🇮🇳 +91', code: '+91' },
    { label: '🇺🇸 +1',  code: '+1'  },
    { label: '🇬🇧 +44', code: '+44' },
    { label: '🇦🇪 +971',code: '+971'},
    { label: '🇦🇺 +61', code: '+61' },
    { label: '🇸🇬 +65', code: '+65' },
  ];

  readonly WORKING_CONDITIONS_OPTIONS = [
    'ICU / High Dependency Unit',
    'General Ward',
    'Emergency / Trauma Bay',
    'Operation Theatre',
    'Home Care / Field Visits',
    'Night Shifts Mandatory',
    'Rotational Shifts',
    'Day Shifts Only',
    'Physical / Demanding Environment',
    'Isolation / Infectious Ward',
    'Pediatric / Neonatal Care',
    'Outdoor / Mobile Clinic',
    'Air-Conditioned Indoor Ward',
    'Non-AC General Facility',
  ];

  readonly BENEFITS_OPTIONS = [
    'Health Insurance', 'Accommodation', 'Transportation Allowance',
    'Meals Provided', 'EPF / Provident Fund', 'Annual Bonus',
    'Overtime Pay', 'Medical Leave'
  ];

  constructor(
    private fb:           FormBuilder,
    private adminService: AdminService,
    private auth:         AuthService,
    private paymentSvc:   PaymentService
  ) {
    this.jobForm = this.fb.group({
      department:      ['', Validators.required],
      jobTitle:        ['', Validators.required],
      jobTitleOther:   ['', [Validators.minLength(3), Validators.maxLength(20),
                             Validators.pattern('^[A-Za-z /\\-]+$')]],
      openings:        ['', Validators.required],
      location:        [{ value: '', disabled: true }, Validators.required],
      jobType:         ['', Validators.required],
      patientPopulation: ['', Validators.required],
      specialization:  ['', Validators.required],
      description:     [{ value: '', disabled: true },
                        [Validators.required, Validators.minLength(10), Validators.maxLength(100),
                         Validators.pattern("^[A-Za-z0-9 ,.\\/\\-()&!?:;']+$")]],
      workingConditions: [''],
      shiftDetails:    ['', Validators.required],
      salaryMin:       ['', [Validators.min(10000), Validators.max(200000)]],
      priority:          ['Normal', Validators.required],
      deadline:          ['', Validators.required],
      isEmergency:          [false],
      emergencyCountryCode: ['+91'],
      emergencyPhone:       [''],
    });

    // When isEmergency toggled, apply/clear contact validators
    this.jobForm.get('isEmergency')!.valueChanges.subscribe((val: boolean) => {
      const phoneCtrl = this.jobForm.get('emergencyPhone')!;
      if (val) {
        phoneCtrl.setValidators([
          Validators.required,
          Validators.pattern('^[6-9][0-9]{9}$')
        ]);
      } else {
        phoneCtrl.clearValidators();
        phoneCtrl.setValue('');
      }
      phoneCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.loadOrgLocation();
    this.loadJobs();
    this.loadSalaryData();
  }

  private loadOrgLocation(): void {
    this.adminService.getOrgProfile(this.userId).subscribe({
      next: (org) => {
        const parts = [org?.addressLine1 || org?.address, org?.city, org?.state].filter(Boolean);
        this.orgLocation = parts.join(', ') || '';
        this.jobForm.get('location')?.setValue(this.orgLocation);
      },
      error: () => {}
    });
  }

  loadJobs(): void {
    this.isLoadingJobs = true;
    this.adminService.getMyJobs(this.userId).subscribe({
      next: (data) => { this.myJobs = data || []; this.isLoadingJobs = false; },
      error: ()     => { this.isLoadingJobs = false; }
    });
  }

  get f() { return this.jobForm.controls; }
  get descLen(): number { return (this.jobForm.get('description')?.value || '').length; }
  get emergencyPhoneLen(): number { return (this.jobForm.get('emergencyPhone')?.value || '').length; }

  blockEmergencyNonDigit(event: KeyboardEvent): boolean {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit && !allowed.includes(event.key)) { event.preventDefault(); return false; }
    if (isDigit) {
      const input = event.target as HTMLInputElement;
      const hasSelection = input.selectionStart !== input.selectionEnd;
      if (input.value.length >= 10 && !hasSelection) { event.preventDefault(); return false; }
    }
    return true;
  }

  onDepartmentChange(dept: string): void {
    this.jobTitles      = this.DEPT_JOBS[dept] || ['Other'];
    this.showOtherTitle = false;
    this.jobForm.get('jobTitle')?.setValue('');
    this.jobForm.get('jobTitleOther')?.setValue('');
  }

  onTitleChange(title: string): void {
    this.showOtherTitle = title === 'Other';
    if (!this.showOtherTitle) this.jobForm.get('jobTitleOther')?.setValue('');
  }

  onSpecChange(spec: string): void {
    const ctrl = this.jobForm.get('description');
    if (spec) { ctrl?.enable(); } else { ctrl?.disable(); ctrl?.setValue(''); }
  }

  toggleBenefit(b: string): void {
    this.selectedBenefits.has(b) ? this.selectedBenefits.delete(b) : this.selectedBenefits.add(b);
  }

  benefitsLabel(job: any): string {
    if (!job.benefits) return '—';
    return job.benefits.split(',').join(' · ');
  }

  onSubmit(): void {
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); return; }

    const selectedTitle = this.jobForm.value.jobTitle;
    const otherTitle    = (this.jobForm.value.jobTitleOther || '').trim();
    if (selectedTitle === 'Other' && !otherTitle) {
      this.jobForm.get('jobTitleOther')?.setErrors({ required: true });
      this.jobForm.get('jobTitleOther')?.markAsTouched();
      return;
    }

    const v = this.jobForm.getRawValue();

    // Guard: description (disabled until spec selected) must be non-empty after trim
    const trimmedDesc = (v.description || '').trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      this.errorMsg = 'Job Description is required (min 10 characters). Please select a specialization and fill in the description.';
      setTimeout(() => this.errorMsg = '', 5000);
      return;
    }

    this.isPosting  = true;
    this.successMsg = '';
    this.errorMsg   = '';
    const payload = {
      jobTitle:         selectedTitle === 'Other' ? otherTitle : selectedTitle,
      department:       v.department,
      openings:         Number(v.openings),
      location:         v.location,
      jobType:          v.jobType,
      patientPopulation: v.patientPopulation,
      specialization:   v.specialization,
      description:      (v.description || '').trim(),
      workingConditions: v.workingConditions?.trim() || '',
      benefits:         Array.from(this.selectedBenefits).join(','),
      shiftDetails:     v.shiftDetails,
      salaryMin:        v.salaryMin ? parseFloat(v.salaryMin) : null,
      salaryMax:        null,
      priority:          v.isEmergency ? 'Critical' : v.priority,
      deadline:          v.deadline ? v.deadline + ':00' : null,
      isEmergency:       !!v.isEmergency,
      emergencyContact:  v.isEmergency && v.emergencyPhone
                           ? (v.emergencyCountryCode || '+91') + ' ' + v.emergencyPhone
                           : null,
    };

    this.adminService.createJob(this.userId, payload).subscribe({
      next: (created) => {
        this.isPosting       = false;
        this.successMsg      = 'Job posted successfully!';
        this.jobTitles       = [];
        this.showOtherTitle  = false;
        this.selectedBenefits.clear();
        this.jobForm.reset({ priority: 'Normal', isEmergency: false, emergencyCountryCode: '+91', emergencyPhone: '' });
        this.jobForm.get('location')?.setValue(this.orgLocation);
        this.jobForm.get('description')?.disable();
        this.myJobs.unshift(created);
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: Error) => {
        this.isPosting = false;
        this.errorMsg  = err.message;
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  updateStatus(job: any, status: string): void {
    this.adminService.updateJobStatus(job.id, status).subscribe({
      next: () => { job.status = status; }
    });
  }

  deleteJob(id: number): void {
    this.adminService.deleteJob(id).subscribe({
      next: () => { this.myJobs = this.myJobs.filter(j => j.id !== id); }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'ACTIVE' ? 'badge-active' : s === 'CLOSED' ? 'badge-closed' : 'badge-draft';
  }

  // ── Salary Methods ────────────────────────────────────────────────────────

  loadSalaryData(): void {
    this.isLoadingSalary = true;
    this.adminService.getApprovedNurses(this.userId).subscribe({
      next: (data) => { this.hiredNurses = data || []; this.isLoadingSalary = false; },
      error: () => { this.isLoadingSalary = false; }
    });
    this.paymentSvc.getOrgSalaryHistory(this.userId).subscribe({
      next: (data) => { this.salaryHistory = data || []; },
      error: () => {}
    });
  }

  readonly MAX_HRA    = 15000;
  readonly MAX_TA     = 3000;
  readonly MAX_OTHER  = 5000;

  selectNurseForSalary(nurse: any): void {
    this.selectedNurse    = nurse;
    this.salaryMonth      = '';
    this.baseSalary       = String(nurse.jobSalaryMin || '');
    this.hra              = '';
    this.travelAllowance  = '';
    this.otherAllowances  = '';
    this.salarySuccessMsg = '';
    this.salaryErrorMsg   = '';
  }

  clampHra():   void { const v = parseFloat(this.hra)           || 0; if (v > this.MAX_HRA)   this.hra           = String(this.MAX_HRA);   }
  clampTa():    void { const v = parseFloat(this.travelAllowance) || 0; if (v > this.MAX_TA)  this.travelAllowance = String(this.MAX_TA);  }
  clampOther(): void { const v = parseFloat(this.otherAllowances) || 0; if (v > this.MAX_OTHER) this.otherAllowances = String(this.MAX_OTHER); }

  get grossPreview(): number {
    return (parseFloat(this.baseSalary)   || 0)
         + (parseFloat(this.hra)          || 0)
         + (parseFloat(this.travelAllowance) || 0)
         + (parseFloat(this.otherAllowances) || 0);
  }
  get tdsPreview():  number { return Math.round(this.grossPreview * 0.10); }
  get pfPreview():   number { return Math.round((parseFloat(this.baseSalary) || 0) * 0.12); }
  get esiPreview():  number { return Math.round(this.grossPreview * 0.0075); }
  get netPreview():  number { return this.grossPreview - this.tdsPreview - this.pfPreview - this.esiPreview; }

  processSalary(): void {
    if (!this.selectedNurse || !this.salaryMonth || !this.baseSalary) {
      this.salaryErrorMsg = 'Please select a nurse, month, and enter the base salary.';
      return;
    }
    if ((parseFloat(this.hra) || 0) > this.MAX_HRA) {
      this.salaryErrorMsg = `HRA cannot exceed ₹${this.MAX_HRA.toLocaleString('en-IN')}.`; return;
    }
    if ((parseFloat(this.travelAllowance) || 0) > this.MAX_TA) {
      this.salaryErrorMsg = `Travel Allowance cannot exceed ₹${this.MAX_TA.toLocaleString('en-IN')}.`; return;
    }
    if ((parseFloat(this.otherAllowances) || 0) > this.MAX_OTHER) {
      this.salaryErrorMsg = `Other Allowances cannot exceed ₹${this.MAX_OTHER.toLocaleString('en-IN')}.`; return;
    }
    this.isProcessingSalary = true;
    this.salaryErrorMsg     = '';
    this.salarySuccessMsg   = '';
    this.paymentSvc.processMonthlySalary(this.userId, {
      nurseUserId:      this.selectedNurse.nurseUserId,
      salaryMonth:      this.salaryMonth,
      baseSalary:       parseFloat(this.baseSalary),
      hra:              parseFloat(this.hra)             || 0,
      travelAllowance:  parseFloat(this.travelAllowance) || 0,
      otherAllowances:  parseFloat(this.otherAllowances) || 0,
    }).subscribe({
      next: (result) => {
        this.isProcessingSalary = false;
        this.salarySuccessMsg   = `Salary of ₹${Number(result.amount).toLocaleString('en-IN')} processed for ${this.selectedNurse.nurseName}!`;
        this.salaryHistory.unshift(result);
        this.selectedNurse = null;
        setTimeout(() => this.salarySuccessMsg = '', 4000);
      },
      error: (err: Error) => {
        this.isProcessingSalary = false;
        this.salaryErrorMsg     = err.message;
      }
    });
  }

  formatSalary(n: number | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  parseSalaryField(description: string, key: string): string {
    if (!description) return '0';
    const part = (description || '').split('|').find((p: string) => p.startsWith(key + '='));
    return part ? part.split('=')[1] : '0';
  }

  logout(): void { this.auth.logout(); }
}
