import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../services/api.config';

@Injectable()
export class NgrokInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.startsWith(API_BASE) && API_BASE.includes('ngrok')) {
      req = req.clone({
        setHeaders: { 'ngrok-skip-browser-warning': 'true' }
      });
    }
    return next.handle(req);
  }
}
