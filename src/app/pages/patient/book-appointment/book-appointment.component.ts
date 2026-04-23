import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {
 bookingForm!: FormGroup;

  careTypes = [
    'General Care',
    'Elderly Care',
    'Post-Surgery',
    'ICU Support',
    'Pediatric Care'
  ];

  specializations = [
    'General Nurse',
    'ICU',
    'Cardiology',
    'Pediatric',
    'Geriatric',
    'Orthopedic'
  ];

  skillsList = [
    'Injection',
    'Wound Dressing',
    'Physiotherapy',
    'Vitals Monitoring'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.bookingForm = this.fb.group({
      fullName: ['Prakhar', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],

      careType: ['', Validators.required],
      specialization: ['', Validators.required],
      skills: [[]],
      description: [''],

      startDate: ['', Validators.required],
      endDate: [''],
      timeSlot: ['', Validators.required],
      durationType: ['', Validators.required],

      priority: ['Normal', Validators.required],

      genderPreference: ['No Preference'],
      notes: ['']
    });
  }

  selectSpecialization(spec: string) {
    this.bookingForm.patchValue({ specialization: spec });
  }

  toggleSkill(skill: string) {
    const skills = this.bookingForm.value.skills || [];
    if (skills.includes(skill)) {
      this.bookingForm.patchValue({
        skills: skills.filter((s: string) => s !== skill)
      });
    } else {
      this.bookingForm.patchValue({
        skills: [...skills, skill]
      });
    }
  }

  onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    console.log(this.bookingForm.value);
    alert('Appointment Booked!');
  }
}
