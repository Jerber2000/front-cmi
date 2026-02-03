import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { PerfilService } from '../../services/perfil.service';
import { Subscription } from 'rxjs';

export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
  roles?: number[];
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [CommonModule, HasRoleDirective],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isExpanded: boolean = true;
  @Input() userInfo: { name: string; avatar?: string | null } = { name: 'Usuario' }; // ✅ Permitir null
  @Input() menuItems: MenuItem[] = [];
  @Input() footerText: string = '© CMI - Clinicas Municipales Inclusivas. Todos los derechos reservados.';

  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() menuItemClick = new EventEmitter<MenuItem>();

  private perfilSubscription?: Subscription;

  defaultMenuItems: MenuItem[] = [
    {
      label: 'Gestión de usuarios',
      icon: 'fas fa-users',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Usuarios', route: '/usuario', roles: [1,4,7] } ,
        { label: 'Perfiles', route: '/perfil', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] } 
      ]
    },
    {
      label: 'Gestión de Pacientes',
      icon: 'fas fa-hospital-user',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Pacientes', route: '/pacientes', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Expedientes', route: '/expedientes', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Referidos', route: '/referidos', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
      ]
    },
    {
      label: 'Gestión Clinica',
      icon: 'fas fa-hospital',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Agenda', route: '/agenda', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Reporteria', route: '/reporteria', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Documentos', route: '/documentos', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Inventario', route: '/inventario', roles: [1,4,7,9] },
        { label: 'Salida Inventario', route: '/salida-inventario', roles: [1,4,7,9] }
      ]
    },
    {
      label: 'Cerrar Sesion',
      icon: 'fas fa-sign-out-alt',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Cerrar Sesion', route: '/logout/logout', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
      ]
    }
  ];

  constructor(
    private router: Router, 
    private authService: AuthService,
    private perfilService: PerfilService
  ){}

  ngOnInit(): void {
    // Suscribirse a cambios del perfil para actualizar avatar en tiempo real
    this.perfilSubscription = this.perfilService.perfil$.subscribe((usuario) => {
      if (usuario) {
        const updatedInfo = this.perfilService.obtenerInfoSidebar();
        // Solo actualizar si recibimos datos válidos
        if (updatedInfo && updatedInfo.name) {
          // ✅ Convertir null a undefined si es necesario
          this.userInfo = {
            name: updatedInfo.name,
            avatar: updatedInfo.avatar || undefined
          };
          console.log('📸 Sidebar - UserInfo actualizado:', this.userInfo);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
  }

  get currentMenuItems(): MenuItem[] {
    return this.menuItems.length > 0 ? this.menuItems : this.defaultMenuItems;
  }

  onToggleSidebar() {
    this.isExpanded = !this.isExpanded;
    this.toggleSidebar.emit(this.isExpanded);
  }

  onMenuItemClick(item: MenuItem) {
    if (item.children && item.children.length > 0) {
      item.expanded = !item.expanded;
    } else if (item.route) {
      this.router.navigate([item.route]);
    }
    this.menuItemClick.emit(item);
  }

  onSubMenuItemClick(item: MenuItem) {
    if (item.label === 'Cerrar Sesion') {
      this.authService.logout();
    } else if (item.route) {
      this.router.navigate([item.route]);
      this.menuItemClick.emit(item);
    } else {
      this.menuItemClick.emit(item);
    }
  }

  onUserNameClick() {
    this.router.navigate(['/menu']);
  }
}