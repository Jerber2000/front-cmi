import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Usuario {
    id:                       number;
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
    estado:                   string;
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

    crearUsuario(usuario: Usuario): Observable<Usuario>{
        return this.http.post<Usuario>(`${this.apiUrl}/crearUsuario`, usuario);
    }

    actualizarUsuario(id: number, usuario: Usuario): Observable<Usuario>{
        return this.http.put<Usuario>(`${this.apiUrl}/actualizarUsuario/${id}`, usuario);
    }

    eliminarUsuario(id: number): Observable<void>{
        return this.http.delete<void>(`${this.apiUrl}/eliminarUsuario/${id}`);
    }
}