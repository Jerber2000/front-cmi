import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { response } from 'express';

// Interfaz para crear/actualizar citas (sin datos anidados)
export interface CitaRequest {
  idagenda?: number;
  fkusuario: number;
  fkpaciente: number;
  fechaatencion: string;
  horaatencion: string;
  comentario?: string;
  transporte?: number;
  fechatransporte?: string | null;
  horariotransporte?: string | null;
  direccion?: string;
  usuariocreacion?: string;
  usuariomodificacion?: string;
  estado?: number;
  usuario?: {
    idusuario?: number;
    nombres: string;
    apellidos: string;
  };
  paciente?: {
    idpaciente?: number;
    nombres: string;
    apellidos: string;
    nombreencargado?: string;
    telefonoencargado?: string;
  };
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

  crearCita(cita: CitaRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crearCita`, cita).pipe(
      tap(response => {
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  obtenerCitas(): Observable<CitaRequest[]>{
    const ruta = `${this.apiUrl}/obtenerCitas`;
    return this.http.get<any>(ruta).pipe(
      tap(response =>{}),
      map(response =>{
        if(response && response.success && response.data && Array.isArray(response.data)){
          return response.data;
        }
        return[];
      }),
      catchError(error =>{
        return of([]);
      })
    )
  }

  // Actualizar cita - USA CitaRequest
  actualizarCita(id: number, cita: CitaRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/actualizarCita/${id}`, cita).pipe(
      tap(response => {
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  eliminarCita(id: number, usuarioModificacion: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/eliminarCita/${id}`, {
      usuariomodificacion: usuarioModificacion
    }).pipe(
      tap(response => {
      }),
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

  obtenerCitasConTransporte(fecha: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/transporte`, {
      params: { fecha }
    });
  }
}