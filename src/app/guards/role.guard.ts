// guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AlertaService } from '../services/alerta.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const alertaService = inject(AlertaService); 

  // Verificar si está autenticado
  if (!authService.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  // Obtener roles permitidos desde la data de la ruta
  const rolesPermitidos = route.data['roles'] as number[];

  // Si no hay roles especificados, permitir acceso
  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return true;
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  if (authService.hasRole(rolesPermitidos)) {
    return true;
  }

  alertaService.alertaError('No tienes permisos para acceder');

  router.navigate(['/menu']);
  return false;
};