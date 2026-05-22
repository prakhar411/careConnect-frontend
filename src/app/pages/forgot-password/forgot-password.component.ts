import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  role: string = 'patient';
  form!: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void { this.buildForm(); }

  buildForm(): void {
    const validators = this.role === 'organization'
      ? [Validators.required, Validators.minLength(5)]
      : [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+\\-]+@(gmail|yahoo|outlook|infosys)\\.(com|in|org)$')];
    this.form = this.fb.group({ identifier: ['', validators] });
  }

  selectRole(r: string): void { this.role = r; this.buildForm(); }

  get identifier() { return this.form.get('identifier')!; }

  get fieldLabel(): string {
    return this.role === 'organization' ? 'Registration / License Number' : 'Email Address';
  }
  get fieldPlaceholder(): string {
    return this.role === 'organization' ? 'Enter your registration number' : 'Enter your registered email';
  }
  get fieldType(): string { return this.role === 'organization' ? 'text' : 'email'; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitted = true;
  }
}
