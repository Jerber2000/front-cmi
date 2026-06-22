import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Permiso {
  idpermiso: number;
  nombre: string;
  descripcion?: string;
  ruta: string;
  icono?: string;
  orden?: number;
}

export interface RolConPermisos {
  idrol: number;
  nombre: string;
  descripcion?: string;
  permisosAsignados: number[];
}

export interface ResumenPermisos {
  permisos: Permiso[];
  roles: RolConPermisos[];
}

// Por NOMBRE, no por ID: el idrol de cada uno cambia entre entornos (local/produccion)
const ROLES_SUPERADMIN = ['Administrador', 'Sistemas'];
const CACHE_PREFIX = '_cmi_permisos_u';

@Injectable({ providedIn: 'root' })
export class PermisoService {
  // Caché en memoria: incluye el ID del usuario para no mezclar sesiones
  private cachedUserId: number | null = null;
  private rutasPermitidas: string[] | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /** Clave sessionStorage específica por usuario */
  private cacheKey(): string {
    const uid = this.authService.getCurrentUser()?.idusuario ?? 0;
    return `${CACHE_PREFIX}${uid}`;
  }

  /** Invalida caché si cambió el usuario en sesión */
  private invalidarSiCambioUsuario(): void {
    const uid = this.authService.getCurrentUser()?.idusuario ?? null;
    if (uid !== this.cachedUserId) {
      this.rutasPermitidas = null;
      this.cachedUserId = uid;
    }
  }

  verificarAcceso(ruta: string): Observable<boolean> {
    return this.obtenerMisRutas().pipe(
      map(rutas => rutas.includes('*') || rutas.includes(ruta)),
      catchError(() => of(false))
    );
  }

  obtenerMisRutas(): Observable<string[]> {
    // Invalidar si el usuario cambió (cambio de sesión sin recarga)
    this.invalidarSiCambioUsuario();

    // Superadmin: bypass inmediato sin caché
    const rolNombre = this.authService.userRoleName;
    if (rolNombre !== null && ROLES_SUPERADMIN.includes(rolNombre)) {
      this.rutasPermitidas = ['*'];
      this.cachedUserId = this.authService.getCurrentUser()?.idusuario ?? null;
      return of(['*']);
    }

    // Caché en memoria (válida para el mismo usuario)
    if (this.rutasPermitidas !== null) {
      return of(this.rutasPermitidas);
    }

    // Caché en sessionStorage (sobrevive F5, específica por usuario)
    const key = this.cacheKey();
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try {
        this.rutasPermitidas = JSON.parse(cached);
        return of(this.rutasPermitidas!);
      } catch { /* caché corrupta, seguir */ }
    }

    // Llamar a la API
    return this.http
      .get<{ success: boolean; data: string[] }>(`${environment.apiUrl}/permisos/mis-rutas`)
      .pipe(
        map(resp => {
          this.rutasPermitidas = resp.data ?? [];
          this.cachedUserId = this.authService.getCurrentUser()?.idusuario ?? null;
          sessionStorage.setItem(key, JSON.stringify(this.rutasPermitidas));
          return this.rutasPermitidas;
        }),
        catchError(() => {
          // Si la API falla, devolver null para que el sidebar use fallback hardcodeado
          return of(null as any);
        })
      );
  }

  /** Limpia TODO el caché de permisos (logout o cambio de permisos) */
  limpiarCache(): void {
    this.rutasPermitidas = null;
    this.cachedUserId = null;
    // Limpiar todas las claves de permisos del sessionStorage
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  }

  // ─── API de administración ────────────────────────────────────────────────

  obtenerResumen(): Observable<ResumenPermisos> {
    return this.http
      .get<{ success: boolean; data: ResumenPermisos }>(`${environment.apiUrl}/permisos/resumen`)
      .pipe(map(r => r.data));
  }

  obtenerPermisosDeRol(idrol: number): Observable<number[]> {
    return this.http
      .get<{ success: boolean; data: number[] }>(`${environment.apiUrl}/permisos/rol/${idrol}`)
      .pipe(map(r => r.data));
  }

  actualizarPermisosDeRol(idrol: number, permisosIds: number[]): Observable<any> {
    return this.http.put(`${environment.apiUrl}/permisos/rol/${idrol}`, { permisosIds });
  }
}
