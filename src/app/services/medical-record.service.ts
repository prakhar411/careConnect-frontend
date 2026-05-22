import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API, FILES_API } from './api.config';

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {

  private readonly API      = `${API}/medical-records`;
  private readonly FILE_API = FILES_API;

  constructor(private http: HttpClient) {}

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  upload(patientUserId: number, uploaderUserId: number,
         recordType: string, title: string,
         description?: string, file?: File): Observable<any> {
    const fd = new FormData();
    fd.append('recordType', recordType);
    fd.append('title', title);
    if (description) fd.append('description', description);
    if (file)        fd.append('file', file, file.name);
    return this.http.post<any>(
      `${this.API}/patient/${patientUserId}/uploader/${uploaderUserId}`, fd
    ).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getFileUrl(storedFilename: string): string {
    return `${this.FILE_API}/${storedFilename}`;
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong.';
    return throwError(() => new Error(msg));
  }
}
