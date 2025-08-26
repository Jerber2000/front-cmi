import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { cambioClaveGuard } from './guards/cambioClave.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
  path: 'cambiar-clave-temporal',
  loadComponent: () => import('./components/cambiar-clave-temporal/cambiar-clave-temporal.component').then(m => m.CambiarClaveTemporalComponent),
  canActivate: [cambioClaveGuard] // Solo accesible si debe cambiar contraseña
  },
  {
    path: 'bienvenida',
    loadComponent: () =>
      import('./components/bienvenida/pantallaBienvenida.component').then(m => m.PantallaBienvenidaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./components/menu/menu.component').then(m => m.MenuComponent),
    canActivate: [authGuard],
  },
  { 
    path: 'usuario', 
    loadComponent: () => import('./components/usuario/usuario.component').then(c => c.UsuarioComponent), 
    canActivate: [authGuard] 
  },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./components/paciente/paciente-list.component').then(m => m.PacienteListComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];