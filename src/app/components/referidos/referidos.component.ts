// src/app/components/referidos/referidos.component.ts
import { Component, OnInit, AfterViewInit, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  ReferidosService, 
  Referido, 
  CrearReferidoRequest,
  Clinica  // ✅ Agregado
} from '../../services/referidos.service';
import { ServicioPaciente, Paciente } from '../../services/paciente.service';
import { ServicioExpediente, Expediente } from '../../services/expediente.service';
import { ArchivoService } from '../../services/archivo.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';

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
  clinicas: Clinica[] = [];  // ✅ Tipo correcto
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
  mostrarModalEditar = false;
  
  // Formularios (✅ SIN fkusuariodestino)
  referidoForm: FormGroup;
  referidoEditForm: FormGroup;
  
  // Selección
  referidoSeleccionado: Referido | null = null;
  comentarioConfirmacion = '';
  referidoEnEdicion: Referido | null = null;

  // Buscador en modal
  busquedaPaciente = '';
  pacientesFiltrados: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  mostrarListaPacientes = false;

  // Documentos
  archivoDocumentoInicial: File | null = null;
  archivoDocumentoFinal: File | null = null;
  subiendoDocumento = false;
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
    private archivoService: ArchivoService 
  ) {
    // ✅ FORMULARIO SIN fkusuariodestino
    this.referidoForm = this.fb.group({
      fkpaciente: ['', Validators.required],
      fkexpediente: ['', Validators.required],
      fkclinica: ['', Validators.required],
      comentario: ['', [Validators.required, Validators.minLength(10)]]
    });

    // ✅ FORMULARIO EDITAR SIN fkusuariodestino
    this.referidoEditForm = this.fb.group({
      fkclinica: ['', Validators.required],
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
        
        // ✅ CRÍTICO: Asegurar que fkclinica esté disponible
        console.log('👤 Usuario cargado:', {
          idusuario: this.usuarioActual.idusuario,
          usuario: this.usuarioActual.usuario,
          fkrol: this.usuarioActual.fkrol,
          fkclinica: this.usuarioActual.fkclinica,
          esAdmin: this.esAdmin
        });
        
        // ⚠️ Si fkclinica no existe en localStorage, alertar
        if (this.usuarioActual.fkclinica === undefined || this.usuarioActual.fkclinica === null) {
          console.warn('⚠️ ADVERTENCIA: fkclinica no está en localStorage');
          this.alerta.alertaPreventiva('Tu usuario no tiene clínica asignada. Contacta al administrador.');
        }
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
      await this.cargarClinicas();  // ✅ Ya no carga médicos
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

  // ✅ NUEVO: Cargar clínicas desde BD
  cargarClinicas(): Promise<void> {
    return new Promise((resolve) => {
      this.referidosService.obtenerClinicas().subscribe({
        next: (clinicas: Clinica[]) => {
          this.clinicas = clinicas;
          resolve();
        },
        error: (error: any) => {
          console.error('Error al cargar clínicas:', error);
          this.alerta.alertaError('Error al cargar clínicas');
          this.clinicas = [];
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
      
      // ✅ NUEVO: Auto-seleccionar el primer expediente si existe
      if (this.expedientesDisponibles.length > 0) {
        this.referidoForm.patchValue({ 
          fkexpediente: this.expedientesDisponibles[0].idexpediente 
        });
      } else {
        this.alerta.alertaPreventiva('Este paciente no tiene expedientes disponibles');
        this.referidoForm.patchValue({ fkexpediente: '' });
      }
    } else {
      this.expedientesDisponibles = [];
      this.referidoForm.patchValue({ fkexpediente: '' });
    }
  }

    // Método helper para obtener el número de expediente seleccionado
  obtenerNumeroExpedienteSeleccionado(): string {
    const idExpediente = this.referidoForm.get('fkexpediente')?.value;
    if (idExpediente && this.expedientesDisponibles.length > 0) {
      const expediente = this.expedientesDisponibles.find(e => e.idexpediente === parseInt(idExpediente));
      return expediente?.numeroexpediente || '';
    }
    return '';
  }

  // ✅ GUARDAR REFERIDO (SIN fkusuariodestino)
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
    const comentario = this.referidoForm.value.comentario?.trim();

    if (isNaN(fkpaciente) || isNaN(fkexpediente) || isNaN(fkclinica)) {
      this.alerta.alertaError('Error en los datos del formulario');
      this.guardando = false;
      return;
    }

    try {
      // 1. Crear referido SIN documento
      const datos: CrearReferidoRequest = {
        fkpaciente,
        fkexpediente,
        fkclinica,
        comentario
      };

      this.referidosService.crearReferido(datos).subscribe({
        next: async (referidoCreado) => {
          // 2. Si hay documento, subirlo
          if (this.archivoDocumentoInicial) {
            try {
              const resultado = await this.referidosService.subirDocumentoInicial(
                referidoCreado.idrefpaciente,
                this.archivoDocumentoInicial
              );

              this.referidosService.actualizarReferido(
                referidoCreado.idrefpaciente,
                { rutadocumentoinicial: resultado.rutadocumentoinicial } as any
              ).subscribe({
                next: () => {
                  this.alerta.alertaExito('Referido creado con documento exitosamente');
                  this.cerrarModalNuevo();
                  this.cargarReferidos();
                  this.guardando = false;
                },
                error: (error) => {
                  this.alerta.alertaPreventiva('Referido creado pero error al adjuntar documento');
                  this.cerrarModalNuevo();
                  this.cargarReferidos();
                  this.guardando = false;
                }
              });
            } catch (error: any) {
              this.alerta.alertaPreventiva('Referido creado pero error al subir documento');
              this.cerrarModalNuevo();
              this.cargarReferidos();
              this.guardando = false;
            }
          } else {
            this.alerta.alertaExito('Referido creado exitosamente');
            this.cerrarModalNuevo();
            this.cargarReferidos();
            this.guardando = false;
          }
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
  // MODAL EDITAR REFERIDO (SIN fkusuariodestino)
  // ============================================================================

async editarReferido(referido: Referido): Promise<void> {
  console.log('🔧 === EDITAR REFERIDO ===');
  console.log('Referido a editar:', referido);
  
  // ✅ 1. CERRAR OTROS MODALES PRIMERO
  this.mostrarModalDetalle = false;
  this.mostrarModalConfirmacion = false;
  this.referidoSeleccionado = null;
  
  // ✅ 2. LIMPIAR ARCHIVOS TEMPORALES
  this.archivoDocumentoInicial = null;
  const inputInicial = document.getElementById('inputDocumentoEditarInicial') as HTMLInputElement;
  if (inputInicial) inputInicial.value = '';
  
  // ✅ 3. CARGAR CLÍNICAS SI NO ESTÁN CARGADAS (SIN AWAIT)
  if (this.clinicas.length === 0) {
    console.log('⏳ Cargando clínicas en background...');
    this.cargarClinicas(); // ✅ SIN await - que cargue en paralelo
  }

  // ✅ 4. OBTENER DETALLE DEL REFERIDO
  console.log('⏳ Obteniendo detalle del referido...');
  this.referidosService.obtenerReferidoPorId(referido.idrefpaciente).subscribe({
    next: (detalle) => {
      console.log('✅ Detalle obtenido:', detalle);
      this.referidoEnEdicion = detalle;
      
      // ✅ 5. LLENAR EL FORMULARIO
      this.referidoEditForm.patchValue({
        fkclinica: detalle.fkclinica,
        comentario: detalle.comentario
      });
      
      console.log('✅ Formulario llenado:', this.referidoEditForm.value);
      
      // ✅ 6. ABRIR MODAL
      this.mostrarModalEditar = true;
      console.log('✅ Modal de edición abierto');
    },
    error: (error) => {
      console.error('❌ Error al cargar referido:', error);
      this.alerta.alertaError('Error al cargar los datos del referido');
      this.mostrarModalEditar = false;
      this.referidoEnEdicion = null;
    }
  });
}

cerrarModalEditar(): void {
  console.log('🔴 Cerrando modal de edición');
  this.mostrarModalEditar = false;
  this.referidoEnEdicion = null;
  this.referidoEditForm.reset();
  this.archivoDocumentoInicial = null;
  
  // Limpiar input de archivo
  const inputInicial = document.getElementById('inputDocumentoEditarInicial') as HTMLInputElement;
  if (inputInicial) inputInicial.value = '';
}

async guardarEdicion(): Promise<void> {
  if (!this.referidoEditForm.valid || !this.referidoEnEdicion) {
    this.marcarFormularioComoTocadoEdit();
    this.alerta.alertaError('Por favor complete todos los campos requeridos');
    return;
  }

  this.guardando = true;

  try {
    const datosActualizar: any = {
      fkclinica: parseInt(this.referidoEditForm.value.fkclinica),
      comentario: this.referidoEditForm.value.comentario.trim()
    };

    // Si hay un nuevo archivo, subirlo primero
    if (this.archivoDocumentoInicial) {
      try {
        const resultado = await this.referidosService.subirDocumentoInicial(
          this.referidoEnEdicion.idrefpaciente,
          this.archivoDocumentoInicial
        );
        datosActualizar.rutadocumentoinicial = resultado.rutadocumentoinicial;
      } catch (error: any) {
        this.alerta.alertaPreventiva('Error al subir el nuevo documento, pero se guardarán los demás cambios');
      }
    }

    // Actualizar el referido
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
  } catch (error: any) {
    this.alerta.alertaError(error.message || 'Error al procesar la edición');
    this.guardando = false;
  }
}

  onDocumentoEditarSeleccionado(event: Event): void {
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
  // ============================================================================
  // MODAL DETALLE
  // ============================================================================

verDetalleReferido(referido: Referido): void {
  console.log('🔍 === verDetalleReferido ===');
  console.log('Referido a ver:', referido);
  
  // ✅ CERRAR MODAL DE EDITAR SI ESTÁ ABIERTO
  this.mostrarModalEditar = false;
  this.referidoEnEdicion = null;
  
  this.referidosService.obtenerReferidoPorId(referido.idrefpaciente).subscribe({
    next: (detalle) => {
      console.log('✅ Detalle cargado:', detalle);
      this.referidoSeleccionado = detalle;
      this.actualizarUrlsDocumentos();
      this.mostrarModalDetalle = true;
    },
    error: (error) => {
      console.error('❌ Error al cargar detalle:', error);
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



async confirmarDesdeDetalle(): Promise<void> {
  console.log('🔵 === confirmarDesdeDetalle ===');
  console.log('referidoSeleccionado:', this.referidoSeleccionado);
  
  if (!this.referidoSeleccionado) {
    console.log('❌ No hay referido seleccionado');
    return;
  }

  // ✅ ETAPA 4: Verificar si necesita subir documento final
  if (this.referidoSeleccionado.confirmacion4 === 0 && 
      this.referidoSeleccionado.confirmacion3 === 1) {
    
    // Si no hay documento y hay uno seleccionado, subirlo primero
    if (!this.referidoSeleccionado.rutadocumentofinal && this.archivoDocumentoFinal) {
      console.log('📤 Subiendo documento final antes de confirmar...');
      
      try {
        this.subiendoDocumento = true;
        
        const resultado = await this.referidosService.subirDocumentoFinal(
          this.referidoSeleccionado.idrefpaciente,
          this.archivoDocumentoFinal
        );

        // Actualizar el referido con la ruta del documento
        await new Promise<void>((resolve, reject) => {
          this.referidosService.actualizarReferido(
            this.referidoSeleccionado!.idrefpaciente,
            { rutadocumentofinal: resultado.rutadocumentofinal } as any
          ).subscribe({
            next: (referidoActualizado) => {
              this.referidoSeleccionado = referidoActualizado;
              this.archivoDocumentoFinal = null;
              
              // Limpiar input de archivo
              const input = document.getElementById('inputDocumentoFinal') as HTMLInputElement;
              if (input) input.value = '';
              
              resolve();
            },
            error: (error) => {
              reject(error);
            }
          });
        });

        this.subiendoDocumento = false;
        console.log('✅ Documento subido, procediendo con confirmación...');
        
      } catch (error: any) {
        this.subiendoDocumento = false;
        this.alerta.alertaError(error.message || 'Error al subir documento final');
        return;
      }
    }
    
    // Validar que ahora sí exista el documento
    if (!this.referidoSeleccionado.rutadocumentofinal) {
      this.alerta.alertaError('Debe seleccionar y subir el documento final antes de completar');
      return;
    }
  }

  // Continuar con el flujo normal de confirmación
  this.mostrarModalDetalle = false;
  this.mostrarModalConfirmacion = true;
}

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.comentarioConfirmacion = '';
    // ✅ Ahora sí limpiar el referido seleccionado
    this.referidoSeleccionado = null;
  }

  ejecutarConfirmacion(): void {
    console.log('🔵 === CLIC EN BOTÓN APROBAR ===');
    console.log('referidoSeleccionado:', this.referidoSeleccionado);
    
    if (!this.referidoSeleccionado) {
      console.log('❌ No hay referido seleccionado');
      return;
    }

    this.confirmando = true;

    this.referidosService.confirmarReferido(
      this.referidoSeleccionado.idrefpaciente,
      this.comentarioConfirmacion || undefined
    ).subscribe({
      next: (referido) => {
        console.log('✅ Confirmación exitosa:', referido);
        this.alerta.alertaExito('Referido aprobado exitosamente');
        this.cerrarModalConfirmacion(); // ✅ Esto ahora limpia referidoSeleccionado
        this.cargarReferidos();
        this.confirmando = false;
      },
      error: (error) => {
        console.error('❌ ERROR en confirmación:', error);
        this.alerta.alertaError(
          error.error?.mensaje || error.error?.message || 'Error al aprobar el referido'
        );
        this.confirmando = false;
      }
    });
  }

  // ============================================================================
  // ELIMINAR
  // ============================================================================

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

  async subirDocumentoInicial(): Promise<void> {
    if (!this.referidoSeleccionado || !this.archivoDocumentoInicial) {
      this.alerta.alertaError('No hay archivo seleccionado');
      return;
    }

    this.subiendoDocumento = true;

    try {
      const resultado = await this.referidosService.subirDocumentoInicial(
        this.referidoSeleccionado.idrefpaciente,
        this.archivoDocumentoInicial
      );

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
        await this.archivoService.eliminarArchivo(this.referidoSeleccionado.rutadocumentoinicial);
        
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

  descargarDocumento(url: string, nombreArchivo: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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

  limpiarArchivoInicial(): void {
    this.archivoDocumentoInicial = null;
    const input = document.getElementById('inputDocumentoCrear') as HTMLInputElement;
    if (input) input.value = '';
  }

  obtenerNombreArchivo(ruta: string | undefined): string {
    if (!ruta) return '';
    return ruta.split('/').pop() || '';
  }

  // ============================================================================
  // PERMISOS (ACTUALIZADOS POR CLÍNICA)
  // ============================================================================

  // ✅ ACTUALIZADO: Validación por clínica
  puedeConfirmar(referido: Referido): boolean {
    console.log('🔍 === puedeConfirmar ===');
    console.log('referido:', referido);
    console.log('usuarioActual:', this.usuarioActual);
    
    if (!referido || !this.usuarioActual) {
      console.log('❌ No hay referido o usuario');
      return false;
    }

    if (referido.confirmacion4 === 1) {
      console.log('❌ Referido completado');
      return false;
    }

    // Etapa 2: Admin
    if (referido.confirmacion2 === 0 && referido.confirmacion1 === 1) {
      console.log('📍 ETAPA 2 - Admin requerido');
      console.log('esAdmin:', this.esAdmin);
      return this.esAdmin;
    }

    // Etapa 3: Otro admin
    if (referido.confirmacion3 === 0 && referido.confirmacion2 === 1) {
      console.log('📍 ETAPA 3 - Otro admin requerido');
      console.log('esAdmin:', this.esAdmin);
      console.log('usuarioconfirma2:', referido.usuarioconfirma2);
      console.log('usuario actual:', this.usuarioActual.usuario);
      return this.esAdmin && referido.usuarioconfirma2 !== this.usuarioActual.usuario;
    }

    // ✅ Etapa 4: Usuario de la clínica destino
    if (referido.confirmacion4 === 0 && referido.confirmacion3 === 1) {
      console.log('📍 ETAPA 4 - Usuario de clínica destino');
      console.log('fkclinica usuario:', this.usuarioActual.fkclinica);
      console.log('fkclinica referido:', referido.fkclinica);
      console.log('¿Coinciden?:', this.usuarioActual.fkclinica === referido.fkclinica);
      return this.usuarioActual.fkclinica === referido.fkclinica;
    }

    console.log('❌ No cumple ninguna condición');
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

  puedeEliminarDocumentoInicial(): boolean {
    if (!this.referidoSeleccionado || !this.usuarioActual) return false;
    return this.referidosService.puedeEliminarDocumentoInicial(
      this.referidoSeleccionado,
      this.usuarioActual,
      this.esAdmin
    );
  }

  puedeEliminarDocumentoFinal(): boolean {
    if (!this.referidoSeleccionado || !this.usuarioActual) return false;
    return this.referidosService.puedeEliminarDocumentoFinal(
      this.referidoSeleccionado,
      this.usuarioActual,
      this.esAdmin
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

  private marcarFormularioComoTocadoEdit(): void {
    Object.keys(this.referidoEditForm.controls).forEach(key => {
      const control = this.referidoEditForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.referidoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isFieldInvalidEdit(fieldName: string): boolean {
    const field = this.referidoEditForm.get(fieldName);
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

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'fkpaciente': 'Paciente',
      'fkexpediente': 'Expediente',
      'fkclinica': 'Clínica',
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

  /**
 * ✅ Verifica si el referido está en etapa 4 y necesita documento final
 */
necesitaDocumentoFinal(): boolean {
  if (!this.referidoSeleccionado) return false;
  
  return (
    this.referidoSeleccionado.confirmacion4 === 0 &&
    this.referidoSeleccionado.confirmacion3 === 1 &&
    !this.referidoSeleccionado.rutadocumentofinal &&
    !this.archivoDocumentoFinal
  );
}

/**
 * ✅ Obtiene el texto dinámico del botón de confirmar
 */
obtenerTextoBotonConfirmar(): string {
  if (!this.referidoSeleccionado) return 'Aprobar';
  
  // Etapa 4: Completar con documento
  if (this.referidoSeleccionado.confirmacion4 === 0 && 
      this.referidoSeleccionado.confirmacion3 === 1) {
    return 'Aprobar y Completar';
  }
  
  // Otras etapas
  return 'Aprobar';
}
}