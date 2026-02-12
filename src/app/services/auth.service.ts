import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { ArchivoService } from '../services/archivo.service';
import { BehaviorSubject } from 'rxjs';

export interface CambiarClaveRequest {
  usuario: string;
  claveActual: string;
  claveNueva: string;
  confirmarClave: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userInfoSubject = new BehaviorSubject<any>({ name: 'Usuario', avatar: null });
  public userInfo$ = this.userInfoSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/auth`;

  private showWelcomeSubject = new Subject<boolean>();
  public showWelcome$ = this.showWelcomeSubject.asObservable();

  private cambiarClaveSubject = new Subject<boolean>();
  public cambiarClave$ = this.cambiarClaveSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private archivoService: ArchivoService
  ) {}

  /**
   * Login de usuario
   */
  login(usuario: string, clave: string): Observable<any> {
    const loginData = { usuario, clave };
    return this.http.post<any>(`${this.apiUrl}/login`, loginData);
  }

  /**
   * Resetear contraseña
   */
  resetearPassword(correo: string): Observable<any> {
    const resetData = { correo };
    return this.http.post<any>(`${this.apiUrl}/resetearPass`, resetData);
  }

  /**
   * Cambiar contraseña temporal
   */
  cambiarClaveTemporary(data: CambiarClaveRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cambiarClave`, data);
  }

  /**
   * Guardar datos de autenticación
   */
  saveAuthData(token: string, usuario: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('loginTime', Date.now().toString()); 
  }

  /**
   * Procesar respuesta de login y manejar cambio de contraseña
   */
  handleLoginResponse(response: any): void {    
    if (response.success && response.data) {
      // Guardar datos de autenticación
      this.saveAuthData(response.data.token, response.data.usuario);
      
      //  Emitir cambio de usuario para que el sidebar se actualice
      this.loadUserInfo();
      
      // Verificar si debe cambiar contraseña
      if (response.data.cambiarclave || response.cambiarclave) {
        this.cambiarClaveSubject.next(true);
        this.router.navigate(['/cambiar-clave-temporal']);
      } else {
        this.router.navigate(['/bienvenida']);
      }
    }
  }

  /**
   * Manejar cambio exitoso de contraseña
   */
  handlePasswordChangeSuccess(): void {
    this.cambiarClaveSubject.next(false);
    this.navigateToMenu();
  }

  /**
   * Manejar cuando el backend responde que debe cambiar contraseña
   */
  manejarCambioObligatorio(): void {
    this.cambiarClaveSubject.next(true);
    this.router.navigate(['/cambiar-clave-temporal']);
  }

  /**
   * Obtener token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Obtener usuario actual del localStorage
   */
  getCurrentUser(): any {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  }

  /**
   * Verificar si debe cambiar contraseña
   */
  debeCambiarClave(): boolean {
    return false;
  }

  /**
   * Verificar si está logueado
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Navegar al menú
   */
  navigateToMenu(): void {
    this.showWelcomeSubject.next(true);
    this.router.navigate(['/menu']);
  }

  /**
   * Logout
   */
  logout(): void {
    const token = this.getToken();
    
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
        next: () => {
          // Sesión cerrada en el servidor
        },
        error: (error: any) => {
          // Error al cerrar sesión
        },
        complete: () => {
          this.clearLocalData();
        }
      });
    } else {
      this.clearLocalData();
    }
  }

  /**
   * Limpiar datos locales
   */
  private clearLocalData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    
    // Limpiar estado de usuario en el BehaviorSubject
    this.userInfoSubject.next({ name: 'Usuario', avatar: null });
    this.cambiarClaveSubject.next(false);
    
    this.router.navigate(['/login']);
  }

  /**
   * Actualizar estado de cambio de clave
   */
  actualizarEstadoCambioClave(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      currentUser.cambiarclave = false;
      localStorage.setItem('usuario', JSON.stringify(currentUser));
    }
  }

  /**
   * Cargar información del usuario desde localStorage y emitir
   */
  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');

      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);        
      
        const userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.rutafotoperfil ? this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null,
          usuario: usuario
        };
        
        this.userInfoSubject.next(userInfo);
      } 
    } catch (error) {
      this.userInfoSubject.next({ name: 'Usuario', avatar: null });
    }
  }

  // ========================================
  //  MÉTODOS PARA ROLES
  // ========================================

  /**
   * Obtener el rol del usuario actual (ID)
   */
  get userRole(): number | null {
    const user = this.getCurrentUser();
    return user?.fkrol || null;
  }

  /**
   * Obtener el nombre del rol del usuario actual
   */
  get userRoleName(): string | null {
    const user = this.getCurrentUser();
    return user?.rolNombre || user?.rol?.nombre || null;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  get isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  /**
   * Verificar si el usuario tiene uno de los roles permitidos
   */
  hasRole(rolesPermitidos: number[]): boolean {
    const userRole = this.userRole;
    if (!userRole) return false;
    return rolesPermitidos.includes(userRole);
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasSpecificRole(rolId: number): boolean {
    return this.userRole === rolId;
  }
}