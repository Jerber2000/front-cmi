import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

// FullCalendar imports
import { FullCalendarModule } from '@fullcalendar/angular';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Date utilities
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArchivoService } from '../../services/archivo.service';
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { AlertaService } from '../../services/alerta.service';
import { Paciente, ServicioPaciente } from '../../services/paciente.service';
import { AgendaService, CitaRequest } from '../../services/agenda.service';
import { PdfExcelReporteriaService } from '../../services/pdf-excel-reporteria.service';

// Interfaces
export interface Cita {
  idagenda: number;
  fkusuario: number;
  fkpaciente: number;
  fechaatencion: string;
  horaatencion: string;
  comentario?: string;
  transporte?: number;
  fechatransporte?: string;
  horariotransporte?: string;
  direccion?: string;
  usuario: {
    nombres: string;
    apellidos: string;
    profesion?: string;
  };
  paciente: {
    nombres: string;
    apellidos: string;
    cui: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    FullCalendarModule,
    SidebarComponent
  ],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit, AfterViewInit {

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  
  // Configuración del calendario
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: false,
    locale: 'es',
    firstDay: 1,
    height: '100%',
    aspectRatio: 1.35, 
    
    // Configuración de eventos
    events: [],
    selectable: true,
    selectMirror: true,
    dayMaxEvents: 3,
    
    // Callbacks
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
    datesSet: this.handleDatesSet.bind(this),
    
    // Personalización
    titleFormat: { year: 'numeric', month: 'long' },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },
    
    // Configuración de días
    weekends: true,
    editable: false,
    weekNumbers: false,
    
    // Configuración de slots de tiempo
    slotMinTime: '08:00:00',
    slotMaxTime: '18:00:00',
    slotDuration: '01:00:00'
  };

  // Variables de estado
  currentEvents: any[] = [];
  showModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedDate: string = '';
  selectedCita: CitaRequest | null = null;
  selectedMedico: string = '';
  isSelectDisabled: boolean = false;
  currentView: string = 'dayGridMonth';
  loading = false;
  searchTerm: string = '';
  fechaActual: string = '';
  tituloCalendario: string = '';
  sidebarExpanded: boolean = false;
  userInfo: any = {};
  usuario: Usuario[] = [];
  paciente: Paciente[] = [];
  private calendarApi: any = null;

  showModalReporte = false;
  reporteTransportes: any[] = [];
  fechaReporte: string = '';
  loadingReporte = false;

  slotsDisponibles: any[] = [
    { hora: '08:00:00' },
    { hora: '09:00:00' },
    { hora: '10:00:00' },
    { hora: '11:00:00' },
    { hora: '14:00:00' },
    { hora: '15:00:00' },
    { hora: '16:00:00' },
    { hora: '17:00:00' }
  ];

  citaForm!: FormGroup;
  private currentUserId: string = '1';

  constructor(
    private archivoService: ArchivoService,
    private UsuarioService: UsuarioService,
    private PacienteService: ServicioPaciente,
    private alerta: AlertaService,
    private fb: FormBuilder,
    private agendaService: AgendaService,
    private pdfExcelService: PdfExcelReporteriaService 

  ) {
    this.initForm();
    this.fechaActual = new Date().toLocaleDateString('es-ES');
    this.tituloCalendario = format(new Date(), 'MMMM yyyy', { locale: es });
  }

  ngOnInit(): void {
    this.currentUserId = this.getCurrentUserId();
    this.cargarCitas();
    this.loadUserInfo();
    this.cargarUsuariosPorRol();
    this.ListarPacientes();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.detectSidebarState();
      setTimeout(() => {
        this.resizeCalendar();
      }, 500);
    }, 100);
  }

  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);        
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.rutafotoperfil ? this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null
        };
      } 
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
    }
  }

  private getCurrentUserId(): string {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        
        const userId = usuario.idusuario;
        if (userId) {
          return userId.toString();
        }
      }
    } catch (error) {
      console.error('Error al obtener el ID del usuario desde localStorage:', error);
    }
    
    return '1';
  }

  private getCalendarApi(): any {
    if (this.calendarComponent) {
      return this.calendarComponent.getApi();
    }
    return null;
  }

  cargarUsuariosPorRol(): void {
    const usuarioData = localStorage.getItem('usuario');

    if (!usuarioData) {
      console.error('No hay datos de usuario en localStorage');
      return;
    }

    const usuario = JSON.parse(usuarioData);
    const usuarioRol = usuario.fkrol;

    if(usuarioRol == 1 || usuarioRol == 5 || usuarioRol == 4){
      this.UsuarioService.obtenerUsuariosPorRol('2,6,7').subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.usuario = response.data;
          } else {
            this.usuario = [];
            this.alerta.alertaInfo(response.message || 'No se encontraron usuarios');
          }
        },
        error: (error) => {
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al cargar los usuarios por roles');
        }
      });
    } else {
      const currentUserId = this.getCurrentUserId();
      this.isSelectDisabled = true;
      this.selectedMedico = currentUserId;

      this.UsuarioService.obtenerUsuarioPorId(parseInt(currentUserId)).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.usuario = [response.data];
            this.filtrarPorMedico();
          } else {
            this.usuario = [];
            this.alerta.alertaInfo(response.message || 'No se encontró el usuario');
          }
        },
        error: (error) => {
          if(error.status === 403){
            return;
          }
          this.alerta.alertaError('Error al cargar los usuarios por id');
        }
      });
    }
  }

  ListarPacientes(): void {
    this.PacienteService.obtenerListadoPacientes().subscribe({
      next: (listadoUsuario) => { 
        this.paciente = listadoUsuario;
      },
      error: (error) => {
        if (error.status === 403) {
          return;
        }
        this.alerta.alertaError('Error al cargar pacientes');
      }
    });
  }

  onPacienteSeleccionado(event: any): void {
    const idPacienteSeleccionado = event.target.value;
    
    if (!idPacienteSeleccionado) {
      this.citaForm.patchValue({
        nombreEncargado: '',
        contactoEncargado: '',
        direccion: ''
      });
      return;
    }

    const pacienteSeleccionado = this.paciente.find(
      p => p.idpaciente == idPacienteSeleccionado
    );

    if (pacienteSeleccionado) {
      this.citaForm.patchValue({
        nombreEncargado: pacienteSeleccionado.nombreencargado || '',
        contactoEncargado: pacienteSeleccionado.telefonoencargado || '',
        direccion: pacienteSeleccionado.municipio + ', ' + pacienteSeleccionado.aldea + ', ' + pacienteSeleccionado.direccion || ''
      });
    }
  }

  detectSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container') || 
                    document.querySelector('.sidebar') || 
                    document.querySelector('[class*="sidebar"]');
      
      if (sidebar) {
        const isExpanded = sidebar.classList.contains('expanded') || 
                          sidebar.classList.contains('open') ||
                          sidebar.classList.contains('sidebar-expanded');
        
        if (this.sidebarExpanded !== isExpanded) {
          this.sidebarExpanded = isExpanded;
          setTimeout(() => {
            this.resizeCalendar();
          }, 400);
        }
      }
    };

    setTimeout(checkSidebar, 100);
    
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
            const target = mutation.target as Element;
            if (target.classList.contains('sidebar-container') || 
                target.classList.contains('sidebar') ||
                target.className.includes('sidebar')) {
              shouldCheck = true;
            }
          }
        }
      });
      
      if (shouldCheck) {
        checkSidebar();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });

    window.addEventListener('resize', () => {
      setTimeout(() => this.resizeCalendar(), 100);
    });
  }

  private resizeCalendar(): void {
    try {
      if (this.calendarComponent) {
        const api = this.calendarComponent.getApi();
        api.updateSize();
        return;
      }
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
      console.error('Error resizing calendar:', error);
    }
  }

  public forceCalendarResize(): void {
    this.resizeCalendar();
  }

  initForm(): void {
    this.citaForm = this.fb.group({
      fkpaciente: ['', Validators.required],
      fkusuario: ['', Validators.required],
      fechaatencion: ['', Validators.required],
      horaatencion: ['', Validators.required],
      comentario: [''],
      transporte: [0],
      fechatransporte: [''],
      horariotransporte: [''],
      direccion: [''],
      nombreEncargado: [{value: '', disabled: true}],
      contactoEncargado: [{value: '', disabled: true}]
    });

    // Listener para sincronizar fecha de transporte cuando cambia fecha de atención
    this.citaForm.get('fechaatencion')?.valueChanges.subscribe(nuevaFecha => {
      if (nuevaFecha) {
        const transporteValue = this.citaForm.get('transporte')?.value;
        // Solo actualizar si el checkbox de transporte está marcado
        if (transporteValue) {
          this.citaForm.get('fechatransporte')?.setValue(nuevaFecha, { emitEvent: false });
        }
      }
    });

    // Listener para cuando se marque/desmarque el checkbox de transporte
    this.citaForm.get('transporte')?.valueChanges.subscribe(transporte => {
      if (transporte) {
        // Si se marca transporte y hay una fecha de atención, copiarla
        const fechaAtencion = this.citaForm.get('fechaatencion')?.value;
        if (fechaAtencion) {
          this.citaForm.get('fechatransporte')?.setValue(fechaAtencion, { emitEvent: false });
        }
      }
    });
  }

  async cargarCitas(): Promise<void> {
    this.loading = true;
    try {
      this.agendaService.obtenerCitas().subscribe({
        next: (citas: CitaRequest[]) => {
          // Filtrar por médico si está seleccionado
          const citasFiltradas = this.selectedMedico 
            ? citas.filter((c: CitaRequest) => c.fkusuario.toString() === this.selectedMedico)
            : citas;
          
          // Transformar las citas al formato de FullCalendar
          this.calendarOptions.events = citasFiltradas.map((cita: CitaRequest) => ({
            id: cita.idagenda?.toString() || '',
            title: `${cita.paciente?.nombres} ${cita.paciente?.apellidos}`,
            start: `${cita.fechaatencion}T${cita.horaatencion}`,
            backgroundColor: this.getColorPorMedico(cita.fkusuario),
            borderColor: this.getColorPorMedico(cita.fkusuario),
            textColor: '#ffffff',
            extendedProps: {
              medico: `Dr. ${cita.usuario?.nombres} ${cita.usuario?.apellidos}`,
              paciente: `${cita.paciente?.nombres} ${cita.paciente?.apellidos}`,
              comentario: cita.comentario,
              horaatencion: cita.horaatencion,
              citaCompleta: cita
            }
          }));
          
          // Forzar actualización del calendario
          this.calendarOptions = { ...this.calendarOptions };
          
          setTimeout(() => {
            this.resizeCalendar();
          }, 100);
          
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al cargar las citas');
        }
      });
    } catch (error) {
      this.alerta.alertaError('Error al cargar las citas');
      this.loading = false;
    }
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    // Extraer la fecha seleccionada
    const fechaSeleccionada = selectInfo.startStr.split('T')[0];

    // Configurar el modo y la fecha
    this.selectedDate = fechaSeleccionada;
    this.modalMode = 'create';
    this.selectedCita = null;

    // Resetear completamente el formulario con valores por defecto
    this.citaForm.reset({
      fkpaciente: '',              // ← Valor vacío
      fkusuario: '',               // ← Valor vacío
      fechaatencion: fechaSeleccionada,
      horaatencion: '',            // ← Valor vacío
      comentario: '',
      transporte: 0,
      fechatransporte: fechaSeleccionada,
      horariotransporte: '',
      direccion: '',
      nombreEncargado: '',
      contactoEncargado: ''
    });

    // Abrir el modal
    this.showModal = true;

    // Deseleccionar en el calendario
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  }

  handleEventClick(clickInfo: EventClickArg): void {
    this.modalMode = 'view';
    this.selectedCita = clickInfo.event.extendedProps['citaCompleta'];
    this.showModal = true;
  }

  handleEvents(events: any[]): void {
    this.currentEvents = events;
  }

  handleDatesSet(dateInfo: any): void {
    // Obtener la fecha actual de la vista del calendario
    const api = this.getCalendarApi();
    if (api) {
      const currentDate = api.getDate(); // Esta es la fecha real del calendario
      this.tituloCalendario = format(currentDate, 'MMMM yyyy', { locale: es });
    }
    
    setTimeout(() => this.resizeCalendar(), 100);
  }

  getColorPorMedico(medicoId: number): string {
    const colores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colores[medicoId % colores.length];
  }

  abrirModalNuevaCita(): void {
    const fechaHoy = format(new Date(), 'yyyy-MM-dd');
    
    this.selectedDate = fechaHoy;
    this.modalMode = 'create';
    this.selectedCita = null;
    
    // Resetear completamente el formulario con valores por defecto
    this.citaForm.reset({
      fkpaciente: '',              // ← Valor vacío
      fkusuario: '',               // ← Valor vacío
      fechaatencion: fechaHoy,
      horaatencion: '',            // ← Valor vacío
      comentario: '',
      transporte: 0,
      fechatransporte: fechaHoy,
      horariotransporte: '',
      direccion: '',
      nombreEncargado: '',
      contactoEncargado: ''
    });
    
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.selectedCita = null;
    
    // Resetear completamente el formulario
    this.citaForm.reset({
      fkpaciente: '',
      fkusuario: '',
      fechaatencion: '',
      horaatencion: '',
      comentario: '',
      transporte: 0,
      fechatransporte: '',
      horariotransporte: '',
      direccion: '',
      nombreEncargado: '',
      contactoEncargado: ''
    });
  }

  editarCita(): void {
    if (this.selectedCita) {
      
      this.modalMode = 'edit';
      
      // Cargar los datos de la cita en el formulario
      this.citaForm.patchValue({
        fkpaciente: this.selectedCita.fkpaciente,
        fkusuario: this.selectedCita.fkusuario,
        fechaatencion: this.selectedCita.fechaatencion,
        horaatencion: this.selectedCita.horaatencion,
        comentario: this.selectedCita.comentario || '',
        transporte: this.selectedCita.transporte || 0,
        fechatransporte: this.selectedCita.fechatransporte || '',
        horariotransporte: this.selectedCita.horariotransporte || '',
        direccion: this.selectedCita.direccion || ''
      });

      // Si hay paciente seleccionado, cargar sus datos
      if (this.selectedCita.fkpaciente) {
        const pacienteSeleccionado = this.paciente.find(
          p => p.idpaciente === this.selectedCita!.fkpaciente
        );

        if (pacienteSeleccionado) {
          this.citaForm.patchValue({
            nombreEncargado: pacienteSeleccionado.nombreencargado || '',
            contactoEncargado: pacienteSeleccionado.telefonoencargado || '',
            direccion: pacienteSeleccionado.municipio + ', ' + pacienteSeleccionado.aldea + ', ' + pacienteSeleccionado.direccion || '',
          });
        }
      }
    }
  }

  guardarCita(): void {
    if (this.citaForm.invalid) {
      this.alerta.alertaError('Por favor complete todos los campos requeridos');
      return;
    }

    this.loading = true;
    const currentUserId = this.getCurrentUserId();

    const horaSeleccionada = this.citaForm.get('horaatencion')?.value;
    const horaFormateada = horaSeleccionada.includes(':00:00') 
      ? horaSeleccionada 
      : horaSeleccionada.length === 5 
        ? `${horaSeleccionada}:00` 
        : horaSeleccionada;

    const transporteValue = this.citaForm.get('transporte')?.value;
    const transporteNumero = transporteValue ? 1 : 0;

    if (transporteNumero === 1) {
      const fechaTransporte = this.citaForm.get('fechatransporte')?.value;
      const horarioTransporte = this.citaForm.get('horariotransporte')?.value;
      const direccion = this.citaForm.get('direccion')?.value;

      if (!fechaTransporte || !horarioTransporte || !direccion || direccion.trim() === '') {
        this.alerta.alertaError('Cuando se solicita transporte, debe completar la fecha, hora y dirección del transporte');
        this.loading = false;
        return;
      }
    }
    
    const datosCita: CitaRequest = {
      fkusuario:         parseInt(this.citaForm.get('fkusuario')?.value),
      fkpaciente:        parseInt(this.citaForm.get('fkpaciente')?.value),
      fechaatencion:     this.citaForm.get('fechaatencion')?.value,
      horaatencion:      horaFormateada,
      comentario:        this.citaForm.get('comentario')?.value || '',
      transporte:        transporteNumero,
      fechatransporte:   transporteNumero ? this.citaForm.get('fechatransporte')?.value : null,
      horariotransporte: transporteNumero ? this.citaForm.get('horariotransporte')?.value : null,
      direccion:         transporteNumero ? this.citaForm.get('direccion')?.value : '',
      usuariocreacion:   currentUserId,
      usuariomodificacion:currentUserId,
      estado:            1
    };

    if (this.modalMode === 'create') {
      this.agendaService.crearCita(datosCita).subscribe({
        next: (response) => {
          if (response.exito || response.success) {
            this.alerta.alertaExito('Cita creada exitosamente');
            this.cargarCitas();
            this.cerrarModal();
          } else {
            this.alerta.alertaError(response.mensaje || response.message || 'Error al crear la cita');
          }
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          
          this.alerta.alertaError('Error al crear cita. Intenta nuevamente.');
        }
      });
    } else if (this.modalMode === 'edit' && this.selectedCita) {
      // Validar que selectedCita tenga idagenda
      if (!this.selectedCita.idagenda) {
        this.alerta.alertaError('Error: No se encontró el ID de la cita');
        this.loading = false;
        return;
      }

      this.agendaService.actualizarCita(this.selectedCita.idagenda, datosCita).subscribe({
        next: (response) => {
          if (response.exito || response.success) {
            this.alerta.alertaExito('Cita actualizada exitosamente');
            this.cargarCitas();
            this.cerrarModal();
          } else {
            this.alerta.alertaError(response.mensaje || response.message || 'Error al actualizar la cita');
          }
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error interno del servidor');
        }
      });
    }
  }

  async eliminarCita(): Promise<void> {
    if (!this.selectedCita || !this.selectedCita.idagenda) {
      this.alerta.alertaError('No se puede eliminar la cita');
      return;
    }
    
    const confirmacion = await this.alerta.alertaConfirmacion(
      '¿Estás seguro de que deseas eliminar esta cita?',
      '',
      'Sí, eliminar',
      'No, cancelar'
    );
    
    if (!confirmacion) {
      return;
    }
    
    this.loading = true;
    const currentUserId = this.getCurrentUserId();
    
    this.agendaService.eliminarCita(this.selectedCita.idagenda, currentUserId).subscribe({
      next: (response) => {
        if (response.success) {
          this.alerta.alertaExito('Cita eliminada exitosamente');
          this.cargarCitas(); 
          this.cerrarModal();
        } else {
          this.alerta.alertaError(response.message || 'Error al eliminar la cita');
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 403) {
          return;
        }
        this.alerta.alertaError('Error al eliminar la cita');
      }
    });
  }

  cambiarVista(vista: string): void {
    this.currentView = vista;
    if (this.calendarComponent) {
      const api = this.calendarComponent.getApi();
      api.changeView(vista);
      setTimeout(() => this.resizeCalendar(), 100);
    }
  }

  navegarMes(direccion: 'prev' | 'next'): void {
    if (!this.calendarComponent) {
      console.error('Componente de calendario no disponible');
      return;
    }
    
    const api = this.calendarComponent.getApi();
    
    if (direccion === 'prev') {
      api.prev();
    } else {
      api.next();
    }
  }

  irAHoy(): void {
    if (this.calendarComponent) {
      const api = this.calendarComponent.getApi();
      api.today();
    }
  }

  async filtrarPorMedico(): Promise<void> {
    await this.cargarCitas();
  }

  buscarCitas(): void {
    console.log('Buscando:', this.searchTerm);
  }

  abrirModalReporte(): void {
    const fechaHoy = format(new Date(), 'yyyy-MM-dd');
    this.fechaReporte = fechaHoy;
    this.showModalReporte = true;
    
    // Cargar automáticamente el reporte del día actual
    this.generarReporte();
  }

  cerrarModalReporte(): void {
    this.showModalReporte = false;
    this.reporteTransportes = [];
    this.fechaReporte = '';
  }

  generarReporte(): void {
    if (!this.fechaReporte) {
      this.alerta.alertaError('Por favor seleccione una fecha');
      return;
    }
    
    this.loadingReporte = true;
    
    this.agendaService.obtenerCitasConTransporte(this.fechaReporte).subscribe({
      next: (response) => {
        if (response.success) {
          this.reporteTransportes = response.data;
          
          if (this.reporteTransportes.length === 0) {
            this.alerta.alertaInfo('No hay citas con transporte para la fecha seleccionada');
          }
        } else {
          this.alerta.alertaError('Error al generar el reporte');
        }
        this.loadingReporte = false;
      },
      error: (error) => {
        this.loadingReporte = false;
        if (error.status === 403) {
          return;
        }
        this.alerta.alertaError('Error al generar el reporte de transportes');
      }
    });
  }

  async exportarReportePDF(): Promise<void> {
    if (this.reporteTransportes.length === 0) {
      this.alerta.alertaError('No hay datos para exportar');
      return;
    }
    
    try {
      await this.pdfExcelService.generarPDF('transporte', this.reporteTransportes);
      this.alerta.alertaExito('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.alerta.alertaError('Error al generar el PDF');
    }
  }

  exportarReporteExcel(): void {
    if (this.reporteTransportes.length === 0) {
      this.alerta.alertaError('No hay datos para exportar');
      return;
    }
    
    try {
      this.pdfExcelService.generarExcel('transporte', this.reporteTransportes);
      this.alerta.alertaExito('Excel generado exitosamente');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      this.alerta.alertaError('Error al generar el Excel');
    }
  }

  formatearHora(hora: any): string {
    if (!hora) return 'N/A';
    
    // Si es un string con formato completo de timestamp
    if (typeof hora === 'string') {
      // Si tiene microsegundos: "1970-01-01T08:30:00.000Z"
      if (hora.includes('T')) {
        return hora.split('T')[1].substring(0, 5); // Retorna HH:mm
      }
      // Si ya es formato de hora: "08:30:00"
      if (hora.includes(':')) {
        return hora.substring(0, 5); // Retorna HH:mm
      }
    }
    
    // Si es un objeto Date
    if (hora instanceof Date) {
      const horas = hora.getHours().toString().padStart(2, '0');
      const minutos = hora.getMinutes().toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    }
    
    return hora.toString().substring(0, 5);
  }
}