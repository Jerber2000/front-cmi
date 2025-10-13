// src/app/services/reporteria.service.ts
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
  desde?: string;
  hasta?: string;
  medico?: number;
  paciente?: number;
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
  desde?: string;
  hasta?: string;
  medico?: number;
  mes?: number;
  anio?: number;
  transporte?: number;
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
        params = params.set(key, value.toString());
        hasParams = true;
      }
    });
    
    return hasParams ? params : undefined;
  }

  // Dashboard
  obtenerDashboard(): Observable<DashboardData> {
    return this.http.get<ApiResponse<DashboardData>>(
      `${this.apiUrl}/dashboard`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!)
    );
  }

  // Reporte de Pacientes
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

  // Reporte de Consultas
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

  // Reporte de Inventario
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

  // Reporte de Agenda
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

  // Reporte de Referencias
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

  // Generar PDF
  generarPDF(tipoReporte: string, filtros: any = {}, titulo: string = ''): Observable<Blob> {
    const body = {
      tipoReporte,
      filtros,
      titulo: titulo || `Reporte de ${tipoReporte}`
    };

    return this.http.post(
      `${this.apiUrl}/generar-pdf`,
      body,
      { 
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  // Exportar Excel
  exportarExcel(tipoReporte: string, filtros: any = {}, nombreArchivo: string = ''): Observable<Blob> {
    const body = {
      tipoReporte,
      filtros,
      nombreArchivo: nombreArchivo || `reporte_${tipoReporte}`
    };

    return this.http.post(
      `${this.apiUrl}/exportar-excel`,
      body,
      { 
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  // Métodos auxiliares
  formatearFecha(fecha: string | Date): string {
    if (!fecha) return '';
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

  descargarArchivo(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}