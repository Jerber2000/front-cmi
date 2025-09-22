import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

// FullCalendar imports
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Date utilities
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArchivoService } from '../../services/archivo.service';

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
export class AgendaComponent implements OnInit {
  
  // Configuración del calendario
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: false, // Desactivar toolbar de FullCalendar
    locale: 'es',
    firstDay: 1, // Lunes como primer día
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
    editable: false, // Deshabilitar edición por drag
    
    // Mostrar números de semana
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

  // Formulario reactivo
  citaForm: any; // Aquí usarías FormBuilder en un proyecto real

  // Citas de ejemplo (en proyecto real vendrían del backend)
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

  constructor(
    private archivoService: ArchivoService
  ) {
    // En un proyecto real inicializarías FormBuilder aquí
    this.initForm();
    this.fechaActual = new Date().toLocaleDateString('es-ES');
    this.tituloCalendario = format(new Date(), 'MMMM yyyy', { locale: es });
    
  }

  ngOnInit(): void {
    this.cargarCitas();
    this.loadUserInfo();
  }

  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);        
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.rutafotoperfil ? this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null
          // role: usuario.fkrol || usuario.role || ''
        };
      } 
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
    }
  }

  ngAfterViewInit(): void {
    // Esperar a que el DOM esté completamente renderizado
    setTimeout(() => {
      this.detectSidebarState();
      
      // Resize inicial para asegurar que el calendario se muestre correctamente
      setTimeout(() => {
        this.resizeCalendar();
      }, 500);
    }, 100);
  }

  detectSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container') || 
                    document.querySelector('.sidebar') || 
                    document.querySelector('[class*="sidebar"]');
      
      if (sidebar) {
        const wasExpanded = this.sidebarExpanded;
        const isExpanded = sidebar.classList.contains('expanded') || 
                          sidebar.classList.contains('open') ||
                          sidebar.classList.contains('sidebar-expanded');
        
        if (this.sidebarExpanded !== isExpanded) {
          this.sidebarExpanded = isExpanded;
          console.log('Sidebar state changed:', isExpanded); // Debug log
          
          // CRÍTICO: Forzar recalculo de FullCalendar después del cambio
          setTimeout(() => {
            this.resizeCalendar();
          }, 400); // Aumentar tiempo para asegurar que termine la transición
        }
      }
    };

    // Check inicial
    setTimeout(checkSidebar, 100);
    
    // Observer mejorado para detectar cambios
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

    // Observar todo el body para capturar cambios del sidebar
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });

    // También escuchar eventos de resize de ventana
    window.addEventListener('resize', () => {
      setTimeout(() => this.resizeCalendar(), 100);
    });
  }

  // MEJORADO: Método más robusto para forzar resize del calendario
  private resizeCalendar(): void {
    try {
      // Método 1: A través del elemento full-calendar
      const fullCalendarElement = document.querySelector('full-calendar') as any;
      if (fullCalendarElement && fullCalendarElement.getApi) {
        const calendarApi = fullCalendarElement.getApi();
        console.log('Resizing calendar via API...'); // Debug log
        calendarApi.updateSize();
        return;
      }

      // Método 2: A través de la instancia del componente (si está disponible)
      const calendarComponent = document.querySelector('full-calendar ng-component') as any;
      if (calendarComponent && calendarComponent.calendar) {
        console.log('Resizing calendar via component...'); // Debug log
        calendarComponent.calendar.updateSize();
        return;
      }

      // Método 3: Forzar mediante event
      window.dispatchEvent(new Event('resize'));
      console.log('Forced window resize event'); // Debug log

    } catch (error) {
      console.error('Error resizing calendar:', error);
      // Fallback: forzar resize de ventana
      window.dispatchEvent(new Event('resize'));
    }
  }

  // NUEVO: Método para llamar desde el template si es necesario
  public forceCalendarResize(): void {
    this.resizeCalendar();
  }

  // NUEVO: Método para debugging - puedes removerlo después
  public debugCalendarSize(): void {
    const calendarWrapper = document.querySelector('.calendar-wrapper') as HTMLElement;
    const fullCalendar = document.querySelector('full-calendar') as HTMLElement;
    
    console.log('Calendar wrapper dimensions:', {
      width: calendarWrapper?.clientWidth,
      offsetWidth: calendarWrapper?.offsetWidth,
      scrollWidth: calendarWrapper?.scrollWidth
    });
    
    console.log('FullCalendar dimensions:', {
      width: fullCalendar?.clientWidth,
      offsetWidth: fullCalendar?.offsetWidth,
      scrollWidth: fullCalendar?.scrollWidth
    });
    
    console.log('Sidebar expanded:', this.sidebarExpanded);
  }

  initForm(): void {
    // Simulación de FormBuilder - en proyecto real usarías FormBuilder
    this.citaForm = {
      get: (field: string) => ({ value: '' }),
      invalid: false,
      reset: () => {},
      patchValue: (values: any) => {}
    };
  }

  async cargarCitas(): Promise<void> {
    this.loading = true;
    try {
      // Simular llamada al backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En proyecto real: const response = await this.agendaService.getCitas(filtros).toPromise();
      const citas = this.selectedMedico 
        ? this.citasEjemplo.filter(c => c.fkusuario.toString() === this.selectedMedico)
        : this.citasEjemplo;
      
      // Convertir citas a eventos de FullCalendar
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
      
      // Forzar actualización del calendario
      this.calendarOptions = { ...this.calendarOptions };
      
      // Forzar resize después de cargar datos
      setTimeout(() => this.resizeCalendar(), 100);
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
    const citaId = parseInt(clickInfo.event.id);
    this.modalMode = 'view';
    this.selectedCita = clickInfo.event.extendedProps['citaCompleta'];
    this.showModal = true;
  }

  handleEvents(events: any[]): void {
    this.currentEvents = events;
  }

  handleDatesSet(dateInfo: any): void {
    // Actualizar título cuando cambian las fechas
    this.tituloCalendario = format(dateInfo.start, 'MMMM yyyy', { locale: es });
    
    // Forzar resize cuando cambian las fechas
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
  }

  editarCita(): void {
    this.modalMode = 'edit';
    // Aquí cargarías los datos de la cita en el formulario
  }

  async guardarCita(): Promise<void> {
    // Aquí implementarías la lógica para guardar
    console.log('Guardando cita...');
    await this.cargarCitas();
    this.cerrarModal();
  }

  async eliminarCita(): Promise<void> {
    if (confirm('¿Está seguro de eliminar esta cita?')) {
      // Aquí implementarías la lógica para eliminar
      console.log('Eliminando cita...');
      await this.cargarCitas();
      this.cerrarModal();
    }
  }

  cambiarVista(vista: string): void {
    this.currentView = vista;
    const calendarApi = (document.querySelector('full-calendar') as any)?.getApi();
    if (calendarApi) {
      calendarApi.changeView(vista);
      // Forzar resize después de cambiar vista
      setTimeout(() => this.resizeCalendar(), 100);
    }
  }

  navegarMes(direccion: 'prev' | 'next'): void {
    const calendarApi = (document.querySelector('full-calendar') as any)?.getApi();
    if (calendarApi) {
      if (direccion === 'prev') {
        calendarApi.prev();
      } else {
        calendarApi.next();
      }
      // Forzar resize después de navegar
      setTimeout(() => this.resizeCalendar(), 100);
    }
  }

  irAHoy(): void {
    const calendarApi = (document.querySelector('full-calendar') as any)?.getApi();
    if (calendarApi) {
      calendarApi.today();
      // Forzar resize después de ir a hoy
      setTimeout(() => this.resizeCalendar(), 100);
    }
  }

  async filtrarPorMedico(): Promise<void> {
    await this.cargarCitas();
  }

  buscarCitas(): void {
    // Implementar búsqueda de citas
    console.log('Buscando:', this.searchTerm);
  }
}