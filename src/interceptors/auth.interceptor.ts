// src/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../app/services/auth.service';
import { Router } from '@angular/router';
import { AlertaService } from '../app/services/alerta.service';

// Interface para las respuestas del backend
interface BackendResponse {
  success: boolean;
  cambiarClave?: boolean;
  message?: string;
  data?: any;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const alerta = inject(AlertaService);
  
  const token = localStorage.getItem('token');
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(authReq).pipe(
      tap({
        next: (event) => {
          // Verificar si es una respuesta HTTP
          if (event instanceof HttpResponse) {
            const body = event.body as BackendResponse;
            
            // Detectar cuando el backend responde que debe cambiar contraseña
            if (body && body.cambiarClave === true && body.success === false) {
              console.log('🔐 Backend indica: debe cambiar contraseña');
              authService.manejarCambioObligatorio();
            }
          }
        }
      }),
      
      catchError((error: HttpErrorResponse) => {        
        // Manejar error 401: Token inválido o expirado
        if (error.status === 401) {
          alerta.alertaError('Sesión expirada. Por favor, inicia sesión nuevamente.');
          authService.logout();
          return throwError(() => error);
        }
        
        if (error.status === 403) {
          const mensaje = error.error?.message || 'No tienes permisos para realizar esta acción';
          alerta.alertaError(mensaje);
          
          return throwError(() => ({
            status: 403,
            message: mensaje,
            error: error.error
          }));
        }
        
        if (error.status === 500) {
          console.error('❌ Error 500: Error interno del servidor', error);
          alerta.alertaError('Error interno del servidor. Por favor, intenta más tarde.');
          return throwError(() => error);
        }
        
        // Otros errores
        return throwError(() => error);
      })
    );
  } else {
    // Sin token, pasar la petición normal
    return next(req);
  }
};