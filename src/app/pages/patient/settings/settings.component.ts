import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { capName } from '../../../utils/name.util';
import { AuthService } from '../../../services/auth.service';
import { PatientService } from '../../../services/patient.service';
import { GeoService } from '../../../services/geo.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const n = group.get('newPassword')?.value;
  const c = group.get('confirmPassword')?.value;
  return n && c && n !== c ? { mismatch: true } : null;
};

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  profileForm!:  FormGroup;
  passwordForm!: FormGroup;

  activeTab        = 'profile';
  isEditing        = false;
  profileSaved     = false;
  profileError     = '';
  passwordSaved    = false;
  passwordError    = '';
  isSavingProfile  = false;
  isSavingPassword = false;

  // Password visibility
  showCurrent = false;
  showNew     = false;
  showConfirm = false;

  // Display
  displayName   = '';
  displayEmail  = '';
  displayUserId = '';
  avatarLetter  = '?';

  // Profile summary card
  profileCard: {
    fullName:   string;
    dob:        string;
    age:        string;
    gender:     string;
    bloodGroup: string;
    phone:      string;
    address:    string;
  } = { fullName:'', dob:'', age:'', gender:'', bloodGroup:'', phone:'', address:'' };

  // Geo
  states: string[] = [];
  cities: string[] = [];

  // Account management
  isDeletingAccount   = false;
  isDisablingAccount  = false;
  accountActionError  = '';
  accountActionSuccess= '';

  // Auto-calculated age
  calculatedAge: number | null = null;

  // Country codes
  countryCodes = [
    { label: '🇮🇳 +91 India',    code: '+91'  },
    { label: '🇺🇸 +1  USA',       code: '+1'   },
    { label: '🇬🇧 +44 UK',        code: '+44'  },
    { label: '🇦🇺 +61 Australia', code: '+61'  },
    { label: '🇦🇪 +971 UAE',      code: '+971' },
    { label: '🇸🇬 +65 Singapore', code: '+65'  },
  ];

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  private readonly editableFields = [
    'firstName', 'middleName', 'lastName',
    'dob', 'gender', 'bloodGroup',
    'phoneCountryCode', 'phone',
    'addressLine1', 'addressLine2', 'landmark',
    'state', 'city', 'pincode'
  ];

  constructor(
    private auth:           AuthService,
    private fb:             FormBuilder,
    private patientService: PatientService,
    private geoSvc:         GeoService
  ) {}

  ngOnInit(): void {
    this.buildForms();

    const user   = this.auth.getUser();
    const userId = this.auth.getUserId();

    const fullName      = user?.fullName || '';
    this.displayName   = fullName.split(' ')[0] || user?.email || 'Patient';
    this.displayEmail  = user?.email || '';
    this.displayUserId = userId ? `#${userId}` : '—';
    this.avatarLetter  = (fullName || user?.email || 'P').charAt(0).toUpperCase();

    this.profileForm.patchValue({ email: this.displayEmail });

    // Load states
    this.geoSvc.getStates().subscribe(s => this.states = s);

    if (!userId) return;

    this.patientService.getProfile(userId).subscribe({
      next: (p) => {
        // Derive phone digits vs country code
        const phoneCountryCode = p.phoneCountryCode || '+91';
        let phoneDigits = p.phone || '';
        if (phoneDigits.startsWith(phoneCountryCode)) {
          phoneDigits = phoneDigits.slice(phoneCountryCode.length);
        }

        this.profileForm.patchValue({
          firstName:       p.firstName       || '',
          middleName:      p.middleName       || '',
          lastName:        p.lastName         || '',
          dob:             p.dateOfBirth      || '',
          gender:          p.gender           || '',
          bloodGroup:      p.bloodGroup       || '',
          phoneCountryCode,
          phone:           phoneDigits,
          addressLine1:    p.addressLine1     || '',
          addressLine2:    p.addressLine2     || '',
          landmark:        p.landmark         || '',
          state:           p.state            || '',
          city:            p.city             || '',
          pincode:         p.pincode          || '',
        });

        // Compute age from saved DOB
        if (p.dateOfBirth) this.calcAge(p.dateOfBirth);

        // Load cities for saved state
        if (p.state) {
          this.geoSvc.getCities(p.state).subscribe(c => {
            this.cities = c;
          });
        }

        const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.fullName || '';
        if (name) {
          this.displayName  = name.split(' ')[0];
          this.avatarLetter = name.charAt(0).toUpperCase();
        }

        // Populate the summary card
        const cc = p.phoneCountryCode || '+91';
        let digits = p.phone || '';
        if (digits.startsWith(cc)) digits = digits.slice(cc.length);

        this.profileCard = {
          fullName:   name,
          dob:        p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '',
          age:        this.calculatedAge !== null ? `${this.calculatedAge} yrs` : '',
          gender:     p.gender     || '',
          bloodGroup: p.bloodGroup || '',
          phone:      digits ? `${cc} ${digits}` : '',
          address:    this.buildAddress(p),
        };
      },
      error: () => {}
    });
  }

  private buildForms(): void {
    this.profileForm = this.fb.group({
      // Name
      firstName:  [{ value: '', disabled: true }, [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[A-Za-z]+$')]],
      middleName: [{ value: '', disabled: true }, [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:   [{ value: '', disabled: true }, [Validators.required, Validators.maxLength(30)]],
      // Always disabled
      email:      [{ value: '', disabled: true }],
      // Personal
      dob:        [{ value: '', disabled: true }],
      gender:     [{ value: '', disabled: true }],
      bloodGroup: [{ value: '', disabled: true }],
      // Phone
      phoneCountryCode: [{ value: '+91', disabled: true }],
      phone:            [{ value: '', disabled: true }, [Validators.pattern('^[6-9][0-9]{9}$')]],
      // Address
      addressLine1: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(5), Validators.maxLength(100), Validators.pattern("^[A-Za-z0-9 ,.\\/\\-']+$")]],
      addressLine2: [{ value: '', disabled: true }, Validators.maxLength(100)],
      landmark:     [{ value: '', disabled: true }, Validators.maxLength(60)],
      country:      [{ value: 'India', disabled: true }],
      state:        [{ value: '', disabled: true }],
      city:         [{ value: '', disabled: true }],
      pincode:      [{ value: '', disabled: true }, Validators.pattern('^[1-9][0-9]{5}$')],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword:     ['', [Validators.required, Validators.minLength(12), Validators.maxLength(18)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  get pf()  { return this.profileForm.controls; }
  get pwf() { return this.passwordForm.controls; }

  private buildAddress(p: {
    addressLine1?: string; addressLine2?: string; landmark?: string;
    city?: string; state?: string; pincode?: string; address?: string;
  }): string {
    const parts: string[] = [
      p.addressLine1,
      p.addressLine2,
      p.landmark,
      [p.city, p.state].filter(Boolean).join(', '),
      p.pincode
    ].map(s => (s || '').trim()).filter(Boolean);
    // Fallback to old flat address field
    return parts.length ? parts.join(', ') : (p.address || '');
  }

  onDobChange(value: string): void {
    this.calcAge(value);
    this.profileForm.patchValue({ dob: value });
  }

  private calcAge(dob: string): void {
    if (!dob) { this.calculatedAge = null; return; }
    const d = new Date(dob), t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
    this.calculatedAge = (age >= 0 && age <= 120) ? age : null;
  }

  onPhoneCodeChange(code: string): void {
    const ctrl = this.profileForm.get('phone');
    if (code === '+91') {
      ctrl?.setValidators([Validators.pattern('^[6-9][0-9]{9}$')]);
    } else {
      ctrl?.setValidators([Validators.pattern('^[0-9]{6,15}$')]);
    }
    ctrl?.updateValueAndValidity({ emitEvent: false });
  }

  onStateChange(state: string): void {
    this.cities = [];
    this.profileForm.get('city')?.setValue('');
    if (state) this.geoSvc.getCities(state).subscribe(c => this.cities = c);
  }

  startEditing(): void {
    this.isEditing = true;
    this.profileError = '';
    this.editableFields.forEach(f => this.profileForm.get(f)?.enable());
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.profileError = '';
    this.editableFields.forEach(f => this.profileForm.get(f)?.disable());
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const v = this.profileForm.getRawValue();
    const firstName  = capName(v.firstName);
    const middleName = capName(v.middleName);
    const lastName   = capName(v.lastName);
    const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const phone      = (v.phoneCountryCode || '+91') + (v.phone || '');

    this.isSavingProfile = true;
    this.profileError    = '';

    this.patientService.updateProfile(userId, {
      firstName, middleName, lastName, fullName,
      gender:          v.gender       || null,
      bloodGroup:      v.bloodGroup   || null,
      dateOfBirth:     v.dob          || null,
      phone,
      phoneCountryCode: v.phoneCountryCode || '+91',
      addressLine1:    v.addressLine1 || null,
      addressLine2:    v.addressLine2 || null,
      landmark:        v.landmark     || null,
      country:         v.country      || 'India',
      state:           v.state        || null,
      city:            v.city         || null,
      pincode:         v.pincode      || null,
    }).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileSaved    = true;
        this.isEditing       = false;
        this.displayName     = firstName;
        this.avatarLetter    = firstName.charAt(0).toUpperCase();
        this.editableFields.forEach(f => this.profileForm.get(f)?.disable());

        // Refresh summary card
        this.profileCard = {
          fullName:   fullName,
          dob:        v.dob ? new Date(v.dob).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '',
          age:        this.calculatedAge !== null ? `${this.calculatedAge} yrs` : '',
          gender:     v.gender     || '',
          bloodGroup: v.bloodGroup || '',
          phone:      v.phone ? `${v.phoneCountryCode} ${v.phone}` : '',
          address:    this.buildAddress({
            addressLine1: v.addressLine1,
            addressLine2: v.addressLine2,
            landmark:     v.landmark,
            city:         v.city,
            state:        v.state,
            pincode:      v.pincode,
          }),
        };

        setTimeout(() => this.profileSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSavingProfile = false;
        this.profileError    = err.message;
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isSavingPassword = true;
    this.passwordError    = '';

    this.auth.changePassword(userId, currentPassword, newPassword).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSaved    = true;
        this.passwordForm.reset();
        setTimeout(() => this.passwordSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSavingPassword = false;
        this.passwordError    = err.message;
      }
    });
  }

  deleteAccount(): void {
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.isDeletingAccount   = true;
    this.accountActionError  = '';
    this.patientService.deleteAccount(userId).subscribe({
      next: () => { this.auth.logout(); },
      error: (err: Error) => {
        this.isDeletingAccount  = false;
        this.accountActionError = err.message;
      }
    });
  }

  disableAccount(): void {
    if (!confirm('Disable your account? You will be logged out and will not be able to log in until you contact support.')) return;
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.isDisablingAccount  = true;
    this.accountActionError  = '';
    this.patientService.disableAccount(userId).subscribe({
      next: () => { this.auth.logout(); },
      error: (err: Error) => {
        this.isDisablingAccount  = false;
        this.accountActionError  = err.message;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
