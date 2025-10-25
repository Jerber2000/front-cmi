import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

export interface Clinica {
  idclinica: number;
  nombreclinica: string;
}

export interface Documento {
  iddocumento: number;
  nombredocumento: string;
  descripcion?: string;
  rutadocumento: string;
  urlPublica?: string | null;
  fkclinica: number;
  clinica?: Clinica;
  usuariocreacion: string;
  fechacreacion: Date;
  usuariomodificacion?: string;
  fechamodificacion?: Date;
  estado: number;
}

export interface DocumentoResponse {
  success: boolean;
  message?: string;
  data?: Documento | Documento[];
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private apiUrl = `${environment.apiUrl}/documentos`;
  private clinicaUrl = `${environment.apiUrl}/documentos/clinicas/listar`; // ← AGREGAR ESTA LÍNEA

  constructor(private http: HttpClient) {}

  /**
   * Obtener headers con token
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtener lista de clínicas
   */
  obtenerClinicas(): Observable<Clinica[]> {
    return this.http.get<any>(this.clinicaUrl, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener clínicas:', error);
        return of([]);
      })
    );
  }

  /**
   * Listar documentos
   */
  listarDocumentos(filtros?: { estado?: number; busqueda?: string; fkclinica?: number }): Observable<Documento[]> {
    let params = '';
    if (filtros) {
      const queryParams = [];
      if (filtros.estado !== undefined) queryParams.push(`estado=${filtros.estado}`);
      if (filtros.busqueda) queryParams.push(`busqueda=${filtros.busqueda}`);
      if (filtros.fkclinica) queryParams.push(`fkclinica=${filtros.fkclinica}`);
      if (queryParams.length > 0) params = '?' + queryParams.join('&');
    }

    return this.http.get<any>(`${this.apiUrl}${params}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Respuesta del servidor:', response);
      }),
      map(response => {
        if (response && response.success && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al listar documentos:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener documento por ID
   */
  obtenerDocumento(id: number): Observable<Documento | null> {
    return this.http.get<DocumentoResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data && !Array.isArray(response.data)) {
          return response.data as Documento;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al obtener documento:', error);
        return of(null);
      })
    );
  }

  /**
   * Crear documento con archivo
   */
  crearDocumento(formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(this.apiUrl, formData, { headers }).pipe(
      tap(response => {
        console.log('Documento creado:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Actualizar documento
   */
  actualizarDocumento(id: number, formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.put<any>(`${this.apiUrl}/${id}`, formData, { headers }).pipe(
      tap(response => {
        console.log('Documento actualizado:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Eliminar documento (soft delete)
   */
  eliminarDocumento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Documento eliminado:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400 && error.error && error.error.success === false) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Cambiar estado del documento
   */
  cambiarEstado(id: number, estado: number): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('Estado cambiado:', response);
      }),
      catchError(error => {
        console.error('Error al cambiar estado:', error);
        throw error;
      })
    );
  }

  /**
   * Descargar documento
   */
  descargarDocumento(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Formatear tamaño de archivo
   */
  formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validar archivo PDF
   */
  validarArchivoPDF(file: File): { valido: boolean, error?: string } {
    if (file.type !== 'application/pdf') {
      return { valido: false, error: 'Solo se permiten archivos PDF' };
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      return { valido: false, error: 'El archivo no puede superar los 10MB' };
    }

    return { valido: true };
  }
}