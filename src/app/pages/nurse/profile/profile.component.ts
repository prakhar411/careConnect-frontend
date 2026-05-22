import { capName } from '../../../utils/name.util';
import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { GeoService } from '../../../services/geo.service';
import { NotificationService } from '../../../services/notification.service';
import { CredentialService } from '../../../services/credential.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

// ── Validators ────────────────────────────────────────────────────────────────

const FIRST_NAME_V = [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(30),
  Validators.pattern('^[A-Za-z]+$'),
];

function lastNameV(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value || '') as string;
    if (!v) return null;
    if (v === '.') return null;
    if (/^[A-Za-z]{3,30}$/.test(v)) return null;
    return { invalidLastName: true };
  };
}

const LICENSE_PATTERN = '^[A-Z0-9]{5,20}$';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  profileForm!: FormGroup;
  editMode              = false;
  saveSuccess           = false;
  saveError             = '';
  isLoading             = true;
  isSaving              = false;
  unreadCount           = 0;
  private notifSub!: Subscription;
  availableForEmergency = false;
  isTogglingEmergency   = false;

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology',
    'Pediatric Nursing', 'Geriatric Care', 'Orthopedic Nursing',
    'Oncology', 'Emergency / Trauma', 'Psychiatric Nursing', 'Home Healthcare'
  ];

  expertiseAreas = [
    'ICU', 'Pediatric', 'Elderly Care', 'Post-Surgery',
    'Wound Dressing', 'Physiotherapy', 'Ventilator Management',
    'Cardiac Monitoring', 'Medication Administration', 'Palliative Care'
  ];

  shiftTypes = ['Morning', 'Evening', 'Night', 'Rotating', 'Flexible'];

  educationDegrees = [
    // Indian nursing
    'ANM (Auxiliary Nurse Midwifery)',
    'GNM (General Nursing and Midwifery)',
    'B.Sc Nursing',
    'Post Basic B.Sc Nursing',
    'M.Sc Nursing',
    'M.Phil Nursing',
    'Ph.D Nursing',
    // International nursing
    'RN (Registered Nurse)',
    'BSN (Bachelor of Science in Nursing)',
    'MSN (Master of Science in Nursing)',
    'DNP (Doctor of Nursing Practice)',
    'NP (Nurse Practitioner)',
    'CNS (Clinical Nurse Specialist)',
    'CRNA (Certified Registered Nurse Anesthetist)',
    'CNM (Certified Nurse-Midwife)',
    // Allied health
    'BPT (Bachelor of Physiotherapy)',
    'MPT (Master of Physiotherapy)',
    'MBBS',
    'Other',
  ];

  experienceOptions = [
    { label: '0–2 Years',  value: '0-2 years'  },
    { label: '2–4 Years',  value: '2-4 years'  },
    { label: '4–6 Years',  value: '4-6 years'  },
    { label: '6–8 Years',  value: '6-8 years'  },
    { label: '8+ Years',   value: '8+ years'   },
  ];

  countryCodes = [
    { label: '🇮🇳 +91 India',    code: '+91'  },
    { label: '🇺🇸 +1  USA',       code: '+1'   },
    { label: '🇬🇧 +44 UK',        code: '+44'  },
    { label: '🇦🇺 +61 Australia', code: '+61'  },
    { label: '🇦🇪 +971 UAE',      code: '+971' },
    { label: '🇸🇬 +65 Singapore', code: '+65'  },
  ];

  states: string[] = [];
  cities: string[] = [];

  selectedExpertise: string[] = [];
  selectedShifts:    string[] = [];

  // ── Credentials ───────────────────────────────────────────────────────────
  credentials:       any[]   = [];
  isLoadingCreds     = false;
  showCredForm       = false;
  isSavingCred       = false;
  credError          = '';
  credSuccess        = false;

  credType        = '';
  credIssuerSel   = '';   // dropdown value
  credIssuerOther = '';   // free text when "Other" selected
  credIssued      = '';
  credExpiry      = '';
  credFile: File | null = null;
  credFileName    = '';

  get credIssuer(): string {
    return this.credIssuerSel === 'Other' ? this.credIssuerOther.trim() : this.credIssuerSel;
  }

  readonly CRED_TYPES = [
    'Nursing License',
    'BLS (Basic Life Support)',
    'ACLS (Advanced Cardiovascular Life Support)',
    'PALS (Pediatric Advanced Life Support)',
    'CPR Certification',
    'Infection Control Certificate',
    'HIPAA Training Certificate',
    'Wound Care Certification',
    'IV Therapy Certification',
    'Diabetic Care Certificate',
    'Post-operative Care Certificate',
    'Mental Health First Aid',
    'Other',
  ];

  readonly ISSUERS = [
    'Indian Nursing Council (INC)',
    'State Nursing Council',
    'American Heart Association (AHA)',
    'American Red Cross',
    'Rajiv Gandhi University of Health Sciences',
    'AIIMS (All India Institute of Medical Sciences)',
    'National Board of Examinations (NBE)',
    'National Institute of Mental Health & Neuro Sciences (NIMHANS)',
    'Ministry of Health and Family Welfare (India)',
    'National Health Service (NHS) – UK',
    'Nursing and Midwifery Council (NMC) – UK',
    'National Council of State Boards of Nursing (NCSBN) – US',
    'Joint Commission International (JCI)',
    'World Health Organization (WHO)',
    'Hospital / Institution',
    'Other',
  ];

  readonly today = new Date().toISOString().split('T')[0];

  constructor(
    private auth:      AuthService,
    private nurseSvc:  NurseService,
    private geoSvc:    GeoService,
    private fb:        FormBuilder,
    private notifSvc:  NotificationService,
    public  credSvc:   CredentialService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.geoSvc.getStates().subscribe(s => this.states = s);
    this.loadProfile();
    const uid = this.auth.getUserId();
    if (uid) {
      this.notifSvc.initSSE(uid);
      this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
      this.loadCredentials(uid);
    }
  }

  private buildForm(): void {
    const dis = (val: any) => ({ value: val, disabled: true });

    this.profileForm = this.fb.group({
      // Name
      firstName:  [dis(''), FIRST_NAME_V],
      middleName: [dis(''), [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:   [dis(''), [Validators.required, Validators.maxLength(30), lastNameV()]],

      // Always-readonly
      licenseNumber: [dis('')],
      email:         [dis('')],

      // Phone
      phoneCountryCode: [dis('+91')],
      phone: [dis(''), [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],

      // Professional
      specialization: [dis(''), Validators.required],
      experience:     [dis(''), Validators.required],
      availability:   [dis(''), Validators.required],
      education:      [dis(''), Validators.required],
      educationOther: [dis(''), [Validators.minLength(3), Validators.maxLength(100), Validators.pattern('^[A-Za-z\\s().\\-/,]+$')]],
      certifications: [dis(''), Validators.maxLength(200)],
      bio:            [dis(''), Validators.maxLength(500)],

      // Address
      addressLine1: [dis(''), [Validators.required, Validators.minLength(5), Validators.maxLength(100), Validators.pattern("^[A-Za-z0-9 ,.\\/\\-']+$")]],
      addressLine2: [dis(''), Validators.maxLength(100)],
      landmark:     [dis(''), Validators.maxLength(60)],
      state:        [dis(''), Validators.required],
      city:         [dis(''), Validators.required],
      pincode:      [dis(''), [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],

      // References
      reference1Name:  [dis(''), [Validators.maxLength(30), Validators.pattern('^[A-Za-z\\s.\\-\']+$')]],
      reference1Phone: [dis(''), Validators.pattern('^[0-9]{10}$')],
      reference2Name:  [dis(''), [Validators.maxLength(30), Validators.pattern('^[A-Za-z\\s.\\-\']+$')]],
      reference2Phone: [dis(''), Validators.pattern('^[0-9]{10}$')],
    });
  }

  get f() { return this.profileForm.controls; }
  get isOtherEducation(): boolean { return this.profileForm.value.education === 'Other'; }

  // ── Load ──────────────────────────────────────────────────────────────────

  private expLabel(years: number | null): string {
    if (years === null || years === undefined) return '';
    if (years < 2)  return '0-2 years';
    if (years < 4)  return '2-4 years';
    if (years < 6)  return '4-6 years';
    if (years < 8)  return '6-8 years';
    return '8+ years';
  }

  private loadProfile(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.nurseSvc.getProfile(userId).subscribe({
      next: (data) => {
        this.isLoading = false;

        const ccCode = data.phoneCountryCode || '+91';
        let digits = data.phone || '';
        if (digits.startsWith(ccCode)) digits = digits.slice(ccCode.length);

        // Enable all controls so patchValue reliably updates the DOM,
        // then re-disable after patching (unless user is actively editing).
        this.profileForm.enable({ emitEvent: false });

        this.profileForm.patchValue({
          firstName:        data.firstName        || '',
          middleName:       data.middleName        || '',
          lastName:         data.lastName          || '',
          licenseNumber:    data.licenseNumber     || '',
          email:            data.email             || '',
          phoneCountryCode: ccCode,
          phone:            digits,
          specialization:   data.specialization    || '',
          experience:       this.expLabel(data.experienceYears),
          availability:     data.availability      || '',
          education:        this.educationDegrees.includes(data.education) ? data.education : (data.education ? 'Other' : ''),
          educationOther:   this.educationDegrees.includes(data.education) ? '' : (data.education || ''),
          bio:              '',
          addressLine1:     data.addressLine1      || '',
          addressLine2:     data.addressLine2      || '',
          landmark:         data.landmark          || '',
          state:            data.state             || '',
          city:             data.city              || '',
          pincode:          data.pincode           || '',
          reference1Name:   data.references        || '',
          reference1Phone:  '',
          reference2Name:   '',
          reference2Phone:  '',
        });

        this.availableForEmergency = !!data.availableForEmergency;

        if (data.expertise) {
          this.selectedExpertise = data.expertise.split(',')
            .map((s: string) => s.trim()).filter((s: string) => !!s);
        }

        if (data.state) {
          this.geoSvc.getCities(data.state).subscribe(c => this.cities = c);
        }

        // Re-disable all controls when not in edit mode;
        // licenseNumber and email are always disabled.
        if (!this.editMode) {
          this.profileForm.disable({ emitEvent: false });
        } else {
          this.profileForm.get('licenseNumber')?.disable({ emitEvent: false });
          this.profileForm.get('email')?.disable({ emitEvent: false });
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Edit / Cancel ─────────────────────────────────────────────────────────

  enableEdit(): void {
    this.editMode    = true;
    this.saveSuccess = false;
    this.saveError   = '';

    const allEditable = [
      'firstName', 'middleName', 'lastName',
      'phoneCountryCode', 'phone',
      'specialization', 'experience', 'availability', 'education', 'educationOther', 'certifications', 'bio',
      'addressLine1', 'addressLine2', 'landmark', 'state', 'city', 'pincode',
      'reference1Name', 'reference1Phone', 'reference2Name', 'reference2Phone',
    ];
    allEditable.forEach(f => this.profileForm.get(f)?.enable());
    // licenseNumber and email stay disabled always
  }

  cancelEdit(): void {
    this.editMode  = false;
    this.saveError = '';
    this.profileForm.disable();
    this.loadProfile();
  }

  // ── State / city cascade ──────────────────────────────────────────────────

  onPhoneCodeChange(code: string): void {
    const ctrl = this.profileForm.get('phone');
    if (code === '+91') {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]);
    } else {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[0-9]{6,15}$')]);
    }
    ctrl?.updateValueAndValidity({ emitEvent: false });
  }

  onStateChange(state: string): void {
    this.cities = [];
    this.profileForm.get('city')?.setValue('');
    if (state) this.geoSvc.getCities(state).subscribe(c => this.cities = c);
  }

  // ── Expertise / Shift chips ───────────────────────────────────────────────

  toggleEmergencyAvailability(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.isTogglingEmergency = true;
    const next = !this.availableForEmergency;
    this.nurseSvc.toggleEmergencyAvailability(userId, next).subscribe({
      next: () => { this.availableForEmergency = next; this.isTogglingEmergency = false; },
      error: () => { this.isTogglingEmergency = false; }
    });
  }

  toggleExpertise(area: string): void {
    if (!this.editMode) return;
    const idx = this.selectedExpertise.indexOf(area);
    if (idx > -1) this.selectedExpertise.splice(idx, 1);
    else          this.selectedExpertise.push(area);
  }

  toggleShift(shift: string): void {
    if (!this.editMode) return;
    const idx = this.selectedShifts.indexOf(shift);
    if (idx > -1) this.selectedShifts.splice(idx, 1);
    else          this.selectedShifts.push(shift);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  private expYears(label: string): number {
    const map: Record<string, number> = {
      '0-2 years': 0, '2-4 years': 2, '4-6 years': 4, '6-8 years': 6, '8+ years': 8
    };
    return map[label] ?? 0;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }

    const raw = this.profileForm.getRawValue();
    if (raw.education === 'Other') {
      const other = (raw.educationOther || '').trim();
      if (!other || other.length < 3) {
        this.profileForm.get('educationOther')?.markAsTouched();
        this.saveError = other ? 'Education description must be at least 3 characters.' : 'Please specify your education.';
        return;
      }
    }

    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isSaving  = true;
    this.saveError = '';

    const v = this.profileForm.getRawValue();
    const firstName  = capName(v.firstName);
    const middleName = capName(v.middleName);
    const lastName   = capName(v.lastName);
    const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const phone      = (v.phoneCountryCode || '+91') + (v.phone || '');

    const payload: any = {
      fullName,
      firstName,
      middleName: middleName || null,
      lastName,
      phone,
      phoneCountryCode: v.phoneCountryCode,
      specialization:   v.specialization,
      experienceYears:  this.expYears(v.experience),
      availability:     v.availability,
      education:        v.education === 'Other'
                          ? (v.educationOther?.trim() || 'Other')
                          : (v.education?.trim() || null),
      expertise:        this.selectedExpertise.join(','),
      addressLine1:     v.addressLine1?.trim(),
      addressLine2:     v.addressLine2?.trim() || null,
      landmark:         v.landmark?.trim()     || null,
      country:          'India',
      state:            v.state,
      city:             v.city,
      pincode:          v.pincode,
      references:       v.reference1Name?.trim() || null,
    };

    this.nurseSvc.updateProfile(userId, payload).subscribe({
      next: () => {
        this.isSaving    = false;
        this.editMode    = false;
        this.saveSuccess = true;
        this.profileForm.disable();
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err: Error) => {
        this.isSaving  = false;
        this.saveError = err.message;
      }
    });
  }

  // ── Credentials ───────────────────────────────────────────────────────────

  loadCredentials(userId: number): void {
    this.isLoadingCreds = true;
    this.credSvc.getByNurse(userId).subscribe({
      next: (data) => { this.credentials = data || []; this.isLoadingCreds = false; },
      error: () => { this.isLoadingCreds = false; }
    });
  }

  openCredForm(): void {
    this.showCredForm    = true;
    this.credType        = '';
    this.credIssuerSel   = '';
    this.credIssuerOther = '';
    this.credIssued      = '';
    this.credExpiry      = '';
    this.credFile        = null;
    this.credFileName    = '';
    this.credError       = '';
    this.credSuccess     = false;
  }

  onCredFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    if (!file) { this.credFile = null; this.credFileName = ''; return; }
    const allowed = ['image/jpeg','image/png','image/jpg','application/pdf'];
    if (!allowed.includes(file.type)) {
      this.credError    = 'Only JPG, PNG or PDF files are allowed.';
      this.credFile     = null;
      this.credFileName = '';
      input.value       = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.credError    = 'File must be under 5 MB.';
      this.credFile     = null;
      this.credFileName = '';
      input.value       = '';
      return;
    }
    this.credFile     = file;
    this.credFileName = file.name;
    this.credError    = '';
  }

  removeCredFile(): void { this.credFile = null; this.credFileName = ''; }

  cancelCredForm(): void { this.showCredForm = false; this.credError = ''; }

  submitCredential(): void {
    if (!this.credType)        { this.credError = 'Please select a credential type.'; return; }
    if (!this.credIssuerSel)  { this.credError = 'Please select the issuing authority.'; return; }
    if (this.credIssuerSel === 'Other' && !this.credIssuerOther.trim()) {
      this.credError = 'Please specify the issuing authority.'; return;
    }
    if (!this.credIssued) { this.credError = 'Please select the issued date.'; return; }
    if (!this.credExpiry) { this.credError = 'Please select the expiry date.'; return; }
    if (this.credExpiry <= this.credIssued) { this.credError = 'Expiry date must be after issued date.'; return; }

    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isSavingCred = true;
    this.credError    = '';
    this.credSvc.add(userId, {
      credentialType: this.credType,
      issuedBy:       this.credIssuer.trim(),
      issuedDate:     this.credIssued,
      expiryDate:     this.credExpiry,
    }, this.credFile).subscribe({
      next: (saved) => {
        this.credentials.unshift(saved);
        this.isSavingCred = false;
        this.credSuccess  = true;
        this.showCredForm = false;
        setTimeout(() => this.credSuccess = false, 3000);
      },
      error: (err: Error) => { this.credError = err.message; this.isSavingCred = false; }
    });
  }

  credStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'VERIFIED':  return 'cred-verified';
      case 'EXPIRED':   return 'cred-expired';
      default:          return 'cred-pending';
    }
  }

  credStatusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'VERIFIED':  return '✔ Verified';
      case 'EXPIRED':   return '✗ Expired';
      default:          return '⏳ Pending';
    }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const diff = new Date(expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < Date.now();
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  logout(): void { this.auth.logout(); }
}
