import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass    = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

const NAME_PATTERN = Validators.pattern('^[a-zA-Z .\'\-]+$');
const PASS_MIN     = Validators.minLength(12);

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

  showModal    = false;
  modalType: 'success' | 'error' = 'success';
  modalTitle   = '';
  modalMessage = '';

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology', 'Pediatric Nursing',
    'Geriatric Care', 'Orthopedic Nursing', 'Oncology', 'Emergency / Trauma',
    'Psychiatric Nursing', 'Home Healthcare'
  ];

  orgTypes = ['Hospital', 'Nursing Home', 'Clinic', 'Care Center', 'Rehabilitation Center', 'Other'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.patientForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3), NAME_PATTERN]],
      age:             ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1)]],
      gender:          ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address:         ['', [Validators.required, Validators.minLength(10)]],
      password:        ['', [Validators.required, PASS_MIN]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.nurseForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3), NAME_PATTERN]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      licenseNumber:   ['', [Validators.required, Validators.minLength(5)]],
      specialization:  ['', Validators.required],
      experience:      ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      availability:    ['', Validators.required],
      password:        ['', [Validators.required, PASS_MIN]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.orgForm = this.fb.group({
      orgName:          ['', [Validators.required, Validators.minLength(3)]],
      orgType:          ['', Validators.required],
      regNumber:        ['', [Validators.required, Validators.minLength(5)]],
      contactPerson:    ['', [Validators.required, Validators.minLength(3), NAME_PATTERN]],
      designation:      ['', [Validators.required, Validators.minLength(3)]],
      email:            ['', [Validators.required, Validators.email]],
      phone:            ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address:          ['', [Validators.required, Validators.minLength(10)]],
      city:             ['', Validators.required],
      state:            ['', Validators.required],
      pincode:          ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      website:          [''],
      password:         ['', [Validators.required, PASS_MIN]],
      confirmPassword:  ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  get activeForm(): FormGroup {
    return this.role === 'patient' ? this.patientForm
         : this.role === 'nurse'   ? this.nurseForm
         : this.orgForm;
  }

  selectRole(r: string): void { this.role = r; }

  // Patient getters
  get pName()    { return this.patientForm.get('fullName')!; }
  get pAge()     { return this.patientForm.get('age')!; }
  get pGender()  { return this.patientForm.get('gender')!; }
  get pEmail()   { return this.patientForm.get('email')!; }
  get pPhone()   { return this.patientForm.get('phone')!; }
  get pAddress() { return this.patientForm.get('address')!; }
  get pPass()    { return this.patientForm.get('password')!; }
  get pConfirm() { return this.patientForm.get('confirmPassword')!; }

  // Nurse getters
  get nName()    { return this.nurseForm.get('fullName')!; }
  get nEmail()   { return this.nurseForm.get('email')!; }
  get nPhone()   { return this.nurseForm.get('phone')!; }
  get nLicense() { return this.nurseForm.get('licenseNumber')!; }
  get nSpec()    { return this.nurseForm.get('specialization')!; }
  get nExp()     { return this.nurseForm.get('experience')!; }
  get nAvail()   { return this.nurseForm.get('availability')!; }
  get nPass()    { return this.nurseForm.get('password')!; }
  get nConfirm() { return this.nurseForm.get('confirmPassword')!; }

  // Org getters
  get oName()    { return this.orgForm.get('orgName')!; }
  get oType()    { return this.orgForm.get('orgType')!; }
  get oReg()     { return this.orgForm.get('regNumber')!; }
  get oContact() { return this.orgForm.get('contactPerson')!; }
  get oDesig()   { return this.orgForm.get('designation')!; }
  get oEmail()   { return this.orgForm.get('email')!; }
  get oPhone()   { return this.orgForm.get('phone')!; }
  get oAddress() { return this.orgForm.get('address')!; }
  get oCity()    { return this.orgForm.get('city')!; }
  get oState()   { return this.orgForm.get('state')!; }
  get oPincode() { return this.orgForm.get('pincode')!; }
  get oPass()    { return this.orgForm.get('password')!; }
  get oConfirm() { return this.orgForm.get('confirmPassword')!; }

  register(): void {
    const form = this.activeForm;
    if (form.invalid) { form.markAllAsTouched(); return; }

    this.isLoading = true;
    this.auth.register(this.buildPayload()).subscribe({
      next: () => {
        this.isLoading = false;
        this.openModal('success', 'Registration Successful!',
          'Your account has been created successfully. Click OK to go to the login page.');
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.openModal('error', 'Registration Failed', err.message);
      }
    });
  }

  private buildPayload(): any {
    if (this.role === 'patient') {
      const v = this.patientForm.value;
      return { fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(),
               password: v.password, role: 'PATIENT', phone: v.phone };
    }
    if (this.role === 'nurse') {
      const v = this.nurseForm.value;
      return { fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(),
               password: v.password, role: 'NURSE', phone: v.phone,
               licenseNumber: v.licenseNumber.trim(), specialization: v.specialization,
               experienceYears: parseInt(v.experience, 10) };
    }
    const v = this.orgForm.value;
    return { fullName: v.contactPerson.trim(), email: v.email.trim().toLowerCase(),
             password: v.password, role: 'ORGANIZATION', phone: v.phone,
             orgName: v.orgName.trim(), orgType: v.orgType,
             regNumber: v.regNumber.trim(), contactPerson: v.contactPerson.trim(),
             designation: v.designation.trim(), address: v.address.trim(),
             city: v.city.trim(), state: v.state.trim(), pincode: v.pincode,
             website: v.website?.trim() || '' };
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
