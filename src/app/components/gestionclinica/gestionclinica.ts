// gestionclinica.component.ts - Versión mejorada
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { ArchivoService } from '../../services/archivo.service';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { 
  GestionClinicaService, 
  DashboardConfig, 
  ModuleConfig, 
  QuickAction, 
  ModuleType 
} from '../../services/gestionclinica.service';

// Interface para información del usuario
interface UserInfo {
  name: string;
  avatar?: string; // Mantener solo string | undefined
  permissions?: string[];
  role?: string;
}


// Interface para estadísticas formateadas
interface FormattedStat {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

// Interface para notificaciones formateadas
interface FormattedNotification {
  label: string;
  count: number;
  icon?: string;
  route?: string;
}

@Component({
  selector: 'app-gestion-clinica',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './gestionclinica.html',
  styleUrls: ['./gestionclinica.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GestionClinicaComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // Servicios inyectados
  private readonly gestionService = inject(GestionClinicaService);
  public readonly router = inject(Router); // Cambiar a public para acceso en template
  private readonly route = inject(ActivatedRoute);
  
  // Subject para cleanup
  private readonly destroy$ = new Subject<void>();
  
  // Observables públicos
  public readonly currentDate$ = new Observable<Date>(observer => {
    const emit = () => observer.next(new Date());
    emit();
    const interval = setInterval(emit, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  });

  public readonly dashboardConfig$ = this.gestionService.dashboardConfig$;
  public readonly loading$ = this.gestionService.loading$;
  public readonly currentModule$ = this.gestionService.currentModule$;
  private readonly archivoService = inject(ArchivoService);

  // Propiedades del componente
  public sidebarExpanded = false;
  public userInfo: UserInfo = { name: 'Usuario', permissions: [] };

  // Propiedades computadas
  public readonly formattedDate$ = this.currentDate$.pipe(
    map(date => date.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }))
  );

  // Combinar datos del dashboard
  public readonly dashboardData$ = combineLatest([
    this.dashboardConfig$,
    this.currentModule$
  ]).pipe(
    map(([config, module]) => ({
      config,
      module,
      activeModules: config ? this.getFilteredModules(config.modules) : [],
      visibleActions: config ? this.getFilteredActions(config.quickActions) : [],
      formattedStats: config ? this.formatStats(config.stats) : [],
      totalNotifications: this.gestionService.getTotalNotifications()
    }))
  );

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    this.checkSidebarState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar componente
   */
  private initializeComponent(): void {
    this.loadUserInfo();
    this.detectAndSetModule();
  }

  /**
   * Configurar suscripciones
   */
  private setupSubscriptions(): void {
    // Escuchar cambios en la ruta
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.detectAndSetModule();
    });

    // Escuchar cambios en el módulo actual
    this.currentModule$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(module => {
      console.log(`Módulo actual: ${module}`);
    });
  }

  /**
   * Detectar y establecer módulo basado en la ruta
   */
  private detectAndSetModule(): void {
    const currentPath = this.router.url.toLowerCase();
    const moduleType = this.detectModuleFromPath(currentPath);
    this.gestionService.setCurrentModule(moduleType);
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
   * Cargar información del usuario
   */
  private loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Usuario',
          avatar: usuario.rutafotoperfil ? this.obtenerUrlPublica(usuario.rutafotoperfil) || undefined : undefined,
          permissions: usuario.permisos || [],
          role: usuario.rol || 'user'
        };
      }
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
      this.userInfo = { name: 'Usuario', permissions: [] }; // Sin avatar property
    }
  }

  /**
   * Obtener URL pública de archivos
   */
  private obtenerUrlPublica(ruta: string): string | undefined {
  const result = this.archivoService.obtenerUrlPublica(ruta);
  return result || undefined; // Convertir null a undefined
}

  /**
   * Verificar estado del sidebar
   */
  private checkSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
        this.sidebarExpanded = sidebar.classList.contains('expanded');
      }
    };

    setTimeout(checkSidebar, 100);

    // Observer para cambios en el sidebar
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
   * Filtrar módulos según permisos del usuario
   */
  private getFilteredModules(modules: ModuleConfig[]): ModuleConfig[] {
    return modules.filter(module => {
      if (!module.isActive) return false;
      if (!module.permissions) return true;
      return this.userHasPermission(module.permissions);
    });
  }

  /**
   * Filtrar acciones según permisos del usuario
   */
  private getFilteredActions(actions: QuickAction[]): QuickAction[] {
    return actions.filter(action => {
      if (!action.isVisible) return false;
      if (!action.permissions) return true;
      return this.userHasPermission(action.permissions);
    });
  }

  /**
   * Verificar si el usuario tiene los permisos requeridos
   */
  private userHasPermission(requiredPermissions: string[]): boolean {
    const userPermissions = this.userInfo.permissions || [];
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('admin')
    );
  }

  /**
   * Formatear estadísticas para mostrar
   */
  private formatStats(stats: any): FormattedStat[] {
    if (!stats) return [];
    
    return Object.keys(stats).map(key => ({
      label: this.formatStatLabel(key),
      value: stats[key],
      icon: this.getStatIcon(key),
      color: this.getStatColor(key)
    }));
  }

  /**
   * Formatear etiquetas de estadísticas
   */
  private formatStatLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'pacientesHoy': 'Pacientes Hoy',
      'citasPendientes': 'Citas Pendientes',
      'reportesGenerados': 'Reportes Generados',
      'sesionesCompletadas': 'Sesiones Completadas',
      'estudiantesActivos': 'Estudiantes Activos',
      'talleresHoy': 'Talleres Hoy',
      'evaluacionesPendientes': 'Evaluaciones Pendientes',
      'equiposDisponibles': 'Equipos Disponibles',
      'consultasHoy': 'Consultas Hoy',
      'pacientesAtendidos': 'Pacientes Atendidos',
      'recetasEmitidas': 'Recetas Emitidas',
      'evaluacionesHoy': 'Evaluaciones Hoy',
      'planesActivos': 'Planes Activos',
      'consultasSemanales': 'Consultas Semanales',
      'sesionesHoy': 'Sesiones Hoy',
      'casosActivos': 'Casos Activos',
      'terapiasGrupales': 'Terapias Grupales'
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Obtener icono para estadística
   */
  private getStatIcon(key: string): string {
    const icons: { [key: string]: string } = {
      'pacientesHoy': 'fas fa-users',
      'citasPendientes': 'fas fa-clock',
      'reportesGenerados': 'fas fa-chart-line',
      'sesionesCompletadas': 'fas fa-check-circle',
      'estudiantesActivos': 'fas fa-user-graduate',
      'consultasHoy': 'fas fa-stethoscope',
      'equiposDisponibles': 'fas fa-tools'
    };
    return icons[key] || 'fas fa-info-circle';
  }

  /**
   * Obtener color para estadística
   */
  private getStatColor(key: string): string {
    const colors: { [key: string]: string } = {
      'pacientesHoy': 'primary',
      'citasPendientes': 'warning',
      'reportesGenerados': 'success',
      'sesionesCompletadas': 'info',
      'estudiantesActivos': 'primary',
      'consultasHoy': 'secondary',
      'equiposDisponibles': 'success'
    };
    return colors[key] || 'primary';
  }


  /**
   * Navegar a una ruta específica
   */
  public navigateTo(route: string): void {
    if (!route) {
      console.warn('Ruta no válida');
      return;
    }
    
    this.gestionService.navigateToModule(route);
  }

  /**
   * Ejecutar acción rápida
   */
  public quickAction(actionId: string): void {
    if (!actionId) {
      console.warn('ID de acción no válido');
      return;
    }

    this.gestionService.executeQuickAction(actionId).subscribe({
      next: (success) => {
        if (success) {
          console.log(`Acción ${actionId} ejecutada correctamente`);
        } else {
          console.warn(`Error al ejecutar acción ${actionId}`);
        }
      },
      error: (error) => {
        console.error(`Error en acción ${actionId}:`, error);
      }
    });
  }


  /**
   * Manejar toggle del sidebar
   */
 public onSidebarToggle(event: any): void {
  this.sidebarExpanded = event.expanded || event.detail?.expanded || event;
}


  /**
   * Track by function para ngFor optimizado
   */
  public trackByModuleId(index: number, module: ModuleConfig): string {
    return module.id;
  }

  public trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }

  public trackByStatLabel(index: number, stat: FormattedStat): string {
    return stat.label;
  }

  /**
   * Obtener título para el módulo actual
   */
  public getTitle(config: DashboardConfig | null): string {
    return config?.title || 'GESTIÓN CLÍNICA';
  }

  /**
   * Obtener subtítulo para el módulo actual
   */
  public getSubtitle(config: DashboardConfig | null): string {
    return config?.subtitle || 'Sistema de gestión';
  }

  /**
   * Verificar si hay módulos configurados
   */
  public hasModules(modules: ModuleConfig[]): boolean {
    return modules && modules.length > 0;
  }

  /**
   * Verificar si hay estadísticas disponibles
   */
  public hasStats(stats: FormattedStat[]): boolean {
    return stats && stats.length > 0;
  }

  /**
   * Verificar si hay acciones rápidas disponibles
   */
  public hasQuickActions(actions: QuickAction[]): boolean {
    return actions && actions.length > 0;
  }

  /**
   * Obtener total de notificaciones
   */
  public getTotalNotifications(): number {
    return this.gestionService.getTotalNotifications();
  }

  /**
   * Obtener array de estadísticas (para compatibilidad con template)
   */
  public getStatsArray(): FormattedStat[] {
    const config = this.dashboardConfig$;
    // Esta función se mantiene para compatibilidad, pero se recomienda usar dashboardData$
    return [];
  }

  /**
   * Obtener array de notificaciones (para compatibilidad con template)
   */
  public getNotificationsArray(): FormattedNotification[] {
    // Esta función se mantiene para compatibilidad, pero se recomienda usar dashboardData$
    return [];
  }
}