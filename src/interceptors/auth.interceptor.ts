// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Obtener token del localStorage
  const token = localStorage.getItem('token');
  
  // Si hay token, agregarlo a la petición
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Continuar con la petición
  return next(req).pipe(
    catchError((error) => {
      // Si es error 401 (no autorizado), redirigir al login
      if (error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};