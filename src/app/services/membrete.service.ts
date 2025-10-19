// services/membrete.service.ts - CON ENCABEZADO Y PIE DE PÁGINA
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class MembreteService {

  // 🆕 Configuración para encabezado y pie de página
  private readonly CONFIG = {
    encabezado: {
      ruta: 'assets/img/encabezado.png',
      altura: 20,  // Ajustar según tu imagen
      margenSuperior: 5
    },
    piePagina: {
      ruta: 'assets/img/pie-pagina.png',
      altura: 20,  // Ajustar según tu imagen
      margenInferior: 5
    },
    margenLateral: 10,
    espacioContenido: 15  // Espacio entre membrete y contenido
  };

  // Cache de las imágenes cargadas
  private encabezadoCache: string | null = null;
  private piePaginaCache: string | null = null;
  private cargaEnProgreso: Promise<{encabezado: string | null, piePagina: string | null}> | null = null;

  constructor() { }

  /**
   * Obtiene la configuración del membrete
   */
  getConfig() {
    return {
      encabezado: { ...this.CONFIG.encabezado },
      piePagina: { ...this.CONFIG.piePagina },
      margenLateral: this.CONFIG.margenLateral,
      espacioContenido: this.CONFIG.espacioContenido
    };
  }

  /**
   * 🆕 Obtiene la posición Y donde debe empezar el contenido después del encabezado
   */
  getYInicio(): number {
    return this.CONFIG.encabezado.margenSuperior + 
           this.CONFIG.encabezado.altura + 
           this.CONFIG.espacioContenido;
  }

  /**
   * 🆕 Obtiene la posición Y máxima donde debe terminar el contenido (antes del pie)
   */
  getYMaximo(doc: jsPDF): number {
    const alturaPagina = doc.internal.pageSize.getHeight();
    return alturaPagina - 
           this.CONFIG.piePagina.altura - 
           this.CONFIG.piePagina.margenInferior - 
           this.CONFIG.espacioContenido;
  }

  /**
   * 🆕 Carga ambas imágenes del membrete (con caché)
   */
  async cargarMembretes(): Promise<{encabezado: string | null, piePagina: string | null}> {
    // Si ya están en caché, devolverlas
    if (this.encabezadoCache && this.piePaginaCache) {
      return { 
        encabezado: this.encabezadoCache, 
        piePagina: this.piePaginaCache 
      };
    }

    // Si ya hay una carga en progreso, esperarla
    if (this.cargaEnProgreso) {
      return this.cargaEnProgreso;
    }

    // Iniciar nueva carga paralela
    this.cargaEnProgreso = Promise.all([
      this.cargarImagenComoBase64(this.CONFIG.encabezado.ruta)
        .catch(err => {
          console.warn('⚠️ No se pudo cargar el encabezado:', err);
          return null;
        }),
      this.cargarImagenComoBase64(this.CONFIG.piePagina.ruta)
        .catch(err => {
          console.warn('⚠️ No se pudo cargar el pie de página:', err);
          return null;
        })
    ]).then(([encabezado, piePagina]) => {
      this.encabezadoCache = encabezado;
      this.piePaginaCache = piePagina;
      this.cargaEnProgreso = null;
      return { encabezado, piePagina };
    });

    return this.cargaEnProgreso;
  }

  /**
   * 🆕 Inserta el encabezado en el documento
   */
  async insertarEncabezado(doc: jsPDF, encabezadoData?: string | null): Promise<void> {
    try {
      const imgData = encabezadoData || this.encabezadoCache;
      
      if (!imgData) {
        console.warn('⚠️ No hay imagen de encabezado disponible');
        return;
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const imgWidth = pageWidth - (this.CONFIG.margenLateral * 2);
      
      doc.addImage(
        imgData,
        'PNG',
        this.CONFIG.margenLateral,
        this.CONFIG.encabezado.margenSuperior,
        imgWidth,
        this.CONFIG.encabezado.altura,
        undefined,
        'FAST'
      );
    } catch (error) {
      console.error('❌ Error al insertar encabezado:', error);
    }
  }

  /**
   * 🆕 Inserta el pie de página en el documento
   */
  async insertarPiePagina(doc: jsPDF, piePaginaData?: string | null): Promise<void> {
    try {
      const imgData = piePaginaData || this.piePaginaCache;
      
      if (!imgData) {
        console.warn('⚠️ No hay imagen de pie de página disponible');
        return;
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - (this.CONFIG.margenLateral * 2);
      
      const yPosition = pageHeight - 
                       this.CONFIG.piePagina.altura - 
                       this.CONFIG.piePagina.margenInferior;
      
      doc.addImage(
        imgData,
        'PNG',
        this.CONFIG.margenLateral,
        yPosition,
        imgWidth,
        this.CONFIG.piePagina.altura,
        undefined,
        'FAST'
      );
    } catch (error) {
      console.error('❌ Error al insertar pie de página:', error);
    }
  }

  /**
   * 🆕 Inserta encabezado y pie de página completos
   */
  async insertarMembreteCompleto(
    doc: jsPDF, 
    membretes?: {encabezado: string | null, piePagina: string | null}
  ): Promise<void> {
    const datos = membretes || { 
      encabezado: this.encabezadoCache, 
      piePagina: this.piePaginaCache 
    };

    await this.insertarEncabezado(doc, datos.encabezado);
    await this.insertarPiePagina(doc, datos.piePagina);
  }

  /**
   * 🆕 Verifica si se necesita una nueva página considerando ambos membretes
   */
  async verificarNuevaPagina(
    yPosition: number,
    espacioNecesario: number,
    doc: jsPDF,
    membretes: {encabezado: string | null, piePagina: string | null} | null
  ): Promise<number> {
    const yMaximo = this.getYMaximo(doc);

    if (yPosition + espacioNecesario > yMaximo) {
      doc.addPage();
      if (membretes) {
        await this.insertarMembreteCompleto(doc, membretes);
      }
      return this.getYInicio();
    }

    return yPosition;
  }

  /**
   * Limpia el caché de los membretes
   */
  limpiarCache(): void {
    this.encabezadoCache = null;
    this.piePaginaCache = null;
    this.cargaEnProgreso = null;
  }

  /**
   * 🆕 Actualiza la configuración del encabezado
   */
  actualizarConfiguracionEncabezado(config: Partial<typeof this.CONFIG.encabezado>): void {
    Object.assign(this.CONFIG.encabezado, config);
    if (config.ruta) {
      this.encabezadoCache = null;
    }
  }

  /**
   * 🆕 Actualiza la configuración del pie de página
   */
  actualizarConfiguracionPiePagina(config: Partial<typeof this.CONFIG.piePagina>): void {
    Object.assign(this.CONFIG.piePagina, config);
    if (config.ruta) {
      this.piePaginaCache = null;
    }
  }

  /**
   * 🆕 Actualiza ambas rutas de imágenes
   */
  actualizarRutas(encabezado: string, piePagina: string): void {
    this.CONFIG.encabezado.ruta = encabezado;
    this.CONFIG.piePagina.ruta = piePagina;
    this.limpiarCache();
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  /**
   * Carga una imagen y la convierte a Base64
   */
  private cargarImagenComoBase64(ruta: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener contexto del canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error(`No se pudo cargar la imagen: ${ruta}`));
      };
      
      // Agregar timestamp para evitar caché del navegador
      img.src = `${ruta}?t=${Date.now()}`;
    });
  }

  // ==========================================
  // 🆕 MÉTODOS DE COMPATIBILIDAD (deprecated)
  // ==========================================

  /**
   * @deprecated Usar cargarMembretes() en su lugar
   */
  async cargarMembrete(): Promise<string | null> {
    console.warn('⚠️ cargarMembrete() está deprecated. Usar cargarMembretes() para obtener encabezado y pie.');
    const membretes = await this.cargarMembretes();
    return membretes.encabezado;
  }

  /**
   * @deprecated Usar insertarMembreteCompleto() en su lugar
   */
  async insertarMembrete(doc: jsPDF, membreteData?: string | null): Promise<void> {
    console.warn('⚠️ insertarMembrete() está deprecated. Usar insertarEncabezado() o insertarMembreteCompleto().');
    await this.insertarEncabezado(doc, membreteData);
  }
}