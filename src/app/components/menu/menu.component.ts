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

// Interface para módulos recomendados
interface ModuloRecomendado {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  color: string;
  roles: number[];
}

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
  roles: number[];
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
  modulosRecomendados: ModuloRecomendado[] = [];
  modulosPrincipales: ModuloPrincipal[] = [];
  cargando = true;
  
  private welcomeSubscription?: Subscription;
  private perfilSubscription?: Subscription;

  // Mapeo de roles
  private readonly rolesMap: { [key: number]: string } = {
    1: 'Administrador del Sistema',
    2: 'Médico General',
    3: 'Enfermera',
    4: 'Administrador de Clínica',
    5: 'Director Médico',
    6: 'Fisioterapeuta',
    7: 'Psicólogo',
    8: 'Contador',
    9: 'Encargado de Inventario',
    10: 'Técnico de Laboratorio',
    11: 'Trabajador Social',
    12: 'Farmacéutico',
    13: 'Nutricionista',
    14: 'Asistente Médico',
    15: 'Educador Especial',
    16: 'Terapeuta del Lenguaje'
  };

  // Rutas permitidas cargadas desde BD para filtrar las tarjetas del menú
  private rutasPermitidas: string[] = [];
  private usarFallbackRoles = false;

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

    // Fallback: si la API falló, usar los roles hardcodeados del módulo
    if (this.usarFallbackRoles) {
      return this.authService.hasRole(modulo.roles);
    }

    // Sin permisos cargados aún → ocultar
    if (!this.rutasPermitidas.length) return false;

    return this.rutasPermitidas.includes(ruta);
  }

  ngOnInit() {
    // Cargar rutas permitidas para filtrar módulos del menú dinámicamente
    this.permisoService.obtenerMisRutas().subscribe({
      next: rutas => {
        // null = API falló → usar roles hardcodeados del módulo
        this.rutasPermitidas = rutas ?? [];
        this.usarFallbackRoles = rutas === null;
      },
      error: () => {
        this.rutasPermitidas = [];
        this.usarFallbackRoles = true;
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
        ruta: '/pacientes',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Expedientes Médicos',
        descripcion: 'Historiales clínicos completos, diagnósticos y seguimiento médico integral',
        icono: 'fas fa-folder',
        iconoBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        ruta: '/expedientes',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Referencias Médicas',
        descripcion: 'Gestión de referencias a especialistas y contrarreferencias',
        icono: 'fas fa-exchange-alt',
        iconoBg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        ruta: '/referidos',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Mi Perfil',
        descripcion: 'Configuración personal, credenciales y preferencias del sistema',
        icono: 'fas fa-user-alt',
        iconoBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        ruta: '/perfil',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Agenda de Citas',
        descripcion: 'Programación y control de citas médicas y horarios',
        icono: 'fas fa-calendar-alt',
        iconoBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        ruta: '/agenda',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Gestión Documental',
        descripcion: 'Administración de documentos, certificados y archivos clínicos',
        icono: 'fas fa-info-circle',
        iconoBg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        ruta: '/documentos',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Gestión de Usuarios',
        descripcion: 'Administración de usuarios y permisos del sistema',
        icono: 'fas fa-users-cog',
        iconoBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ruta: '/usuario',
        roles: [1,4,7]
      },
      {
        titulo: 'Inventario',
        descripcion: 'Control de medicamentos y suministros médicos',
        icono: 'fas fa-boxes',
        iconoBg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        ruta: '/inventario',
        roles: [1,4,7,9]
      },
      {
        titulo: 'Salida de Inventario',
        descripcion: 'Registro de salidas y movimientos de inventario',
        icono: 'fas fa-box-open',
        iconoBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        ruta: '/salida-inventario',
        roles: [1,4,7,9]
      },
      {
        titulo: 'Reportería',
        descripcion: 'Reportes y estadísticas del sistema',
        icono: 'fas fa-chart-line',
        iconoBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        ruta: '/reporteria',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      }
    ];
  }

  /**
   * Carga el dashboard general
   */
  cargarDashboard(): void {
    this.reporteriaService.obtenerDashboard().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.cargando = false;
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
          
          this.modulosRecomendados = this.obtenerModulosRecomendados(this.usuarioActual.fkrol);
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

  /**
   * Obtiene módulos recomendados según el rol del usuario
   */
  private obtenerModulosRecomendados(idRol: number): ModuloRecomendado[] {
    const modulosPorRol: { [key: number]: ModuloRecomendado[] } = {
      // Administrador del Sistema
      1: [
        {
          titulo: 'Gestión de Usuarios',
          descripcion: 'Administra usuarios del sistema',
          icono: 'fas fa-users-cog',
          ruta: '/usuario',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,4,7]
        },
        {
          titulo: 'Reportería General',
          descripcion: 'Reportes y estadísticas del sistema',
          icono: 'fas fa-chart-line',
          ruta: '/reporteria',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Inventario General',
          descripcion: 'Control de inventario de todas las clínicas',
          icono: 'fas fa-boxes',
          ruta: '/inventario',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,4,7,9]
        }
      ],
      // Médico General
      2: [
        {
          titulo: 'Expedientes Médicos',
          descripcion: 'Gestiona historias clínicas',
          icono: 'fas fa-file-medical',
          ruta: '/expedientes',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Agenda de Consultas',
          descripcion: 'Programa y gestiona citas',
          icono: 'fas fa-calendar-alt',
          ruta: '/agenda',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Referencias Médicas',
          descripcion: 'Envía y recibe referencias',
          icono: 'fas fa-exchange-alt',
          ruta: '/referidos',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Enfermera
      3: [
        {
          titulo: 'Pacientes',
          descripcion: 'Registro y seguimiento de pacientes',
          icono: 'fas fa-users',
          ruta: '/pacientes',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Expedientes Médicos',
          descripcion: 'Consulta y actualiza expedientes',
          icono: 'fas fa-folder',
          ruta: '/expedientes',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Agenda',
          descripcion: 'Coordina citas y seguimientos',
          icono: 'fas fa-calendar-check',
          ruta: '/agenda',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Administrador de Clínica
      4: [
        {
          titulo: 'Gestión de Usuarios',
          descripcion: 'Administra personal de la clínica',
          icono: 'fas fa-users-cog',
          ruta: '/usuario',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,4,7]
        },
        {
          titulo: 'Inventario de Clínica',
          descripcion: 'Control de suministros y medicamentos',
          icono: 'fas fa-boxes',
          ruta: '/inventario',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,4,7,9]
        },
        {
          titulo: 'Reportería',
          descripcion: 'Reportes de la clínica',
          icono: 'fas fa-chart-bar',
          ruta: '/reporteria',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Director Médico
      5: [
        {
          titulo: 'Panel de Control',
          descripcion: 'Supervisión general del sistema',
          icono: 'fas fa-tachometer-alt',
          ruta: '/reporteria',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Gestión de Personal',
          descripcion: 'Administra el equipo médico',
          icono: 'fas fa-user-md',
          ruta: '/usuario',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,4,7]
        },
        {
          titulo: 'Referencias',
          descripcion: 'Supervisa referencias médicas',
          icono: 'fas fa-exchange-alt',
          ruta: '/referidos',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Fisioterapeuta
      6: [
        {
          titulo: 'Pacientes',
          descripcion: 'Gestión de pacientes en terapia',
          icono: 'fas fa-users',
          ruta: '/pacientes',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Expedientes',
          descripcion: 'Planes de tratamiento',
          icono: 'fas fa-file-medical',
          ruta: '/expedientes',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Agenda',
          descripcion: 'Sesiones de fisioterapia',
          icono: 'fas fa-calendar-alt',
          ruta: '/agenda',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Psicólogo
      7: [
        {
          titulo: 'Pacientes',
          descripcion: 'Gestión de pacientes',
          icono: 'fas fa-users',
          ruta: '/pacientes',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Expedientes Psicológicos',
          descripcion: 'Evaluaciones y tratamientos',
          icono: 'fas fa-file-medical',
          ruta: '/expedientes',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Agenda de Consultas',
          descripcion: 'Sesiones psicológicas',
          icono: 'fas fa-calendar-alt',
          ruta: '/agenda',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Contador
      8: [
        {
          titulo: 'Reportería Financiera',
          descripcion: 'Informes contables',
          icono: 'fas fa-chart-line',
          ruta: '/reporteria',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Inventario',
          descripcion: 'Control de activos',
          icono: 'fas fa-boxes',
          ruta: '/inventario',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,4,7,9]
        },
        {
          titulo: 'Documentos',
          descripcion: 'Gestión documental',
          icono: 'fas fa-file-invoice-dollar',
          ruta: '/documentos',
          color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Encargado de Inventario
      9: [
        {
          titulo: 'Inventario',
          descripcion: 'Gestión completa de inventario',
          icono: 'fas fa-warehouse',
          ruta: '/inventario',
          color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          roles: [1,4,7,9]
        },
        {
          titulo: 'Salida de Inventario',
          descripcion: 'Registra salidas y movimientos',
          icono: 'fas fa-box-open',
          ruta: '/salida-inventario',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,4,7,9]
        },
        {
          titulo: 'Reportes de Stock',
          descripcion: 'Estadísticas de inventario',
          icono: 'fas fa-chart-pie',
          ruta: '/reporteria',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ],
      // Nutricionista
      13: [
        {
          titulo: 'Pacientes',
          descripcion: 'Gestión de pacientes',
          icono: 'fas fa-users',
          ruta: '/pacientes',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Planes Nutricionales',
          descripcion: 'Evaluaciones y planes dietéticos',
          icono: 'fas fa-apple-alt',
          ruta: '/expedientes',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        },
        {
          titulo: 'Agenda',
          descripcion: 'Consultas nutricionales',
          icono: 'fas fa-calendar-alt',
          ruta: '/agenda',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
        }
      ]
    };

    // Módulos por defecto si el rol no está definido
    const modulosDefault: ModuloRecomendado[] = [
      {
        titulo: 'Pacientes',
        descripcion: 'Gestión de pacientes',
        icono: 'fas fa-users',
        ruta: '/pacientes',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Expedientes',
        descripcion: 'Historiales médicos',
        icono: 'fas fa-folder',
        ruta: '/expedientes',
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      },
      {
        titulo: 'Mi Perfil',
        descripcion: 'Configuración personal',
        icono: 'fas fa-user-alt',
        ruta: '/perfil',
        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
      }
    ];

    return modulosPorRol[idRol] || modulosDefault;
  }

  /**
   * Obtiene el nombre del rol según su ID
   */
  obtenerNombreRol(idRol: number): string {
    return this.rolesMap[idRol] || 'Usuario';
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