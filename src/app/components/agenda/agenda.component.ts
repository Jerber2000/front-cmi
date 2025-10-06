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
    height: 'auto',
    
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
  selectedCita: Cita | null = null;
  selectedMedico: string = '';
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

  // Datos para formularios
  medicos: any[] = [
    { id: 1, nombres: 'Juan', apellidos: 'Pérez' },
    { id: 2, nombres: 'María', apellidos: 'García' },
    { id: 3, nombres: 'Carlos', apellidos: 'López' }
  ];

  pacientes: any[] = [
    { id: 1, nombres: 'Ana', apellidos: 'Martínez' },
    { id: 2, nombres: 'Luis', apellidos: 'Rodríguez' },
    { id: 3, nombres: 'Carmen', apellidos: 'Silva' }
  ];

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

  citasEjemplo: Cita[] = [
    {
      idagenda: 1,
      fkusuario: 1,
      fkpaciente: 1,
      fechaatencion: '2025-09-15',
      horaatencion: '09:00:00',
      comentario: 'Consulta de control',
      usuario: { nombres: 'Juan', apellidos: 'Pérez', profesion: 'Medicina General' },
      paciente: { nombres: 'Ana', apellidos: 'Martínez', cui: '1234567890123' }
    },
    {
      idagenda: 2,
      fkusuario: 2,
      fkpaciente: 2,
      fechaatencion: '2025-09-15',
      horaatencion: '14:00:00',
      comentario: 'Primera consulta',
      usuario: { nombres: 'María', apellidos: 'García', profesion: 'Pediatría' },
      paciente: { nombres: 'Luis', apellidos: 'Rodríguez', cui: '9876543210987' }
    }
  ];

  private currentUserId: string = '1';

  constructor(
    private archivoService: ArchivoService,
    private UsuarioService: UsuarioService,
    private PacienteService: ServicioPaciente,
    private alerta: AlertaService,
    private fb: FormBuilder,
    private agendaService: AgendaService
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
    this.UsuarioService.obtenerUsuariosPorRol(2).subscribe({
      next: (usuariosPorRol) => {
        this.usuario = usuariosPorRol;
      },
      error: (error) => {
        console.error('Error al cargar los usuarios por roles: ', error);
        this.alerta.alertaError('Error al cargar los usuarios por roles');
      }
    });
  }

  ListarPacientes(): void {
    this.PacienteService.obtenerListadoPacientes().subscribe({
      next: (listadoUsuario) => { 
        this.paciente = listadoUsuario;
      },
      error: (error) => {
        console.error('Error al cargar los pacientes: ', error);
        this.alerta.alertaError('Error al cargar pacientes');
      }
    });
  }

  onPacienteSeleccionado(event: any): void {
    const idPacienteSeleccionado = event.target.value;
    
    if (!idPacienteSeleccionado) {
      this.citaForm.patchValue({
        nombreEncargado: '',
        contactoEncargado: ''
      });
      return;
    }

    const pacienteSeleccionado = this.paciente.find(
      p => p.idpaciente == idPacienteSeleccionado
    );

    if (pacienteSeleccionado) {
      this.citaForm.patchValue({
        nombreEncargado: pacienteSeleccionado.nombreencargado || '',
        contactoEncargado: pacienteSeleccionado.telefonoencargado || ''
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
  }

  async cargarCitas(): Promise<void> {
    this.loading = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const citas = this.selectedMedico 
        ? this.citasEjemplo.filter(c => c.fkusuario.toString() === this.selectedMedico)
        : this.citasEjemplo;
      
      this.calendarOptions.events = citas.map(cita => ({
        id: cita.idagenda.toString(),
        title: `${cita.paciente.nombres} ${cita.paciente.apellidos}`,
        start: `${cita.fechaatencion}T${cita.horaatencion}`,
        backgroundColor: this.getColorPorMedico(cita.fkusuario),
        borderColor: this.getColorPorMedico(cita.fkusuario),
        textColor: '#ffffff',
        extendedProps: {
          medico: `Dr. ${cita.usuario.nombres} ${cita.usuario.apellidos}`,
          paciente: `${cita.paciente.nombres} ${cita.paciente.apellidos}`,
          comentario: cita.comentario,
          horaatencion: cita.horaatencion,
          citaCompleta: cita
        }
      }));
      
      this.calendarOptions = { ...this.calendarOptions };
      
      setTimeout(() => {
        this.getCalendarApi();
        this.resizeCalendar();
      }, 100);
    } catch (error) {
      console.error('Error cargando citas:', error);
    } finally {
      this.loading = false;
    }
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    this.selectedDate = selectInfo.startStr;
    this.modalMode = 'create';
    this.selectedCita = null;
    this.showModal = true;
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
    this.selectedDate = format(new Date(), 'yyyy-MM-dd');
    this.modalMode = 'create';
    this.selectedCita = null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.selectedCita = null;
    this.citaForm.reset();
  }

  editarCita(): void {
    this.modalMode = 'edit';
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
    
    const datosCita: CitaRequest = {
      fkusuario: parseInt(this.citaForm.get('fkusuario')?.value),
      fkpaciente: parseInt(this.citaForm.get('fkpaciente')?.value),
      fechaatencion: this.citaForm.get('fechaatencion')?.value,
      horaatencion: horaFormateada,
      comentario: this.citaForm.get('comentario')?.value || '',
      transporte: transporteNumero,
      fechatransporte: this.citaForm.get('fechatransporte')?.value || null,
      horariotransporte: this.citaForm.get('horariotransporte')?.value || null,
      direccion: this.citaForm.get('direccion')?.value || null,
      usuariocreacion: currentUserId,
      estado: 1
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
          console.error('Error al crear cita:', error);
          this.alerta.alertaError('Error interno del servidor');
          this.loading = false;
        }
      });
    } else if (this.modalMode === 'edit' && this.selectedCita) {
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
          console.error('Error al actualizar cita:', error);
          this.alerta.alertaError('Error interno del servidor');
          this.loading = false;
        }
      });
    }
  }

  async eliminarCita(): Promise<void> {
    if (confirm('¿Está seguro de eliminar esta cita?')) {
      console.log('Eliminando cita...');
      await this.cargarCitas();
      this.cerrarModal();
    }
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
}