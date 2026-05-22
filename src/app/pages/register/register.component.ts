import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { capName } from '../../utils/name.util';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';

// ── Shared validators ────────────────────────────────────────────────────────

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass    = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

function dobRangeValidator(minAge: number, maxAge: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    if (!ctrl.value) return null;
    const dob   = new Date(ctrl.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < minAge) return { tooYoung: { min: minAge } };
    if (age > maxAge) return { tooOld:   { max: maxAge } };
    return null;
  };
}

const PASS_VALIDATORS = [Validators.required, Validators.minLength(12), Validators.maxLength(18)];

// Email: only gmail / yahoo / outlook / infosys with .com / .in / .org
const EMAIL_PATTERN   = '^[a-zA-Z0-9._%+\\-]+@(gmail|yahoo|outlook|infosys)\\.(com|in|org)$';
const EMAIL_VALIDATORS = [
  Validators.required,
  Validators.pattern(EMAIL_PATTERN),
];

// Address: letters, digits, spaces, comma, period, hyphen, slash, apostrophe only
const ADDR_PATTERN = "^[A-Za-z0-9 ,.\\/\\-']+$";
const ADDR1_VALIDATORS = [
  Validators.required,
  Validators.minLength(5),
  Validators.maxLength(100),
  Validators.pattern(ADDR_PATTERN),
];
const ADDR2_VALIDATORS = [
  Validators.maxLength(100),
  Validators.pattern("^[A-Za-z0-9 ,.\\/\\-']*$"),
];

// First name: letters only, min 3 max 30
const FIRST_NAME_VALIDATORS = [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(30),
  Validators.pattern('^[A-Za-z]+$')
];

// Last name: either 3–30 letters OR exactly a single dot
function lastNameValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value || '') as string;
    if (!v) return null;
    if (v === '.') return null;
    if (/^[A-Za-z]{3,30}$/.test(v)) return null;
    return { invalidLastName: true };
  };
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  role = 'patient';
  patientForm!: FormGroup;
  nurseForm!:   FormGroup;
  orgForm!:     FormGroup;
  isLoading = false;

  // Geo data - all forms use country-aware lists
  patStateList:   string[] = [];
  patCityList:    string[] = [];
  nurseStateList: string[] = [];
  nurseCityList:  string[] = [];

  // Org address geo (country-aware)
  orgStateList: string[] = [];
  orgCityList:  string[] = [];

  // Auto-calculated age from DOB
  calculatedAge: number | null = null;

  // Password visibility toggles
  showPPass    = false;  showPConfirm = false;
  showNPass    = false;  showNConfirm = false;
  showOPass    = false;  showOConfirm = false;

  // DOB limits
  readonly maxDob: string;
  readonly minDob: string;

  // Duplicate check flags for org reg/license
  regDuplicateError     = false;
  licenseDuplicateError = false;

  // Duplicate check flags for email (all three forms)
  patEmailDuplicateError   = false;
  nurseEmailDuplicateError = false;
  orgEmailDuplicateError   = false;

  // Duplicate check flag for nurse license number
  nurseLicenseDuplicateError = false;

  // Country codes — short format: "IN +91"
  countryCodes = [
    { label: 'IN +91',  code: '+91'  },
    { label: 'US +1',   code: '+1'   },
    { label: 'UK +44',  code: '+44'  },
    { label: 'AU +61',  code: '+61'  },
    { label: 'AE +971', code: '+971' },
    { label: 'SG +65',  code: '+65'  },
    { label: 'DE +49',  code: '+49'  },
    { label: 'FR +33',  code: '+33'  },
    { label: 'CA +1',   code: '+1'   },
  ];

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology', 'Pediatric Nursing',
    'Geriatric Care', 'Orthopedic Nursing', 'Oncology', 'Emergency / Trauma',
    'Psychiatric Nursing', 'Home Healthcare'
  ];

  experienceOptions = [
    { label: '0–2 Years',  value: '0-2 years'  },
    { label: '2–4 Years',  value: '2-4 years'  },
    { label: '4–6 Years',  value: '4-6 years'  },
    { label: '6–8 Years',  value: '6-8 years'  },
    { label: '8+ Years',   value: '8+ years'   },
  ];

  orgTypes = ['Hospital', 'Nursing Home', 'Clinic', 'Care Center', 'Rehabilitation Center', 'Other'];
  designations = [
    'Hospital Administrator', 'Medical Director', 'Chief Executive Officer (CEO)',
    'Chief Operating Officer (COO)', 'Head of Nursing', 'Facility Manager',
    'HR Manager', 'Operations Manager', 'Other'
  ];

  // ── Country → State → City data for org address ───────────────────────────
  readonly COUNTRY_DATA: Record<string, Record<string, string[]>> = {
    'India': {
      'Andhra Pradesh':     ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada'],
      'Arunachal Pradesh':  ['Itanagar', 'Naharlagun'],
      'Assam':              ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
      'Bihar':              ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
      'Chhattisgarh':       ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'],
      'Delhi':              ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
      'Goa':                ['Panaji', 'Margao', 'Vasco da Gama'],
      'Gujarat':            ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
      'Haryana':            ['Gurugram', 'Faridabad', 'Ambala', 'Rohtak', 'Hisar'],
      'Himachal Pradesh':   ['Shimla', 'Manali', 'Dharamshala', 'Solan'],
      'Jammu & Kashmir':    ['Jammu', 'Srinagar', 'Anantnag', 'Udhampur'],
      'Jharkhand':          ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
      'Karnataka':          ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi'],
      'Kerala':             ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
      'Madhya Pradesh':     ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
      'Maharashtra':        ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
      'Manipur':            ['Imphal', 'Thoubal'],
      'Meghalaya':          ['Shillong', 'Tura'],
      'Mizoram':            ['Aizawl', 'Lunglei'],
      'Nagaland':           ['Kohima', 'Dimapur'],
      'Odisha':             ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
      'Punjab':             ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
      'Rajasthan':          ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
      'Sikkim':             ['Gangtok', 'Namchi'],
      'Tamil Nadu':         ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
      'Telangana':          ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
      'Tripura':            ['Agartala', 'Udaipur'],
      'Uttar Pradesh':      ['Lucknow', 'Agra', 'Kanpur', 'Varanasi', 'Noida', 'Ghaziabad', 'Meerut'],
      'Uttarakhand':        ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'],
      'West Bengal':        ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
      'Other':              ['Other'],
    },
    'United States': {
      'California':         ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
      'New York':           ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Yonkers'],
      'Texas':              ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
      'Florida':            ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
      'Illinois':           ['Chicago', 'Aurora', 'Naperville', 'Joliet'],
      'Pennsylvania':       ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
      'Ohio':               ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
      'Georgia':            ['Atlanta', 'Augusta', 'Savannah', 'Macon'],
      'North Carolina':     ['Charlotte', 'Raleigh', 'Greensboro', 'Durham'],
      'Michigan':           ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Flint'],
      'Washington':         ['Seattle', 'Spokane', 'Tacoma', 'Bellevue'],
      'Arizona':            ['Phoenix', 'Tucson', 'Mesa', 'Chandler'],
      'Massachusetts':      ['Boston', 'Worcester', 'Springfield', 'Cambridge'],
      'Other':              ['Other'],
    },
    'United Kingdom': {
      'England':            ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Sheffield'],
      'Scotland':           ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
      'Wales':              ['Cardiff', 'Swansea', 'Newport'],
      'Northern Ireland':   ['Belfast', 'Londonderry'],
      'Other':              ['Other'],
    },
    'United Arab Emirates': {
      'Abu Dhabi':          ['Abu Dhabi City', 'Al Ain', 'Madinat Zayed'],
      'Dubai':              ['Dubai City', 'Deira', 'Bur Dubai', 'Jumeirah'],
      'Sharjah':            ['Sharjah City', 'Khor Fakkan'],
      'Ajman':              ['Ajman City'],
      'Fujairah':           ['Fujairah City'],
      'Ras Al Khaimah':     ['Ras Al Khaimah City'],
      'Umm Al Quwain':      ['Umm Al Quwain City'],
      'Other':              ['Other'],
    },
    'Australia': {
      'New South Wales':              ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast'],
      'Victoria':                     ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
      'Queensland':                   ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville'],
      'Western Australia':            ['Perth', 'Fremantle', 'Bunbury'],
      'South Australia':              ['Adelaide', 'Mount Gambier'],
      'Tasmania':                     ['Hobart', 'Launceston'],
      'Australian Capital Territory': ['Canberra'],
      'Northern Territory':           ['Darwin'],
      'Other':                        ['Other'],
    },
    'Singapore': {
      'Central Region':    ['Orchard', 'Marina Bay', 'Bugis', 'Chinatown'],
      'East Region':       ['Tampines', 'Bedok', 'Changi', 'Pasir Ris'],
      'North Region':      ['Woodlands', 'Yishun', 'Sembawang'],
      'North-East Region': ['Hougang', 'Sengkang', 'Punggol', 'Serangoon'],
      'West Region':       ['Jurong', 'Clementi', 'Bukit Batok', 'Choa Chu Kang'],
      'Other':             ['Other'],
    },
    'Germany': {
      'Bavaria':                ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
      'Berlin':                 ['Berlin'],
      'Hamburg':                ['Hamburg'],
      'North Rhine-Westphalia': ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen', 'Bonn'],
      'Baden-Württemberg':      ['Stuttgart', 'Karlsruhe', 'Freiburg', 'Heidelberg'],
      'Saxony':                 ['Dresden', 'Leipzig', 'Chemnitz'],
      'Hesse':                  ['Frankfurt', 'Wiesbaden', 'Kassel'],
      'Other':                  ['Other'],
    },
    'Canada': {
      'Ontario':          ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'Brampton'],
      'Quebec':           ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
      'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Victoria'],
      'Alberta':          ['Calgary', 'Edmonton', 'Red Deer'],
      'Manitoba':         ['Winnipeg', 'Brandon'],
      'Saskatchewan':     ['Saskatoon', 'Regina'],
      'Nova Scotia':      ['Halifax', 'Dartmouth'],
      'Other':            ['Other'],
    },
    'France': {
      'Île-de-France':    ['Paris', 'Versailles', 'Boulogne-Billancourt', 'Saint-Denis'],
      'Provence-Alpes':   ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence'],
      'Auvergne-Rhône':   ['Lyon', 'Grenoble', 'Clermont-Ferrand', 'Saint-Étienne'],
      'Other':            ['Other'],
    },
  };

  get orgCountries(): string[] { return Object.keys(this.COUNTRY_DATA); }

  showModal    = false;
  modalType: 'success' | 'error' = 'success';
  modalTitle   = '';
  modalMessage = '';

  constructor(
    private fb:     FormBuilder,
    private router: Router,
    private auth:   AuthService,
    private geoSvc: GeoService
  ) {
    const today    = new Date();
    const minAge1  = new Date(today.getFullYear() - 1,   today.getMonth(), today.getDate());
    const maxAge120 = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    this.maxDob = minAge1.toISOString().split('T')[0];
    this.minDob = maxAge120.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.buildPatientForm();
    this.buildNurseForm();
    this.buildOrgForm();
    // Pre-load India states for patient + nurse (default country = India)
    this.geoSvc.getStates().subscribe(s => { this.patStateList = s; this.nurseStateList = s; });
  }

  // ── Form builders ──────────────────────────────────────────────────────────

  onDobChange(value: string): void {
    if (!value) { this.calculatedAge = null; return; }
    const dob   = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    this.calculatedAge = (age >= 0 && age <= 120) ? age : null;
  }

  private buildPatientForm(): void {
    this.patientForm = this.fb.group({
      firstName:        ['', FIRST_NAME_VALIDATORS],
      middleName:       ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:         ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],
      dob:              ['', [Validators.required, dobRangeValidator(1, 120)]],
      gender:           ['', Validators.required],
      bloodGroup:       ['', Validators.required],
      email:            ['', EMAIL_VALIDATORS],
      phoneCountryCode: ['+91'],
      phone:            ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      addressLine1:     ['', ADDR1_VALIDATORS],
      addressLine2:     ['', ADDR2_VALIDATORS],
      landmark:         ['', Validators.maxLength(60)],
      country:          ['India', Validators.required],
      state:            ['', Validators.required],
      city:             ['', Validators.required],
      pincode:          ['', [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],
      password:         ['', PASS_VALIDATORS],
      confirmPassword:  ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  private buildNurseForm(): void {
    this.nurseForm = this.fb.group({
      firstName:        ['', FIRST_NAME_VALIDATORS],
      middleName:       ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:         ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],
      licenseNumber:    ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20), Validators.pattern('^[A-Z0-9]+$')]],
      specialization:   ['', Validators.required],
      experience:       ['', Validators.required],
      availability:     ['', Validators.required],
      email:            ['', EMAIL_VALIDATORS],
      phoneCountryCode: ['+91'],
      phone:            ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      addressLine1:     ['', ADDR1_VALIDATORS],
      addressLine2:     ['', ADDR2_VALIDATORS],
      landmark:         ['', Validators.maxLength(60)],
      country:          ['India', Validators.required],
      state:            ['', Validators.required],
      city:             ['', Validators.required],
      pincode:          ['', [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],
      password:         ['', PASS_VALIDATORS],
      confirmPassword:  ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  private buildOrgForm(): void {
    this.orgForm = this.fb.group({
      orgType:           ['', Validators.required],
      orgName:           [{ value: '', disabled: true }, [
        Validators.required, Validators.minLength(3), Validators.maxLength(50),
        Validators.pattern("^[A-Za-z][A-Za-z .,\\-&()'\\/]*$")
      ]],
      regNumber:         ['', [Validators.required, Validators.pattern('^[A-Za-z]{6}$')]],
      licenseNumber:     ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20), Validators.pattern('^[A-Z0-9]+$')]],
      contactFirstName:  ['', FIRST_NAME_VALIDATORS],
      contactMiddleName: ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      contactLastName:   ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],
      designation:       ['', Validators.required],
      email:             ['', [
        Validators.required,
        Validators.pattern(EMAIL_PATTERN),
      ]],
      phoneCountryCode:  ['+91'],
      phone:             ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      addressLine1:      ['', ADDR1_VALIDATORS],
      addressLine2:      ['', ADDR2_VALIDATORS],
      landmark:          ['', Validators.maxLength(60)],
      country:           ['', Validators.required],
      state:             ['', Validators.required],
      city:              ['', Validators.required],
      pincode:           ['', [Validators.required, Validators.pattern('^[A-Za-z0-9 \\-]{3,10}$')]],
      website:           ['', [Validators.pattern('^(https?://)?(www\\.)?[a-zA-Z0-9][a-zA-Z0-9\\-]+(\\.(com|in|org|gov\\.in))(/[^\\s]*)?$')]],
      password:          ['', PASS_VALIDATORS],
      confirmPassword:   ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  // ── Phone validator (country-code aware) ──────────────────────────────────

  private updatePhoneValidator(form: FormGroup, code: string): void {
    const ctrl = form.get('phone');
    if (code === '+91') {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]);
    } else {
      ctrl?.setValidators([Validators.required, Validators.pattern('^[0-9]{6,15}$')]);
    }
    ctrl?.updateValueAndValidity({ emitEvent: false });
  }

  onPatPhoneCodeChange(code: string): void   { this.updatePhoneValidator(this.patientForm, code); }
  onNursePhoneCodeChange(code: string): void  { this.updatePhoneValidator(this.nurseForm, code); }
  onOrgPhoneCodeChange(code: string): void    { this.updatePhoneValidator(this.orgForm, code); }

  // ── Key blocking helpers ───────────────────────────────────────────────────

  blockNonAlpha(e: KeyboardEvent): void {
    const ctrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End','Space'];
    if (ctrl.includes(e.key)) return;
    if (!/^[A-Za-z\s.,\-&()'\\/]$/.test(e.key)) e.preventDefault();
  }

  blockNonLetter(e: KeyboardEvent): void {
    const ctrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (ctrl.includes(e.key)) return;
    if (!/^[A-Za-z]$/.test(e.key)) e.preventDefault();
  }

  blockNonDigit(e: KeyboardEvent): void {
    const ctrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (ctrl.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  }

  // Last name: letters + single dot allowed
  blockNonLetterOrDot(e: KeyboardEvent): void {
    const ctrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (ctrl.includes(e.key)) return;
    if (!/^[A-Za-z.]$/.test(e.key)) e.preventDefault();
  }

  // ── Auto-capitalize first letter ──────────────────────────────────────────

  capitalizeFirst(ctrl: AbstractControl | null): void {
    if (!ctrl) return;
    const v: string = ctrl.value || '';
    if (v.length > 0 && v[0] !== v[0].toUpperCase()) {
      ctrl.setValue(v[0].toUpperCase() + v.slice(1), { emitEvent: false });
    }
  }

  // ── Duplicate check ───────────────────────────────────────────────────────

  checkPatEmail(): void {
    const val = (this.patientForm.get('email')?.value || '').trim().toLowerCase();
    if (!val || this.patientForm.get('email')?.invalid) { this.patEmailDuplicateError = false; return; }
    this.auth.checkEmail(val).subscribe(exists => this.patEmailDuplicateError = exists);
  }

  checkNurseEmail(): void {
    const val = (this.nurseForm.get('email')?.value || '').trim().toLowerCase();
    if (!val || this.nurseForm.get('email')?.invalid) { this.nurseEmailDuplicateError = false; return; }
    this.auth.checkEmail(val).subscribe(exists => this.nurseEmailDuplicateError = exists);
  }

  checkNurseLicense(): void {
    const val = (this.nurseForm.get('licenseNumber')?.value || '').trim().toUpperCase();
    if (!val || this.nurseForm.get('licenseNumber')?.invalid) { this.nurseLicenseDuplicateError = false; return; }
    this.auth.checkNurseLicense(val).subscribe(exists => this.nurseLicenseDuplicateError = exists);
  }

  checkOrgEmail(): void {
    const val = (this.orgForm.get('email')?.value || '').trim().toLowerCase();
    if (!val || this.orgForm.get('email')?.invalid) { this.orgEmailDuplicateError = false; return; }
    this.auth.checkEmail(val).subscribe(exists => this.orgEmailDuplicateError = exists);
  }

  checkRegDuplicate(): void {
    const val = (this.orgForm.get('regNumber')?.value || '').toUpperCase();
    if (val.length !== 6 || !/^[A-Za-z]{6}$/.test(val)) { this.regDuplicateError = false; return; }
    this.auth.checkOrgField('regNumber', val).subscribe(exists => this.regDuplicateError = exists);
  }

  checkLicenseDuplicate(): void {
    const val = (this.orgForm.get('licenseNumber')?.value || '').trim().toUpperCase();
    if (!val || this.orgForm.get('licenseNumber')?.invalid) { this.licenseDuplicateError = false; return; }
    this.auth.checkOrgField('licenseNumber', val).subscribe(exists => this.licenseDuplicateError = exists);
  }

  // ── State/city cascade ─────────────────────────────────────────────────────

  onPatCountryChange(country: string): void {
    this.patStateList = [];
    this.patCityList  = [];
    this.patientForm.get('state')?.setValue('');
    this.patientForm.get('city')?.setValue('');
    if (country === 'India') {
      this.geoSvc.getStates().subscribe(s => this.patStateList = s);
    } else {
      this.patStateList = Object.keys(this.COUNTRY_DATA[country] || {});
    }
    const pc = this.patientForm.get('pincode');
    if (country === 'India') {
      pc?.setValidators([Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]);
    } else {
      pc?.setValidators([Validators.required, Validators.pattern('^[A-Za-z0-9 \\-]{3,10}$')]);
    }
    pc?.updateValueAndValidity();
  }

  onStateChange(stateName: string): void {
    this.patCityList = [];
    this.patientForm.get('city')?.setValue('');
    const country = this.patientForm.get('country')?.value || 'India';
    if (country === 'India') {
      this.geoSvc.getCities(stateName).subscribe(c => this.patCityList = c);
    } else {
      this.patCityList = this.COUNTRY_DATA[country]?.[stateName] || [];
    }
  }

  onNurseCountryChange(country: string): void {
    this.nurseStateList = [];
    this.nurseCityList  = [];
    this.nurseForm.get('state')?.setValue('');
    this.nurseForm.get('city')?.setValue('');
    if (country === 'India') {
      this.geoSvc.getStates().subscribe(s => this.nurseStateList = s);
    } else {
      this.nurseStateList = Object.keys(this.COUNTRY_DATA[country] || {});
    }
    const pc = this.nurseForm.get('pincode');
    if (country === 'India') {
      pc?.setValidators([Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]);
    } else {
      pc?.setValidators([Validators.required, Validators.pattern('^[A-Za-z0-9 \\-]{3,10}$')]);
    }
    pc?.updateValueAndValidity();
  }

  onNurseStateChange(stateName: string): void {
    this.nurseCityList = [];
    this.nurseForm.get('city')?.setValue('');
    const country = this.nurseForm.get('country')?.value || 'India';
    if (country === 'India') {
      this.geoSvc.getCities(stateName).subscribe(c => this.nurseCityList = c);
    } else {
      this.nurseCityList = this.COUNTRY_DATA[country]?.[stateName] || [];
    }
  }

  onOrgTypeChange(val: string): void {
    const ctrl = this.orgForm.get('orgName');
    if (val) { ctrl?.enable(); } else { ctrl?.disable(); ctrl?.setValue(''); }
  }

  onOrgCountryChange(country: string): void {
    this.orgStateList = Object.keys(this.COUNTRY_DATA[country] || {});
    this.orgCityList  = [];
    this.orgForm.get('state')?.setValue('');
    this.orgForm.get('city')?.setValue('');
    // Adjust pincode validator by country
    const pincodeCtrl = this.orgForm.get('pincode');
    if (country === 'India') {
      pincodeCtrl?.setValidators([Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]);
    } else {
      pincodeCtrl?.setValidators([Validators.required, Validators.pattern('^[A-Za-z0-9 \\-]{3,10}$')]);
    }
    pincodeCtrl?.updateValueAndValidity();
  }

  onOrgStateChange(stateName: string): void {
    this.orgCityList = [];
    this.orgForm.get('city')?.setValue('');
    const country = this.orgForm.get('country')?.value || '';
    this.orgCityList = this.COUNTRY_DATA[country]?.[stateName] || [];
  }

  // ── Form getters (patient) ─────────────────────────────────────────────────

  get pFirst()   { return this.patientForm.get('firstName')!; }
  get pMiddle()  { return this.patientForm.get('middleName')!; }
  get pLast()    { return this.patientForm.get('lastName')!; }
  get pDob()     { return this.patientForm.get('dob')!; }
  get pGender()  { return this.patientForm.get('gender')!; }
  get pBlood()   { return this.patientForm.get('bloodGroup')!; }
  get pEmail()   { return this.patientForm.get('email')!; }
  get pPhone()   { return this.patientForm.get('phone')!; }
  get pAddr1()   { return this.patientForm.get('addressLine1')!; }
  get pAddr2()   { return this.patientForm.get('addressLine2')!; }
  get pLandmark(){ return this.patientForm.get('landmark')!; }
  get pState()   { return this.patientForm.get('state')!; }
  get pCity()    { return this.patientForm.get('city')!; }
  get pPincode() { return this.patientForm.get('pincode')!; }
  get pPass()    { return this.patientForm.get('password')!; }
  get pConfirm() { return this.patientForm.get('confirmPassword')!; }

  // ── Form getters (nurse) ───────────────────────────────────────────────────

  get nFirst()    { return this.nurseForm.get('firstName')!; }
  get nMiddle()   { return this.nurseForm.get('middleName')!; }
  get nLast()     { return this.nurseForm.get('lastName')!; }
  get nLicense()  { return this.nurseForm.get('licenseNumber')!; }
  get nSpec()     { return this.nurseForm.get('specialization')!; }
  get nExp()      { return this.nurseForm.get('experience')!; }
  get nAvail()    { return this.nurseForm.get('availability')!; }
  get nEmail()    { return this.nurseForm.get('email')!; }
  get nPhone()    { return this.nurseForm.get('phone')!; }
  get nAddr1()    { return this.nurseForm.get('addressLine1')!; }
  get nAddr2()    { return this.nurseForm.get('addressLine2')!; }
  get nLandmark() { return this.nurseForm.get('landmark')!; }
  get nState()    { return this.nurseForm.get('state')!; }
  get nCity()     { return this.nurseForm.get('city')!; }
  get nPincode()  { return this.nurseForm.get('pincode')!; }
  get nPass()     { return this.nurseForm.get('password')!; }
  get nConfirm()  { return this.nurseForm.get('confirmPassword')!; }

  // ── Form getters (org) ─────────────────────────────────────────────────────

  get oType()    { return this.orgForm.get('orgType')!; }
  get oName()    { return this.orgForm.get('orgName')!; }
  get oReg()     { return this.orgForm.get('regNumber')!; }
  get oLicense() { return this.orgForm.get('licenseNumber')!; }
  get oCFirst()  { return this.orgForm.get('contactFirstName')!; }
  get oCMiddle() { return this.orgForm.get('contactMiddleName')!; }
  get oCLast()   { return this.orgForm.get('contactLastName')!; }
  get oDesig()   { return this.orgForm.get('designation')!; }
  get oEmail()   { return this.orgForm.get('email')!; }
  get oPhone()   { return this.orgForm.get('phone')!; }
  get oAddr1()   { return this.orgForm.get('addressLine1')!; }
  get oAddr2()   { return this.orgForm.get('addressLine2')!; }
  get oLandmark(){ return this.orgForm.get('landmark')!; }
  get oCountry() { return this.orgForm.get('country')!; }
  get oCity()    { return this.orgForm.get('city')!; }
  get oState()   { return this.orgForm.get('state')!; }
  get oPincode() { return this.orgForm.get('pincode')!; }
  get oPass()    { return this.orgForm.get('password')!; }
  get oConfirm() { return this.orgForm.get('confirmPassword')!; }

  // ── Role switching ─────────────────────────────────────────────────────────

  selectRole(r: string): void {
    this.role = r;
    this.patEmailDuplicateError   = false;
    this.nurseEmailDuplicateError = false;
    this.orgEmailDuplicateError   = false;
    this.nurseLicenseDuplicateError = false;
    this.regDuplicateError          = false;
    this.licenseDuplicateError      = false;
  }

  get activeForm(): FormGroup {
    return this.role === 'patient' ? this.patientForm
         : this.role === 'nurse'   ? this.nurseForm
         : this.orgForm;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  register(): void {
    if (this.role === 'patient' && this.patEmailDuplicateError) return;
    if (this.role === 'nurse'   && (this.nurseEmailDuplicateError || this.nurseLicenseDuplicateError)) return;
    if (this.role === 'organization' && (this.orgEmailDuplicateError || this.regDuplicateError || this.licenseDuplicateError)) return;
    const form = this.activeForm;
    if (form.invalid) { form.markAllAsTouched(); return; }

    this.isLoading = true;
    this.auth.register(this.buildPayload()).subscribe({
      next: () => {
        this.isLoading = false;
        this.openModal('success', 'Registration Successful!',
          'Your account has been created. Click OK to go to the login page.');
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.openModal('error', 'Registration Failed', err.message);
      }
    });
  }

  private buildPayload(): any {
    if (this.role === 'patient') {
      const v = this.patientForm.getRawValue();
      return {
        role:         'PATIENT',
        firstName:    capName(v.firstName),
        middleName:   capName(v.middleName),
        lastName:     capName(v.lastName),
        email:        v.email.trim().toLowerCase(),
        password:     v.password,
        phone:        v.phoneCountryCode + v.phone,
        dob:          v.dob,
        dateOfBirth:  v.dob,
        gender:       v.gender,
        bloodGroup:   v.bloodGroup,
        addressLine1: v.addressLine1.trim(),
        addressLine2: v.addressLine2?.trim() || '',
        landmark:     v.landmark?.trim()     || '',
        country:      v.country || 'India',
        state:        v.state,
        city:         v.city,
        pincode:      v.pincode,
      };
    }

    if (this.role === 'nurse') {
      const v          = this.nurseForm.getRawValue();
      const firstName  = capName(v.firstName);
      const middleName = capName(v.middleName);
      const lastName   = capName(v.lastName);
      const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const expMap: Record<string, number> = {
        '0-2 years': 0, '2-4 years': 2, '4-6 years': 4, '6-8 years': 6, '8+ years': 8
      };
      return {
        role:            'NURSE',
        firstName, middleName, lastName, fullName,
        email:           v.email.trim().toLowerCase(),
        password:        v.password,
        phone:           v.phoneCountryCode + v.phone,
        licenseNumber:   v.licenseNumber.trim(),
        specialization:  v.specialization,
        experienceYears: expMap[v.experience] ?? 0,
        availability:    v.availability,
        addressLine1:    v.addressLine1.trim(),
        addressLine2:    v.addressLine2?.trim() || '',
        landmark:        v.landmark?.trim()     || '',
        country:         v.country || 'India',
        state:           v.state,
        city:            v.city,
        pincode:         v.pincode,
      };
    }

    const v       = this.orgForm.getRawValue();
    const cFirst  = capName(v.contactFirstName);
    const cMiddle = capName(v.contactMiddleName);
    const cLast   = capName(v.contactLastName);
    const contactPerson = [cFirst, cMiddle, cLast].filter(Boolean).join(' ');
    return {
      role:              'ORGANIZATION',
      fullName:          contactPerson,
      email:             v.email.trim().toLowerCase(),
      password:          v.password,
      orgName:           (v.orgName || '').trim(),
      orgType:           v.orgType,
      regNumber:         (v.regNumber || '').trim().toUpperCase(),
      orgLicenseNumber:  (v.licenseNumber || '').trim(),
      contactFirstName:  cFirst,
      contactMiddleName: cMiddle,
      contactLastName:   cLast,
      contactPerson,
      designation:       v.designation,
      phone:             v.phoneCountryCode + v.phone,
      addressLine1:      v.addressLine1.trim(),
      addressLine2:      v.addressLine2?.trim() || '',
      landmark:          v.landmark?.trim()     || '',
      country:           v.country,
      city:              v.city,
      state:             v.state,
      pincode:           v.pincode,
      website:           v.website?.trim() || '',
    };
  }

  openModal(type: 'success' | 'error', title: string, message: string): void {
    this.modalType = type; this.modalTitle = title; this.modalMessage = message;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    if (this.modalType === 'success') this.router.navigate(['/login']);
  }
}
