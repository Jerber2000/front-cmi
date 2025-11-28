// services/historialMedico.service.ts - VERSIÓN LIMPIA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HistorialMedico {
  idhistorial: number;
  fkpaciente: number;
  fkusuario: number;
  fkclinica?: number;  // ✅ AGREGAR ESTE CAMPO
  fecha: string;
  motivoconsulta: string;
  notaconsulta?: string;
  recordatorio?: string;
  evolucion?: string;
  diagnosticotratamiento?: string;
  rutahistorialclinico?: string;
  fechacreacion: string;
  fechamodificacion?: string;
  usuario?: {
    nombres: string;
    apellidos: string;
    puesto: string;
  };
  paciente?: {
    nombres: string;
    apellidos: string;
    expedientes?: {
      numeroexpediente: string;
    }[];
  };
  clinica?: {  // ✅ AGREGAR ESTA RELACIÓN
    idclinica: number;
    nombreclinica: string;
  };
}

export interface InfoPaciente {
  idpaciente: number;
  nombres: string;
  apellidos: string;
  cui: string;
  genero?: string;
  fkclinica?: number;
  rutafotoperfil?: string;
  telefono?: string;
  email?: string;
  fechanacimiento?: string;
  expedientes?: {
    numeroexpediente: string;
    fechacreacion?: string;
  }[];
}

export interface CrearSesionRequest {
  fkpaciente: number;
  fkusuario: number;
  fkclinica?: number;
  fecha: string;
  motivoconsulta: string;
  notaconsulta?: string;
  recordatorio?: string;
  evolucion?: string;
  diagnosticotratamiento?: string;
}

export interface ActualizarSesionRequest {
  motivoconsulta?: string;
  notaconsulta?: string;
  recordatorio?: string;
  evolucion?: string;
  diagnosticotratamiento?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialMedicoService {
  private apiUrl = `${environment.apiUrl}/historial`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  obtenerHistorialPorPaciente(idpaciente: number): Observable<HistorialMedico[]> {
    return this.http.get<ApiResponse<HistorialMedico[]>>(
      `${this.apiUrl}/paciente/${idpaciente}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  obtenerInfoPaciente(idpaciente: number): Observable<InfoPaciente> {
    return this.http.get<ApiResponse<InfoPaciente>>(
      `${this.apiUrl}/info-paciente/${idpaciente}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  crearSesion(sesion: CrearSesionRequest): Observable<HistorialMedico> {
    return this.http.post<ApiResponse<HistorialMedico>>(
      `${this.apiUrl}/crear-sesion`,
      sesion, 
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  actualizarSesion(idhistorial: number, datos: ActualizarSesionRequest): Observable<HistorialMedico> {
    return this.http.put<ApiResponse<HistorialMedico>>(
      `${this.apiUrl}/actualizar-sesion/${idhistorial}`,
      datos, 
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

eliminarSesion(idhistorial: number): Observable<any> {
  return this.http.delete<ApiResponse<any>>(
    `${this.apiUrl}/eliminar-sesion/${idhistorial}`, // ✅ Verificar que esta ruta exista en backend
    { headers: this.getHeaders() }
  ).pipe(
    map(response => response.data)
  );
}

  formatearFechaInput(fecha: string): string {
    if (!fecha) return '';
    return fecha.split('T')[0];
  }

  formatearFechaDisplay(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT');
  }

obtenerArchivosSesion(idHistorial: number): Observable<any[]> {
  return this.http.get<ApiResponse<any[]>>(
    `${this.apiUrl}/sesion/${idHistorial}/archivos`,
    { headers: this.getHeaders() }
  ).pipe(
    map(response => response.data || [])
  );
}

actualizarArchivoseSesion(idHistorial: number, rutaarchivos: string): Observable<any> {
  return this.http.put<ApiResponse<any>>(
    `${this.apiUrl}/sesion/${idHistorial}/archivos`,
    { rutaarchivos },
    { headers: this.getHeaders() }
  ).pipe(
    map(response => response.data)
  );
}


// 1. Método para actualizar ruta de archivos
actualizarRutaArchivos(idhistorial: number, rutaarchivos: string): Observable<any> {
  return this.http.put<ApiResponse<any>>(
    `${this.apiUrl}/sesion/${idhistorial}/archivos`, // ✅ Ruta correcta
    { rutaarchivos }, // ✅ Nombre correcto del campo
    { headers: this.getHeaders() }
  ).pipe(map(response => response.data));
}

// 2. Método para obtener una sesión específica
obtenerSesion(idhistorial: number): Observable<HistorialMedico> {
  return this.http.get<ApiResponse<HistorialMedico>>(
    `${this.apiUrl}/sesion/${idhistorial}`,
    { headers: this.getHeaders() }
  ).pipe(
    map(response => response.data)
  );
}


  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

