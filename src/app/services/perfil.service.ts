import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Usuario, UsuarioService } from './usuario.service';
import { ArchivoService } from './archivo.service';
import { environment } from '../../environments/environment';

export interface PerfilFormData {
  password?: string;
  confirmPassword?: string;
  correo: string;
  confirmCorreo: string;
  telinstitucional: string;
  extension?: string;
  telPersonal: string;
}

export interface PerfilUpdateData {
  correo: string;
  telinstitucional: string;
  extension?: string;
  telefonopersonal: string;
  rutafotoperfil?: string;
  clave?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private perfilSubject = new BehaviorSubject<Usuario | null>(null);
  public perfil$ = this.perfilSubject.asObservable();

  constructor(
    private usuarioService: UsuarioService,
    private archivoService: ArchivoService,
    private http: HttpClient
  ) {
    // NO cargar desde localStorage al inicializar
    // Los datos siempre deben venir del backend
  }

  /**
   * Obtiene headers con token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtiene el ID del usuario logueado desde localStorage
   */
  private getCurrentUserId(): number {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        return usuario.idusuario;
      }
    } catch (error) {
      console.error('Error al obtener el ID del usuario desde localStorage:', error);
    }
    return 1; // Valor por defecto
  }

  /**
   * Obtiene el perfil actual del usuario logueado (solo del BehaviorSubject)
   */
  getPerfilActual(): Usuario | null {
    return this.perfilSubject.value;
  }

  /**
   * Obtiene la URL de la foto de perfil
   */
  getFotoPerfilUrl(usuario: Usuario): string | null {
    if (usuario.rutafotoperfil) {
      return this.archivoService.obtenerUrlPublica(usuario.rutafotoperfil);
    }
    return null;
  }

  /**
   * Valida los datos del formulario de perfil
   */
  validarFormularioPerfil(formData: PerfilFormData): { esValido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar contraseñas si se proporcionaron
    if (formData.password && formData.password.trim() !== '') {
      if (formData.password !== formData.confirmPassword) {
        errores.push('Las contraseñas no coinciden');
      }
      if (formData.password.length < 8) {
        errores.push('La contraseña debe tener al menos 8 caracteres');
      }
      if (formData.password.length > 12) {
        errores.push('La contraseña debe tener máximo 12 caracteres');
      }
      // Validar que tenga mayúsculas, minúsculas y números
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errores.push('La contraseña debe incluir mayúsculas, minúsculas y números');
      }
    }

    // Validar contraseñas requeridas juntas
    if ((formData.password && !formData.confirmPassword) || (!formData.password && formData.confirmPassword)) {
      errores.push('Debe completar ambos campos de contraseña o dejar ambos vacíos');
    }

    // Validar correos
    if (formData.correo !== formData.confirmCorreo) {
      errores.push('Los correos no coinciden');
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      errores.push('El formato del correo es inválido');
    }

    // Validar teléfonos
    if (formData.telinstitucional && !this.validarTelefono(formData.telinstitucional)) {
      errores.push('El formato del teléfono institucional es inválido (debe ser +502 0000-0000)');
    }

    if (formData.telPersonal && !this.validarTelefono(formData.telPersonal)) {
      errores.push('El formato del teléfono personal es inválido (debe ser +502 0000-0000)');
    }

    // Validar extensión
    if (formData.extension && (isNaN(Number(formData.extension)) || formData.extension.length > 4)) {
      errores.push('La extensión debe ser un número de máximo 4 dígitos');
    }

    return {
      esValido: errores.length === 0,
      errores
    };
  }

  /**
   * Valida formato de teléfono guatemalteco
   */
  private validarTelefono(telefono: string): boolean {
    // Formato: +502 0000-0000
    const telefonoRegex = /^\+502\s\d{4}-\d{4}$/;
    return telefonoRegex.test(telefono);
  }

  /**
   * Obtiene el perfil desde el backend usando el endpoint de usuarios existente
   */
  obtenerPerfilDesdeBackend(): Observable<Usuario> {
    const userId = this.getCurrentUserId();
    
    // Usar el endpoint existente de usuarios
    return this.usuarioService.obtenerUsuarioPorId(userId).pipe(
      map((response: any) => {
        if (response && response.success) {
          const usuario = response.data;
          // Solo actualizar el BehaviorSubject, NO localStorage
          this.perfilSubject.next(usuario);
          return usuario;
        } else {
          throw new Error(response?.message || 'Error al obtener el perfil');
        }
      }),
      catchError(error => {
        console.error('Error al obtener perfil desde backend:', error);
        return throwError(() => new Error(this.procesarErrorHttp(error)));
      })
    );
  }


  /**
   * Actualiza el perfil del usuario usando el endpoint de usuarios existente
   */
  actualizarPerfil(
    usuarioId: number, 
    formData: PerfilFormData, 
    nuevaFoto?: File
  ): Observable<any> {
    return new Observable(observer => {
      this.procesarActualizacionPerfil(usuarioId, formData, nuevaFoto)
        .then(result => {
          observer.next(result);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Procesa la actualización del perfil usando el endpoint de usuarios existente
   */
  private async procesarActualizacionPerfil(
    usuarioId: number,
    formData: PerfilFormData,
    nuevaFoto?: File
  ): Promise<any> {
    const usuarioActual = this.getPerfilActual();
    if (!usuarioActual) {
      throw new Error('No se encontró la información del usuario actual');
    }

    let rutaFoto = usuarioActual.rutafotoperfil || '';

    // ✅ Subir nueva foto si se proporcionó (elimina automáticamente la anterior)
    if (nuevaFoto) {
      try {
        // Obtener ruta anterior para que el backend la elimine
        const rutaAnterior = usuarioActual.rutafotoperfil || '';
        
        // Usar subirFoto en lugar de subirArchivos
        rutaFoto = await this.archivoService.subirFoto(
          'usuarios',
          usuarioId,
          nuevaFoto,
          rutaAnterior  // ✅ Backend eliminará esta automáticamente
        );
        
        console.log('✅ Foto de perfil actualizada:', rutaFoto);
      } catch (error) {
        console.error('Error al subir foto:', error);
        throw new Error('Error al subir la foto de perfil');
      }
    }

    // Preparar datos para el backend usando la estructura esperada por el endpoint de usuarios
    const updateData: any = {
      fkrol: usuarioActual.fkrol, // Mantener el rol actual
      usuario: usuarioActual.usuario, // Mantener el usuario actual
      nombres: usuarioActual.nombres, // Mantener nombres
      apellidos: usuarioActual.apellidos, // Mantener apellidos
      fechanacimiento: usuarioActual.fechanacimiento, // Mantener fecha
      correo: formData.correo,
      puesto: usuarioActual.puesto, // Mantener puesto
      profesion: usuarioActual.profesion, // Mantener profesión
      telinstitucional: formData.telinstitucional,
      telefonopersonal: formData.telPersonal,
      nombrecontactoemergencia: usuarioActual.nombrecontactoemergencia, // Mantener contacto
      telefonoemergencia: usuarioActual.telefonoemergencia, // Mantener teléfono emergencia
      observaciones: usuarioActual.observaciones, // Mantener observaciones
      usuariomodificacion: usuarioId.toString(),
      estado: usuarioActual.estado // Mantener estado actual
    };

    // Solo incluir extensión si tiene valor
    if (formData.extension && formData.extension.trim() !== '') {
      updateData.extension = formData.extension.trim();
    } else {
      updateData.extension = usuarioActual.extension || '';
    }

    // Solo incluir contraseña si se proporcionó una nueva
    if (formData.password && formData.password.trim() !== '') {
      updateData.clave = formData.password;
    } else {
      updateData.clave = usuarioActual.clave; // Mantener contraseña actual
    }

    // Solo incluir foto si se subió una nueva
    if (rutaFoto !== usuarioActual.rutafotoperfil) {
      updateData.rutafotoperfil = rutaFoto;
    } else {
      updateData.rutafotoperfil = usuarioActual.rutafotoperfil || '';
    }

    return new Promise((resolve, reject) => {
      // Usar el endpoint existente de usuarios
      this.usuarioService.actualizarUsuario(usuarioId, updateData).subscribe({
        next: (response) => {
          if (response.success) {
            // Actualizar perfil solo en memoria (BehaviorSubject)
            const perfilActualizado: Usuario = {
              ...usuarioActual,
              correo: formData.correo,
              telinstitucional: formData.telinstitucional,
              extension: formData.extension || '',
              telefonopersonal: formData.telPersonal,
              rutafotoperfil: rutaFoto
            };

            // SOLO actualizar BehaviorSubject - NO localStorage
            this.perfilSubject.next(perfilActualizado);
            resolve(response);
          } else {
            reject(new Error(response.message || 'Error al actualizar el perfil'));
          }
        },
        error: (error) => {
          console.error('Error al actualizar perfil en backend:', error);
          reject(new Error(this.procesarErrorHttp(error)));
        }
      });
    });
  }

  /**
   * Procesa errores HTTP y devuelve mensaje apropiado
   */
  private procesarErrorHttp(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    }

    if (error.status) {
      switch (error.status) {
        case 400:
          return 'Datos inválidos para actualizar el perfil';
        case 401:
          return 'No tienes permisos para actualizar el perfil';
        case 404:
          return 'Usuario no encontrado';
        case 409:
          return 'El correo ya está en uso por otro usuario';
        case 500:
          return 'Error interno del servidor. Intenta más tarde';
        case 0:
          return 'Sin conexión al servidor. Verifica tu conexión a internet';
        default:
          return `Error del servidor (${error.status})`;
      }
    }

    return 'Error al actualizar el perfil';
  }

  /**
   * Obtiene información para el sidebar
   */
  obtenerInfoSidebar(): { name: string; avatar?: string | null } {
    const usuario = this.getPerfilActual();
    if (!usuario) {
      return { name: 'Usuario' };
    }

    return {
      name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
      avatar: this.getFotoPerfilUrl(usuario)
    };
  }

  /**
   * Refresca el perfil desde el servidor
   */
  refrescarPerfil(): Observable<Usuario> {
    return this.obtenerPerfilDesdeBackend();
  }

  /**
   * Limpia el perfil (para logout)
   */
  limpiarPerfil(): void {
    this.perfilSubject.next(null);
  }

  /**
   * Inicializa el perfil cargando desde el backend
   */
  inicializarPerfil(): Observable<Usuario> {
    return this.obtenerPerfilDesdeBackend();
  }
}