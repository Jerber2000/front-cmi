//app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpiryService } from './services/token-expiry.service';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

/**
 * ¿Por qué F5 cerraba la sesión?
 *
 * `beforeunload` se dispara tanto en F5 como al cerrar la pestaña.
 * El código anterior llamaba `logoutSync()` en ambos casos, lo que:
 *  1. Enviaba logout al servidor (invalidando el token)
 *  2. Borraba el token de localStorage
 *
 * Solución: en `beforeunload` solo enviar el logout al servidor
 * (keepalive) SIN borrar localStorage.  En F5, la app recarga con
 * el token intacto.  En cierre real, el servidor ya invalidó la
 * sesión; cualquier intento futuro con ese token devuelve 401 y
 * el interceptor redirige al login.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'CMI-FRONT';

  constructor(
    private tokenExpiry: TokenExpiryService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.tokenExpiry.schedule();
    window.addEventListener('beforeunload', this.handleUnload);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleUnload);
  }

  /**
   * Al cerrar/refrescar: avisa al servidor (keepalive) pero NO
   * toca localStorage.  Así el token sobrevive a F5.
   */
  handleUnload = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // keepalive garantiza que el fetch se complete aunque la página ya se desmonte
    fetch(`${environment.apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      keepalive: true
    }).catch(() => {});

    // ← SIN clearLocalData() / SIN borrar localStorage
    // F5: token sigue en localStorage → app retoma sesión normalmente
    // Cierre: servidor invalidó el token; próximo acceso devuelve 401
    //         y el interceptor redirige al login automáticamente
  }
}