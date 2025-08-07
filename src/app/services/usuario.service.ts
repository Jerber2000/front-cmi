import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Usuario {
    idusuario:                number;
    fkrol:                    number;
    usuario:                  string;
    clave:                    string;
    nombres:                  string;
    apellidos:                string;
    fechanacimiento:          string;
    correo:                   string;
    puesto:                   string;
    profesion:                string;
    telinstitucional:         string;
    extension:                string;
    telefonopersonal:         string;
    nombrecontactoemergencia: string;
    telefonoemergencia:       string;
    rutafotoperfil:           string;
    observaciones?:           string;
    usuariocreacion:          string;
    estado:                   number;
}

@Injectable({
    providedIn: 'root'
})
export class UsuarioService{
    private apiUrl = `${environment.apiUrl}/usuario`;

    constructor(private http: HttpClient){
    }

    getCurrentUserData() {
        const userData = localStorage.getItem('usuario');
        return userData ? JSON.parse(userData) : null;
    }

    obtenerUsuarios(): Observable<Usuario[]>{
        const ruta = `${this.apiUrl}/buscarUsuarios`;
        return this.http.get<any>(ruta).pipe(
            tap(response => {}),
            map(response => {
                if(response && response.success && response.data && Array.isArray(response.data)){
                    return response.data;
                }
                return[];
            }),
            catchError(error => {
                console.log('Error fetching usuario: ', error);
                return of([]);
            })
        )
    }

    obtenerUsuarioPorId(id: number): Observable<Usuario>{
        return this.http.get<Usuario>(`${this.apiUrl}/buscarPorId/${id}`);
    }

    crearUsuario(usuario: Omit<Usuario, 'idusuario'>): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/crearUsuario`, usuario).pipe(
            tap(response => {
                console.log('RESPUESTA EXITOSA:', response);
            }),
            catchError(error => {
                console.error('❌ ERROR COMPLETO:', error);
                console.error('📋 STATUS:', error.status);
                console.error('💬 MENSAJE:', error.error);
                throw error;
            })
        );
    }

    actualizarUsuario(id: number, usuario: Omit<Usuario, 'idusuario'>): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, usuario);
    }

    eliminarUsuario(id: number): Observable<void>{
        return this.http.delete<void>(`${this.apiUrl}/eliminarUsuario/${id}`);
    }
}