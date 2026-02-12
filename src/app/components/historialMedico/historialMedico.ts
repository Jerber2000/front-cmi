//src/app/components/historialMedico/historialMedico.ts
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { 
  HistorialMedicoService, 
  HistorialMedico, 
  InfoPaciente,
  ExpedienteInfo,  // ✅ IMPORTAR ExpedienteInfo
  CrearSesionRequest,
  ActualizarSesionRequest 
} from '../../services/historialMedico.service';
import { AuthService } from '../../services/auth.service';
import { PerfilService } from '../../services/perfil.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';
import { ArchivoService } from '../../services/archivo.service';
import { Paciente } from '../../services/paciente.service';
import { ReferidosComponent } from '../referidos/referidos.component';
import { FormularioPsicologiaComponent } from './formularioPsicologia/formulario-psicologia.component'; 
import { HasRoleDirective } from '../../directives/has-role.directive';

@Component({
  selector: 'app-historial-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent,ReferidosComponent,FormularioPsicologiaComponent, HasRoleDirective ],
  templateUrl: './historialMedico.html',
  styleUrls: ['./historialMedico.scss']
})

export class HistorialMedicoComponent implements OnInit, AfterViewInit, OnDestroy {
  currentView: 'historial' | 'nueva-sesion' | 'diagnostico' | 'notas-rapidas' = 'historial';
  sidebarExpanded = true;
  loading = false;
  pacienteParaReferir: Paciente | null = null;
  mostrarFormularioPsicologia = false;
  idPaciente: number = 0;
  infoPaciente: InfoPaciente | null = null;
  historialSesiones: HistorialMedico[] = [];
  sesionActual: HistorialMedico | null = null;
  userInfo: any = {};
  currentDate = new Date();

  clinicas: any[] = [];
  clinicaSeleccionada: number = 0;
  historialFiltrado: HistorialMedico[] = [];

  archivosSubidosInfo: any[] = [];
  maxArchivos = 10;
  tamañoMaximoMB = 15;
  tamañoTotalMaximoMB = 50;
  
  sesionForm: FormGroup;
  diagnosticoForm: FormGroup;
  
  selectedFiles: File[] = [];
  archivosSubiendo = false;
  
  fotoPacienteUrl: string | null = null;
  archivosExistentes: any[] = [];
  private perfilSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    public historialService: HistorialMedicoService,
    public archivoService: ArchivoService,
    private alerta: AlertaService,
    private http: HttpClient,
    private authService: AuthService,
    private perfilService: PerfilService
  ) {
    this.sesionForm = this.fb.group({
      motivoconsulta: ['', [Validators.required, Validators.minLength(10)]],
      notaconsulta: [''],
      recordatorio: [''],
      evolucion: [''],
      diagnosticotratamiento: ['']
    });

    this.diagnosticoForm = this.fb.group({
      evolucion: [''],
      diagnosticotratamiento: ['']
    });
  }

  // ============================================================================
  //  abrirModalReferido CON VALIDACIÓN ROBUSTA
  // ============================================================================
  
  abrirModalReferido(): void {

    if (!this.infoPaciente) {
      this.alerta.alertaError('No se encontró información del paciente');
      return;
    }

    // VALIDACIÓN ESTRICTA de expedientes
    const expedientes = this.infoPaciente.expedientes || [];
    if (!expedientes || expedientes.length === 0) {
      this.alerta.alertaError('Este paciente no tiene expedientes disponibles para crear un referido');
      return;
    }

    // FORMATEO ROBUSTO con type safety
    const expedientesFormateados: ExpedienteInfo[] = expedientes.map(exp => {
      // Acceso seguro con any solo para mayúsculas de SQL Server
      const expAny = exp as any;
      
      const expedienteFormateado: ExpedienteInfo = {
        idexpediente: exp.idexpediente || expAny.IDEXPEDIENTE || 0,
        numeroexpediente: exp.numeroexpediente || expAny.NUMEROEXPEDIENTE || '',
        fkpaciente: exp.fkpaciente || expAny.FKPACIENTE || this.infoPaciente!.idpaciente,
        fkclinica: exp.fkclinica || expAny.FKCLINICA || this.infoPaciente!.fkclinica || 0,
        fechaapertura: exp.fechaapertura || expAny.FECHAAPERTURA || new Date().toISOString().split('T')[0]
      };
      return expedienteFormateado;
    });

    // VALIDAR que al menos un expediente tiene ID válido
    const expedientesValidos = expedientesFormateados.filter(exp => exp.idexpediente > 0);
    
    if (expedientesValidos.length === 0) {
      this.alerta.alertaError('Error: No se pudo obtener el ID del expediente. Contacte al administrador.');
      return;
    }
    // CONSTRUIR objeto paciente para referir
    this.pacienteParaReferir = {
      idpaciente: this.infoPaciente.idpaciente,
      nombres: this.infoPaciente.nombres,
      apellidos: this.infoPaciente.apellidos,
      cui: this.infoPaciente.cui,
      fechanacimiento: this.infoPaciente.fechanacimiento || '',
      genero: this.infoPaciente.genero || '',
      tipoconsulta: '',
      municipio: '',
      direccion: '',
      expedientes: expedientesValidos as any[]
    };

  }

  // RESTO DE MÉTODOS DEL COMPONENTE (sin cambios)
  
  async eliminarArchivoExistente(archivo: any): Promise<void> {
    if (!this.sesionActual) {
      this.alerta.alertaError('No hay sesión seleccionada');
      return;
    }

    const confirmado = await this.alerta.alertaConfirmacion(
      '¿Eliminar archivo?',
      `Se eliminará "${archivo.nombre}" de forma permanente`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (!confirmado) return;

    this.loading = true;

    try {
      const rutaEliminar = archivo.rutaServicio || archivo.ruta;
      
      if (rutaEliminar) {
        await this.archivoService.eliminarArchivo(rutaEliminar);
      }

      await this.historialService.actualizarRutaArchivos(
        this.sesionActual.idhistorial,
        ''
      ).toPromise();

      this.sesionActual.rutahistorialclinico = '';
      await this.cargarArchivosExistentes(this.sesionActual.idhistorial);

      this.alerta.alertaExito('Archivo eliminado correctamente');

    } catch (error: any) {
      this.alerta.alertaError(error.message || 'Error al eliminar archivo');
    } finally {
      this.loading = false;
    }
  }

  obtenerIconoArchivo(archivo: any): string {
    const nombre = archivo.nombre || archivo.nombreOriginal || '';
    const extension = nombre.toLowerCase().split('.').pop();

    switch (extension) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
      case 'gif': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📎';
    }
  }

  esImagen(archivo: any): boolean {
    const nombre = archivo.nombre || archivo.nombreOriginal || '';
    const extension = nombre.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '');
  }

  onModalReferidoCerrado(): void {
    this.pacienteParaReferir = null;
  }

  abrirFormularioPsicologia(): void {
    if (!this.infoPaciente) {
      this.alerta.alertaError('No se encontró información del paciente');
      return;
    }
    this.mostrarFormularioPsicologia = true;
  }

  cerrarFormularioPsicologia(): void {
    this.mostrarFormularioPsicologia = false;
  }

  formatFileSize(size: number): string {
    return this.archivoService.formatearTamaño(size);
  }

  ngOnInit(): void {
    // Suscribirse al perfil para que el sidebar se actualice reactivamente
    this.perfilSubscription = this.perfilService.perfil$.subscribe({
      next: (usuario) => {
        if (usuario) {
          this.userInfo = this.perfilService.obtenerInfoSidebar();
        }
      },
      error: (error) => {
      }
    });

    // Cargar el perfil desde el backend para inicializar
    this.perfilService.obtenerPerfilDesdeBackend().subscribe({
      error: (error) => {
      }
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.idPaciente = parseInt(id);
        this.cargarDatosPaciente();
      }
    });
    this.cargarClinicas();
    this.establecerFiltroClinicaDefecto();
  }

  /**
   * Establece el filtro de clínica por defecto según el rol del usuario
   * - Admin (1) y Sistemas (4): Ver todas las clínicas
   * - Otros: Filtrar por su clínica asignada
   */
  private establecerFiltroClinicaDefecto(): void {
    const userRole = this.authService.userRole;
    const user = this.authService.getCurrentUser();

    // Si es Admin (1) o Sistemas (4), mostrar todas las clínicas
    if (userRole === 1 || userRole === 4) {
      this.clinicaSeleccionada = 0;
      return;
    }

    // Para otros roles, filtrar por su clínica asignada
    if (user?.fkclinica) {
      this.clinicaSeleccionada = user.fkclinica;
    }
  }

  cargarClinicas(): void {
    this.http.get<any>(`${environment.apiUrl}/pacientes/clinicas`).subscribe({
      next: (response) => {
        if (response.success) {
          this.clinicas = response.data;
        }
      },
      error: (error) => {
      }
    });
  }
  
  ngAfterViewInit(): void {
    this.detectSidebarState();
  }

  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.rutafotoperfil ? 
            this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null
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

  // ============================================================================
  // MÉTODO MEJORADO - cargarDatosPaciente CON TYPE SAFETY
  // ============================================================================
  
  cargarDatosPaciente(): void {
    this.loading = true;
    
    const datosPacienteStr = sessionStorage.getItem('datosPacienteHistorial');
    
    if (datosPacienteStr) {
      try {
        const datosFromPacientes = JSON.parse(datosPacienteStr);

        // FORMATEAR expedientes con type safety
        const expedientesFormateados: ExpedienteInfo[] = (datosFromPacientes.expedientes || []).map((exp: any): ExpedienteInfo => {
          return {
            idexpediente: exp.idexpediente || exp.IDEXPEDIENTE || 0,
            numeroexpediente: exp.numeroexpediente || exp.NUMEROEXPEDIENTE || '',
            fkpaciente: exp.fkpaciente || exp.FKPACIENTE || datosFromPacientes.idpaciente,
            fkclinica: exp.fkclinica || exp.FKCLINICA || datosFromPacientes.fkclinica,
            fechaapertura: exp.fechaapertura || exp.FECHAAPERTURA || new Date().toISOString().split('T')[0]
          };
        });
        this.infoPaciente = {
          idpaciente: datosFromPacientes.idpaciente,
          nombres: datosFromPacientes.nombres,
          apellidos: datosFromPacientes.apellidos,
          fkclinica: datosFromPacientes.fkclinica,
          cui: datosFromPacientes.cui,
          genero: datosFromPacientes.genero,
          fechanacimiento: datosFromPacientes.fechanacimiento,
          expedientes: expedientesFormateados
        };
        if (datosFromPacientes.rutafotoperfil) {
          this.fotoPacienteUrl = this.archivoService.obtenerUrlPublica(datosFromPacientes.rutafotoperfil);
        }
        
        this.loading = false;
        this.cargarHistorial();
        return;
        
      } catch (error) {
      }
    }
    
    // Fallback: cargar del backend
    this.historialService.obtenerInfoPaciente(this.idPaciente).subscribe({
      next: (info: InfoPaciente) => {
        // VALIDAR Y FORMATEAR expedientes del backend también
        if (info.expedientes && info.expedientes.length > 0) {
          info.expedientes = info.expedientes.map((exp: any): ExpedienteInfo => ({
            idexpediente: exp.idexpediente || exp.IDEXPEDIENTE || 0,
            numeroexpediente: exp.numeroexpediente || exp.NUMEROEXPEDIENTE || '',
            fkpaciente: exp.fkpaciente || exp.FKPACIENTE || info.idpaciente,
            fkclinica: exp.fkclinica || exp.FKCLINICA || info.fkclinica,
            fechaapertura: exp.fechaapertura || exp.FECHAAPERTURA || new Date().toISOString().split('T')[0]
          }));
        }
        
        this.infoPaciente = info;
        if (info.rutafotoperfil) {
          this.fotoPacienteUrl = this.archivoService.obtenerUrlPublica(info.rutafotoperfil);
        }
        
        this.cargarHistorial();
      },
      error: (error: any) => {
        this.loading = false;
        this.alerta.alertaError('Error al cargar información del paciente');
      }
    });
  }

  // ============================================================================
  // RESTO DE MÉTODOS SIN CAMBIOS
  // ============================================================================

  cargarHistorial(): void {
    this.historialService.obtenerHistorialPorPaciente(this.idPaciente).subscribe({
      next: (historial: HistorialMedico[]) => {
        this.historialSesiones = historial;
        this.aplicarFiltroClinica();
        this.loading = false;
      },
      error: (error: any) => {
        this.loading = false;
        this.alerta.alertaError('Error al cargar el historial médico');
      }
    });
  }

  aplicarFiltroClinica(): void {
    const clinicaId = Number(this.clinicaSeleccionada);
    
    if (clinicaId === 0) {
      this.historialFiltrado = [...this.historialSesiones];
    } else {
      this.historialFiltrado = this.historialSesiones.filter(
        sesion => sesion.fkclinica === clinicaId
      );
    }
  }

  onFiltroClinicaChange(): void {
    this.aplicarFiltroClinica();
  }

  mostrarHistorial(): void {
    this.currentView = 'historial';
    this.resetForms();
  }

  mostrarNuevaSesion(): void {
    this.currentView = 'nueva-sesion';
    this.resetForms();
  }

  mostrarNotasRapidas(): void {
    this.currentView = 'notas-rapidas';
  }

  mostrarDiagnostico(sesion: HistorialMedico): void {
    this.sesionActual = sesion;
    this.currentView = 'diagnostico';
    
    this.diagnosticoForm = this.fb.group({
      motivoconsulta: [sesion.motivoconsulta || ''],
      notaconsulta: [sesion.notaconsulta || ''],
      recordatorio: [sesion.recordatorio || ''],
      evolucion: [sesion.evolucion || ''],
      diagnosticotratamiento: [sesion.diagnosticotratamiento || '']
    });

    this.cargarArchivosExistentes(sesion.idhistorial);
  }

  resetForms(): void {
    this.sesionForm.reset();
    this.diagnosticoForm.reset();
    this.sesionActual = null;
    this.selectedFiles = [];
    this.archivosSubidosInfo = [];
    this.limpiarInputArchivos();
  }

  onFilesSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      this.alerta.alertaError('Solo puedes subir 1 archivo por sesión');
      event.target.value = '';
      return;
    }

    const archivo = files[0];
    
    const validation = this.archivoService.validarArchivo(
      archivo,
      archivo.type.startsWith('image/') ? 'image' : 'document',
      this.tamañoMaximoMB
    );

    if (!validation.valido) {
      this.alerta.alertaError(`${archivo.name}: ${validation.error}`);
      event.target.value = '';
      return;
    }

    this.selectedFiles = [archivo];
    event.target.value = '';
  }

  async crearSesion(): Promise<void> {
    if (this.sesionForm.valid && this.infoPaciente) {
      this.loading = true;
      
      const usuarioData = localStorage.getItem('usuario');
      if (!usuarioData) {
        this.alerta.alertaError('No se encontró información del usuario');
        this.loading = false;
        return;
      }

      const usuario = JSON.parse(usuarioData);
      const formData = this.sesionForm.value;
      
      const clinicaId = usuario.fkclinica || this.infoPaciente.fkclinica || null;
      
      const nuevaSesion: CrearSesionRequest = {
        fkpaciente: this.idPaciente,
        fkusuario: usuario.idusuario,
        fkclinica: clinicaId, 
        fecha: new Date().toISOString(),
        motivoconsulta: formData.motivoconsulta,
        notaconsulta: formData.notaconsulta || '',
        recordatorio: formData.recordatorio || '',
        evolucion: formData.evolucion || '',
        diagnosticotratamiento: formData.diagnosticotratamiento || ''
      };

      try {
        const sesionCreada = await this.historialService.crearSesion(nuevaSesion).toPromise();
        
        if (!sesionCreada) {
          throw new Error('Error al crear la sesión');
        }
        
        let mensajeFinal = 'Sesión creada correctamente';
        
        if (this.selectedFiles.length > 0) {
          const archivo = this.selectedFiles[0];
          
          let rutaArchivo: string;
          
          if (archivo.type.startsWith('image/')) {
            rutaArchivo = await this.archivoService.subirFoto(
              'historiales', 
              sesionCreada.idhistorial, 
              archivo
            );
          } else {
            rutaArchivo = await this.archivoService.subirDocumento(
              'historiales', 
              sesionCreada.idhistorial, 
              archivo
            );
          }
          
          await this.historialService.actualizarRutaArchivos(
            sesionCreada.idhistorial, 
            rutaArchivo
          ).toPromise();
          
          mensajeFinal = 'Sesión creada con archivo correctamente';
        }
        
        this.alerta.alertaExito(mensajeFinal);
        this.limpiarInputArchivos();
        this.cargarHistorial();
        this.mostrarHistorial();
        
      } catch (error: any) {
        this.alerta.alertaError(error?.error?.message || 'Error al crear la sesión');
      } finally {
        this.loading = false;
      }
    }
  }

  eliminarArchivoSeleccionado(index: number): void {
    if (index >= 0 && index < this.selectedFiles.length) {
      const archivo = this.selectedFiles[index];
      this.selectedFiles.splice(index, 1);
      this.alerta.alertaInfo(`${archivo.name} eliminado de la selección`);
    }
  }
  
  limpiarTodosLosArchivos(): void {
    if (this.selectedFiles.length > 0) {
      this.alerta.alertaConfirmacion(
        '¿Eliminar todos los archivos?',
        'Se eliminarán todos los archivos seleccionados',
        'Sí, eliminar',
        'Cancelar'
      ).then((confirmado: boolean) => {
        if (confirmado) {
          this.selectedFiles = [];
          this.limpiarInputArchivos();
        }
      });
    }
  }

  getResumenArchivos(): string {
    if (this.selectedFiles.length === 0) return '';
    
    const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const formattedSize = this.archivoService.formatearTamaño(totalSize);
    
    return `${this.selectedFiles.length} archivo(s) - ${formattedSize}`;
  }

  validarArchivosAntesDeEnviar(): boolean {
    if (this.selectedFiles.length === 0) return true;
    
    const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = this.tamañoTotalMaximoMB * 1024 * 1024;
    
    if (totalSize > maxTotalSize) {
      this.alerta.alertaError(`El tamaño total no puede superar ${this.tamañoTotalMaximoMB}MB`);
      return false;
    }
    
    return true;
  }

  private limpiarInputArchivos(): void {
    const fileInputs = [
      document.getElementById('archivos-nueva-sesion'),
      document.getElementById('archivos-diagnostico')
    ];
    
    fileInputs.forEach(input => {
      if (input) {
        (input as HTMLInputElement).value = '';
      }
    });
    
    this.selectedFiles = [];
  }

  async guardarDiagnostico(): Promise<void> {
    if (this.sesionActual) {
      this.loading = true;
      
      const formData = this.diagnosticoForm.value;
      
      const datosActualizacion: ActualizarSesionRequest = {
        motivoconsulta: formData.motivoconsulta || '',
        notaconsulta: formData.notaconsulta || '',
        recordatorio: formData.recordatorio || '',
        evolucion: formData.evolucion || '',
        diagnosticotratamiento: formData.diagnosticotratamiento || ''
      };

      try {
        await this.historialService.actualizarSesion(
          this.sesionActual.idhistorial, 
          datosActualizacion
        ).toPromise();
        
        if (this.selectedFiles.length > 0) {
          const archivoNuevo = this.selectedFiles[0];
          const rutaAnterior = this.sesionActual.rutahistorialclinico || '';
          
          let rutaNueva: string;
          
          if (archivoNuevo.type.startsWith('image/')) {
            rutaNueva = await this.archivoService.subirFoto(
              'historiales', 
              this.sesionActual.idhistorial, 
              archivoNuevo,
              rutaAnterior
            );
          } else {
            rutaNueva = await this.archivoService.subirDocumento(
              'historiales', 
              this.sesionActual.idhistorial, 
              archivoNuevo,
              rutaAnterior
            );
          }
          
          await this.historialService.actualizarRutaArchivos(
            this.sesionActual.idhistorial, 
            rutaNueva
          ).toPromise();
          
          this.sesionActual.rutahistorialclinico = rutaNueva;
          
          this.alerta.alertaExito('Sesión actualizada - archivo reemplazado correctamente');
        } else {
          this.alerta.alertaExito('Sesión actualizada correctamente');
        }
        
        this.limpiarInputArchivos();
        await this.cargarArchivosExistentes(this.sesionActual.idhistorial);
        this.cargarHistorial();
        this.mostrarHistorial();
        
      } catch (error: any) {
        this.alerta.alertaError(error?.error?.message || 'Error al actualizar la sesión');
      } finally {
        this.loading = false;
      }
    }
  }

  private marcarFormularioComoTocado(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
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
      'motivoconsulta': 'Motivo de consulta',
      'notaconsulta': 'Notas de la sesión',
      'recordatorio': 'Recordatorio',
      'evolucion': 'Evolución',
      'diagnosticotratamiento': 'Diagnóstico y tratamiento'
    };
    return fieldNames[fieldName] || fieldName;
  }

  async cargarArchivosExistentes(idHistorial: number): Promise<void> {
    try {
      const response = await this.historialService.obtenerArchivosSesion(idHistorial).toPromise();
      
      if (response && response.length > 0) {
        this.archivosExistentes = response.map((archivo: any) => {
          let nombreArchivo = archivo.nombre || archivo.nombreOriginal;
          
          if (!nombreArchivo && archivo.ruta) {
            nombreArchivo = archivo.ruta.split('/').pop();
          }
          
          if (!nombreArchivo && archivo.rutaServicio) {
            nombreArchivo = archivo.rutaServicio.split('/').pop();
          }
          
          return {
            id: archivo.id || Date.now() + Math.random(),
            nombre: nombreArchivo || 'Archivo sin nombre',
            nombreOriginal: archivo.nombreOriginal || nombreArchivo,
            ruta: archivo.ruta || archivo.rutaServicio,
            rutaServicio: archivo.rutaServicio || archivo.ruta,
            url: archivo.rutaServicio ? 
              this.archivoService.obtenerUrlPublica(archivo.rutaServicio) : 
              (archivo.ruta ? this.archivoService.obtenerUrlPublica(archivo.ruta) : null),
            tipo: archivo.tipo || archivo.categoria || 'documento',
            categoria: archivo.categoria || archivo.tipo || 'documento',
            tamaño: archivo.tamaño || 0
          };
        });
      } else {
        this.archivosExistentes = [];
      }
      
    } catch (error) {
      this.archivosExistentes = [];
      this.alerta.alertaError('Error al cargar archivos de la sesión');
    }
  }

  descargarArchivo(archivo: any): void {
    let url: string | null = null;
    
    if (archivo.rutaServicio) {
      url = this.archivoService.obtenerUrlPublica(archivo.rutaServicio);
    } else if (archivo.ruta) {
      url = this.archivoService.obtenerUrlPublica(archivo.ruta);
    }
    
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = archivo.nombre || archivo.nombreOriginal || 'archivo';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      this.alerta.alertaError('No se pudo acceder al archivo');
    }
  }

  eliminarSesion(sesion: HistorialMedico): void {
    this.alerta.alertaConfirmacion(
      '¿Eliminar sesión?',
      'Esta acción no se puede deshacer. Se eliminará permanentemente la sesión médica.',
      'Sí, eliminar',
      'Cancelar'
    ).then((confirmado: boolean) => {
      if (confirmado) {
        this.loading = true;
        
        this.historialService.eliminarSesion(sesion.idhistorial).subscribe({
          next: () => {
            this.loading = false;
            this.alerta.alertaExito('Sesión eliminada correctamente');
            this.cargarHistorial();
          },
          error: (error: any) => {
            this.loading = false;
            
            let mensaje = 'Error al eliminar sesión';
            if (error.error && error.error.message) {
              mensaje = error.error.message;
            }
            
            this.alerta.alertaError(mensaje);
          }
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    return this.historialService.formatearFechaDisplay(fecha);
  }

  volver(): void {
    this.router.navigate(['/pacientes']);
  }

  obtenerGenero(): string {
    if (this.infoPaciente?.genero) {
      return this.infoPaciente.genero === 'M' ? 'Masculino' : 'Femenino';
    }
    
    if (this.infoPaciente?.cui) {
      const ultimoDigito = parseInt(this.infoPaciente.cui.slice(-1));
      return ultimoDigito % 2 === 0 ? 'Femenino' : 'Masculino';
    }
    
    return 'N/A';
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem('datosPacienteHistorial');
    this.perfilSubscription?.unsubscribe();
  }
}