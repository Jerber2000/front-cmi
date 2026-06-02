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
  sidebarExpanded = false;
  sidebarVisible = false;

  permisos: Permiso[] = [];
  roles: RolConPermisos[] = [];

  rolSeleccionado: RolConPermisos | null = null;
  permisosSeleccionados: Set<number> = new Set();

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
  }

  tienePermiso(idpermiso: number): boolean {
    return this.permisosSeleccionados.has(idpermiso);
  }

  togglePermiso(idpermiso: number): void {
    if (this.permisosSeleccionados.has(idpermiso)) {
      this.permisosSeleccionados.delete(idpermiso);
    } else {
      this.permisosSeleccionados.add(idpermiso);
    }
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
