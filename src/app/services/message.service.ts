import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class MessageService {

  private readonly API = `${API}/messages`;

  constructor(private http: HttpClient) {}

  send(senderId: number, senderName: string, senderRole: string,
       receiverId: number, receiverRole: string, content: string): Observable<any> {
    return this.http.post<any>(
      `${this.API}?senderId=${senderId}&senderName=${encodeURIComponent(senderName)}&senderRole=${senderRole}`,
      { receiverId, receiverRole, content }
    ).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getConversation(user1: number, user2: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/conversation?user1=${user1}&user2=${user2}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  markRead(userId: number, senderId: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/read?userId=${userId}&senderId=${senderId}`, {})
      .pipe(catchError(this.handleError));
  }

  getUnreadSenders(userId: number): Observable<number[]> {
    return this.http.get<any>(`${this.API}/unread-senders?userId=${userId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(err.error?.message ?? 'Message failed.'));
  }
}
