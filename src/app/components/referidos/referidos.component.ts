// src/app/components/referidos/referidos.component.ts
import { Component, OnInit, AfterViewInit, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  ReferidosService, 
  Referido, 
  CrearReferidoRequest 
} from '../../services/referidos.service';
import { ServicioPaciente, Paciente } from '../../services/paciente.service';
import { ServicioExpediente, Expediente } from '../../services/expediente.service';
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { ArchivoService } from '../../services/archivo.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';

interface Clinica {
  idclinica: number;
  nombreclinica: string;
}

@Component({
  selector: 'app-referidos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './referidos.component.html',
  styleUrls: ['./referidos.component.scss']
})
export class ReferidosComponent implements OnInit, AfterViewInit {

  @Input() pacienteExterno: Paciente | null = null;
  @Output() modalCerrado = new EventEmitter<void>();

  sidebarExpanded = true;
  loading = false;
  guardando = false;
  confirmando = false;
  
  // Usuario actual
  userInfo: any = {};
  usuarioActual: any = null;
  esAdmin = false;
  
  // Datos
  referidos: Referido[] = [];
  pacientes: Paciente[] = [];
  clinicas: Clinica[] = [];
  medicos: Usuario[] = [];
  expedientesDisponibles: Expediente[] = [];
  
  // Filtros y búsqueda
  filtroActivo: 'pendientes' | 'enviados' | 'recibidos' | 'completados' | '' = 'pendientes';
  busqueda = '';
  
  // Paginación
  pagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  };
  
  // Contadores
  contadores = {
    pendientes: 0,
    enviados: 0,
    recibidos: 0,
    completados: 0
  };
  
  // Modales
  mostrarModalNuevo = false;
  mostrarModalDetalle = false;
  mostrarModalConfirmacion = false;
  
  // Formularios
  referidoForm: FormGroup;
  
  // Selección
  referidoSeleccionado: Referido | null = null;
  comentarioConfirmacion = '';

  // Modificación
  mostrarModalEditar = false;
  referidoEnEdicion: Referido | null = null;
  referidoEditForm: FormGroup;

  // Buscador en modal
  busquedaPaciente = '';
  pacientesFiltrados: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  mostrarListaPacientes = false;

  // Propiedades para manejo de documentos (simplificadas)
  archivoDocumentoInicial: File | null = null;
  archivoDocumentoFinal: File | null = null;
  subiendoDocumento = false;

  // URLs de documentos para previsualización
  urlDocumentoInicial: string | null = null;
  urlDocumentoFinal: string | null = null;
  
  // Paginación local
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  referidosPaginados: Referido[] = [];
  Math = Math;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    public referidosService: ReferidosService,
    private alerta: AlertaService,
    private servicioPaciente: ServicioPaciente,
    private usuarioService: UsuarioService,  
    private archivoService: ArchivoService 
  ) {
    this.referidoForm = this.fb.group({
      fkpaciente: ['', Validators.required],
      fkexpediente: ['', Validators.required],
      fkclinica: ['', Validators.required],
      fkusuariodestino: ['', Validators.required],
      comentario: ['', [Validators.required, Validators.minLength(10)]]
    });

    this.referidoEditForm = this.fb.group({
    fkclinica: ['', Validators.required],
    fkusuariodestino: ['', Validators.required],
    comentario: ['', [Validators.required, Validators.minLength(10)]]
  });
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.cargarDatosIniciales();    
    if (this.pacienteExterno) {
      setTimeout(() => {
        this.pacienteSeleccionado = this.pacienteExterno;
        this.busquedaPaciente = `${this.pacienteExterno!.nombres} ${this.pacienteExterno!.apellidos}`;
        this.referidoForm.patchValue({ 
          fkpaciente: this.pacienteExterno!.idpaciente 
        });
        this.onPacienteChange();
        this.mostrarModalNuevo = true;
      }, 100);
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
        
        this.esAdmin = this.usuarioActual.fkrol === 1;
      }
    } catch (error) {
      console.error('Error loading user info:', error);
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

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarPacientes();
      await this.cargarClinicas();
      await this.cargarMedicos();
      await this.cargarReferidos();
    } catch (error) {
      this.alerta.alertaError('Error al cargar los datos');
    } finally {
      this.loading = false;
    }
  }

  cargarReferidos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.referidosService.obtenerReferidos(
        this.filtroActivo || undefined,
        this.busqueda || undefined,
        this.pagination.page,
        this.pagination.limit
      ).subscribe({
        next: (response) => {
          this.referidos = response.data;
          this.pagination = response.pagination;
          this.actualizarContadores();
          
          this.currentPage = 1;
          this.updatePagination();
          
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  cargarPacientes(): Promise<void> {
    return new Promise((resolve) => {
      this.servicioPaciente.obtenerTodosLosPacientes(1, 1000).subscribe({
        next: (response: any) => {
          if (response.exito && response.datos) {
            const pacientesArray = Array.isArray(response.datos) ? response.datos : [response.datos];
            
            this.pacientes = pacientesArray.map((p: any) => ({
              idpaciente: p.idpaciente!,
              nombres: p.nombres,
              apellidos: p.apellidos,
              cui: p.cui,
              fechanacimiento: p.fechanacimiento,
              genero: p.genero,
              tipoconsulta: p.tipoconsulta,
              municipio: p.municipio,
              direccion: p.direccion,
              expedientes: p.expedientes || []
            }));

            this.pacientesFiltrados = this.pacientes;
            resolve();
          } else {
            this.pacientes = [];
            this.pacientesFiltrados = [];
            resolve();
          }
        },
        error: (error: any) => {
          this.pacientes = [];
          this.pacientesFiltrados = [];
          resolve();
        }
      });
    });
  }

  cargarClinicas(): Promise<void> {
    return new Promise((resolve) => {
      this.clinicas = [
        { idclinica: 1, nombreclinica: 'Medicina General' },
        { idclinica: 2, nombreclinica: 'Psicología' },
        { idclinica: 3, nombreclinica: 'Fisioterapia' },
        { idclinica: 4, nombreclinica: 'Nutrición' },
        { idclinica: 5, nombreclinica: 'Educación Inclusiva' }
      ];
      resolve();
    });
  }

  cargarMedicos(): Promise<void> {
    return new Promise((resolve) => {
      this.usuarioService.obtenerUsuarios().subscribe({
        next: (usuarios: any) => {
          this.medicos = usuarios.filter((u: any) => u.estado === 1);
          resolve();
        },
        error: (error: any) => {
          this.medicos = [];
          resolve();
        }
      });
    });
  }

  // ============================================================================
  // PAGINACIÓN
  // ============================================================================

  updatePagination(): void {
    this.totalItems = this.referidos.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = Math.max(1, this.totalPages);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedReferidos();
  }

  updatePaginatedReferidos(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.referidosPaginados = this.referidos.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedReferidos();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedReferidos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedReferidos();
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

  getDisplayRange(): string {
    if (this.totalItems === 0) return '0 - 0';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start} - ${end}`;
  }

  // ============================================================================
  // FILTROS Y BÚSQUEDA
  // ============================================================================

  actualizarContadores(): void {
    ['pendientes', 'enviados', 'recibidos', 'completados'].forEach(tipo => {
      this.referidosService.obtenerReferidos(tipo as any, undefined, 1, 1)
        .subscribe({
          next: (response) => {
            this.contadores[tipo as keyof typeof this.contadores] = response.pagination.total;
          }
        });
    });
  }

  cambiarFiltro(filtro: typeof this.filtroActivo): void {
    this.filtroActivo = filtro;
    this.pagination.page = 1;
    this.cargarReferidos();
  }

  buscarReferidos(): void {
    this.pagination.page = 1;
    this.cargarReferidos();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.buscarReferidos();
  }

  cambiarPagina(page: number): void {
    this.pagination.page = page;
    this.cargarReferidos();
  }

  // ============================================================================
  // MODAL NUEVO REFERIDO
  // ============================================================================

  filtrarPacientes(): void {
    const busqueda = this.busquedaPaciente.toLowerCase().trim();
    
    if (!busqueda) {
      this.pacientesFiltrados = this.pacientes;
      return;
    }
    
    this.pacientesFiltrados = this.pacientes.filter(p => 
      p.nombres.toLowerCase().includes(busqueda) ||
      p.apellidos.toLowerCase().includes(busqueda) ||
      p.cui.includes(busqueda)
    );
  }

  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.busquedaPaciente = `${paciente.nombres} ${paciente.apellidos}`;
    this.mostrarListaPacientes = false;
    this.referidoForm.patchValue({ fkpaciente: paciente.idpaciente });
    this.onPacienteChange();
  }

  limpiarSeleccionPaciente(): void {
    this.pacienteSeleccionado = null;
    this.busquedaPaciente = '';
    this.pacientesFiltrados = this.pacientes;
    this.referidoForm.patchValue({ fkpaciente: '' });
    this.expedientesDisponibles = [];
  }

  abrirModalNuevoReferido(): void {
    this.referidoForm.reset();
    this.expedientesDisponibles = [];
    this.archivoDocumentoInicial = null;
    this.mostrarModalNuevo = true;
  }

  onPacienteChange(): void {
    const idPaciente = this.referidoForm.get('fkpaciente')?.value;
    
    if (idPaciente) {
      const paciente = this.pacientes.find(p => p.idpaciente === parseInt(idPaciente));
      this.expedientesDisponibles = paciente?.expedientes || [];
      
      if (this.expedientesDisponibles.length === 0) {
        this.alerta.alertaPreventiva('Este paciente no tiene expedientes disponibles');
      }
    } else {
      this.expedientesDisponibles = [];
    }
    
    this.referidoForm.patchValue({ fkexpediente: '' });
  }

  // GUARDAR REFERIDO (usando lógica de usuarios)
  // src/app/components/referidos/referidos.component.ts

  async guardarReferido(): Promise<void> {
    if (!this.referidoForm.valid) {
      this.marcarFormularioComoTocado();
      this.alerta.alertaError('Por favor complete todos los campos requeridos');
      return;
    }

    if (!this.pacienteSeleccionado) {
      this.alerta.alertaError('Debe seleccionar un paciente');
      return;
    }

    this.guardando = true;
    
    const fkpaciente = parseInt(this.referidoForm.value.fkpaciente);
    const fkexpediente = parseInt(this.referidoForm.value.fkexpediente);
    const fkclinica = parseInt(this.referidoForm.value.fkclinica);
    const fkusuariodestino = parseInt(this.referidoForm.value.fkusuariodestino);
    const comentario = this.referidoForm.value.comentario?.trim();

    if (isNaN(fkpaciente) || isNaN(fkexpediente) || isNaN(fkclinica) || isNaN(fkusuariodestino)) {
      this.alerta.alertaError('Error en los datos del formulario');
      this.guardando = false;
      return;
    }

    if (!comentario || comentario.length < 10) {
      this.alerta.alertaError('El motivo del referido debe tener al menos 10 caracteres');
      this.guardando = false;
      return;
    }

    try {
      // ✅ CORRECTO: Subir documento usando el método del service
      let rutaDocumentoInicial = '';
      
      if (this.archivoDocumentoInicial) {
        const resultado = await this.referidosService.subirDocumentoInicial(
          0, // Temporal
          this.archivoDocumentoInicial
        );
        rutaDocumentoInicial = resultado.rutadocumentoinicial;
      }

      // 2. Crear referido con la ruta del documento
      const datos: CrearReferidoRequest = {
        fkpaciente,
        fkexpediente,
        fkclinica,
        fkusuariodestino,
        comentario,
        rutadocumentoinicial: rutaDocumentoInicial || undefined
      };

      this.referidosService.crearReferido(datos).subscribe({
        next: (referidoCreado) => {
          this.alerta.alertaExito('Referido creado exitosamente');
          this.cerrarModalNuevo();
          this.cargarReferidos();
          this.guardando = false;
        },
        error: (error) => {
          let mensajeError = 'Error al crear el referido';
          
          if (error.error?.mensaje) mensajeError = error.error.mensaje;
          else if (error.error?.message) mensajeError = error.error.message;
          else if (error.message) mensajeError = error.message;
          
          this.alerta.alertaError(mensajeError);
          this.guardando = false;
        }
      });

    } catch (error: any) {
      this.alerta.alertaError(error.message || 'Error al procesar el referido');
      this.guardando = false;
    }
  }
  cerrarModalNuevo(): void {
    this.mostrarModalNuevo = false;
    this.referidoForm.reset();
    this.pacienteSeleccionado = null;
    this.busquedaPaciente = '';
    this.archivoDocumentoInicial = null;
    this.modalCerrado.emit(); 
  }

  // ============================================================================
// MODAL EDITAR REFERIDO
// ============================================================================



cerrarModalEditar(): void {
  this.mostrarModalEditar = false;
  this.referidoEnEdicion = null;
  this.referidoEditForm.reset();
}

guardarEdicion(): void {
  if (!this.referidoEditForm.valid || !this.referidoEnEdicion) {
    this.marcarFormularioComoTocadoEdit();
    this.alerta.alertaError('Por favor complete todos los campos requeridos');
    return;
  }

  this.guardando = true;

  const datosActualizar = {
    fkclinica: parseInt(this.referidoEditForm.value.fkclinica),
    fkusuariodestino: parseInt(this.referidoEditForm.value.fkusuariodestino),
    comentario: this.referidoEditForm.value.comentario.trim()
  };

  this.referidosService.actualizarReferido(
    this.referidoEnEdicion.idrefpaciente,
    datosActualizar
  ).subscribe({
    next: (referidoActualizado) => {
      this.alerta.alertaExito('Referido actualizado exitosamente');
      this.cerrarModalEditar();
      this.cargarReferidos();
      this.guardando = false;
    },
    error: (error) => {
      let mensajeError = 'Error al actualizar el referido';
      
      if (error.error?.mensaje) mensajeError = error.error.mensaje;
      else if (error.error?.message) mensajeError = error.error.message;
      else if (error.message) mensajeError = error.message;
      
      this.alerta.alertaError(mensajeError);
      this.guardando = false;
    }
  });
}

// ============================================================================
// VALIDACIÓN DE FORMULARIO DE EDICIÓN
// ============================================================================

private marcarFormularioComoTocadoEdit(): void {
  Object.keys(this.referidoEditForm.controls).forEach(key => {
    const control = this.referidoEditForm.get(key);
    if (control) {
      control.markAsTouched();
    }
  });
}

isFieldInvalidEdit(fieldName: string): boolean {
  const field = this.referidoEditForm.get(fieldName);
  return !!(field && field.invalid && (field.dirty || field.touched));
}

getFieldErrorEdit(fieldName: string): string {
  const field = this.referidoEditForm.get(fieldName);
  if (field && field.errors && (field.dirty || field.touched)) {
    if (field.errors['required']) {
      return `${this.getFieldDisplayName(fieldName)} es requerido`;
    }
    if (field.errors['minlength']) {
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
  }
  return '';
}

  // ============================================================================
  // MODAL DETALLE
  // ============================================================================

  verDetalleReferido(referido: Referido): void {
    this.referidosService.obtenerReferidoPorId(referido.idrefpaciente).subscribe({
      next: (detalle) => {
        this.referidoSeleccionado = detalle;
        this.actualizarUrlsDocumentos();
        this.mostrarModalDetalle = true;
      },
      error: (error) => {
        this.alerta.alertaError('Error al cargar el detalle del referido');
      }
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.referidoSeleccionado = null;
  }

  // ============================================================================
  // CONFIRMACIÓN
  // ============================================================================

  confirmarReferido(referido: Referido): void {
    this.referidoSeleccionado = referido;
    this.comentarioConfirmacion = '';
    this.mostrarModalConfirmacion = true;
  }

  confirmarDesdeDetalle(): void {
    this.cerrarModalDetalle();
    this.mostrarModalConfirmacion = true;
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.comentarioConfirmacion = '';
  }

  ejecutarConfirmacion(): void {
    if (!this.referidoSeleccionado) return;

    this.confirmando = true;

    this.referidosService.confirmarReferido(
      this.referidoSeleccionado.idrefpaciente,
      this.comentarioConfirmacion || undefined
    ).subscribe({
      next: (referido) => {
        this.alerta.alertaExito('Referido aprobado exitosamente');
        this.cerrarModalConfirmacion();
        this.cargarReferidos();
        this.confirmando = false;
      },
      error: (error) => {
        this.alerta.alertaError(
          error.error?.mensaje || error.error?.message || 'Error al aprobar el referido'
        );
        this.confirmando = false;
      }
    });
  }

  // ============================================================================
  // EDITAR Y ELIMINAR
  // ============================================================================

  editarReferido(referido: Referido): void {
  this.referidosService.obtenerReferidoPorId(referido.idrefpaciente).subscribe({
    next: (detalle) => {
      this.referidoEnEdicion = detalle;
      
      this.referidoEditForm.patchValue({
        fkclinica: detalle.fkclinica,
        fkusuariodestino: detalle.fkusuariodestino,
        comentario: detalle.comentario
      });
      
      this.mostrarModalEditar = true;
    },
    error: (error) => {
      this.alerta.alertaError('Error al cargar los datos del referido');
    }
  });
}

  eliminarReferido(referido: Referido): void {
    this.alerta.alertaConfirmacion(
      '¿Eliminar referido?',
      'Esta acción cambiará el estado del referido a inactivo',
      'Sí, eliminar',
      'Cancelar'
    ).then((confirmado: boolean) => {
      if (confirmado) {
        this.referidosService.cambiarEstado(referido.idrefpaciente, 0).subscribe({
          next: () => {
            this.alerta.alertaExito('Referido eliminado correctamente');
            this.cargarReferidos();
          },
          error: (error) => {
            this.alerta.alertaError('Error al eliminar el referido');
          }
        });
      }
    });
  }

  // ============================================================================
  // GESTIÓN DE DOCUMENTOS
  // ============================================================================

  // Seleccionar archivo documento inicial (al crear)
  onDocumentoInicialSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        this.alerta.alertaError('Solo se permiten imágenes (JPG, PNG, WebP) o archivos PDF');
        input.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.alerta.alertaError('El archivo no puede superar los 10MB');
        input.value = '';
        return;
      }
      
      this.archivoDocumentoInicial = file;
    }
  }

  // Seleccionar archivo documento final
  onDocumentoFinalSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        this.alerta.alertaError('Solo se permiten imágenes (JPG, PNG, WebP) o archivos PDF');
        input.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.alerta.alertaError('El archivo no puede superar los 10MB');
        input.value = '';
        return;
      }
      
      this.archivoDocumentoFinal = file;
    }
  }

  // ✅ Subir documento inicial (desde detalle)
  async subirDocumentoInicial(): Promise<void> {
    if (!this.referidoSeleccionado || !this.archivoDocumentoInicial) {
      this.alerta.alertaError('No hay archivo seleccionado');
      return;
    }

    this.subiendoDocumento = true;

    try {
      // Subir usando ArchivoService
      const resultado = await this.referidosService.subirDocumentoInicial(
        this.referidoSeleccionado.idrefpaciente,
        this.archivoDocumentoInicial
      );

      // Actualizar referido con la ruta
      this.referidosService.actualizarReferido(
        this.referidoSeleccionado.idrefpaciente,
        { rutadocumentoinicial: resultado.rutadocumentoinicial }
      ).subscribe({
        next: (referidoActualizado) => {
          this.alerta.alertaExito('Documento inicial subido correctamente');
          this.referidoSeleccionado = referidoActualizado;
          this.archivoDocumentoInicial = null;
          this.actualizarUrlsDocumentos();
          this.cargarReferidos();
          this.subiendoDocumento = false;
          
          const input = document.getElementById('inputDocumentoInicial') as HTMLInputElement;
          if (input) input.value = '';
        },
        error: (error) => {
          this.alerta.alertaError(error.error?.mensaje || 'Error al actualizar referido');
          this.subiendoDocumento = false;
        }
      });

    } catch (error: any) {
      this.alerta.alertaError(error.message || 'Error al subir documento');
      this.subiendoDocumento = false;
    }
  }

  // ✅ Subir documento final
  async subirDocumentoFinal(): Promise<void> {
    if (!this.referidoSeleccionado || !this.archivoDocumentoFinal) {
      this.alerta.alertaError('No hay archivo seleccionado');
      return;
    }

    this.subiendoDocumento = true;

    try {
      const resultado = await this.referidosService.subirDocumentoFinal(
        this.referidoSeleccionado.idrefpaciente,
        this.archivoDocumentoFinal
      );

      this.referidosService.actualizarReferido(
        this.referidoSeleccionado.idrefpaciente,
        { rutadocumentofinal: resultado.rutadocumentofinal } as any
      ).subscribe({
        next: (referidoActualizado) => {
          this.alerta.alertaExito('Documento final subido correctamente');
          this.referidoSeleccionado = referidoActualizado;
          this.archivoDocumentoFinal = null;
          this.actualizarUrlsDocumentos();
          this.cargarReferidos();
          this.subiendoDocumento = false;
          
          const input = document.getElementById('inputDocumentoFinal') as HTMLInputElement;
          if (input) input.value = '';
        },
        error: (error) => {
          this.alerta.alertaError(error.error?.mensaje || 'Error al actualizar referido');
          this.subiendoDocumento = false;
        }
      });

    } catch (error: any) {
      this.alerta.alertaError(error.message || 'Error al subir documento');
      this.subiendoDocumento = false;
    }
  }

  // Eliminar documento inicial
  async eliminarDocumentoInicial(): Promise<void> {
  if (!this.referidoSeleccionado || !this.referidoSeleccionado.rutadocumentoinicial) return;

  const confirmado = await this.alerta.alertaConfirmacion(
    '¿Eliminar documento inicial?',
    'Esta acción no se puede deshacer',
    'Sí, eliminar',
    'Cancelar'
  );

  if (confirmado) {
    try {
      // Eliminar archivo físico
      await this.archivoService.eliminarArchivo(this.referidoSeleccionado.rutadocumentoinicial);
      
      // Actualizar BD (quitar ruta)
      this.referidosService.actualizarReferido(
        this.referidoSeleccionado.idrefpaciente,
        { rutadocumentoinicial: '' } as any
      ).subscribe({
        next: (referidoActualizado) => {
          this.alerta.alertaExito('Documento eliminado correctamente');
          this.referidoSeleccionado = referidoActualizado;
          this.actualizarUrlsDocumentos();
          this.cargarReferidos();
        },
        error: (error) => {
          this.alerta.alertaError('Error al actualizar referido');
        }
      });
    } catch (error: any) {
      this.alerta.alertaError(error.message || 'Error al eliminar documento');
    }
  }
}

  // Eliminar documento final
  async eliminarDocumentoFinal(): Promise<void> {
    if (!this.referidoSeleccionado || !this.referidoSeleccionado.rutadocumentofinal) return;

    const confirmado = await this.alerta.alertaConfirmacion(
      '¿Eliminar documento final?',
      'Esta acción no se puede deshacer',
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmado) {
      try {
        await this.archivoService.eliminarArchivo(this.referidoSeleccionado.rutadocumentofinal);
        
        this.referidosService.actualizarReferido(
          this.referidoSeleccionado.idrefpaciente,
          { rutadocumentofinal: '' } as any
        ).subscribe({
          next: (referidoActualizado) => {
            this.alerta.alertaExito('Documento eliminado correctamente');
            this.referidoSeleccionado = referidoActualizado;
            this.actualizarUrlsDocumentos();
            this.cargarReferidos();
          },
          error: (error) => {
            this.alerta.alertaError('Error al actualizar referido');
          }
        });
      } catch (error: any) {
        this.alerta.alertaError(error.message || 'Error al eliminar documento');
      }
    }
  }

  // Descargar documento
  descargarDocumento(url: string, nombreArchivo: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Actualizar URLs de documentos
  actualizarUrlsDocumentos(): void {
    if (this.referidoSeleccionado) {
      this.urlDocumentoInicial = this.referidosService.obtenerUrlDocumento(
        this.referidoSeleccionado.rutadocumentoinicial
      );
      this.urlDocumentoFinal = this.referidosService.obtenerUrlDocumento(
        this.referidoSeleccionado.rutadocumentofinal
      );
    }
  }

  // Limpiar archivo
  limpiarArchivoInicial(): void {
    this.archivoDocumentoInicial = null;
    const input = document.getElementById('inputDocumentoCrear') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Obtener nombre del archivo
  obtenerNombreArchivo(ruta: string | undefined): string {
    if (!ruta) return '';
    return ruta.split('/').pop() || '';
  }

  // ============================================================================
  // PERMISOS
  // ============================================================================

  puedeConfirmar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;

    if (referido.confirmacion4 === 1) return false;

    if (referido.confirmacion2 === 0 && referido.confirmacion1 === 1) {
      return this.esAdmin;
    }

    if (referido.confirmacion3 === 0 && referido.confirmacion2 === 1) {
      return this.esAdmin && referido.usuarioconfirma2 !== this.usuarioActual.usuario;
    }

    if (referido.confirmacion4 === 0 && referido.confirmacion3 === 1) {
      return referido.fkusuariodestino === this.usuarioActual.idusuario;
    }

    return false;
  }

  puedeEditar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;
    if (referido.confirmacion4 === 1) return false;
    return this.esAdmin || referido.fkusuario === this.usuarioActual.idusuario;
  }

  puedeEliminar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;
    return this.esAdmin || referido.fkusuario === this.usuarioActual.idusuario;
  }

  puedeSubirDocumentoInicial(): boolean {
    if (!this.referidoSeleccionado || !this.usuarioActual) return false;
    return this.referidosService.puedeSubirDocumentoInicial(
      this.referidoSeleccionado,
      this.usuarioActual,
      this.esAdmin
    );
  }

  puedeSubirDocumentoFinal(): boolean {
    if (!this.referidoSeleccionado || !this.usuarioActual) return false;
    return this.referidosService.puedeSubirDocumentoFinal(
      this.referidoSeleccionado,
      this.usuarioActual
    );
  }

  // ============================================================================
  // VALIDACIÓN DE FORMULARIOS
  // ============================================================================

  private marcarFormularioComoTocado(): void {
    Object.keys(this.referidoForm.controls).forEach(key => {
      const control = this.referidoForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.referidoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.referidoForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} es requerido`;
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'fkpaciente': 'Paciente',
      'fkexpediente': 'Expediente',
      'fkclinica': 'Clínica',
      'fkusuariodestino': 'Médico destino',
      'comentario': 'Motivo del referido'
    };
    return fieldNames[fieldName] || fieldName;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-select-container')) {
      this.mostrarListaPacientes = false;
    }
  }
}