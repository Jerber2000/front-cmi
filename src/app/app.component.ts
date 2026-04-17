//app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpiryService } from './services/token-expiry.service';
import { AuthService } from './services/auth.service';

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
    // Si ya hay un token al cargar la app (recarga de página), programar la alerta
    this.tokenExpiry.schedule();
    
    // Agregar listener para logout automático al cerrar
    window.addEventListener('beforeunload', this.handleUnload);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleUnload);
  }

  handleUnload = (event: any) => {
    this.authService.logoutSync();
  }
}