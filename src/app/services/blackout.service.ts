import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class BlackoutService {
  constructor(private http: HttpClient) {}

  getByNurse(nurseUserId: number): Observable<string[]> {
    return this.http.get<any>(`${API}/nurses/${nurseUserId}/blackout-dates`)
      .pipe(map(r => r.data || []));
  }

  add(nurseUserId: number, date: string, reason?: string): Observable<any> {
    return this.http.post(`${API}/nurses/${nurseUserId}/blackout-dates`, { date, reason });
  }

  remove(nurseUserId: number, date: string): Observable<any> {
    return this.http.delete(`${API}/nurses/${nurseUserId}/blackout-dates/${date}`);
  }
}
