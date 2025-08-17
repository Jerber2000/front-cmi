import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PacienteService, Paciente, PacienteResponse } from '../../services/paciente.service';
import { ExpedienteService } from '../../services/expediente.service'; 
import { FileService, FileUploadResponse } from '../../services/file.service';
import { AlertaService } from '../../services/alerta.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ExpedienteListComponent } from '../expediente/expediente'; 

@Component({
  selector: 'app-paciente-list',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    SidebarComponent,
    ExpedienteListComponent 
  ],
  templateUrl: './paciente-list.component.html',
  styleUrls: ['./paciente-list.component.scss']
})
export class PacienteListComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @ViewChild(ExpedienteListComponent) expedienteComponent!: ExpedienteListComponent;
  private destroy$ = new Subject<void>();
  
  // Estados
  currentView: 'list' | 'form' | 'detail' | 'expediente-modal' = 'list';
  expedientePacienteData: any = null;
  expedienteForm: FormGroup | null = null;
  isEditMode = false;
  loading = false;
  uploadingFiles = false;
  
  // Datos
  pacientes: Paciente[] = [];
  filteredPacientes: Paciente[] = [];
  selectedPaciente: Paciente | null = null;
  
  // Formulario
  pacienteForm: FormGroup;
  
  // Archivos - Variables legacy para mantener compatibilidad con el HTML existente
  selectedPhoto: string | null = null;
  selectedEncargadoPhoto: string | null = null;
  selectedCartaPhoto: string | null = null;
  isCartaPDF = false;
  
  // Archivos seleccionados para upload
  private selectedFiles: {
    perfil?: File;
    encargado?: File;
    carta?: File;
  } = {};
  
  // Búsqueda
  searchTerm = '';
  private searchSubject = new Subject<string>();
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  // UI
  currentDate = new Date();
  sidebarExpanded = true;
  userInfo: any = {};
  error = '';

  constructor(
    private pacienteService: PacienteService,
    private expedienteService: ExpedienteService,
    private fb: FormBuilder,
    private alertaService: AlertaService,
    private fileService: FileService,
    private router: Router
  ) {
    this.pacienteForm = this.createForm();
    this.setupSearch();
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadPacientes();
  }

  ngAfterViewInit(): void {
    this.detectSidebarState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================

  createForm(): FormGroup {
    return this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      cui: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
      fechanacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      tipoconsulta: ['', Validators.required],
      tipodiscapacidad: ['Ninguna'],
      telefonopersonal: [''],
      nombrecontactoemergencia: [''],
      telefonoemergencia: [''],
      nombreencargado: [''],
      dpiencargado: [''],
      telefonoencargado: [''],
      municipio: ['', Validators.required],
      aldea: [''],
      direccion: ['', Validators.required]
    });
  }

  setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.filterPacientes());
  }

  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.avatar || null
        };
      }
    } catch (error) {
      console.error('❌ Error al cargar usuario:', error);
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
  }

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  showList(): void {
    this.currentView = 'list';
    this.resetForm();
  }

  showForm(): void {
    this.currentView = 'form';
    this.isEditMode = false;
    this.resetForm();
  }

  viewPaciente(paciente: Paciente): void {
    this.selectedPaciente = paciente;
    this.currentView = 'detail';
  }

  editPaciente(paciente: Paciente): void {
    console.log('=== EDITANDO PACIENTE ===');
    console.log('ID:', paciente.idpaciente);
    
    this.selectedPaciente = paciente;
    this.isEditMode = true;
    this.currentView = 'form';
    this.fillForm(paciente);
    this.loadExistingPhotos(paciente);
  }

  closeModal(): void {
    this.currentView = 'list';
    this.resetForm();
  }

  resetForm(): void {
    this.pacienteForm.reset();
    this.pacienteForm.patchValue({ tipodiscapacidad: 'Ninguna' });
    this.isEditMode = false;
    this.selectedPaciente = null;
    
    // Limpiar archivos
    this.selectedFiles = {};
    this.selectedPhoto = null;
    this.selectedEncargadoPhoto = null;
    this.selectedCartaPhoto = null;
    this.isCartaPDF = false;
    this.uploadingFiles = false;
    this.error = '';
  }

  // ==========================================
  // DATOS
  // ==========================================

  loadPacientes(): void {
    this.loading = true;
    this.error = '';

    this.pacienteService.getAllPacientes(this.currentPage, this.pageSize, this.searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PacienteResponse) => {
          console.log('Respuesta del servidor:', response);
          if (response.success && Array.isArray(response.data)) {
            this.pacientes = response.data;
            this.filteredPacientes = [...this.pacientes];
            if (response.pagination) {
              this.totalItems = response.pagination.total;
              this.totalPages = response.pagination.totalPages;
              this.currentPage = response.pagination.page;
            }
          } else {
            this.error = 'Error al cargar pacientes';
            this.pacientes = [];
            this.filteredPacientes = [];
            this.alertaService.alertaError('Error al cargar pacientes');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.error = 'Error de conexión';
          this.loading = false;
          this.pacientes = [];
          this.filteredPacientes = [];
          this.alertaService.alertaError('Error de conexión');
        }
      });
  }

  filterPacientes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPacientes = [...this.pacientes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredPacientes = this.pacientes.filter(paciente =>
      paciente.nombres.toLowerCase().includes(term) ||
      paciente.apellidos.toLowerCase().includes(term) ||
      paciente.cui.toLowerCase().includes(term) ||
      (paciente.telefonopersonal && paciente.telefonopersonal.toLowerCase().includes(term))
    );
  }

  // ==========================================
  // CRUD
  // ==========================================

  async onSubmit(): Promise<void> {
    console.log('=== SUBMIT ===');
    console.log('Válido:', this.pacienteForm.valid);
    console.log('Modo edición:', this.isEditMode);
    console.log('Archivos:', this.selectedFiles);
    
    if (!this.pacienteForm.valid) {
      this.markFormGroupTouched(this.pacienteForm);
      this.alertaService.alertaPreventiva('Complete todos los campos requeridos');
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const pacienteData: Paciente = this.pacienteForm.value;

      if (this.isEditMode && this.selectedPaciente?.idpaciente) {
        await this.updatePacienteWithFiles(this.selectedPaciente.idpaciente, pacienteData);
      } else {
        await this.createPacienteWithFiles(pacienteData);
      }
    } catch (error) {
      console.error('❌ Error en submit:', error);
      this.error = error instanceof Error ? error.message : 'Error desconocido';
      this.alertaService.alertaError(this.error);
      this.loading = false;
    }
  }

  private async createPacienteWithFiles(pacienteData: Paciente): Promise<void> {
    try {
      const response = await this.pacienteService.createPaciente(pacienteData)
        .toPromise()
        .then(resp => {
          if (!resp) {
            throw new Error('No se recibió respuesta del servidor');
          }
          return resp;
        });
      
      if (response.success) {
        const newPaciente = response.data as Paciente;
        const pacienteId = newPaciente.idpaciente;
        
        if (pacienteId && this.hasFilesToUpload()) {
          await this.uploadAllFiles(pacienteId);
          this.alertaService.alertaExito('Paciente creado con archivos');
        } else {
          this.alertaService.alertaExito('Paciente creado exitosamente');
        }
        
        this.loadPacientes();
        this.showList();
      } else {
        throw new Error(response.message || 'Error al crear paciente');
      }
    } catch (error) {
      throw error;
    } finally {
      this.loading = false;
      this.uploadingFiles = false;
    }
  }

  private async updatePacienteWithFiles(pacienteId: number, pacienteData: Paciente): Promise<void> {
    try {
      const response = await this.pacienteService.updatePaciente(pacienteId, pacienteData)
        .toPromise()
        .then(resp => {
          if (!resp) {
            throw new Error('No se recibió respuesta del servidor');
          }
          return resp;
        });
      
      if (response.success) {
        if (this.hasFilesToUpload()) {
          await this.uploadAllFiles(pacienteId);
          this.alertaService.alertaExito('Paciente actualizado con archivos');
        } else {
          this.alertaService.alertaExito('Paciente actualizado exitosamente');
        }
        
        this.loadPacientes();
        this.showList();
      } else {
        throw new Error(response.message || 'Error al actualizar paciente');
      }
    } catch (error) {
      throw error;
    } finally {
      this.loading = false;
      this.uploadingFiles = false;
    }
  }

  private hasFilesToUpload(): boolean {
    return !!(this.selectedFiles.perfil || this.selectedFiles.encargado || this.selectedFiles.carta);
  }

  private async uploadAllFiles(pacienteId: number): Promise<void> {
    console.log('🔍 === UPLOAD FILES ===');
    console.log('Paciente ID:', pacienteId);
    console.log('Archivos:', this.selectedFiles);

    if (!this.hasFilesToUpload()) {
      console.log('No hay archivos para subir');
      return;
    }

    this.uploadingFiles = true;
    const uploadPromises: Promise<FileUploadResponse>[] = [];

    try {
      // Upload de cada archivo
      if (this.selectedFiles.perfil) {
        console.log('📤 Subiendo foto perfil...');
        const promise = this.fileService.uploadFile(this.selectedFiles.perfil, pacienteId, 'perfil')
          .toPromise()
          .then(response => {
            if (!response) {
              throw new Error('No se recibió respuesta del servidor');
            }
            return response;
          });
        uploadPromises.push(promise);
      }

      if (this.selectedFiles.encargado) {
        console.log('📤 Subiendo foto encargado...');
        const promise = this.fileService.uploadFile(this.selectedFiles.encargado, pacienteId, 'encargado')
          .toPromise()
          .then(response => {
            if (!response) {
              throw new Error('No se recibió respuesta del servidor');
            }
            return response;
          });
        uploadPromises.push(promise);
      }

      if (this.selectedFiles.carta) {
        console.log('📤 Subiendo carta...');
        const promise = this.fileService.uploadFile(this.selectedFiles.carta, pacienteId, 'carta')
          .toPromise()
          .then(response => {
            if (!response) {
              throw new Error('No se recibió respuesta del servidor');
            }
            return response;
          });
        uploadPromises.push(promise);
      }

      console.log(`📤 Subiendo ${uploadPromises.length} archivo(s)...`);
      const results = await Promise.all(uploadPromises);
      console.log('✅ Todos los archivos subidos:', results);
      
      // Limpiar archivos
      this.selectedFiles = {};
      
    } catch (error) {
      console.error('❌ Error subiendo archivos:', error);
      throw error;
    } finally {
      this.uploadingFiles = false;
    }
  }

  deletePaciente(id: number): void {
    const Swal = (window as any).Swal;
    Swal.fire({
      title: '¿Eliminar paciente?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.loading = true;
        
        this.pacienteService.deletePaciente(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.alertaService.alertaExito('Paciente eliminado');
                this.loadPacientes();
              } else {
                this.alertaService.alertaError('Error al eliminar');
              }
              this.loading = false;
            },
            error: () => {
              this.alertaService.alertaError('Error al eliminar');
              this.loading = false;
            }
          });
      }
    });
  }

  // ==========================================
  // MANEJO DE EXPEDIENTES
  // ==========================================

  /**
   * Crear expediente para un paciente específico
   */
  crearExpedientePaciente(paciente: Paciente): void {
    console.log('🏥 Creando expediente para paciente:', paciente.nombres, paciente.apellidos);
    
    Swal.fire({
      title: 'Crear Expediente',
      html: `
        <p>¿Desea crear un expediente médico para:</p>
        <strong>${paciente.nombres} ${paciente.apellidos}</strong>
        <br><small>CUI: ${paciente.cui}</small>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-plus"></i> Crear Expediente',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.abrirModalExpediente(paciente);
      }
    });
  }

  /**
   * Ver expediente existente de un paciente
   */
  verExpedientePaciente(paciente: Paciente): void {
    console.log('👁️ Viendo expediente del paciente:', paciente.nombres, paciente.apellidos);
    
    if (!paciente.fkexpediente) {
      this.alertaService.alertaPreventiva('Este paciente no tiene expediente asignado');
      return;
    }

    this.alertaService.alertaInfo(`Expediente ID: ${paciente.fkexpediente} - Esta funcionalidad se implementará próximamente`);
  }

  /**
   * Abrir modal de expediente con datos del paciente
   */
private abrirModalExpediente(paciente: Paciente): void {
  console.log('📝 Abriendo modal de expediente para:', paciente.idpaciente);
  console.log('📝 Datos del paciente:', paciente);
  
  // Preparar datos para el componente de expedientes
  this.expedientePacienteData = {
    idpaciente: paciente.idpaciente,
    pacienteInfo: {
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      cui: paciente.cui,
      fechanacimiento: paciente.fechanacimiento,
      genero: paciente.genero
    }
  };

  console.log('📝 Datos preparados:', this.expedientePacienteData);
  console.log('📝 Cambiando vista a expediente-modal');
  
  // Cambiar la vista para mostrar el componente de expedientes
  this.currentView = 'expediente-modal';
  
  console.log('📝 CurrentView después del cambio:', this.currentView);
  
  // Esperar a que el componente se renderice y luego configurarlo
  setTimeout(() => {
    console.log('📝 Intentando acceder al componente de expedientes...');
    console.log('📝 Componente disponible:', !!this.expedienteComponent);
    
    if (this.expedienteComponent) {
      console.log('📝 Llamando a abrirModalDesdePacientes...');
      this.expedienteComponent.abrirModalDesdePacientes(this.expedientePacienteData);
    } else {
      console.warn('⚠️ El componente de expedientes no está disponible');
    }
  }, 100);
}

  /**
   * Cerrar modal de expediente y volver a lista
   */
cerrarModalExpediente(expedienteData?: any): void {
  console.log('🏥 Cerrando modal expediente con datos:', expedienteData);
  
  // Si se recibieron datos del expediente creado
  if (expedienteData) {
    console.log('✅ Expediente creado exitosamente:', expedienteData);
    
    // Mostrar mensaje de éxito con el número real
    this.alertaService.alertaExito(
      `Expediente creado exitosamente. Número: ${expedienteData.numeroExpediente}`
    );
    
    // Actualizar el paciente en la lista local
    this.actualizarPacienteConExpediente(expedienteData);
  }
  
  this.currentView = 'list';
  this.expedientePacienteData = null;
  
  // Recargar pacientes para mostrar cambios
  this.loadPacientes();
}



private actualizarPacienteConExpediente(expedienteData: any): void {
  if (!expedienteData.pacienteId) return;
  
  // Buscar el paciente en la lista local y actualizar su expediente
  const pacienteIndex = this.pacientes.findIndex(p => p.idpaciente === expedienteData.pacienteId);
  if (pacienteIndex !== -1) {
    // Actualizar el fkexpediente y la relación expediente
    this.pacientes[pacienteIndex].fkexpediente = expedienteData.idExpediente;
    this.pacientes[pacienteIndex].expediente = {
      idexpediente: expedienteData.idExpediente,
      numeroexpediente: expedienteData.numeroExpediente,
      historiaenfermedad: expedienteData.expediente?.historiaenfermedad || ''
    };
    
    // También actualizar en filteredPacientes
    const filteredIndex = this.filteredPacientes.findIndex(p => p.idpaciente === expedienteData.pacienteId);
    if (filteredIndex !== -1) {
      this.filteredPacientes[filteredIndex].fkexpediente = expedienteData.idExpediente;
      this.filteredPacientes[filteredIndex].expediente = {
        idexpediente: expedienteData.idExpediente,
        numeroexpediente: expedienteData.numeroExpediente,
        historiaenfermedad: expedienteData.expediente?.historiaenfermedad || ''
      };
    }
    
    console.log('✅ Paciente actualizado localmente con expediente:', expedienteData.numeroExpediente);
  }
}

  // ==========================================
  // MANEJO DE ARCHIVOS
  // ==========================================

  async onPhotoSelected(event: any, tipo: 'perfil' | 'encargado' | 'carta'): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    try {
      console.log('🔍 Archivo seleccionado:', file.name, tipo);

      // Validar archivo
      const validation = this.fileService.validateFile(file, tipo);
      if (!validation.valid) {
        this.alertaService.alertaPreventiva(validation.message || 'Archivo no válido');
        event.target.value = '';
        return;
      }

      // Generar vista previa
      const preview = await this.fileService.getFilePreview(file);
      
      // Guardar archivo para upload posterior
      this.selectedFiles[tipo] = file;

      // Actualizar variables para el template existente
      switch (tipo) {
        case 'perfil':
          this.selectedPhoto = preview;
          break;
        case 'encargado':
          this.selectedEncargadoPhoto = preview;
          break;
        case 'carta':
          this.selectedCartaPhoto = preview;
          this.isCartaPDF = file.type === 'application/pdf';
          break;
      }

      console.log('✅ Archivo procesado:', tipo);

    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
      this.alertaService.alertaError('Error al procesar archivo');
      event.target.value = '';
    }
  }

  removePhoto(tipo: 'perfil' | 'encargado' | 'carta'): void {
    console.log('🗑️ Removiendo:', tipo);
    
    // Limpiar archivo seleccionado
    delete this.selectedFiles[tipo];
    
    // Limpiar variables del template
    switch (tipo) {
      case 'perfil':
        this.selectedPhoto = null;
        break;
      case 'encargado':
        this.selectedEncargadoPhoto = null;
        break;
      case 'carta':
        this.selectedCartaPhoto = null;
        this.isCartaPDF = false;
        break;
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  calculateAge(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  fillForm(paciente: Paciente): void {
    this.pacienteForm.patchValue({
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      cui: paciente.cui,
      fechanacimiento: paciente.fechanacimiento ? 
        new Date(paciente.fechanacimiento).toISOString().split('T')[0] : '',
      genero: paciente.genero,
      tipoconsulta: paciente.tipoconsulta,
      tipodiscapacidad: paciente.tipodiscapacidad || 'Ninguna',
      telefonopersonal: paciente.telefonopersonal,
      nombrecontactoemergencia: paciente.nombrecontactoemergencia,
      telefonoemergencia: paciente.telefonoemergencia,
      nombreencargado: paciente.nombreencargado,
      dpiencargado: paciente.dpiencargado,
      telefonoencargado: paciente.telefonoencargado,
      municipio: paciente.municipio,
      aldea: paciente.aldea,
      direccion: paciente.direccion
    });
  }

  loadExistingPhotos(paciente: Paciente): void {
    // Cargar fotos existentes del paciente
    if (paciente.rutafotoperfil) {
      this.selectedPhoto = this.fileService.getFileUrlFromPath(paciente.rutafotoperfil);
    }
    
    if (paciente.rutafotoencargado) {
      this.selectedEncargadoPhoto = this.fileService.getFileUrlFromPath(paciente.rutafotoencargado);
    }
    
    if (paciente.rutacartaautorizacion) {
      this.selectedCartaPhoto = this.fileService.getFileUrlFromPath(paciente.rutacartaautorizacion);
      const extension = paciente.rutacartaautorizacion.toLowerCase().split('.').pop();
      this.isCartaPDF = extension === 'pdf';
    }
  }

  // ==========================================
  // VALIDACIONES
  // ==========================================

  isFieldInvalid(fieldName: string): boolean {
    const field = this.pacienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.pacienteForm.get(fieldName);
    
    if (field && field.errors) {
      if (field.errors['required']) return 'Campo requerido';
      if (field.errors['minlength']) return 'Muy corto';
      if (field.errors['pattern']) {
        if (fieldName === 'cui') return 'CUI debe tener 13 dígitos';
        return 'Formato inválido';
      }
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}