import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { capName } from '../../../utils/name.util';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { PatientService } from '../../../services/patient.service';
import { GeoService } from '../../../services/geo.service';

// ── Validators ────────────────────────────────────────────────────────────────

const EMAIL_V = [
  Validators.required,
  Validators.pattern('^[a-zA-Z0-9._%+\\-]+@(gmail|yahoo|outlook|infosys)\\.(com|in|org)$'),
];

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

const CONTACT_FIELDS = [
  'firstName', 'middleName', 'lastName', 'email',
  'phoneCountryCode', 'phone',
  'addressLine1', 'addressLine2', 'landmark', 'state', 'city', 'pincode',
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {

  bookingForm!: FormGroup;
  isLoading  = false;
  successMsg = '';
  errorMsg   = '';

  today = new Date().toISOString().split('T')[0];

  // ── Lookup lists ─────────────────────────────────────────────────────────

  careTypes = [
    'General Care', 'Elderly Care', 'Post-Surgery Recovery',
    'ICU / Critical Support', 'Pediatric Care', 'Palliative Care',
    'Rehabilitation', 'Mental Health Support', 'Wound Care', 'Diabetes Care',
  ];

  specializations = [
    'General Nurse', 'ICU / Critical Care', 'Cardiology', 'Pediatric',
    'Geriatric', 'Orthopedic', 'Oncology', 'Psychiatric', 'Emergency',
  ];

  skillsList = [
    'Injection / IV', 'Wound Dressing', 'Physiotherapy Assist',
    'Vitals Monitoring', 'Blood Pressure Check', 'Medication Administration',
    'Catheter Care', 'Oxygen Therapy', 'Post-Op Care', 'ECG Monitoring',
  ];

  medicalConditions = [
    'Diabetes', 'Hypertension (High Blood Pressure)', 'Stroke / Paralysis',
    'Cardiac Disease / Heart Failure', 'COPD / Asthma', 'Kidney Disease / CKD',
    'Cancer (Oncology Care)', 'Alzheimer\'s / Dementia', 'Parkinson\'s Disease',
    'Post-Surgical Recovery', 'Orthopedic Injury / Fracture', 'Arthritis',
    'Obesity / Metabolic Disorder', 'Liver Disease / Cirrhosis',
    'Neurological Disorder', 'Psychiatric / Mental Health', 'Palliative / Terminal Care',
    'Newborn / Infant Care', 'Pregnancy / Post-Natal Care', 'Other',
  ];

  mobilityOptions  = ['Fully Independent', 'Walking with Support', 'Wheelchair User', 'Bed-ridden'];
  dietOptions      = ['No Restrictions', 'Diabetic Diet', 'Low Sodium', 'Low Fat', 'Renal Diet', 'Vegetarian / Vegan', 'Liquid Diet'];
  durationOptions  = ['1 Hour', '2 Hours', '4 Hours', '6 Hours', '8 Hours', '12 Hours', '24 Hours'];
  languageOptions  = ['No Preference', 'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia'];
  scheduleTypes    = ['One-time', 'Daily', 'Weekly', 'Monthly'];
  daysOfWeek       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  hours            = ['12','01','02','03','04','05','06','07','08','09','10','11'];
  minutes          = ['00','15','30','45'];

  countryCodes = [
    { label: '🇮🇳 +91 India',    code: '+91'  },
    { label: '🇺🇸 +1  USA',       code: '+1'   },
    { label: '🇬🇧 +44 UK',        code: '+44'  },
    { label: '🇦🇺 +61 Australia', code: '+61'  },
    { label: '🇦🇪 +971 UAE',      code: '+971' },
    { label: '🇸🇬 +65 Singapore', code: '+65'  },
  ];

  bookingStates: string[] = [];
  bookingCities: string[] = [];

  private selfProfile: any = null;

  constructor(
    private auth:           AuthService,
    private fb:             FormBuilder,
    private apptService:    AppointmentService,
    private patientService: PatientService,
    private geoSvc:         GeoService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.geoSvc.getStates().subscribe(s => this.bookingStates = s);

    const userId = this.auth.getUserId();
    if (userId) {
      this.patientService.getProfile(userId).subscribe({
        next: (p) => { this.selfProfile = p; this.patchSelfProfile(); },
        error: () => {}
      });
    }
  }

  // ── Form builder ──────────────────────────────────────────────────────────

  private buildForm(): void {
    const dis = (val: any) => ({ value: val, disabled: true });

    this.bookingForm = this.fb.group({
      bookingFor: ['SELF'],

      // Patient contact (disabled in SELF mode)
      firstName:        [dis(''), FIRST_NAME_V],
      middleName:       [dis(''), [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:         [dis(''), [Validators.required, Validators.maxLength(30), lastNameV()]],
      email:            [dis(''), EMAIL_V],
      phoneCountryCode: [dis('+91')],
      phone:            [dis(''), [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      addressLine1:     [dis(''), [Validators.required, Validators.minLength(5), Validators.maxLength(100), Validators.pattern("^[A-Za-z0-9 ,.\\/\\-']+$")]],
      addressLine2:     [dis(''), Validators.maxLength(100)],
      landmark:         [dis(''), Validators.maxLength(60)],
      state:            [dis(''), Validators.required],
      city:             [dis(''), Validators.required],
      pincode:          [dis(''), [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],

      // Care requirements
      careType:           ['', Validators.required],
      specialization:     [''],
      skills:             [[]],
      medicalCondition:      [''],
      medicalConditionOther: ['', [Validators.minLength(3), Validators.maxLength(120)]],
      mobilityLevel:         [''],
      dietRequirements:   ['No Restrictions'],
      visitDurationHours: [''],
      description:        ['', [Validators.minLength(10), Validators.maxLength(150)]],

      // Schedule
      scheduleType:  ['One-time'],
      startDate:     ['', Validators.required],
      endDate:       [''],
      visitHour:     ['09'],
      visitMinute:   ['00'],
      visitAmPm:     ['AM'],
      scheduleDays:  [[]],

      // Priority & Preferences
      priority:            ['Normal'],
      genderPreference:    ['No Preference'],
      languagePreference:  ['No Preference'],
      applicationDeadline: ['', Validators.required],
      notes:               ['', [Validators.minLength(10), Validators.maxLength(150)]],
    });
  }

  // ── Booking-for toggle ────────────────────────────────────────────────────

  get isSelf(): boolean { return this.bookingForm.value.bookingFor === 'SELF'; }

  onBookingForChange(value: string): void {
    if (value === 'SELF') {
      CONTACT_FIELDS.forEach(f => this.bookingForm.get(f)?.disable());
      this.patchSelfProfile();
    } else {
      CONTACT_FIELDS.forEach(f => this.bookingForm.get(f)?.enable());
      this.bookingForm.patchValue({
        firstName: '', middleName: '', lastName: '', email: '',
        phoneCountryCode: '+91', phone: '',
        addressLine1: '', addressLine2: '', landmark: '',
        state: '', city: '', pincode: '',
      });
      this.bookingCities = [];
    }
  }

  private patchSelfProfile(): void {
    const p = this.selfProfile;
    if (!p) return;

    const ccCode = p.phoneCountryCode || '+91';
    let digits = p.phone || '';
    if (digits.startsWith(ccCode)) digits = digits.slice(ccCode.length);

    this.bookingForm.patchValue({
      firstName:        p.firstName   || '',
      middleName:       p.middleName  || '',
      lastName:         p.lastName    || '',
      email:            this.auth.getUser()?.email || '',
      phoneCountryCode: ccCode,
      phone:            digits,
      addressLine1:     p.addressLine1 || '',
      addressLine2:     p.addressLine2 || '',
      landmark:         p.landmark    || '',
      state:            p.state       || '',
      city:             p.city        || '',
      pincode:          p.pincode     || '',
    });

    if (p.state) {
      this.geoSvc.getCities(p.state).subscribe(c => this.bookingCities = c);
    }
  }

  // ── State/city cascade (OTHER mode) ───────────────────────────────────────

  get isOtherCondition(): boolean {
    return this.bookingForm.value.medicalCondition === 'Other';
  }

  onBookingStateChange(state: string): void {
    this.bookingCities = [];
    this.bookingForm.get('city')?.setValue('');
    if (state) this.geoSvc.getCities(state).subscribe(c => this.bookingCities = c);
  }

  // ── Schedule helpers ──────────────────────────────────────────────────────

  get scheduleType(): string { return this.bookingForm.value.scheduleType || 'One-time'; }

  get timeDisplay(): string {
    const v = this.bookingForm.value;
    return `${v.visitHour || '09'}:${v.visitMinute || '00'} ${v.visitAmPm || 'AM'}`;
  }

  private buildVisitTime24(): string {
    const v = this.bookingForm.value;
    let h = parseInt(v.visitHour || '9', 10);
    if (v.visitAmPm === 'PM' && h !== 12) h += 12;
    if (v.visitAmPm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${v.visitMinute || '00'}`;
  }

  selectScheduleType(type: string): void {
    this.bookingForm.patchValue({ scheduleType: type, scheduleDays: [] });
  }

  selectSpecialization(spec: string): void {
    const cur = this.bookingForm.value.specialization;
    this.bookingForm.patchValue({ specialization: cur === spec ? '' : spec });
  }

  toggleSkill(skill: string): void {
    const skills: string[] = this.bookingForm.value.skills || [];
    this.bookingForm.patchValue({
      skills: skills.includes(skill) ? skills.filter((s: string) => s !== skill) : [...skills, skill]
    });
  }

  toggleDay(day: string): void {
    const days: string[] = this.bookingForm.value.scheduleDays || [];
    this.bookingForm.patchValue({
      scheduleDays: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day]
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.bookingForm.invalid) { this.bookingForm.markAllAsTouched(); return; }

    const v = this.bookingForm.getRawValue();

    if (v.scheduleType === 'Weekly' && !v.scheduleDays?.length) {
      this.errorMsg = 'Please select at least one day for the weekly schedule.';
      return;
    }

    if (v.medicalCondition === 'Other') {
      const other = (v.medicalConditionOther || '').trim();
      if (!other || other.length < 3) {
        this.bookingForm.get('medicalConditionOther')?.markAsTouched();
        this.errorMsg = other ? 'Medical condition description must be at least 3 characters.' : 'Please specify the medical condition.';
        return;
      }
    }

    const userId = this.auth.getUserId();
    if (!userId) return;

    const visitTime24    = this.buildVisitTime24();
    const appointmentDate = `${v.startDate}T${visitTime24}:00`;

    const firstName  = capName(v.firstName);
    const middleName = capName(v.middleName);
    const lastName   = capName(v.lastName);

    const noteParts = [v.description, v.notes].filter(Boolean);

    const payload = {
      appointmentDate,
      careNeeds:      v.careType + (v.specialization ? ` – ${v.specialization}` : ''),
      requiredSkills: (v.skills || []).join(', ') || null,
      duration:       v.visitDurationHours || null,
      notes:          noteParts.join(' | ') || null,

      bookingFor:              v.bookingFor,
      patientFirstName:        firstName,
      patientMiddleName:       middleName || null,
      patientLastName:         lastName,
      patientEmail:            (v.email || '').trim().toLowerCase(),
      patientPhoneCountryCode: v.phoneCountryCode,
      patientPhone:            (v.phoneCountryCode || '+91') + (v.phone || ''),
      patientAddressLine1:     v.addressLine1 || null,
      patientAddressLine2:     v.addressLine2 || null,
      patientLandmark:         v.landmark     || null,
      patientCity:             v.city         || null,
      patientState:            v.state        || null,
      patientPincode:          v.pincode      || null,

      scheduleType:      v.scheduleType,
      scheduleDays:      v.scheduleDays?.join(',') || null,
      priority:          v.priority,
      genderPreference:  v.genderPreference  !== 'No Preference'   ? v.genderPreference  : null,
      languagePreference:v.languagePreference !== 'No Preference'   ? v.languagePreference : null,
      specialization:    v.specialization    || null,
      medicalCondition:  v.medicalCondition === 'Other'
                           ? (v.medicalConditionOther?.trim() || 'Other')
                           : (v.medicalCondition || null),
      mobilityLevel:       v.mobilityLevel     || null,
      dietRequirements:    v.dietRequirements  !== 'No Restrictions' ? v.dietRequirements  : null,
      applicationDeadline: v.applicationDeadline ? v.applicationDeadline + ':00' : null,
    };

    this.isLoading  = true;
    this.successMsg = '';
    this.errorMsg   = '';

    this.apptService.book(userId, payload).subscribe({
      next: () => {
        this.isLoading  = false;
        this.successMsg = 'Appointment booked! Nurses will review and apply. Check status in My Appointments.';
        this.bookingForm.reset({
          bookingFor: 'SELF', scheduleType: 'One-time', priority: 'Normal',
          genderPreference: 'No Preference', languagePreference: 'No Preference',
          dietRequirements: 'No Restrictions',
          medicalCondition: '', medicalConditionOther: '',
          skills: [], scheduleDays: [],
          visitHour: '09', visitMinute: '00', visitAmPm: 'AM', phoneCountryCode: '+91',
        });
        CONTACT_FIELDS.forEach(f => this.bookingForm.get(f)?.disable());
        this.patchSelfProfile();
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.errorMsg  = err.message;
      }
    });
  }

  onPhoneCodeChange(code: string): void {
    const ctrl = this.bookingForm.get('phone');
    if (code === '+91') {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]);
    } else {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[0-9]{6,15}$')]);
    }
    ctrl?.updateValueAndValidity({ emitEvent: false });
  }

  logout(): void { this.auth.logout(); }
}
