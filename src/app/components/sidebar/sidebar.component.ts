import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

import { PerfilService } from '../../services/perfil.service';
import { ArchivoService } from '../../services/archivo.service';
import { PermisoService } from '../../services/permiso.service';
import { Subscription } from 'rxjs';

// Rutas visibles para cualquier usuario autenticado (sin necesidad de permiso en BD)
const RUTAS_SIEMPRE_VISIBLES = ['perfil', 'logout'];
// Roles que tienen acceso total (bypass DB)
// Por NOMBRE, no por ID: el idrol de cada uno cambia entre entornos (local/produccion)
const ROLES_SUPERADMIN = ['Administrador', 'Sistemas'];

export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [CommonModule],
})
export class SidebarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isExpanded: boolean = false; // Sidebar cerrado por defecto
  @Input() userInfo: { name: string; avatar?: string | null } = { name: 'Usuario' }; 
  @Input() menuItems: MenuItem[] = [];
  @Input() footerText: string = '© CMI - Clinicas Municipales Inclusivas. Todos los derechos reservados.';

  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() menuItemClick = new EventEmitter<MenuItem>();

  private perfilSubscription?: Subscription;
  private userInfoSubscription?: Subscription;

  defaultMenuItems: MenuItem[] = [
    {
      label: 'Gestión de usuarios',
      icon: 'fas fa-users',
      children: [
        { label: 'Usuarios', route: '/usuario' },
        { label: 'Perfiles', route: '/perfil' },
        { label: 'Permisos y Accesos', route: '/gestion-permisos' }
      ]
    },
    {
      label: 'Gestión de Pacientes',
      icon: 'fas fa-hospital-user',
      children: [
        { label: 'Pacientes', route: '/pacientes' },
        { label: 'Expedientes', route: '/expedientes' },
        { label: 'Referidos', route: '/referidos' }
    ]
  },
    {
      label: 'Gestión Clinica',
      icon: 'fas fa-hospital',
      children: [
        { label: 'Agenda', route: '/agenda' },
        { label: 'Reporteria', route: '/reporteria' },
        { label: 'Documentos', route: '/documentos' },
        { label: 'Inventario', route: '/inventario' },
        { label: 'Salida Inventario', route: '/salida-inventario' }
      ]
    },
    {
      label: 'Cerrar Sesion',
      icon: 'fas fa-sign-out-alt',
      children: [
        { label: 'Cerrar Sesion', route: '/logout/logout' }
      ]
    }
  ];

  // Rutas permitidas cargadas desde BD
  rutasPermitidas: string[] = [];
  permisosListos = false;
  private permisosSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private perfilService: PerfilService,
    private archivoService: ArchivoService,
    private permisoService: PermisoService
  ){}

  ngOnInit(): void {
    // Cargar permisos desde BD (o caché) para filtrar el menú dinámicamente
    this.permisosSubscription = this.permisoService.obtenerMisRutas().subscribe({
      next: rutas => {
        // Si la API falla, rutas viene null — se trata igual que "sin permisos" (no se hardcodea nada)
        this.rutasPermitidas = rutas ?? [];
        this.permisosListos = true;
      },
      error: () => {
        this.rutasPermitidas = [];
        this.permisosListos = true;
      }
    });

    // Cargar userInfo desde localStorage como valor inicial
    this.cargarInfoDelStorage();

    // Refrescar perfil desde backend al abrir sidebar
    this.perfilService.refrescarPerfil().subscribe({
      next: (usuario) => {
        const updatedInfo = this.perfilService.obtenerInfoSidebar();
        if (updatedInfo && updatedInfo.name) {
          this.userInfo = {
            name: updatedInfo.name,
            avatar: updatedInfo.avatar || undefined
          };
        }
      },
      error: () => {
        // Si falla, usar datos locales
        this.cargarInfoDelStorage();
      }
    });

    // Suscribirse a cambios de perfil para actualizar avatar en tiempo real
    this.perfilSubscription = this.perfilService.perfil$.subscribe((usuario) => {
      if (usuario) {
        const updatedInfo = this.perfilService.obtenerInfoSidebar();
        if (updatedInfo && updatedInfo.name) {
          this.userInfo = {
            name: updatedInfo.name,
            avatar: updatedInfo.avatar || undefined
          };
        }
      }
    });

    // Suscribirse a cambios de usuario logueado (para detectar cambios de login)
    this.userInfoSubscription = this.authService.userInfo$.subscribe((userInfo) => {
      if (userInfo && userInfo.name) {
        this.userInfo = {
          name: userInfo.name,
          avatar: userInfo.avatar || undefined
        };
      }
    });
  }

  /**
   * Detectar cambios en el @Input userInfo del componente padre
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && changes['userInfo'].currentValue) {
      const newUserInfo = changes['userInfo'].currentValue;
      if (newUserInfo.name && newUserInfo.name !== 'Usuario') {
        this.userInfo = newUserInfo;
      }
    }
  }

  /**
   * Cargar información del usuario desde localStorage
   */
  private cargarInfoDelStorage(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        const avatarUrl = usuario.rutafotoperfil 
          ? this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil)
          : null;
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Usuario',
          avatar: avatarUrl || undefined
        };
      }
    } catch (error) {
      // Error al cargar información del storage
    }
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
    this.userInfoSubscription?.unsubscribe();
    this.permisosSubscription?.unsubscribe();
  }

  // ─── Visibilidad dinámica basada en BD ─────────────────────────────────────

  /** Extrae el segmento de ruta limpio: '/salida-inventario' → 'salida-inventario' */
  private rutaLimpia(route: string): string {
    return route.replace(/^\//, '').split('?')[0].split('/')[0];
  }

  /** El usuario tiene acceso total (superadmin o permisos cargados con '*') */
  private esAccesoTotal(): boolean {
    const rolNombre = this.authService.userRoleName;
    return (rolNombre !== null && ROLES_SUPERADMIN.includes(rolNombre)) ||
           this.rutasPermitidas.includes('*');
  }

  /** Determina si un sub-item del menú debe mostrarse */
  puedeVerSubItem(subItem: MenuItem): boolean {
    if (!this.permisosListos) return false;
    if (!subItem.route) return true;

    const ruta = this.rutaLimpia(subItem.route);

    // Siempre visibles para cualquier usuario autenticado
    if (RUTAS_SIEMPRE_VISIBLES.some(r => ruta.startsWith(r))) return true;

    // Superadmin: acceso total
    if (this.esAccesoTotal()) return true;

    // Validación desde BD — único origen de verdad
    return this.rutasPermitidas.includes(ruta);
  }

  /** Determina si un item padre debe mostrarse (visible si al menos 1 hijo lo es) */
  puedeVerItem(item: MenuItem): boolean {
    if (!this.permisosListos) return false;
    if (this.esAccesoTotal()) return true;

    if (!item.children || item.children.length === 0) {
      return item.route ? this.puedeVerSubItem(item) : true;
    }

    return item.children.some(child => this.puedeVerSubItem(child));
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
      //  Cerrar sidebar inmediatamente
      this.isExpanded = false;
      this.toggleSidebar.emit(false);
      
      // Navegar después de cerrar
      setTimeout(() => {
        this.router.navigate([item.route]);
      }, 100);
    }
    this.menuItemClick.emit(item);
  }

  onSubMenuItemClick(item: MenuItem) {
    if (item.label === 'Cerrar Sesion') {
      this.authService.logout();
    } else if (item.route) {
      //  Cerrar sidebar inmediatamente
      this.isExpanded = false;
      this.toggleSidebar.emit(false);
      
      // Navegar después de cerrar
      setTimeout(() => {
        this.router.navigate([item.route]);
      }, 100);
      
      this.menuItemClick.emit(item);
    } else {
      this.menuItemClick.emit(item);
    }
  }

  onUserNameClick() {
    this.router.navigate(['/menu']);
  }
}