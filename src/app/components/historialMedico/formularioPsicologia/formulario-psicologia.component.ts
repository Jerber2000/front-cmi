// historialMedico/formulario-psicologia/formulario-psicologia.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfoPaciente } from '../../../services/historialMedico.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-formulario-psicologia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario-psicologia.component.html',
  styleUrls: ['./formulario-psicologia.component.scss']
})
export class FormularioPsicologiaComponent implements OnInit {
  @Input() pacienteInfo: InfoPaciente | null = null;
  @Input() mostrarModal: boolean = false;
  @Output() modalCerrado = new EventEmitter<void>();

  currentDate = new Date();
  numeroSesion: number = 1;
  generandoPDF: boolean = false;

  aspectoConducta = {
    atuendo: '', mirada: '', postura: '',
    conducta: {
      coopera: false, franco: false, abierto: false, temeroso: false,
      hostil: false, cauteloso: false, tenso: false, atento: false,
      relajado: false, confiado: false, ansioso: false, evasivo: false,
      amable: false, inseguro: false, retador: false, distraido: false
    }
  };

  lenguaje = {
    cuantitativas: {
      hablaIncesante: false, hablaEscueta: false, hablaExplosivo: false,
      hablaFluido: false, discursoLento: false, discursoRapido: false,
      volumenApropiado: false, tonoApropiado: false
    },
    cualitativas: {
      detalles: false, autoreferencia: false, perseveracion: false,
      inconsecuencia: false, fugaIdeas: false, incoherencia: false,
      incongruencia: false, neologismos: false, tartamudeo: false, balbuceo: false
    }
  };

  estadoAnimo = {
    depresion: false, ansiedad: false, colera: false, calma: false,
    culpa: false, grandeza: false, panico: false, miedo: false,
    euforia: false, hostilidad: false, felicidad: false, afliccion: false,
    suspicacia: false, tristeza: false
  };

  contenidoPensamiento = {
    alucinaciones: '', ideasDelirantes: '', ideasObsesivas: '',
    estadoAnimoAdecuado: '', nivelIntensidad: ''
  };

  cognicionSensorio = {
    persona: false, tiempo: false, lugar: false, memoria: false,
    atencion: false, aprendizaje: false, concentracion: false
  };

  impresionClinica: string = '';
  observacionesGenerales: string = '';

  ngOnInit(): void {
    console.log('Formulario Psicología inicializado', this.pacienteInfo);
  }

  cerrarModal(): void {
    this.modalCerrado.emit();
  }

  limpiarFormulario(): void {
    this.aspectoConducta = {
      atuendo: '', mirada: '', postura: '',
      conducta: {
        coopera: false, franco: false, abierto: false, temeroso: false,
        hostil: false, cauteloso: false, tenso: false, atento: false,
        relajado: false, confiado: false, ansioso: false, evasivo: false,
        amable: false, inseguro: false, retador: false, distraido: false
      }
    };
    
    this.lenguaje = {
      cuantitativas: {
        hablaIncesante: false, hablaEscueta: false, hablaExplosivo: false,
        hablaFluido: false, discursoLento: false, discursoRapido: false,
        volumenApropiado: false, tonoApropiado: false
      },
      cualitativas: {
        detalles: false, autoreferencia: false, perseveracion: false,
        inconsecuencia: false, fugaIdeas: false, incoherencia: false,
        incongruencia: false, neologismos: false, tartamudeo: false, balbuceo: false
      }
    };
    
    this.estadoAnimo = {
      depresion: false, ansiedad: false, colera: false, calma: false,
      culpa: false, grandeza: false, panico: false, miedo: false,
      euforia: false, hostilidad: false, felicidad: false, afliccion: false,
      suspicacia: false, tristeza: false
    };
    
    this.contenidoPensamiento = {
      alucinaciones: '', ideasDelirantes: '', ideasObsesivas: '',
      estadoAnimoAdecuado: '', nivelIntensidad: ''
    };
    
    this.cognicionSensorio = {
      persona: false, tiempo: false, lugar: false, memoria: false,
      atencion: false, aprendizaje: false, concentracion: false
    };
    
    this.impresionClinica = '';
    this.observacionesGenerales = '';
  }

  async generarPDF(): Promise<void> {
    this.generandoPDF = true;
    
    try {
      const doc = new jsPDF();
      let yPos = 15;

      doc.setFillColor(64, 64, 64);
      doc.rect(15, yPos, 180, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('EXAMEN DEL ESTADO MENTAL', 105, yPos + 7, { align: 'center' });
      yPos += 15;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Nombre del paciente:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.line(55, yPos + 1, 120, yPos + 1);
      doc.text(`${this.pacienteInfo?.nombres || ''} ${this.pacienteInfo?.apellidos || ''}`, 57, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('Sexo:', 125, yPos);
      doc.setFont('helvetica', 'normal');
      doc.line(135, yPos + 1, 185, yPos + 1);
      doc.text(this.obtenerGenero(), 137, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de aplicación:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.line(55, yPos + 1, 120, yPos + 1);
      doc.text(this.formatearFecha(this.currentDate), 57, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('No. de sesión:', 125, yPos);
      doc.setFont('helvetica', 'normal');
      doc.line(155, yPos + 1, 185, yPos + 1);
      doc.text(this.numeroSesion.toString(), 157, yPos);
      yPos += 10;

      yPos = this.agregarEncabezadoSeccion(doc, yPos, '1. Aspecto general y conducta');
      yPos = this.agregarSubseccion(doc, yPos, '1.1 Aspecto');
      yPos = this.agregarCampoTexto(doc, yPos, 'Atuendo e higiene:', this.aspectoConducta.atuendo);
      yPos = this.agregarCampoTexto(doc, yPos, 'Mirada y expresión:', this.aspectoConducta.mirada);
      yPos = this.agregarCampoTexto(doc, yPos, 'Postura:', this.aspectoConducta.postura);
      yPos = this.agregarSubseccion(doc, yPos, '1.2 Conducta');
      yPos = this.agregarTablaCheckboxes(doc, yPos, [
        ['Coopera', this.aspectoConducta.conducta.coopera, 'Relajado', this.aspectoConducta.conducta.relajado],
        ['Franco', this.aspectoConducta.conducta.franco, 'Confiado', this.aspectoConducta.conducta.confiado],
        ['Abierto', this.aspectoConducta.conducta.abierto, 'Ansioso', this.aspectoConducta.conducta.ansioso],
        ['Temeroso', this.aspectoConducta.conducta.temeroso, 'Evasivo', this.aspectoConducta.conducta.evasivo],
        ['Hostil', this.aspectoConducta.conducta.hostil, 'Amable', this.aspectoConducta.conducta.amable],
        ['Cauteloso', this.aspectoConducta.conducta.cauteloso, 'Inseguro', this.aspectoConducta.conducta.inseguro],
        ['Tenso', this.aspectoConducta.conducta.tenso, 'Retador', this.aspectoConducta.conducta.retador],
        ['Atento', this.aspectoConducta.conducta.atento, 'Distraído', this.aspectoConducta.conducta.distraido]
      ]);

      yPos = this.verificarNuevaPagina(doc, yPos, 60);
      yPos = this.agregarEncabezadoSeccion(doc, yPos, '2. Características del lenguaje');
      yPos = this.agregarSubseccion(doc, yPos, '2.1 Cuantitativas');
      yPos = this.agregarTablaCheckboxes(doc, yPos, [
        ['Habla incesante', this.lenguaje.cuantitativas.hablaIncesante, 'Discurso lento', this.lenguaje.cuantitativas.discursoLento],
        ['Habla escueta', this.lenguaje.cuantitativas.hablaEscueta, 'Discurso rápido', this.lenguaje.cuantitativas.discursoRapido],
        ['Habla explosivo', this.lenguaje.cuantitativas.hablaExplosivo, 'Volumen apropiado', this.lenguaje.cuantitativas.volumenApropiado],
        ['Habla fluido', this.lenguaje.cuantitativas.hablaFluido, 'Tono apropiado', this.lenguaje.cuantitativas.tonoApropiado]
      ]);

      yPos = this.agregarSubseccion(doc, yPos, '2.2 Cualitativas');
      yPos = this.agregarTablaCheckboxes(doc, yPos, [
        ['Detalles', this.lenguaje.cualitativas.detalles, 'Incoherencia', this.lenguaje.cualitativas.incoherencia],
        ['Autoreferencia', this.lenguaje.cualitativas.autoreferencia, 'Incongruencia', this.lenguaje.cualitativas.incongruencia],
        ['Perseveración', this.lenguaje.cualitativas.perseveracion, 'Neologismos', this.lenguaje.cualitativas.neologismos],
        ['Inconsecuencia', this.lenguaje.cualitativas.inconsecuencia, 'Tartamudeo', this.lenguaje.cualitativas.tartamudeo],
        ['Fuga de ideas', this.lenguaje.cualitativas.fugaIdeas, 'Balbuceo', this.lenguaje.cualitativas.balbuceo]
      ]);

      yPos = this.verificarNuevaPagina(doc, yPos, 50);
      yPos = this.agregarEncabezadoSeccion(doc, yPos, '3. Estado de ánimo y afecto');
      yPos = this.agregarTablaCheckboxes(doc, yPos, [
        ['Depresión', this.estadoAnimo.depresion, 'Miedo', this.estadoAnimo.miedo],
        ['Ansiedad', this.estadoAnimo.ansiedad, 'Euforia', this.estadoAnimo.euforia],
        ['Cólera', this.estadoAnimo.colera, 'Hostilidad', this.estadoAnimo.hostilidad],
        ['Calma', this.estadoAnimo.calma, 'Felicidad', this.estadoAnimo.felicidad],
        ['Culpa', this.estadoAnimo.culpa, 'Aflicción', this.estadoAnimo.afliccion],
        ['Grandeza', this.estadoAnimo.grandeza, 'Suspicacia', this.estadoAnimo.suspicacia],
        ['Pánico', this.estadoAnimo.panico, 'Tristeza', this.estadoAnimo.tristeza]
      ]);

      doc.addPage();
      yPos = 20;

      yPos = this.agregarEncabezadoSeccion(doc, yPos, '4. Contenido del pensamiento');
      yPos = this.agregarCampoTexto(doc, yPos, 'Alucinaciones y percepciones defectuosas:', this.contenidoPensamiento.alucinaciones || 'No se identificó');
      yPos = this.agregarCampoTexto(doc, yPos, 'Ideas delirantes y malinterpretaciones:', this.contenidoPensamiento.ideasDelirantes || 'No se identificó');
      yPos = this.agregarCampoTexto(doc, yPos, 'Ideas obsesivas y fóbicas:', this.contenidoPensamiento.ideasObsesivas || 'No se identificó');
      yPos = this.agregarCampoTexto(doc, yPos, '¿Se considera que el estado de ánimo es adecuado al contenido del pensamiento?', this.contenidoPensamiento.estadoAnimoAdecuado);
      yPos = this.agregarCampoTexto(doc, yPos, '¿Se observa nivel de intensidad apropiado?', this.contenidoPensamiento.nivelIntensidad);

      yPos = this.verificarNuevaPagina(doc, yPos, 40);
      yPos = this.agregarEncabezadoSeccion(doc, yPos, '5. Estado de cognición y del sensorio');
      yPos = this.agregarTablaCheckboxes(doc, yPos, [
        ['Persona', this.cognicionSensorio.persona, 'Atención', this.cognicionSensorio.atencion],
        ['Tiempo', this.cognicionSensorio.tiempo, 'Aprendizaje', this.cognicionSensorio.aprendizaje],
        ['Lugar', this.cognicionSensorio.lugar, 'Concentración', this.cognicionSensorio.concentracion],
        ['Memoria', this.cognicionSensorio.memoria, '', false]
      ]);

      yPos += 5;
      yPos = this.agregarCampoTexto(doc, yPos, 'Impresión Clínica:', this.impresionClinica);
      yPos = this.agregarCampoTexto(doc, yPos, 'Observaciones generales:', this.observacionesGenerales);

      const totalPages = (doc as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i}`, 105, 285, { align: 'center' });
        doc.setFontSize(7);
        doc.text('Examen del Estado Mental', 20, 10);
      }

      const nombrePaciente = `${this.pacienteInfo?.nombres || 'Paciente'}_${this.pacienteInfo?.apellidos || ''}`.replace(/\s+/g, '_');
      const fechaFormato = this.formatearFecha(this.currentDate).replace(/\//g, '-');
      doc.save(`Examen_Mental_${nombrePaciente}_${fechaFormato}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      this.generandoPDF = false;
    }
  }

  private agregarEncabezadoSeccion(doc: jsPDF, yPos: number, titulo: string): number {
    doc.setFillColor(96, 96, 96);
    doc.rect(15, yPos, 180, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, 20, yPos + 5);
    return yPos + 10;
  }

  private agregarSubseccion(doc: jsPDF, yPos: number, titulo: string): number {
    doc.setFillColor(160, 160, 160);
    doc.rect(15, yPos, 180, 6, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, 20, yPos + 4.5);
    return yPos + 8;
  }

  private agregarCampoTexto(doc: jsPDF, yPos: number, etiqueta: string, valor: string): number {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(etiqueta, 20, yPos);
    
    if (valor) {
      doc.setFont('helvetica', 'normal');
      const lineas = doc.splitTextToSize(valor, 170);
      doc.text(lineas, 20, yPos + 4);
      doc.line(20, yPos + 4 + (lineas.length * 3.5), 195, yPos + 4 + (lineas.length * 3.5));
      return yPos + 4 + (lineas.length * 3.5) + 3;
    } else {
      doc.line(20, yPos + 2, 195, yPos + 2);
      return yPos + 5;
    }
  }

  private agregarTablaCheckboxes(doc: jsPDF, yPos: number, filas: any[][]): number {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Si', 70, yPos);
    doc.text('No', 80, yPos);
    doc.text('Si', 160, yPos);
    doc.text('No', 170, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    
    filas.forEach(([label1, check1, label2, check2]) => {
      doc.text(label1, 20, yPos);
      this.dibujarCheckbox(doc, 68, yPos - 2.5, check1);
      this.dibujarCheckbox(doc, 78, yPos - 2.5, !check1);
      if (label2) {
        doc.text(label2, 110, yPos);
        this.dibujarCheckbox(doc, 158, yPos - 2.5, check2);
        this.dibujarCheckbox(doc, 168, yPos - 2.5, !check2);
      }
      yPos += 5;
    });
    return yPos + 3;
  }

  private dibujarCheckbox(doc: jsPDF, x: number, y: number, checked: boolean): void {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, 3, 3);
    
    if (checked) {
      // Dibujar un checkmark (✓) con líneas
      doc.setLineWidth(0.5);
      // Línea corta (parte izquierda del check)
      doc.line(x + 0.7, y + 1.5, x + 1.2, y + 2.2);
      // Línea larga (parte derecha del check)
      doc.line(x + 1.2, y + 2.2, x + 2.5, y + 0.8);
    }
  }

  private verificarNuevaPagina(doc: jsPDF, yPos: number, espacioNecesario: number): number {
    if (yPos + espacioNecesario > 270) {
      doc.addPage();
      return 20;
    }
    return yPos;
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  obtenerGenero(): string {
    // ✅ Si viene del backend directamente
    if (this.pacienteInfo?.genero) {
      return this.pacienteInfo.genero === 'M' ? 'Masculino' : 'Femenino';
    }
    
    // ✅ Fallback: calcular desde CUI
    if (this.pacienteInfo?.cui) {
      const ultimoDigito = parseInt(this.pacienteInfo.cui.slice(-1));
      return ultimoDigito % 2 === 0 ? 'Femenino' : 'Masculino';
    }
    
    return 'N/A';
  }
}