import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Servicio de logging seguro para desarrollo y producción
 * En desarrollo: Loggea toda la información
 * En producción: Solo loggea mensajes de error sin detalles sensibles
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDev = !environment.production;

  constructor() {}

  info(message: string, data?: any): void {
    if (this.isDev && data) {
      console.info(`ℹ️ ${message}`, data);
    } else if (this.isDev) {
      console.info(`ℹ️ ${message}`);
    }
  }

  debug(message: string, data?: any): void {
    if (this.isDev && data) {
      console.debug(`🔍 ${message}`, data);
    } else if (this.isDev) {
      console.debug(`🔍 ${message}`);
    }
  }

  warn(message: string, data?: any): void {
    if (this.isDev && data) {
      console.warn(`⚠️ ${message}`, data);
    } else if (this.isDev) {
      console.warn(`⚠️ ${message}`);
    }
  }

  error(message: string, error?: any): void {
    if (this.isDev && error) {
      console.error(`❌ ${message}`, error);
    } else if (this.isDev) {
      console.error(`❌ ${message}`);
    }
  }

  trace(message: string): void {
    if (this.isDev) {
      console.trace(`📍 ${message}`);
    }
  }
}
