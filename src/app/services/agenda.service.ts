// src/app/services/agenda.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Cita {
  idagenda: number;
  fkusuario: number;
  fkpaciente: number;
  fechaatencion: string;
  horaatencion: string;
  comentario?: string;
  transporte?: number;
  fechatransporte?: string;
  horariotransporte?: string;
  usuario: {
    nombres: string;
    apellidos: string;
    profesion?: string;
  };
  paciente: {
    nombres: string;
    apellidos: string;
    cui: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  private apiUrl = `${environment.apiUrl}/agenda`;

  constructor(private http: HttpClient) { }

  // Obtener citas con filtros
  getCitas(filtros?: any): Observable<ApiResponse<Cita[]>> {
    let params = new HttpParams();
    
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    if (filtros?.fkusuario) params = params.set('fkusuario', filtros.fkusuario);
    if (filtros?.fkpaciente) params = params.set('fkpaciente', filtros.fkpaciente);

    return this.http.get<ApiResponse<Cita[]>>(this.apiUrl, { params });
  }

  // Obtener cita por ID
  getCitaPorId(id: number): Observable<ApiResponse<Cita>> {
    return this.http.get<ApiResponse<Cita>>(`${this.apiUrl}/${id}`);
  }

  // Crear nueva cita
  crearCita(cita: Partial<Cita>): Observable<ApiResponse<Cita>> {
    return this.http.post<ApiResponse<Cita>>(this.apiUrl, cita);
  }

  // Actualizar cita
  actualizarCita(id: number, cita: Partial<Cita>): Observable<ApiResponse<Cita>> {
    return this.http.put<ApiResponse<Cita>>(`${this.apiUrl}/${id}`, cita);
  }

  // Eliminar cita
  eliminarCita(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // Obtener disponibilidad
  getDisponibilidad(fkusuario: number, fecha: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fkusuario', fkusuario.toString())
      .set('fecha', fecha);
    
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/disponibilidad`, { params });
  }
}