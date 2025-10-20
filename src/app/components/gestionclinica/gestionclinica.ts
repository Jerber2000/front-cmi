// gestionclinica.component.ts - Versión actualizada sin quickActions
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { ArchivoService } from '../../services/archivo.service';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { 
  GestionClinicaService, 
  DashboardConfig, 
  ModuleConfig, 
  ModuleType 
} from '../../services/gestionclinica.service';

// Interface para información del usuario
interface UserInfo {
  name: string;
  avatar?: string;
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
  public readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly archivoService = inject(ArchivoService);
  
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

  // Propiedades del componente
  public sidebarExpanded = true;
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
      formattedStats: config ? this.formatStats(config.stats) : [],
      totalNotifications: this.gestionService.getTotalNotifications()
    }))
  );

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    this.sidebarExpanded = false; // Empezar siempre contraído
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
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.detectAndSetModule();
    });

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
      this.userInfo = { name: 'Usuario', permissions: [] };
    }
  }

  /**
   * Obtener URL pública de archivos
   */
  private obtenerUrlPublica(ruta: string): string | undefined {
    const result = this.archivoService.obtenerUrlPublica(ruta);
    return result || undefined;
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
      'reportesGenerados': 'Reportes Generados'
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
      'reportesGenerados': 'fas fa-chart-line'
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
      'reportesGenerados': 'success'
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

  public trackByStatLabel(index: number, stat: FormattedStat): string {
    return stat.label;
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
   * Obtener total de notificaciones
   */
  public getTotalNotifications(): number {
    return this.gestionService.getTotalNotifications();
  }
}