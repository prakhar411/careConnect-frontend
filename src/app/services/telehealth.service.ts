import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TelehealthService {

  private base = 'http://localhost:8080/api/telehealth';
  readonly fileBase = 'http://localhost:8080/api/files';

  constructor(private http: HttpClient) {}

  private extract<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(
      map(r => r.data ?? r),
      catchError(err => throwError(() => new Error(err?.error?.message || 'Request failed')))
    );
  }

  upload(formData: FormData): Observable<any> {
    return this.extract(this.http.post(`${this.base}/upload`, formData));
  }

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/nurse/${nurseUserId}`));
  }

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.extract(this.http.get(`${this.base}/patient/${patientUserId}`));
  }

  delete(id: number): Observable<any> {
    return this.extract(this.http.delete(`${this.base}/${id}`));
  }

  fileUrl(fileName: string): string {
    return `${this.fileBase}/${fileName}`;
  }
}
