// gestionclinica.service.ts
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';

// Interfaces mejoradas
export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  route: string;
  color: string;
  notification?: number;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  route?: string;
  permissions?: string[];
  isVisible?: boolean;
}

export interface ModuleStats {
  [key: string]: number | string;
}

export interface ModuleNotifications {
  [key: string]: number;
}

export interface DashboardConfig {
  title: string;
  subtitle: string;
  modules: ModuleConfig[];
  quickActions: QuickAction[];
  notifications: ModuleNotifications;
  stats: ModuleStats;
  theme?: string;
  layout?: 'grid' | 'list';
}

export type ModuleType = 'administracion' | 'educacion-inclusiva' | 'fisioterapia' | 
                        'medicina-general' | 'nutricion' | 'psicologia';

@Injectable({
  providedIn: 'root'
})
export class GestionClinicaService {
  
  private currentModuleSubject = new BehaviorSubject<ModuleType>('administracion');
  private dashboardConfigSubject = new BehaviorSubject<DashboardConfig | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  public currentModule$ = this.currentModuleSubject.asObservable();
  public dashboardConfig$ = this.dashboardConfigSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  // Configuraciones base para cada módulo
  private readonly moduleConfigurations: Record<ModuleType, DashboardConfig> = {
    'administracion': {
      title: 'ADMINISTRACIÓN',
      subtitle: 'Panel de administración y control del sistema',
      theme: 'admin',
      layout: 'grid',
      modules: [
        { 
          id: 'pacientes', 
          name: 'Pacientes', 
          icon: 'fas fa-users', 
          route: '/pacientes', 
          color: 'patients', 
          notification: 0,
          description: 'Gestión de pacientes',
          isActive: true
        },
        { 
          id: 'usuarios', 
          name: 'Médicos', 
          icon: 'fas fa-user-md', 
          route: '/usuario', 
          color: 'doctors',
          description: 'Gestión de personal médico',
          isActive: true
        },
        { 
          id: 'calendario', 
          name: 'Calendario', 
          icon: 'fas fa-calendar-alt', 
          route: '/calendario', 
          color: 'calendar', 
          notification: 0,
          description: 'Programación de citas',
          isActive: true
        },
        { 
          id: 'expedientes', 
          name: 'Expedientes', 
          icon: 'fas fa-folder-medical', 
          route: '/expedientes', 
          color: 'exchange',
          description: 'Historiales médicos',
          isActive: true
        },
        { 
          id: 'reportes', 
          name: 'Reportes', 
          icon: 'fas fa-clipboard-list', 
          route: '/reportes', 
          color: 'reports',
          description: 'Informes y estadísticas',
          isActive: true
        },
        { 
          id: 'configuracion', 
          name: 'Configuración', 
          icon: 'fas fa-cogs', 
          route: '/configuracion', 
          color: 'settings',
          description: 'Configuración del sistema',
          isActive: true,
          permissions: ['admin']
        },
        { 
          id: 'estadisticas', 
          name: 'Estadísticas', 
          icon: 'fas fa-chart-bar', 
          route: '/estadisticas', 
          color: 'stats',
          description: 'Análisis de datos',
          isActive: true
        },
        { 
          id: 'documentos', 
          name: 'Documentos', 
          icon: 'fas fa-file-pdf', 
          route: '/documentos', 
          color: 'pdf',
          description: 'Gestión documental',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nuevo-paciente', 
          label: 'Nuevo Paciente', 
          icon: 'fas fa-plus', 
          action: 'nuevo-paciente',
          route: '/pacientes/nuevo',
          isVisible: true
        },
        { 
          id: 'cita-urgente', 
          label: 'Cita Urgente', 
          icon: 'fas fa-clock', 
          action: 'cita-urgente',
          route: '/calendario/urgente',
          isVisible: true
        },
        { 
          id: 'reporte-diario', 
          label: 'Reporte Diario', 
          icon: 'fas fa-chart-line', 
          action: 'reporte-diario',
          route: '/reportes/diario',
          isVisible: true
        }
      ],
      notifications: { 
        pacientes: 0, 
        citas: 0, 
        reportes: 0, 
        mensajes: 0 
      },
      stats: { 
        pacientesHoy: 0, 
        citasPendientes: 0, 
        reportesGenerados: 0 
      }
    },

    'educacion-inclusiva': {
      title: 'EDUCACIÓN INCLUSIVA',
      subtitle: 'Gestión de programas educativos inclusivos',
      theme: 'education',
      layout: 'grid',
      modules: [
        { 
          id: 'estudiantes', 
          name: 'Estudiantes', 
          icon: 'fas fa-user-graduate', 
          route: '/educacion/estudiantes', 
          color: 'patients',
          description: 'Gestión de estudiantes',
          isActive: true
        },
        { 
          id: 'programas', 
          name: 'Programas', 
          icon: 'fas fa-book-open', 
          route: '/educacion/programas', 
          color: 'doctors',
          description: 'Programas educativos',
          isActive: true
        },
        { 
          id: 'evaluaciones', 
          name: 'Evaluaciones', 
          icon: 'fas fa-clipboard-check', 
          route: '/educacion/evaluaciones', 
          color: 'calendar',
          description: 'Evaluaciones académicas',
          isActive: true
        },
        { 
          id: 'recursos', 
          name: 'Recursos', 
          icon: 'fas fa-tools', 
          route: '/educacion/recursos', 
          color: 'exchange',
          description: 'Materiales educativos',
          isActive: true
        },
        { 
          id: 'talleres', 
          name: 'Talleres', 
          icon: 'fas fa-chalkboard-teacher', 
          route: '/educacion/talleres', 
          color: 'reports',
          description: 'Talleres y capacitaciones',
          isActive: true
        },
        { 
          id: 'seguimiento', 
          name: 'Seguimiento', 
          icon: 'fas fa-chart-line', 
          route: '/educacion/seguimiento', 
          color: 'stats',
          description: 'Seguimiento académico',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nuevo-estudiante', 
          label: 'Nuevo Estudiante', 
          icon: 'fas fa-user-plus', 
          action: 'nuevo-estudiante',
          route: '/educacion/estudiantes/nuevo',
          isVisible: true
        },
        { 
          id: 'programar-taller', 
          label: 'Programar Taller', 
          icon: 'fas fa-calendar-plus', 
          action: 'programar-taller',
          route: '/educacion/talleres/nuevo',
          isVisible: true
        },
        { 
          id: 'reporte-progreso', 
          label: 'Reporte de Progreso', 
          icon: 'fas fa-chart-bar', 
          action: 'reporte-progreso',
          route: '/educacion/reportes',
          isVisible: true
        }
      ],
      notifications: { 
        estudiantes: 0, 
        evaluaciones: 0, 
        talleres: 0 
      },
      stats: { 
        estudiantesActivos: 0, 
        talleresHoy: 0, 
        evaluacionesPendientes: 0 
      }
    },

    'fisioterapia': {
      title: 'FISIOTERAPIA',
      subtitle: 'Gestión de servicios de fisioterapia y rehabilitación',
      theme: 'therapy',
      layout: 'grid',
      modules: [
        { 
          id: 'pacientes-fisio', 
          name: 'Pacientes', 
          icon: 'fas fa-walking', 
          route: '/fisioterapia/pacientes', 
          color: 'patients',
          description: 'Pacientes en rehabilitación',
          isActive: true
        },
        { 
          id: 'terapias', 
          name: 'Terapias', 
          icon: 'fas fa-dumbbell', 
          route: '/fisioterapia/terapias', 
          color: 'doctors',
          description: 'Sesiones de terapia',
          isActive: true
        },
        { 
          id: 'citas-fisio', 
          name: 'Citas', 
          icon: 'fas fa-calendar-check', 
          route: '/fisioterapia/citas', 
          color: 'calendar',
          description: 'Programación de citas',
          isActive: true
        },
        { 
          id: 'equipos', 
          name: 'Equipos', 
          icon: 'fas fa-tools', 
          route: '/fisioterapia/equipos', 
          color: 'exchange',
          description: 'Equipos de rehabilitación',
          isActive: true
        },
        { 
          id: 'ejercicios', 
          name: 'Ejercicios', 
          icon: 'fas fa-running', 
          route: '/fisioterapia/ejercicios', 
          color: 'reports',
          description: 'Rutinas de ejercicios',
          isActive: true
        },
        { 
          id: 'progreso', 
          name: 'Progreso', 
          icon: 'fas fa-chart-line', 
          route: '/fisioterapia/progreso', 
          color: 'stats',
          description: 'Seguimiento de progreso',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nueva-sesion', 
          label: 'Nueva Sesión', 
          icon: 'fas fa-plus', 
          action: 'nueva-sesion',
          route: '/fisioterapia/sesiones/nueva',
          isVisible: true
        },
        { 
          id: 'evaluar-paciente', 
          label: 'Evaluar Paciente', 
          icon: 'fas fa-stethoscope', 
          action: 'evaluar-paciente',
          route: '/fisioterapia/evaluaciones',
          isVisible: true
        },
        { 
          id: 'plan-ejercicios', 
          label: 'Plan de Ejercicios', 
          icon: 'fas fa-list-alt', 
          action: 'plan-ejercicios',
          route: '/fisioterapia/planes',
          isVisible: true
        }
      ],
      notifications: { 
        citas: 0, 
        evaluaciones: 0, 
        seguimientos: 0 
      },
      stats: { 
        pacientesHoy: 0, 
        sesionesCompletadas: 0, 
        equiposDisponibles: 0 
      }
    },

    'medicina-general': {
      title: 'MEDICINA GENERAL',
      subtitle: 'Atención médica general y consultas',
      theme: 'medical',
      layout: 'grid',
      modules: [
        { 
          id: 'consultas', 
          name: 'Consultas', 
          icon: 'fas fa-stethoscope', 
          route: '/medicina/consultas', 
          color: 'patients',
          description: 'Consultas médicas',
          isActive: true
        },
        { 
          id: 'diagnosticos', 
          name: 'Diagnósticos', 
          icon: 'fas fa-diagnoses', 
          route: '/medicina/diagnosticos', 
          color: 'doctors',
          description: 'Diagnósticos médicos',
          isActive: true
        },
        { 
          id: 'recetas', 
          name: 'Recetas', 
          icon: 'fas fa-prescription', 
          route: '/medicina/recetas', 
          color: 'calendar',
          description: 'Recetas médicas',
          isActive: true
        },
        { 
          id: 'historiales', 
          name: 'Historiales', 
          icon: 'fas fa-file-medical-alt', 
          route: '/medicina/historiales', 
          color: 'exchange',
          description: 'Historiales clínicos',
          isActive: true
        },
        { 
          id: 'examenes', 
          name: 'Exámenes', 
          icon: 'fas fa-vial', 
          route: '/medicina/examenes', 
          color: 'reports',
          description: 'Exámenes médicos',
          isActive: true
        },
        { 
          id: 'seguimientos', 
          name: 'Seguimientos', 
          icon: 'fas fa-heartbeat', 
          route: '/medicina/seguimientos', 
          color: 'stats',
          description: 'Seguimiento de pacientes',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nueva-consulta', 
          label: 'Nueva Consulta', 
          icon: 'fas fa-plus', 
          action: 'nueva-consulta',
          route: '/medicina/consultas/nueva',
          isVisible: true
        },
        { 
          id: 'receta-rapida', 
          label: 'Receta Rápida', 
          icon: 'fas fa-prescription-bottle', 
          action: 'receta-rapida',
          route: '/medicina/recetas/nueva',
          isVisible: true
        },
        { 
          id: 'examen-urgente', 
          label: 'Examen Urgente', 
          icon: 'fas fa-exclamation-triangle', 
          action: 'examen-urgente',
          route: '/medicina/examenes/urgente',
          isVisible: true
        }
      ],
      notifications: { 
        consultas: 0, 
        recetas: 0, 
        examenes: 0 
      },
      stats: { 
        consultasHoy: 0, 
        pacientesAtendidos: 0, 
        recetasEmitidas: 0 
      }
    },

    'nutricion': {
      title: 'NUTRICIÓN',
      subtitle: 'Servicios de nutrición y dietética',
      theme: 'nutrition',
      layout: 'grid',
      modules: [
        { 
          id: 'evaluaciones-nutri', 
          name: 'Evaluaciones', 
          icon: 'fas fa-weight', 
          route: '/nutricion/evaluaciones', 
          color: 'patients',
          description: 'Evaluaciones nutricionales',
          isActive: true
        },
        { 
          id: 'planes-alimentarios', 
          name: 'Planes', 
          icon: 'fas fa-utensils', 
          route: '/nutricion/planes', 
          color: 'doctors',
          description: 'Planes alimentarios',
          isActive: true
        },
        { 
          id: 'seguimiento-nutri', 
          name: 'Seguimiento', 
          icon: 'fas fa-chart-line', 
          route: '/nutricion/seguimiento', 
          color: 'calendar',
          description: 'Seguimiento nutricional',
          isActive: true
        },
        { 
          id: 'recetas-nutri', 
          name: 'Recetas', 
          icon: 'fas fa-book', 
          route: '/nutricion/recetas', 
          color: 'exchange',
          description: 'Recetas saludables',
          isActive: true
        },
        { 
          id: 'educacion-nutri', 
          name: 'Educación', 
          icon: 'fas fa-chalkboard-teacher', 
          route: '/nutricion/educacion', 
          color: 'reports',
          description: 'Educación nutricional',
          isActive: true
        },
        { 
          id: 'reportes-nutri', 
          name: 'Reportes', 
          icon: 'fas fa-clipboard-list', 
          route: '/nutricion/reportes', 
          color: 'stats',
          description: 'Reportes nutricionales',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nueva-evaluacion', 
          label: 'Nueva Evaluación', 
          icon: 'fas fa-plus', 
          action: 'nueva-evaluacion',
          route: '/nutricion/evaluaciones/nueva',
          isVisible: true
        },
        { 
          id: 'plan-alimentario', 
          label: 'Plan Alimentario', 
          icon: 'fas fa-apple-alt', 
          action: 'plan-alimentario',
          route: '/nutricion/planes/nuevo',
          isVisible: true
        },
        { 
          id: 'consulta-nutricional', 
          label: 'Consulta', 
          icon: 'fas fa-comments', 
          action: 'consulta-nutricional',
          route: '/nutricion/consultas',
          isVisible: true
        }
      ],
      notifications: { 
        evaluaciones: 0, 
        planes: 0, 
        seguimientos: 0 
      },
      stats: { 
        evaluacionesHoy: 0, 
        planesActivos: 0, 
        consultasSemanales: 0 
      }
    },

    'psicologia': {
      title: 'PSICOLOGÍA',
      subtitle: 'Servicios de salud mental y psicología',
      theme: 'psychology',
      layout: 'grid',
      modules: [
        { 
          id: 'sesiones-psico', 
          name: 'Sesiones', 
          icon: 'fas fa-comments', 
          route: '/psicologia/sesiones', 
          color: 'patients',
          description: 'Sesiones psicológicas',
          isActive: true
        },
        { 
          id: 'evaluaciones-psico', 
          name: 'Evaluaciones', 
          icon: 'fas fa-brain', 
          route: '/psicologia/evaluaciones', 
          color: 'doctors',
          description: 'Evaluaciones psicológicas',
          isActive: true
        },
        { 
          id: 'terapias-psico', 
          name: 'Terapias', 
          icon: 'fas fa-heart', 
          route: '/psicologia/terapias', 
          color: 'calendar',
          description: 'Terapias especializadas',
          isActive: true
        },
        { 
          id: 'casos', 
          name: 'Casos', 
          icon: 'fas fa-folder-open', 
          route: '/psicologia/casos', 
          color: 'exchange',
          description: 'Casos clínicos',
          isActive: true
        },
        { 
          id: 'grupos', 
          name: 'Grupos', 
          icon: 'fas fa-users', 
          route: '/psicologia/grupos', 
          color: 'reports',
          description: 'Terapias grupales',
          isActive: true
        },
        { 
          id: 'recursos-psico', 
          name: 'Recursos', 
          icon: 'fas fa-book-medical', 
          route: '/psicologia/recursos', 
          color: 'stats',
          description: 'Recursos terapéuticos',
          isActive: true
        }
      ],
      quickActions: [
        { 
          id: 'nueva-sesion-psico', 
          label: 'Nueva Sesión', 
          icon: 'fas fa-plus', 
          action: 'nueva-sesion-psico',
          route: '/psicologia/sesiones/nueva',
          isVisible: true
        },
        { 
          id: 'evaluacion-psico', 
          label: 'Evaluación', 
          icon: 'fas fa-clipboard-check', 
          action: 'evaluacion-psico',
          route: '/psicologia/evaluaciones/nueva',
          isVisible: true
        },
        { 
          id: 'terapia-grupal', 
          label: 'Terapia Grupal', 
          icon: 'fas fa-users', 
          action: 'terapia-grupal',
          route: '/psicologia/grupos/nueva',
          isVisible: true
        }
      ],
      notifications: { 
        sesiones: 0, 
        evaluaciones: 0, 
        casos: 0 
      },
      stats: { 
        sesionesHoy: 0, 
        casosActivos: 0, 
        terapiasGrupales: 0 
      }
    }
  };

  constructor(private router: Router) {
    this.initializeFromRoute();
  }

  /**
   * Inicializar módulo basado en la ruta actual
   */
  private initializeFromRoute(): void {
    const currentPath = this.router.url.toLowerCase();
    const moduleType = this.detectModuleFromPath(currentPath);
    this.setCurrentModule(moduleType);
  }

  /**
   * Detectar módulo desde la ruta
   */
  private detectModuleFromPath(path: string): ModuleType {
    if (path.includes('educacion-inclusiva')) return 'educacion-inclusiva';
    if (path.includes('fisioterapia')) return 'fisioterapia';
    if (path.includes('medicina-general')) return 'medicina-general';
    if (path.includes('nutricion')) return 'nutricion';
    if (path.includes('psicologia')) return 'psicologia';
    return 'administracion';
  }

  /**
   * Establecer módulo actual
   */
  setCurrentModule(moduleType: ModuleType): void {
    // Eliminar el loading al cambiar módulos
    this.currentModuleSubject.next(moduleType);
    const config = this.getModuleConfiguration(moduleType);
    this.dashboardConfigSubject.next(config);
  }

  /**
   * Obtener configuración del módulo
   */
  getModuleConfiguration(moduleType: ModuleType): DashboardConfig {
    return this.moduleConfigurations[moduleType] || this.moduleConfigurations['administracion'];
  }

  /**
   * Actualizar estadísticas del módulo actual
   */
  updateModuleStats(stats: Partial<ModuleStats>): void {
    const currentConfig = this.dashboardConfigSubject.value;
    if (currentConfig) {
      // Filtrar valores undefined antes de la actualización
      const filteredStats = Object.fromEntries(
        Object.entries(stats).filter(([_, value]) => value !== undefined)
      ) as ModuleStats;
      
      const updatedConfig: DashboardConfig = {
        ...currentConfig,
        stats: { ...currentConfig.stats, ...filteredStats }
      };
      this.dashboardConfigSubject.next(updatedConfig);
    }
  }

  /**
   * Actualizar notificaciones del módulo actual
   */
  updateModuleNotifications(notifications: Partial<ModuleNotifications>): void {
    const currentConfig = this.dashboardConfigSubject.value;
    if (currentConfig) {
      // Filtrar valores undefined antes de la actualización
      const filteredNotifications = Object.fromEntries(
        Object.entries(notifications).filter(([_, value]) => value !== undefined && typeof value === 'number')
      ) as ModuleNotifications;
      
      const updatedConfig: DashboardConfig = {
        ...currentConfig,
        notifications: { ...currentConfig.notifications, ...filteredNotifications }
      };
      this.dashboardConfigSubject.next(updatedConfig);
    }
  }

  /**
   * Obtener módulos activos con permisos
   */
  getActiveModules(userPermissions: string[] = []): ModuleConfig[] {
    const currentConfig = this.dashboardConfigSubject.value;
    if (!currentConfig) return [];

    return currentConfig.modules.filter(module => {
      if (!module.isActive) return false;
      if (!module.permissions) return true;
      return module.permissions.some(permission => userPermissions.includes(permission));
    });
  }

  /**
   * Obtener acciones rápidas visibles
   */
  getVisibleQuickActions(userPermissions: string[] = []): QuickAction[] {
    const currentConfig = this.dashboardConfigSubject.value;
    if (!currentConfig) return [];

    return currentConfig.quickActions.filter(action => {
      if (!action.isVisible) return false;
      if (!action.permissions) return true;
      return action.permissions.some(permission => userPermissions.includes(permission));
    });
  }

  /**
   * Calcular total de notificaciones
   */
  getTotalNotifications(): number {
    const currentConfig = this.dashboardConfigSubject.value;
    if (!currentConfig) return 0;

    return Object.values(currentConfig.notifications)
      .reduce((total, count) => total + (count || 0), 0);
  }

  /**
   * Establecer estado de carga
   */
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Ejecutar acción rápida
   */
  executeQuickAction(actionId: string): Observable<boolean> {
    const currentConfig = this.dashboardConfigSubject.value;
    if (!currentConfig) return of(false);

    const action = currentConfig.quickActions.find(a => a.id === actionId);
    if (!action) return of(false);

    this.setLoading(true);

    // Simular ejecución de acción
    return new Observable(observer => {
      setTimeout(() => {
        if (action.route) {
          this.router.navigate([action.route]);
        }
        this.setLoading(false);
        observer.next(true);
        observer.complete();
      }, 500);
    });
  }

  /**
   * Refrescar datos del módulo
   */
  refreshModuleData(): Observable<boolean> {
    return new Observable(observer => {
      this.setLoading(true);
      
      // Simular carga de datos
      setTimeout(() => {
        // Aquí harías las llamadas reales a la API
        // Por ahora solo simulamos
        const currentModule = this.currentModuleSubject.value;
        const config = this.getModuleConfiguration(currentModule);
        this.dashboardConfigSubject.next(config);
        
        this.setLoading(false);
        observer.next(true);
        observer.complete();
      }, 1000);
    });
  }

  /**
   * Navegación con validación
   */
  navigateToModule(route: string): void {
    if (!route) {
      console.warn('Ruta no válida');
      return;
    }

    this.setLoading(true);
    
    setTimeout(() => {
      this.router.navigate([route]);
      this.setLoading(false);
    }, 300);
  }

  /**
   * Obtener módulo actual
   */
  getCurrentModule(): ModuleType {
    return this.currentModuleSubject.value;
  }

  /**
   * Validar si el usuario tiene permisos para un módulo
   */
  hasPermissionForModule(moduleId: string, userPermissions: string[] = []): boolean {
    const currentConfig = this.dashboardConfigSubject.value;
    if (!currentConfig) return false;

    const module = currentConfig.modules.find(m => m.id === moduleId);
    if (!module || !module.permissions) return true;

    return module.permissions.some(permission => userPermissions.includes(permission));
  }
}