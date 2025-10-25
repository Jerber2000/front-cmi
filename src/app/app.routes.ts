// src/app/app.routes.ts
import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { cambioClaveGuard } from './guards/cambioClave.guard';
import { roleGuard } from './guards/role.guard';
import { InventarioSalidaComponent } from './components/inventarioSalida/inventarioSalida.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
  path: 'cambiar-clave-temporal',
  loadComponent: () => import('./components/cambiar-clave-temporal/cambiar-clave-temporal.component').then(m => m.CambiarClaveTemporalComponent),
  canActivate: [cambioClaveGuard] 
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
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,8] } //administración, sistemas, auxiliar-admon
  },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./components/paciente/paciente-list.component').then(m => m.PacienteListaComponent), 
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] } 
  },
  {
    path: 'expedientes',
    loadComponent: () =>
      import('./components/expediente/expediente').then(m => m.ExpedienteListaComponent), 
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
  },
  {
    path: 'historial/:id',
    loadComponent: () =>
      import('./components/historialMedico/historialMedico').then(m => m.HistorialMedicoComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
  },
  { 
    path: 'agenda', 
    loadComponent: () => import('./components/agenda/agenda.component').then(m => m.AgendaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
  },
  { 
     path: 'perfil', 
     loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent),
     canActivate: [authGuard, roleGuard],
     data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
   },
   { 
     path: 'referidos', 
     loadComponent: () => import('./components/referidos/referidos.component').then(m => m.ReferidosComponent),
     canActivate: [authGuard, roleGuard],
     data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
   },
  {
    path: 'administracion',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,8] } //administración, sistemas, auxiliar-admon
  },
  {
  path: 'reporteria',
  loadComponent: () =>
    import('./components/reporteria/reporteria.component').then(m => m.ReporteriaComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] } 
  },
    {
  path: 'documentos',
  loadComponent: () =>
    import('./components/documentos/documento.component').then(m => m.DocumentoComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./components/inventario/inventario.component').then(m => m.InventarioComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,10] } //administracion, sistemas, farmacia
  },
  {
    path: 'salida-inventario',
    loadComponent: () =>
      import('./components/inventarioSalida/inventarioSalida.component').then(m => m.InventarioSalidaComponent),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'educacion-inclusiva',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,15,16] } //administración, sistemas, psicopedagogo, asistente de psicopedagogía
  },
  {
    path: 'fisioterapia',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,6,14] } //administración, sistemas, fisioterapeuta, asistente
  },
  {
    path: 'medicina-general',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,2,3,5,14] } //administracion, medico-general, enfermero, sistemas, asistente
  },
  {
    path: 'nutricion',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,13,14] } //administración, sistemas, nutricionista, asistente
  },
  {
    path: 'psicologia',
    loadComponent: () =>
      import('./components/gestionclinica/gestionclinica').then(m => m.GestionClinicaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: [1,5,7,11] } //administración, sistemas, psicologo, asistente de psicologia
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];