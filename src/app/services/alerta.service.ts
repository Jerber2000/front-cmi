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
          popup: 'toast-warning-border', // Cambié esto
          timerProgressBar: 'toast-warning-timer' // Y esto
        }
    });

    Toast.fire({
        icon: 'warning',
        title: title
    });
  }
}