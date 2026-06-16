//app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpiryService } from './services/token-expiry.service';

/**
 * El logout en beforeunload causaba que F5 cerrara la sesión:
 * el servidor ponía last_login_timestamp = null, y al recargar
 * la primera API call devolvía 401.
 *
 * Solución: NO enviar logout al servidor en beforeunload.
 * - F5: token sigue en localStorage y last_login_timestamp intacto → sesión OK.
 * - Cierre de pestaña: last_login_timestamp queda en BD hasta que
 *   el token expire (3h) o el usuario haga login de nuevo.
 * - Multi-dispositivo: sigue funcionando porque cada nuevo login
 *   actualiza last_login_timestamp e invalida la sesión anterior.
 * - Logout explícito: el botón "Cerrar Sesión" llama logout() que
 *   sí limpia el servidor y localStorage correctamente.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'CMI-FRONT';

  constructor(private tokenExpiry: TokenExpiryService) {}

  ngOnInit(): void {
    // Programar alerta de expiración de token si ya hay sesión activa
    this.tokenExpiry.schedule();
  }
}