// src/app/components/paciente/paciente-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PacienteService, Paciente, PacienteResponse } from '../../services/paciente.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

declare var bootstrap: any;

@Component({
  selector: 'app-paciente-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paciente-list.component.html',
  styleUrls: ['./paciente-list.component.scss']
})
export class PacienteListComponent implements OnInit {
  // Lista y control
  pacientes: Paciente[] = [];
  loading = false;
  error = '';
  success = '';

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Búsqueda
  searchTerm = '';
  private searchSubject = new Subject<string>();

  // Modal y formulario
  pacienteForm: FormGroup;
  expedienteForm: FormGroup;
  isEditMode = false;
  editingPacienteId: number | null = null;
  modal: any;

  // ✅ AGREGAR Math para el template
  Math = Math;

  // Opciones para selects
  generos = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' }
  ];

  tiposConsulta = [
    { value: 'Primera vez', label: 'Primera vez' },
    { value: 'Subsecuente', label: 'Subsecuente' },
    { value: 'Urgencia', label: 'Urgencia' },
    { value: 'Consulta General', label: 'Consulta General' }
  ];

  tiposDiscapacidad = [
    { value: 'Ninguna', label: 'Ninguna' },
    { value: 'Física', label: 'Física' },
    { value: 'Visual', label: 'Visual' },
    { value: 'Auditiva', label: 'Auditiva' },
    { value: 'Intelectual', label: 'Intelectual' },
    { value: 'Múltiple', label: 'Múltiple' }
  ];

  constructor(
    private pacienteService: PacienteService,
    private formBuilder: FormBuilder
  ) {
    this.pacienteForm = this.createPacienteForm();
    this.expedienteForm = this.createExpedienteForm();

    // Configurar búsqueda con debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadPacientes();
      });
  }

  ngOnInit(): void {
    this.loadPacientes();
    this.initModal();
  }

  initModal(): void {
    const modalElement = document.getElementById('pacienteModal');
    if (modalElement) {
      this.modal = new bootstrap.Modal(modalElement);
    }
  }

  createPacienteForm(): FormGroup {
    return this.formBuilder.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      cui: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
      fechanacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      tipoconsulta: ['', Validators.required],
      tipodiscapacidad: ['Ninguna'],
      telefonopersonal: ['', Validators.pattern(/^\d{8}$/)],
      nombrecontactoemergencia: [''],
      telefonoemergencia: ['', Validators.pattern(/^\d{8}$/)],
      nombreencargado: [''],
      dpiencargado: ['', Validators.pattern(/^\d{13}$/)],
      telefonoencargado: ['', Validators.pattern(/^\d{8}$/)],
      municipio: ['', Validators.required],
      aldea: [''],
      direccion: ['', Validators.required]
    });
  }

  createExpedienteForm(): FormGroup {
    return this.formBuilder.group({
      numeroexpediente: [''],
      historiaenfermedad: [''],
      antmedico: [''],
      antmedicamento: [''],
      anttraumaticos: [''],
      antfamiliar: [''],
      antalergico: ['']
    });
  }

  loadPacientes(): void {
    this.loading = true;
    this.error = '';

    this.pacienteService.getAllPacientes(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response: PacienteResponse) => {
          if (response.success && Array.isArray(response.data)) {
            this.pacientes = response.data;
            if (response.pagination) {
              this.totalItems = response.pagination.total;
              this.totalPages = response.pagination.totalPages;
            }
          } else {
            this.error = 'Error al cargar los pacientes';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al conectar con el servidor';
          this.loading = false;
          console.error('Error:', error);
        }
      });
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.searchSubject.next(this.searchTerm);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPacientes();
    }
  }

  calculateAge(fechaNacimiento: string): number {
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Modal y formulario
  openCreateModal(): void {
    this.isEditMode = false;
    this.editingPacienteId = null;
    this.pacienteForm.reset();
    this.expedienteForm.reset();
    this.pacienteForm.patchValue({ tipodiscapacidad: 'Ninguna' });
    this.error = '';
    this.success = '';
    this.modal.show();
  }

  openEditModal(paciente: Paciente): void {
    this.isEditMode = true;
    this.editingPacienteId = paciente.idpaciente || null;
    this.fillForm(paciente);
    this.error = '';
    this.success = '';
    this.modal.show();
  }

  fillForm(paciente: Paciente): void {
    this.pacienteForm.patchValue({
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      cui: paciente.cui,
      fechanacimiento: paciente.fechanacimiento ? new Date(paciente.fechanacimiento).toISOString().split('T')[0] : '',
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

  onSubmit(): void {
    if (this.pacienteForm.valid) {
      this.loading = true;
      this.error = '';

      const pacienteData: Paciente = {
        ...this.pacienteForm.value,
        ...(!this.isEditMode ? this.expedienteForm.value : {})
      };

      if (this.isEditMode && this.editingPacienteId) {
        this.updatePaciente(pacienteData);
      } else {
        this.createPaciente(pacienteData);
      }
    } else {
      this.markFormGroupTouched(this.pacienteForm);
      this.error = 'Por favor, complete todos los campos requeridos correctamente';
    }
  }

  createPaciente(pacienteData: Paciente): void {
    this.pacienteService.createPaciente(pacienteData)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.success = 'Paciente creado exitosamente';
            this.modal.hide();
            this.loadPacientes();
            setTimeout(() => this.success = '', 3000);
          } else {
            this.error = response.message || 'Error al crear el paciente';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Error al crear el paciente';
          this.loading = false;
          console.error('Error:', error);
        }
      });
  }

  updatePaciente(pacienteData: Paciente): void {
    if (!this.editingPacienteId) return;

    this.pacienteService.updatePaciente(this.editingPacienteId, pacienteData)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.success = 'Paciente actualizado exitosamente';
            this.modal.hide();
            this.loadPacientes();
            setTimeout(() => this.success = '', 3000);
          } else {
            this.error = response.message || 'Error al actualizar el paciente';
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Error al actualizar el paciente';
          this.loading = false;
          console.error('Error:', error);
        }
      });
  }

  deletePaciente(paciente: Paciente): void {
    if (!paciente.idpaciente) return;

    const confirmed = confirm(`¿Está seguro de eliminar al paciente ${paciente.nombres} ${paciente.apellidos}?`);
    
    if (confirmed) {
      this.pacienteService.deletePaciente(paciente.idpaciente)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.success = 'Paciente eliminado exitosamente';
              this.loadPacientes();
              setTimeout(() => this.success = '', 3000);
            } else {
              this.error = response.message || 'Error al eliminar el paciente';
            }
          },
          error: (error) => {
            this.error = 'Error al eliminar el paciente';
            console.error('Error:', error);
          }
        });
    }
  }

  closeModal(): void {
    this.modal.hide();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string, form: FormGroup = this.pacienteForm): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string, form: FormGroup = this.pacienteForm): string {
    const field = form.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) {
        if (fieldName === 'cui' || fieldName === 'dpiencargado') return 'Debe tener 13 dígitos';
        if (fieldName.includes('telefono')) return 'Debe tener 8 dígitos';
      }
    }
    return '';
  }

  getPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}