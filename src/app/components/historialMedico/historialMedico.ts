//historialMedico/historialMedico.ts
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { 
  HistorialMedicoService, 
  HistorialMedico, 
  InfoPaciente,
  CrearSesionRequest,
  ActualizarSesionRequest 
} from '../../services/historialMedico.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';
import { ArchivoService } from '../../services/archivo.service';
import { Paciente } from '../../services/paciente.service';
import { ReferidosComponent } from '../referidos/referidos.component';
import { FormularioPsicologiaComponent } from './formularioPsicologia/formulario-psicologia.component'; 



@Component({
  selector: 'app-historial-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent,ReferidosComponent,FormularioPsicologiaComponent ],
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

  archivosSubidosInfo: any[] = []; // Para mantener info de archivos subidos
  maxArchivos = 10; // Límite de archivos
  tamañoMaximoMB = 15; // MB por archivo
  tamañoTotalMaximoMB = 50; // MB total
  
  sesionForm: FormGroup;
  diagnosticoForm: FormGroup;
  
  // ✅ CAMBIO 1: Variables para archivos usando ArchivoService
  selectedFiles: File[] = [];
  archivosSubiendo = false;
  
  // ✅ CAMBIO 2: Variable para foto del paciente
  fotoPacienteUrl: string | null = null;

  // Agregar propiedad para archivos existentes
  archivosExistentes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    public historialService: HistorialMedicoService,
    public archivoService: ArchivoService,
    private alerta: AlertaService,
    private http: HttpClient
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


/**
 * ✅ Elimina el archivo de una sesión (sin obtenerSesion)
 */
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
    // 1. Eliminar archivo físico del servidor
    const rutaEliminar = archivo.rutaServicio || archivo.ruta;
    
    if (rutaEliminar) {
      await this.archivoService.eliminarArchivo(rutaEliminar);
      console.log('✅ Archivo físico eliminado:', rutaEliminar);
    }

    // 2. Actualizar BD (sin archivo)
    await this.historialService.actualizarRutaArchivos(
      this.sesionActual.idhistorial,
      ''  // ✅ Sin archivo
    ).toPromise();

    // 3. Actualizar memoria
    this.sesionActual.rutahistorialclinico = '';

    // 4. Recargar archivos
    await this.cargarArchivosExistentes(this.sesionActual.idhistorial);

    this.alerta.alertaExito('Archivo eliminado correctamente');

  } catch (error: any) {
    console.error('❌ Error eliminando archivo:', error);
    this.alerta.alertaError(error.message || 'Error al eliminar archivo');
  } finally {
    this.loading = false;
  }
}

/**
 * ✅ Obtiene el ícono según el tipo de archivo
 */
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

/**
 * ✅ Verifica si es imagen
 */
esImagen(archivo: any): boolean {
  const nombre = archivo.nombre || archivo.nombreOriginal || '';
  const extension = nombre.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '');
}
  //abrir modal de referido
  abrirModalReferido(): void {
    if (!this.infoPaciente) {
      this.alerta.alertaError('No se encontró información del paciente');
      return;
    }

    this.pacienteParaReferir = {
      idpaciente: this.infoPaciente.idpaciente,
      nombres: this.infoPaciente.nombres,
      apellidos: this.infoPaciente.apellidos,
      cui: this.infoPaciente.cui,
      fechanacimiento: this.infoPaciente.fechanacimiento || '',
      genero: '',
      tipoconsulta: '',
      municipio: '',
      direccion: '',
      expedientes: (this.infoPaciente.expedientes || []).map(exp => ({
        ...exp,
        idexpediente: (exp as any).idexpediente || 0
      }))
    };
  }

  // ✅ AGREGAR ESTE MÉTODO
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
  //  para formatear tamaño
    formatFileSize(size: number): string {
    return this.archivoService.formatearTamaño(size);
  }

  
  ngOnInit(): void {
    this.loadUserInfo();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.idPaciente = parseInt(id);
        this.cargarDatosPaciente();
      }
    });
    this.cargarClinicas(); 
  }


  cargarClinicas(): void {
    // Puedes usar el mismo servicio que en pacientes
    // O hacer un servicio específico para clínicas
    this.http.get<any>(`${environment.apiUrl}/pacientes/clinicas`).subscribe({
      next: (response) => {
        if (response.success) {
          this.clinicas = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando clínicas:', error);
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
      console.error('Error al cargar información del usuario:', error);
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

  cargarDatosPaciente(): void {
    this.loading = true;
    
    const datosPacienteStr = sessionStorage.getItem('datosPacienteHistorial');
    
    if (datosPacienteStr) {
      try {
        const datosFromPacientes = JSON.parse(datosPacienteStr);
        
        console.log('🔍 Datos completos desde sessionStorage:', datosFromPacientes);
        console.log('📋 Género del paciente:', datosFromPacientes.genero);
        
        // ✅ AGREGAR GENERO AL MAPEO
        this.infoPaciente = {
          idpaciente: datosFromPacientes.idpaciente,
          nombres: datosFromPacientes.nombres,
          apellidos: datosFromPacientes.apellidos,
          fkclinica: datosFromPacientes.fkclinica,
          cui: datosFromPacientes.cui,
          genero: datosFromPacientes.genero,  // ✅ AGREGAR ESTA LÍNEA
          fechanacimiento: datosFromPacientes.fechanacimiento,
          expedientes: datosFromPacientes.expedientes || []
        };
        
        console.log('✅ infoPaciente con género:', this.infoPaciente);
        
        if (datosFromPacientes.rutafotoperfil) {
          this.fotoPacienteUrl = this.archivoService.obtenerUrlPublica(datosFromPacientes.rutafotoperfil);
        }
        
        this.loading = false;
        this.cargarHistorial();
        return;
        
      } catch (error) {
        console.error('Error parseando datos del paciente desde sessionStorage:', error);
      }
    }
    
    // Fallback: cargar del backend
    this.historialService.obtenerInfoPaciente(this.idPaciente).subscribe({
      next: (info: InfoPaciente) => {
        this.infoPaciente = info;
        
        if (info.rutafotoperfil) {
          this.fotoPacienteUrl = this.archivoService.obtenerUrlPublica(info.rutafotoperfil);
        }
        
        this.cargarHistorial();
      },
      error: (error: any) => {
        console.error('Error cargando info del paciente:', error);
        this.loading = false;
        this.alerta.alertaError('Error al cargar información del paciente');
      }
    });
  }


  cargarHistorial(): void {
    this.historialService.obtenerHistorialPorPaciente(this.idPaciente).subscribe({
      next: (historial: HistorialMedico[]) => {
        this.historialSesiones = historial;
        this.aplicarFiltroClinica();  // ✅ APLICAR FILTRO
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error cargando historial:', error);
        this.loading = false;
        this.alerta.alertaError('Error al cargar el historial médico');
      }
    });
  }

    //Filtrar historial por clínica
  aplicarFiltroClinica(): void {
    const clinicaId = Number(this.clinicaSeleccionada);
    
    if (clinicaId === 0) {
      this.historialFiltrado = [...this.historialSesiones];
    } else {
      this.historialFiltrado = this.historialSesiones.filter(
        sesion => sesion.fkclinica === clinicaId
      );
    }
    
    console.log('🔍 Filtro aplicado:', clinicaId, 'Resultados:', this.historialFiltrado.length);
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

// Cargar archivos existentes cuando abres una sesión
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

  // CARGAR ARCHIVOS EXISTENTES
  this.cargarArchivosExistentes(sesion.idhistorial);
}

  // ✅ 11. MÉTODO MEJORADO PARA RESET FORMS
  resetForms(): void {
    this.sesionForm.reset();
    this.diagnosticoForm.reset();
    this.sesionActual = null;
    this.selectedFiles = [];
    this.archivosSubidosInfo = [];
    this.limpiarInputArchivos();
  }

// ✅ LIMITAR A 1 SOLO ARCHIVO (como pacientes)
onFilesSelected(event: any): void {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // ✅ SOLO PERMITIR 1 ARCHIVO
  if (files.length > 1) {
    this.alerta.alertaError('Solo puedes subir 1 archivo por sesión');
    event.target.value = '';
    return;
  }

  const archivo = files[0];
  
  // Validar usando ArchivoService
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

  // ✅ REEMPLAZAR (no agregar)
  this.selectedFiles = [archivo];

  // Limpiar input
  event.target.value = '';
}

// ✅ CREAR SESIÓN (sin rutaAnterior porque es nuevo)
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
    
    // ✅ CALCULAR fkclinica con prioridad: paciente > usuario
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
      // 1. Crear la sesión primero
      const sesionCreada = await this.historialService.crearSesion(nuevaSesion).toPromise();
      
      if (!sesionCreada) {
        throw new Error('Error al crear la sesión');
      }
      
      // 2. Si hay UN archivo, subirlo (SIN rutaAnterior porque es nuevo)
      let mensajeFinal = 'Sesión creada correctamente';
      
      if (this.selectedFiles.length > 0) {
        // ✅ TOMAR SOLO EL PRIMER ARCHIVO
        const archivo = this.selectedFiles[0];
        
        let rutaArchivo: string;
        
        if (archivo.type.startsWith('image/')) {
          rutaArchivo = await this.archivoService.subirFoto(
            'historiales', 
            sesionCreada.idhistorial, 
            archivo
            // ✅ SIN rutaAnterior porque es sesión nueva
          );
        } else {
          rutaArchivo = await this.archivoService.subirDocumento(
            'historiales', 
            sesionCreada.idhistorial, 
            archivo
            // ✅ SIN rutaAnterior porque es sesión nueva
          );
        }
        
        // Actualizar la sesión con la ruta del archivo
        await this.historialService.actualizarRutaArchivos(
          sesionCreada.idhistorial, 
          rutaArchivo
        ).toPromise();
        
        mensajeFinal = 'Sesión creada con archivo correctamente';
      }
      
      this.alerta.alertaExito(mensajeFinal);
      
      // 3. Limpiar y recargar
      this.limpiarInputArchivos();
      this.cargarHistorial();
      this.mostrarHistorial();
      
    } catch (error: any) {
      console.error('Error creando sesión:', error);
      this.alerta.alertaError(error?.error?.message || 'Error al crear la sesión');
    } finally {
      this.loading = false;
    }
  }
}


    // ✅ 7. MÉTODO PARA ELIMINAR ARCHIVO INDIVIDUAL
eliminarArchivoSeleccionado(index: number): void {
  if (index >= 0 && index < this.selectedFiles.length) {
    const archivo = this.selectedFiles[index];
    this.selectedFiles.splice(index, 1);
    this.alerta.alertaInfo(`${archivo.name} eliminado de la selección`);
  }
}
  
    // ✅ 8. MÉTODO PARA LIMPIAR TODOS LOS ARCHIVOS
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

 // ✅ 9. MÉTODO PARA OBTENER RESUMEN DE ARCHIVOS
getResumenArchivos(): string {
  if (this.selectedFiles.length === 0) return '';
  
  const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const formattedSize = this.archivoService.formatearTamaño(totalSize);
  
  return `${this.selectedFiles.length} archivo(s) - ${formattedSize}`;
}

  // ✅ 10. MÉTODO PARA VALIDAR ANTES DE ENVIAR
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

  // ✅ CAMBIO 7: Método auxiliar para limpiar inputs de archivos
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


// ✅ VERSIÓN CORRECTA (como pacientes/usuarios - con rutaAnterior)
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
      // 1. Actualizar datos de la sesión
      await this.historialService.actualizarSesion(
        this.sesionActual.idhistorial, 
        datosActualizacion
      ).toPromise();
      
      // 2. Si hay UN archivo nuevo, REEMPLAZAR el anterior
      if (this.selectedFiles.length > 0) {
        // ✅ TOMAR SOLO EL PRIMER ARCHIVO (límite de 1 por sesión)
        const archivoNuevo = this.selectedFiles[0];
        
        // ✅ OBTENER RUTA ANTERIOR (para que el backend la elimine)
        const rutaAnterior = this.sesionActual.rutahistorialclinico || '';
        
        // ✅ SUBIR CON rutaAnterior (backend elimina automáticamente)
        let rutaNueva: string;
        
        if (archivoNuevo.type.startsWith('image/')) {
          rutaNueva = await this.archivoService.subirFoto(
            'historiales', 
            this.sesionActual.idhistorial, 
            archivoNuevo,
            rutaAnterior  // ✅ Backend elimina esta automáticamente
          );
        } else {
          rutaNueva = await this.archivoService.subirDocumento(
            'historiales', 
            this.sesionActual.idhistorial, 
            archivoNuevo,
            rutaAnterior  // ✅ Backend elimina esta automáticamente
          );
        }
        
        // ✅ GUARDAR NUEVA RUTA (solo 1 archivo, no lista)
        await this.historialService.actualizarRutaArchivos(
          this.sesionActual.idhistorial, 
          rutaNueva  // ✅ Solo la ruta nueva, sin comas
        ).toPromise();
        
        // ✅ ACTUALIZAR LA SESIÓN EN MEMORIA
        this.sesionActual.rutahistorialclinico = rutaNueva;
        
        this.alerta.alertaExito('Sesión actualizada - archivo reemplazado correctamente');
      } else {
        this.alerta.alertaExito('Sesión actualizada correctamente');
      }
      
      // 3. Limpiar y recargar
      this.limpiarInputArchivos();
      await this.cargarArchivosExistentes(this.sesionActual.idhistorial);
      this.cargarHistorial();
      this.mostrarHistorial();
      
    } catch (error: any) {
      console.error('Error actualizando sesión:', error);
      this.alerta.alertaError(error?.error?.message || 'Error al actualizar la sesión');
    } finally {
      this.loading = false;
    }
  }
}

  // Métodos auxiliares que permanecen igual
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


// Implementar método para cargar archivos
async cargarArchivosExistentes(idHistorial: number): Promise<void> {
  try {
    console.log('Cargando archivos para sesión:', idHistorial);
    
    const response = await this.historialService.obtenerArchivosSesion(idHistorial).toPromise();
    
    if (response && response.length > 0) {
      this.archivosExistentes = response.map((archivo: any) => {
        // Extraer nombre de archivo
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
          // NO usar environment, usar ArchivoService igual que en usuarios
          url: archivo.rutaServicio ? 
            this.archivoService.obtenerUrlPublica(archivo.rutaServicio) : 
            (archivo.ruta ? this.archivoService.obtenerUrlPublica(archivo.ruta) : null),
          tipo: archivo.tipo || archivo.categoria || 'documento',
          categoria: archivo.categoria || archivo.tipo || 'documento',
          tamaño: archivo.tamaño || 0
        };
      });
      
      console.log('Archivos cargados:', this.archivosExistentes);
    } else {
      console.log('No se encontraron archivos para esta sesión');
      this.archivosExistentes = [];
    }
    
  } catch (error) {
    console.error('Error cargando archivos existentes:', error);
    this.archivosExistentes = [];
    this.alerta.alertaError('Error al cargar archivos de la sesión');
  }
}

// Método para descargar archivos
descargarArchivo(archivo: any): void {
  console.log('Intentando descargar archivo:', archivo);
  
  let url: string | null = null;
  
  // Usar la misma lógica que en el componente de usuarios
  if (archivo.rutaServicio) {
    url = this.archivoService.obtenerUrlPublica(archivo.rutaServicio);
  } else if (archivo.ruta) {
    url = this.archivoService.obtenerUrlPublica(archivo.ruta);
  }
  
  if (url) {
    console.log('URL generada:', url);
    
    // Crear enlace de descarga temporal (igual que en usuarios)
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = archivo.nombre || archivo.nombreOriginal || 'archivo';
    
    // Agregar al DOM temporalmente y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    console.error('No se pudo generar URL para el archivo:', archivo);
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
            console.error('Error eliminando sesión:', error);
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
    // ✅ Si viene del backend directamente
    if (this.infoPaciente?.genero) {
      return this.infoPaciente.genero === 'M' ? 'Masculino' : 'Femenino';
    }
    
    // ✅ Fallback: calcular desde CUI
    if (this.infoPaciente?.cui) {
      const ultimoDigito = parseInt(this.infoPaciente.cui.slice(-1));
      return ultimoDigito % 2 === 0 ? 'Femenino' : 'Masculino';
    }
    
    return 'N/A';
  }

  ngOnDestroy(): void {
    // Limpiar sessionStorage solo al salir del componente
    sessionStorage.removeItem('datosPacienteHistorial');
  }
}