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

// Roles que tienen acceso total — no se validan contra la BD
const ROLES_SUPERADMIN = [1, 4];
const CACHE_KEY = '_cmi_permisos_v2';

@Injectable({ providedIn: 'root' })
export class PermisoService {
  private rutasPermitidas: string[] | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Verifica si el usuario tiene acceso a una ruta específica.
   * Primero usa caché (memoria → sessionStorage), luego llama a la API.
   */
  verificarAcceso(ruta: string): Observable<boolean> {
    return this.obtenerMisRutas().pipe(
      map(rutas => rutas.includes('*') || rutas.includes(ruta)),
      catchError(() => of(false))
    );
  }

  /**
   * Devuelve las rutas permitidas para el usuario actual.
   * - Superadmin: ['*']
   * - Otros: lista de rutas desde la API (con caché en sessionStorage)
   */
  obtenerMisRutas(): Observable<string[]> {
    // Caché en memoria
    if (this.rutasPermitidas) return of(this.rutasPermitidas);

    // Caché en sessionStorage (sobrevive F5)
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        this.rutasPermitidas = JSON.parse(cached);
        return of(this.rutasPermitidas!);
      } catch {}
    }

    const rol = this.authService.userRole;

    // Superadmin — acceso total sin consultar BD
    if (rol !== null && ROLES_SUPERADMIN.includes(rol)) {
      this.rutasPermitidas = ['*'];
      return of(['*']);
    }

    // Llamar a la API
    return this.http
      .get<{ success: boolean; data: string[] }>(`${environment.apiUrl}/permisos/mis-rutas`)
      .pipe(
        map(resp => {
          this.rutasPermitidas = resp.data;
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(resp.data));
          return resp.data;
        }),
        catchError(() => of([]))
      );
  }

  /** Limpia el caché (llamar al hacer logout o cuando se cambian permisos) */
  limpiarCache(): void {
    this.rutasPermitidas = null;
    sessionStorage.removeItem(CACHE_KEY);
  }

  // ─── API de administración de permisos (solo admin) ────────────────────────

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
