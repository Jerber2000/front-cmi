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
              authService.manejarCambioObligatorio();
            }
          }
        }
      }),
      
      catchError((error: HttpErrorResponse) => {        
        // ✅ MANEJAR ERROR 401: Token inválido, expirado o sesión duplicada
        if (error.status === 401) {
          // Limpiar todo el localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          localStorage.removeItem('loginTime'); // ← Agregar esta línea

          // Si el usuario ya está en el login, no tiene sentido avisarle que
          // "su sesión expiró": no hay sesión activa que perder, simplemente
          // limpiamos los datos locales sin mostrar la alerta ni redirigir.
          const yaEnLogin = router.url.startsWith('/login');

          if (!yaEnLogin) {
            // Determinar el mensaje apropiado
            const mensaje = error.error?.message || 'Sesión expirada';

            // Mostrar alerta apropiada
            if (mensaje.includes('otro dispositivo') || mensaje.includes('sesión')) {
              alerta.alertaInfo('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo');
            } else {
              alerta.alertaError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }

            // Redirigir al login después de un pequeño delay
            setTimeout(() => {
              router.navigate(['/login']);
            }, 2000);
          }

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