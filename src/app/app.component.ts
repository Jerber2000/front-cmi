//app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpiryService } from './services/token-expiry.service';

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
    // Si ya hay un token al cargar la app (recarga de página), programar la alerta
    this.tokenExpiry.schedule();
  }
}