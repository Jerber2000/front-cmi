// guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AlertaService } from '../services/alerta.service';
import { PermisoService } from '../services/permiso.service';

// Roles con acceso total — nunca se validan contra la BD
const ROLES_SUPERADMIN = [1, 4];

// Rutas que no necesitan permiso de BD (accesibles a cualquier autenticado)
const RUTAS_LIBRES = ['menu', 'bienvenida', 'perfil', 'gestion-permisos'];

export const roleGuard: CanActivateFn = (route, state): Observable<boolean> | boolean => {
  const authService  = inject(AuthService);
  const permisoSvc   = inject(PermisoService);
  const router       = inject(Router);
  const alertaService = inject(AlertaService);

  // Sin sesión → login
  if (!authService.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  const rol = authService.userRole;

  // Superadmin → acceso total sin consultar BD
  if (rol !== null && ROLES_SUPERADMIN.includes(rol)) return true;

  // Extraer primer segmento de la ruta (ej: '/historial/3' → 'historial')
  const ruta = state.url.split('/').filter(Boolean)[0]?.split('?')[0] || '';

  // Rutas libres para todos los autenticados
  if (RUTAS_LIBRES.includes(ruta)) return true;

  // ── Validación contra BD — único origen de verdad, sin fallback a roles hardcodeados ──
  return permisoSvc.verificarAcceso(ruta).pipe(
    map(tieneAcceso => {
      if (tieneAcceso) return true;
      alertaService.alertaError('No tienes permisos para acceder a esta página');
      router.navigate(['/menu']);
      return false;
    }),
    catchError(() => {
      // Si la verificación de permisos falla (ej: API caída), denegar por seguridad
      // en vez de usar una lista de roles fija en el código.
      alertaService.alertaError('No se pudo verificar tus permisos. Intenta de nuevo.');
      router.navigate(['/menu']);
      return of(false);
    })
  );
};
