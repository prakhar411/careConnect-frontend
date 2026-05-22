import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class VitalSignService {

  private readonly API = `${API}/vitals`;

  constructor(private http: HttpClient) {}

  save(payload: {
    patientUserId: number; nurseUserId: number; appointmentId?: number;
    bloodPressure?: string; pulseRate?: number; temperature?: number;
    spo2?: number; weight?: number; notes?: string;
  }): Observable<any> {
    return this.http.post<any>(this.API, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(err.error?.message ?? 'Something went wrong.'));
  }
}
