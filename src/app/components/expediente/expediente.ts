// expediente.ts
import { Component, OnInit, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ExpedienteService, Expediente, ExpedienteResponse, EstadisticasExpediente } from '../../services/expediente.service';
import { AlertaService } from '../../services/alerta.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-expediente-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './expediente.html',
  styleUrls: ['./expediente.scss']
})
export class ExpedienteListComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @Input() mostrarComoModal: boolean = false;
  @Input() pacienteData: any = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() expedienteCreado = new EventEmitter<any>();
  
  private destroy$ = new Subject<void>();
  
  // Estados
  currentView: 'list' | 'form' | 'detail' = 'list';
  isEditMode = false;
  loading = false;
  
  // Datos
  expedientes: Expediente[] = [];
  filteredExpedientes: Expediente[] = [];
  selectedExpediente: Expediente | null = null;
  estadisticas: EstadisticasExpediente | null = null;
  
  // Formulario
  expedienteForm: FormGroup;
  
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
    private expedienteService: ExpedienteService,
    private fb: FormBuilder,
    private alertaService: AlertaService
  ) {
    this.expedienteForm = this.createForm();
    this.setupSearch();
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadExpedientes();
    this.loadEstadisticas();
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
    // ✅ Inicializar correctamente
    numeroexpediente: [''], 
    generarAutomatico: [true], // Por defecto automático
    historiaenfermedad: [''],
    
    // Antecedentes médicos
    antmedico: [''],
    antmedicamento: [''],
    anttraumaticos: [''],
    antfamiliar: [''],
    antalergico: [''],
    antmedicamentos: [''],
    antsustancias: [''],
    antintolerantelactosa: [''],
    
    // Antecedentes fisiológicos
    antfisoinmunizacion: [''],
    antfisocrecimiento: [''],
    antfisohabitos: [''],
    antfisoalimentos: [''],
    
    // Antecedentes gineco-obstétricos
    gineobsprenatales: [''],
    gineobsnatales: [''],
    gineobspostnatales: [''],
    gineobsgestas: [''],
    gineobspartos: [''],
    gineobsabortos: [''],
    gineobscesareas: [''],
    gineobshv: [''],
    gineobsmh: [''],
    gineobsfur: [''],
    gineobsciclos: [''],
    gineobsmenarquia: [''],
    
    // Examen físico
    examenfistc: [''],
    examenfispa: [''],
    examenfisfc: [''],
    examenfisfr: [''],
    examenfissao2: [''],
    examenfispeso: [''],
    examenfistalla: [''],
    examenfisimc: [''],
    examenfisgmt: ['']
  });
}
  abrirModalDesdePacientes(pacienteData: any): void {
    this.pacienteData = pacienteData;
    
    // Pre-llenar el formulario
    this.expedienteForm.patchValue({
      generarAutomatico: true,
      historiaenfermedad: `Expediente médico para ${pacienteData.pacienteInfo.nombres} ${pacienteData.pacienteInfo.apellidos}`
    });
    
    // Mostrar el formulario directamente
    this.showForm();
  }

  setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.filterExpedientes());
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

  viewExpediente(expediente: Expediente): void {
    this.selectedExpediente = expediente;
    this.currentView = 'detail';
  }

  editExpediente(expediente: Expediente): void {
    console.log('=== EDITANDO EXPEDIENTE ===');
    console.log('ID:', expediente.idexpediente);
    
    this.selectedExpediente = expediente;
    this.isEditMode = true;
    this.currentView = 'form';
    this.fillForm(expediente);
  }

  closeModal(): void {
    if (this.mostrarComoModal) {
      this.cerrarModal.emit();
    } else {
      this.currentView = 'list';
      this.resetForm();
    }
  }

resetForm(): void {
  console.log('🔄 Reseteando formulario...');
  
  this.expedienteForm.reset();
  
  // ✅ Establecer valores por defecto correctos
  this.expedienteForm.patchValue({ 
    generarAutomatico: true,
    numeroexpediente: '',
    antintolerantelactosa: ''
  });
  
  // ✅ Limpiar validadores del número de expediente
  const numeroControl = this.expedienteForm.get('numeroexpediente');
  numeroControl?.clearValidators();
  numeroControl?.updateValueAndValidity();
  
  this.isEditMode = false;
  this.selectedExpediente = null;
  this.error = '';
  
  console.log('✅ Formulario reseteado');
}

  // ==========================================
  // DATOS
  // ==========================================

  loadExpedientes(): void {
    this.loading = true;
    this.error = '';

    this.expedienteService.getAllExpedientes(this.currentPage, this.pageSize, this.searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ExpedienteResponse) => {
          console.log('Respuesta del servidor:', response);
          if (response.success && Array.isArray(response.data)) {
            this.expedientes = response.data;
            this.filteredExpedientes = [...this.expedientes];
            if (response.pagination) {
              this.totalItems = response.pagination.total;
              this.totalPages = response.pagination.totalPages;
              this.currentPage = response.pagination.page;
            }
          } else {
            this.error = 'Error al cargar expedientes';
            this.expedientes = [];
            this.filteredExpedientes = [];
            this.alertaService.alertaError('Error al cargar expedientes');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.error = 'Error de conexión';
          this.loading = false;
          this.expedientes = [];
          this.filteredExpedientes = [];
          this.alertaService.alertaError('Error de conexión');
        }
      });
  }

  loadEstadisticas(): void {
    this.expedienteService.getEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.estadisticas = response.data;
          }
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
        }
      });
  }

  filterExpedientes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredExpedientes = [...this.expedientes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredExpedientes = this.expedientes.filter(expediente =>
      expediente.numeroexpediente.toLowerCase().includes(term) ||
      (expediente.historiaenfermedad && expediente.historiaenfermedad.toLowerCase().includes(term)) ||
      (expediente.paciente && expediente.paciente.length > 0 && 
       (expediente.paciente[0].nombres.toLowerCase().includes(term) ||
        expediente.paciente[0].apellidos.toLowerCase().includes(term) ||
        expediente.paciente[0].cui.toLowerCase().includes(term)))
    );
  }

  // ==========================================
  // CRUD
  // ==========================================

// En expediente.ts, reemplaza la función onSubmit con esta versión con más logging:

async onSubmit(): Promise<void> {
  console.log('=== SUBMIT EXPEDIENTE ===');
  
  // ✅ Obtener valores actuales del formulario
  const formValues = this.expedienteForm.value;
  console.log('📋 Valores RAW del formulario:', formValues);
  console.log('🔍 Formulario Angular válido:', this.expedienteForm.valid);
  console.log('🔍 Formulario custom válido:', this.isFormValid());
  console.log('🔍 Modo edición:', this.isEditMode);
  
  // ✅ Validación más robusta
  if (!this.isFormValid()) {
    console.log('❌ Formulario inválido - deteniendo submit');
    this.markFormGroupTouched(this.expedienteForm);
    this.alertaService.alertaPreventiva('Complete todos los campos requeridos');
    return;
  }

  this.loading = true;
  this.error = '';

  try {
    // ✅ Preparar datos para envío
    const expedienteData = this.prepararDatosParaEnvio(formValues);
    console.log('📤 Datos preparados para envío:', expedienteData);
    
    // ✅ Enviar al backend
    if (this.isEditMode && this.selectedExpediente?.idexpediente) {
      await this.updateExpediente(this.selectedExpediente.idexpediente, expedienteData);
    } else {
      await this.createExpediente(expedienteData);
    }
  } catch (error) {
    console.error('❌ Error en submit:', error);
    this.error = error instanceof Error ? error.message : 'Error desconocido';
    this.alertaService.alertaError(this.error);
    this.loading = false;
  }
}

private prepararDatosParaEnvio(formValues: any): any {
  console.log('🔄 Preparando datos para envío...');
  
  // ✅ Clonar los valores del formulario
  const datos = { ...formValues };
  
  // ✅ Si es modo automático, asegurar que numeroexpediente esté vacío o sea null
  if (datos.generarAutomatico === true) {
    datos.numeroexpediente = null; // o ''
    console.log('🤖 Modo automático: numeroexpediente establecido a null');
  }
  
  // ✅ Agregar ID del paciente si está disponible
  if (this.pacienteData?.idpaciente) {
    datos.idpaciente = this.pacienteData.idpaciente;
    console.log('👤 ID del paciente agregado:', datos.idpaciente);
  }
  
  // ✅ Limpiar campos vacíos (convertir strings vacíos a null)
  Object.keys(datos).forEach(key => {
    if (typeof datos[key] === 'string' && datos[key].trim() === '') {
      datos[key] = null;
    }
  });
  
  // ✅ Convertir números
  const camposNumericos = [
    'antintolerantelactosa', 'gineobsgestas', 'gineobspartos', 
    'gineobsabortos', 'gineobscesareas', 'examenfistc', 
    'examenfisfc', 'examenfisfr', 'examenfissao2', 
    'examenfispeso', 'examenfistalla', 'examenfisimc'
  ];
  
  camposNumericos.forEach(campo => {
    if (datos[campo] !== null && datos[campo] !== undefined && datos[campo] !== '') {
      datos[campo] = Number(datos[campo]);
    }
  });
  
  console.log('✅ Datos preparados:', datos);
  return datos;
}

private async createExpediente(expedienteData: Expediente): Promise<void> {
  try {
    // Agregar ID del paciente si está disponible
    if (this.pacienteData?.idpaciente) {
      (expedienteData as any).idpaciente = this.pacienteData.idpaciente;
    }
    
    const response = await this.expedienteService.createExpediente(expedienteData)
      .toPromise()
      .then(resp => {
        if (!resp) {
          throw new Error('No se recibió respuesta del servidor');
        }
        return resp;
      });
    
    if (response.success) {
      console.log('📤 Respuesta completa del backend:', response);
      console.log('📤 Tipo de response.data:', typeof response.data);
      console.log('📤 Es array?:', Array.isArray(response.data));
      
      this.alertaService.alertaExito('Expediente creado exitosamente');
      
      // 🎯 VERIFICAR EL TIPO DE DATOS antes de acceder a las propiedades
      if (this.mostrarComoModal) {
        let expedienteCreado: any = null;
        
        // Verificar si es un array o un objeto
        if (Array.isArray(response.data)) {
          // Si es array, tomar el primer elemento
          expedienteCreado = response.data[0];
          console.log('📦 Datos como array, tomando primer elemento:', expedienteCreado);
        } else {
          // Si es objeto, usar directamente
          expedienteCreado = response.data;
          console.log('📦 Datos como objeto:', expedienteCreado);
        }
        
        // Verificar que tenemos los datos necesarios
        if (expedienteCreado && expedienteCreado.numeroexpediente) {
          const expedienteCompleto = {
            expediente: expedienteCreado,
            numeroExpediente: expedienteCreado.numeroexpediente,
            idExpediente: expedienteCreado.idexpediente,
            pacienteId: this.pacienteData?.idpaciente
          };
          
          console.log('📤 Emitiendo expediente creado:', expedienteCompleto);
          this.expedienteCreado.emit(expedienteCompleto);
        } else {
          console.error('❌ No se encontró numeroexpediente en la respuesta');
          console.error('❌ Estructura recibida:', expedienteCreado);
          
          // Emitir lo que tenemos aunque no sea ideal
          this.expedienteCreado.emit({
            expediente: expedienteCreado,
            numeroExpediente: 'ERROR-NO-NUMERO',
            idExpediente: expedienteCreado?.idexpediente || null,
            pacienteId: this.pacienteData?.idpaciente
          });
        }
        
        // Cerrar modal automáticamente
        setTimeout(() => {
          this.cerrarModal.emit();
        }, 1500);
      } else {
        this.loadExpedientes();
        this.loadEstadisticas();
        this.showList();
      }
    } else {
      throw new Error(response.message || 'Error al crear expediente');
    }
  } catch (error) {
    console.error('❌ Error completo en createExpediente:', error);
    throw error;
  } finally {
    this.loading = false;
  }
}
private async updateExpediente(expedienteId: number, expedienteData: Expediente): Promise<void> {
  try {
    const response = await this.expedienteService.updateExpediente(expedienteId, expedienteData)
      .toPromise()
      .then(resp => {
        if (!resp) {
          throw new Error('No se recibió respuesta del servidor');
        }
        return resp;
      });
    
    if (response.success) {
      this.alertaService.alertaExito('Expediente actualizado exitosamente');
      this.loadExpedientes();
      this.loadEstadisticas();
      this.showList();
    } else {
      throw new Error(response.message || 'Error al actualizar expediente');
    }
  } catch (error) {
    throw error;
  } finally {
    this.loading = false;
  }
}

deleteExpediente(id: number): void {
    const Swal = (window as any).Swal;
    Swal.fire({
      title: '¿Eliminar expediente?',
      text: "Esta acción no se puede deshacer. Si tiene pacientes asignados no se podrá eliminar.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.loading = true;
        
        this.expedienteService.deleteExpediente(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.alertaService.alertaExito('Expediente eliminado');
                this.loadExpedientes();
                this.loadEstadisticas();
              } else {
                this.alertaService.alertaError(response.message || 'Error al eliminar');
              }
              this.loading = false;
            },
            error: (error) => {
              console.error('Error al eliminar:', error);
              if (error.error && error.error.message) {
                this.alertaService.alertaError(error.error.message);
              } else {
                this.alertaService.alertaError('Error al eliminar expediente');
              }
              this.loading = false;
            }
          });
      }
    });
  }

  
  // ==========================================
  // FUNCIONES ESPECIALES
  // ==========================================

onGenerarAutomaticoChange(): void {
  const generarAutomatico = this.expedienteForm.get('generarAutomatico')?.value;
  const numeroExpedienteControl = this.expedienteForm.get('numeroexpediente');
  
  console.log('🔄 Cambio en generarAutomatico:', generarAutomatico);
  
  if (generarAutomatico) {
    // ✅ Modo automático: limpiar y deshabilitar validaciones
    numeroExpedienteControl?.clearValidators();
    numeroExpedienteControl?.setValue('');
    numeroExpedienteControl?.markAsUntouched();
    console.log('✅ Modo automático activado - número se generará automáticamente');
  } else {
    // ✅ Modo manual: activar validaciones
    numeroExpedienteControl?.setValidators([
      Validators.required,
      Validators.minLength(1),
      Validators.pattern(/^[a-zA-Z0-9\-_]+$/)
    ]);
    console.log('✅ Modo manual activado - se requiere número manual');
  }
  
  // ✅ Importante: actualizar el estado del control
  numeroExpedienteControl?.updateValueAndValidity();
}

  async sugerirNumero(): Promise<void> {
    try {
      const response = await this.expedienteService.generarNumeroExpediente()
        .toPromise()
        .then(resp => {
          if (!resp) {
            throw new Error('No se recibió respuesta del servidor');
          }
          return resp;
        });
      
      if (response && response.success) {
        this.expedienteForm.patchValue({
          numeroexpediente: response.data.numeroexpediente
        });
        this.alertaService.alertaInfo(`Número sugerido: ${response.data.numeroexpediente}`);
      }
    } catch (error) {
      console.error('Error al sugerir número:', error);
      this.alertaService.alertaError('Error al generar número de expediente');
    }
  }

  calcularIMC(): void {
    const peso = this.expedienteForm.get('examenfispeso')?.value;
    const talla = this.expedienteForm.get('examenfistalla')?.value;
    
    const imc = this.expedienteService.calcularIMC(peso, talla);
    if (imc !== null) {
      this.expedienteForm.patchValue({ examenfisimc: imc });
    } else {
      this.expedienteForm.patchValue({ examenfisimc: '' });
    }
  }

  getIMCCategory(): string {
    const imc = this.expedienteForm.get('examenfisimc')?.value;
    return this.getIMCCategoryFromValue(imc);
  }

  getIMCCategoryFromValue(imc: number | undefined): string {
    if (!imc) return '';
    
    if (imc < 18.5) return 'Bajo peso';
    if (imc >= 18.5 && imc < 25) return 'Peso normal';
    if (imc >= 25 && imc < 30) return 'Sobrepeso';
    if (imc >= 30) return 'Obesidad';
    return '';
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

fillForm(expediente: Expediente): void {
  console.log('📝 Llenando formulario para edición:', expediente);
  
  // ✅ Al editar, siempre usar modo manual
  this.expedienteForm.patchValue({
    numeroexpediente: expediente.numeroexpediente || '',
    generarAutomatico: false, // ✅ Siempre manual al editar
    historiaenfermedad: expediente.historiaenfermedad || '',
    antmedico: expediente.antmedico || '',
    antmedicamento: expediente.antmedicamento || '',
    anttraumaticos: expediente.anttraumaticos || '',
    antfamiliar: expediente.antfamiliar || '',
    antalergico: expediente.antalergico || '',
    antmedicamentos: expediente.antmedicamentos || '',
    antsustancias: expediente.antsustancias || '',
    antintolerantelactosa: expediente.antintolerantelactosa !== undefined ? expediente.antintolerantelactosa.toString() : '',
    antfisoinmunizacion: expediente.antfisoinmunizacion || '',
    antfisocrecimiento: expediente.antfisocrecimiento || '',
    antfisohabitos: expediente.antfisohabitos || '',
    antfisoalimentos: expediente.antfisoalimentos || '',
    gineobsprenatales: expediente.gineobsprenatales || '',
    gineobsnatales: expediente.gineobsnatales || '',
    gineobspostnatales: expediente.gineobspostnatales || '',
    gineobsgestas: expediente.gineobsgestas || '',
    gineobspartos: expediente.gineobspartos || '',
    gineobsabortos: expediente.gineobsabortos || '',
    gineobscesareas: expediente.gineobscesareas || '',
    gineobshv: expediente.gineobshv || '',
    gineobsmh: expediente.gineobsmh || '',
    gineobsfur: expediente.gineobsfur ? new Date(expediente.gineobsfur).toISOString().split('T')[0] : '',
    gineobsciclos: expediente.gineobsciclos || '',
    gineobsmenarquia: expediente.gineobsmenarquia || '',
    examenfistc: expediente.examenfistc || '',
    examenfispa: expediente.examenfispa || '',
    examenfisfc: expediente.examenfisfc || '',
    examenfisfr: expediente.examenfisfr || '',
    examenfissao2: expediente.examenfissao2 || '',
    examenfispeso: expediente.examenfispeso || '',
    examenfistalla: expediente.examenfistalla || '',
    examenfisimc: expediente.examenfisimc || '',
    examenfisgmt: expediente.examenfisgmt || ''
  });
  
  // ✅ Configurar validadores para modo manual
  this.onGenerarAutomaticoChange();
  
  console.log('✅ Formulario llenado para edición');
}



// AÑADIR ESTA FUNCIÓN A expediente.ts PARA DEBUG INTENSIVO

debugFormulario(): void {
  console.log('='.repeat(50));
  console.log('🐛 DEBUG COMPLETO DEL FORMULARIO');
  console.log('='.repeat(50));
  
  // 1. Estado del formulario
  console.log('📋 ESTADO DEL FORMULARIO:');
  console.log('- Valid:', this.expedienteForm.valid);
  console.log('- Invalid:', this.expedienteForm.invalid);
  console.log('- Dirty:', this.expedienteForm.dirty);
  console.log('- Touched:', this.expedienteForm.touched);
  console.log('- Pristine:', this.expedienteForm.pristine);
  
  // 2. Valores actuales
  console.log('\n📋 VALORES ACTUALES:');
  const valores = this.expedienteForm.value;
  Object.keys(valores).forEach(key => {
    console.log(`- ${key}:`, valores[key]);
  });
  
  // 3. Errores de validación
  console.log('\n❌ ERRORES DE VALIDACIÓN:');
  Object.keys(this.expedienteForm.controls).forEach(key => {
    const control = this.expedienteForm.get(key);
    if (control && control.errors) {
      console.log(`- ${key}:`, control.errors);
    }
  });
  
  // 4. Validación específica del número de expediente
  console.log('\n🔍 VALIDACIÓN NÚMERO EXPEDIENTE:');
  const numeroControl = this.expedienteForm.get('numeroexpediente');
  console.log('- Valor:', numeroControl?.value);
  console.log('- Valid:', numeroControl?.valid);
  console.log('- Invalid:', numeroControl?.invalid);
  console.log('- Errors:', numeroControl?.errors);
  console.log('- Validators:', numeroControl?.validator);
  
  // 5. Validación custom
  console.log('\n🔍 VALIDACIÓN CUSTOM:');
  console.log('- isFormValid():', this.isFormValid());
  
  // 6. Datos que se enviarían
  console.log('\n📤 DATOS QUE SE ENVIARÍAN:');
  const datosParaEnvio = this.prepararDatosParaEnvio(valores);
  console.log(datosParaEnvio);
  
  console.log('='.repeat(50));
}

// LLAMAR ESTA FUNCIÓN ANTES DE onSubmit()
async onSubmitConDebug(): Promise<void> {
  // 🐛 ACTIVAR DEBUG
  this.debugFormulario();
  
  // Proceder con el submit normal
  await this.onSubmit();
}

// TAMBIÉN PUEDES AGREGAR ESTA FUNCIÓN PARA COMPARAR CON POSTMAN
generarDataPostman(): void {
  console.log('📮 DATOS PARA POSTMAN:');
  
  const datosPostman = {
    "numeroexpediente": "",
    "generarAutomatico": true,
    "historiaenfermedad": "Prueba desde frontend",
    "antmedico": null,
    "antmedicamento": null,
    "anttraumaticos": null,
    "antfamiliar": null,
    "antalergico": null,
    "antmedicamentos": null,
    "antsustancias": null,
    "antintolerantelactosa": 0,
    "antfisoinmunizacion": null,
    "antfisocrecimiento": null,
    "antfisohabitos": null,
    "antfisoalimentos": null,
    "gineobsprenatales": null,
    "gineobsnatales": null,
    "gineobspostnatales": null,
    "gineobsgestas": null,
    "gineobspartos": null,
    "gineobsabortos": null,
    "gineobscesareas": null,
    "gineobshv": null,
    "gineobsmh": null,
    "gineobsfur": null,
    "gineobsciclos": null,
    "gineobsmenarquia": null,
    "examenfistc": null,
    "examenfispa": null,
    "examenfisfc": null,
    "examenfisfr": null,
    "examenfissao2": null,
    "examenfispeso": null,
    "examenfistalla": null,
    "examenfisimc": null,
    "examenfisgmt": null
  };
  
  console.log('Copia esto en Postman:', JSON.stringify(datosPostman, null, 2));
}
  getIntolerancieLactosaText(value: number | undefined): string {
    return this.expedienteService.getIntolerancieLactosaText(value);
  }

  // ==========================================
  // FUNCIONES PARA LA VISTA DETALLE
  // ==========================================

  hasAntecedentes(): boolean {
    if (!this.selectedExpediente) return false;
    const exp = this.selectedExpediente;
    return !!(
      exp.antmedico || 
      exp.antmedicamento || 
      exp.anttraumaticos || 
      exp.antfamiliar || 
      exp.antalergico || 
      exp.antintolerantelactosa !== undefined
    );
  }

  hasGineObsteticos(): boolean {
    if (!this.selectedExpediente) return false;
    const exp = this.selectedExpediente;
    return !!(
      exp.gineobsprenatales ||
      exp.gineobsnatales ||
      exp.gineobspostnatales ||
      exp.gineobsgestas !== undefined ||
      exp.gineobspartos !== undefined ||
      exp.gineobsabortos !== undefined ||
      exp.gineobscesareas !== undefined ||
      exp.gineobsfur ||
      exp.gineobsmenarquia
    );
  }

  hasExamenFisico(): boolean {
    if (!this.selectedExpediente) return false;
    const exp = this.selectedExpediente;
    return !!(
      exp.examenfistc ||
      exp.examenfispa ||
      exp.examenfisfc ||
      exp.examenfisfr ||
      exp.examenfissao2 ||
      exp.examenfispeso ||
      exp.examenfistalla ||
      exp.examenfisimc ||
      exp.examenfisgmt
    );
  }

  // ==========================================
  // VALIDACIONES
  // ==========================================

isFormValid(): boolean {
  console.log('🔍 Validando formulario...');
  
  const formValue = this.expedienteForm.value;
  console.log('📋 Valores del formulario:', formValue);
  
  const generarAutomatico = formValue.generarAutomatico;
  const numeroExpediente = formValue.numeroexpediente;
  
  // ✅ Validación simplificada y clara
  if (generarAutomatico === true) {
    // Si es automático, siempre es válido (el backend genera el número)
    console.log('✅ Formulario válido - modo automático');
    return true;
  } else {
    // Si es manual, debe tener número de expediente
    const esValido = numeroExpediente && numeroExpediente.trim().length > 0;
    console.log(`${esValido ? '✅' : '❌'} Formulario ${esValido ? 'válido' : 'inválido'} - modo manual`);
    return esValido;
  }
}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.expedienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.expedienteForm.get(fieldName);
    
    if (field && field.errors) {
      if (field.errors['required']) return 'Campo requerido';
      if (field.errors['minlength']) return 'Muy corto';
      if (field.errors['pattern']) return 'Formato inválido';
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