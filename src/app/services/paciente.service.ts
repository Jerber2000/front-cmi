// src/app/services/paciente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Clinica {
  idclinica: number;
  nombreclinica: string;
}

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
  fkclinica?: number;
  
  // Rutas de archivos
  rutafotoperfil?: string;
  rutafotoencargado?: string;
  rutacartaautorizacion?: string;

  clinica?: Clinica;

  expedientes?: Array<{
    idexpediente: number;
    numeroexpediente: string;
    historiaenfermedad?: string;
  }>;
}

export interface RespuestaPaciente {
  exito: boolean;
  datos: Paciente | Paciente[];
  mensaje?: string;
  paginacion?: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
  error?: string;
}

export interface RespuestaClinicas {
  success: boolean;
  data: Clinica[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicioPaciente {
  private urlApi = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) {}

  // ❌ NO INCLUIR subirFoto() ni subirDocumento() AQUÍ
  // ✅ Esos métodos van en archivo.service.ts

  obtenerClinicas(): Observable<Clinica[]> {
    return this.http.get<RespuestaClinicas>(`${this.urlApi}/clinicas`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener clínicas:', error);
        return of([]);
      })
    );
  }

  obtenerTodosLosPacientes(
    pagina: number = 1, 
    limite: number = 10, 
    busqueda: string = '',
    fkclinica?: number
  ): Observable<RespuestaPaciente> {
    let parametros = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());
    
    if (busqueda.trim()) {
      parametros = parametros.set('busqueda', busqueda);
    }

    if (fkclinica && fkclinica > 0) {
      parametros = parametros.set('fkclinica', fkclinica.toString());
    }

    return this.http.get<RespuestaPaciente>(this.urlApi, { params: parametros });
  }

  obtenerListadoPacientes(): Observable<Paciente[]> {
    const ruta = `${this.urlApi}/obtenerListado`;
    return this.http.get<any>(ruta).pipe(
      tap(response => {
        console.log('Respuesta obtenerListado:', response);
      }),
      map(response => {
        if (response && response.exito && response.datos && Array.isArray(response.datos)) {
          return response.datos;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener listado de pacientes:', error);
        return of([]);
      })
    );
  }

  obtenerPacientePorId(id: number): Observable<RespuestaPaciente> {
    return this.http.get<RespuestaPaciente>(`${this.urlApi}/${id}`);
  }

  crearPaciente(paciente: Paciente): Observable<RespuestaPaciente> {
    return this.http.post<RespuestaPaciente>(this.urlApi, paciente);
  }

  actualizarPaciente(id: number, paciente: Partial<Paciente>): Observable<RespuestaPaciente> {
    return this.http.put<RespuestaPaciente>(`${this.urlApi}/${id}`, paciente);
  }

  eliminarPaciente(id: number): Observable<RespuestaPaciente> {
    return this.http.delete<RespuestaPaciente>(`${this.urlApi}/${id}`);
  }

  obtenerPacientesDisponibles(): Observable<RespuestaPaciente> {
    return this.http.get<RespuestaPaciente>(`${this.urlApi}/disponibles`);
  }

  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.urlApi}/estadisticas`);
  }

  pacienteTieneExpedientes(paciente: Paciente): boolean {
    return !!(paciente.expedientes && paciente.expedientes.length > 0);
  }

  obtenerPrimerExpediente(paciente: Paciente): any | null {
    if (this.pacienteTieneExpedientes(paciente)) {
      return paciente.expedientes![0];
    }
    return null;
  }

  obtenerNombreClinica(paciente: Paciente): string {
    return paciente.clinica?.nombreclinica || 'Sin clínica asignada';
  }

  tieneClinicaAsignada(paciente: Paciente): boolean {
    return !!(paciente.fkclinica && paciente.fkclinica > 0);
  }

  // Métodos de compatibilidad
  getAllPacientes = this.obtenerTodosLosPacientes;
  getPacienteById = this.obtenerPacientePorId;
  createPaciente = this.crearPaciente;
  updatePaciente = this.actualizarPaciente;
  deletePaciente = this.eliminarPaciente;
  getPacientesDisponibles = this.obtenerPacientesDisponibles;
  getPrimerExpediente = this.obtenerPrimerExpediente;
  getClinicas = this.obtenerClinicas;
}
