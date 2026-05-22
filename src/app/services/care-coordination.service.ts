import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class CareCoordinationService {

  private base = `${API}/care-coordination`;

  constructor(private http: HttpClient) {}

  private extract<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(
      map(r => r.data ?? r),
      catchError(err => throwError(() => new Error(err?.error?.message || 'Request failed')))
    );
  }

  // ── Care Team ──────────────────────────────────────────────────────────────

  addToTeam(patientUserId: number, body: any): Observable<any> {
    return this.extract(this.http.post(`${this.base}/patient/${patientUserId}/team`, body));
  }

  getTeam(patientUserId: number): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/patient/${patientUserId}/team`));
  }

  removeFromTeam(entryId: number): Observable<any> {
    return this.extract(this.http.delete(`${this.base}/team/${entryId}`));
  }

  // ── Provider Notes ─────────────────────────────────────────────────────────

  addNote(patientUserId: number, body: any): Observable<any> {
    return this.extract(this.http.post(`${this.base}/patient/${patientUserId}/notes`, body));
  }

  getNotes(patientUserId: number): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/patient/${patientUserId}/notes`));
  }

  // ── Care Goals ─────────────────────────────────────────────────────────────

  addGoal(patientUserId: number, body: any): Observable<any> {
    return this.extract(this.http.post(`${this.base}/patient/${patientUserId}/goals`, body));
  }

  getGoals(patientUserId: number): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/patient/${patientUserId}/goals`));
  }

  updateGoalStatus(goalId: number, status: string): Observable<any> {
    return this.extract(this.http.patch(`${this.base}/goals/${goalId}/status?status=${status}`, {}));
  }

  deleteGoal(goalId: number): Observable<any> {
    return this.extract(this.http.delete(`${this.base}/goals/${goalId}`));
  }

  // ── All org team members for nurse dropdown ────────────────────────────────

  getAllTeamMembers(): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/team-members`));
  }
}
