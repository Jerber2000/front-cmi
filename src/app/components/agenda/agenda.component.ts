import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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
import { PerfilService } from '../../services/perfil.service';
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { AlertaService } from '../../services/alerta.service';
import { Paciente, ServicioPaciente } from '../../services/paciente.service';
import { AgendaService, CitaRequest } from '../../services/agenda.service';
import { PdfExcelReporteriaService } from '../../services/pdf-excel-reporteria.service';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
    SidebarComponent,
    HasRoleDirective,
    NgSelectModule
  ],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  private perfilSubscription?: Subscription;
  
  // Configuración del calendario
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: false,
    locale: 'es',
    firstDay: 1,
    
    height: 'auto',
    contentHeight: 'auto',
  
    
    expandRows: true,
    handleWindowResize: true,
    windowResizeDelay: 100,
    
    // Configuración de eventos
    events: [],
    selectable: true,
    selectMirror: true,
    dayMaxEvents: 3,
    
    selectAllow: (selectInfo) => {
      const fechaSeleccionada = selectInfo.startStr.split('T')[0];
      const hoy = format(new Date(), 'yyyy-MM-dd');
      return fechaSeleccionada >= hoy; // Solo permitir selección de hoy en adelante
    },

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
    slotDuration: '01:00:00',
    
    // Forzar que muestre todas las semanas del mes
    fixedWeekCount: false,
    showNonCurrentDates: true
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
  private readonly ROLES_PROFESIONAL: number[] = [5, 6, 10, 12, 13, 15];

  showModalReporte = false;
  reporteTransportes: any[] = [];
  fechaReporte: string = '';
  loadingReporte = false;
  fechaMinima: string = '';

  slotsDisponibles: any[] = [
    { hora: '08:00:00' },
    { hora: '08:30:00' },
    { hora: '09:00:00' },
    { hora: '09:30:00' },
    { hora: '10:00:00' },
    { hora: '10:30:00' },
    { hora: '11:00:00' },
    { hora: '11:30:00' },
    { hora: '14:00:00' },
    { hora: '14:30:00' },
    { hora: '15:00:00' },
    { hora: '15:30:00' },
    { hora: '16:00:00' },
    { hora: '16:30:00' },
    { hora: '17:00:00' }
  ];

  citaForm!: FormGroup;
  private currentUserId: string = '1';

  mostrarRecurrencia: boolean = false;
  tipoRecurrencia: 'diaria' | 'semanal' | 'mensual' = 'semanal';
  intervaloRecurrencia: number = 1;
  diasSemana: { [key: number]: boolean } = {
    1: false, // Lunes
    2: false, // Martes
    3: false, // Miércoles
    4: false, // Jueves
    5: false, // Viernes
    6: false, // Sábado
    0: false  // Domingo
  };
  fechaFinRecurrencia: string = '';
  numeroOcurrencias: number | null = null;
  usarFechaFin: boolean = true; // true = fecha fin, false = número de ocurrencias

  detallesSerieRecurrente: any = null;
  mostrandoCitaRecurrente: boolean = false;
  loadingPacientes: boolean = false;
  loadingUsuarios: boolean = false;

  constructor(
    private archivoService: ArchivoService,
    private UsuarioService: UsuarioService,
    private PacienteService: ServicioPaciente,
    private alerta: AlertaService,
    private fb: FormBuilder,
    private agendaService: AgendaService,
    private pdfExcelService: PdfExcelReporteriaService,
    private router: Router,
    private perfilService: PerfilService
  ) {
    this.initForm();
    this.fechaActual = new Date().toLocaleDateString('es-ES');
    this.tituloCalendario = format(new Date(), 'MMMM yyyy', { locale: es });
  }

  ngOnInit(): void {
    this.perfilSubscription = this.perfilService.perfil$.subscribe({
      next: (usuario) => {
        if (usuario) {
          this.userInfo = this.perfilService.obtenerInfoSidebar();
        }
      }
    });

    this.perfilService.obtenerPerfilDesdeBackend().subscribe();

    this.currentUserId = this.getCurrentUserId();
    this.configurarFiltroAutomatico();
    this.cargarCitas();
    this.loadUserInfo();
    this.cargarUsuariosPorRol();
    this.ListarPacientes();
    this.fechaMinima = format(new Date(), 'yyyy-MM-dd');
  }

  private configurarFiltroAutomatico(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        const esAdministrador = usuario.rol === 'administrador' || 
                              usuario.rol === 'admin' ||
                              usuario.fkrol === 1 ||
                              usuario.idusuario === 1;
        
        if (!esAdministrador && usuario.idusuario) {
          this.selectedMedico = usuario.idusuario.toString();
          this.isSelectDisabled = true;
        } else {
          this.selectedMedico = '';
          this.isSelectDisabled = false;
        }
      }
    } catch (error) {
      this.selectedMedico = '';
      this.isSelectDisabled = false;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.detectSidebarState();
      
      // Forzar render inicial del calendario
      if (this.calendarComponent) {
        const api = this.calendarComponent.getApi();
        api.render();
        api.updateSize();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
  }

  verHistorialClinico(paciente: any): void {
    // Buscar el paciente completo en el array local para obtener expedientes
    const pacienteCompleto = this.paciente.find(p => p.idpaciente === (paciente.idpaciente || paciente.fkpaciente));
    if (pacienteCompleto && pacienteCompleto.idpaciente) {
      // Si tiene expedientes, pasar el número de expediente como query param
      const expediente = pacienteCompleto.expedientes && pacienteCompleto.expedientes.length > 0
        ? pacienteCompleto.expedientes[0].numeroexpediente
        : null;
      this.router.navigate([
        '/historial',
        pacienteCompleto.idpaciente
      ], {
        queryParams: expediente ? { numeroexpediente: expediente } : {}
      });
    } else if (paciente.idpaciente) {
      // Fallback si no está en el array local
      this.router.navigate(['/historial', paciente.idpaciente]);
    }
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
      return;
    }

    const usuario = JSON.parse(usuarioData);
    const usuarioRol = usuario.fkrol;

    this.loadingUsuarios = true;

    if(usuarioRol == 2 || usuarioRol == 6 || usuarioRol == 7 || usuarioRol == 12 || usuarioRol == 13 || usuarioRol == 15){
      const currentUserId = this.getCurrentUserId();
      this.selectedMedico = currentUserId;

      this.citaForm.patchValue({
        fkusuario: parseInt(currentUserId)
      });

      // this.citaForm.get('fkusuario')?.disable();
      // this.isSelectDisabled = true;

      this.UsuarioService.obtenerUsuariosPorRol('5,6,10,12,13,15').subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.usuario = response.data.map(usr => ({
              ...usr,
              nombreCompleto: `Dr. ${usr.nombres} ${usr.apellidos}`.trim()
            }));
            
            const usuarioActualEnLista = this.usuario.find(u => u.idusuario == parseInt(currentUserId));
            
            if (!usuarioActualEnLista) {
              this.UsuarioService.obtenerUsuarioPorId(parseInt(currentUserId)).subscribe({
                next: (responseUsuario) => {
                  if (responseUsuario.success && responseUsuario.data) {
                    const usuarioConNombre = {
                      ...responseUsuario.data,
                      nombreCompleto: `Dr. ${responseUsuario.data.nombres} ${responseUsuario.data.apellidos}`.trim()
                    };
                    this.usuario.unshift(usuarioConNombre);
                    this.filtrarPorMedico();
                    this.loadingUsuarios = false;
                    
                    //Asegurar que siga seleccionado después de cargar
                    this.citaForm.patchValue({
                      fkusuario: parseInt(currentUserId)
                    });
                  }
                },
                error: (error) => {
                  console.error('Error al cargar usuario actual:', error);
                  if(error.status !== 403){
                    this.alerta.alertaError('Error al cargar el usuario actual');
                  }
                  this.loadingUsuarios = false;
                }
              });
            } else {
              this.filtrarPorMedico();
              this.loadingUsuarios = false;
            }
          } else {
            this.usuario = [];
            this.alerta.alertaInfo(response.message || 'No se encontraron usuarios');
            this.loadingUsuarios = false;
          }
        },
        error: (error) => {
          console.error('Error al obtener usuarios por rol:', error);
          if (error.status === 403) {
            this.alerta.alertaError('Error al cargar los usuarios por roles');
          }
          this.loadingUsuarios = false;
        }
      });
    } else {
      // Usuario administrador - puede seleccionar cualquier profesional
      this.isSelectDisabled = false;
      this.citaForm.get('fkusuario')?.enable();
      
      this.UsuarioService.obtenerUsuariosPorRol('5,6,10,12,13,15').subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.usuario = response.data.map(usr => ({
              ...usr,
              nombreCompleto: `Dr. ${usr.nombres} ${usr.apellidos}`.trim()
            }));
          } else {
            this.usuario = [];
            this.alerta.alertaInfo(response.message || 'No se encontraron usuarios');
          }
          this.loadingUsuarios = false;
        },
        error: (error) => {
          console.error('Error al obtener usuarios por rol (admin):', error);
          if (error.status === 403) {
            this.alerta.alertaError('Error al cargar los usuarios por roles');
          }
          this.loadingUsuarios = false;
        }
      });
    }
  }

  ListarPacientes(): void {
    this.loadingPacientes = true;
    this.PacienteService.obtenerListadoPacientes().subscribe({
      next: (listadoUsuario) => { 
        this.paciente = listadoUsuario.map((pac: Paciente) => ({
          ...pac,
          nombreCompleto: `${pac.nombres} ${pac.apellidos} ${pac.cui || ''}`.trim(),
          cui: pac.cui
        }));
        
        this.loadingPacientes = false;
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        this.loadingPacientes = false;
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

  onPacienteSeleccionadoNgSelect(pacienteSeleccionado: any): void {
    if (!pacienteSeleccionado) {
      this.citaForm.patchValue({
        nombreEncargado: '',
        contactoEncargado: '',
        direccion: ''
      });
      return;
    }

    this.citaForm.patchValue({
      nombreEncargado: pacienteSeleccionado.nombreencargado || '',
      contactoEncargado: pacienteSeleccionado.telefonoencargado || '',
      direccion: `${pacienteSeleccionado.municipio || ''}, ${pacienteSeleccionado.aldea || ''}, ${pacienteSeleccionado.direccion || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
    });
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
        
        api.render();
        return;
      }
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
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

  configurarCitaRecurrente(): void {
    // Primero cambiar el estado
    this.mostrarRecurrencia = !this.mostrarRecurrencia;
    
    // Si se desmarca, resetear los valores
    if (!this.mostrarRecurrencia) {
      this.tipoRecurrencia = 'semanal';
      this.intervaloRecurrencia = 1;
      this.diasSemana = {
        1: false, 2: false, 3: false, 4: false,
        5: false, 6: false, 0: false
      };
      this.fechaFinRecurrencia = '';
      this.numeroOcurrencias = null;
      this.usarFechaFin = true;
    } else {
      // Al activar recurrencia, establecer fecha fin por defecto (3 meses)
      const fechaInicio = new Date(this.citaForm.get('fechaatencion')?.value || new Date());
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 3);
      this.fechaFinRecurrencia = format(fechaFin, 'yyyy-MM-dd');
    }
  }

  obtenerDiasSeleccionados(): string {
    const nombresCompletos: { [key: number]: string } = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      0: 'Domingo'
    };
    
    const diasSeleccionados = Object.entries(this.diasSemana)
      .filter(([_, selected]) => selected)
      .map(([dia, _]) => nombresCompletos[parseInt(dia)])
      .filter(nombre => nombre); // Filtrar undefined
    
    return diasSeleccionados.join(', ') || 'Ninguno seleccionado';
  }

  obtenerDiasSeleccionadosNumeros(): string {
    const dias = Object.entries(this.diasSemana)
      .filter(([_, selected]) => selected)
      .map(([dia, _]) => dia);
    return dias.join(',');
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
          
          //  Forzar re-render después de un delay
          setTimeout(() => {
            this.resizeCalendar();
            
            // Forzar render adicional
            if (this.calendarComponent) {
              const api = this.calendarComponent.getApi();
              api.render();
            }
          }, 100);
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar las citas:', error);
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
    const fechaSeleccionada = selectInfo.startStr.split('T')[0];
    const hoy = format(new Date(), 'yyyy-MM-dd');

    if (fechaSeleccionada < hoy) {
      this.alerta.alertaError('No se pueden crear citas en fechas pasadas');
      const calendarApi = selectInfo.view.calendar;
      calendarApi.unselect();
      return;
    }

    this.selectedDate = fechaSeleccionada;
    this.modalMode = 'create';
    this.selectedCita = null;

    // Obtener el usuario actual
    const usuarioData = localStorage.getItem('usuario');
    const usuario = usuarioData ? JSON.parse(usuarioData) : null;
    const usuarioRol = usuario?.fkrol;
    
    // Determinar si debe pre-seleccionar usuario
    let usuarioPreseleccionado = '';
    if (usuarioRol == 2 || usuarioRol == 6 || usuarioRol == 7 || usuarioRol == 12 || usuarioRol == 13 || usuarioRol == 15) {
      usuarioPreseleccionado = this.getCurrentUserId();
    }

    // Resetear formulario con o sin usuario pre-seleccionado
    this.citaForm.reset({
      fkpaciente: null,
      fkusuario: null,
      fechaatencion: fechaSeleccionada,
      horaatencion: '',
      comentario: '',
      transporte: 0,
      fechatransporte: fechaSeleccionada,
      horariotransporte: '',
      direccion: '',
      nombreEncargado: '',
      contactoEncargado: ''
    });

    if (this.ROLES_PROFESIONAL.includes(usuarioRol)) {
      const currentUserId = parseInt(this.getCurrentUserId());
      if (this.usuario.length > 0) {
        this.citaForm.get('fkusuario')?.setValue(currentUserId);
      } else {
        const interval = setInterval(() => {
          if (this.usuario.length > 0) {
            this.citaForm.get('fkusuario')?.setValue(currentUserId);
            clearInterval(interval);
          }
        }, 100);
      }
    }

    // Si es médico, deshabilitar el select
    // if (usuarioPreseleccionado) {
    //   this.citaForm.get('fkusuario')?.disable();
    // }

    this.showModal = true;

    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  }

  handleEventClick(clickInfo: EventClickArg): void {
    this.modalMode = 'view';
    this.selectedCita = clickInfo.event.extendedProps['citaCompleta'];
    
    // Verificar si es cita recurrente y cargar detalles
    if (this.selectedCita?.es_recurrente && this.selectedCita?.fkagenda_recurrente) {
      this.cargarDetallesSerieRecurrente(this.selectedCita.fkagenda_recurrente);
    } else {
      this.detallesSerieRecurrente = null;
      this.mostrandoCitaRecurrente = false;
    }
    
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

  cargarDetallesSerieRecurrente(idagendaRecurrente: number): void {
    this.agendaService.obtenerDetallesSerieRecurrente(idagendaRecurrente).subscribe({
      next: (response) => {
        if (response.success) {
          this.detallesSerieRecurrente = response.data;
          this.mostrandoCitaRecurrente = true;
        }
      },
      error: () => {
        this.mostrandoCitaRecurrente = false;
      }
    });
  }

  abrirModalNuevaCita(): void {
    const fechaHoy = this.fechaMinima;
    
    this.selectedDate = fechaHoy;
    this.modalMode = 'create';
    this.selectedCita = null;

    // Limpiar ng-select de paciente manualmente
    this.citaForm.get('fkpaciente')?.setValue(null);

    const usuarioData = localStorage.getItem('usuario');
    const usuario = usuarioData ? JSON.parse(usuarioData) : null;
    const usuarioRol = usuario?.fkrol;

    this.citaForm.reset({
      fkpaciente: null,        // null en lugar de '' para ng-select
      fkusuario: null,
      fechaatencion: fechaHoy,
      horaatencion: '',
      comentario: '',
      transporte: 0,
      fechatransporte: fechaHoy,
      horariotransporte: '',
      direccion: '',
      nombreEncargado: '',
      contactoEncargado: ''
    });

    // Preseleccionar profesional si el rol corresponde
    if (this.ROLES_PROFESIONAL.includes(usuarioRol)) {
      const currentUserId = parseInt(this.getCurrentUserId());

      // Si la lista ya cargó, setear directo
      if (this.usuario.length > 0) {
        this.citaForm.get('fkusuario')?.setValue(currentUserId);
      } else {
        // Esperar a que cargue la lista
        const interval = setInterval(() => {
          if (this.usuario.length > 0) {
            this.citaForm.get('fkusuario')?.setValue(currentUserId);
            clearInterval(interval);
          }
        }, 100);
      }
    }

    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.selectedCita = null;
    this.mostrarRecurrencia = false;
    this.mostrandoCitaRecurrente = false;
    this.detallesSerieRecurrente = null;
    this.tipoRecurrencia = 'semanal';
    this.intervaloRecurrencia = 1;
    this.diasSemana = {
      1: false, 2: false, 3: false, 4: false,
      5: false, 6: false, 0: false
    };
    this.fechaFinRecurrencia = '';
    this.numeroOcurrencias = null;
    this.usarFechaFin = true;
    
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
      
      // Si es cita recurrente, mostrar advertencia
      if (this.selectedCita.es_recurrente) {
        this.mostrandoCitaRecurrente = true;
      }
      
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

    const fechaCita = this.citaForm.get('fechaatencion')?.value;
    const hoy = format(new Date(), 'yyyy-MM-dd');
    
    if (fechaCita < hoy) {
      this.alerta.alertaError('No se pueden crear citas en fechas pasadas');
      return;
    }

    // Si es recurrente y es semanal, validar que hay días seleccionados
    if (this.mostrarRecurrencia && this.tipoRecurrencia === 'semanal') {
      const diasSeleccionados = this.obtenerDiasSeleccionados();
      if (!diasSeleccionados) {
        this.alerta.alertaError('Debe seleccionar al menos un día de la semana');
        return;
      }
    }

    // Validar que haya fecha fin o número de ocurrencias
    if (this.mostrarRecurrencia) {
      if (this.usarFechaFin && !this.fechaFinRecurrencia) {
        this.alerta.alertaError('Debe especificar una fecha de fin');
        return;
      }
      if (!this.usarFechaFin && (!this.numeroOcurrencias || this.numeroOcurrencias < 1)) {
        this.alerta.alertaError('Debe especificar el número de ocurrencias');
        return;
      }
    }

    this.loading = true;
    const currentUserId = this.getCurrentUserId();

    const fkusuario = this.citaForm.get('fkusuario')?.value || 
                    this.citaForm.getRawValue().fkusuario;
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

    // Si es cita recurrente
    if (this.mostrarRecurrencia && this.modalMode === 'create') {
      const datosRecurrentes: any = {
        //fkusuario: parseInt(this.citaForm.get('fkusuario')?.value),
        fkusuario: parseInt(fkusuario),
        fkpaciente: parseInt(this.citaForm.get('fkpaciente')?.value),
        horaatencion: horaFormateada,
        comentario: this.citaForm.get('comentario')?.value || '',
        transporte: transporteNumero,
        fechatransporte: transporteNumero ? this.citaForm.get('fechatransporte')?.value : null,
        horariotransporte: transporteNumero ? this.citaForm.get('horariotransporte')?.value : null,
        direccion: transporteNumero ? this.citaForm.get('direccion')?.value : '',
        tipo_recurrencia: this.tipoRecurrencia,
        intervalo: this.intervaloRecurrencia,
        fecha_inicio: this.citaForm.get('fechaatencion')?.value,
        usuariocreacion: currentUserId
      };

      // Agrega días de semana si es recurrencia semanal
      if (this.tipoRecurrencia === 'semanal') {
        datosRecurrentes.dias_semana = this.obtenerDiasSeleccionadosNumeros();
      }

      // Agrega fecha fin o número de ocurrencias
      if (this.usarFechaFin) {
        datosRecurrentes.fecha_fin = this.fechaFinRecurrencia;
      } else {
        datosRecurrentes.numero_ocurrencias = this.numeroOcurrencias;
      }

      this.agendaService.crearCitaRecurrente(datosRecurrentes).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.alerta.alertaExito(response.message || 'Citas recurrentes creadas exitosamente');
            this.cargarCitas();
            this.cerrarModal();
          } else {
            if (response.conflictos && response.conflictos.length > 0) {
              const conflictosMsg = response.conflictos
                .map(c => `${c.fecha}: ${c.mensaje}`)
                .join('\n');
              this.alerta.alertaError(`Para alguna fecha seleccionada ya tiene cita agendada`);
            } else {
              this.alerta.alertaInfo(response.message || 'No se pudieron crear las citas');
            }
          }
        },
        error: (error) => {
          console.error('Error al crear citas recurrentes:', error);
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al crear citas recurrentes. Intenta nuevamente.');
        }
      });
      return;
    }

    // Código existente para citas normales
    const datosCita: CitaRequest = {
      //fkusuario: parseInt(this.citaForm.get('fkusuario')?.value),
      fkusuario: parseInt(fkusuario),
      fkpaciente: parseInt(this.citaForm.get('fkpaciente')?.value),
      fechaatencion: this.citaForm.get('fechaatencion')?.value,
      horaatencion: horaFormateada,
      comentario: this.citaForm.get('comentario')?.value || '',
      transporte: transporteNumero,
      fechatransporte: transporteNumero ? this.citaForm.get('fechatransporte')?.value : null,
      horariotransporte: transporteNumero ? this.citaForm.get('horariotransporte')?.value : null,
      direccion: transporteNumero ? this.citaForm.get('direccion')?.value : '',
      usuariocreacion: currentUserId,
      usuariomodificacion: currentUserId,
      estado: 1
    };

    if (this.modalMode === 'create') {
      this.agendaService.crearCita(datosCita).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.alerta.alertaExito(response.message || 'Cita creada exitosamente');
            this.cargarCitas();
            this.cerrarModal();
          } else {
            this.alerta.alertaInfo(response.message || 'No se pudo crear la cita');
          }
        },
        error: (error) => {
          console.error('Error al crear cita:', error);
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al crear cita. Intenta nuevamente.');
        }
      });
    } else if (this.modalMode === 'edit' && this.selectedCita) {
      if (!this.selectedCita.idagenda) {
        this.alerta.alertaError('Error: No se encontró el ID de la cita');
        this.loading = false;
        return;
      }

      this.agendaService.actualizarCita(this.selectedCita.idagenda, datosCita).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.alerta.alertaExito(response.message || 'Cita actualizada exitosamente');
            this.cargarCitas();
            this.cerrarModal();
          } else {
            this.alerta.alertaInfo(response.message || 'No se pudo actualizar la cita');
          }
        },
        error: (error) => {
          console.error('Error al actualizar cita:', error);
          this.loading = false;
          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al actualizar cita. Intenta nuevamente.');
        }
      });
    }
  }

  async eliminarCita(): Promise<void> {
    if (!this.selectedCita || !this.selectedCita.idagenda) {
      this.alerta.alertaError('No se puede eliminar la cita');
      return;
    }
    
    // Si es cita recurrente, preguntar si quiere eliminar solo esta o toda la serie
    if (this.selectedCita.es_recurrente && this.selectedCita.fkagenda_recurrente) {
      const opcion = await this.alerta.alertaConfirmacionConOpciones(
        '¿Qué deseas cancelar?',
        'Esta cita forma parte de una serie recurrente',
        'Solo esta cita',
        'Toda la serie'
      );
      
      if (opcion === null) {
        return; // Usuario canceló
      }
      
      this.loading = true;
      const currentUserId = this.getCurrentUserId();
      
      if (opcion === 'serie') {
        // Eliminar toda la serie
        this.agendaService.cancelarSerieCompleta(
          this.selectedCita.fkagenda_recurrente, 
          currentUserId
        ).subscribe({
          next: (response) => {
            if (response.success) {
              this.alerta.alertaExito(response.message || 'Serie eliminada exitosamente');
              this.cargarCitas();
              this.cerrarModal();
            } else {
              this.alerta.alertaError(response.message || 'Error al eliminar la serie');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al eliminar la serie:', error);
            this.loading = false;
            if (error.status === 403) {
              return;
            }
            this.alerta.alertaError('Error al eliminar la serie');
          }
        });
      } else {
        // Eliminar solo esta cita
        this.agendaService.cancelarCitaRecurrente(
          this.selectedCita.idagenda, 
          currentUserId
        ).subscribe({
          next: (response) => {
            if (response.success) {
              this.alerta.alertaExito(response.message || 'Cita eliminada exitosamente');
              this.cargarCitas();
              this.cerrarModal();
            } else {
              this.alerta.alertaError(response.message || 'Error al eliminar la cita');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cancelar cita recurrente:', error);
            this.loading = false;
            if (error.status === 403) {
              return;
            }
            this.alerta.alertaError('Error al eliminar la cita');
          }
        });
      }
    } else {
      const confirmacion = await this.alerta.alertaConfirmacion(
        '¿Estás seguro de que deseas cancelar esta cita?',
        '',
        'Sí, Cancelar',
        'No, Cerrar'
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
          console.error('Error al eliminar cita directa:', error);
          this.loading = false;

          if (error.status === 403) {
            return;
          }
          this.alerta.alertaError('Error al eliminar la cita');
        }
      });
    }
  }

  formatearTipoRecurrencia(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'diaria': 'Diaria',
      'semanal': 'Semanal',
      'mensual': 'Mensual'
    };
    return tipos[tipo] || tipo;
  }

  formatearDiasSemana(diasStr: string): string {
    if (!diasStr) return 'N/A';
    
    const nombresCompletos: { [key: string]: string } = {
      '1': 'Lunes',
      '2': 'Martes',
      '3': 'Miércoles',
      '4': 'Jueves',
      '5': 'Viernes',
      '6': 'Sábado',
      '0': 'Domingo'
    };
    
    return diasStr.split(',')
      .map(dia => nombresCompletos[dia.trim()])
      .filter(nombre => nombre)
      .join(', ');
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
        console.error('Error al generar reporte de transportes:', error);
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

  // Agregar este método para obtener el nombre del día
  obtenerNombreDia(dia: number): string {
    const nombres: { [key: number]: string } = {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };
    return nombres[dia] || '';
  }

  detectarScrollModal(): void {
    // Esperar a que el modal se renderice
    setTimeout(() => {
      const modalBody = document.querySelector('.modal-body');
      if (modalBody) {
        modalBody.addEventListener('scroll', (event) => {
          const target = event.target as HTMLElement;
          if (target.scrollTop > 10) {
            target.classList.add('scrolled');
          } else {
            target.classList.remove('scrolled');
          }
        });
      }
    }, 100);
  }
}