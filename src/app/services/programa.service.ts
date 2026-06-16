import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Programa {
  idprograma: number;
  nombre: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class ProgramaService {
  private apiUrl = `${environment.apiUrl}/programas`;

  constructor(private http: HttpClient) {}

  obtenerProgramas(): Observable<Programa[]> {
    return this.http.get<{ success: boolean, data: Programa[] }>(this.apiUrl)
      .pipe(map(resp => resp.data));
  }

  crearPrograma(datos: { nombre: string; descripcion?: string }): Observable<any> {
    return this.http.post(this.apiUrl, datos);
  }

  actualizarPrograma(id: number, datos: { nombre: string; descripcion?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, datos);
  }

  eliminarPrograma(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
