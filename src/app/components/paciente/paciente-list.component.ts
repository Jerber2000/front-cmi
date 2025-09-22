import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ServicioPaciente, Paciente, RespuestaPaciente } from '../../services/paciente.service';
import { ServicioExpediente } from '../../services/expediente.service'; 
import { ArchivoService } from '../../services/archivo.service';
import { AlertaService } from '../../services/alerta.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ExpedienteListaComponent } from '../expediente/expediente';
import { HostListener } from '@angular/core';

// Interfaz para la información del usuario
export interface InformacionUsuario {
  name: string;        
  avatar?: string | undefined;      
  nombres?: string;
  apellidos?: string;
  rol?: string;
}



@Component({
  selector: 'app-paciente-lista',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    SidebarComponent,
    ExpedienteListaComponent 
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './paciente-list.component.html',
  styleUrls: ['./paciente-list.component.scss']
})
export class PacienteListaComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @ViewChild(ExpedienteListaComponent) componenteExpediente!: ExpedienteListaComponent;
  private destruir$ = new Subject<void>();


  @HostListener('document:keydown.escape', ['$event'])
onEscapeKey(event: KeyboardEvent): void {
  if (this.modalAccionesAbierto) {
    this.cerrarModalAcciones();
  }
}
  // Estados de la aplicación
  vistaActual: 'lista' | 'formulario' | 'detalle' | 'modal-expediente' = 'lista';
  datosExpedientePaciente: any = null;
  formularioExpediente: FormGroup | null = null;
  modoEdicion = false;
  cargando = false;
  subiendoArchivos = false;

  //Paginación
   currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  paginatedPacientes: Paciente[] = []; 
  
  //math para usar el template
  Math = Math;

  // Datos principales
  pacientes: Paciente[] = [];
  pacientesFiltrados: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  
  // Formulario
  formularioPaciente: FormGroup;

    // Archivos seleccionados
  selectedFotoPaciente: File | null = null;
  selectedFotoEncargado: File | null = null;
  selectedCartaAutorizacion: File | null = null;

  // Previews específicos para pacientes
  fotoPacientePreview: string | null = null;
  fotoEncargadoPreview: string | null = null;
  cartaAutorizacionPreview: string | null = null;
  
  // Variables de archivos (mantener compatibilidad con HTML)
  fotoSeleccionada: string | null = null;
  fotoEncargadoSeleccionada: string | null = null;
  cartaSeleccionada: string | null = null;
  esCartaPDF = false;
  

  modalAccionesAbierto = false;
  pacienteSeleccionadoAcciones: Paciente | null = null;


abrirModalAcciones(paciente: Paciente, index: number): void {
  this.pacienteSeleccionadoAcciones = paciente;
  this.modalAccionesAbierto = true;
  document.body.style.overflow = 'hidden';
}

cerrarModalAcciones(): void {
  this.modalAccionesAbierto = false;
  this.pacienteSeleccionadoAcciones = null;
  document.body.style.overflow = 'auto';
}

obtenerIniciales(nombres?: string, apellidos?: string): string {
  if (!nombres && !apellidos) return '??';
  const inicial1 = nombres ? nombres.charAt(0).toUpperCase() : '';
  const inicial2 = apellidos ? apellidos.charAt(0).toUpperCase() : '';
  return inicial1 + inicial2 || '??';
}

  
  // Búsqueda y paginación
  terminoBusqueda = '';
  private sujetoBusqueda = new Subject<string>();
  paginaActual = 1;
  tamanoPagina = 10;
  totalElementos = 0;
  totalPaginas = 0;
  
  // Interfaz de usuario
  fechaActual = new Date();
  barraLateralExpandida = true;
  informacionUsuario: any = {
    name: 'Usuario',
    avatar: null
  };
  error = '';

  constructor(
    private servicioUsuario: ServicioPaciente,
    private servicioExpediente: ServicioExpediente,
    private fb: FormBuilder,
    private servicioAlerta: AlertaService,
    private archivoService: ArchivoService,
    private router: Router
  ) {
    this.formularioPaciente = this.crearFormulario();
    this.configurarBusqueda();
  }

  ngOnInit(): void {
    this.cargarInformacionUsuario();
    this.cargarPacientes();
  }

  ngAfterViewInit(): void {
    this.detectarEstadoBarraLateral();
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  // ==========================================
  // CONFIGURACIÓN INICIAL
  // ==========================================


  // Crea el formulario reactivo para pacientes
  crearFormulario(): FormGroup {
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

  
  //Configura la búsqueda con debounce
configurarBusqueda(): void {
  this.sujetoBusqueda
    .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destruir$))
    .subscribe(termino => {
      if (!termino.trim()) {
        this.pacientesFiltrados = [...this.pacientes];
      } else {
        const terminoBusqueda = termino.toLowerCase();
        this.pacientesFiltrados = this.pacientes.filter(paciente =>
          paciente.nombres.toLowerCase().includes(terminoBusqueda) ||
          paciente.apellidos.toLowerCase().includes(terminoBusqueda) ||
          paciente.cui.toLowerCase().includes(terminoBusqueda) ||
          (paciente.telefonopersonal && paciente.telefonopersonal.toLowerCase().includes(terminoBusqueda))
        );
      }
      this.currentPage = 1;
      this.updatePagination();
    });
}


//Carga la información del usuario desde localStorage
cargarInformacionUsuario(): void {
  try {
    const usuarioData = localStorage.getItem('usuario');
    
    if (usuarioData) {
      const usuario = JSON.parse(usuarioData);
      
      // Usar 'any' para evitar problemas de tipos
      this.informacionUsuario = {
        name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
        avatar: usuario.rutafotoperfil ? 
          this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null
      };
    }
  } catch (error) {
    console.error('Error al cargar información del usuario:', error);
    this.informacionUsuario = {
  name: 'Usuario',
  avatar: null
    };
  }
}


  //Detecta el estado de la barra lateral
  detectarEstadoBarraLateral(): void {
    const verificarBarraLateral = () => {
      const barraLateral = document.querySelector('.sidebar-container');
      if (barraLateral) {
        this.barraLateralExpandida = barraLateral.classList.contains('expanded');
      }
    };

    setTimeout(verificarBarraLateral, 100);

    // Observar cambios en el sidebar
    const observer = new MutationObserver(verificarBarraLateral);
    const sidebar = document.querySelector('.sidebar-container');
    
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  // ==========================================
  // NAVEGACIÓN ENTRE VISTAS
  // ==========================================

  //Muestra la vista de lista
  mostrarLista(): void {
    this.vistaActual = 'lista';
    this.reiniciarFormulario();
  }

  //Muestra el formulario para crear nuevo paciente
  mostrarFormulario(): void {
    this.vistaActual = 'formulario';
    this.modoEdicion = false;
    this.reiniciarFormulario();
  }

  //Muestra los detalles de un paciente
  verPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.vistaActual = 'detalle';
  }

  //Abre el formulario para editar un paciente
  editarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.modoEdicion = true;
    this.vistaActual = 'formulario';
    this.llenarFormulario(paciente);
    this.cargarFotosExistentes(paciente);
  }

   //Cierra el modal
  cerrarModal(): void {
    this.vistaActual = 'lista';
    this.reiniciarFormulario();
  }

  
// Reinicia el formulario a su estado inicial
reiniciarFormulario(): void {
  this.formularioPaciente.reset();
  this.formularioPaciente.patchValue({ tipodiscapacidad: 'Ninguna' });
  this.modoEdicion = false;
  this.pacienteSeleccionado = null;
  
  // Limpiar archivos específicos de pacientes
  this.limpiarArchivosSeleccionados();
  
  this.fotoPacientePreview = null;
  this.fotoEncargadoPreview = null;
  this.cartaAutorizacionPreview = null;
  
  // Mantener compatibilidad con HTML
  this.fotoSeleccionada = null;
  this.fotoEncargadoSeleccionada = null;
  this.cartaSeleccionada = null;
  this.esCartaPDF = false;
  this.subiendoArchivos = false;
  this.error = '';
}


  // ==========================================
  // GESTIÓN DE DATOS
  // ==========================================

  
// Carga la lista de pacientes desde el servidor
cargarPacientes(): void {
    this.cargando = true;
    this.error = '';

    this.servicioUsuario.obtenerTodosLosPacientes(this.paginaActual, this.tamanoPagina, this.terminoBusqueda)
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: (respuesta: RespuestaPaciente) => {
          if (respuesta.exito && Array.isArray(respuesta.datos)) {
            this.pacientes = respuesta.datos;
            this.pacientesFiltrados = [...this.pacientes];
            
            // AGREGAR ESTA LÍNEA para inicializar la paginación
            this.updatePagination();
            
            if (respuesta.paginacion) {
              this.totalElementos = respuesta.paginacion.total;
              this.totalPaginas = respuesta.paginacion.totalPaginas;
              this.paginaActual = respuesta.paginacion.pagina;
            }
          } else {
            this.error = 'Error al cargar pacientes';
            this.pacientes = [];
            this.pacientesFiltrados = [];
            this.servicioAlerta.alertaError('Error al cargar pacientes');
          }
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando pacientes:', error);
          this.error = 'Error de conexión';
          this.cargando = false;
          this.pacientes = [];
          this.pacientesFiltrados = [];
          this.servicioAlerta.alertaError('Error de conexión');
        }
      });
  }

 //Filtra los pacientes según el término de búsqueda
filtrarPacientes(): void {
  this.sujetoBusqueda.next(this.terminoBusqueda);
}


formatearTelefono(campo: string): void {
  let valor: string = this.formularioPaciente.get(campo)?.value || '';

  // Quitar todo lo que no sea número
  valor = valor.replace(/\D/g, '');

  // Si ya empieza con 502, lo quitamos (para evitar que el usuario lo escriba)
  if (valor.startsWith('502')) {
    valor = valor.substring(3);
  }

  // Limitar a 8 dígitos (números de Guatemala)
  if (valor.length > 8) {
    valor = valor.substring(0, 8);
  }

  // Formatear: +502-XXXX-XXXX
  let formateado = '';
  if (valor.length > 0) {
    if (valor.length <= 4) {
      formateado = `+502 ${valor}`;
    } else {
      formateado = `+502 ${valor.substring(0, 4)}-${valor.substring(4)}`;
    }
  }

  // Actualizar el campo en el formulario
  this.formularioPaciente.get(campo)?.setValue(formateado, { emitEvent: false });
}

  // ==========================================
  // OPERACIONES CRUD
  // ==========================================

  //Procesa el envío del formulario
  async alEnviar(): Promise<void> {
    if (!this.formularioPaciente.valid) {
      this.marcarFormularioComoTocado(this.formularioPaciente);
      this.servicioAlerta.alertaPreventiva('Complete todos los campos requeridos');
      return;
    }

    this.cargando = true;
    this.error = '';

    try {
      const datosPaciente: Paciente = this.formularioPaciente.value;

      if (this.modoEdicion && this.pacienteSeleccionado?.idpaciente) {
        await this.actualizarPacienteConArchivos(this.pacienteSeleccionado.idpaciente, datosPaciente);
      } else {
        await this.crearPacienteConArchivos(datosPaciente);
      }
    } catch (error) {
      console.error('Error en envío:', error);
      this.error = error instanceof Error ? error.message : 'Error desconocido';
      this.servicioAlerta.alertaError(this.error);
      this.cargando = false;
    }
  }

  // Crea un nuevo paciente con archivos
  private async crearPacienteConArchivos(datosPaciente: Paciente): Promise<void> {
    try {
      const respuesta = await this.servicioUsuario.crearPaciente(datosPaciente)
        .toPromise()
        .then(resp => {
          if (!resp) {
            throw new Error('No se recibió respuesta del servidor');
          }
          return resp;
        });
      
      if (respuesta.exito) {
        const nuevoPaciente = respuesta.datos as Paciente;
        const pacienteId = nuevoPaciente.idpaciente;
        
        if (pacienteId && this.tieneArchivosParaSubir()) {
          const rutasArchivos = await this.subirTodosLosArchivos(pacienteId);
          
          // Actualizar el paciente con las rutas de los archivos
          if (Object.keys(rutasArchivos).length > 0) {
            const datosActualizados: any = {};
            if (rutasArchivos.rutaFotoPaciente) datosActualizados.rutafotoperfil = rutasArchivos.rutaFotoPaciente;
            if (rutasArchivos.rutaFotoEncargado) datosActualizados.rutafotoencargado = rutasArchivos.rutaFotoEncargado;
            if (rutasArchivos.rutaCartaAutorizacion) datosActualizados.rutacartaautorizacion = rutasArchivos.rutaCartaAutorizacion;
            
            // Actualizar paciente con las rutas
            await this.servicioUsuario.actualizarPaciente(pacienteId, datosActualizados).toPromise();
          }
          
          this.servicioAlerta.alertaExito('Paciente creado con archivos');
        } else {
          this.servicioAlerta.alertaExito('Paciente creado exitosamente');
        }
        
        this.cargarPacientes();
        this.mostrarLista();
      } else {
        throw new Error(respuesta.mensaje || 'Error al crear paciente');
      }
    } catch (error) {
      throw error;
    } finally {
      this.cargando = false;
      this.subiendoArchivos = false;
    }
  }


//Actualiza un paciente existente con archivos
private async actualizarPacienteConArchivos(pacienteId: number, datosPaciente: Paciente): Promise<void> {
  try {
    // Si hay archivos nuevos, subirlos primero
    let datosConArchivos = { ...datosPaciente };
    
    if (this.tieneArchivosParaSubir()) {
      const rutasArchivos = await this.subirTodosLosArchivos(pacienteId);
      
      // MANTENER ARCHIVOS EXISTENTES SI NO SE REEMPLAZAN
      const pacienteActual = this.pacienteSeleccionado;
      
      // Solo actualizar rutas si se subieron archivos nuevos
      if (rutasArchivos.rutaFotoPaciente) {
        datosConArchivos.rutafotoperfil = rutasArchivos.rutaFotoPaciente;
      } else if (pacienteActual?.rutafotoperfil) {
        datosConArchivos.rutafotoperfil = pacienteActual.rutafotoperfil;
      }
      
      if (rutasArchivos.rutaFotoEncargado) {
        datosConArchivos.rutafotoencargado = rutasArchivos.rutaFotoEncargado;
      } else if (pacienteActual?.rutafotoencargado) {
        datosConArchivos.rutafotoencargado = pacienteActual.rutafotoencargado;
      }
      
      if (rutasArchivos.rutaCartaAutorizacion) {
        datosConArchivos.rutacartaautorizacion = rutasArchivos.rutaCartaAutorizacion;
      } else if (pacienteActual?.rutacartaautorizacion) {
        datosConArchivos.rutacartaautorizacion = pacienteActual.rutacartaautorizacion;
      }
    } else {
      // SI NO HAY ARCHIVOS NUEVOS, MANTENER LOS EXISTENTES
      const pacienteActual = this.pacienteSeleccionado;
      if (pacienteActual?.rutafotoperfil) datosConArchivos.rutafotoperfil = pacienteActual.rutafotoperfil;
      if (pacienteActual?.rutafotoencargado) datosConArchivos.rutafotoencargado = pacienteActual.rutafotoencargado;
      if (pacienteActual?.rutacartaautorizacion) datosConArchivos.rutacartaautorizacion = pacienteActual.rutacartaautorizacion;
    }

    const respuesta = await this.servicioUsuario.actualizarPaciente(pacienteId, datosConArchivos)
      .toPromise()
      .then(resp => {
        if (!resp) {
          throw new Error('No se recibió respuesta del servidor');
        }
        return resp;
      });
    
    if (respuesta.exito) {
      const mensaje = this.tieneArchivosParaSubir() ? 'Paciente actualizado con archivos' : 'Paciente actualizado exitosamente';
      this.servicioAlerta.alertaExito(mensaje);
      
      // LIMPIAR ARCHIVOS SELECCIONADOS DESPUÉS DE ACTUALIZAR
      this.limpiarArchivosSeleccionados();
      
      this.cargarPacientes();
      this.mostrarLista();
    } else {
      throw new Error(respuesta.mensaje || 'Error al actualizar paciente');
    }
  } catch (error) {
    throw error;
  } finally {
    this.cargando = false;
    this.subiendoArchivos = false;
  }
}

//Método para limpiar archivos seleccionados
private limpiarArchivosSeleccionados(): void {
  this.selectedFotoPaciente = null;
  this.selectedFotoEncargado = null;
  this.selectedCartaAutorizacion = null;
}

  //Verifica si hay archivos para subir
  private tieneArchivosParaSubir(): boolean {
    return !!(this.selectedFotoPaciente || this.selectedFotoEncargado || this.selectedCartaAutorizacion);
  }
  
//Sube todos los archivos seleccionados
private async subirTodosLosArchivos(pacienteId: number): Promise<{ rutaFotoPaciente?: string, rutaFotoEncargado?: string, rutaCartaAutorizacion?: string }> {
  if (!this.tieneArchivosParaSubir()) {
    return {};
  }

  this.subiendoArchivos = true;

  try {
    const resultados: { rutaFotoPaciente?: string, rutaFotoEncargado?: string, rutaCartaAutorizacion?: string } = {};

    // Subir todos los archivos de una vez usando subirArchivos
    // Preparar archivos para subida múltiple
    const archivosParaSubir: { foto?: File, documento?: File } = {};

    // Priorizar foto del paciente como 'foto' principal
    if (this.selectedFotoPaciente) {
      archivosParaSubir.foto = this.selectedFotoPaciente;
    }

    // Si hay carta de autorización, usar como 'documento'
    if (this.selectedCartaAutorizacion) {
      archivosParaSubir.documento = this.selectedCartaAutorizacion;
    }

    // Subir foto del paciente y carta de autorización juntos
    if (Object.keys(archivosParaSubir).length > 0) {
      const resultado = await this.archivoService.subirArchivos('pacientes', pacienteId, archivosParaSubir);
      if (resultado.rutaFoto) resultados.rutaFotoPaciente = resultado.rutaFoto;
      if (resultado.rutaDocumento) resultados.rutaCartaAutorizacion = resultado.rutaDocumento;
    }

    // Subir foto del encargado por separado usando subirFoto
    if (this.selectedFotoEncargado) {
      const rutaEncargado = await this.archivoService.subirFoto('pacientes', pacienteId, this.selectedFotoEncargado);
      resultados.rutaFotoEncargado = rutaEncargado;
    }

    return resultados;
    
  } catch (error) {
    console.error('Error subiendo archivos:', error);
    throw error;
  } finally {
    this.subiendoArchivos = false;
  }
}

  //Elimina un paciente con confirmación
eliminarPaciente(id: number): void {
  this.servicioAlerta.alertaConfirmacion(
    '¿Eliminar paciente?',
    'Esta acción no se puede deshacer. Se eliminará permanentemente el paciente y toda su información.',
    'Sí, eliminar',
    'Cancelar'
  ).then((confirmado: boolean) => {
    if (confirmado) {
      this.cargando = true;
      
      this.servicioUsuario.eliminarPaciente(id)
        .pipe(takeUntil(this.destruir$))
        .subscribe({
          next: (respuesta) => {
            this.cargando = false;
            
            if (respuesta.exito) {
              this.servicioAlerta.alertaExito(respuesta.mensaje || 'Paciente eliminado correctamente');
              this.cargarPacientes();
            } else {
              // ✅ MEJORA: Mostrar mensaje específico del servidor
              this.servicioAlerta.alertaError(respuesta.mensaje || 'Error al eliminar el paciente');
            }
          },
          error: (error) => {
            this.cargando = false;
            console.error('Error completo al eliminar paciente:', error);
            
            let mensajeError = 'Error desconocido al eliminar paciente';
            
            // ✅ MEJORA: Manejar respuestas específicas del backend
            if (error.error && error.error.mensaje) {
              mensajeError = error.error.mensaje;
            } else if (error.error && error.error.message) {
              mensajeError = error.error.message;
            } else if (error.status) {
              switch (error.status) {
                case 400:
                  mensajeError = 'Solicitud inválida. Verifique los datos del paciente.';
                  break;
                case 401:
                  mensajeError = 'No tienes permisos para eliminar pacientes';
                  break;
                case 404:
                  mensajeError = 'Paciente no encontrado';
                  break;
                case 409:
                  // ✅ MEJORA: Mensaje más específico para conflictos
                  mensajeError = error.error?.mensaje || 
                    'No se puede eliminar el paciente porque tiene expedientes activos o historial médico asociado';
                  break;
                case 500:
                  mensajeError = 'Error interno del servidor. Intenta más tarde';
                  break;
                case 0:
                  mensajeError = 'Sin conexión al servidor. Verifica tu conexión a internet';
                  break;
                default:
                  mensajeError = `Error del servidor (código ${error.status}): ${error.statusText || 'Error desconocido'}`;
              }
            } else if (error.message) {
              mensajeError = error.message;
            }
            
            // ✅ MEJORA: Mostrar información adicional si está disponible
            if (error.error?.detalles) {
              const detalles = error.error.detalles;
              if (detalles.historialCount > 0 || detalles.expedientesActivos > 0) {
                mensajeError += `\n\nDetalles:\n• Historiales médicos: ${detalles.historialCount}\n• Expedientes activos: ${detalles.expedientesActivos}`;
                if (detalles.expedientesInactivos > 0) {
                  mensajeError += `\n• Expedientes inactivos: ${detalles.expedientesInactivos}`;
                }
              }
            }
            
            this.servicioAlerta.alertaError(mensajeError);
            
            // Log adicional para debug
            console.error('Detalles del error:', {
              status: error.status,
              statusText: error.statusText,
              errorResponse: error.error,
              fullError: error
            });
          }
        });
    }
  });
}

  // ==========================================
  // GESTIÓN DE EXPEDIENTES MÉDICOS
  // ==========================================

  
  //Verifica si un paciente tiene expedientes
  pacienteTieneExpedientes(paciente: Paciente): boolean {
    return !!(paciente.expedientes && paciente.expedientes.length > 0);
  }

  
   //Obtiene el primer expediente de un paciente
  obtenerPrimerExpediente(paciente: Paciente): any | null {
    if (this.pacienteTieneExpedientes(paciente)) {
      return paciente.expedientes![0];
    }
    return null;
  }

  
  //Obtiene información del expediente para el template
  obtenerInformacionExpedientePaciente(paciente: Paciente): { 
    tieneExpediente: boolean, 
    numeroExpediente?: string, 
    idExpediente?: number 
  } {
    const primerExpediente = this.obtenerPrimerExpediente(paciente);
    
    return {
      tieneExpediente: !!primerExpediente,
      numeroExpediente: primerExpediente?.numeroexpediente,
      idExpediente: primerExpediente?.idexpediente
    };
  }

  //Crear expediente para un paciente específico
  crearExpedientePaciente(paciente: Paciente): void {
    Swal.fire({
      title: 'Crear Expediente Médico',
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
    }).then((resultado: any) => {
      if (resultado.isConfirmed) {
        this.abrirModalExpediente(paciente);
      }
    });
  }

  
  //Ver expediente existente de un paciente
  verExpedientePaciente(paciente: Paciente): void {
    const informacionExpediente = this.obtenerInformacionExpedientePaciente(paciente);
    
    if (!informacionExpediente.tieneExpediente) {
      this.servicioAlerta.alertaPreventiva('Este paciente no tiene expediente asignado');
      return;
    }

    this.servicioAlerta.alertaInfo(
      `Expediente: ${informacionExpediente.numeroExpediente} - Esta funcionalidad se implementará próximamente`
    );
  }

  
  //Abre el modal para crear expediente
  private abrirModalExpediente(paciente: Paciente): void {
    this.datosExpedientePaciente = {
      idpaciente: paciente.idpaciente,
      pacienteInfo: {
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        cui: paciente.cui,
        fechanacimiento: paciente.fechanacimiento,
        genero: paciente.genero
      }
    };

    this.vistaActual = 'modal-expediente';
    
    setTimeout(() => {
      if (this.componenteExpediente) {
        this.componenteExpediente.abrirModalDesdePacientes(this.datosExpedientePaciente);
      }
    }, 100);
  }


  //Cierra el modal de expediente
  cerrarModalExpediente(datosExpediente?: any): void {
    if (datosExpediente) {
      this.servicioAlerta.alertaExito(
        `Expediente creado exitosamente. Número: ${datosExpediente.numeroExpediente}`
      );
      this.actualizarPacienteConExpediente(datosExpediente);
    }
    
    this.vistaActual = 'lista';
    this.datosExpedientePaciente = null;
    this.cargarPacientes();
  }


  // ==========================================
// MÉTODOS ESPECÍFICOS DEL MODAL DE ACCIONES (AGREGAR AL COMPONENTE)
// ==========================================

/**
 * Maneja la acción de editar paciente desde el modal
 */
editarPacienteDesdeModal(paciente: Paciente): void {
  this.cerrarModalAcciones();
  this.editarPaciente(paciente);
}

/**
 * Maneja la acción de crear expediente desde el modal
 */
crearExpedienteDesdeModal(paciente: Paciente): void {
  this.cerrarModalAcciones();
  this.crearExpedientePaciente(paciente);
}

/**
 * Maneja la acción de ver expediente desde el modal
 */
verExpedienteDesdeModal(paciente: Paciente): void {
  this.cerrarModalAcciones();
  this.verExpedientePaciente(paciente);
}

/**
 * Maneja la acción de eliminar paciente desde el modal
 */
eliminarPacienteDesdeModal(paciente: Paciente): void {
  this.cerrarModalAcciones();
  
  if (paciente.idpaciente) {
    this.eliminarPaciente(paciente.idpaciente);
  } else {
    this.servicioAlerta.alertaError('No se puede eliminar: ID de paciente no válido');
  }
}

/**
 * Maneja la navegación al historial clínico desde el modal
 */
verHistorialClinicoDesdeModal(paciente: Paciente): void {
  this.cerrarModalAcciones();
  this.verHistorialClinico(paciente);
}
  
  //Actualiza la información local del paciente con nuevo expediente
  private actualizarPacienteConExpediente(datosExpediente: any): void {
    if (!datosExpediente.pacienteId) {
      return;
    }
    
    const indicePaciente = this.pacientes.findIndex(p => p.idpaciente === datosExpediente.pacienteId);
    
    if (indicePaciente !== -1) {
      if (!this.pacientes[indicePaciente].expedientes) {
        this.pacientes[indicePaciente].expedientes = [];
      }
      
      const nuevoExpediente = {
        idexpediente: datosExpediente.idExpediente,
        numeroexpediente: datosExpediente.numeroExpediente,
        historiaenfermedad: datosExpediente.expediente?.historiaenfermedad || ''
      };
      
      this.pacientes[indicePaciente].expedientes!.push(nuevoExpediente);
      
      const indiceFiltrado = this.pacientesFiltrados.findIndex(p => p.idpaciente === datosExpediente.pacienteId);
      if (indiceFiltrado !== -1) {
        if (!this.pacientesFiltrados[indiceFiltrado].expedientes) {
          this.pacientesFiltrados[indiceFiltrado].expedientes = [];
        }
        
        this.pacientesFiltrados[indiceFiltrado].expedientes!.push(nuevoExpediente);
      }
      
      this.pacientesFiltrados = [...this.pacientesFiltrados];
    }
  }

  // ==========================================
  // GESTIÓN DE ARCHIVOS
  // ==========================================

  
  //Maneja la selección de fotos y documentos
  async alSeleccionarFoto(evento: any, tipo: 'perfil' | 'encargado' | 'carta'): Promise<void> {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  try {
    // VALIDACIONES ESPECÍFICAS PARA CADA TIPO
    if (tipo === 'carta') {
      // Para carta autorización: PDF, Word, Excel, imágenes
      const tiposPermitidos = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ];

      if (!tiposPermitidos.includes(archivo.type)) {
        this.servicioAlerta.alertaError('Solo se permiten archivos PDF, Word, Excel o imágenes');
        evento.target.value = '';
        return;
      }

      // Tamaño máximo 15MB para documentos
      if (archivo.size > 15 * 1024 * 1024) {
        this.servicioAlerta.alertaError('El archivo no puede superar los 15MB');
        evento.target.value = '';
        return;
      }
    } else {
      // Para fotos de paciente y encargado: solo imágenes
      if (!archivo.type.startsWith('image/')) {
        this.servicioAlerta.alertaError('Solo se permiten imágenes (JPG, PNG, WebP)');
        evento.target.value = '';
        return;
      }

      // Tamaño máximo 5MB para imágenes
      if (archivo.size > 5 * 1024 * 1024) {
        this.servicioAlerta.alertaError('Las imágenes no pueden superar los 5MB');
        evento.target.value = '';
        return;
      }
    }

    //  CREAR VISTA PREVIA
    let vistaPrevia: string | null = null;
    let esPDF = false;
    let esDocumento = false;

    if (archivo.type.startsWith('image/')) {
      vistaPrevia = await this.archivoService.crearVistaPrevia(archivo);
    } else if (archivo.type === 'application/pdf') {
      esPDF = true;
      esDocumento = true;
    } else {
      esDocumento = true; // Word, Excel, etc.
    }

    // GUARDAR ARCHIVO Y PREVIEW SEGÚN EL TIPO
    switch (tipo) {
      case 'perfil':
        this.selectedFotoPaciente = archivo;
        this.fotoPacientePreview = vistaPrevia;
        this.fotoSeleccionada = vistaPrevia; // Compatibilidad con HTML
        break;
      case 'encargado':
        this.selectedFotoEncargado = archivo;
        this.fotoEncargadoPreview = vistaPrevia;
        this.fotoEncargadoSeleccionada = vistaPrevia; // Compatibilidad con HTML
        break;
      case 'carta':
        this.selectedCartaAutorizacion = archivo;
        this.cartaAutorizacionPreview = vistaPrevia;
        this.cartaSeleccionada = vistaPrevia; // Compatibilidad con HTML
        this.esCartaPDF = esPDF;
        
        //  AGREGAR INFORMACIÓN DEL ARCHIVO PARA DOCUMENTOS
        if (esDocumento) {
          this.cartaSeleccionada = `${archivo.name} (${this.archivoService.formatearTamaño(archivo.size)})`;
        }
        break;
    }

  } catch (error) {
    console.error('Error procesando archivo:', error);
    this.servicioAlerta.alertaError('Error al procesar archivo');
    evento.target.value = '';
  }
}

   //Elimina una foto o documento seleccionado
  eliminarFoto(tipo: 'perfil' | 'encargado' | 'carta'): void {
  // Si estamos en modo edición y el archivo existe, preguntar confirmación
  if (this.modoEdicion) {
    const paciente = this.pacienteSeleccionado;
    let tieneArchivoExistente = false;
    let nombreArchivo = '';

    switch (tipo) {
      case 'perfil':
        tieneArchivoExistente = !!(paciente?.rutafotoperfil);
        nombreArchivo = 'foto del paciente';
        break;
      case 'encargado':
        tieneArchivoExistente = !!(paciente?.rutafotoencargado);
        nombreArchivo = 'foto del encargado';
        break;
      case 'carta':
        tieneArchivoExistente = !!(paciente?.rutacartaautorizacion);
        nombreArchivo = 'carta de autorización';
        break;
    }

    if (tieneArchivoExistente) {
      this.servicioAlerta.alertaConfirmacion(
        '¿Eliminar archivo?',
        `¿Está seguro de que desea eliminar la ${nombreArchivo}? Esta acción no se puede deshacer.`,
        'Sí, eliminar',
        'Cancelar'
      ).then((confirmado: boolean) => {
        if (confirmado) {
          this.ejecutarEliminacionArchivo(tipo);
        }
      });
      return;
    }
  }
    this.ejecutarEliminacionArchivo(tipo);
}

//Método auxiliar para ejecutar eliminación de archivo
private ejecutarEliminacionArchivo(tipo: 'perfil' | 'encargado' | 'carta'): void {
  switch (tipo) {
    case 'perfil':
      this.selectedFotoPaciente = null;
      this.fotoPacientePreview = null;
      this.fotoSeleccionada = null;
      break;
    case 'encargado':
      this.selectedFotoEncargado = null;
      this.fotoEncargadoPreview = null;
      this.fotoEncargadoSeleccionada = null;
      break;
    case 'carta':
      this.selectedCartaAutorizacion = null;
      this.cartaAutorizacionPreview = null;
      this.cartaSeleccionada = null;
      this.esCartaPDF = false;
      break;
  }
}


  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  
  //Calcula la edad basada en la fecha de nacimiento
  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const diferenciaM = hoy.getMonth() - fechaNac.getMonth();
    if (diferenciaM < 0 || (diferenciaM === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  }


  // Llena el formulario con datos de un paciente existente
  llenarFormulario(paciente: Paciente): void {
    this.formularioPaciente.patchValue({
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


//Carga las fotos existentes de un paciente
cargarFotosExistentes(paciente: Paciente): void {
  // Cargar foto del paciente
  if (paciente.rutafotoperfil) {
    this.fotoPacientePreview = this.archivoService.obtenerUrlPublica(paciente.rutafotoperfil);
    this.fotoSeleccionada = this.fotoPacientePreview; // Compatibilidad
  }
  
  // Cargar foto del encargado  
  if (paciente.rutafotoencargado) {
    this.fotoEncargadoPreview = this.archivoService.obtenerUrlPublica(paciente.rutafotoencargado);
    this.fotoEncargadoSeleccionada = this.fotoEncargadoPreview; // Compatibilidad
  }
  
  // Cargar carta de autorización
  if (paciente.rutacartaautorizacion) {
    this.cartaAutorizacionPreview = this.archivoService.obtenerUrlPublica(paciente.rutacartaautorizacion);
    this.cartaSeleccionada = this.cartaAutorizacionPreview; // Compatibilidad
    
    // Determinar tipo de archivo por extensión
    const extension = paciente.rutacartaautorizacion.toLowerCase().split('.').pop();
    this.esCartaPDF = extension === 'pdf';
    
    // Si es documento (no imagen), mostrar nombre del archivo
    const esImagen = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '');
    if (!esImagen) {
      const nombreArchivo = paciente.rutacartaautorizacion.split('/').pop() || 'Documento';
      this.cartaSeleccionada = nombreArchivo;
    }
  }
}


  // ==========================================
  // VALIDACIONES DE FORMULARIO
  // ==========================================

  //Verifica si un campo específico es inválido
  esCampoInvalido(nombreCampo: string): boolean {
    const campo = this.formularioPaciente.get(nombreCampo);
    return !!(campo && campo.invalid && (campo.dirty || campo.touched));
  }


  //Obtiene el mensaje de error para un campo específico
  obtenerErrorCampo(nombreCampo: string): string {
    const campo = this.formularioPaciente.get(nombreCampo);
    
    if (campo && campo.errors) {
      if (campo.errors['required']) return 'Campo requerido';
      if (campo.errors['minlength']) return 'Muy corto';
      if (campo.errors['pattern']) {
        if (nombreCampo === 'cui') return 'CUI debe tener 13 dígitos';
        return 'Formato inválido';
      }
    }
    return '';
  }

  
  // Marca todos los campos del formulario como tocados
  private marcarFormularioComoTocado(grupoFormulario: FormGroup): void {
    Object.keys(grupoFormulario.controls).forEach(clave => {
      const control = grupoFormulario.get(clave);
      control?.markAsTouched();
    });
  }



//  MÉTODOS DE PAGINACIÓN 

  //Actualiza la información de paginación
  updatePagination(): void {
    this.totalItems = this.pacientesFiltrados.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Asegurar que currentPage esté en el rango válido
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = Math.max(1, this.totalPages);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedPacientes();
  }

  //Actualiza los pacientes que se muestran en la página actual
  updatePaginatedPacientes(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedPacientes = this.pacientesFiltrados.slice(startIndex, endIndex);
  }

  //Navega a una página específica
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPacientes();
    }
  }

  // Navega a la página siguiente
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedPacientes();
    }
  }

  //Navega a la página anterior
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedPacientes();
    }
  }

  // Genera array de páginas para mostrar en la paginación
  getPages(): number[] {
    if (this.totalPages <= 0) return [];
    
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar el inicio si hay menos páginas al final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

   //Maneja el cambio de elementos por página
  onItemsPerPageChange(): void {
    // Asegurar que itemsPerPage sea un número
    this.itemsPerPage = Number(this.itemsPerPage);
    this.currentPage = 1; // Resetear a primera página
    this.updatePagination();
  }

  // Obtiene el rango de elementos mostrados
  getDisplayRange(): string {
    if (this.totalItems === 0) return '0 - 0';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start} - ${end}`;
  }

  // Navega al historial clínico de un paciente específico
verHistorialClinico(paciente: Paciente): void {
  if (!paciente.idpaciente) {
    this.servicioAlerta.alertaPreventiva('No se puede acceder al historial: ID de paciente no válido');
    return;
  }
  
  // Verificar si el paciente tiene al menos un expediente
  const informacionExpediente = this.obtenerInformacionExpedientePaciente(paciente);
  
  if (!informacionExpediente.tieneExpediente) {
    Swal.fire({
      title: 'Expediente Requerido',
      html: `
        <p>El paciente <strong>${paciente.nombres} ${paciente.apellidos}</strong> no tiene un expediente médico asignado.</p>
        <p>¿Desea crear el expediente primero?</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-plus"></i> Crear Expediente',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((resultado: any) => {
      if (resultado.isConfirmed) {
        this.crearExpedientePaciente(paciente);
      }
    });
    return;
  }

  // Guardar datos del paciente
  sessionStorage.setItem('datosPacienteHistorial', JSON.stringify(paciente));
  
  // Navegar al historial clínico - CAMBIÉ ESTA LÍNEA:
  this.router.navigate(['/historial', paciente.idpaciente]);
}
  
}