import { Injectable } from "@angular/core";
import Swal from "sweetalert2";

@Injectable({
  providedIn: 'root'
})
export class AlertaService {
  
  private cssInjected = false;

  constructor() {
    this.injectCSS();
  }

  private injectCSS(): void {
    if (!this.cssInjected) {
      const style = document.createElement('style');
      style.id = 'notification-service-styles';
      style.innerHTML = `
        /* Toast de error */
        .toast-error-border {
          border-left: 5px solid #f44336 !important;
          border-radius: 8px !important;
        }
        .toast-error-timer {
          background-color: #f44336 !important;
        }

        /* Toast de éxito */
        .toast-success-border {
          border-left: 5px solid #28a745 !important;
          border-radius: 8px !important;
        }
        .toast-success-timer {
          background-color: #28a745 !important;
        }

        /* Toast de advertencia */
        .toast-warning-border {
          border-left: 5px solid #ffc107 !important;
          border-radius: 8px !important;
        }
        .toast-warning-timer {
          background-color: #ffc107 !important;
        }

        /* Toast de información */
        .toast-info-border {
          border-left: 5px solid #17a2b8 !important;
          border-radius: 8px !important;
        }
        .toast-info-timer {
          background-color: #17a2b8 !important;
        }
      `;
      
      // Verificar si ya existe para evitar duplicados
      const existingStyle = document.getElementById('notification-service-styles');
      if (!existingStyle) {
        document.head.appendChild(style);
        this.cssInjected = true;
      }
    }
  }
  
  alertaError(title: string): void {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        customClass: {
          popup: 'toast-error-border',
          timerProgressBar: 'toast-error-timer'
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    Toast.fire({
        icon: 'error',
        title: title
    });
  }
  
  alertaExito(title: string): void {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: 'toast-success-border',
          timerProgressBar: 'toast-success-timer'
        }
    });

    Toast.fire({
        icon: 'success',
        title: title
    });
  }
  
  alertaPreventiva(title: string): void {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'toast-warning-border',
          timerProgressBar: 'toast-warning-timer'
        }
    });

    Toast.fire({
        icon: 'warning',
        title: title
    });
  }

  // ⭐ MÉTODO ALERTAINFO CORREGIDO
  alertaInfo(mensaje: string): void {
    // Opción 1: Toast estilo consistente con los demás
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: 'toast-info-border',
          timerProgressBar: 'toast-info-timer'
        }
    });

    Toast.fire({
        icon: 'info',
        title: mensaje
    });

  }
}