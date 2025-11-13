import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DocumentoService, Documento, Clinica } from '../../services/documento.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertaService } from '../../services/alerta.service';
import { ArchivoService } from '../../services/archivo.service';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './documento.component.html',
  styleUrls: ['./documento.component.scss']
})
export class DocumentoComponent implements OnInit, AfterViewInit {
  currentView: 'list' | 'form' = 'list';
  documentos: Documento[] = [];
  documentosFiltrados: Documento[] = [];
  paginatedDocumentos: Documento[] = [];
  selectedDocumento: Documento | null = null;
  documentoForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  loading = false;
  searchTerm = '';
  currentDate = new Date();
  sidebarExpanded = true;
  userInfo: any = {};

  // ← AGREGAR ESTAS VARIABLES
  clinicas: Clinica[] = [];
  selectedClinicaFilter: number | null = null;

  selectedDocument: File | null = null;
  documentInfo: { name: string, size: number } | null = null;

  // Variables de paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;
  Math = Math;

  constructor(
    private documentoService: DocumentoService,
    private fb: FormBuilder,
    private alerta: AlertaService,
    private archivoService: ArchivoService
  ) {
    this.documentoForm = this.fb.group({
      nombredocumento: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      fkclinica: [null, [Validators.required]] // ← AGREGAR ESTE CAMPO
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.cargarClinicas(); // ← AGREGAR ESTA LÍNEA
    this.cargarDocumentos();
  }

  ngAfterViewInit(): void {
    this.detectSidebarState();
  }

  detectSidebarState(): void {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
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
          avatar: usuario.rutafotoperfil ? this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil) : null
        };
      }
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
    }
  }

  // ← AGREGAR ESTE MÉTODO
  cargarClinicas(): void {
    this.documentoService.obtenerClinicas().subscribe({
      next: (clinicas) => {
        this.clinicas = clinicas;
      },
      error: (error) => {
        console.error('Error al cargar clínicas:', error);
        this.alerta.alertaError('Error al cargar clínicas');
      }
    });
  }

  // ← AGREGAR ESTE MÉTODO
  filtrarPorClinica(): void {
    this.cargarDocumentos();
  }

  // PAGINACIÓN
  updatePagination(): void {
    this.totalItems = this.documentosFiltrados.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = Math.max(1, this.totalPages);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedDocumentos();
  }

  updatePaginatedDocumentos(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedDocumentos = this.documentosFiltrados.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedDocumentos();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedDocumentos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedDocumentos();
    }
  }

  getPages(): number[] {
    if (this.totalPages <= 0) return [];
    
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onItemsPerPageChange(): void {
    this.itemsPerPage = Number(this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }

  // CRUD OPERATIONS
  cargarDocumentos(): void {
    this.loading = true;
    
    // ← MODIFICAR ESTA LÍNEA PARA INCLUIR FILTRO DE CLÍNICA
    const filtros: any = { estado: 1 };
    if (this.selectedClinicaFilter) {
      filtros.fkclinica = this.selectedClinicaFilter;
    }
    
    this.documentoService.listarDocumentos(filtros).subscribe({
      next: (documentos) => {
        this.documentos = documentos.map(doc => ({
          ...doc,
          urlPublica: doc.rutadocumento ? this.archivoService.obtenerUrlPublica(doc.rutadocumento) : null
        }));
        
        this.documentosFiltrados = [...this.documentos];
        this.updatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar documentos:', error);
        this.alerta.alertaError('Error al cargar documentos');
        this.loading = false;
      }
    });
  }

  buscarDocumentos(): void {
    if (!this.searchTerm.trim()) {
      this.documentosFiltrados = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.documentosFiltrados = this.documentos.filter(doc =>
        doc.nombredocumento.toLowerCase().includes(term) ||
        (doc.descripcion && doc.descripcion.toLowerCase().includes(term)) ||
        (doc.clinica?.nombreclinica && doc.clinica.nombreclinica.toLowerCase().includes(term))
      );
    }
    
    this.currentPage = 1;
    this.updatePagination();
  }

  showForm(): void {
    this.currentView = 'form';
    this.isEditMode = false;
    this.isViewMode = false;
    this.resetForm();
  }

  showList(): void {
    this.currentView = 'list';
    this.selectedDocumento = null;
    this.isViewMode = false;
    this.resetForm();
  }

  editarDocumento(documento: Documento): void {
    this.selectedDocumento = documento;
    this.isEditMode = true;
    this.isViewMode = false;
    this.currentView = 'form';

    this.documentoForm.patchValue({
      nombredocumento: documento.nombredocumento || '',
      descripcion: documento.descripcion || '',
      fkclinica: documento.fkclinica || null // ← AGREGAR ESTA LÍNEA
    });

    if (documento.rutadocumento) {
      this.documentInfo = {
        name: documento.rutadocumento.split('/').pop() || 'documento.pdf',
        size: 0
      };
    }
  }

  async eliminarDocumento(id: number, nombre: string): Promise<void> {
    const confirmed = await this.alerta.alertaConfirmacion(
      '¿Estás seguro?',
      `Se eliminará el documento "${nombre}"`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      this.documentoService.eliminarDocumento(id).subscribe({
        next: (response) => {
          if (response && response.success === false) {
            this.alerta.alertaError(response.message || 'Error al eliminar el documento');
            return;
          }
          
          this.cargarDocumentos();
          this.alerta.alertaExito('Documento eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          
          let mensajeError = 'Error al eliminar el documento';
          
          if (error.error && error.error.message) {
            mensajeError = error.error.message;
          }
          
          this.alerta.alertaError(mensajeError);
        }
      });
    }
  }

  descargarDocumento(documento: Documento): void {
    if (documento.urlPublica) {
      this.documentoService.descargarDocumento(documento.urlPublica);
    } else {
      this.alerta.alertaPreventiva('No hay archivo disponible para descargar');
    }
  }

  onDocumentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validacion = this.documentoService.validarArchivoPDF(file);
      
      if (!validacion.valido) {
        this.alerta.alertaError(validacion.error || 'Archivo inválido');
        return;
      }

      this.selectedDocument = file;
      this.documentInfo = {
        name: file.name,
        size: file.size
      };
    }
  }

  removeDocument(): void {
    this.selectedDocument = null;
    this.documentInfo = null;
  }

  closeModal(): void {
    this.currentView = 'list';
    this.isViewMode = false;
    this.resetForm();
  }

  resetForm(): void {
    this.documentoForm.reset();
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedDocumento = null;
    this.selectedDocument = null;
    this.documentInfo = null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.documentoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.documentoForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} es requerido`;
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'nombredocumento': 'Nombre del documento',
      'descripcion': 'Descripción',
      'fkclinica': 'Clínica' // ← AGREGAR ESTA LÍNEA
    };
    return fieldNames[fieldName] || fieldName;
  }

  async onSubmit(): Promise<void> {
    if (this.documentoForm.valid) {
      // Validar archivo solo si es creación
      if (!this.isEditMode && !this.selectedDocument) {
        this.alerta.alertaPreventiva('Debe seleccionar un archivo PDF');
        return;
      }

      this.loading = true;

      try {
        const formData = new FormData();
        formData.append('nombredocumento', this.documentoForm.value.nombredocumento);
        formData.append('fkclinica', this.documentoForm.value.fkclinica); // ← AGREGAR ESTA LÍNEA
        
        if (this.documentoForm.value.descripcion) {
          formData.append('descripcion', this.documentoForm.value.descripcion);
        }
        
        if (this.selectedDocument) {
          formData.append('documento', this.selectedDocument);
        }

        const operation = this.isEditMode
          ? this.documentoService.actualizarDocumento(this.selectedDocumento!.iddocumento, formData)
          : this.documentoService.crearDocumento(formData);

        operation.subscribe({
          next: (response) => {
            this.loading = false;
            
            if (response && response.success === false) {
              let mensajeError = response.message || 'Error de validación';
              this.alerta.alertaError(mensajeError);
              return;
            }
            
            const mensaje = this.isEditMode 
              ? 'Documento actualizado correctamente' 
              : 'Documento creado correctamente';
            
            this.cargarDocumentos();
            this.showList();
            this.alerta.alertaExito(mensaje);
          },
          error: (error) => {
            this.loading = false;
            console.error('Error:', error);
            this.alerta.alertaError('Error al procesar la solicitud');
          }
        });

      } catch (error: any) {
        this.loading = false;
        this.alerta.alertaError(error.message);
      }
    } else {
      this.alerta.alertaPreventiva('Completa todos los campos requeridos');
    }
  }

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  }

  formatearTamano(size: number): string {
    return this.documentoService.formatearTamano(size);
  }
}