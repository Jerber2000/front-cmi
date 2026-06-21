import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PermisoService, Permiso, RolConPermisos } from '../../services/permiso.service';
import { AlertaService } from '../../services/alerta.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { PerfilService } from '../../services/perfil.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gestion-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './gestion-permisos.component.html',
  styleUrls: ['./gestion-permisos.component.scss']
})
export class GestionPermisosComponent implements OnInit {
  userInfo: any = {};
  sidebarVisible = false;

  permisos: Permiso[] = [];
  roles: RolConPermisos[] = [];

  rolSeleccionado: RolConPermisos | null = null;
  permisosSeleccionados: Set<number> = new Set();

  mostrarModalPestanas = false;
  permisoEnModal: Permiso | null = null;

  loading = true;
  guardando = false;
  private perfilSubscription?: Subscription;

  constructor(
    private permisoService: PermisoService,
    private alerta: AlertaService,
    private router: Router,
    private perfilService: PerfilService
  ) {}

  ngOnInit(): void {
    this.perfilSubscription = this.perfilService.perfil$.subscribe(usuario => {
      if (usuario) this.userInfo = this.perfilService.obtenerInfoSidebar();
    });
    this.perfilService.obtenerPerfilDesdeBackend().subscribe();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
  }

  cargarDatos(): void {
    this.loading = true;
    this.permisoService.obtenerResumen().subscribe({
      next: ({ permisos, roles }) => {
        this.permisos = permisos;
        this.roles = roles;
        if (roles.length > 0) this.seleccionarRol(roles[0]);
        this.loading = false;
      },
      error: () => {
        this.alerta.alertaError('Error al cargar los permisos');
        this.loading = false;
      }
    });
  }

  seleccionarRol(rol: RolConPermisos): void {
    this.rolSeleccionado = rol;
    this.permisosSeleccionados = new Set(rol.permisosAsignados);
    this.cerrarModalPestanas();
  }

  tienePermiso(idpermiso: number): boolean {
    return this.permisosSeleccionados.has(idpermiso);
  }

  togglePermiso(idpermiso: number): void {
    const permiso = this.permisos.find(p => p.idpermiso === idpermiso);

    if (this.permisosSeleccionados.has(idpermiso)) {
      this.permisosSeleccionados.delete(idpermiso);
      // Si se desmarca un permiso "padre" (ej: Reportería), sus sub-permisos
      // (ej: pestañas de Reportería) pierden sentido sin él
      if (permiso) {
        this.subPermisosDe(permiso).forEach(hijo => this.permisosSeleccionados.delete(hijo.idpermiso));
      }
    } else {
      this.permisosSeleccionados.add(idpermiso);
      // Al activar un permiso con sub-secciones, abrir el modal para configurarlas de una vez
      if (permiso && this.subPermisosDe(permiso).length > 0) {
        this.abrirModalPestanas(permiso);
      }
    }
  }

  abrirModalPestanas(permiso: Permiso): void {
    this.permisoEnModal = permiso;
    this.mostrarModalPestanas = true;
  }

  cerrarModalPestanas(): void {
    this.mostrarModalPestanas = false;
    this.permisoEnModal = null;
  }

  /** Permisos de nivel superior (sin contar los que son sub-secciones de otro permiso) */
  get permisosPrincipales(): Permiso[] {
    return this.permisos.filter(p => !this.esSubPermiso(p));
  }

  private esSubPermiso(permiso: Permiso): boolean {
    return this.permisos.some(padre => padre.ruta !== permiso.ruta && permiso.ruta.startsWith(padre.ruta + '-'));
  }

  /** Sub-secciones de un permiso (ej: pestañas dentro de Reportería) */
  subPermisosDe(permiso: Permiso): Permiso[] {
    return this.permisos.filter(p => p.ruta.startsWith(permiso.ruta + '-'));
  }

  /** Nombre corto del sub-permiso, sin repetir el prefijo del padre (ej: "Reportería: Inventario" -> "Inventario") */
  nombreSubPermiso(hijo: Permiso): string {
    const partes = hijo.nombre.split(':');
    return partes.length > 1 ? partes.slice(1).join(':').trim() : hijo.nombre;
  }

  toggleTodos(marcar: boolean): void {
    if (marcar) {
      this.permisos.forEach(p => this.permisosSeleccionados.add(p.idpermiso));
    } else {
      this.permisosSeleccionados.clear();
    }
  }

  get todosSeleccionados(): boolean {
    return this.permisos.length > 0 &&
           this.permisos.every(p => this.permisosSeleccionados.has(p.idpermiso));
  }

  guardar(): void {
    if (!this.rolSeleccionado) return;
    this.guardando = true;

    const permisosIds = Array.from(this.permisosSeleccionados);

    this.permisoService.actualizarPermisosDeRol(this.rolSeleccionado.idrol, permisosIds).subscribe({
      next: () => {
        // Actualizar el rol en la lista local
        const idx = this.roles.findIndex(r => r.idrol === this.rolSeleccionado!.idrol);
        if (idx >= 0) this.roles[idx].permisosAsignados = permisosIds;

        // Limpiar caché para que el guard actualice los permisos del usuario
        this.permisoService.limpiarCache();

        this.alerta.alertaExito(`Permisos de "${this.rolSeleccionado!.nombre}" actualizados`);
        this.guardando = false;
      },
      error: () => {
        this.alerta.alertaError('Error al guardar los permisos');
        this.guardando = false;
      }
    });
  }

  toggleSidebarMobile(): void { this.sidebarVisible = !this.sidebarVisible; }
  onSidebarToggle(v: boolean): void { this.sidebarVisible = v; }

  volver(): void { this.router.navigate(['/menu']); }
}
