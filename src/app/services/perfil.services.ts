import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Usuario, UsuarioService } from './usuario.service';
import { ArchivoService } from './archivo.service';

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
    private archivoService: ArchivoService
  ) {
    this.loadPerfilFromStorage();
  }

  /**
   * Carga el perfil desde localStorage
   */
  private loadPerfilFromStorage(): void {
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        this.perfilSubject.next(usuario);
      }
    } catch (error) {
      console.error('Error al cargar perfil desde localStorage:', error);
      this.perfilSubject.next(null);
    }
  }

  /**
   * Obtiene el perfil actual del usuario logueado
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
      // Validar que tenga mayúsculas, minúsculas y números
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errores.push('La contraseña debe incluir mayúsculas, minúsculas y números');
      }
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
   * Sube archivos de perfil (foto)
   */
  async subirArchivosPerfil(usuarioId: number, archivos: { foto?: File }): Promise<{ rutaFoto?: string }> {
    try {
      const resultado = await this.archivoService.subirArchivos('usuarios', usuarioId, archivos);
      return {
        rutaFoto: resultado.rutaFoto
      };
    } catch (error) {
      console.error('Error al subir archivos de perfil:', error);
      throw new Error('Error al subir la foto de perfil');
    }
  }

  /**
   * Actualiza el perfil del usuario
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
   * Procesa la actualización del perfil (método privado)
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

    // Subir nueva foto si se proporcionó
    if (nuevaFoto) {
      const resultadoArchivos = await this.subirArchivosPerfil(usuarioId, { foto: nuevaFoto });
      rutaFoto = resultadoArchivos.rutaFoto || rutaFoto;
    }

    // Preparar datos para actualización
    const userData: Omit<Usuario, 'idusuario'> = {
      ...usuarioActual,
      correo: formData.correo,
      telinstitucional: formData.telinstitucional,
      extension: formData.extension || '',
      telefonopersonal: formData.telPersonal,
      rutafotoperfil: rutaFoto,
      usuariomodificacion: usuarioId.toString()
    };

    // Solo actualizar contraseña si se proporcionó una nueva
    if (formData.password && formData.password.trim() !== '') {
      userData.clave = formData.password;
    }

    return new Promise((resolve, reject) => {
      this.usuarioService.actualizarUsuario(usuarioId, userData).subscribe({
        next: (response) => {
          if (response && response.success === false) {
            reject(new Error(this.extraerMensajeError(response)));
            return;
          }

          // Actualizar perfil en memoria y localStorage
          const perfilActualizado: Usuario = {
            ...usuarioActual,
            ...userData,
            idusuario: usuarioId
          };

          this.actualizarPerfilEnStorage(perfilActualizado);
          resolve(response);
        },
        error: (error) => {
          reject(new Error(this.procesarErrorHttp(error)));
        }
      });
    });
  }

  /**
   * Actualiza el perfil en localStorage y en el BehaviorSubject
   */
  private actualizarPerfilEnStorage(perfil: Usuario): void {
    try {
      localStorage.setItem('usuario', JSON.stringify(perfil));
      this.perfilSubject.next(perfil);
    } catch (error) {
      console.error('Error al actualizar perfil en storage:', error);
    }
  }

  /**
   * Extrae mensaje de error de la respuesta del backend
   */
  private extraerMensajeError(response: any): string {
    if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
      return response.errors[0].msg || response.errors[0].message || response.errors[0];
    }
    if (response.message) {
      return response.message;
    }
    return 'Error de validación';
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
    const usuarioActual = this.getPerfilActual();
    if (!usuarioActual) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.usuarioService.obtenerUsuarios().pipe(
      map(usuarios => {
        const usuarioActualizado = usuarios.find(u => u.idusuario === usuarioActual.idusuario);
        if (usuarioActualizado) {
          this.actualizarPerfilEnStorage(usuarioActualizado);
          return usuarioActualizado;
        } else {
          throw new Error('Usuario no encontrado');
        }
      }),
      catchError(error => {
        console.error('Error al refrescar perfil:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Limpia el perfil (para logout)
   */
  limpiarPerfil(): void {
    this.perfilSubject.next(null);
    localStorage.removeItem('usuario');
  }
}