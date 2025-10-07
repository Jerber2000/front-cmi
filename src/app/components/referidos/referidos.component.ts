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

  //buscador en modal
  busquedaPaciente = '';
  pacientesFiltrados: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  mostrarListaPacientes = false;


  
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
  }

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  referidosPaginados: Referido[] = [];
  Math = Math;

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
        
        // NUEVO: Actualizar paginación local
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
  
  // Actualizar paginación local
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


  actualizarContadores(): void {
    // Cargar contadores de cada tipo
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

  // MODAL NUEVO REFERIDO

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
          this.pacientesFiltrados = []; // ← IMPORTANTE
          resolve();
        }
      },
      error: (error: any) => {
        this.pacientes = [];
        this.pacientesFiltrados = []; // ← IMPORTANTE
        resolve();
      }
    });
  });
}

  abrirModalNuevoReferido(): void {
    this.referidoForm.reset();
    this.expedientesDisponibles = [];
    this.mostrarModalNuevo = true;
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo = false;
    this.referidoForm.reset();
    this.pacienteSeleccionado = null;
    this.busquedaPaciente = '';
    this.modalCerrado.emit(); 
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

  guardarReferido(): void {
  // Validar formulario
  if (!this.referidoForm.valid) {
    this.marcarFormularioComoTocado();
    this.alerta.alertaError('Por favor complete todos los campos requeridos');
    return;
  }

  // Validar que haya paciente seleccionado
  if (!this.pacienteSeleccionado) {
    this.alerta.alertaError('Debe seleccionar un paciente');
    return;
  }

  this.guardando = true;
  
  // Obtener y validar valores
  const fkpaciente = parseInt(this.referidoForm.value.fkpaciente);
  const fkexpediente = parseInt(this.referidoForm.value.fkexpediente);
  const fkclinica = parseInt(this.referidoForm.value.fkclinica);
  const fkusuariodestino = parseInt(this.referidoForm.value.fkusuariodestino);
  const comentario = this.referidoForm.value.comentario?.trim();

  // Validar que ningún valor sea NaN
  if (isNaN(fkpaciente) || isNaN(fkexpediente) || isNaN(fkclinica) || isNaN(fkusuariodestino)) {
    this.alerta.alertaError('Error en los datos del formulario');
    this.guardando = false;
    return;
  }

  // Validar comentario
  if (!comentario || comentario.length < 10) {
    this.alerta.alertaError('El motivo del referido debe tener al menos 10 caracteres');
    this.guardando = false;
    return;
  }

  const datos: CrearReferidoRequest = {
    fkpaciente,
    fkexpediente,
    fkclinica,
    fkusuariodestino,
    comentario
  };

  // Log para debug (puedes eliminarlo después

  this.referidosService.crearReferido(datos).subscribe({
    next: (referido) => {
      this.alerta.alertaExito('Referido creado exitosamente');
      this.cerrarModalNuevo();
      this.cargarReferidos();
      this.guardando = false;
    },
    error: (error) => {
      
      let mensajeError = 'Error al crear el referido';
      
      if (error.error) {
        if (typeof error.error === 'string') {
          mensajeError = error.error;
        } else if (error.error.mensaje) {
          mensajeError = error.error.mensaje;
        } else if (error.error.message) {
          mensajeError = error.error.message;
        } else if (error.error.error) {
          mensajeError = error.error.error;
        }
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      this.alerta.alertaError(mensajeError);
      this.guardando = false;
    }
  });
}

  // MODAL DETALLE
  verDetalleReferido(referido: Referido): void {
    this.referidosService.obtenerReferidoPorId(referido.idrefpaciente).subscribe({
      next: (detalle) => {
        this.referidoSeleccionado = detalle;
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

  // CONFIRMACIÓN
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

  // EDITAR
  editarReferido(referido: Referido): void {
    // TODO: Implementar modal de edición
    this.alerta.alertaInfo('Funcionalidad de edición en desarrollo');
  }

  // ELIMINAR
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

  // PERMISOS
  puedeConfirmar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;

    // Si ya está completado, no se puede confirmar
    if (referido.confirmacion4 === 1) return false;

    // Confirmación 2: Admin
    if (referido.confirmacion2 === 0 && referido.confirmacion1 === 1) {
      return this.esAdmin;
    }

    // Confirmación 3: Admin diferente
    if (referido.confirmacion3 === 0 && referido.confirmacion2 === 1) {
      return this.esAdmin && referido.usuarioconfirma2 !== this.usuarioActual.usuario;
    }

    // Confirmación 4: Médico destino
    if (referido.confirmacion4 === 0 && referido.confirmacion3 === 1) {
      return referido.fkusuariodestino === this.usuarioActual.idusuario;
    }

    return false;
  }

  puedeEditar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;
    
    // No se puede editar si está completado
    if (referido.confirmacion4 === 1) return false;
    
    // Solo el creador o admin pueden editar
    return this.esAdmin || referido.fkusuario === this.usuarioActual.idusuario;
  }

  puedeEliminar(referido: Referido): boolean {
    if (!referido || !this.usuarioActual) return false;
    
    // Solo el creador o admin pueden eliminar
    return this.esAdmin || referido.fkusuario === this.usuarioActual.idusuario;
  }

  // VALIDACIÓN DE FORMULARIOS
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