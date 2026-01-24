// gestionclinica.component.ts - ✅ VERSION SIMPLIFICADA CON ROL Y CLINICA
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ArchivoService } from '../../services/archivo.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

// ============================================================================
// INTERFACES
// ============================================================================

interface UserInfo {
  name: string;
  avatar?: string;
  rol: number;
  clinica: number;
}

interface Modulo {
  id: string;
  nombre: string;
  icono: string;
  ruta: string;
  descripcion: string;
  color: string;
  roles: number[];  // Roles permitidos
  activo: boolean;
}

interface Estadistica {
  label: string;
  valor: number;
  icono: string;
  color: string;
}

@Component({
  selector: 'app-gestion-clinica',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './gestionclinica.html',
  styleUrls: ['./gestionclinica.scss']
})
export class GestionClinicaComponent implements OnInit, OnDestroy, AfterViewInit {
  
  private destroy$ = new Subject<void>();
  
  // Estados
  sidebarExpanded = false;
  loading = false;
  
  // Usuario
  userInfo: UserInfo = {
    name: 'Usuario',
    rol: 1,
    clinica: 0
  };
  
  // Datos
  modulos: Modulo[] = [];
  modulosFiltrados: Modulo[] = [];
  estadisticas: Estadistica[] = [];
  
  // Fecha
  fechaActual = new Date();

  constructor(
    public router: Router,
    private archivoService: ArchivoService
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    this.cargarModulos();
    this.cargarEstadisticas();
  }

  ngAfterViewInit(): void {
    this.sidebarExpanded = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  /**
   * ✅ Cargar info del usuario desde localStorage
   */
  cargarUsuario(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.rutafotoperfil ? 
            this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) || undefined : undefined,
          rol: usuario.fkrol || 1,
          clinica: usuario.fkclinica || 0
        };
        
        console.log('👤 Usuario cargado:', {
          nombre: this.userInfo.name,
          rol: this.userInfo.rol,
          clinica: this.userInfo.clinica
        });
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  }

  /**
   * ✅ Cargar y filtrar módulos según el rol
   */
  cargarModulos(): void {
    // ✅ TODOS LOS MÓDULOS DEL SISTEMA
    const todosLosModulos: Modulo[] = [
      {
        id: 'pacientes',
        nombre: 'Pacientes',
        icono: 'fas fa-hospital-user',
        ruta: '/pacientes',
        descripcion: 'Gestión de pacientes',
        color: 'patients',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'expedientes',
        nombre: 'Expedientes',
        icono: 'fas fa-folder-open',
        ruta: '/expedientes',
        descripcion: 'Expedientes médicos',
        color: 'doctors',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'agenda',
        nombre: 'Agenda',
        icono: 'fas fa-calendar-alt',
        ruta: '/agenda',
        descripcion: 'Calendario de citas',
        color: 'calendar',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'referidos',
        nombre: 'Referidos',
        icono: 'fas fa-exchange-alt',
        ruta: '/referidos',
        descripcion: 'Gestión de referidos',
        color: 'exchange',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'reporteria',
        nombre: 'Reportes',
        icono: 'fas fa-chart-line',
        ruta: '/reporteria',
        descripcion: 'Reportes y estadísticas',
        color: 'reports',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'inventario',
        nombre: 'Inventario',
        icono: 'fas fa-boxes',
        ruta: '/inventario',
        descripcion: 'Control de inventario',
        color: 'settings',
        roles: [1,4,7,9],  // ✅ Solo Admin, Sistemas, Auxiliar Admin, Farmacia
        activo: true
      },
      {
        id: 'salida-inventario',
        nombre: 'Salida Inventario',
        icono: 'fas fa-dolly',
        ruta: '/salida-inventario',
        descripcion: 'Registro de salidas',
        color: 'settings',
        roles: [1,4,7,9],
        activo: true
      },
      {
        id: 'documentos',
        nombre: 'Documentos',
        icono: 'fas fa-file-alt',
        ruta: '/documentos',
        descripcion: 'Gestión documental',
        color: 'pdf',
        roles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
        activo: true
      },
      {
        id: 'usuarios',
        nombre: 'Usuarios',
        icono: 'fas fa-users-cog',
        ruta: '/usuario',
        descripcion: 'Gestión de usuarios',
        color: 'stats',
        roles: [1,4,7],  // ✅ Solo Admin, Sistemas, Auxiliar Admin
        activo: true
      }
    ];

    this.modulos = todosLosModulos;
    
    // ✅ FILTRAR MÓDULOS POR ROL DEL USUARIO
    this.filtrarModulosPorRol();
  }

  /**
   * ✅ Filtrar módulos según el rol del usuario
   */
  filtrarModulosPorRol(): void {
    this.modulosFiltrados = this.modulos.filter(modulo => 
      modulo.activo && modulo.roles.includes(this.userInfo.rol)
    );
    
    console.log('📋 Módulos filtrados:', this.modulosFiltrados.length);
  }

  /**
   * ✅ Cargar estadísticas (puedes conectar al backend después)
   */
  cargarEstadisticas(): void {
    this.estadisticas = [
      {
        label: 'Pacientes Hoy',
        valor: 0,
        icono: 'fas fa-users',
        color: 'primary'
      },
      {
        label: 'Citas Pendientes',
        valor: 0,
        icono: 'fas fa-clock',
        color: 'warning'
      },
      {
        label: 'Expedientes',
        valor: 0,
        icono: 'fas fa-folder',
        color: 'info'
      },
      {
        label: 'Referidos',
        valor: 0,
        icono: 'fas fa-share',
        color: 'success'
      }
    ];
  }

  // ============================================================================
  // ACCIONES
  // ============================================================================

  /**
   * ✅ Navegar a un módulo con validación
   */
  navegarA(modulo: Modulo): void {
    if (!modulo.activo) {
      console.warn('⚠️ Módulo desactivado');
      return;
    }
    
    // ✅ VALIDAR ACCESO
    if (!this.tieneAcceso(modulo)) {
      console.error('❌ Acceso denegado');
      alert('No tienes permisos para acceder a este módulo');
      return;
    }
    
    console.log('📍 Navegando a:', modulo.ruta);
    this.router.navigate([modulo.ruta]);
  }

  /**
   * ✅ Verificar si el usuario tiene acceso al módulo
   */
  tieneAcceso(modulo: Modulo): boolean {
    return modulo.roles.includes(this.userInfo.rol);
  }

  /**
   * ✅ Handle sidebar toggle
   */
  onSidebarToggle(event: any): void {
    this.sidebarExpanded = event;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get fechaFormateada(): string {
    return this.fechaActual.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  get nombreClinica(): string {
    // Aquí puedes cargar el nombre desde un servicio si lo necesitas
    return 'Sistema de Gestión Clínica';
  }

  /**
   * ✅ Track by para ngFor
   */
  trackByModuloId(index: number, modulo: Modulo): string {
    return modulo.id;
  }

  trackByEstadistica(index: number, stat: Estadistica): string {
    return stat.label;
  }

  /**
   * ✅ Dividir módulos en filas de 4
   */
  get filasModulos(): Modulo[][] {
    const filas: Modulo[][] = [];
    for (let i = 0; i < this.modulosFiltrados.length; i += 4) {
      filas.push(this.modulosFiltrados.slice(i, i + 4));
    }
    return filas;
  }
}