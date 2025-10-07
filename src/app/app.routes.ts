// src/app/app.routes.ts
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
      import('./components/paciente/paciente-list.component').then(m => m.PacienteListaComponent), 
    canActivate: [authGuard],
  },
  {
    path: 'expedientes',
    loadComponent: () =>
      import('./components/expediente/expediente').then(m => m.ExpedienteListaComponent), 
    canActivate: [authGuard],
  },
  {
    path: 'historial/:id',
    loadComponent: () =>
      import('./components/historialMedico/historialMedico').then(m => m.HistorialMedicoComponent),
    canActivate: [authGuard],
  },
  { 
    path: 'agenda', 
    loadComponent: () => import('./components/agenda/agenda.component').then(m => m.AgendaComponent),
    canActivate: [authGuard]
  },
  { 
     path: 'perfil', 
     loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent),
     canActivate: [authGuard]
   },
   { 
     path: 'referidos', 
     loadComponent: () => import('./components/referidos/referidos.component').then(m => m.ReferidosComponent),
     canActivate: [authGuard]
   },
  {
    path: 'administracion',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./components/inventario/inventario.component').then(m => m.InventarioComponent),
    canActivate: [authGuard],
  },
  {
    path: 'educacion-inclusiva',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'fisioterapia',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'medicina-general',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'nutricion',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'psicologia',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard],
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];