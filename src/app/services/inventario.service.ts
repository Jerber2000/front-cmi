// src/app/services/inventario.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Medicamento {
  idmedicina: number;
  fkusuario: number;
  codigoproducto?: string;
  nombre: string;
  descripcion?: string;
  unidades: number;
  precio?: number;
  observaciones?: string;
  fechaingreso?: string;
  fechaegreso?: string;
  usuariocreacion: string;
  fechacreacion: string;
  usuariomodificacion?: string;
  fechamodificacion?: string;
  estado: number;
  usuario?: {
    idusuario: number;
    nombres: string;
    apellidos: string;
    profesion: string;
    correo?: string;
  };
}

export interface CrearMedicamentoRequest {
  fkusuario: number;
  codigoproducto?: string;
  nombre: string;
  descripcion?: string;
  unidades?: number;
  precio?: number;
  observaciones?: string;
  fechaingreso?: string;
  fechaegreso?: string;
  usuariocreacion: string;
}

export interface ActualizarMedicamentoRequest {
  codigoproducto?: string;
  nombre: string;
  descripcion?: string;
  unidades?: number;
  precio?: number;
  observaciones?: string;
  fechaingreso?: string;
  fechaegreso?: string;
  usuariomodificacion: string;
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
export class InventarioService {
  private apiUrl = `${environment.apiUrl}/inventario`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Listar todos los medicamentos
  obtenerMedicamentos(): Observable<Medicamento[]> {
    return this.http.get<ApiResponse<Medicamento[]>>(
      this.apiUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // Obtener medicamento por ID
  obtenerMedicamentoPorId(id: number): Observable<Medicamento> {
    return this.http.get<ApiResponse<Medicamento>>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Crear nuevo medicamento
  crearMedicamento(datos: CrearMedicamentoRequest): Observable<Medicamento> {
    return this.http.post<ApiResponse<Medicamento>>(
      this.apiUrl,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Actualizar medicamento
  actualizarMedicamento(id: number, datos: ActualizarMedicamentoRequest): Observable<Medicamento> {
    return this.http.put<ApiResponse<Medicamento>>(
      `${this.apiUrl}/${id}`,
      datos,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Cambiar estado (activar/desactivar)
  cambiarEstado(id: number, usuariomodificacion: string): Observable<Medicamento> {
    return this.http.put<ApiResponse<Medicamento>>(
      `${this.apiUrl}/${id}/estado`,
      { usuariomodificacion },
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

  formatearPrecio(precio: number | undefined): string {
    if (!precio || precio === null || precio === undefined) return 'Q 0.00';
    const precioNumero = Number(precio); // Convertir a número por si acaso
    if (isNaN(precioNumero)) return 'Q 0.00';
    return `Q ${precioNumero.toFixed(2)}`;
  }

  obtenerEstadoTexto(estado: number): string {
    return estado === 1 ? 'Activo' : 'Inactivo';
  }

  calcularValorTotal(medicamento: Medicamento): number {
    const unidades = Number(medicamento.unidades) || 0;
    const precio = Number(medicamento.precio) || 0;
    return unidades * precio;
  }
}