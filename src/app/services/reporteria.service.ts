// src/app/services/reporteria.service.ts - ACTUALIZADO
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface DashboardData {
  pacientes: {
    total: number;
    activos: number;
    inactivos: number;
    nuevosMes: number;
  };
  consultas: {
    totalMes: number;
  };
  inventario: {
    total: number;
    activos: number;
    alertasStockBajo: number;
    proximosVencer: number;
    valorTotal: number;
  };
  agenda: {
    citasMes: number;
  };
  referencias: {
    total: number;
    enviadas: number;
    recibidas: number;
    pendientes: number;
    completadas: number;
  };
  salidas: {
    totalMes: number;
    totalUnidadesMes: number;
    activas: number;
    anuladas: number;
  };
}

export interface ReportePacientes {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  resumen: {
    totalPacientes: number;
    porGenero: {
      masculino: number;
      femenino: number;
    };
    conExpediente: number;
    sinExpediente: number;
  };
}

export interface ReporteConsultas {
  data: any[];
  pagination: any;
  resumen: {
    totalConsultas: number;
    conDiagnostico: number;
    conArchivos: number;
    porMedico: number;
  };
}

export interface ReporteInventario {
  data: any[];
  pagination: any;
  resumen: {
    totalMedicamentos: number;
    activos: number;
    inactivos: number;
    valorTotalInventario: number;
    unidadesTotales: number;
  };
  alertas: {
    stockBajo: number;
    proximosVencer: number;
    vencidos: number;
  };
}

export interface ReporteAgenda {
  data: any[];
  pagination: any;
  resumen: {
    totalCitas: number;
    conTransporte: number;
    sinTransporte: number;
  };
}

export interface ReporteReferencias {
  data: any[];
  pagination: any;
  resumen: {
    total: number;
    pendientes: number;
    completadas: number;
    enviadas: number;
    recibidas: number;
  };
}

export interface ReporteSalidas {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  resumen: {
    totalSalidas: number;
    activas: number;
    anuladas: number;
    totalUnidadesDespachadas: number;
  };
}

export interface FiltrosSalidas {
  desde?: string;
  hasta?: string;
  estado?: string; // 'activas' | 'anuladas' | 'todas'
  medicamento?: number;
  usuario?: number;
  motivo?: string;
  destino?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosPacientes {
  desde?: string;
  hasta?: string;
  genero?: string;
  municipio?: string;
  edadMin?: number;
  edadMax?: number;
  tipodiscapacidad?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosConsultas {
  nombrePaciente?: string;
  cuiPaciente?: string;
  desde?: string;
  hasta?: string;
  medico?: number;
  diagnostico?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosInventario {
  estado?: string;
  stockMinimo?: number;
  proximosVencer?: number;
  usuario?: number;
  page?: number;
  limit?: number;
}

export interface FiltrosAgenda {
  nombrePaciente?: string;
  cuiPaciente?: string;
  desde?: string;
  hasta?: string;
  medico?: number;
  transporte?: number;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosReferencias {
  tipo?: string;
  estado?: string;
  clinica?: number;
  medico?: number;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  mensaje?: string;
  data?: T;
  pagination?: any;
  resumen?: any;
  alertas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteriaService {
  private apiUrl = `${environment.apiUrl}/reporteria`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private buildParams(filtros: any): HttpParams | undefined {
    if (!filtros || typeof filtros !== 'object') {
      return undefined;
    }
    
    let params = new HttpParams();
    let hasParams = false;
    
    Object.keys(filtros).forEach(key => {
      const value = filtros[key];
      if (value !== undefined && value !== null && value !== '') {
        // Si es array, hacer append para cada elemento (permite múltiples valores)
        if (Array.isArray(value)) {
          value.forEach(v => {
            if (v !== undefined && v !== null && v !== '') {
              params = params.append(key, v.toString());
              hasParams = true;
            }
          });
        } else {
          params = params.set(key, value.toString());
          hasParams = true;
        }
      }
    });
    
    return hasParams ? params : undefined;
  }

  // ==========================================
  // OBTENER DATOS
  // ==========================================

  obtenerDashboard(): Observable<DashboardData> {
    return this.http.get<ApiResponse<DashboardData>>(
      `${this.apiUrl}/dashboard`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  obtenerMedicosDisponibles(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/medicos`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || [])
    );
  }

  obtenerReportePacientes(filtros: FiltrosPacientes = {}): Observable<ReportePacientes> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/pacientes`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {}
      }))
    );
  }

  obtenerReporteConsultas(filtros: FiltrosConsultas = {}): Observable<ReporteConsultas> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/consultas`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {}
      }))
    );
  }

  obtenerReporteInventario(filtros: FiltrosInventario = {}): Observable<ReporteInventario> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/inventario`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {},
        alertas: response.alertas || {}
      }))
    );
  }

  obtenerReporteAgenda(filtros: FiltrosAgenda = {}): Observable<ReporteAgenda> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/agenda`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {}
      }))
    );
  }

  obtenerReporteReferencias(filtros: FiltrosReferencias = {}): Observable<ReporteReferencias> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/referencias`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {}
      }))
    );
  }

  obtenerReporteSalidas(filtros: FiltrosSalidas = {}): Observable<ReporteSalidas> {
    const params = this.buildParams(filtros);
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/salidas`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        resumen: response.resumen || {
          totalSalidas: 0,
          activas: 0,
          anuladas: 0,
          totalUnidadesDespachadas: 0
        }
      }))
    );
  }


  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  formatearFecha(fecha: string | Date): string {
    if (!fecha) return '';
    // Fechas tipo @db.Date llegan como 'YYYY-MM-DD' o como ISO con T00:00:00Z.
    // Convertirlas con new Date() en browser UTC-6 desplaza un día atrás.
    // Por eso: si es string de solo fecha, formateamos directo sin Date.
    const str = typeof fecha === 'string' ? fecha : (fecha as Date).toISOString();
    const datePart = str.split('T')[0]; // '2026-04-16'
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(valor);
  }
}