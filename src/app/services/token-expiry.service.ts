import { Injectable, OnDestroy } from '@angular/core';
import Swal from 'sweetalert2';
import { AuthService } from './auth.service';

const WARN_BEFORE_MS = 2 * 60 * 1000; // 2 minutos antes

@Injectable({ providedIn: 'root' })
export class TokenExpiryService implements OnDestroy {
  private warnTimer: ReturnType<typeof setTimeout> | null = null;
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private warnShown = false;
  private visibilityHandler = () => {
    if (!document.hidden) {
      // Pestaña volvió a ser visible — revaluar timers por si fueron limitados en background
      if (this.authService.getToken()) {
        this.schedule();
      }
    }
  };

  constructor(private authService: AuthService) {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /** Llama esto después de cada login o renovación de token */
  schedule(): void {
    if (Swal.isVisible()) return; // No interrumpir si la alerta ya está mostrando

    this.clear();
    this.warnShown = false;

    const expiry = this.authService.getTokenExpiry();
    console.log('[TokenExpiry] schedule() — expiry:', expiry ? new Date(expiry).toISOString() : 'NULL');
    if (!expiry) return;

    const now = Date.now();
    const msUntilExpiry = expiry - now;

    if (msUntilExpiry <= 0) {
      // Token ya estaba vencido al cargar la app (sesión vieja en localStorage).
      // Se descarta en silencio: no tiene sentido decirle "tu sesión expiró"
      // a alguien que todavía no ha iniciado sesión en esta visita.
      console.log('[TokenExpiry] Token ya expirado al iniciar, descartando sesión en silencio.');
      this.authService.descartarSesionVencida();
      return;
    }

    const msUntilWarn = msUntilExpiry - WARN_BEFORE_MS;
    console.log(`[TokenExpiry] msUntilWarn=${Math.round(msUntilWarn/1000)}s, msUntilExpiry=${Math.round(msUntilExpiry/1000)}s`);

    if (msUntilWarn > 0) {
      // Programar alerta de advertencia
      this.warnTimer = setTimeout(() => {
        if (!Swal.isVisible() && !this.warnShown) this.showWarning();
      }, msUntilWarn);
    } else {
      // Menos de 2 minutos restantes — mostrar alerta ya
      if (!this.warnShown) this.showWarning();
    }

    // Cerrar sesión al expirar si el usuario no respondió
    this.logoutTimer = setTimeout(() => {
      console.log('[TokenExpiry] logoutTimer disparado — cerrando sesión.');
      Swal.close();
      this.authService.logout();
    }, msUntilExpiry);
  }

  private showWarning(): void {
    this.warnShown = true;
    const msLeft = (this.authService.getTokenExpiry() ?? 0) - Date.now();
    let countdown = Math.max(0, Math.round(Math.min(WARN_BEFORE_MS, msLeft) / 1000));
    console.log('[TokenExpiry] showWarning() — countdown:', countdown, 's');

    Swal.fire({
      title: '⏳ Tu sesión está por expirar',
      html: `
        <p>¿Deseas continuar con tu sesión?</p>
        <p style="font-size:28px; font-weight:700; color:#e65100; margin:10px 0;">
          <span id="swal-countdown">${countdown}</span>s
        </p>
      `,
      icon: 'warning',
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cerrar sesión',
      confirmButtonColor: '#2e7d6b',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        const el = document.getElementById('swal-countdown');
        const interval = setInterval(() => {
          countdown--;
          if (el) el.textContent = String(countdown);
          if (countdown <= 0) clearInterval(interval);
        }, 1000);

        // Guardar referencia al interval para limpiarlo si el usuario responde
        (Swal.getPopup() as any)['_countdownInterval'] = interval;
      },
      willClose: () => {
        const popup = Swal.getPopup() as any;
        if (popup?.['_countdownInterval']) {
          clearInterval(popup['_countdownInterval']);
        }
      }
    }).then(result => {
      this.clear(); // Cancelar el logout timer programático

      if (result.isConfirmed) {
        // Renovar token
        this.authService.refreshToken().subscribe({
          next: (resp: any) => {
            if (resp?.success && resp?.data?.token) {
              localStorage.setItem('token', resp.data.token);
              this.schedule(); // Reprogramar con el nuevo token
            } else {
              this.authService.logout();
            }
          },
          error: () => this.authService.logout()
        });
      } else {
        // Cerrar sesión manualmente
        this.authService.logout();
      }
    });
  }

  private clear(): void {
    if (this.warnTimer) { clearTimeout(this.warnTimer); this.warnTimer = null; }
    if (this.logoutTimer) { clearTimeout(this.logoutTimer); this.logoutTimer = null; }
  }

  ngOnDestroy(): void {
    this.clear();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
