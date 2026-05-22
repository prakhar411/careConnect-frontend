import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API, FILES_API } from './api.config';

@Injectable({ providedIn: 'root' })
export class CredentialService {

  private readonly API = `${API}/credentials`;

  constructor(private http: HttpClient) {}

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  add(nurseUserId: number, payload: {
    credentialType: string;
    issuedBy: string;
    issuedDate: string;
    expiryDate: string;
  }, file?: File | null): Observable<any> {
    const fd = new FormData();
    fd.append('credentialType', payload.credentialType);
    fd.append('issuedBy',       payload.issuedBy);
    fd.append('issuedDate',     payload.issuedDate);
    fd.append('expiryDate',     payload.expiryDate);
    if (file) fd.append('document', file, file.name);
    return this.http.post<any>(`${this.API}/nurse/${nurseUserId}`, fd)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  docUrl(filename: string): string {
    return `${FILES_API}/${filename}`;
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong.';
    if (err.error?.message) msg = err.error.message;
    else if (err.error?.data && typeof err.error.data === 'object')
      msg = Object.values(err.error.data).join(' | ');
    return throwError(() => new Error(msg));
  }
}
