//auth.guard.ts

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);
  const authService = inject(AuthService); 

  //  VERIFICAR si está logueado
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar si la ruta actual es la de cambio de contraseña
  const currentUrl = state.url;
  const isCambiarClaveRoute = currentUrl.includes('/cambiar-clave-temporal');
  
  // Si está en la ruta de cambio de contraseña, permitir acceso
  if (isCambiarClaveRoute) {
    return true;
  }

  // Para otras rutas: El interceptor se encargará de verificar
  // si necesita cambiar contraseña cuando haga las peticiones HTTP
  // Este guard solo verifica autenticación básica
  return true;
};