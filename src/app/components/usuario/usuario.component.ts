import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms'; 
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';
import { FormatoTelefonicoDirective } from '../../directives/numeroFormato';

// Extender la interface User para incluir los nuevos campos
export interface ExtendedUser extends Usuario {
  employeeNumber?: string;
  collegiateNumber?: string;
  schedule?: string;
  status?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent, FormatoTelefonicoDirective],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, AfterViewInit {
  // userInfo = { name: 'Usuario', avatar: '' };
  currentView: 'list' | 'form' | 'detail' = 'list';
  users: ExtendedUser[] = [];
  filteredUsers: ExtendedUser[] = [];
  paginatedUsers: ExtendedUser[] = [];
  selectedUser: ExtendedUser | null = null;
  userForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  loading = false;
  searchTerm = '';
  currentDate = new Date();
  sidebarExpanded = true;
  userInfo: any = {};
  selectedPhoto: string | null = null;

  // Variables de paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  
  // Exponer Math para usar en el template
  Math = Math;

  constructor(
    private UsuarioService: UsuarioService,
    private fb: FormBuilder,
    private alerta: AlertaService
  ) {
    this.userForm = this.fb.group({
      nombres: ['', [Validators.required]],
      apellidos: ['', [Validators.required]],
      usuario: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      confirmCorreo: ['', [Validators.required, Validators.email]],
      puesto: ['', [Validators.required]],
      telinstitucional: ['+502 ',[Validators.required]],
      extension: [''],
      telPersonal: ['+502 ',[Validators.required]],
      contactoEmergencia: ['', [Validators.required]],
      telEmergencia: ['+502 ',[Validators.required]],
      profesion: ['',[Validators.required]],
      fechaNacimiento: [''],
      role: ['', [Validators.required]],
      observaciones: [''],
      status: ['', [Validators.required]]
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedPhoto = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.detectSidebarState();
  }

  detectSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
        const wasExpanded = this.sidebarExpanded;
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

  loadUserInfo(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);        
        
        this.userInfo = {
          name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
          avatar: usuario.avatar || null,
          // role: usuario.fkrol || usuario.role || ''
        };
      } 
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
    }
  }

  // MÉTODOS DE PAGINACIÓN
  updatePagination(): void {
    this.totalItems = this.filteredUsers.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Asegurar que currentPage esté en el rango válido
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = Math.max(1, this.totalPages);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedUsers();
  }

  updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
    }
  }

  // Generar array de páginas para mostrar en la paginación
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

  // Método para cambiar items por página
  onItemsPerPageChange(): void {
    // Asegurar que itemsPerPage sea un número
    this.itemsPerPage = Number(this.itemsPerPage);
    this.currentPage = 1; // Resetear a primera página
    this.updatePagination();
  }

  // Método para obtener el rango de elementos mostrados
  getDisplayRange(): string {
    if (this.totalItems === 0) return '0 - 0';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start} - ${end}`;
  }

  // NAVEGACIÓN ENTRE VISTAS
  showList(): void {
    this.currentView = 'list';
    this.selectedUser = null;
    this.isViewMode = false;
    this.resetForm();
    this.updatePasswordValidators();
  }

  showForm(): void {
    this.currentView = 'form';
    this.isEditMode = false;
    this.isViewMode = false;
    this.resetForm();
    this.userForm.enable();
  }

  viewUser(user: ExtendedUser): void {
    this.selectedUser = user;
    this.isEditMode = false;
    this.isViewMode = true;
    this.currentView = 'form';
    
    this.userForm.patchValue({
      nombres: user.nombres || '',
      apellidos: user.apellidos || '',
      usuario: user.usuario || '',
      password: '',
      confirmPassword: '',
      correo: user.correo || '',
      confirmCorreo: user.correo || '',
      puesto: user.puesto || '',
      telinstitucional: user.telinstitucional || '+502 ',
      extension: user.extension || '',
      telPersonal: user.telefonopersonal || '+502 ',
      contactoEmergencia: user.nombrecontactoemergencia || '',
      telEmergencia: user.telefonoemergencia || '+502 ',
      profesion: user.profesion || '',
      fechaNacimiento: user.fechanacimiento ? this.formatDateForInput(user.fechanacimiento) : '',
      role: user.fkrol?.toString() || '',
      observaciones: user.observaciones || '',
      status: user.estado?.toString() || ''
    });

    this.userForm.disable();
  }

  formatDateForInput(dateString: string | null | undefined): string {
    if (!dateString) return '';
    
    try {
      const cleanDate = dateString.toString().trim();
      
      if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return cleanDate;
      }
      
      // Si viene con hora (YYYY-MM-DDTHH:mm:ss), extraer solo la fecha
      if (cleanDate.includes('T')) {
        const dateOnly = cleanDate.split('T')[0];
        return dateOnly;
      }
      
      // Para cualquier otro formato, intentar crear fecha local
      const dateMatch = cleanDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const formatted = `${year}-${month}-${day}`;
        return formatted;
      }
      
      return '';
      
    } catch (error) {
      return '';
    }
  }

  // Método auxiliar para formatear fecha de vuelta (del input al formato de BD)
  formatDateForDatabase(dateString: string): string {
    if (!dateString || dateString.trim() === '') {
      return '';
    }
    
    try {
      // Si ya está en formato YYYY-MM-DD, crear ISO string para Prisma
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Crear fecha a medianoche UTC para evitar problemas de zona horaria
        const date = new Date(dateString + 'T00:00:00.000Z');
        
        if (isNaN(date.getTime())) {
          console.error('Fecha inválida:', dateString);
          return '';
        }
        
        // Devolver en formato ISO para Prisma
        return date.toISOString();
      }
      
      console.error('Formato de fecha no reconocido:', dateString);
      return '';
      
    } catch (error) {
      console.error('Error procesando fecha:', error);
      return '';
    }
  }

  editUser(user: ExtendedUser): void {
    this.selectedUser = user;
    this.isEditMode = true;
    this.isViewMode = false;
    this.currentView = 'form';

    this.updatePasswordValidators();
    
    this.userForm.patchValue({
      nombres: user.nombres || '',
      apellidos: user.apellidos || '',
      usuario: user.usuario || '',
      password: '',
      confirmPassword: '',
      correo: user.correo || '',
      confirmCorreo: user.correo || '',
      puesto: user.puesto || '',
      telinstitucional: user.telinstitucional || '+502 ',
      extension: user.extension || '',
      telPersonal: user.telefonopersonal || '+502 ',
      contactoEmergencia: user.nombrecontactoemergencia || '',
      telEmergencia: user.telefonoemergencia || '+502 ',
      profesion: user.profesion || '',
      fechaNacimiento: user.fechanacimiento ? this.formatDateForInput(user.fechanacimiento) : '',
      role: user.fkrol?.toString() || '',
      observaciones: user.observaciones || '',
      status: user.estado?.toString() || ''
    });
    
    // // Opcional: Cargar foto si existe
    // if (user.rutafotoperfil) {
    //   this.selectedPhoto = user.rutafotoperfil;
    // }

    this.userForm.enable();
  }

  updatePasswordValidators(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');
    
    if (this.isEditMode) {
      // En modo edición: contraseñas opcionales
      passwordControl?.setValidators([]);
      confirmPasswordControl?.setValidators([]);
    } else {
      // En modo creación: contraseñas requeridas
      passwordControl?.setValidators([Validators.required]);
      confirmPasswordControl?.setValidators([Validators.required]);
    }
    
    // Actualizar el estado de validación
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  // BÚSQUEDA Y FILTRADO - Actualizado para incluir paginación
  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => {
        const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.toLowerCase();
        
        return (
          nombreCompleto.includes(term) ||
          (user.correo && user.correo.toLowerCase().includes(term))
        );
      });
    }
    
    this.currentPage = 1;
    this.updatePagination();
  }

  // OPERACIONES CRUD - Actualizado para incluir paginación
  loadUsers(): void {
    this.loading = true;
    this.UsuarioService.obtenerUsuarios().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = [...users];
        this.updatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  async deleteUser(id: number): Promise<void> {
    const confirmed = await this.alerta.alertaConfirmacion(
      '¿Estás seguro de que deseas eliminar este usuario?',
      '',
      'Sí, eliminar',
      'No, cancelar'
    );

    if (confirmed) {
      this.UsuarioService.eliminarUsuario(id).subscribe({
        next: () => {
          this.loadUsers();
          this.alerta.alertaExito('Usuario eliminado correctamente');
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.alerta.alertaError('Error al eliminar el usuario');
        }
      });
    }
  }

  closeModal(): void {
    this.currentView = 'list';
    this.isViewMode = false;
    this.resetForm();
    this.selectedPhoto = null;
    this.userForm.enable();
  }

  resetForm(): void {
    this.userForm.reset();
    this.userForm.patchValue({ 
      status: '',
      role: '',
      telinstitucional: '+502 ', 
      telPersonal: '+502 ', 
      telEmergencia: '+502 '
    });
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedUser = null;
    this.updatePasswordValidators();
    this.userForm.enable();
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      
      const formData = this.userForm.value;
      
      if (!this.isEditMode || (formData.password && formData.password.trim() !== '')) {
        if (formData.password !== formData.confirmPassword) {
          this.alerta.alertaError('Las contraseñas no coinciden');
          this.loading = false;
          return;
        }
      }
      
      if (formData.correo !== formData.confirmCorreo) {
        this.alerta.alertaError('Los correos no coinciden');
        this.loading = false;
        return;
      }
      
      const userData: Omit<Usuario, 'idusuario'> = {
        fkrol: parseInt(formData.role),
        usuario: formData.usuario,
        clave: (this.isEditMode && (!formData.password || formData.password.trim() === '')) 
          ? this.selectedUser!.clave
          : formData.password,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        fechanacimiento: this.formatDateForDatabase(formData.fechaNacimiento),
        correo: formData.correo,
        puesto: formData.puesto,
        profesion: formData.profesion || '',
        telinstitucional: formData.telinstitucional || '',
        extension: formData.extension || '',
        telefonopersonal: formData.telPersonal || '',
        nombrecontactoemergencia: formData.contactoEmergencia || '',
        telefonoemergencia: formData.telEmergencia || '',
        rutafotoperfil: this.selectedPhoto || '',
        observaciones: formData.observaciones || '',
        usuariocreacion: '1',
        estado: parseInt(formData.status)
      };

      const operation = this.isEditMode 
        ? this.UsuarioService.actualizarUsuario(this.selectedUser!.idusuario, userData)
        : this.UsuarioService.crearUsuario(userData);
      operation.subscribe({
        next: () => {
          this.loading = false;
          const mensaje = this.isEditMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente';
          this.loadUsers();
          this.showList();
          this.alerta.alertaExito(mensaje);
        },
        error: (error) => {
          console.error('Error al guardar usuario:', error);
          this.loading = false;
          const mensaje = this.isEditMode ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario';
          this.alerta.alertaError(mensaje);
        }
      });
    } else {
      this.alerta.alertaPreventiva('Completa todos los campos requeridos');
    }
  }
}