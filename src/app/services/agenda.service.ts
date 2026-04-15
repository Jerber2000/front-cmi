import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { response } from 'express';

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
  estado?: number | null;
  fkagenda_recurrente?: number | null;
  es_recurrente?: boolean;
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

export interface CitaRecurrenteRequest {
  fkusuario: number;
  fkpaciente: number;
  horaatencion: string;
  comentario?: string;
  transporte?: number;
  direccion?: string;
  tipo_recurrencia: 'diaria' | 'semanal' | 'mensual';
  intervalo: number;
  dias_semana?: string; 
  fecha_inicio: string;
  fecha_fin?: string;
  numero_ocurrencias?: number;
  usuariocreacion: string;
}

export interface CitaRecurrenteResponse {
  success: boolean;
  message: string;
  data?: {
    idagenda_recurrente: number;
    total_citas: number;
    fechas: string[];
  };
  conflictos?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  private apiUrl = `${environment.apiUrl}/agenda`;

  constructor(private http: HttpClient) { }

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

  obtenerReporteFormateado(fecha: string): Observable<any> {
    return this.obtenerCitasConTransporte(fecha).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            ...response,
            data: response.data.map((cita: any) => ({
              ...cita,
              nombreCompleto: `${cita.paciente?.nombres || ''} ${cita.paciente?.apellidos || ''}`.trim(),
              medicoCompleto: `Dr. ${cita.usuario?.nombres || ''} ${cita.usuario?.apellidos || ''}`.trim(),
              fechaFormateada: this.formatearFecha(cita.fechaatencion),
              horaFormateada: this.formatearHora(cita.horaatencion)
            }))
          };
        }
        return response;
      })
    );
  }

  crearCitaRecurrente(datos: CitaRecurrenteRequest): Observable<CitaRecurrenteResponse> {
    return this.http.post<CitaRecurrenteResponse>(
      `${this.apiUrl}/crearCitaRecurrente`, 
      datos
    ).pipe(
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

  cancelarCitaRecurrente(idagenda: number, usuariomodificacion: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/cancelarCitaRecurrente/${idagenda}`, 
      { usuariomodificacion }
    ).pipe(
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

  cancelarSerieCompleta(idagendaRecurrente: number, usuariomodificacion: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/cancelarSerieCompleta/${idagendaRecurrente}`, 
      { usuariomodificacion }
    ).pipe(
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

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private formatearHora(hora: string): string {
    if (!hora) return '';
    return hora.substring(0, 5); // HH:mm
  }

  obtenerDetallesSerieRecurrente(idagendaRecurrente: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/detallesSerieRecurrente/${idagendaRecurrente}`
    ).pipe(
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

  actualizarEstadoCita(idagenda: number, estado: number, comentario: string, usuariomodificacion: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/actualizarEstado/${idagenda}`, {
      estado,
      comentario,
      usuariomodificacion
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 400 || error.status === 422) && error.error) {
          return of(error.error);
        }
        throw error;
      })
    );
  }

}