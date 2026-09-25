// src/app/components/barcode-scanner/barcode-scanner.component.ts
import {
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';

/**
 * Modal reutilizable para escanear códigos de barras/QR con la cámara
 * del dispositivo (pensado para uso desde el celular).
 *
 * Emite el texto decodificado por `codigoEscaneado` y se puede cerrar
 * manualmente con `cerrar`.
 */
@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.scss']
})
export class BarcodeScannerComponent implements AfterViewInit, OnDestroy {
  @Output() codigoEscaneado = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  private readonly elementId = 'barcode-scanner-view';
  private html5Qrcode: Html5Qrcode | null = null;
  private escaneando = false;

  error: string | null = null;
  iniciando = true;

  ngAfterViewInit(): void {
    // Se espera un tick para que el div del template ya esté en el DOM
    setTimeout(() => this.iniciarCamara(), 0);
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  private async iniciarCamara(): Promise<void> {
    this.iniciando = true;
    this.error = null;

    try {
      this.html5Qrcode = new Html5Qrcode(this.elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      const scanConfig = {
        fps: 10,
        qrbox: { width: 280, height: 160 }
      };
      const onDetectado = (decodedText: string) => this.onCodigoDetectado(decodedText);
      const onNoDetectado = () => {
        // Callback de "no se detectó nada en este frame": se ignora,
        // se dispara constantemente mientras la cámara busca un código.
      };

      try {
        // Prioriza la cámara trasera (celular)
        await this.html5Qrcode.start({ facingMode: 'environment' }, scanConfig, onDetectado, onNoDetectado);
      } catch {
        // Sin cámara trasera (ej. laptop con solo cámara frontal): usar la
        // primera cámara disponible como respaldo.
        const camaras = await Html5Qrcode.getCameras();
        if (!camaras || camaras.length === 0) {
          throw new Error('No camera found');
        }
        await this.html5Qrcode.start(camaras[0].id, scanConfig, onDetectado, onNoDetectado);
      }

      this.escaneando = true;
      this.iniciando = false;
    } catch (err: any) {
      this.iniciando = false;
      this.error = this.mapearError(err);
    }
  }

  private mapearError(err: any): string {
    const mensaje = (err?.message || err || '').toString().toLowerCase();
    if (mensaje.includes('permission') || mensaje.includes('notallowed')) {
      return 'Se requiere permiso de cámara para escanear. Habilítalo en tu navegador e intenta de nuevo.';
    }
    if (mensaje.includes('notfound') || mensaje.includes('no camera')) {
      return 'No se encontró ninguna cámara disponible en este dispositivo.';
    }
    return 'No se pudo iniciar la cámara. Verifica los permisos e intenta de nuevo.';
  }

  private onCodigoDetectado(codigo: string): void {
    if (!this.escaneando) {
      return;
    }
    // Evita disparar múltiples veces mientras se detiene la cámara
    this.escaneando = false;

    // Vibración corta de confirmación si el dispositivo lo soporta
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    this.codigoEscaneado.emit(codigo.trim());
    this.detenerCamara();
  }

  private async detenerCamara(): Promise<void> {
    if (this.html5Qrcode) {
      try {
        const estado = this.html5Qrcode.getState();
        if (estado === Html5QrcodeScannerState.SCANNING || estado === Html5QrcodeScannerState.PAUSED) {
          await this.html5Qrcode.stop();
        }
        this.html5Qrcode.clear();
      } catch {
        // La cámara ya podría estar detenida; se ignora el error de limpieza
      }
      this.html5Qrcode = null;
    }
  }

  onCerrar(): void {
    this.detenerCamara();
    this.cerrar.emit();
  }

  get scannerElementId(): string {
    return this.elementId;
  }
}
