import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  constructor(private router: Router) {}

  selectedRole: string = 'nurse';
  email: string = '';
  password: string = '';


  selectRole(role: string) {
    this.selectedRole = role;
  }

  goToRegister() {
  this.router.navigate(['/register']);
}

onLogin(form: any) {
  if (form.invalid) return;

  console.log({
    email: this.email,
    password: this.password,
    role: this.selectedRole
  });
  // this.router.navigate(['/patient']);
}
}