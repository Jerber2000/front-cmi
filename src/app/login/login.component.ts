import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  modoOlvidoClave = false;

  constructor(private router: Router) {}

  cambiarModo() {
    this.modoOlvidoClave = !this.modoOlvidoClave;
  }

onSubmitLogin() {
  console.log('Iniciando sesión...');
  
  // Simular validación de credenciales
  const loginExitoso = true; // Aquí va tu lógica real
  
  if (loginExitoso) {
    console.log('Login exitoso, redirigiendo...');
    this.irAMenu(); // ← Llamar aquí
  } else {
    console.log('Credenciales incorrectas');
  }
}

  onSubmitReset() {
    console.log('Restableciendo contraseña...');
    // Aquí va tu lógica de reset
  }

  irAMenu() {
    // Redirigir al menú usando el router de Angular
    this.router.navigate(['/menu']);
    
    // O si tienes una ruta específica como:
    // this.router.navigate(['/dashboard']);
    // this.router.navigate(['/home']);
    // this.router.navigate(['/main']);
  }
}