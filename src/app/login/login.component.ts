import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';  // Solo importa HttpClient, no HttpClientModule
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,         // Para [(ngModel)]
    // HttpClientModule debería estar importado globalmente (app.module.ts o main.ts)
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  modoOlvidoClave = false;
  usuario = '';
  clave = '';
  error = '';

  constructor(private router: Router, private http: HttpClient) {}

  cambiarModo() {
    this.modoOlvidoClave = !this.modoOlvidoClave;
  }

  onSubmitLogin() {
  if (!this.usuario || !this.clave) {
    this.error = 'Debe ingresar usuario y contraseña';
    alert(this.error); // alerta si no llenan campos
    return;
  }


    const loginData = {
      usuario: this.usuario,
      clave: this.clave
    };

 this.http.post<any>('http://localhost:3000/api/auth/login', loginData).subscribe({
    next: (res) => {
      if (res.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
        this.router.navigate(['/menu']);
      } else {
        this.error = res.message || 'Error desconocido';
        alert(this.error);  // alerta si usuario/clave inválidos
      }
    },
    error: (err) => {
      this.error = err.error?.message || 'Error de conexión';
      alert(this.error); // alerta si falla la petición HTTP
    }
  });
  }

  onSubmitReset() {
    console.log('Restableciendo contraseña...');
  }

  irAMenu() {
    this.router.navigate(['/menu']);
  }
}
