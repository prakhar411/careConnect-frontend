import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {

  form: FormGroup;
  isLoading  = false;
  errorMsg   = '';
  showPwd    = false;

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['CareConnectAdmin', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(50)
      ]]
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMsg  = '';

    const { username, password } = this.form.value;
    this.auth.login(username.trim(), password, 'PLATFORM_ADMIN').subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        if (data.role !== 'PLATFORM_ADMIN') {
          this.errorMsg = 'Access denied. This portal is for Platform Administrators only.';
          this.isLoading = false;
          return;
        }
        this.auth.saveSession(data);
        this.isLoading = false;
        this.router.navigate(['/platform-admin']);
      },
      error: (err: Error) => {
        this.errorMsg  = err.message;
        this.isLoading = false;
      }
    });
  }

  goHome(): void { this.router.navigate(['/']); }
}
