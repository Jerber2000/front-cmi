import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // ✅ AGREGAR para mensaje de bienvenida
  private showWelcomeSubject = new Subject<boolean>();
  public showWelcome$ = this.showWelcomeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
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
   * Guardar datos de autenticación
   */
  saveAuthData(token: string, usuario: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  /**
   * Obtener token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
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
    // ✅ ACTIVAR mensaje de bienvenida
    this.showWelcomeSubject.next(true);
    this.router.navigate(['/menu']);
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}