import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class ShiftService {

  private readonly API = API;

  constructor(private http: HttpClient) {}

  markShift(patientUserId: number, payload: {
    appointmentId: number;
    shiftDate: string;            // 'YYYY-MM-DD'
    negotiatedRate?: number;      // optional — if patient wants to negotiate
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.API}/shifts/patient/${patientUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // acceptNegotiation: true = use patient's proposed rate, false = keep original rate
  confirmShift(nurseUserId: number, shiftId: number, acceptNegotiation = false): Observable<any> {
    return this.http.patch(
      `${this.API}/shifts/${shiftId}/confirm/${nurseUserId}?acceptNegotiation=${acceptNegotiation}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  rejectShift(nurseUserId: number, shiftId: number): Observable<any> {
    return this.http.patch(`${this.API}/shifts/${shiftId}/reject/${nurseUserId}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getByAppointment(appointmentId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/shifts/appointment/${appointmentId}`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/shifts/patient/${patientUserId}`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/shifts/nurse/${nurseUserId}`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  getPendingByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/shifts/nurse/${nurseUserId}/pending`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong. Please try again.';
    if (err.error?.data && typeof err.error.data === 'object') {
      msg = Object.values(err.error.data).join(' | ');
    } else if (err.error?.message) {
      msg = err.error.message;
    }
    return throwError(() => new Error(msg));
  }
}
