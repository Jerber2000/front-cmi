// src/app/services/paciente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interface de Clínica
 */
export interface Clinica {
  idclinica: number;
  nombreclinica: string;
}

/**
 * Interface del paciente
 */
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
  
  // ✅ NUEVO: FK de clínica
  fkclinica?: number;
  
  // Rutas de archivos
  rutafotoperfil?: string;
  rutafotoencargado?: string;
  rutacartaautorizacion?: string;

  // ✅ NUEVO: Relación con clínica
  clinica?: Clinica;

  // Relación con expedientes
  expedientes?: Array<{
    idexpediente: number;
    numeroexpediente: string;
    historiaenfermedad?: string;
  }>;
}

/**
 * Respuesta del servidor para pacientes
 */
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

/**
 * Respuesta del servidor para clínicas
 */
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

  /**
   * ✅ NUEVO: Obtiene todas las clínicas disponibles
   */
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

  /**
   * Obtiene todos los pacientes con paginación, búsqueda y filtro por clínica
   */
  obtenerTodosLosPacientes(
    pagina: number = 1, 
    limite: number = 10, 
    busqueda: string = '',
    fkclinica?: number  // ✅ NUEVO: Parámetro opcional para filtrar por clínica
  ): Observable<RespuestaPaciente> {
    let parametros = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());
    
    if (busqueda.trim()) {
      parametros = parametros.set('busqueda', busqueda);
    }

    // ✅ NUEVO: Agregar filtro de clínica si se proporciona
    if (fkclinica && fkclinica > 0) {
      parametros = parametros.set('fkclinica', fkclinica.toString());
    }

    return this.http.get<RespuestaPaciente>(this.urlApi, { params: parametros });
  }

  /**
   * Obtiene listado simple de pacientes
   */
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

  /**
   * Obtiene un paciente por ID
   */
  obtenerPacientePorId(id: number): Observable<RespuestaPaciente> {
    return this.http.get<RespuestaPaciente>(`${this.urlApi}/${id}`);
  }

  /**
   * Crea un nuevo paciente
   */
  crearPaciente(paciente: Paciente): Observable<RespuestaPaciente> {
    return this.http.post<RespuestaPaciente>(this.urlApi, paciente);
  }

  /**
   * Actualiza un paciente existente
   */
  actualizarPaciente(id: number, paciente: Partial<Paciente>): Observable<RespuestaPaciente> {
    return this.http.put<RespuestaPaciente>(`${this.urlApi}/${id}`, paciente);
  }

  /**
   * Elimina un paciente
   */
  eliminarPaciente(id: number): Observable<RespuestaPaciente> {
    return this.http.delete<RespuestaPaciente>(`${this.urlApi}/${id}`);
  }

  /**
   * Obtiene pacientes disponibles para asignar a expedientes
   */
  obtenerPacientesDisponibles(): Observable<RespuestaPaciente> {
    return this.http.get<RespuestaPaciente>(`${this.urlApi}/disponibles`);
  }

  /**
   * Obtiene estadísticas de pacientes
   */
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.urlApi}/estadisticas`);
  }

  /**
   * Verifica si un paciente tiene expedientes
   */
  pacienteTieneExpedientes(paciente: Paciente): boolean {
    return !!(paciente.expedientes && paciente.expedientes.length > 0);
  }

  /**
   * Obtiene el primer expediente de un paciente
   */
  obtenerPrimerExpediente(paciente: Paciente): any | null {
    if (this.pacienteTieneExpedientes(paciente)) {
      return paciente.expedientes![0];
    }
    return null;
  }

  /**
   * ✅ NUEVO: Obtiene el nombre de la clínica de un paciente
   */
  obtenerNombreClinica(paciente: Paciente): string {
    return paciente.clinica?.nombreclinica || 'Sin clínica asignada';
  }

  /**
   * ✅ NUEVO: Verifica si un paciente tiene clínica asignada
   */
  tieneClinicaAsignada(paciente: Paciente): boolean {
    return !!(paciente.fkclinica && paciente.fkclinica > 0);
  }

  // Métodos de compatibilidad con nombres en inglés
  getAllPacientes = this.obtenerTodosLosPacientes;
  getPacienteById = this.obtenerPacientePorId;
  createPaciente = this.crearPaciente;
  updatePaciente = this.actualizarPaciente;
  deletePaciente = this.eliminarPaciente;
  getPacientesDisponibles = this.obtenerPacientesDisponibles;
  getPrimerExpediente = this.obtenerPrimerExpediente;
  getClinicas = this.obtenerClinicas;  // ✅ NUEVO
}