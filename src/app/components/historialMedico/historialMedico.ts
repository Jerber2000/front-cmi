// historialMedico.component.ts - ADAPTADO PARA ArchivoService
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
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


@Component({
  selector: 'app-historial-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './historialMedico.html',
  styleUrls: ['./historialMedico.scss']
})
export class HistorialMedicoComponent implements OnInit, AfterViewInit {
  currentView: 'historial' | 'nueva-sesion' | 'diagnostico' | 'notas-rapidas' = 'historial';
  sidebarExpanded = true;
  loading = false;
  
  idPaciente: number = 0;
  infoPaciente: InfoPaciente | null = null;
  historialSesiones: HistorialMedico[] = [];
  sesionActual: HistorialMedico | null = null;
  userInfo: any = {};
  currentDate = new Date();

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
    private router: Router,
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

  // ✅ CORRECCIÓN 2: Agregar método público para formatear tamaño
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

  // ✅ CAMBIO 3: Cargar datos del paciente con foto
  cargarDatosPaciente(): void {
    this.loading = true;
    
    // Intentar obtener datos del sessionStorage
    const datosPacienteStr = sessionStorage.getItem('datosPacienteHistorial');
    
    if (datosPacienteStr) {
      try {
        const datosFromPacientes = JSON.parse(datosPacienteStr);
        
        // Transformar los datos del formato de Paciente al formato de InfoPaciente
        this.infoPaciente = {
          idpaciente: datosFromPacientes.idpaciente,
          nombres: datosFromPacientes.nombres,
          apellidos: datosFromPacientes.apellidos,
          cui: datosFromPacientes.cui,
          fechanacimiento: datosFromPacientes.fechanacimiento,
          expedientes: datosFromPacientes.expedientes || []
        };
        
        // ✅ OBTENER FOTO DEL PACIENTE
        if (datosFromPacientes.rutafotoperfil) {
          this.fotoPacienteUrl = this.archivoService.obtenerUrlPublica(datosFromPacientes.rutafotoperfil);
        }
        
        // Limpiar sessionStorage después de usar los datos
        sessionStorage.removeItem('datosPacienteHistorial');
        
        this.loading = false;
        this.cargarHistorial();
        return;
        
      } catch (error) {
        console.error('Error parseando datos del paciente desde sessionStorage:', error);
      }
    }
    
    // Fallback: Si no hay datos en sessionStorage, intentar cargar del backend
    this.historialService.obtenerInfoPaciente(this.idPaciente).subscribe({
      next: (info: InfoPaciente) => {
        this.infoPaciente = info;
        // TODO: Aquí necesitarías obtener la foto del paciente desde el servicio de pacientes
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
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error cargando historial:', error);
        this.loading = false;
        this.alerta.alertaError('Error al cargar el historial médico');
      }
    });
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

  // ✅ CAMBIO 4: Método para seleccionar archivos mejorado
  onFilesSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validar número total de archivos
    if (this.selectedFiles.length + files.length > this.maxArchivos) {
      this.alerta.alertaError(`Máximo ${this.maxArchivos} archivos permitidos`);
      return;
    }

    // Procesar cada archivo
    for (let i = 0; i < files.length; i++) {
      const archivo = files[i];
      
      // Verificar duplicados
      const yaExiste = this.selectedFiles.some(f => 
        f.name === archivo.name && f.size === archivo.size
      );
      
      if (yaExiste) {
        this.alerta.alertaPreventiva(`${archivo.name} ya está seleccionado`);
        continue;
      }
      
      // Validar usando ArchivoService
      const validation = this.archivoService.validarArchivo(
        archivo,
        archivo.type.startsWith('image/') ? 'image' : 'document',
        this.tamañoMaximoMB
      );

      if (!validation.valido) {
        this.alerta.alertaError(`${archivo.name}: ${validation.error}`);
        continue;
      }

      this.selectedFiles.push(archivo);
    }

    // Validar tamaño total
    const tamañoTotal = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const tamañoTotalMB = tamañoTotal / (1024 * 1024);
    
    if (tamañoTotalMB > this.tamañoTotalMaximoMB) {
      this.alerta.alertaError(`Tamaño total no puede superar ${this.tamañoTotalMaximoMB}MB`);
      // Remover el último archivo agregado
      this.selectedFiles.pop();
    }

    // Limpiar input
    event.target.value = '';
  }

// REEMPLAZAR TODO EL MÉTODO subirArchivos en historial por este:
async subirArchivos(): Promise<boolean> {
  if (this.selectedFiles.length === 0) {
    return true;
  }

  this.archivosSubiendo = true;

  try {
    // Usar el mismo patrón que usuarios
    const archivos: { foto?: File, documento?: File } = {};
    
    // Separar archivos por tipo
    this.selectedFiles.forEach(archivo => {
      if (archivo.type.startsWith('image/')) {
        archivos.foto = archivo; // Solo tomar la primera imagen
      } else {
        archivos.documento = archivo; // Solo tomar el primer documento
      }
    });

    // Usar el mismo método que usuarios
    await this.archivoService.subirArchivos('historiales', this.idPaciente, archivos);
    
    this.selectedFiles = [];
    return true;
    
  } catch (error) {
    console.error('Error subiendo archivos:', error);
    this.alerta.alertaError('Error al subir archivos');
    return false;
  } finally {
    this.archivosSubiendo = false;
  }
}

// ✅ CORRECCIÓN 3: Tipado correcto para errores
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
    
    // ✅ CORRECCIÓN: Definir nuevaSesion
    const nuevaSesion: CrearSesionRequest = {
      fkpaciente: this.idPaciente,
      fkusuario: usuario.idusuario,
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
      
      // ✅ CORRECCIÓN: Validar que sesionCreada no sea undefined
      if (!sesionCreada) {
        throw new Error('Error al crear la sesión');
      }
      
      // 2. Subir archivos si existen
      let mensajeFinal = 'Sesión creada correctamente';
      
      if (this.selectedFiles.length > 0) {
        const rutasSubidas = await this.subirArchivosHistorial(sesionCreada.idhistorial);
        
        if (rutasSubidas.length > 0) {
          const rutaArchivos = rutasSubidas.join(',');
          // Actualizar la sesión con las rutas de archivos
          await this.historialService.actualizarRutaArchivos(sesionCreada.idhistorial, rutaArchivos).toPromise();
          mensajeFinal = 'Sesión creada con archivos correctamente';
        }
      }
      
      this.alerta.alertaExito(mensajeFinal);
      
      // 3. Limpiar y recargar
      this.limpiarInputArchivos();
      this.cargarHistorial();
      this.mostrarHistorial();
      
    } catch (error: any) {
      console.error('Error creando sesión:', error);
      let mensaje = 'Error al crear la sesión';
      if (error?.error?.message) {
        mensaje = error.error.message;
      }
      
      this.alerta.alertaError(mensaje);
    } finally {
      this.loading = false;
    }
  }
}

async subirArchivosHistorial(idHistorial: number): Promise<string[]> {
  const rutasSubidas: string[] = [];
  
  for (const archivo of this.selectedFiles) {
    try {
      let ruta: string;
      
      if (archivo.type.startsWith('image/')) {
        // Usar tu endpoint genérico para fotos
        ruta = await this.archivoService.subirFoto('historiales', idHistorial, archivo);
      } else {
        // Usar tu endpoint genérico para documentos
        ruta = await this.archivoService.subirDocumento('historiales', idHistorial, archivo);
      }
      
      rutasSubidas.push(ruta);
    } catch (error) {
      console.error(`Error subiendo ${archivo.name}:`, error);
    }
  }
  
  return rutasSubidas;
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


// ✅ CORRECCIÓN 4: Tipado correcto para guardarDiagnostico
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
      // 1. Actualizar la sesión
      const sesionActualizada = await this.historialService.actualizarSesion(
        this.sesionActual.idhistorial, 
        datosActualizacion
      ).toPromise();
      
      // 2. Subir archivos si existen
      if (this.selectedFiles.length > 0) {
        const rutasSubidas = await this.subirArchivosHistorial(this.sesionActual.idhistorial);
        
        if (rutasSubidas.length > 0) {
          const rutaArchivos = rutasSubidas.join(',');
          await this.historialService.actualizarRutaArchivos(this.sesionActual.idhistorial, rutaArchivos).toPromise();
          this.alerta.alertaExito('Sesión actualizada con archivos correctamente');
        } else {
          this.alerta.alertaExito('Sesión actualizada correctamente');
        }
      } else {
        this.alerta.alertaExito('Sesión actualizada correctamente');
      }
      
      // 3. Limpiar y recargar
      this.limpiarInputArchivos();
      this.cargarHistorial();
      this.mostrarHistorial();
      
    } catch (error: any) {
      console.error('Error actualizando sesión:', error);
      let mensaje = 'Error al actualizar la sesión';
      if (error?.error?.message) {
        mensaje = error.error.message;
      }
      
      this.alerta.alertaError(mensaje);
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
}