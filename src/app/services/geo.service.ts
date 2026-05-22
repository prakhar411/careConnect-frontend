import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class GeoService {

  private readonly API = `${API}/geo`;

  constructor(private http: HttpClient) {}

  getStates(): Observable<string[]> {
    return this.http.get<any>(`${this.API}/states`)
      .pipe(map((r: any) => (r.data || []).sort((a: string, b: string) => a.localeCompare(b))));
  }

  getCities(state: string): Observable<string[]> {
    return this.http.get<any>(`${this.API}/cities`, { params: { state } })
      .pipe(map((r: any) => r.data || []));
  }
}
