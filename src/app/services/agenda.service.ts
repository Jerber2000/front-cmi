import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaz para crear/actualizar citas (sin datos anidados)
export interface CitaRequest {
  fkusuario: number;
  fkpaciente: number;
  fechaatencion: string;
  horaatencion: string;
  comentario?: string;
  transporte?: number;
  fechatransporte?: string | null;
  horariotransporte?: string | null;
  direccion: string | null;
  usuariocreacion: string;
  estado: number;
}

// Interfaz completa de Cita (como viene del backend)
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
  success?: boolean;
  exito?: boolean;
  data?: T;
  datos?: T;
  message?: string;
  mensaje?: string;
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

  // Crear nueva cita - USA CitaRequest, no Cita completa
  crearCita(cita: CitaRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crearCita`, cita).pipe(
      tap(response => {
        console.log('Respuesta crear cita:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  // Actualizar cita - USA CitaRequest
  actualizarCita(id: number, cita: CitaRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/actualizarCita/${id}`, cita).pipe(
      tap(response => {
        console.log('Respuesta actualizar cita:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  // Eliminar cita
  eliminarCita(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminarCita/${id}`).pipe(
      tap(response => {
        console.log('Respuesta eliminar cita:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  // Obtener disponibilidad
  getDisponibilidad(fkusuario: number, fecha: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fkusuario', fkusuario.toString())
      .set('fecha', fecha);
    
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/disponibilidad`, { params });
  }
}