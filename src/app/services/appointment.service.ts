import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppointmentService {

  private readonly API = 'http://localhost:8080/api/appointments';

  constructor(private http: HttpClient) {}

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong. Please try again.';
    return throwError(() => new Error(msg));
  }
}
