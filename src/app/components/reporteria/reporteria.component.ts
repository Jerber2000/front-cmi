// src/app/components/reporteria/reporteria.component.ts - ACTUALIZADO

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  ReporteriaService,
  DashboardData,
  FiltrosPacientes,
  FiltrosConsultas,
  FiltrosInventario,
  FiltrosAgenda,
  FiltrosReferencias,
  FiltrosSalidas 
} from '../../services/reporteria.service';
import { PdfExcelReporteriaService } from '../../services/pdf-excel-reporteria.service'; // 🆕 NUEVO
import { ArchivoService } from '../../services/archivo.service';
import { AlertaService } from '../../services/alerta.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-reporteria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './reporteria.component.html',
  styleUrls: ['./reporteria.component.scss']
})
export class ReporteriaComponent implements OnInit, AfterViewInit {
  
  sidebarExpanded = true;
  loading = false;
  loadingReporte = false;
  generandoPDF = false;
  generandoExcel = false;
  
  userInfo: any = {};
  usuarioActual: any = null;
  dashboardData: DashboardData | null = null;
  tipoReporteActivo: 'dashboard' | 'pacientes' | 'consultas' | 'inventario' | 'agenda' | 'referencias' | 'salidas' = 'dashboard';
  
  datosReporte: any[] = [];
  resumenReporte: any = null;
  alertasReporte: any = null;
  
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  datosPaginados: any[] = [];
  
  filtrosPacientesForm: FormGroup;
  filtrosConsultasForm: FormGroup;
  filtrosInventarioForm: FormGroup;
  filtrosAgendaForm: FormGroup;
  filtrosReferenciasForm: FormGroup;
  filtrosSalidas: FiltrosSalidas = {
    page: 1,
    limit: 10
  };
  
  aniosDisponibles: number[] = [];
  mesesDisponibles = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];
  
  Math = Math;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    public reporteriaService: ReporteriaService,
    private pdfExcelService: PdfExcelReporteriaService, // 🆕 NUEVO
    private archivoService: ArchivoService,
    private alerta: AlertaService
  ) {
    this.filtrosPacientesForm = this.fb.group({
      desde: [''],
      hasta: [''],
      genero: [''],
      municipio: [''],
      edadMin: [''],
      edadMax: [''],
      tipodiscapacidad: ['']
    });
    
    this.filtrosConsultasForm = this.fb.group({
      desde: [''],
      hasta: [''],
      medico: [''],
      paciente: [''],
      diagnostico: ['']
    });
    
    this.filtrosInventarioForm = this.fb.group({
      estado: ['activo'],
      stockMinimo: [''],
      proximosVencer: [''],
      usuario: ['']
    });
    
    this.filtrosAgendaForm = this.fb.group({
      desde: [''],
      hasta: [''],
      medico: [''],
      mes: [''],
      anio: [''],
      transporte: ['']
    });
    
    this.filtrosReferenciasForm = this.fb.group({
      tipo: [''],
      estado: [''],
      clinica: [''],
      medico: [''],
      desde: [''],
      hasta: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadUserInfo();
    this.generarAniosDisponibles();
    
    if (this.tipoReporteActivo === 'dashboard') {
      this.cargarDashboard();
    }
  }
    
  ngAfterViewInit(): void {
    this.detectSidebarState();
  }
  
  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        this.usuarioActual = JSON.parse(usuarioData);
        this.userInfo = {
          name: `${this.usuarioActual.nombres || ''} ${this.usuarioActual.apellidos || ''}`.trim(),
          avatar: this.usuarioActual.rutafotoperfil ? 
            this.archivoService.obtenerUrlPublica(this.usuarioActual.rutafotoperfil) : null  
        };
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
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
  
  generarAniosDisponibles(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= anioActual - 5; i--) {
      this.aniosDisponibles.push(i);
    }
  }
  
  cambiarTipoReporte(tipo: typeof this.tipoReporteActivo): void {
    this.tipoReporteActivo = tipo;
    this.resetearPaginacion();
    
    if (tipo === 'dashboard') {
      this.cargarDashboard();
    } else if (tipo === 'pacientes') {
      this.cargarReportePacientes();
    } else if (tipo === 'consultas') {
      this.cargarReporteConsultas();
    } else if (tipo === 'inventario') {
      this.cargarReporteInventario();
    } else if (tipo === 'agenda') {
      this.cargarReporteAgenda();
    } else if (tipo === 'referencias') {
      this.cargarReporteReferencias();
    } else if (tipo === 'salidas') {  // 🆕 AGREGAR ESTE BLOQUE
      this.cargarReporteSalidas();
    }
  }


  aplicarFiltros(): void {
    this.resetearPaginacion();
    
    if (this.tipoReporteActivo === 'pacientes') {
      this.cargarReportePacientes();
    } else if (this.tipoReporteActivo === 'consultas') {
      this.cargarReporteConsultas();
    } else if (this.tipoReporteActivo === 'inventario') {
      this.cargarReporteInventario();
    } else if (this.tipoReporteActivo === 'agenda') {
      this.cargarReporteAgenda();
    } else if (this.tipoReporteActivo === 'referencias') {
      this.cargarReporteReferencias();
    } else if (this.tipoReporteActivo === 'salidas') {  // 🆕 AGREGAR ESTE BLOQUE
      this.cargarReporteSalidas();
    }
  }

  
  cargarDashboard(): void {
    this.loading = true;
    
    this.reporteriaService.obtenerDashboard().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar el dashboard');
        this.loading = false;
      }
    });
  }
    
  cargarReporte(): void {
    if (this.tipoReporteActivo === 'dashboard') {
      return;
    }
    
    this.loadingReporte = true;
    
    switch (this.tipoReporteActivo) {
      case 'pacientes':
        this.cargarReportePacientes();
        break;
      case 'consultas':
        this.cargarReporteConsultas();
        break;
      case 'inventario':
        this.cargarReporteInventario();
        break;
      case 'agenda':
        this.cargarReporteAgenda();
        break;
      case 'referencias':
        this.cargarReporteReferencias();
        break;
      case 'salidas':  // 🆕 AGREGAR ESTE CASE
        this.cargarReporteSalidas();
        break;
      default:
        this.loadingReporte = false;
    }
  }
  
  cargarReportePacientes(): void {
    const filtros: FiltrosPacientes = {
      ...this.filtrosPacientesForm.value,
      page: 1,
      limit: 1000
    };
    
    this.reporteriaService.obtenerReportePacientes(filtros).subscribe({
      next: (response) => {
        this.datosReporte = response.data;
        this.resumenReporte = response.resumen;
        this.currentPage = 1;
        this.updatePagination();
        this.loadingReporte = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar reporte de pacientes');
        this.loadingReporte = false;
      }
    });
  }
  
  cargarReporteConsultas(): void {
    const filtros: FiltrosConsultas = {
      ...this.filtrosConsultasForm.value,
      page: 1,
      limit: 1000
    };
    
    this.reporteriaService.obtenerReporteConsultas(filtros).subscribe({
      next: (response) => {
        this.datosReporte = response.data;
        this.resumenReporte = response.resumen;
        this.currentPage = 1;
        this.updatePagination();
        this.loadingReporte = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar reporte de consultas');
        this.loadingReporte = false;
      }
    });
  }
  
  cargarReporteInventario(): void {
    const filtros: FiltrosInventario = {
      ...this.filtrosInventarioForm.value,
      page: 1,
      limit: 1000
    };
    
    this.reporteriaService.obtenerReporteInventario(filtros).subscribe({
      next: (response) => {
        this.datosReporte = response.data;
        this.resumenReporte = response.resumen;
        this.alertasReporte = response.alertas;
        this.currentPage = 1;
        this.updatePagination();
        this.loadingReporte = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar reporte de inventario');
        this.loadingReporte = false;
      }
    });
  }
  
  cargarReporteAgenda(): void {
    const filtros: FiltrosAgenda = {
      ...this.filtrosAgendaForm.value,
      page: 1,
      limit: 1000
    };
    
    this.reporteriaService.obtenerReporteAgenda(filtros).subscribe({
      next: (response) => {
        this.datosReporte = response.data;
        this.resumenReporte = response.resumen;
        this.currentPage = 1;
        this.updatePagination();
        this.loadingReporte = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar reporte de agenda');
        this.loadingReporte = false;
      }
    });
  }
  
  cargarReporteReferencias(): void {
    const filtros: FiltrosReferencias = {
      ...this.filtrosReferenciasForm.value,
      page: 1,
      limit: 1000
    };
    
    this.reporteriaService.obtenerReporteReferencias(filtros).subscribe({
      next: (response) => {
        this.datosReporte = response.data;
        this.resumenReporte = response.resumen;
        this.currentPage = 1;
        this.updatePagination();
        this.loadingReporte = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar reporte de referencias');
        this.loadingReporte = false;
      }
    });
  }

  cargarReporteSalidas(): void {
    this.loadingReporte = true;
    this.reporteriaService.obtenerReporteSalidas(this.filtrosSalidas).subscribe({
      next: (reporte) => {
        this.datosReporte = reporte.data;
        this.resumenReporte = reporte.resumen;
        this.totalItems = reporte.pagination.total;
        this.currentPage = reporte.pagination.page;
        this.itemsPerPage = reporte.pagination.limit;
        this.totalPages = reporte.pagination.totalPages;
        this.datosPaginados = [...this.datosReporte];
        this.loadingReporte = false;
      },
      error: (error) => {
        console.error('Error al cargar reporte de salidas:', error);
        this.alerta.alertaError('Error al cargar reporte de salidas');
        this.loadingReporte = false;
      }
    });
  }
    
  limpiarFiltros(): void {
    if (this.tipoReporteActivo === 'pacientes') {
      this.filtrosPacientesForm.reset();  // ✅ Usa .reset() en los FormGroups
      this.cargarReportePacientes();
    } else if (this.tipoReporteActivo === 'consultas') {
      this.filtrosConsultasForm.reset();
      this.cargarReporteConsultas();
    } else if (this.tipoReporteActivo === 'inventario') {
      this.filtrosInventarioForm.reset();
      this.cargarReporteInventario();
    } else if (this.tipoReporteActivo === 'agenda') {
      this.filtrosAgendaForm.reset();
      this.cargarReporteAgenda();
    } else if (this.tipoReporteActivo === 'referencias') {
      this.filtrosReferenciasForm.reset();
      this.cargarReporteReferencias();
    } else if (this.tipoReporteActivo === 'salidas') {
      // ✅ Para salidas SÍ usamos objeto directo porque no es FormGroup
      this.filtrosSalidas = { page: 1, limit: 10 };
      this.cargarReporteSalidas();
    }
  }

  resetearPaginacion(): void {
    this.currentPage = 1;
    this.datosReporte = [];
    this.datosPaginados = [];
    this.resumenReporte = null;
    this.alertasReporte = null;
  }
  
  updatePagination(): void {
    this.totalItems = this.datosReporte.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = Math.max(1, this.totalPages);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedData();
  }
  
  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.datosPaginados = this.datosReporte.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }
  
  getPages(): number[] {
    if (this.totalPages <= 0) return [];
    
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  onItemsPerPageChange(): void {
    this.itemsPerPage = Number(this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }
  
  // ==========================================
  // 🆕 EXPORTAR PDF - ACTUALIZADO
  // ==========================================
  async exportarPDF(): Promise<void> {
    if (this.generandoPDF) return;
    
    try {
      this.generandoPDF = true;

      // Validar que hay un tipo de reporte activo
      if (this.tipoReporteActivo === 'dashboard') {
        this.alerta.alertaError('No se puede exportar el dashboard a PDF');
        this.generandoPDF = false;
        return;
      }

      // Validar que hay datos
      if (!this.datosReporte || this.datosReporte.length === 0) {
        this.alerta.alertaError('No hay datos para exportar');
        this.generandoPDF = false;
        return;
      }

      console.log('Exportando PDF:', this.tipoReporteActivo, 'Registros:', this.datosReporte.length);

      // Generar PDF
      await this.pdfExcelService.generarPDF(
        this.tipoReporteActivo,
        this.datosReporte
      );

      this.alerta.alertaExito('PDF generado exitosamente');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.alerta.alertaError('Error al generar PDF: ' + error);
    } finally {
      this.generandoPDF = false;
    }
  }
  
  // ==========================================
  // 🆕 EXPORTAR EXCEL - ACTUALIZADO
  // ==========================================
  exportarExcel(): void {
    if (this.generandoExcel) return;
    
    try {
      this.generandoExcel = true;

      // Validar que hay un tipo de reporte activo
      if (this.tipoReporteActivo === 'dashboard') {
        this.alerta.alertaError('No se puede exportar el dashboard a Excel');
        this.generandoExcel = false;
        return;
      }

      // Validar que hay datos
      if (!this.datosReporte || this.datosReporte.length === 0) {
        this.alerta.alertaError('No hay datos para exportar');
        this.generandoExcel = false;
        return;
      }

      console.log('Exportando Excel:', this.tipoReporteActivo, 'Registros:', this.datosReporte.length);

      // Generar Excel
      this.pdfExcelService.generarExcel(
        this.tipoReporteActivo,
        this.datosReporte
      );

      this.alerta.alertaExito('Excel generado exitosamente');

    } catch (error) {
      console.error('Error al generar Excel:', error);
      this.alerta.alertaError('Error al generar Excel: ' + error);
    } finally {
      this.generandoExcel = false;
    }
  }
  
  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================
  obtenerFiltrosActivos(): any {
    switch (this.tipoReporteActivo) {
      case 'pacientes':
        return this.filtrosPacientesForm.value;
      case 'consultas':
        return this.filtrosConsultasForm.value;
      case 'inventario':
        return this.filtrosInventarioForm.value;
      case 'agenda':
        return this.filtrosAgendaForm.value;
      case 'referencias':
        return this.filtrosReferenciasForm.value;
      default:
        return {};
    }
  }
  
  obtenerNombreTipoReporte(): string {
    const nombres: any = {
      'dashboard': 'Dashboard',
      'pacientes': 'Pacientes',
      'consultas': 'Consultas',
      'inventario': 'Inventario',
      'agenda': 'Agenda',
      'referencias': 'Referencias'
    };
    return nombres[this.tipoReporteActivo] || 'Reporte';
  }
  
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }
}