// src/app/services/referidos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ArchivoService } from './archivo.service'; 

// ============================================================================
// INTERFACES ACTUALIZADAS (SIN fkusuariodestino)
// ============================================================================

export interface Clinica {
  idclinica: number;
  nombreclinica: string;
}

export interface Referido {
  idrefpaciente: number;
  fkusuario: number;
  fkpaciente: number;
  fkexpediente: number;
  fkclinica: number;
  comentario: string;
  confirmacion1: number;
  usuarioconfirma1?: string;
  confirmacion2: number;
  usuarioconfirma2?: string;
  confirmacion3: number;
  usuarioconfirma3?: string;
  confirmacion4: number;
  usuarioconfirma4?: string;
  fechacreacion: string;
  estado: number;
  rutadocumentoinicial?: string;
  rutadocumentofinal?: string;
  paciente?: {
    idpaciente: number;
    nombres: string;
    apellidos: string;
    cui: string;
    fechanacimiento?: string;
  };
  clinica?: Clinica;
  usuario?: {
    idusuario: number;
    nombres: string;
    apellidos: string;
    profesion: string;
  };
}

// ❌ ACTUALIZADO: Sin fkusuariodestino
export interface CrearReferidoRequest {
  fkpaciente: number;
  fkexpediente: number;
  fkclinica: number;
  comentario: string;
  rutadocumentoinicial?: string;
}

export interface ConfirmarReferidoRequest {
  comentario?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  mensaje?: string;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReferidosService {
  private apiUrl = `${environment.apiUrl}/referir`;

  constructor(
    private http: HttpClient,
    private archivoService: ArchivoService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ============================================================================
  // ✅ NUEVO: Obtener clínicas desde BD
  // ============================================================================
  obtenerClinicas(): Observable<Clinica[]> {
    return this.http.get<ApiResponse<Clinica[]>>(
      `${this.apiUrl}/clinicas`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // ============================================================================
  // MÉTODOS CRUD PRINCIPALES
  // ============================================================================

  crearReferido(datos: CrearReferidoRequest): Observable<Referido> {
    return this.http.post<ApiResponse<Referido>>(
      this.apiUrl,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  obtenerReferidos(
    tipo?: 'pendientes' | 'enviados' | 'recibidos' | 'completados',
    search?: string,
    page: number = 1,
    limit: number = 10
  ): Observable<{ data: Referido[], pagination: any }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (tipo) {
      params = params.set('tipo', tipo);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<Referido[]>>(
      this.apiUrl,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      }))
    );
  }

  obtenerReferidoPorId(id: number): Observable<Referido> {
    return this.http.get<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // En referidos.service.ts
  confirmarReferido(id: number, comentario?: string): Observable<Referido> {
    console.log('🌐 === SERVICIO confirmarReferido ===');
    console.log('ID:', id);
    console.log('Comentario:', comentario);
    
    const body: ConfirmarReferidoRequest = comentario ? { comentario } : {};
    console.log('Body de la petición:', body);
    
    const url = `${this.apiUrl}/${id}/confirmar`;
    console.log('URL completa:', url);
    console.log('Headers:', this.getHeaders());
    
    console.log('📡 Enviando petición HTTP PUT...');
    
    return this.http.put<ApiResponse<Referido>>(
      url,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('✅ Respuesta recibida:', response);
        return response.data!;
      })
    );
  }

  actualizarReferido(id: number, datos: Partial<CrearReferidoRequest>): Observable<Referido> {
    return this.http.put<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}`,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  cambiarEstado(id: number, estado: number): Observable<Referido> {
    return this.http.put<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  obtenerHistorialPaciente(idPaciente: number): Observable<Referido[]> {
    return this.http.get<ApiResponse<Referido[]>>(
      `${this.apiUrl}/paciente/${idPaciente}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // ============================================================================
  // MÉTODOS DE GESTIÓN DE DOCUMENTOS
  // ============================================================================

  async subirDocumentoInicial(
    idReferido: number, 
    archivo: File
  ): Promise<{ rutadocumentoinicial: string }> {
    const resultado = await this.archivoService.subirArchivos(
      'referidos',  
      idReferido,   
      { documento: archivo }
    );
    
    return {
      rutadocumentoinicial: resultado.rutaDocumento || ''
    };
  }

  async subirDocumentoFinal(
    idReferido: number,
    archivo: File
  ): Promise<{ rutadocumentofinal: string }> {
    const resultado = await this.archivoService.subirArchivos(
      'referidos',
      idReferido,
      { documento: archivo }
    );
    
    return {
      rutadocumentofinal: resultado.rutaDocumento || ''
    };
  }

  obtenerUrlDocumento(rutaDocumento: string | null | undefined): string | null {
    if (!rutaDocumento || typeof rutaDocumento !== 'string') {
      return null;
    }
    
    return this.archivoService.obtenerUrlPublica(rutaDocumento);
  }

/**
 * ✅ Verifica si el usuario puede eliminar documento final
 */
  puedeEliminarDocumentoFinal(referido: Referido, usuarioActual: any, esAdmin: boolean): boolean {
    if (!referido || !usuarioActual) return false;
    
    // No se puede eliminar si el referido está completado
    if (referido.confirmacion4 === 1) return false;
    
    // Admin siempre puede eliminar (si no está completado)
    if (esAdmin) return true;
    
    // Usuario de la clínica destino puede eliminar
    return usuarioActual.fkclinica === referido.fkclinica;
  }

  // ============================================================================
  // MÉTODOS DE PERMISOS Y VALIDACIONES (ACTUALIZADOS)
  // ============================================================================

  /**
   * ✅ Verifica si el usuario puede subir documento inicial
   */
  puedeEliminarDocumentoInicial(referido: Referido, usuarioActual: any, esAdmin: boolean): boolean {
    if (!referido || !usuarioActual) return false;
    
    // No se puede eliminar si el referido está completado
    if (referido.confirmacion4 === 1) return false;
    
    // Admin siempre puede eliminar (si no está completado)
    if (esAdmin) return true;
    
    // El creador puede eliminar su propio documento
    const esCreador = referido.fkusuario === usuarioActual.idusuario;
    
    return esCreador;
  }

  /**
   * ✅ ACTUALIZADO: Verifica si el usuario puede subir documento final
   * Ahora valida si pertenece a la clínica destino
   */
  puedeSubirDocumentoFinal(referido: Referido, usuarioActual: any): boolean {
    console.log('🔍 === puedeSubirDocumentoFinal ===');
    console.log('referido:', referido);
    console.log('usuarioActual:', usuarioActual);
    
    if (!referido || !usuarioActual) {
      console.log('❌ Faltan datos');
      return false;
    }
    
    if (referido.confirmacion3 !== 1) {
      console.log('❌ confirmacion3 no está en 1:', referido.confirmacion3);
      return false;
    }
    
    console.log('fkclinica usuario:', usuarioActual.fkclinica);
    console.log('fkclinica referido:', referido.fkclinica);
    console.log('¿Coinciden?:', usuarioActual.fkclinica === referido.fkclinica);
    
    // ✅ El usuario debe estar asignado a la clínica destino
    return usuarioActual.fkclinica === referido.fkclinica;
  }

  puedeSubirDocumentoInicial(referido: Referido, usuarioActual: any, esAdmin: boolean): boolean {
    if (!referido || !usuarioActual) return false;
    
    if (referido.confirmacion4 === 1) return false;
    
    const esCreador = referido.fkusuario === usuarioActual.idusuario;
    const adminPuedeSubir = esAdmin && referido.confirmacion1 === 1 && referido.confirmacion4 === 0;
    
    return esCreador || adminPuedeSubir;
  }

  // ============================================================================
  // MÉTODOS AUXILIARES Y FORMATEO
  // ============================================================================

  obtenerEstadoReferido(referido: Referido): string {
    if (referido.confirmacion4 === 1) return 'Completado';
    if (referido.confirmacion3 === 1) return 'Pendiente clínica destino';
    if (referido.confirmacion2 === 1) return 'Pendiente admin 2';
    if (referido.confirmacion1 === 1) return 'Pendiente admin 1';
    return 'En proceso';
  }

  obtenerProgresoReferido(referido: Referido): number {
    let confirmaciones = 0;
    if (referido.confirmacion1 === 1) confirmaciones++;
    if (referido.confirmacion2 === 1) confirmaciones++;
    if (referido.confirmacion3 === 1) confirmaciones++;
    if (referido.confirmacion4 === 1) confirmaciones++;
    return (confirmaciones / 4) * 100;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}