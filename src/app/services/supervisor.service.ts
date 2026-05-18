import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SupervisorService {

  private readonly API = 'http://localhost:8080/api/supervisor';

  constructor(private http: HttpClient) {}

  getWorkload(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${orgUserId}/workload`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  getJobAssignments(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${orgUserId}/jobs`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  assignNurse(orgUserId: number, jobId: number, nurseUserId: number): Observable<any> {
    return this.http.post<any>(`${this.API}/${orgUserId}/assign`, null, {
      params: { jobId: String(jobId), nurseUserId: String(nurseUserId) }
    }).pipe(map(r => r.data), catchError(this.handleError));
  }

  reassignNurse(orgUserId: number, jobId: number, newNurseUserId: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${orgUserId}/reassign`, null, {
      params: { jobId: String(jobId), newNurseUserId: String(newNurseUserId) }
    }).pipe(map(r => r.data), catchError(this.handleError));
  }

  // ── Shift Coverage ──────────────────────────────────────────────────────────
  getOrgShifts(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${orgUserId}/shifts`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  assignShiftCoverage(orgUserId: number, shiftId: number, coveringNurseUserId: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${orgUserId}/shifts/${shiftId}/cover`, null, {
      params: { coveringNurseUserId: String(coveringNurseUserId) }
    }).pipe(map(r => r.data), catchError(this.handleError));
  }

  // ── Handoff Notes ────────────────────────────────────────────────────────────
  sendHandoff(orgUserId: number, nurseUserId: number, jobId: number | null, note: string): Observable<any> {
    return this.http.post<any>(`${this.API}/${orgUserId}/handoff`, { nurseUserId, jobId, note })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getHandoffs(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${orgUserId}/handoffs`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  // ── Escalations ──────────────────────────────────────────────────────────────
  createEscalation(orgUserId: number, issueType: string, entityType: string | null, entityId: number | null, description: string): Observable<any> {
    return this.http.post<any>(`${this.API}/${orgUserId}/escalate`, { issueType, entityType, entityId, description })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getEscalations(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${orgUserId}/escalations`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  resolveEscalation(orgUserId: number, escalationId: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${orgUserId}/escalations/${escalationId}/resolve`, null)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(err.error?.message ?? 'Something went wrong.'));
  }
}
