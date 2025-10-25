// src/app/components/inventario/inventario.component.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { 
  InventarioService, 
  Medicamento, 
  CrearMedicamentoRequest,
  ActualizarMedicamentoRequest 
} from '../../services/inventario.service';
import { ArchivoService } from '../../services/archivo.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss']
})
export class InventarioComponent implements OnInit, AfterViewInit {
  sidebarExpanded = true;
  loading = false;
  guardando = false;
  
  // Usuario actual
  userInfo: any = {};
  usuarioActual: any = null;
  
  // Datos
  medicamentos: Medicamento[] = [];
  medicamentosPaginados: Medicamento[] = [];
  
  // Filtros y búsqueda
  filtroEstado: 'todos' | 'activos' | 'inactivos' = 'todos';
  busqueda = '';
  
  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  
  // Modales
  mostrarModalNuevo = false;
  mostrarModalEditar = false;
  mostrarModalDetalle = false;
  
  // Formularios
  medicamentoForm: FormGroup;
  
  // Selección
  medicamentoSeleccionado: Medicamento | null = null;
  modoEdicion = false;
  
  Math = Math;
  
  constructor(
    private fb: FormBuilder,
    public inventarioService: InventarioService,
    private alerta: AlertaService,
    private archivoService: ArchivoService
  ) {
    this.medicamentoForm = this.fb.group({
      codigoproducto: ['', [Validators.maxLength(50)]],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      unidades: [0, [Validators.min(0)]],
      precio: [0, [Validators.min(0)]],
      observaciones: [''],
      fechaingreso: [''],
      fechaegreso: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.cargarMedicamentos();
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
      console.error('Error al cargar info del usuario:', error);
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

  cargarMedicamentos(): void {
    this.loading = true;
    this.inventarioService.obtenerMedicamentos().subscribe({
      next: (medicamentos) => {
        this.medicamentos = medicamentos;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar medicamentos');
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let medicamentosFiltrados = [...this.medicamentos];
    
    // Filtro por estado
    if (this.filtroEstado === 'activos') {
      medicamentosFiltrados = medicamentosFiltrados.filter(m => m.estado === 1);
    } else if (this.filtroEstado === 'inactivos') {
      medicamentosFiltrados = medicamentosFiltrados.filter(m => m.estado === 0);
    }
  
    if (this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase();
      medicamentosFiltrados = medicamentosFiltrados.filter(m =>
        m.nombre.toLowerCase().includes(busquedaLower) ||
        m.codigoproducto?.toLowerCase().includes(busquedaLower) || 
        m.descripcion?.toLowerCase().includes(busquedaLower) ||
        m.observaciones?.toLowerCase().includes(busquedaLower)
      );
    }
    
    this.medicamentos = medicamentosFiltrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  cambiarFiltroEstado(filtro: typeof this.filtroEstado): void {
    this.filtroEstado = filtro;
    this.cargarMedicamentos();
  }

  buscarMedicamentos(): void {
    this.cargarMedicamentos();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.buscarMedicamentos();
  }

  // PAGINACIÓN
  updatePagination(): void {
    this.totalItems = this.medicamentos.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    this.updatePaginatedMedicamentos();
  }

  updatePaginatedMedicamentos(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.medicamentosPaginados = this.medicamentos.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedMedicamentos();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedMedicamentos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedMedicamentos();
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

  // MODAL NUEVO MEDICAMENTO
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.medicamentoForm.reset({
      unidades: 0,
      precio: 0
    });
    this.mostrarModalNuevo = true;
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo = false;
    this.medicamentoForm.reset();
  }

  guardarMedicamento(): void {
    if (!this.medicamentoForm.valid) {
      this.marcarFormularioComoTocado();
      this.alerta.alertaError('Por favor complete todos los campos requeridos');
      return;
    }

    this.guardando = true;
    
    const datos: CrearMedicamentoRequest = {
      fkusuario: this.usuarioActual.idusuario,
      codigoproducto: this.medicamentoForm.value.codigoproducto || undefined, // ← AGREGAR
      nombre: this.medicamentoForm.value.nombre,
      descripcion: this.medicamentoForm.value.descripcion || undefined,
      unidades: this.medicamentoForm.value.unidades || 0,
      precio: this.medicamentoForm.value.precio || undefined,
      observaciones: this.medicamentoForm.value.observaciones || undefined,
      fechaingreso: this.medicamentoForm.value.fechaingreso || undefined,
      fechaegreso: this.medicamentoForm.value.fechaegreso || undefined,
      usuariocreacion: this.usuarioActual.usuario
    };

    this.inventarioService.crearMedicamento(datos).subscribe({
      next: (medicamento) => {
        this.alerta.alertaExito('Medicamento creado exitosamente');
        this.cerrarModalNuevo();
        this.cargarMedicamentos();
        this.guardando = false;
      },
      error: (error) => {
        this.alerta.alertaError(error.error?.message || 'Error al crear medicamento');
        this.guardando = false;
      }
    });
  }

  // MODAL EDITAR
  abrirModalEditar(medicamento: Medicamento): void {
    this.modoEdicion = true;
    this.medicamentoSeleccionado = medicamento;
    
    this.medicamentoForm.patchValue({
      codigoproducto: medicamento.codigoproducto || '', // ← AGREGAR
      nombre: medicamento.nombre,
      descripcion: medicamento.descripcion,
      unidades: medicamento.unidades,
      precio: medicamento.precio,
      observaciones: medicamento.observaciones,
      fechaingreso: medicamento.fechaingreso ? medicamento.fechaingreso.split('T')[0] : '',
      fechaegreso: medicamento.fechaegreso ? medicamento.fechaegreso.split('T')[0] : ''
    });
    
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.medicamentoSeleccionado = null;
    this.medicamentoForm.reset();
  }

  actualizarMedicamento(): void {
    if (!this.medicamentoForm.valid || !this.medicamentoSeleccionado) {
      this.marcarFormularioComoTocado();
      this.alerta.alertaError('Por favor complete todos los campos requeridos');
      return;
    }

    this.guardando = true;
    
    const datos: ActualizarMedicamentoRequest = {
      codigoproducto: this.medicamentoForm.value.codigoproducto || undefined, // ← AGREGAR
      nombre: this.medicamentoForm.value.nombre,
      descripcion: this.medicamentoForm.value.descripcion,
      unidades: this.medicamentoForm.value.unidades,
      precio: this.medicamentoForm.value.precio,
      observaciones: this.medicamentoForm.value.observaciones,
      fechaingreso: this.medicamentoForm.value.fechaingreso,
      fechaegreso: this.medicamentoForm.value.fechaegreso,
      usuariomodificacion: this.usuarioActual.usuario
    };

    this.inventarioService.actualizarMedicamento(this.medicamentoSeleccionado.idmedicina, datos).subscribe({
      next: (medicamento) => {
        this.alerta.alertaExito('Medicamento actualizado exitosamente');
        this.cerrarModalEditar();
        this.cargarMedicamentos();
        this.guardando = false;
      },
      error: (error) => {
        this.alerta.alertaError(error.error?.message || 'Error al actualizar medicamento');
        this.guardando = false;
      }
    });
  }

  // MODAL DETALLE
  verDetalleMedicamento(medicamento: Medicamento): void {
    this.inventarioService.obtenerMedicamentoPorId(medicamento.idmedicina).subscribe({
      next: (detalle) => {
        this.medicamentoSeleccionado = detalle;
        this.mostrarModalDetalle = true;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar el detalle');
      }
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.medicamentoSeleccionado = null;
  }

  // CAMBIAR ESTADO
  cambiarEstado(medicamento: Medicamento): void {
    const nuevoEstado = medicamento.estado === 1 ? 'desactivar' : 'activar';
    
    this.alerta.alertaConfirmacion(
      `¿${nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1)} medicamento?`,
      `Está a punto de ${nuevoEstado} este medicamento`,
      `Sí, ${nuevoEstado}`,
      'Cancelar'
    ).then((confirmado: boolean) => {
      if (confirmado) {
        this.inventarioService.cambiarEstado(medicamento.idmedicina, this.usuarioActual.usuario).subscribe({
          next: () => {
            this.alerta.alertaExito(`Medicamento ${nuevoEstado === 'activar' ? 'activado' : 'desactivado'} correctamente`);
            this.cargarMedicamentos();
          },
          error: (error) => {
            this.alerta.alertaError('Error al cambiar estado');
          }
        });
      }
    });
  }

  // VALIDACIÓN
  private marcarFormularioComoTocado(): void {
    Object.keys(this.medicamentoForm.controls).forEach(key => {
      const control = this.medicamentoForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.medicamentoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.medicamentoForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return 'El valor debe ser mayor o igual a 0';
      if (field.errors['maxlength']) {
        if (fieldName === 'codigoproducto') return 'Máximo 50 caracteres';
        return 'Máximo 200 caracteres';
      }
    }
    return '';
  }

  // UTILIDADES
  obtenerContadorActivos(): number {
    return this.medicamentos.filter(m => m.estado === 1).length;
  }

  obtenerContadorInactivos(): number {
    return this.medicamentos.filter(m => m.estado === 0).length;
  }

  obtenerValorTotalInventario(): number {
    return this.medicamentos
      .filter(m => m.estado === 1)
      .reduce((total, m) => total + this.inventarioService.calcularValorTotal(m), 0);
  }
}