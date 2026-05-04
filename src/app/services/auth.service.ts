import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private router: Router) {}

  login(identifier: string, password: string, role: string): Observable<any> {
    return this.http.post(`${this.API}/auth/login`, { identifier, password, role })
      .pipe(catchError(this.handleError));
  }

  register(payload: any): Observable<any> {
    return this.http.post(`${this.API}/auth/register`, payload)
      .pipe(catchError(this.handleError));
  }

  saveSession(data: any): void {
    localStorage.setItem('cc_token', data.token ?? '');
    localStorage.setItem('cc_role',  data.role  ?? '');
    localStorage.setItem('cc_user',  JSON.stringify(data));
  }

  clearSession(): void {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_role');
    localStorage.removeItem('cc_user');
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getUser(): any {
    const u = localStorage.getItem('cc_user');
    return u ? JSON.parse(u) : null;
  }

  getUserId(): number | null {
    return this.getUser()?.userId ?? null;
  }

  getRole(): string {
    return localStorage.getItem('cc_role') ?? '';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('cc_token');
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Something went wrong. Please try again.';

    if (err.status === 0) {
      message = 'Cannot connect to server. Please make sure the backend is running on port 8080.';
    } else if (err.status === 400) {
      const body = err.error;
      if (body?.message) {
        message = body.message;
      } else if (body?.data && typeof body.data === 'object') {
        // validation errors map
        message = Object.values(body.data).join(' | ');
      } else {
        message = 'Invalid request. Please check your details.';
      }
    } else if (err.status === 401) {
      message = 'Invalid credentials. Please check your details and try again.';
    } else if (err.status === 409) {
      message = 'This email is already registered. Please login instead.';
    } else if (err.status === 500) {
      message = 'Server error. Please try again later.';
    }

    return throwError(() => new Error(message));
  }
}
