import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent, MenuItem as SidebarMenuItem } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { ArchivoService } from '../../services/archivo.service';
import { ReporteriaService, DashboardData } from '../../services/reporteria.service';

import { PerfilService } from '../../services/perfil.service';
import { PermisoService } from '../../services/permiso.service';

// Interface para módulos principales
interface ModuloPrincipal {
  titulo: string;
  descripcion: string;
  icono: string;
  iconoBg: string;
  ruta: string;
  stats?: {
    icono: string;
    texto: string;
  }[];
}

// Interface para información del usuario
interface UsuarioInfo {
  idusuario: number;
  nombres: string;
  apellidos: string;
  fkrol: number;
  rutafotoperfil?: string;
  clinica?: {
    idclinica: number;
    nombreclinica: string;
  };
  fkclinica?: number;
  rol?: {
    idrol: number;
    nombre: string;
  };
}

@Component({
  standalone: true,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  imports: [CommonModule, SidebarComponent]
})
export class MenuComponent implements OnInit, OnDestroy, AfterViewInit {
  sidebarVisible = false;
  sidebarExpanded = true;
  userInfo: any = {};
  showWelcomeMessage = false;
  fechaActual = new Date();
  
  // Datos del dashboard
  dashboardData: DashboardData | null = null;
  usuarioActual: UsuarioInfo | null = null;
  mensajeBienvenida = '';
  modulosPrincipales: ModuloPrincipal[] = [];
  cargando = true;
  
  private welcomeSubscription?: Subscription;
  private perfilSubscription?: Subscription;

  // Rutas permitidas cargadas desde BD para filtrar las tarjetas del menú
  private rutasPermitidas: string[] = [];

  constructor(
    private authService: AuthService,
    private archivoService: ArchivoService,
    private router: Router,
    private reporteriaService: ReporteriaService,
    private perfilService: PerfilService,
    private permisoService: PermisoService
  ) {}

  /** Devuelve true si el usuario tiene acceso al módulo según los permisos de BD */
  puedeVerModulo(modulo: ModuloPrincipal): boolean {
    // Superadmin: siempre visible
    if (this.rutasPermitidas.includes('*')) return true;

    const ruta = modulo.ruta.replace(/^\//, '').split('/')[0];

    // Perfil siempre visible para cualquier usuario autenticado
    if (ruta === 'perfil') return true;

    // Sin permisos cargados aún (o la API falló) → ocultar
    if (!this.rutasPermitidas.length) return false;

    return this.rutasPermitidas.includes(ruta);
  }

  ngOnInit() {
    // Cargar rutas permitidas para filtrar módulos del menú dinámicamente
    this.permisoService.obtenerMisRutas().subscribe({
      next: rutas => {
        this.rutasPermitidas = rutas ?? [];
      },
      error: () => {
        this.rutasPermitidas = [];
      }
    });

    // Siempre refrescar el perfil desde el backend al iniciar el menú
    this.perfilService.refrescarPerfil().subscribe({
      next: (usuario) => {
        // Actualizar localStorage y userInfo
        localStorage.setItem('usuario', JSON.stringify(usuario));
        this.userInfo = this.perfilService.obtenerInfoSidebar();
        this.usuarioActual = usuario;
        this.cargarDatosPersonalizados();
        this.cargarDashboard();
        this.inicializarModulosPrincipales();
      },
      error: () => {
        // Si falla, usar datos locales pero limpiar foto
        this.loadUserInfo();
        this.cargarDatosPersonalizados();
        this.cargarDashboard();
        this.inicializarModulosPrincipales();
      }
    });

    // Suscribirse a cambios del perfil
    this.perfilSubscription = this.perfilService.perfil$.subscribe((usuario) => {
      if (usuario) {
        this.userInfo = this.perfilService.obtenerInfoSidebar();
      }
    });

    this.welcomeSubscription = this.authService.showWelcome$.subscribe(() => {
      this.showWelcomeMessage = true;
      setTimeout(() => {
        this.hideWelcomeMessage();
      }, 5000);
    });
  }

  ngOnDestroy() {
    this.welcomeSubscription?.unsubscribe();
    this.perfilSubscription?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.detectSidebarState();
  }

  detectSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
        this.sidebarExpanded = sidebar.classList.contains('expanded');
      }
    };

    setTimeout(checkSidebar, 100);

    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('.sidebar-container');
    
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  /**
   * Inicializar módulos principales con permisos
   */
  private inicializarModulosPrincipales(): void {
    this.modulosPrincipales = [
      {
        titulo: 'Gestión de Pacientes',
        descripcion: 'Administra el registro completo de pacientes e información demográfica',
        icono: 'fas fa-users',
        iconoBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ruta: '/pacientes'
      },
      {
        titulo: 'Expedientes Médicos',
        descripcion: 'Historiales clínicos completos, diagnósticos y seguimiento médico integral',
        icono: 'fas fa-folder',
        iconoBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        ruta: '/expedientes'
      },
      {
        titulo: 'Referencias Médicas',
        descripcion: 'Gestión de referencias a especialistas y contrarreferencias',
        icono: 'fas fa-exchange-alt',
        iconoBg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        ruta: '/referidos'
      },
      {
        titulo: 'Mi Perfil',
        descripcion: 'Configuración personal, credenciales y preferencias del sistema',
        icono: 'fas fa-user-alt',
        iconoBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        ruta: '/perfil'
      },
      {
        titulo: 'Agenda de Citas',
        descripcion: 'Programación y control de citas médicas y horarios',
        icono: 'fas fa-calendar-alt',
        iconoBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        ruta: '/agenda'
      },
      {
        titulo: 'Gestión Documental',
        descripcion: 'Administración de documentos, certificados y archivos clínicos',
        icono: 'fas fa-info-circle',
        iconoBg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        ruta: '/documentos'
      },
      {
        titulo: 'Gestión de Usuarios',
        descripcion: 'Administración de usuarios y permisos del sistema',
        icono: 'fas fa-users-cog',
        iconoBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ruta: '/usuario'
      },
      {
        titulo: 'Inventario',
        descripcion: 'Control de medicamentos y suministros médicos',
        icono: 'fas fa-boxes',
        iconoBg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        ruta: '/inventario'
      },
      {
        titulo: 'Salida de Inventario',
        descripcion: 'Registro de salidas y movimientos de inventario',
        icono: 'fas fa-box-open',
        iconoBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        ruta: '/salida-inventario'
      },
      {
        titulo: 'Reportería',
        descripcion: 'Reportes y estadísticas del sistema',
        icono: 'fas fa-chart-line',
        iconoBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        ruta: '/reporteria'
      }
    ];
  }

  /**
   * Carga el dashboard general
   */
  cargarDashboard(): void {
    // Solo pedir el dashboard de Reportería si el rol realmente tiene ese permiso;
    // si no, ni se intenta la llamada (evita el toast de "no tienes permisos" al entrar al menú)
    this.permisoService.obtenerMisRutas().subscribe({
      next: (rutas) => {
        const tieneAcceso = rutas === null || rutas.includes('*') || rutas.includes('reporteria');
        if (!tieneAcceso) {
          this.cargando = false;
          return;
        }
        this.reporteriaService.obtenerDashboard().subscribe({
          next: (data) => {
            this.dashboardData = data;
            this.cargando = false;
          },
          error: () => {
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  /**
   * Carga datos personalizados del usuario
   */
  private cargarDatosPersonalizados(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        this.usuarioActual = JSON.parse(usuarioData);
        
        if (this.usuarioActual) {
          this.mensajeBienvenida = this.generarMensajeBienvenida(
            this.usuarioActual.fkrol,
            this.usuarioActual.nombres
          );
        }
      }
    } catch (error) {
    }
  }

  /**
   * Genera mensaje de bienvenida personalizado según el rol
   */
  private generarMensajeBienvenida(idRol: number, _nombre: string): string {
    const mensajes: { [key: number]: string } = {
      1: `Tienes acceso completo al sistema. Administra usuarios, clínicas y configuraciones.`,
      2: `Gestiona expedientes médicos, consultas y referencias de tus pacientes.`,
      3: `Apoya en la atención médica, registra signos vitales y gestiona el seguimiento de pacientes.`,
      4: `Administra las operaciones de tu clínica y supervisa al personal asignado.`,
      5: `Supervisa las operaciones médicas y coordina las actividades del personal clínico.`,
      6: `Gestiona terapias de rehabilitación y planes de tratamiento fisioterapéutico.`,
      7: `Registra evaluaciones psicológicas y planes de tratamiento para tus pacientes.`,
      8: `Gestiona la contabilidad y finanzas de las clínicas del sistema.`,
      9: `Controla el inventario médico, medicamentos y suministros de la clínica.`,
      10: `Administra resultados de laboratorio y estudios diagnósticos.`,
      11: `Realiza evaluaciones sociales y coordina apoyo comunitario para pacientes.`,
      12: `Gestiona la dispensación de medicamentos y control farmacéutico.`,
      13: `Elabora planes nutricionales y seguimiento dietético de pacientes.`,
      14: `Asiste en procedimientos médicos y gestión de expedientes clínicos.`,
      15: `Desarrolla programas de educación especial adaptados para pacientes.`,
      16: `Evalúa y trata trastornos del lenguaje y comunicación.`
    };

    return mensajes[idRol] || 'Bienvenido al Sistema de Clínicas Municipales Inclusivas.';
  }


  hideWelcomeMessage(): void {
    this.showWelcomeMessage = false;
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  onSidebarMenuItemClick(item: SidebarMenuItem): void {
    if (item.route) {
      this.router.navigate([item.route]);
      
      if (window.innerWidth <= 768) {
        this.sidebarVisible = false;
      }
    }
  }

  onSidebarToggle(isExpanded: boolean): void {
    this.sidebarVisible = isExpanded;
  }

  navegarA(ruta: string): void {
    this.router.navigate([ruta]);
  }

  /**
   * Cargar información del usuario con imagen correcta
   */
  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        
        let avatarUrl = null;
        if (usuario.rutafotoperfil) {
          avatarUrl = this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil);
        }
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: avatarUrl
        };
      } 
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
      this.userInfo = {
        name: 'Usuario',
        avatar: null
      };
    }
  }
}