// src/app/services/referidos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Referido {
  idrefpaciente: number;
  fkusuario: number;
  fkusuariodestino: number;
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
  paciente?: {
    idpaciente: number;
    nombres: string;
    apellidos: string;
    cui: string;
    fechanacimiento?: string;
  };
  clinica?: {
    idclinica: number;
    nombreclinica: string;
  };
  usuario?: {
    idusuario: number;
    nombres: string;
    apellidos: string;
    profesion: string;
  };
  usuarioDestino?: {
    idusuario: number;
    nombres: string;
    apellidos: string;
    profesion: string;
  };
}

export interface CrearReferidoRequest {
  fkpaciente: number;
  fkexpediente: number;
  fkclinica: number;
  fkusuariodestino: number;
  comentario: string;
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

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Crear nuevo referido
  crearReferido(datos: CrearReferidoRequest): Observable<Referido> {
    return this.http.post<ApiResponse<Referido>>(
      this.apiUrl,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Listar referidos con filtros
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

  // Obtener referido por ID
  obtenerReferidoPorId(id: number): Observable<Referido> {
    return this.http.get<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Confirmar/aprobar referido
  confirmarReferido(id: number, comentario?: string): Observable<Referido> {
    const body: ConfirmarReferidoRequest = comentario ? { comentario } : {};
    
    return this.http.put<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}/confirmar`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Actualizar referido
  actualizarReferido(id: number, datos: Partial<CrearReferidoRequest>): Observable<Referido> {
    return this.http.put<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}`,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Cambiar estado (eliminar lógico)
  cambiarEstado(id: number, estado: number): Observable<Referido> {
    return this.http.put<ApiResponse<Referido>>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Obtener historial de referidos de un paciente
  obtenerHistorialPaciente(idPaciente: number): Observable<Referido[]> {
    return this.http.get<ApiResponse<Referido[]>>(
      `${this.apiUrl}/paciente/${idPaciente}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // Métodos auxiliares
  obtenerEstadoReferido(referido: Referido): string {
    if (referido.confirmacion4 === 1) return 'Completado';
    if (referido.confirmacion3 === 1) return 'Pendiente médico destino';
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