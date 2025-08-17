// src/app/services/expediente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Expediente {
  idexpediente?: number;
  numeroexpediente: string;
  generarAutomatico?: boolean;
  
  // Historia clínica
  historiaenfermedad?: string;
  
  // Antecedentes médicos
  antmedico?: string;
  antmedicamento?: string;
  anttraumaticos?: string;
  antfamiliar?: string;
  antalergico?: string;
  antmedicamentos?: string;
  antsustancias?: string;
  antintolerantelactosa?: number; // 0 o 1
  
  // Antecedentes fisiológicos
  antfisoinmunizacion?: string;
  antfisocrecimiento?: string;
  antfisohabitos?: string;
  antfisoalimentos?: string;
  
  // Antecedentes gineco-obstétricos
  gineobsprenatales?: string;
  gineobsnatales?: string;
  gineobspostnatales?: string;
  gineobsgestas?: number;
  gineobspartos?: number;
  gineobsabortos?: number;
  gineobscesareas?: number;
  gineobshv?: string;
  gineobsmh?: string;
  gineobsfur?: string; // Fecha última regla
  gineobsciclos?: string;
  gineobsmenarquia?: string;
  
  // Examen físico
  examenfistc?: number; // Temperatura corporal
  examenfispa?: string; // Presión arterial
  examenfisfc?: number; // Frecuencia cardíaca
  examenfisfr?: number; // Frecuencia respiratoria
  examenfissao2?: number; // Saturación oxígeno
  examenfispeso?: number; // Peso
  examenfistalla?: number; // Talla
  examenfisimc?: number; // IMC
  examenfisgmt?: string; // Examen general
  
  // Campos de control
  usuariocreacion?: string;
  fechacreacion?: string;
  usuariomodificacion?: string;
  fechamodificacion?: string;
  estado?: number;
  
  // Relaciones incluidas
  paciente?: Array<{
    idpaciente: number;
    nombres: string;
    apellidos: string;
    cui: string;
  }>;
  detallereferirpaciente?: Array<{
    idrefpaciente: number;
    comentario: string;
    fechacreacion: string;
    clinica: {
      idclinica: number;
      nombreclinica: string;
    };
  }>;
}

export interface ExpedienteCreateResponse {
  success: boolean;
  data: Expediente; // Para CREATE debe ser un objeto, no array
  message?: string;
}

export interface ExpedienteListResponse {
  success: boolean;
  data: Expediente[]; // Para LIST debe ser array
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExpedienteResponse {
  success: boolean;
  data: Expediente | Expediente[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface EstadisticasExpediente {
  totalExpedientes: number;
  expedientesRecientes: number;
  expedientesConPacientes: number;
  expedientesSinPacientes: number;
}

export interface NumeroExpedienteResponse {
  success: boolean;
  data: {
    numeroexpediente: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpedienteService {
  private apiUrl = `${environment.apiUrl}/expedientes`;

  constructor(private http: HttpClient) {
    console.log('🌍 Expedientes API URL:', this.apiUrl);
  }

  // ==========================================
  // CRUD BÁSICO
  // ==========================================

  // Obtener todos los expedientes con paginación y búsqueda
  getAllExpedientes(page: number = 1, limit: number = 10, search: string = ''): Observable<ExpedienteListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search.trim()) {
      params = params.set('search', search);
    }

    console.log('GET Request:', `${this.apiUrl}?${params.toString()}`);
    return this.http.get<ExpedienteListResponse>(this.apiUrl, { params });
  }

  // Obtener un expediente por ID
  getExpedienteById(id: number): Observable<ExpedienteResponse> {
    console.log('GET Request:', `${this.apiUrl}/${id}`);
    return this.http.get<ExpedienteResponse>(`${this.apiUrl}/${id}`);
  }
  

  // Crear nuevo expediente
  createExpediente(expediente: Expediente): Observable<ExpedienteCreateResponse> {
    console.log('POST Request:', this.apiUrl);
    console.log('POST Body:', expediente);
    return this.http.post<ExpedienteCreateResponse>(this.apiUrl, expediente);
  }

  // Actualizar expediente
  updateExpediente(id: number, expediente: Partial<Expediente>): Observable<ExpedienteResponse> {
    console.log('PUT Request:', `${this.apiUrl}/${id}`);
    console.log('PUT Body:', expediente);
    return this.http.put<ExpedienteResponse>(`${this.apiUrl}/${id}`, expediente);
  }

  // Eliminar expediente
  deleteExpediente(id: number): Observable<ExpedienteResponse> {
    console.log('DELETE Request:', `${this.apiUrl}/${id}`);
    return this.http.delete<ExpedienteResponse>(`${this.apiUrl}/${id}`);
  }

  // ==========================================
  // FUNCIONES ESPECIALES
  // ==========================================

  // Obtener expedientes disponibles (sin pacientes asignados)
  getExpedientesDisponibles(): Observable<ExpedienteResponse> {
    console.log('GET Request:', `${this.apiUrl}/disponibles`);
    return this.http.get<ExpedienteResponse>(`${this.apiUrl}/disponibles`);
  }

  // Generar número de expediente automático
  generarNumeroExpediente(): Observable<NumeroExpedienteResponse> {
    console.log('GET Request:', `${this.apiUrl}/generar-numero`);
    return this.http.get<NumeroExpedienteResponse>(`${this.apiUrl}/generar-numero`);
  }

  // Obtener estadísticas de expedientes
  getEstadisticas(): Observable<{ success: boolean; data: EstadisticasExpediente }> {
    console.log('GET Request:', `${this.apiUrl}/estadisticas`);
    return this.http.get<{ success: boolean; data: EstadisticasExpediente }>(`${this.apiUrl}/estadisticas`);
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  // Validar datos de expediente antes de enviar
  validateExpediente(expediente: Expediente): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Si no es automático, necesita número de expediente
    if (!expediente.generarAutomatico && (!expediente.numeroexpediente || expediente.numeroexpediente.trim() === '')) {
      errors.push('El número de expediente es requerido cuando no se genera automáticamente');
    }

    // Validar rangos numéricos si están presentes
    if (expediente.examenfistc !== undefined && expediente.examenfistc !== null) {
      if (expediente.examenfistc < 0 || expediente.examenfistc > 999.99) {
        errors.push('La temperatura corporal debe estar entre 0 y 999.99');
      }
    }

    if (expediente.examenfissao2 !== undefined && expediente.examenfissao2 !== null) {
      if (expediente.examenfissao2 < 0 || expediente.examenfissao2 > 100) {
        errors.push('La saturación de oxígeno debe estar entre 0 y 100');
      }
    }

    if (expediente.examenfispeso !== undefined && expediente.examenfispeso !== null) {
      if (expediente.examenfispeso < 0 || expediente.examenfispeso > 9999.99) {
        errors.push('El peso debe estar entre 0 y 9999.99 kg');
      }
    }

    if (expediente.examenfistalla !== undefined && expediente.examenfistalla !== null) {
      if (expediente.examenfistalla < 0 || expediente.examenfistalla > 999.99) {
        errors.push('La talla debe estar entre 0 y 999.99 m');
      }
    }

    // Validar valores enteros positivos
    const camposEnteros = ['gineobsgestas', 'gineobspartos', 'gineobsabortos', 'gineobscesareas', 'examenfisfc', 'examenfisfr'];
    camposEnteros.forEach(campo => {
      const valor = (expediente as any)[campo];
      if (valor !== undefined && valor !== null && (valor < 0 || !Number.isInteger(Number(valor)))) {
        errors.push(`${campo} debe ser un número entero positivo`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Formatear datos para envío al backend
  formatForBackend(expediente: Expediente): Expediente {
    const formatted = { ...expediente };

    // Convertir strings vacíos a null
    Object.keys(formatted).forEach(key => {
      if (typeof (formatted as any)[key] === 'string' && (formatted as any)[key].trim() === '') {
        (formatted as any)[key] = null;
      }
    });

    // Asegurar que valores numéricos sean números
    const camposNumericos = [
      'antintolerantelactosa', 'gineobsgestas', 'gineobspartos', 'gineobsabortos', 'gineobscesareas',
      'examenfistc', 'examenfisfc', 'examenfisfr', 'examenfissao2', 'examenfispeso', 'examenfistalla', 'examenfisimc'
    ];

    camposNumericos.forEach(campo => {
      const valor = (formatted as any)[campo];
      if (valor !== undefined && valor !== null && valor !== '') {
        (formatted as any)[campo] = Number(valor);
      }
    });

    return formatted;
  }

  // Obtener texto descriptivo para campos específicos
  getIntolerancieLactosaText(value: number | undefined): string {
    if (value === 1) return 'Sí';
    if (value === 0) return 'No';
    return 'No especificado';
  }

  // Calcular IMC automáticamente
  calcularIMC(peso?: number, talla?: number): number | null {
    if (!peso || !talla || peso <= 0 || talla <= 0) {
      return null;
    }
    return Number((peso / (talla * talla)).toFixed(2));
  }

  // Validar presión arterial
  validarPresionArterial(presion: string): boolean {
    if (!presion) return true; // Es opcional
    const regex = /^\d{2,3}\/\d{2,3}$/;
    return regex.test(presion);
  }
}