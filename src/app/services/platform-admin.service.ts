import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {

  private base = `${API}/platform`;

  constructor(private http: HttpClient) {}

  private extract<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(
      map(r => r.data ?? r),
      catchError(err => throwError(() => new Error(err?.error?.message || 'Request failed')))
    );
  }

  getStats(): Observable<any>              { return this.extract(this.http.get(`${this.base}/stats`)); }
  getAllCompliance(): Observable<any[]>     { return this.extract(this.http.get(`${this.base}/compliance`)); }
  getAllEscalations(): Observable<any[]>    { return this.extract(this.http.get(`${this.base}/escalations`)); }
  getAllUsers(): Observable<any[]>          { return this.extract(this.http.get(`${this.base}/users`)); }
  getPolicies(): Observable<any[]>         { return this.extract(this.http.get(`${this.base}/policies`)); }
  addPolicy(body: any): Observable<any>    { return this.extract(this.http.post(`${this.base}/policies`, body)); }
  deletePolicy(id: number): Observable<any>{ return this.extract(this.http.delete(`${this.base}/policies/${id}`)); }
  toggleUser(id: number): Observable<any>  { return this.extract(this.http.patch(`${this.base}/users/${id}/toggle`, {})); }
  getAuditTrail(): Observable<any[]>       { return this.extract(this.http.get(`${this.base}/audit`)); }
  getNurseProfiles(): Observable<any[]>    { return this.extract(this.http.get(`${this.base}/nurses`)); }
  verifyNurse(id: number): Observable<any> { return this.extract(this.http.patch(`${this.base}/nurses/${id}/verify`, {})); }
  getOrgs(): Observable<any[]>             { return this.extract(this.http.get(`${this.base}/orgs`)); }
  verifyOrg(id: number): Observable<any>   { return this.extract(this.http.patch(`${this.base}/orgs/${id}/verify`, {})); }
}
