import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  selectedRole = 'patient';
  isLoading    = false;

  // Modal state
  showModal    = false;
  modalType: 'success' | 'error' = 'success';
  modalTitle   = '';
  modalMessage = '';
  private navigateTo = '';

  constructor(
    private fb:   FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.buildForm(); }

  buildForm(): void {
    const idValidators = this.selectedRole === 'organization'
      ? [Validators.required, Validators.minLength(5), Validators.pattern('^[^@\\s]+$')]
      : [Validators.required, Validators.email];

    this.loginForm = this.fb.group({
      identifier: ['', idValidators],
      password:   ['', [Validators.required, Validators.minLength(12)]]
    });
  }

  get identifier() { return this.loginForm.get('identifier')!; }
  get password()   { return this.loginForm.get('password')!; }

  get identifierLabel(): string {
    return this.selectedRole === 'organization' ? 'Registration / License Number' : 'Email Address';
  }
  get identifierPlaceholder(): string {
    return this.selectedRole === 'organization' ? 'Enter your registration number' : 'Enter your email address';
  }
  get identifierType(): string {
    return this.selectedRole === 'organization' ? 'text' : 'email';
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.buildForm();
  }

  onLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }

    this.isLoading = true;

    const roleEnum = this.selectedRole === 'organization' ? 'ORGANIZATION'
                   : this.selectedRole === 'nurse'         ? 'NURSE'
                   : 'PATIENT';

    this.auth.login(this.identifier.value.trim(), this.password.value, roleEnum).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const data = res.data;
        this.auth.saveSession(data);

        this.navigateTo = data.role === 'ORGANIZATION' ? '/admin'
                        : data.role === 'NURSE'         ? '/nurse'
                        : '/patient';

        this.openModal('success', 'Login Successful',
          `Welcome back, ${data.fullName || data.email}! Redirecting to your dashboard…`);
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.openModal('error', 'Login Failed', err.message);
      }
    });
  }

  openModal(type: 'success' | 'error', title: string, message: string): void {
    this.modalType    = type;
    this.modalTitle   = title;
    this.modalMessage = message;
    this.showModal    = true;
  }

  closeModal(): void {
    this.showModal = false;
    if (this.modalType === 'success' && this.navigateTo) {
      this.router.navigate([this.navigateTo]);
    }
  }
}
