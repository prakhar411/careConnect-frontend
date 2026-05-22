import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly BASE = `${API}/notifications`;

  private unreadSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadSubject.asObservable();

  private sseConnected = false;
  private es: EventSource | null = null;

  constructor(private http: HttpClient) {}

  initSSE(userId: number): void {
    this.getUnreadCount(userId).subscribe(c => this.unreadSubject.next(c));

    if (this.sseConnected) return;
    this.sseConnected = true;

    this.es = new EventSource(`${this.BASE}/stream`);

    const bump = () => this.unreadSubject.next(this.unreadSubject.value + 1);
    this.es.addEventListener('EMERGENCY_JOB', bump);
    this.es.addEventListener('SHIFT', bump);
    this.es.addEventListener('PAYMENT', bump);

    this.es.onerror = () => {
      this.es?.close();
      this.sseConnected = false;
    };
  }

  setUnread(n: number): void { this.unreadSubject.next(n); }
  decrementUnread(): void { this.unreadSubject.next(Math.max(0, this.unreadSubject.value - 1)); }
  resetUnread(): void { this.unreadSubject.next(0); }

  getAll(userId: number): Observable<any[]> {
    return this.http.get<any>(`${this.BASE}/${userId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  getUnreadCount(userId: number): Observable<number> {
    return this.http.get<any>(`${this.BASE}/${userId}/unread-count`)
      .pipe(map((r: any) => r.data ?? 0), catchError(this.handleError));
  }

  markRead(id: number): Observable<any> {
    return this.http.patch(`${this.BASE}/${id}/read`, {})
      .pipe(catchError(this.handleError));
  }

  markAllRead(userId: number): Observable<any> {
    return this.http.patch(`${this.BASE}/${userId}/read-all`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(err.error?.message ?? 'Request failed'));
  }
}
