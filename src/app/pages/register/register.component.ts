import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  constructor(private router: Router) {}

  role: string = 'patient';

  // ================= PATIENT MODEL =================
  patient = {
    fullName: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  };

  // ================= NURSE MODEL =================
  nurse = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    experience: '',
    availability: '',
    phone: ''
  };

  // ================= ROLE SWITCH =================
  selectRole(selected: string) {
    this.role = selected;
  }

  // ================= MAIN REGISTER FUNCTION =================
register(form: any) {

  if (form.invalid) {
    console.log("Form is invalid");
    return;
  }

  // ================= PATIENT =================
  if (this.role === 'patient') {

    if (!this.patient.fullName ||
        !this.patient.age ||
        !this.patient.gender ||
        !this.patient.email ||
        !this.patient.phone ||
        !this.patient.address ||
        !this.patient.password ||
        !this.patient.confirmPassword) {

      alert("Please fill all patient fields");
      return;
    }

    if (!this.validateEmail(this.patient.email)) {
      alert("Invalid email format");
      return;
    }

    if (!this.validatePhone(this.patient.phone)) {
      alert("Phone must be 10 digits");
      return;
    }

    if (this.patient.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (this.patient.password !== this.patient.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    console.log("✅ Patient Data Valid:", this.patient);

    // 🔥 ROUTE TO PATIENT DASHBOARD
    this.router.navigate(['/patient']);
  }

  // ================= NURSE =================
  else if (this.role === 'nurse') {

    if (!this.nurse.fullName ||
        !this.nurse.email ||
        !this.nurse.phone ||
        !this.nurse.password ||
        !this.nurse.confirmPassword) {

      alert("Please fill all nurse fields");
      return;
    }

    if (!this.validateEmail(this.nurse.email)) {
      alert("Invalid email format");
      return;
    }

    if (!this.validatePhone(this.nurse.phone)) {
      alert("Phone must be 10 digits");
      return;
    }

    if (this.nurse.password !== this.nurse.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    console.log("✅ Nurse Data Valid:", this.nurse);

    // 🔥 ROUTE TO NURSE DASHBOARD
    this.router.navigate(['/nurse']);
  }

}
  // ================= HELPER FUNCTIONS =================

  validateEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  validatePhone(phone: string): boolean {
    const pattern = /^[0-9]{10}$/;
    return pattern.test(phone);
  }
}