// src/app/services/paciente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Paciente {
  idpaciente?: number;
  fkexpediente?: number; // ⭐ AGREGADO PARA LA RELACIÓN
  nombres: string;
  apellidos: string;
  cui: string;
  fechanacimiento: string;
  genero: string;
  tipoconsulta: string;
  tipodiscapacidad?: string;
  telefonopersonal?: string;
  nombrecontactoemergencia?: string;
  telefonoemergencia?: string;
  nombreencargado?: string;
  dpiencargado?: string;
  telefonoencargado?: string;
  municipio: string;
  aldea?: string;
  direccion: string;
  usuariocreacion?: string;
  fechacreacion?: string;
  usuariomodificacion?: string;
  fechamodificacion?: string;
  estado?: number;
  
  // Rutas de archivos
  rutafotoperfil?: string;
  rutafotoencargado?: string;
  rutacartaautorizacion?: string;

  // ⭐ RELACIÓN CON EXPEDIENTE
  expediente?: {
    idexpediente: number;
    numeroexpediente: string;
    historiaenfermedad?: string;
  };
}

export interface PacienteResponse {
  success: boolean;
  data: Paciente | Paciente[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private apiUrl = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) {
    console.log('🌍 API URL:', this.apiUrl);
  }

  // Obtener todos los pacientes con paginación y búsqueda
  getAllPacientes(page: number = 1, limit: number = 10, search: string = ''): Observable<PacienteResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search.trim()) {
      params = params.set('search', search);
    }

    console.log('GET Request:', `${this.apiUrl}?${params.toString()}`);
    return this.http.get<PacienteResponse>(this.apiUrl, { params });
  }

  // Obtener un paciente por ID
  getPacienteById(id: number): Observable<PacienteResponse> {
    console.log('GET Request:', `${this.apiUrl}/${id}`);
    return this.http.get<PacienteResponse>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo paciente
  createPaciente(paciente: Paciente): Observable<PacienteResponse> {
    console.log('POST Request:', this.apiUrl);
    console.log('POST Body:', paciente);
    return this.http.post<PacienteResponse>(this.apiUrl, paciente);
  }

  // Actualizar paciente
  updatePaciente(id: number, paciente: Partial<Paciente>): Observable<PacienteResponse> {
    console.log('PUT Request:', `${this.apiUrl}/${id}`);
    console.log('PUT Body:', paciente);
    return this.http.put<PacienteResponse>(`${this.apiUrl}/${id}`, paciente);
  }

  // Eliminar paciente
  deletePaciente(id: number): Observable<PacienteResponse> {
    console.log('DELETE Request:', `${this.apiUrl}/${id}`);
    return this.http.delete<PacienteResponse>(`${this.apiUrl}/${id}`);
  }
}