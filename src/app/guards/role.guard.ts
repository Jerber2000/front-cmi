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
    console.warn('❌ Usuario no autenticado, redirigiendo a login');
    router.navigate(['/login']);
    return false;
  }

  // Obtener roles permitidos desde la data de la ruta
  const rolesPermitidos = route.data['roles'] as number[];

  // Si no hay roles especificados, permitir acceso
  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    console.log('✅ Sin restricción de roles, acceso permitido');
    return true;
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  if (authService.hasRole(rolesPermitidos)) {
    console.log('✅ Acceso permitido. Rol del usuario:', authService.userRole);
    return true;
  }

  // Sin permisos - Mostrar alerta
  console.warn('❌ Acceso denegado. Roles requeridos:', rolesPermitidos, 'Rol del usuario:', authService.userRole);
  
  // ⭐ Opción 1: Con tu AlertService (descomenta cuando lo tengas)
//   alertaService.error(
//     'Acceso Denegado',
//     'No tienes permisos para acceder a este recurso'
//   );

  alertaService.alertaError('No tienes permisos para acceder');

  // Redirigir al menú
  router.navigate(['/menu']);
  return false;
};