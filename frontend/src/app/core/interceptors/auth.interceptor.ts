import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints que no deben llevar token ni disparar refresh. */
const AUTH_BYPASS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isBypass = AUTH_BYPASS.some((p) => req.url.includes(p));
  const token = auth.accessToken;

  const authReq =
    token && !isBypass
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Si es 401 en un endpoint normal, intentamos refrescar una vez.
      if (err.status === 401 && !isBypass) {
        return auth.refresh().pipe(
          switchMap((res) => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.data.accessToken}` },
            });
            return next(retried);
          }),
          catchError((refreshErr) => {
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
