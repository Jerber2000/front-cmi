// src/app/services/paciente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Paciente {
  idpaciente?: number;
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
  
  // Datos del expediente para crear
  numeroexpediente?: string;
  historiaenfermedad?: string;
  antmedico?: string;
  antmedicamento?: string;
  anttraumaticos?: string;
  antfamiliar?: string;
  antalergico?: string;
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
  private apiUrl = 'https://back-cmi-production.up.railway.app/api/pacientes';

  constructor(private http: HttpClient) {}

  // Obtener todos los pacientes con paginación y búsqueda
  getAllPacientes(page: number = 1, limit: number = 10, search: string = ''): Observable<PacienteResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search.trim()) {
      params = params.set('search', search);
    }

    return this.http.get<PacienteResponse>(this.apiUrl, { params });
  }

  // Obtener un paciente por ID
  getPacienteById(id: number): Observable<PacienteResponse> {
    return this.http.get<PacienteResponse>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo paciente
  createPaciente(paciente: Paciente): Observable<PacienteResponse> {
    return this.http.post<PacienteResponse>(this.apiUrl, paciente);
  }

  // Actualizar paciente
  updatePaciente(id: number, paciente: Partial<Paciente>): Observable<PacienteResponse> {
    return this.http.put<PacienteResponse>(`${this.apiUrl}/${id}`, paciente);
  }

  // Eliminar paciente
  deletePaciente(id: number): Observable<PacienteResponse> {
    return this.http.delete<PacienteResponse>(`${this.apiUrl}/${id}`);
  }
}