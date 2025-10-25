// sidebar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';

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
export class SidebarComponent {
  @Input() isExpanded: boolean = true;
  @Input() userInfo: { name: string; avatar?: string } = { name: 'Usuario' };
  @Input() menuItems: MenuItem[] = [];
  @Input() footerText: string = '© 2025 CMI - Clinicas Municipales Inclusivas. Todos los derechos reservados.';

  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() menuItemClick = new EventEmitter<MenuItem>();

  defaultMenuItems: MenuItem[] = [
    {
      label: 'Gestión de usuarios',
      icon: 'fas fa-users',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Usuarios', route: '/usuario', roles: [1,5,8] } ,
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
        { label: 'Inventario', route: '/inventario', roles: [1,5,10] },
        { label: 'Salida Inventario', route: '/salida-inventario', roles: [1,5,10] },
        { label: 'Administración', route: '/administracion', roles: [1,5,8] },
        { label: 'Educación Inclusiva', route: '/educacion-inclusiva', roles: [1,5,15,16] },
        { label: 'Fisioterapia', route: '/fisioterapia', roles: [1,5,6,14] },
        { label: 'Medicina General', route: '/medicina-general', roles: [1,2,3,5,14] },
        { label: 'Nutrición', route: '/nutricion', roles: [1,5,13,14] },
        { label: 'Psicología', route: '/psicologia', roles: [1,5,7,11] }
      ]
    },
    {
      label: 'Acerca de',
      icon: 'fas fa-info-circle',
      roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      children: [
        { label: 'Quienes somos', route: '/acerca/nosotros', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Misión y visión', route: '/acerca/mision', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
        { label: 'Contáctanos', route: '/acerca/contacto', roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] }
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
    private authService: AuthService
  ){}

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
      this.authService.logout(); // Usar tu servicio existente
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
