// gestionclinica.service.ts - Versión actualizada
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';

// Interfaces
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

  // Módulos comunes para todos los módulos clínicos
  private readonly commonClinicalModules: ModuleConfig[] = [
    { 
      id: 'perfil', 
      name: 'Perfil', 
      icon: 'fas fa-user-circle', 
      route: '/perfil', 
      color: 'patients',
      description: 'Perfil de usuario',
      isActive: true
    },
    { 
      id: 'pacientes', 
      name: 'Pacientes', 
      icon: 'fas fa-users', 
      route: '/pacientes', 
      color: 'doctors',
      description: 'Gestión de pacientes',
      isActive: true
    },
    { 
      id: 'expedientes', 
      name: 'Expedientes', 
      icon: 'fas fa-folder-open', 
      route: '/expedientes', 
      color: 'exchange',
      description: 'Expedientes médicos',
      isActive: true
    },
    { 
      id: 'referidos', 
      name: 'Referidos', 
      icon: 'fas fa-exchange-alt', 
      route: '/referidos', 
      color: 'calendar',
      description: 'Pacientes referidos',
      isActive: true
    },
    { 
      id: 'agenda', 
      name: 'Agenda', 
      icon: 'fas fa-calendar-alt', 
      route: '/agenda', 
      color: 'reports',
      description: 'Calendario de citas',
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
  ];

  // Configuraciones por módulo
  private readonly moduleConfigurations: Record<ModuleType, DashboardConfig> = {
    // ========================================
    // ADMINISTRACIÓN - TODOS LOS MÓDULOS
    // ========================================
    'administracion': {
      title: 'ADMINISTRACIÓN',
      subtitle: 'Panel de administración y control del sistema',
      theme: 'admin',
      layout: 'grid',
      modules: [
        { 
          id: 'perfil', 
          name: 'Perfil', 
          icon: 'fas fa-user-circle', 
          route: '/perfil', 
          color: 'patients',
          description: 'Perfil de usuario',
          isActive: true
        },
        { 
          id: 'usuarios', 
          name: 'Usuarios', 
          icon: 'fas fa-user-md', 
          route: '/usuario', 
          color: 'doctors',
          description: 'Gestión de usuarios',
          isActive: true
        },
        { 
          id: 'pacientes', 
          name: 'Pacientes', 
          icon: 'fas fa-users', 
          route: '/pacientes', 
          color: 'patients',
          description: 'Gestión de pacientes',
          isActive: true
        },
        { 
          id: 'expedientes', 
          name: 'Expedientes', 
          icon: 'fas fa-folder-open', 
          route: '/expedientes', 
          color: 'exchange',
          description: 'Expedientes médicos',
          isActive: true
        },
        { 
          id: 'referidos', 
          name: 'Referidos', 
          icon: 'fas fa-exchange-alt', 
          route: '/referidos', 
          color: 'calendar',
          description: 'Pacientes referidos',
          isActive: true
        },
        { 
          id: 'agenda', 
          name: 'Agenda', 
          icon: 'fas fa-calendar-alt', 
          route: '/agenda', 
          color: 'reports',
          description: 'Calendario de citas',
          isActive: true
        },
        { 
          id: 'inventario', 
          name: 'Inventario', 
          icon: 'fas fa-boxes', 
          route: '/inventario', 
          color: 'settings',
          description: 'Inventario médico',
          isActive: true
        },
        { 
          id: 'reporteria', 
          name: 'Reportería', 
          icon: 'fas fa-chart-bar', 
          route: '/reporteria', 
          color: 'stats',
          description: 'Reportes y estadísticas',
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
      quickActions: [], // Sin acciones rápidas
      notifications: {},
      stats: {}
    },

    // ========================================
    // EDUCACIÓN INCLUSIVA
    // ========================================
    'educacion-inclusiva': {
      title: 'EDUCACIÓN INCLUSIVA',
      subtitle: 'Gestión de programas educativos inclusivos',
      theme: 'education',
      layout: 'grid',
      modules: [...this.commonClinicalModules],
      quickActions: [],
      notifications: {},
      stats: {}
    },

    // ========================================
    // FISIOTERAPIA
    // ========================================
    'fisioterapia': {
      title: 'FISIOTERAPIA',
      subtitle: 'Gestión de servicios de fisioterapia y rehabilitación',
      theme: 'therapy',
      layout: 'grid',
      modules: [...this.commonClinicalModules],
      quickActions: [],
      notifications: {},
      stats: {}
    },

    // ========================================
    // MEDICINA GENERAL
    // ========================================
    'medicina-general': {
      title: 'MEDICINA GENERAL',
      subtitle: 'Atención médica general y consultas',
      theme: 'medical',
      layout: 'grid',
      modules: [...this.commonClinicalModules],
      quickActions: [],
      notifications: {},
      stats: {}
    },

    // ========================================
    // NUTRICIÓN
    // ========================================
    'nutricion': {
      title: 'NUTRICIÓN',
      subtitle: 'Servicios de nutrición y dietética',
      theme: 'nutrition',
      layout: 'grid',
      modules: [...this.commonClinicalModules],
      quickActions: [],
      notifications: {},
      stats: {}
    },

    // ========================================
    // PSICOLOGÍA
    // ========================================
    'psicologia': {
      title: 'PSICOLOGÍA',
      subtitle: 'Servicios de salud mental y psicología',
      theme: 'psychology',
      layout: 'grid',
      modules: [...this.commonClinicalModules],
      quickActions: [],
      notifications: {},
      stats: {}
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
    return []; // Sin acciones rápidas
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
    return of(false); // Sin acciones rápidas
  }

  /**
   * Refrescar datos del módulo
   */
  refreshModuleData(): Observable<boolean> {
    return new Observable(observer => {
      this.setLoading(true);
      
      setTimeout(() => {
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