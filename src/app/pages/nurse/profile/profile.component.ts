import { AuthService } from '../../../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  profileForm!: FormGroup;
  editMode = false;
  saveSuccess = false;

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

  selectedExpertise: string[] = ['ICU', 'Wound Dressing'];
  selectedShifts: string[] = ['Morning', 'Night'];

  constructor(private auth: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      fullName:        ['Sarah Jenkins', [Validators.required, Validators.minLength(3)]],
      licenseNumber:   ['NUR-2024-DL-5892', [Validators.required, Validators.minLength(5)]],
      email:           ['sarah.jenkins@email.com', [Validators.required, Validators.email]],
      phone:           ['9876543210', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      specialization:  ['ICU / Critical Care', Validators.required],
      experience:      ['8', [Validators.required, Validators.pattern('^[0-9]+$')]],
      availability:    ['Full-Time', Validators.required],
      address:         ['204, Green Park, New Delhi - 110016', [Validators.required, Validators.minLength(10)]],
      education:       ['B.Sc Nursing – AIIMS Delhi, 2016', Validators.required],
      certifications:  ['BLS, ACLS, Critical Care Nursing'],
      reference1Name:  ['Dr. Ramesh Gupta'],
      reference1Phone: ['9811223344', [Validators.pattern('^[0-9]{10}$')]],
      reference2Name:  ['Nurse Supervisor – Apollo Hospital'],
      reference2Phone: ['9900112233', [Validators.pattern('^[0-9]{10}$')]],
      bio:             ['Dedicated ICU nurse with 8 years of critical care experience, skilled in ventilator management and cardiac monitoring.']
    });
    this.profileForm.disable();
  }

  get f() { return this.profileForm.controls; }

  toggleExpertise(area: string) {
    if (!this.editMode) return;
    const idx = this.selectedExpertise.indexOf(area);
    if (idx > -1) this.selectedExpertise.splice(idx, 1);
    else this.selectedExpertise.push(area);
  }

  toggleShift(shift: string) {
    if (!this.editMode) return;
    const idx = this.selectedShifts.indexOf(shift);
    if (idx > -1) this.selectedShifts.splice(idx, 1);
    else this.selectedShifts.push(shift);
  }

  enableEdit() {
    this.editMode = true;
    this.saveSuccess = false;
    this.profileForm.enable();
  }

  cancelEdit() {
    this.editMode = false;
    this.profileForm.disable();
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    console.log('Profile saved:', { ...this.profileForm.value, expertise: this.selectedExpertise, shifts: this.selectedShifts });
    this.editMode = false;
    this.saveSuccess = true;
    this.profileForm.disable();
    setTimeout(() => this.saveSuccess = false, 3000);
  }
  logout(): void { this.auth.logout(); }
}
