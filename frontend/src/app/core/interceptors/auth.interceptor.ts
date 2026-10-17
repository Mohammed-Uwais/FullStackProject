import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('cd_auth_token');

    let clonedRequest = request;
    if (token) {
      clonedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Only clear session if an existing token was rejected on a protected route
          if (!request.url.includes('/api/auth/login')) {
            localStorage.removeItem('cd_auth_token');
            localStorage.removeItem('cd_user');
            localStorage.removeItem('cd_profile');
          }
        }
        return throwError(() => error);
      })
    );
  }
}
