import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    // withPreloading: descarga en segundo plano (sin bloquear el render
    // inicial) el código de TODAS las pantallas lazy después del primer
    // login/carga, para que la navegación entre módulos sea instantánea
    // después. Antes no había estrategia de precarga: cada pantalla se
    // descargaba recién en su primera visita, lo cual se sentía mucho más
    // lento para roles con acceso a muchos módulos (ej. Administrador).
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};