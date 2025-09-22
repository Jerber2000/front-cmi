import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Usuario } from '../../services/usuario.service';
import { PerfilService, PerfilFormData } from '../../services/perfil.services';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';
import { FormatoTelefonicoDirective } from '../../directives/numeroFormato';
import { formatoInputDirective } from '../../directives/formatoInput';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    SidebarComponent, 
    FormatoTelefonicoDirective, 
    formatoInputDirective
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {
  usuario: Usuario | null = null;
  userInfo: any = {};
  perfilForm: FormGroup;
  isEditMode = false;
  showEditModal = false;
  loading = false;
  sidebarExpanded = true;
  currentDate = new Date();
  
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  private perfilSubscription?: Subscription;
  private mutationObserver?: MutationObserver;

  constructor(
    private perfilService: PerfilService,
    private fb: FormBuilder,
    private alerta: AlertaService
  ) {
    this.perfilForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.detectSidebarState();
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
    this.mutationObserver?.disconnect();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      password: [''],
      confirmPassword: [''],
      correo: ['', [Validators.required, Validators.email]],
      confirmCorreo: ['', [Validators.required, Validators.email]],
      telinstitucional: ['+502 ', [Validators.required]],
      extension: [''],
      telPersonal: ['+502 ', [Validators.required]]
    });
  }

  private initializeComponent(): void {
    this.loading = true;

    this.perfilSubscription = this.perfilService.perfil$.subscribe({
      next: (usuario) => {
        this.usuario = usuario;
        this.userInfo = this.perfilService.obtenerInfoSidebar();
        this.photoPreview = usuario ? this.perfilService.getFotoPerfilUrl(usuario) : null;
        this.populateForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        this.alerta.alertaError('Error al cargar el perfil');
        this.loading = false;
      }
    });
  }

  private populateForm(): void {
    if (this.usuario) {
      this.perfilForm.patchValue({
        correo: this.usuario.correo || '',
        confirmCorreo: this.usuario.correo || '',
        telinstitucional: this.usuario.telinstitucional || '+502 ',
        extension: this.usuario.extension || '',
        telPersonal: this.usuario.telefonopersonal || '+502 ',
        password: '',
        confirmPassword: ''
      });
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

    this.mutationObserver = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('.sidebar-container');
    
    if (sidebar) {
      this.mutationObserver.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
  }

  openEditModal(): void {
    this.showEditModal = true;
    this.isEditMode = true;
    this.populateForm();
    this.resetPhoto();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.isEditMode = false;
    this.resetForm();
    this.resetPhoto();
  }

  private resetForm(): void {
    this.populateForm();
    this.perfilForm.markAsUntouched();
    this.perfilForm.markAsPristine();
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  private resetPhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = this.usuario ? this.perfilService.getFotoPerfilUrl(this.usuario) : null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onPhotoSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.alerta.alertaError('Solo se permiten archivos de imagen');
      event.target.value = ''; // Limpiar el input
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      this.alerta.alertaError('La imagen no puede superar los 5MB');
      event.target.value = '';
      return;
    }

    try {
      this.selectedPhoto = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.onerror = () => {
        this.alerta.alertaError('Error al leer la imagen');
        this.selectedPhoto = null;
        this.photoPreview = this.usuario ? this.perfilService.getFotoPerfilUrl(this.usuario) : null;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      this.alerta.alertaError('Error al procesar la imagen');
      this.selectedPhoto = null;
      this.photoPreview = this.usuario ? this.perfilService.getFotoPerfilUrl(this.usuario) : null;
    }
  }

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    
    // Limpiar el input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.perfilForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.perfilForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} es requerido`;
      }
      if (field.errors['email']) {
        return 'Ingrese un correo válido';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['pattern']) {
        return `El formato de ${this.getFieldDisplayName(fieldName).toLowerCase()} es inválido`;
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'password': 'Contraseña',
      'confirmPassword': 'Confirmar contraseña',
      'correo': 'Correo institucional',
      'confirmCorreo': 'Confirmar correo',
      'telinstitucional': 'Teléfono institucional',
      'extension': 'Extensión',
      'telPersonal': 'Teléfono personal'
    };
    return fieldNames[fieldName] || fieldName;
  }

  async onSubmit(): Promise<void> {
    if (!this.usuario) {
      this.alerta.alertaError('No se encontró la información del usuario');
      return;
    }

    // Marcar todos los campos como tocados para mostrar errores
    this.perfilForm.markAllAsTouched();

    if (!this.perfilForm.valid) {
      this.alerta.alertaPreventiva('Por favor, completa todos los campos requeridos correctamente');
      return;
    }

    const formData: PerfilFormData = this.perfilForm.value;

    // Validar usando el servicio
    const validacion = this.perfilService.validarFormularioPerfil(formData);
    if (!validacion.esValido) {
      this.alerta.alertaError(validacion.errores.join('\n'));
      return;
    }

    // Confirmar actualización
    const confirmed = await this.alerta.alertaConfirmacion(
      '¿Estás seguro de que deseas actualizar tu perfil?',
      'Los cambios se aplicarán inmediatamente',
      'Sí, actualizar',
      'No, cancelar'
    );

    if (!confirmed) return;

    this.loading = true;

    this.perfilService.actualizarPerfil(
      this.usuario.idusuario,
      formData,
      this.selectedPhoto || undefined
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.alerta.alertaExito('Perfil actualizado correctamente');
        this.closeEditModal();
        this.userInfo = this.perfilService.obtenerInfoSidebar();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al actualizar perfil:', error);
        this.alerta.alertaError(error.message || 'Error al actualizar el perfil');
      }
    });
  }

  // Método para manejar el clic fuera del modal
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeEditModal();
    }
  }

  // Método para manejar teclas de escape
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showEditModal) {
      this.closeEditModal();
    }
  }
}