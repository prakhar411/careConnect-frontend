import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class TrainingService {

  private readonly API = `${API}/training`;

  constructor(private http: HttpClient) {}

  getAllOrgCourses(): Observable<any[]> {
    return this.http.get<any>(`${this.API}/courses`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  getOrgCourses(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/org/${orgUserId}/courses`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  addOrgCourse(orgUserId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.API}/org/${orgUserId}/courses`, payload)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  deleteOrgCourse(orgUserId: number, courseId: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/org/${orgUserId}/courses/${courseId}`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  completeTraining(nurseUserId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.API}/nurse/${nurseUserId}/complete`, payload)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  getNurseHistory(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/nurse/${nurseUserId}`)
      .pipe(map(r => r.data || []), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong.';
    return throwError(() => new Error(msg));
  }
}
