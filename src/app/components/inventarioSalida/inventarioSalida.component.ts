// src/app/components/inventarioSalida/inventarioSalida.component.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { 
  InventarioSalidaService, 
  Salida, 
  CrearSalidaRequest,
  Estadisticas
} from '../../services/inventarioSalida.service';
import { 
  InventarioService, 
  Medicamento 
} from '../../services/inventario.service';
import { ArchivoService } from '../../services/archivo.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';

@Component({
  selector: 'app-inventario-salida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './inventarioSalida.component.html',
  styleUrls: ['./inventarioSalida.component.scss']
})
export class InventarioSalidaComponent implements OnInit, AfterViewInit {
  sidebarExpanded = true;
  loading = false;
  guardando = false;
  
  // Usuario actual
  userInfo: any = {};
  usuarioActual: any = null;
  
  // Datos
  salidas: Salida[] = [];
  salidasPaginadas: Salida[] = [];
  medicamentos: Medicamento[] = [];
  estadisticas: Estadisticas | null = null;
  
  // Filtros y búsqueda
  filtroEstado: 'todas' | 'activas' | 'anuladas' = 'todas';
  busqueda = '';
  
  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  
  // Modales
  mostrarModalNueva = false;
  mostrarModalDetalle = false;
  mostrarModalHistorial = false;
  
  // Formulario
  salidaForm: FormGroup;
  
  // Selección
  salidaSeleccionada: Salida | null = null;
  medicamentoSeleccionado: Medicamento | null = null;
  stockResultante: number = 0;
  salidasHistorial: Salida[] = [];
  
  Math = Math;
  
  constructor(
    private fb: FormBuilder,
    public inventarioSalidaService: InventarioSalidaService,
    private inventarioService: InventarioService,
    private alerta: AlertaService,
    private archivoService: ArchivoService
  ) {
    this.salidaForm = this.fb.group({
      fkmedicina: ['', [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      motivo: [''],
      destino: [''],
      observaciones: [''],
      fechasalida: [this.obtenerFechaHoy(), [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.cargarMedicamentos();
    this.cargarSalidas();
    this.cargarEstadisticas();
    
    // Escuchar cambios en medicamento seleccionado
    this.salidaForm.get('fkmedicina')?.valueChanges.subscribe(idmedicina => {
      this.onMedicamentoChange(idmedicina);
    });
    
    // Escuchar cambios en cantidad
    this.salidaForm.get('cantidad')?.valueChanges.subscribe(cantidad => {
      this.calcularStockResultante();
    });
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

  obtenerFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  // CARGAR DATOS
  cargarMedicamentos(): void {
    this.inventarioService.obtenerMedicamentos().subscribe({
      next: (medicamentos) => {
        // Solo medicamentos activos con stock
        this.medicamentos = medicamentos.filter(m => m.estado === 1 && m.unidades > 0);
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar medicamentos');
      }
    });
  }

  cargarSalidas(): void {
    this.loading = true;
    this.inventarioSalidaService.obtenerSalidas().subscribe({
      next: (salidas) => {
        this.salidas = salidas;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar salidas');
        this.loading = false;
      }
    });
  }

  cargarEstadisticas(): void {
    this.inventarioSalidaService.obtenerEstadisticas().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
      },
      error: (error) => {
      }
    });
  }

  // FILTROS
  aplicarFiltros(): void {
    let salidasFiltradas = [...this.salidas];
    
    // Filtro por estado
    if (this.filtroEstado === 'activas') {
      salidasFiltradas = salidasFiltradas.filter(s => s.estado === 1);
    } else if (this.filtroEstado === 'anuladas') {
      salidasFiltradas = salidasFiltradas.filter(s => s.estado === 0);
    }
    
    // Filtro por búsqueda
    if (this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase();
      salidasFiltradas = salidasFiltradas.filter(s =>
        s.medicamento?.nombre.toLowerCase().includes(busquedaLower) ||
        s.medicamento?.codigoproducto?.toLowerCase().includes(busquedaLower) ||
        s.motivo?.toLowerCase().includes(busquedaLower) ||
        s.destino?.toLowerCase().includes(busquedaLower)
      );
    }
    
    this.salidas = salidasFiltradas;
    this.currentPage = 1;
    this.updatePagination();
  }

  cambiarFiltroEstado(filtro: typeof this.filtroEstado): void {
    this.filtroEstado = filtro;
    this.cargarSalidas();
  }

  buscarSalidas(): void {
    this.aplicarFiltros();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.buscarSalidas();
  }

  // PAGINACIÓN
  updatePagination(): void {
    this.totalItems = this.salidas.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    this.updatePaginatedSalidas();
  }

  updatePaginatedSalidas(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.salidasPaginadas = this.salidas.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedSalidas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedSalidas();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedSalidas();
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

  // MODAL NUEVA SALIDA
  abrirModalNueva(): void {
    this.salidaForm.reset({
      cantidad: 1,
      fechasalida: this.obtenerFechaHoy()
    });
    this.medicamentoSeleccionado = null;
    this.stockResultante = 0;
    this.mostrarModalNueva = true;
  }

  cerrarModalNueva(): void {
    this.mostrarModalNueva = false;
    this.salidaForm.reset();
    this.medicamentoSeleccionado = null;
    this.stockResultante = 0;
  }

  onMedicamentoChange(idmedicina: any): void { 
    const id = idmedicina ? parseInt(idmedicina.toString()) : null;
    
    if (!id) {
      this.medicamentoSeleccionado = null;
      this.stockResultante = 0;
      return;
    }
    
    const medicamento = this.medicamentos.find(m => m.idmedicina === id);
    if (medicamento) {
      this.medicamentoSeleccionado = medicamento;
      this.calcularStockResultante();
    } else {
      this.medicamentoSeleccionado = null;
      this.stockResultante = 0;
    }
  }

  calcularStockResultante(): void {
    if (!this.medicamentoSeleccionado) {
      this.stockResultante = 0;
      return;
    }
    
    const cantidad = this.salidaForm.get('cantidad')?.value || 0;
    this.stockResultante = this.inventarioSalidaService.calcularStockResultante(
      this.medicamentoSeleccionado.unidades,
      cantidad
    );
  }

guardarSalida(): void {
  if (!this.salidaForm.valid) {
    this.marcarFormularioComoTocado();
    this.alerta.alertaError('Por favor complete todos los campos requeridos');
    return;
  }

  if (!this.medicamentoSeleccionado) {
    this.alerta.alertaError('Debe seleccionar un medicamento');
    return;
  }

  // Validar cantidad
  const cantidad = this.salidaForm.value.cantidad;
  const validacion = this.inventarioSalidaService.validarCantidad(
    cantidad, 
    this.medicamentoSeleccionado.unidades
  );

  if (!validacion.valido) {
    this.alerta.alertaError(validacion.mensaje || 'Cantidad inválida');
    return;
  }

  this.guardando = true;
  
  const datos: CrearSalidaRequest = {
    fkmedicina: parseInt(this.salidaForm.value.fkmedicina.toString()),
    fkusuario: this.usuarioActual.idusuario,
    cantidad: parseInt(cantidad.toString()), // ← Asegurar que sea número
    motivo: this.salidaForm.value.motivo?.trim() || undefined,
    destino: this.salidaForm.value.destino?.trim() || undefined,
    observaciones: this.salidaForm.value.observaciones?.trim() || undefined,
    fechasalida: this.salidaForm.value.fechasalida,
    usuariocreacion: this.usuarioActual.usuario
  };

  this.inventarioSalidaService.crearSalida(datos).subscribe({
    next: (salida) => {
      this.alerta.alertaExito(`Salida registrada. Stock actual: ${salida.stockActual} unidades`);
      this.cerrarModalNueva();
      this.cargarSalidas();
      this.cargarEstadisticas();
      this.cargarMedicamentos();
      this.guardando = false;
    },
    error: (error) => {
      
      // Mostrar el error completo al usuario para debugging
      const mensajeError = error.error?.message || error.error?.errores?.join(', ') || 'Error al registrar salida';
      this.alerta.alertaError(mensajeError);
      this.guardando = false;
    }
  });
}

  // MODAL DETALLE
  verDetalleSalida(salida: Salida): void {
    this.inventarioSalidaService.obtenerSalidaPorId(salida.idsalida).subscribe({
      next: (detalle) => {
        this.salidaSeleccionada = detalle;
        this.mostrarModalDetalle = true;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar el detalle');
      }
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.salidaSeleccionada = null;
  }

  // ANULAR SALIDA
  anularSalida(salida: Salida): void {
    if (salida.estado === 0) {
      this.alerta.alertaError('Esta salida ya está anulada');
      return;
    }

    this.alerta.alertaConfirmacion(
      '¿Anular salida?',
      `Se devolverán ${salida.cantidad} unidades de ${salida.medicamento?.nombre} al inventario`,
      'Sí, anular',
      'Cancelar'
    ).then((confirmado: boolean) => {
      if (confirmado) {
        this.inventarioSalidaService.anularSalida(salida.idsalida, this.usuarioActual.usuario).subscribe({
          next: (resultado) => {
            this.alerta.alertaExito(`Salida anulada. Stock restaurado: ${resultado.stockRestaurado} unidades`);
            this.cargarSalidas();
            this.cargarEstadisticas();
            this.cargarMedicamentos(); // Actualizar stock
          },
          error: (error) => {
            this.alerta.alertaError(error.error?.message || 'Error al anular salida');
          }
        });
      }
    });
  }

  // HISTORIAL POR MEDICAMENTO
  verHistorialMedicamento(idmedicina: number): void {
    this.loading = true;
    this.inventarioSalidaService.obtenerSalidasPorMedicamento(idmedicina).subscribe({
      next: (salidas) => {
        this.salidasHistorial = salidas;
        const medicamento = this.medicamentos.find(m => m.idmedicina === idmedicina);
        if (medicamento) {
          this.medicamentoSeleccionado = medicamento;
        }
        this.mostrarModalHistorial = true;
        this.loading = false;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar historial');
        this.loading = false;
      }
    });
  }

  cerrarModalHistorial(): void {
    this.mostrarModalHistorial = false;
    this.salidasHistorial = [];
    this.medicamentoSeleccionado = null;
  }

  // VALIDACIÓN
  private marcarFormularioComoTocado(): void {
    Object.keys(this.salidaForm.controls).forEach(key => {
      const control = this.salidaForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.salidaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.salidaForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return 'La cantidad debe ser mayor a 0';
    }
    return '';
  }

  // UTILIDADES
  obtenerContadorActivas(): number {
    return this.salidas.filter(s => s.estado === 1).length;
  }

  obtenerContadorAnuladas(): number {
    return this.salidas.filter(s => s.estado === 0).length;
  }

  obtenerTotalUnidadesSalidas(): number {
    return this.salidas
      .filter(s => s.estado === 1)
      .reduce((total, s) => total + s.cantidad, 0);
  }

  obtenerColorStock(stock: number): string {
    return this.inventarioSalidaService.obtenerColorStock(stock);
  }
}