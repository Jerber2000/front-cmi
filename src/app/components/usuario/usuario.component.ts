import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms'; 
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, AfterViewInit {
  // userInfo = { name: 'Usuario', avatar: '' };
  currentView: 'list' | 'form' | 'detail' = 'list';
  users: ExtendedUser[] = [];
  filteredUsers: ExtendedUser[] = [];
  selectedUser: ExtendedUser | null = null;
  userForm: FormGroup;
  isEditMode = false;
  loading = false;
  searchTerm = '';
  currentDate = new Date();
  sidebarExpanded = true;
  userInfo: any = {};
  selectedPhoto: string | null = null;

  constructor(
    private UsuarioService: UsuarioService,
    private fb: FormBuilder
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
      telinstitucional: [''],
      extension: [''],
      telPersonal: [''],
      contactoEmergencia: ['', [Validators.required]],
      telEmergencia: [''],
      profesion: [''],
      fechaNacimiento: [''],
      role: ['', [Validators.required]],
      observaciones: [''],
      status: ['1']
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
        
        if (wasExpanded !== this.sidebarExpanded) {
          console.log('Sidebar state changed:', this.sidebarExpanded ? 'expanded' : 'collapsed');
        }
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
      console.error('❌ Error al cargar información del usuario:', error);
    }
  }

  // NAVEGACIÓN ENTRE VISTAS
  showList(): void {
    this.currentView = 'list';
    this.selectedUser = null;
    this.resetForm();
  }

  showForm(): void {
    this.currentView = 'form';
    this.isEditMode = false;
    this.resetForm();
  }

  viewUser(user: ExtendedUser): void {
    this.selectedUser = user;
    this.currentView = 'detail';
  }

  editUser(user: ExtendedUser): void {
    this.selectedUser = user;
    this.isEditMode = true;
    this.currentView = 'form';
    this.userForm.patchValue({
      name: user.nombres,
      email: user.correo,
      role: user.fkrol || '',
      employeeNumber: user.employeeNumber || '',
      collegiateNumber: user.collegiateNumber || '',
      schedule: user.schedule || '',
      status: user.status || 'Activo'
    });
  }

  // BÚSQUEDA Y FILTRADO
  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.nombres.toLowerCase().includes(term) ||
      user.correo.toLowerCase().includes(term) ||
      (user.fkrol) ||
      (user.employeeNumber && user.employeeNumber.toLowerCase().includes(term))
    );
  }

  // OPERACIONES CRUD
  loadUsers(): void {
    this.loading = true;
    this.UsuarioService.obtenerUsuarios().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = [...users];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      const userData: ExtendedUser = this.userForm.value;

      const operation = this.isEditMode 
        ? this.UsuarioService.actualizarUsuario(this.selectedUser!.id!, userData)
        : this.UsuarioService.crearUsuario(userData);

      operation.subscribe({
        next: () => {
          this.loading = false;
          this.loadUsers();
          this.showList();
        },
        error: (error) => {
          console.error('Error saving user:', error);
          this.loading = false;
          alert('Error al guardar el usuario');
        }
      });
    }
  }

  deleteUser(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.UsuarioService.eliminarUsuario(id).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          alert('Error al eliminar el usuario');
        }
      });
    }
  }

  closeModal(): void {
    this.currentView = 'list';
    this.resetForm();
    this.selectedPhoto = null;
  }

  resetForm(): void {
    this.userForm.reset();
    this.userForm.patchValue({ status: 'Activo' });
    this.isEditMode = false;
    this.selectedUser = null;
  }
}