// src/app/services/pdf-excel-reporteria.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MembreteService } from './membrete.service';

interface Membretes {
  encabezado: string | null;
  piePagina: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExcelReporteriaService {

  constructor(private membreteService: MembreteService) { }

  // ==========================================
  // GENERAR PDF
  // ==========================================
  async generarPDF(
    tipoReporte: string,
    datos: any[]
  ): Promise<void> {
    try {
      // Determinar orientación según tipo de reporte
      const esHorizontal = ['pacientes', 'consultas', 'transporte', 'salidas'].includes(tipoReporte);
      
      const doc = new jsPDF({
        orientation: esHorizontal ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const membretes = await this.membreteService.cargarMembretes();
      await this.membreteService.insertarMembreteCompleto(doc, membretes);
      let yPos = this.membreteService.getYInicio();

      // Título
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const titulo = this.obtenerTituloReporte(tipoReporte);
      doc.text(titulo, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, 15, yPos);
      yPos += 8;

      // Generar tabla según tipo
      switch (tipoReporte) {
        case 'pacientes':
          this.generarTablaPacientesPDF(doc, datos, membretes, yPos);
          break;
        case 'consultas':
          this.generarTablaConsultasPDF(doc, datos, membretes, yPos);
          break;
        case 'inventario':
          this.generarTablaInventarioPDF(doc, datos, membretes, yPos);
          break;
        case 'agenda':
          this.generarTablaAgendaPDF(doc, datos, membretes, yPos);
          break;
        case 'referencias':
          this.generarTablaReferenciasPDF(doc, datos, membretes, yPos);
          break;
        case 'transporte':
        this.generarTablaTransportePDF(doc, datos, membretes, yPos);
        break;
        case 'salidas':
          this.generarTablaSalidasPDF(doc, datos, membretes, yPos);
          break;
    }
      

      const nombreArchivo = `reporte_${tipoReporte}_${Date.now()}.pdf`;
      doc.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }

  // ==========================================
  // GENERAR PDF DE EXPEDIENTE MÉDICO COMPLETO
  // ==========================================
  async generarPDFExpediente(expediente: any): Promise<void> {
    try {
      const doc = new jsPDF();

      // Cargar membretes
      const membretes = await this.membreteService.cargarMembretes();
      await this.membreteService.insertarMembreteCompleto(doc, membretes);
      
      let yPosition = this.membreteService.getYInicio();

      // Configurar fuentes
      doc.setFont('helvetica');
      
      // ENCABEZADO DEL CONTENIDO
      yPosition = this.agregarEncabezadoExpediente(doc, yPosition);
      
      // INFORMACIÓN BÁSICA DEL EXPEDIENTE (ya incluye datos del paciente)
      yPosition = this.agregarInformacionBasicaExpediente(doc, expediente, yPosition);
      
      // ANTECEDENTES MÉDICOS
      if (this.tieneAntecedentes(expediente)) {
        yPosition = await this.agregarAntecedentesMedicosExpediente(doc, expediente, yPosition, membretes);
      }
      
      // ANTECEDENTES FISIOLÓGICOS
      if (this.tieneAntecedentesFisiologicos(expediente)) {
        yPosition = await this.agregarAntecedentesFisiologicosExpediente(doc, expediente, yPosition, membretes);
      }
      
      // ANTECEDENTES GINECO-OBSTÉTRICOS
      if (this.tieneAntecedentesGineObstetricos(expediente)) {
        yPosition = await this.agregarAntecedentesGineObstetricosExpediente(doc, expediente, yPosition, membretes);
      }
      
      // EXAMEN FÍSICO
      if (this.tieneExamenFisico(expediente)) {
        yPosition = await this.agregarExamenFisicoExpediente(doc, expediente, yPosition, membretes);
      }
      
      // DESCARGAR PDF
      const nombreArchivo = `expediente_${expediente.numeroexpediente}_${this.formatearFecha(new Date()).replace(/\//g, '-')}.pdf`;
      doc.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar PDF de expediente:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA EXPEDIENTE MÉDICO
  // ==========================================

  private agregarEncabezadoExpediente(doc: jsPDF, yPosition: number): number {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('EXPEDIENTE MÉDICO', 105, yPosition, { align: 'center' });
    
    // Línea decorativa
    doc.setDrawColor(44, 102, 98);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition + 5, 190, yPosition + 5);
    
    return yPosition + 20;
  }

  private agregarInformacionBasicaExpediente(doc: jsPDF, expediente: any, yPosition: number): number {
    // Título de sección
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('INFORMACIÓN DEL EXPEDIENTE', 20, yPosition);
    yPosition += 10;
    
  const paciente = expediente.paciente || (expediente.paciente && expediente.paciente[0]) || null;
  
  // Datos en tabla
  const datosBasicos = [
    ['Número de Expediente:', expediente.numeroexpediente || 'N/A']
  ];

    // ✅ AGREGAR DATOS DEL PACIENTE SI EXISTEN
  if (paciente) {
    datosBasicos.push(['Nombre del Paciente:', `${paciente.nombres || ''} ${paciente.apellidos || ''}`]);
    datosBasicos.push(['CUI:', paciente.cui || 'N/A']);
    datosBasicos.push(['Fecha de Nacimiento:', this.formatearFecha(paciente.fechanacimiento)]);
    
    // Calcular edad
    if (paciente.fechanacimiento) {
      const edad = this.calcularEdad(paciente.fechanacimiento);
      datosBasicos.push(['Edad:', `${edad} años`]);
    }
  }

  autoTable(doc, {
    startY: yPosition,
    body: datosBasicos,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },  // ✅ Aumentado de 50 a 60
      1: { cellWidth: 110 }  // ✅ Aumentado de 120 a 110
    },
    margin: { left: 20 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Historia de enfermedad
  if (expediente.historiaenfermedad) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Historia de Enfermedad:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lineas = doc.splitTextToSize(expediente.historiaenfermedad, 170);
    doc.text(lineas, 20, yPosition);
    yPosition += lineas.length * 5 + 10;
  }

  return yPosition;
}

  private async agregarInformacionPacienteExpediente(
    doc: jsPDF, 
    paciente: any, 
    yPosition: number,
    membretes: Membretes
  ): Promise<number> {
    yPosition = await this.membreteService.verificarNuevaPagina(yPosition, 60, doc, membretes);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('INFORMACIÓN DEL PACIENTE', 20, yPosition);
    yPosition += 10;

    const datosPaciente = [
      ['Nombre Completo:', `${paciente.nombres || ''} ${paciente.apellidos || ''}`],
      ['CUI:', paciente.cui || 'N/A'],
      ['Fecha de Nacimiento:', this.formatearFecha(paciente.fechanacimiento)],
      ['Teléfono:', paciente.telefono || 'N/A'],
      ['Dirección:', paciente.direccion || 'N/A']
    ];

    autoTable(doc, {
      startY: yPosition,
      body: datosPaciente,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20 }
    });

    return (doc as any).lastAutoTable.finalY + 15;
  }

  private async agregarAntecedentesMedicosExpediente(
    doc: jsPDF, 
    expediente: any, 
    yPosition: number,
    membretes: Membretes
  ): Promise<number> {
    yPosition = await this.membreteService.verificarNuevaPagina(yPosition, 50, doc, membretes);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('ANTECEDENTES MÉDICOS', 20, yPosition);
    yPosition += 10;

    const antecedentes = [];
    
    if (expediente.antmedico) {
      antecedentes.push(['Antecedentes Médicos:', expediente.antmedico]);
    }
    if (expediente.antmedicamento) {
      antecedentes.push(['Medicamentos:', expediente.antmedicamento]);
    }
    if (expediente.anttraumaticos) {
      antecedentes.push(['Antecedentes Traumáticos:', expediente.anttraumaticos]);
    }
    if (expediente.antfamiliar) {
      antecedentes.push(['Antecedentes Familiares:', expediente.antfamiliar]);
    }
    if (expediente.antalergico) {
      antecedentes.push(['Alergias:', expediente.antalergico]);
    }
    if (expediente.antsustancias) {
      antecedentes.push(['Sustancias:', expediente.antsustancias]);
    }
    if (expediente.antintolerantelactosa !== undefined) {
      const intolerancia = expediente.antintolerantelactosa === 1 ? 'Sí' : 'No';
      antecedentes.push(['Intolerancia a Lactosa:', intolerancia]);
    }

    if (antecedentes.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        body: antecedentes,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 120 }
        },
        margin: { left: 20 }
      });

      return (doc as any).lastAutoTable.finalY + 15;
    }

    return yPosition;
  }

  private async agregarAntecedentesFisiologicosExpediente(
    doc: jsPDF, 
    expediente: any, 
    yPosition: number,
    membretes: Membretes
  ): Promise<number> {
    yPosition = await this.membreteService.verificarNuevaPagina(yPosition, 50, doc, membretes);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('ANTECEDENTES FISIOLÓGICOS', 20, yPosition);
    yPosition += 10;

    const antecedentesFisio = [];
    
    if (expediente.antfisoinmunizacion) {
      antecedentesFisio.push(['Inmunizaciones:', expediente.antfisoinmunizacion]);
    }
    if (expediente.antfisocrecimiento) {
      antecedentesFisio.push(['Crecimiento y Desarrollo:', expediente.antfisocrecimiento]);
    }
    if (expediente.antfisohabitos) {
      antecedentesFisio.push(['Hábitos de Vida:', expediente.antfisohabitos]);
    }
    if (expediente.antfisoalimentos) {
      antecedentesFisio.push(['Hábitos Alimenticios:', expediente.antfisoalimentos]);
    }

    if (antecedentesFisio.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        body: antecedentesFisio,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 120 }
        },
        margin: { left: 20 }
      });

      return (doc as any).lastAutoTable.finalY + 15;
    }

    return yPosition;
  }

  private async agregarAntecedentesGineObstetricosExpediente(
    doc: jsPDF, 
    expediente: any, 
    yPosition: number,
    membretes: Membretes
  ): Promise<number> {
    yPosition = await this.membreteService.verificarNuevaPagina(yPosition, 50, doc, membretes);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('ANTECEDENTES GINECO-OBSTÉTRICOS', 20, yPosition);
    yPosition += 10;

    const gineObs = [];
    
    if (expediente.gineobsprenatales) {
      gineObs.push(['Antecedentes Prenatales:', expediente.gineobsprenatales]);
    }
    if (expediente.gineobsnatales) {
      gineObs.push(['Antecedentes Natales:', expediente.gineobsnatales]);
    }
    if (expediente.gineobspostnatales) {
      gineObs.push(['Antecedentes Postnatales:', expediente.gineobspostnatales]);
    }
    if (expediente.gineobsgestas !== undefined && expediente.gineobsgestas !== null) {
      gineObs.push(['Gestas:', expediente.gineobsgestas.toString()]);
    }
    if (expediente.gineobspartos !== undefined && expediente.gineobspartos !== null) {
      gineObs.push(['Partos:', expediente.gineobspartos.toString()]);
    }
    if (expediente.gineobsabortos !== undefined && expediente.gineobsabortos !== null) {
      gineObs.push(['Abortos:', expediente.gineobsabortos.toString()]);
    }
    if (expediente.gineobscesareas !== undefined && expediente.gineobscesareas !== null) {
      gineObs.push(['Cesáreas:', expediente.gineobscesareas.toString()]);
    }
    if (expediente.gineobsfur) {
      gineObs.push(['Fecha de Última Regla:', this.formatearFecha(expediente.gineobsfur)]);
    }
    if (expediente.gineobsmenarquia) {
      gineObs.push(['Menarquia:', expediente.gineobsmenarquia]);
    }
    if (expediente.gineobsciclos) {
      gineObs.push(['Ciclos Menstruales:', expediente.gineobsciclos]);
    }

    if (gineObs.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        body: gineObs,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 120 }
        },
        margin: { left: 20 }
      });

      return (doc as any).lastAutoTable.finalY + 15;
    }

    return yPosition;
  }

  private async agregarExamenFisicoExpediente(
    doc: jsPDF, 
    expediente: any, 
    yPosition: number,
    membretes: Membretes
  ): Promise<number> {
    yPosition = await this.membreteService.verificarNuevaPagina(yPosition, 50, doc, membretes);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 102, 98);
    doc.text('EXAMEN FÍSICO Y SIGNOS VITALES', 20, yPosition);
    yPosition += 10;

    const signosVitales = [];
    
    if (expediente.examenfistc) {
      signosVitales.push(['Temperatura:', `${expediente.examenfistc}°C`]);
    }
    if (expediente.examenfispa) {
      signosVitales.push(['Presión Arterial:', `${expediente.examenfispa} mmHg`]);
    }
    if (expediente.examenfisfc) {
      signosVitales.push(['Frecuencia Cardíaca:', `${expediente.examenfisfc} lpm`]);
    }
    if (expediente.examenfisfr) {
      signosVitales.push(['Frecuencia Respiratoria:', `${expediente.examenfisfr} rpm`]);
    }
    if (expediente.examenfissao2) {
      signosVitales.push(['Saturación de Oxígeno:', `${expediente.examenfissao2}%`]);
    }
    if (expediente.examenfispeso) {
      signosVitales.push(['Peso:', `${expediente.examenfispeso} kg`]);
    }
    if (expediente.examenfistalla) {
      signosVitales.push(['Talla:', `${expediente.examenfistalla} m`]);
    }
    if (expediente.examenfisimc) {
      const categoria = this.obtenerCategoriaIMC(expediente.examenfisimc);
      signosVitales.push(['IMC:', `${expediente.examenfisimc} kg/m² (${categoria})`]);
    }

    if (signosVitales.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        body: signosVitales,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 120 }
        },
        margin: { left: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Examen físico general
    if (expediente.examenfisgmt) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Examen Físico General:', 20, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lineas = doc.splitTextToSize(expediente.examenfisgmt, 170);
      doc.text(lineas, 20, yPosition);
      yPosition += lineas.length * 5 + 10;
    }

    return yPosition;
  }

  // Métodos auxiliares para expediente
  private tieneAntecedentes(expediente: any): boolean {
    return !!(
      expediente.antmedico || 
      expediente.antmedicamento || 
      expediente.anttraumaticos || 
      expediente.antfamiliar || 
      expediente.antalergico || 
      expediente.antsustancias ||
      expediente.antintolerantelactosa !== undefined
    );
  }

  private tieneAntecedentesFisiologicos(expediente: any): boolean {
    return !!(
      expediente.antfisoinmunizacion ||
      expediente.antfisocrecimiento ||
      expediente.antfisohabitos ||
      expediente.antfisoalimentos
    );
  }

  private tieneAntecedentesGineObstetricos(expediente: any): boolean {
    return !!(
      expediente.gineobsprenatales ||
      expediente.gineobsnatales ||
      expediente.gineobspostnatales ||
      expediente.gineobsgestas !== undefined ||
      expediente.gineobspartos !== undefined ||
      expediente.gineobsabortos !== undefined ||
      expediente.gineobscesareas !== undefined ||
      expediente.gineobsfur ||
      expediente.gineobsmenarquia ||
      expediente.gineobsciclos
    );
  }

  private tieneExamenFisico(expediente: any): boolean {
    return !!(
      expediente.examenfistc ||
      expediente.examenfispa ||
      expediente.examenfisfc ||
      expediente.examenfisfr ||
      expediente.examenfissao2 ||
      expediente.examenfispeso ||
      expediente.examenfistalla ||
      expediente.examenfisimc ||
      expediente.examenfisgmt
    );
  }

  private obtenerCategoriaIMC(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc >= 18.5 && imc < 25) return 'Peso normal';
    if (imc >= 25 && imc < 30) return 'Sobrepeso';
    if (imc >= 30) return 'Obesidad';
    return '';
  }

  // ==========================================
  // GENERAR EXCEL
  // ==========================================
  generarExcel(
    tipoReporte: string,
    datos: any[]
  ): void {
    try {
      const workbook = XLSX.utils.book_new();

      let worksheet: XLSX.WorkSheet;
      switch (tipoReporte) {
        case 'pacientes':
          worksheet = this.generarHojaPacientes(datos);
          break;
        case 'consultas':
          worksheet = this.generarHojaConsultas(datos);
          break;
        case 'inventario':
          worksheet = this.generarHojaInventario(datos);
          break;
        case 'agenda':
          worksheet = this.generarHojaAgenda(datos);
          break;
        case 'referencias':
          worksheet = this.generarHojaReferencias(datos);
          break;
        case 'transporte':
          worksheet = this.generarHojaTransporte(datos);
          break;
        case 'salidas':  // ✅ ANTES DEL DEFAULT
          worksheet = this.generarHojaSalidas(datos);
          break;
        default:  // ✅ DEFAULT AL FINAL
          throw new Error('Tipo de reporte no válido');
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

      const nombreArchivo = `reporte_${tipoReporte}_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);

    } catch (error) {
      console.error('Error al generar Excel:', error);
      throw error;
    }
  }
  // ==========================================
  // PDF - PACIENTES (HORIZONTAL)
  // ==========================================
  private generarTablaPacientesPDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: 'Nombre', dataKey: 'nombre' },
      { header: 'CUI', dataKey: 'cui' },
      { header: 'G', dataKey: 'genero' },
      { header: 'Edad', dataKey: 'edad' },
      { header: 'F.Nac', dataKey: 'fechaNac' },
      { header: 'Tel', dataKey: 'telefono' },
      { header: 'Municipio', dataKey: 'municipio' },
      { header: 'Aldea', dataKey: 'aldea' },
      { header: 'Dirección', dataKey: 'direccion' },
      { header: 'Exp', dataKey: 'expediente' },
      { header: 'Cont.Emerg', dataKey: 'contactoEmerg' },
      { header: 'Tel.Emerg', dataKey: 'telEmerg' },
      { header: 'Encargado', dataKey: 'encargado' },
      { header: 'DPI', dataKey: 'dpiEnc' },
      { header: 'Tel', dataKey: 'telEnc' }
    ];

    const filas = datos.map(item => ({
      nombre: `${item.nombres} ${item.apellidos}`,
      cui: item.cui || 'N/A',
      genero: item.genero === 'M' ? 'M' : 'F',
      edad: this.calcularEdad(item.fechanacimiento),
      fechaNac: this.formatearFecha(item.fechanacimiento),
      telefono: item.telefonopersonal || 'N/A',
      municipio: item.municipio || 'N/A',
      aldea: item.aldea || 'N/A',
      direccion: item.direccion || 'N/A',
      expediente: item.expedientes && item.expedientes.length > 0 
        ? item.expedientes[0].numeroexpediente : 'N/A',
      contactoEmerg: item.nombrecontactoemergencia || 'N/A',
      telEmerg: item.telefonoemergencia || 'N/A',
      encargado: item.nombreencargado || 'N/A',
      dpiEnc: item.dpiencargado || 'N/A',
      telEnc: item.telefonoencargado || 'N/A'
    }));

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 5,
        cellPadding: 1.5,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 8
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 6,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

  // ==========================================
  // PDF - CONSULTAS (HORIZONTAL)
  // ==========================================
  private generarTablaConsultasPDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Paciente', dataKey: 'paciente' },
      { header: 'F.Nac', dataKey: 'fechaNacPac' },
      { header: 'Médico', dataKey: 'medico' },
      { header: 'Clínica', dataKey: 'clinica' },
      { header: 'Recordatorio', dataKey: 'recordatorio' },
      { header: 'Nota', dataKey: 'nota' },
      { header: 'Motivo', dataKey: 'motivo' },
      { header: 'Evolución', dataKey: 'evolucion' },
      { header: 'Diagnóstico', dataKey: 'diagnostico' }
    ];

    const filas = datos.map(item => ({
      fecha: this.formatearFecha(item.fecha),
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      fechaNacPac: this.formatearFecha(item.paciente?.fechanacimiento),
      medico: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      clinica: item.usuario?.clinica?.nombreclinica || 'N/A',
      recordatorio: item.recordatorio || 'N/A',
      nota: item.notaconsulta || 'N/A',
      motivo: item.motivoconsulta || 'N/A',
      evolucion: item.evolucion || 'N/A',
      diagnostico: item.diagnosticotratamiento || 'N/A'
    }));

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 5,
        cellPadding: 1.5,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 6,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        fecha: { cellWidth: 18 },
        paciente: { cellWidth: 22 },
        fechaNacPac: { cellWidth: 18 },
        medico: { cellWidth: 22 },
        clinica: { cellWidth: 22 },
        recordatorio: { cellWidth: 25 },
        nota: { cellWidth: 25 },
        motivo: { cellWidth: 28 },
        evolucion: { cellWidth: 28 },
        diagnostico: { cellWidth: 32 }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

  // ==========================================
  // PDF - INVENTARIO (VERTICAL)
  // ==========================================
  private generarTablaInventarioPDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: 'Medicamento', dataKey: 'medicamento' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Unid', dataKey: 'unidades' },
      { header: 'Precio', dataKey: 'precio' },
      { header: 'F.Ingreso', dataKey: 'fechaIngreso' },
      { header: 'F.Venc', dataKey: 'fechaVenc' },
      { header: 'Estado', dataKey: 'estado' }
    ];

    const filas = datos.map(item => {
      const precioNumerico = parseFloat(item.precio) || 0;
      
      return {
        medicamento: item.nombre || '',
        descripcion: item.descripcion || '',
        unidades: item.unidades || 0,
        precio: `Q${precioNumerico.toFixed(2)}`,
        fechaIngreso: this.formatearFecha(item.fechaingreso),
        fechaVenc: this.formatearFecha(item.fechaegreso),
        estado: item.estado === 1 ? 'Activo' : 'Inactivo'
      };
    });

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

  // ==========================================
  // PDF - AGENDA (VERTICAL)
  // ==========================================
  private generarTablaAgendaPDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Hora', dataKey: 'hora' },
      { header: 'Paciente', dataKey: 'paciente' },
      { header: 'Médico', dataKey: 'medico' },
      { header: 'Trans', dataKey: 'transporte' },
      { header: 'Comentario', dataKey: 'comentario' }
    ];

    const filas = datos.map(item => ({
      fecha: this.formatearFecha(item.fechaatencion),
      hora: item.horaatencion || '',
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      medico: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      transporte: item.transporte === 1 ? 'Sí' : 'No',
      comentario: item.comentario || 'N/A'
    }));

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

  // ==========================================
  // PDF - TRANSPORTE (HORIZONTAL)
  // ==========================================
  private generarTablaTransportePDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: '#', dataKey: 'numero' },
      { header: 'Paciente', dataKey: 'paciente' },
      { header: 'CUI', dataKey: 'cui' },
      { header: 'Encargado', dataKey: 'encargado' },
      { header: 'Contacto', dataKey: 'contacto' },
      { header: 'Profesional', dataKey: 'profesional' },
      { header: 'H.Trans', dataKey: 'horaTransporte' },
      { header: 'H.Cita', dataKey: 'horaCita' },
      { header: 'Dirección', dataKey: 'direccion' }
    ];

    const filas = datos.map((item, index) => ({
      numero: (index + 1).toString(),
      paciente: `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`,
      cui: item.paciente?.cui || 'N/A',
      encargado: item.paciente?.nombreencargado || 'No especificado',
      contacto: item.paciente?.telefonoencargado || 'N/A',
      profesional: `Dr. ${item.usuario?.nombres || ''} ${item.usuario?.apellidos || ''}`,
      horaTransporte: this.formatearHora(item.horariotransporte),
      horaCita: this.formatearHora(item.horaatencion),
      direccion: item.direccion || 'No especificada'
    }));

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 6,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        numero: { cellWidth: 10, halign: 'center' },
        paciente: { cellWidth: 30 },
        cui: { cellWidth: 25 },
        encargado: { cellWidth: 28 },
        contacto: { cellWidth: 22 },
        profesional: { cellWidth: 30 },
        horaTransporte: { cellWidth: 18, halign: 'center' },
        horaCita: { cellWidth: 18, halign: 'center' },
        direccion: { cellWidth: 40 }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

  // ==========================================
  // PDF - REFERENCIAS (HORIZONTAL)
  // ==========================================
  private generarTablaReferenciasPDF(
    doc: jsPDF,
    datos: any[],
    membretes: any,
    yInicial: number
  ): void {
    
    const columnas = [
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Paciente', dataKey: 'paciente' },
      { header: 'Exp', dataKey: 'expediente' },
      { header: 'Enviado Por', dataKey: 'de' },
      { header: 'Confirmado Por', dataKey: 'para' },
      { header: 'Clínica', dataKey: 'clinica' },
      { header: 'Estado', dataKey: 'estado' }
    ];

    const filas = datos.map(item => ({
      fecha: this.formatearFecha(item.fechacreacion),
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      expediente: item.expediente?.numeroexpediente || 'N/A',
      de: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      para: item.usuarioconfirma4 || 'Pendiente',
      clinica: item.clinica?.nombreclinica || 'N/A',
      estado: item.confirmacion4 === 1 ? 'Completado' : 'Pendiente'
    }));

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yInicial,
      styles: { 
        fontSize: 6,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: { 
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.membreteService.insertarMembreteCompleto(doc, membretes);
        }
      }
    });
  }

    // ==========================================
  // PDF - SALIDAS
  // ==========================================
  private generarTablaSalidasPDF(
    doc: jsPDF,
    datos: any[],
    membretes: Membretes,
    yPos: number
  ): void {
    const columnas = [
      { title: 'Fecha', dataKey: 'fecha' },
      { title: 'Medicamento', dataKey: 'medicamento' },
      { title: 'Cantidad', dataKey: 'cantidad' },
      { title: 'Motivo', dataKey: 'motivo' },
      { title: 'Destino', dataKey: 'destino' },
      { title: 'Usuario', dataKey: 'usuario' },
      { title: 'Estado', dataKey: 'estado' }
    ];

    const filasDatos = datos.map(salida => ({
      fecha: this.formatearFecha(salida.fechacreacion),
      medicamento: salida.medicamento?.nombremedicamento || 'N/A',
      cantidad: `${salida.cantidad || 0} ${salida.medicamento?.unidadmedida || 'unidades'}`,
      motivo: salida.motivo || 'N/A',
      destino: salida.destino || 'N/A',
      usuario: salida.usuario ? `${salida.usuario.nombres} ${salida.usuario.apellidos}` : 'N/A',
      estado: Number(salida.estado) === 1 ? 'Activa' : 'Anulada'
    }));

    autoTable(doc, {
      startY: yPos,
      head: [columnas.map(col => col.title)],
      body: filasDatos.map(fila => columnas.map(col => fila[col.dataKey as keyof typeof fila])),
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [31, 89, 91],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data) => {
        this.membreteService.insertarMembreteCompleto(doc, membretes);
      }
    });
  }

  // ==========================================
  // EXCEL - PACIENTES
  // ==========================================
  private generarHojaPacientes(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => ({
      'Nombre': `${item.nombres} ${item.apellidos}`,
      'CUI': item.cui || 'N/A',
      'Género': item.genero === 'M' ? 'M' : 'F',
      'Edad': this.calcularEdad(item.fechanacimiento),
      'F.Nacimiento': this.formatearFecha(item.fechanacimiento),
      'Teléfono': item.telefonopersonal || 'N/A',
      'Municipio': item.municipio || 'N/A',
      'Aldea': item.aldea || 'N/A',
      'Dirección': item.direccion || 'N/A',
      'Expediente': item.expedientes && item.expedientes.length > 0 
        ? item.expedientes[0].numeroexpediente : 'N/A',
      'Contacto Emerg': item.nombrecontactoemergencia || 'N/A',
      'Tel Emerg': item.telefonoemergencia || 'N/A',
      'Encargado': item.nombreencargado || 'N/A',
      'DPI Encargado': item.dpiencargado || 'N/A',
      'Tel Encargado': item.telefonoencargado || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "1F595B" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - CONSULTAS
  // ==========================================
  private generarHojaConsultas(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => ({
      'Fecha': this.formatearFecha(item.fecha),
      'Paciente': `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      'F.Nac Paciente': this.formatearFecha(item.paciente?.fechanacimiento),
      'Médico': `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      'Clínica': item.usuario?.clinica?.nombreclinica || 'N/A',
      'Recordatorio': item.recordatorio || 'N/A',
      'Nota': item.notaconsulta || 'N/A',
      'Motivo': item.motivoconsulta || 'N/A',
      'Evolución': item.evolucion || 'N/A',
      'Diagnóstico': item.diagnosticotratamiento || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "055160" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - INVENTARIO
  // ==========================================
  private generarHojaInventario(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => {
      const precioNumerico = parseFloat(item.precio) || 0;
      
      return {
        'Medicamento': item.nombre,
        'Descripción': item.descripcion || '',
        'Unidades': item.unidades,
        'Precio': `Q${precioNumerico.toFixed(2)}`,
        'F.Ingreso': this.formatearFecha(item.fechaingreso),
        'F.Vencimiento': this.formatearFecha(item.fechaegreso),
        'Estado': item.estado === 1 ? 'Activo' : 'Inactivo'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "1F595B" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - AGENDA
  // ==========================================
  private generarHojaAgenda(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => ({
      'Fecha': this.formatearFecha(item.fechaatencion),
      'Hora': item.horaatencion || '',
      'Paciente': `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      'Médico': `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      'Transporte': item.transporte === 1 ? 'Sí' : 'No',
      'Comentario': item.comentario || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "055160" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - TRANSPORTE
  // ==========================================
  private generarHojaTransporte(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map((item, index) => ({
      '#': index + 1,
      'Paciente': `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`,
      'CUI': item.paciente?.cui || 'N/A',
      'Encargado': item.paciente?.nombreencargado || 'No especificado',
      'Contacto': item.paciente?.telefonoencargado || 'N/A',
      'Profesional': `Dr. ${item.usuario?.nombres || ''} ${item.usuario?.apellidos || ''}`,
      'Profesión': item.usuario?.profesion || 'Profesional',
      'Hora Transporte': this.formatearHora(item.horariotransporte),
      'Hora Cita': this.formatearHora(item.horaatencion),
      'Dirección': item.direccion || 'No especificada'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "1F595B" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - REFERENCIAS
  // ==========================================
  private generarHojaReferencias(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => ({
      'Fecha': this.formatearFecha(item.fechacreacion),
      'Paciente': `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      'Expediente': item.expediente?.numeroexpediente || 'N/A',
      'Enviado Por': `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      'Confirmado Por': item.usuarioconfirma4 || 'Pendiente',
      'Clínica': item.clinica?.nombreclinica || 'N/A',
      'Estado': item.confirmacion4 === 1 ? 'Completado' : 'Pendiente'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "055160" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // EXCEL - SALIDAS
  // ==========================================
  private generarHojaSalidas(datos: any[]): XLSX.WorkSheet {
    const datosExcel = datos.map(item => ({
      'Fecha': this.formatearFecha(item.fechacreacion),
      'Medicamento': item.medicamento?.nombremedicamento || 'N/A',
      'Principio Activo': item.medicamento?.principioactivo || 'N/A',
      'Cantidad': item.cantidad || 0,
      'Unidad': item.medicamento?.unidadmedida || 'N/A',
      'Motivo': item.motivo || 'N/A',
      'Destino': item.destino || 'N/A',
      'Usuario': item.usuario ? `${item.usuario.nombres} ${item.usuario.apellidos}` : 'N/A',
      'Estado': Number(item.estado) === 1 ? 'Activa' : 'Anulada',
      'Observaciones': item.observaciones || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "DC3545" } },
        font: { color: { rgb: "FFFFFF" }, bold: true }
      };
    }

    return worksheet;
  }

  // ==========================================
  // AUXILIARES
  // ==========================================

  private formatearFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  private formatearHora(hora: any): string {
    if (!hora) return 'N/A';
    
    if (typeof hora === 'string') {
      if (hora.includes('T')) {
        return hora.split('T')[1].substring(0, 5);
      }
      if (hora.includes(':')) {
        return hora.substring(0, 5);
      }
    }
    
    if (hora instanceof Date) {
      const horas = hora.getHours().toString().padStart(2, '0');
      const minutos = hora.getMinutes().toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    }
    
    return hora.toString().substring(0, 5);
  }

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  private obtenerTituloReporte(tipo: string): string {
    const titulos: any = {
      'pacientes': 'Reporte de Pacientes',
      'consultas': 'Reporte de Consultas',
      'inventario': 'Reporte de Inventario',
      'agenda': 'Reporte de Agenda',
      'referencias': 'Reporte de Referencias',
      'transporte': 'Reporte de Transportes',
      'salidas': 'Reporte de Salidas de Inventario'
    };
    return titulos[tipo] || 'Reporte';
  }
}