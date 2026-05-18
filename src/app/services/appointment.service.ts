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

  book(patientUserId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.API}/patient/${patientUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  cancel(id: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/status`, null, {
      params: { status: 'CANCELLED' }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  reschedule(id: number, newDate: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/reschedule`, null, {
      params: { newDate }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // All PENDING appointments with no nurse assigned — visible to nurses as "patient requests"
  getOpen(): Observable<any[]> {
    return this.http.get<any>(`${this.API}/open`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  // Nurse accepts a patient's appointment request (legacy direct assign — kept for compatibility)
  assignNurse(appointmentId: number, nurseUserId: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${appointmentId}/assign`, null, {
      params: { nurseUserId: String(nurseUserId) }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // Nurse bids on a patient request with salary expectation
  applyToAppointment(appointmentId: number, nurseUserId: number, salaryExpectation: number | null, note: string): Observable<any> {
    return this.http.post<any>(`${this.API}/${appointmentId}/apply?nurseUserId=${nurseUserId}`,
      { salaryExpectation, note })
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // Get all nurse bids for a patient appointment (patient views applicants)
  getAppointmentApplications(appointmentId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/${appointmentId}/applications`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  // Get all appointment requests a nurse has already applied to
  getNurseAppointmentApplications(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/applications/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  // Patient selects a nurse — accepts their application
  acceptAppointmentApplication(applicationId: number): Observable<any> {
    return this.http.post<any>(`${this.API}/applications/${applicationId}/accept`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // Nurse withdraws their bid from a patient request
  withdrawAppointmentApplication(appointmentId: number, nurseUserId: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${appointmentId}/apply`, {
      params: { nurseUserId: String(nurseUserId) }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  bookAppointment(patientUserId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.API}/patient/${patientUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getEmergencyByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}/emergency`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  reconcileByPatient(appointmentId: number, patientUserId: number): Observable<any> {
    return this.http.post<any>(`${this.API}/${appointmentId}/reconcile/patient`, null, {
      params: { patientUserId: String(patientUserId) }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  reconcileByNurse(appointmentId: number, nurseUserId: number): Observable<any> {
    return this.http.post<any>(`${this.API}/${appointmentId}/reconcile/nurse`, null, {
      params: { nurseUserId: String(nurseUserId) }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  rateAppointment(appointmentId: number, patientUserId: number, rating: number, feedback: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/${appointmentId}/rate`, { rating, feedback }, {
      params: { patientUserId: String(patientUserId) }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong. Please try again.';
    return throwError(() => new Error(msg));
  }
}
