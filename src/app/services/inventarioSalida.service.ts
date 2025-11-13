// src/app/services/inventarioSalida.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Salida {
  idsalida: number;
  fkmedicina: number;
  fkusuario: number;
  cantidad: number;
  motivo?: string;
  destino?: string;
  observaciones?: string;
  fechasalida: string;
  usuariocreacion: string;
  fechacreacion: string;
  usuariomodificacion?: string;
  fechamodificacion?: string;
  estado: number;
  medicamento?: {
    idmedicina: number;
    nombre: string;
    codigoproducto?: string;
    descripcion?: string;
    unidades: number;
  };
  usuario?: {
    idusuario: number;
    nombres: string;
    apellidos: string;
    profesion: string;
  };
  stockAnterior?: number;
  stockActual?: number;
  stockRestaurado?: number;
  unidadesDevueltas?: number;
}

export interface CrearSalidaRequest {
  fkmedicina: number;
  fkusuario: number;
  cantidad: number;
  motivo?: string;
  destino?: string;
  observaciones?: string;
  fechasalida: string;
  usuariocreacion: string;
}

export interface Estadisticas {
  totalSalidas: number;
  totalUnidadesSalidas: number;
  salidasPorMedicamento: Array<{
    fkmedicina: number;
    _sum: { cantidad: number };
    _count: { idsalida: number };
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioSalidaService {
  private apiUrl = `${environment.apiUrl}/salidas`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Listar todas las salidas
  obtenerSalidas(): Observable<Salida[]> {
    return this.http.get<ApiResponse<Salida[]>>(
      this.apiUrl, // ← CAMBIO: Ya no es `${this.apiUrl}/salidas`
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // Obtener salida por ID
  obtenerSalidaPorId(id: number): Observable<Salida> {
    return this.http.get<ApiResponse<Salida>>(
      `${this.apiUrl}/${id}`, // ← Ya no es `${this.apiUrl}/salidas/${id}`
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Obtener historial de salidas de un medicamento
  obtenerSalidasPorMedicamento(idmedicina: number): Observable<Salida[]> {
    return this.http.get<ApiResponse<Salida[]>>(
      `${this.apiUrl}/medicamento/${idmedicina}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // Crear nueva salida
  crearSalida(datos: CrearSalidaRequest): Observable<Salida> {
    return this.http.post<ApiResponse<Salida>>(
      this.apiUrl, // ← Ya no es `${this.apiUrl}/salidas`
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Anular salida
  anularSalida(id: number, usuariomodificacion: string): Observable<Salida> {
    return this.http.put<ApiResponse<Salida>>(
      `${this.apiUrl}/${id}/anular`, // ← Ya no es `${this.apiUrl}/salidas/${id}/anular`
      { usuariomodificacion },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Obtener estadísticas
  obtenerEstadisticas(): Observable<Estadisticas> {
    return this.http.get<ApiResponse<Estadisticas>>(
      `${this.apiUrl}/estadisticas`, // ← Ya no es `${this.apiUrl}/salidas/estadisticas`
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Métodos auxiliares
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearFechaHora(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerEstadoTexto(estado: number): string {
    return estado === 1 ? 'Activa' : 'Anulada';
  }

  obtenerEstadoClase(estado: number): string {
    return estado === 1 ? 'badge-active' : 'badge-inactive';
  }

  // Validar si se puede crear salida
  validarCantidad(cantidad: number, stockDisponible: number): { 
    valido: boolean; 
    mensaje?: string 
  } {
    if (cantidad <= 0) {
      return { 
        valido: false, 
        mensaje: 'La cantidad debe ser mayor a 0' 
      };
    }

    if (cantidad > stockDisponible) {
      return { 
        valido: false, 
        mensaje: `Stock insuficiente. Disponible: ${stockDisponible}` 
      };
    }

    return { valido: true };
  }

  // Calcular stock resultante
  calcularStockResultante(stockActual: number, cantidad: number): number {
    return stockActual - cantidad;
  }

  // Obtener color según nivel de stock
  obtenerColorStock(stock: number, stockMinimo: number = 10): string {
    if (stock === 0) return 'danger';
    if (stock <= stockMinimo) return 'warning';
    return 'success';
  }
}
