import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly API = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // ── Org Profile & Stats ──────────────────────────────────────────
  getOrgProfile(userId: number): Observable<any> {
    return this.http.get(`${this.API}/admin/org/${userId}/profile`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateOrgProfile(userId: number, payload: any): Observable<any> {
    return this.http.patch(`${this.API}/admin/org/${userId}/profile`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getDashboardStats(userId: number): Observable<any> {
    return this.http.get(`${this.API}/admin/dashboard/${userId}/stats`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Jobs ─────────────────────────────────────────────────────────
  createJob(orgUserId: number, payload: any): Observable<any> {
    return this.http.post(`${this.API}/jobs/org/${orgUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getMyJobs(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/jobs/org/${orgUserId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateJobStatus(jobId: number, status: string): Observable<any> {
    return this.http.patch(`${this.API}/jobs/${jobId}/status?status=${status}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  deleteJob(jobId: number): Observable<any> {
    return this.http.delete(`${this.API}/jobs/${jobId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Applications ─────────────────────────────────────────────────
  getAllApplications(): Observable<any[]> {
    return this.http.get<any>(`${this.API}/applications`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getOrgApplications(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/applications/org/${orgUserId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getApprovedNurses(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/applications/org/${orgUserId}/approved`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateApplicationStatus(appId: number, status: string): Observable<any> {
    return this.http.patch(`${this.API}/applications/${appId}/status?status=${status}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Management Team ───────────────────────────────────────────────
  getTeamMembers(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/team/org/${orgUserId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  addTeamMember(orgUserId: number, payload: any): Observable<any> {
    return this.http.post(`${this.API}/team/org/${orgUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  toggleTeamMemberStatus(id: number): Observable<any> {
    return this.http.patch(`${this.API}/team/${id}/status`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  deleteTeamMember(id: number): Observable<any> {
    return this.http.delete(`${this.API}/team/${id}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Compliance ───────────────────────────────────────────────────
  getCompliance(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/compliance/org/${orgUserId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  createCompliance(orgUserId: number, payload: any): Observable<any> {
    return this.http.post(`${this.API}/compliance/org/${orgUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateComplianceStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.API}/compliance/${id}/status?status=${status}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  deleteCompliance(id: number): Observable<any> {
    return this.http.delete(`${this.API}/compliance/${id}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Credentials ──────────────────────────────────────────────────
  getAllCredentials(): Observable<any[]> {
    return this.http.get<any>(`${this.API}/credentials`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getOrgCredentials(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/credentials/org/${orgUserId}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getExpiringCredentials(days = 30): Observable<any[]> {
    return this.http.get<any>(`${this.API}/credentials/expiring?days=${days}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  verifyCredential(id: number): Observable<any> {
    return this.http.patch(`${this.API}/credentials/${id}/verify`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  privilegeCredential(id: number): Observable<any> {
    return this.http.patch(`${this.API}/credentials/${id}/privilege`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  sendRenewalReminder(id: number): Observable<any> {
    return this.http.post(`${this.API}/credentials/${id}/remind`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Something went wrong. Please try again.';
    if (err.status === 0) {
      message = 'Cannot connect to server. Make sure the backend is running.';
    } else if (err.error?.data && typeof err.error.data === 'object') {
      // field-level validation errors — show the first one
      const fieldErrors = Object.values(err.error.data) as string[];
      message = fieldErrors.join(' | ');
    } else if (err.error?.message) {
      message = err.error.message;
    } else if (err.status === 404) {
      message = 'Resource not found.';
    } else if (err.status === 403) {
      message = 'Access denied.';
    }
    return throwError(() => new Error(message));
  }
}
