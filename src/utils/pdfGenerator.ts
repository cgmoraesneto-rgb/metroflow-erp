import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  CalibrationRecord, 
  Client, 
  Procedure, 
  StandardInstrument, 
  CertificateMask, 
  ColumnType,
  Quote,
  ServiceOrder,
  StandardCustody,
  InstrumentStatus,
  DocumentTemplate,
  ColumnBehavior,
  DigitalSignature,
  Employee
} from '../types';
import { CERTIFICATE_LETTERHEAD, GENERAL_LETTERHEAD } from './letterheads';
import { formatDate, formatCurrency, parseNumericInput } from './formatters';
import { getMetrologyValue } from './metrologyMapper';
import { getDefaultMetrologyField } from '../metrologyDefaults';
import Chart from 'chart.js/auto';

const generateChartImage = async (group: any, record: any, groupMask: any): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800; // High resolution for PDF
            canvas.height = 300;
            
            // Extract data
            const labels = [];
            const errors = [];
            const uncertainties = [];
            
            const repetitions = groupMask?.repetitions || 1;
            const numPoints = Math.ceil(group.rows.length / repetitions);
            
            for (let p = 0; p < numPoints; p++) {
                const calc = record.calculatedPoints?.[`${group.groupName}-${p}`];
                if (calc) {
                    const row = group.rows[p * repetitions];
                    // Tentar achar VVC ou referência para o eixo X. Se não tiver, usar Ponto X
                    const refDef = groupMask?.columnDefinitions?.find((d: any) => d.type === 'VVC' || d.behavior === 'INPUT' && d.name.toLowerCase().includes('ref'));
                    const xLabel = (refDef && row && row[refDef.id] !== undefined) ? row[refDef.id] : `P. ${p+1}`;
                    labels.push(xLabel);
                    errors.push(calc.error || 0);
                    uncertainties.push(calc.U || 0);
                }
            }
            
            if (labels.length === 0) return resolve(null);
            
            const isUncertainty = groupMask.graphType === 'uncertainty_band';
            
            const datasets: any[] = [
                {
                    label: 'Erro de Indicação',
                    data: errors,
                    borderColor: 'rgb(220, 38, 38)', // Red-600
                    backgroundColor: 'rgba(220, 38, 38, 0.5)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 4
                }
            ];
            
            if (isUncertainty) {
                const upBand = errors.map((e, idx) => e + uncertainties[idx]);
                const lowBand = errors.map((e, idx) => e - uncertainties[idx]);
                
                datasets.push({
                    label: '+ Incerteza (U)',
                    data: upBand,
                    borderColor: 'rgba(79, 70, 229, 0.6)', // Indigo-600
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    fill: false,
                    pointRadius: 0
                });
                datasets.push({
                    label: '- Incerteza (U)',
                    data: lowBand,
                    borderColor: 'rgba(79, 70, 229, 0.6)',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    fill: false,
                    pointRadius: 0
                });
            }
            
            new Chart(canvas, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: false,
                    animation: false, // Critical for immediate base64 capture
                    plugins: { 
                        legend: { position: 'bottom', labels: { font: { size: 10 } } } 
                    },
                    scales: {
                        y: { title: { display: true, text: 'Erro / Incerteza' } },
                        x: { title: { display: true, text: 'Valor de Referência / Pontos' } }
                    }
                }
            });
            
            // Allow minimal tick for canvas to render
            setTimeout(() => {
                resolve(canvas.toDataURL('image/png'));
            }, 10);
        } catch (e) {
            console.error("Error generating chart", e);
            resolve(null);
        }
    });
};

/**
 * Shared Header/Footer Utilities for Branded Document Generation
 */

interface HeaderOptions {
  doc: jsPDF;
  title: string;
  subtitle?: string;
  documentNumber?: string;
  date?: string;
  isCertificate?: boolean;
  hideMeta?: boolean;
  customLetterhead?: string;
  footerLetterhead?: string; // Standardize name
}

export const addStandardHeader = ({
  doc,
  title,
  subtitle,
  documentNumber,
  date,
  isCertificate = false,
  hideMeta = false,
  customLetterhead
}: HeaderOptions) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // LOGIC: Use custom if provided, otherwise check system defaults
  const letterhead = customLetterhead || (isCertificate ? CERTIFICATE_LETTERHEAD : GENERAL_LETTERHEAD);
  
  const primaryColor: [number, number, number] = [0, 51, 102];
  const textColor: [number, number, number] = [20, 20, 20];
  const margin = 20;

  // Header images are usually full width or positioned at top
  if (letterhead && typeof letterhead === 'string' && letterhead.startsWith('data:image')) {
    try {
      doc.addImage(letterhead, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    } catch (e) {
      console.error("Error adding header image:", e);
    }
  }
  
  // ... rest of header logic remains same
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(title.length > 30 ? 16 : 18);
  
  const headerTitleY = 50; 
  doc.text(title.toUpperCase(), pageWidth / 2, headerTitleY, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, pageWidth / 2, headerTitleY + 6, { align: 'center' });
  }

  if (!hideMeta) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);

    if (documentNumber) {
      doc.text(`Nº do Documento: ${documentNumber}`, margin, headerTitleY + 12);
    }
    
    const displayDate = date || new Date().toLocaleDateString('pt-BR');
    doc.text(`Data da Emissão: ${displayDate}`, pageWidth - margin, headerTitleY + 12, { align: 'right' });
  }

  return headerTitleY + 20;
};

export const addStandardFooter = (doc: jsPDF, isCertificate: boolean = false, customFooter?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    if (customFooter) {
      try {
        // Assume footer image is at the bottom, full width
        doc.addImage(customFooter, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      } catch (e) {
        console.error("Error adding footer image:", e);
      }
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    
    const disclaimer = isCertificate 
      ? "Os resultados apresentados neste documento referem-se exclusivamente ao instrumento calibrado nas condições especificadas."
      : "Este documento é parte integrante do processo de atendimento da Wantec Metroflow Metrologia.";
    
    // Position text relative to bottom if no custom footer image, 
    // or overlay if it's just a background
    doc.text(disclaimer, pageWidth / 2, pageHeight - 15, { align: 'center' });
    
    if (isCertificate) {
       doc.text(`As incertezas expandidas de medição relatadas foram calculadas conforme o Guia para a Expressão da Incerteza de Medição (GUM).`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    }
    
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
};


export const generateCertificatePdf = async (
  record: CalibrationRecord,
  client: Client | undefined,
  procedures: Procedure[],
  standardInstruments: StandardInstrument[],
  certificateMasks: CertificateMask[],
  employees: Employee[] = [],
  preview: boolean = false,
  isInternalMemory: boolean = false,
  documentTemplates: DocumentTemplate[] = [],
  signatures: DigitalSignature[] = []
): Promise<string | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const marginTop = 45; // Margem superior para respeitar o papel timbrado
  const marginBottom = 50; // Margem inferior espacada
  const contentWidth = pageWidth - marginX * 2;

  const mask = certificateMasks.find(m => m.id === record.certificateMaskId);
  const isTest = mask?.type === 'TEST_REPORT';
  const isMaintenance = mask?.type === 'MAINTENANCE_REPORT';
  
  const primaryColor: [number, number, number] = [0, 51, 102];
  const secondaryColor: [number, number, number] = [230, 230, 230];
  const textColor: [number, number, number] = [20, 20, 20];

  let currentY = marginTop;
  const lineSpacing = 5;
  const sectionSpacing = 8;

  const totalPagesExp = '{total_pages_count_string}';
  const wordCalibration = isTest ? 'ENSAIO' : isMaintenance ? 'TESTE' : 'CALIBRAÇÃO';
  let headerTitle = isInternalMemory 
    ? `MEMÓRIA DE CÁLCULO D${isTest ? 'O' : 'A'} ${wordCalibration} N.º ${record.certificateNumber}`
    : `${(isTest || isMaintenance) ? 'RELATÓRIO' : 'CERTIFICADO'} DE ${wordCalibration} N.º ${record.certificateNumber}`.toUpperCase();

  const template = documentTemplates.find(t => t.id === 'CALIBRATION_CERTIFICATE' || t.applyTo === 'CALIBRATION_CERTIFICATE');

  const callHeader = (document: jsPDF) => {
    // Escondendo metadados porque os desenharemos aqui
    currentY = addStandardHeader({
      doc: document,
      title: '', // Evita título duplicado gerado pela função base
      isCertificate: true,
      hideMeta: true,
      customLetterhead: template?.letterheadBase64
    });
    
    currentY = marginTop; // Fix header to respect our spacing instead of default from addStandardHeader
    
    document.setFontSize(14);
    document.setFont('helvetica', 'bold');
    document.setTextColor(0, 0, 0);
    document.text(headerTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    document.setFontSize(8);
    document.setFont('helvetica', 'normal');
    
    const calibDateLabel = isTest ? 'Data do Ensaio:' : isMaintenance ? 'Data do Teste:' : 'Data da Calibração:';
    const calibDateValue = record.calibrationDate ? new Date(record.calibrationDate).toLocaleDateString('pt-BR') : '';
    const emitDateLabel = 'Data da emissão:';
    const emitDateValue = new Date().toLocaleDateString('pt-BR');
    
    document.setDrawColor(50, 50, 50);
    document.setLineWidth(0.3);
    document.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
    
    document.text(`${calibDateLabel}  ${calibDateValue}`, marginX, currentY);
    document.text(`${emitDateLabel}  ${emitDateValue}`, pageWidth / 2, currentY, { align: 'center' });
    document.text(`Página ${(document as any).internal.getNumberOfPages()} de ${totalPagesExp}`, pageWidth - marginX, currentY, { align: 'right' });
    
    currentY += 2;
    document.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += sectionSpacing;
  };

  callHeader(doc);

  const drawSectionTitle = (title: string, y: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), marginX, y);
    return y + lineSpacing;
  };

  // 1. DADOS GERAIS
  currentY = drawSectionTitle('1. DADOS GERAIS:', currentY);
  doc.setFontSize(9);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Contratante:', marginX + 5, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.razaoSocial || '', marginX + 30, currentY);
  
  currentY += lineSpacing;
  doc.setFont('helvetica', 'normal');
  doc.text('Endereço:', marginX + 5, currentY);
  doc.setFont('helvetica', 'bold');
  const addrLines = doc.splitTextToSize(client?.enderecoPrincipal || '', contentWidth - 40);
  doc.text(addrLines, marginX + 30, currentY);
  currentY += (addrLines.length * lineSpacing) + (sectionSpacing - lineSpacing);

  // 2. DADOS DO INSTRUMENTO
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); callHeader(doc); }
  
  currentY = drawSectionTitle(`2. DADOS DO INSTRUMENTO${isTest ? '' : 'S'}:`, currentY);
  
  doc.setFillColor(...secondaryColor);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text((record.instrumentName || '').toUpperCase(), pageWidth / 2, currentY + 4, { align: 'center' });
  currentY += lineSpacing + 2;

  doc.setFontSize(8);
  const leftX = marginX;
  const leftValueX = marginX + 30;
  const rightX = marginX + (contentWidth / 2) + 5;
  const rightValueX = marginX + (contentWidth / 2) + 35;

  doc.setFont('helvetica', 'normal'); doc.text('Fabricante:', leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.manufacturer || 'N/A', leftValueX, currentY);
  doc.setFont('helvetica', 'normal'); doc.text('Modelo:', rightX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.model || 'N/A', rightValueX, currentY);
  currentY += lineSpacing;

  doc.setFont('helvetica', 'normal'); doc.text('Número de Série:', leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.serialNumber || 'N/A', leftValueX, currentY);
  doc.setFont('helvetica', 'normal'); doc.text('Identificação:', rightX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.identification || 'N/A', rightValueX, currentY);
  currentY += lineSpacing;

  doc.setFont('helvetica', 'normal'); doc.text('Ordem de Serviço:', leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.serviceOrderId || 'N/A', leftValueX, currentY);
  const nextCalibLabel = isTest ? `Próximo ${wordCalibration.toLowerCase()}:` : isMaintenance ? `Próxima ${wordCalibration.toLowerCase()}:` : `Próxima ${wordCalibration.toLowerCase()}:`;
  doc.setFont('helvetica', 'normal'); doc.text(nextCalibLabel, rightX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.nextCalibrationDate ? new Date(record.nextCalibrationDate).toLocaleDateString('pt-BR') : 'N/A', rightValueX, currentY);
  currentY += lineSpacing;

  doc.setFont('helvetica', 'normal'); doc.text(`Local d${isTest ? 'o ensaio' : isMaintenance ? 'o teste' : 'a calibração'}:`, leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.calibrationLocation || 'N/A', leftValueX, currentY);
  currentY += sectionSpacing;

  // 3. CONDIÇÕES AMBIENTAIS DURANTE A CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle(`3. CONDIÇÕES AMBIENTAIS DURANTE ${isTest ? 'O ENSAIO' : isMaintenance ? 'O TESTE' : 'A CALIBRAÇÃO'}:`, currentY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('• Temperatura do Ar:', leftX + 5, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${record.temperature || 'N/A'} °C ± 1 °C`, leftX + 45, currentY);
  
  doc.setFont('helvetica', 'bold');
  doc.text('• Umidade Relativa do Ar:', rightX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${record.humidity || 'N/A'} %UR ± 5 %UR`, rightX + 45, currentY);
  currentY += lineSpacing;

  const envStandard = standardInstruments.find(si => si.id === record.envStandardInstrumentId);
  if (envStandard) {
    doc.setFontSize(7);
    doc.text(`P: (Termohigrômetro, código ${envStandard.identificacao || '-'}, certificado n° ${envStandard.certificadoCalibracao || '-'} emitido por ${envStandard.orgaoCalibrador}, válido até ${new Date(envStandard.dataValidadeCalibracao).toLocaleDateString('pt-BR')})`, leftX + 5, currentY);
  }
  currentY += sectionSpacing;

  // 4. PROCEDIMENTO DE CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 20) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle(`4. PROCEDIMENTO DE ${wordCalibration}:`, currentY);
  
  const procedure = procedures.find(p => p.id === record.procedureId);
  const procTitle = procedure ? (`${procedure.code ? procedure.code + ' - ' : ''}${procedure.title}`) : 'Procedimento não especificado';
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const procLines = doc.splitTextToSize(`4.1 ${procTitle}`, contentWidth - 10);
  doc.text(procLines, marginX + 5, currentY);
  currentY += (procLines.length * lineSpacing) + sectionSpacing - lineSpacing;

  // 5. PADRÕES UTILIZADOS
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle('5. PADRÃO(ÕES) UTILIZADO(S):', currentY);

  const serviceStandards = standardInstruments.filter(si => record.standardInstrumentIds?.includes(si.id));
  if (serviceStandards.length > 0) {
    const tableData = serviceStandards.map(si => [
      si.identificacao || '-',
      si.nome || '-',
      si.certificadoCalibracao || '-',
      si.orgaoCalibrador || '-',
      new Date(si.dataValidadeCalibracao).toLocaleDateString('pt-BR')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Descrição', 'Certificado n.º', 'Órgão Calibrador', 'Validade']],
      body: tableData,
      theme: 'plain',
      styles: { cellPadding: 2 },
      headStyles: { fillColor: false, textColor: [0,0,0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [0,0,0], halign: 'center' },
      margin: { left: marginX, right: marginX, top: marginTop + 25, bottom: marginBottom },
    });
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + sectionSpacing;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nenhum padrão utilizado/informado.', marginX + 5, currentY);
    currentY += sectionSpacing;
  }

  // RESULTADOS
  if (record.groups && record.groups.length > 0) {
    if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); callHeader(doc); }
    currentY = drawSectionTitle(`RESULTADOS D${isTest ? 'O ENSAIO' : isMaintenance ? 'O TESTE' : 'A CALIBRAÇÃO'}:`, currentY);

    for (const group of record.groups) {
      if (group.rows.length === 0) continue;

      const groupMask = mask?.measurementGroups.find(mg => mg.name === group.groupName);
      let definitions = groupMask?.columnDefinitions || [];
      if (definitions.length === 0 && groupMask?.columns && groupMask.columns.length > 0) {
        definitions = groupMask.columns.map((colName: string) => ({ id: colName, name: colName, type: ColumnType.TEXTO, behavior: ColumnBehavior.METROLOGY }));
      }

      const hiddenCols = groupMask?.hiddenColumns || [];
      let visibleDefs = definitions.filter(d => !hiddenCols.includes(d.name));
      if (!isInternalMemory) {
        const allowedTypes = [ColumnType.VVC, ColumnType.ERRO, ColumnType.INCERTEZA, ColumnType.CONFORMIDADE, ColumnType.TEXTO];
        visibleDefs = visibleDefs.filter(d => allowedTypes.includes(d.type));
      }

      if (visibleDefs.length === 0) continue;

      const head = [visibleDefs.map(d => (d.name || '').toUpperCase())];
      const bodyData: any[] = [];
      const repetitions = mask?.repetitions || 1;
      const numPoints = Math.ceil(group.rows.length / repetitions);

      for (let p = 0; p < numPoints; p++) {
        const groupName = group.groupName || 'Resultados';
        const calc = record.calculatedPoints?.[groupName + '-' + p];
        for (let r = 0; r < repetitions; r++) {
          const rowIndex = p * repetitions + r;
          const row = group.rows[rowIndex];
          
          const rowData = visibleDefs.map(def => {
            if (!row) return '—';
            const isMetrology = def.behavior === ColumnBehavior.METROLOGY;
            const isCalculated = def.behavior === ColumnBehavior.CALCULATED;
            if (calc && r === 0) {
              if (def.id && calc[def.id] !== undefined) {
                const val = calc[def.id];
                return typeof val === 'number' ? val.toFixed(4) : String(val);
              }
            } else if (calc && r > 0) {
              if (isMetrology || isCalculated) return '';
            }
            const rawVal = row[def.id] !== undefined ? row[def.id] : (def.name ? row[def.name] : undefined);
            return rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
          });
          bodyData.push(rowData);
        }
      }

      autoTable(doc, {
        startY: currentY + 2,
        head: head,
        body: bodyData,
        theme: 'grid',
        styles: { cellPadding: 2 },
        headStyles: { fillColor: secondaryColor, textColor: [0,0,0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: [0,0,0], halign: 'center' },
        margin: { left: marginX, right: marginX, top: marginTop + 25, bottom: marginBottom },
        didDrawPage: (data) => { if (data.pageNumber > 1) callHeader(doc); }
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + sectionSpacing;
    }
  }

  // 6. OBSERVAÇÕES
  if (currentY > pageHeight - marginBottom - 40) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle('6. OBSERVAÇÕES:', currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let obsCounter = 1;
  
  doc.text(`6.${obsCounter++} Realizado apenas ${isTest ? 'ensaio' : isMaintenance ? 'teste' : 'calibração'} do instrumento em questão.`, marginX + 5, currentY); currentY += lineSpacing;
  doc.text(`6.${obsCounter++} Valores obtidos correspondem à média de três medições.`, marginX + 5, currentY); currentY += lineSpacing;
  
  if (!isTest) {
    const incStr = `6.${obsCounter++} A incerteza declarada foi fundamentada conforme o procedimento interno para o nível de confiança de aproximadamente 95%.`;
    const incLines = doc.splitTextToSize(incStr, contentWidth - 10);
    doc.text(incLines, marginX + 5, currentY); currentY += (incLines.length * lineSpacing);
    
    const limitsStr = `6.${obsCounter++} A inclusão da informação de "Erro Máximo Admissível" no conteúdo do certificado, foram referenciados pelas normas vigentes.`;
    const limitsLines = doc.splitTextToSize(limitsStr, contentWidth - 10);
    doc.text(limitsLines, marginX + 5, currentY); currentY += (limitsLines.length * lineSpacing);
  }
  
  if (record.observations) {
    const defaultObs = doc.splitTextToSize(`6.${obsCounter++} ${record.observations}`, contentWidth - 10);
    doc.text(defaultObs, marginX + 5, currentY);
    currentY += (defaultObs.length * lineSpacing);
  }
  
  const finalObs = doc.splitTextToSize(`6.${obsCounter++} Os resultados apresentados neste documento têm significância restrita e se aplicam somente ao instrumento em questão, na data d${isTest ? 'o ensaio' : isMaintenance ? 'o teste' : 'a calibração'}.`, contentWidth - 10);
  doc.text(finalObs, marginX + 5, currentY);
  currentY += (finalObs.length * lineSpacing) + sectionSpacing;

  // FINAL SIGNATURES 
  if (currentY > pageHeight - marginBottom - 50) { doc.addPage(); callHeader(doc); }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const responsibleSuffix = (isTest || isMaintenance) ? 'DO RELATÓRIO' : 'DO CERTIFICADO';
  doc.text(`RESPONSÁVEL(EIS) PELA EMISSÃO ${responsibleSuffix}`, marginX, currentY);
  
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  currentY += 2;
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 1;
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 30; // Mais espaco para a assinatura do gerente em pe

  const technicianEmployee = employees.find(e => e.id === record.submittedBy);
  const authorizedEmployee = 
    employees.find(e => e.id === record.signatarioId) || 
    employees.find(e => e.isSignatory) || 
    employees.find(e => e.id === record.l2ApproverId) || 
    employees.find(e => e.id === record.l1ApproverId);

  const signatureWidth = 60;
  const signatureX1 = marginX + 15;
  const signatureX2 = pageWidth - marginX - 15 - signatureWidth;
  const signatureHeight = 20;

  if (authorizedEmployee?.signatureBase64 && authorizedEmployee.signatureBase64.startsWith('data:image')) {
    try { doc.addImage(authorizedEmployee.signatureBase64, 'PNG', signatureX2, currentY - signatureHeight, signatureWidth, signatureHeight, undefined, 'FAST'); } catch (e) {}
  }

  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.3);
  doc.line(signatureX2, currentY, signatureX2 + signatureWidth, currentY);

  currentY += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let techName = record.technicianName || technicianEmployee?.nome || 'Não identificado';
  
  doc.text('Técnico Executante:', signatureX1, currentY);
  doc.setFont('helvetica', 'italic');
  doc.text(techName, signatureX1 + 35, currentY);

  // Digital Approve timestamp
  if (record.approvedAt) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    const dateApp = new Date(record.approvedAt);
    doc.text(`Aprovado digitalmente no dia:`, signatureX2 + (signatureWidth/2) + 20, currentY - 26, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${dateApp.toLocaleDateString('pt-BR')} ${dateApp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, signatureX2 + (signatureWidth/2) + 20, currentY - 23, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(authorizedEmployee?.nome || 'Gerente Técnico', signatureX2 + (signatureWidth/2), currentY, { align: 'center' });
  doc.text('Gerente Técnico', signatureX2 + (signatureWidth/2), currentY + 4, { align: 'center' });

  // DIGITAL SIGNATURES COMPLIANCE
  if (signatures.length > 0) {
    if (currentY > pageHeight - 60) { doc.addPage(); callHeader(doc); currentY = 100; }
    currentY += 15;

    doc.setFillColor(232, 245, 233);
    doc.roundedRect(marginX, currentY, contentWidth, 25, 3, 3, 'F');
    doc.setDrawColor(76, 175, 80);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, currentY, contentWidth, 25, 3, 3, 'D');

    doc.setTextColor(46, 125, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO ASSINADO DIGITALMENTE', marginX + 5, currentY + 7);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`HASH SHA-256: ${signatures[0].documentHash}`, marginX + 5, currentY + 12);
    doc.text(`Integridade verificável via QR Code ou no portal MetroFlow ERP.`, marginX + 5, currentY + 16);
  }

  
  // ANEXAR IMAGENS
  if (record.attachments && record.attachments.length > 0) {
    for (let i = 0; i < record.attachments.length; i++) {
        doc.addPage();
        callHeader(doc);
        const yTop = currentY;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`ANEXO ${i + 1}`, pageWidth / 2, yTop, { align: 'center' });
        
        try {
            // Draw image scaled
            const maxW = contentWidth;
            const maxH = pageHeight - marginBottom - yTop - 10;
            // Assuming we just fit it approximately
            doc.addImage(record.attachments[i], 'JPEG', marginX, yTop + 10, maxW, maxH, undefined, 'FAST');
        } catch (e) {
            doc.setFont('helvetica', 'normal');
            doc.text('Erro ao carregar imagem em anexo.', marginX, yTop + 20);
        }
    }
  }
  
  addStandardFooter(doc, true, template?.footerBase64);

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  if (preview) {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  } else {
    const prefix = isInternalMemory ? "Memoria_Calculo_" : (isTest ? "Relatorio_Ensaio_" : "Certificado_");
    doc.save(`${prefix}${record.certificateNumber}.pdf`);
  }
};

export const generateClientReportPdf = (
  records: CalibrationRecord[],
  client: Client | undefined,
  year: number,
  documentTemplates: DocumentTemplate[] = []
): void => {
  const template = documentTemplates.find(t => t.applyTo === 'ALL');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const primaryColor: [number, number, number] = [0, 51, 102];

  // Header
  const currentY = addStandardHeader({
    doc,
    title: 'RESUMO DE EQUIPAMENTOS CERTIFICADOS',
    subtitle: `Ano de Referência: ${year}`,
    isCertificate: false,
    customLetterhead: template?.letterheadBase64
  });

  // Client Info
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, currentY + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Razão Social: ${client?.razaoSocial || 'N/A'}`, margin, currentY + 11);
  doc.text(`CNPJ: ${client?.cnpj || 'N/A'}`, margin, currentY + 16);

  // Table
  const tableData = records.map(r => [
    r.certificateNumber,
    new Date(r.calibrationDate).toLocaleDateString('pt-BR'),
    r.instrumentName,
    r.identification || '-',
    r.serialNumber || '-',
    r.status
  ]);

  autoTable(doc, {
    startY: currentY + 25,
    head: [['CERTIFICADO', 'DATA', 'INSTRUMENTO', 'TAG/ID', 'SÉRIE', 'STATUS']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, halign: 'center' },
    margin: { left: margin, right: margin }
  });

  // Footer with potential dynamic logo
  addStandardFooter(doc, true, template?.footerBase64);

  const fileName = `Relatorio_Certificados_${(client?.razaoSocial || 'Cliente').replace(/[^a-z0-9]/gi, '_')}_${year}.pdf`;
  doc.save(fileName);
};

export const generateQuotePdf = (quote: Quote, client: Client | undefined, documentTemplates: DocumentTemplate[] = [], returnBlobUrl: boolean = false) => {
  const template = documentTemplates.find(t => t.applyTo === 'QUOTE') || documentTemplates.find(t => t.applyTo === 'ALL');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10; // Maximized width (1.0cm) to remove any "leftover" margins
  const marginRight = 10;
  const marginTop = 35;  // 3.5cm top
  const marginBottom = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // We draw the background letterhead on page 1
  addStandardHeader({
    doc,
    title: '', 
    isCertificate: false,
    hideMeta: true,
    customLetterhead: template?.letterheadBase64
  });

  // Intercept doc.addPage to automatically draw the background
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function() {
    originalAddPage(...arguments);
    addStandardHeader({ 
      doc, 
      title: '', 
      isCertificate: false, 
      hideMeta: true, 
      customLetterhead: template?.letterheadBase64 
    });
    return doc;
  };

  // Title Block (Centered, plain text)
  let lineY = marginTop + 5; 
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`PROPOSTA COMERCIAL Nº ${quote.id}`, pageWidth / 2, lineY + 6, { align: 'center' });
  lineY += 12;

  // Client Info Grid 
  autoTable(doc, {
    startY: lineY,
    theme: 'plain', 
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 1, right: 1 }, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 22 },
      1: { cellWidth: 'auto' }, // Permite que a Razão Social/Endereço ocupe o máximo de espaço
      2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 20 }, // Reduzido (Válido até, CNPJ, Telefone)
      3: { cellWidth: 35 } // Reduzido para encaixar exato a data ou o CNPJ
    },
    body: [
      ['Emitido em:', formatDate(quote.dataEmissao), 'Válido até:', formatDate(quote.validade)],
      ['Cliente:', client?.razaoSocial || 'N/A', 'CNPJ:', quote.clienteCnpj || 'N/A'],
      ['Endereço:', { content: quote.clienteEndereco || 'N/A', colSpan: 3 }],
      ['Solicitante:', quote.clienteSolicitanteNome || 'N/A', 'Telefone:', quote.clienteSolicitanteContato || 'N/A'],
      ['E-mail:', { content: quote.clienteSolicitanteEmail || 'N/A', colSpan: 3 }],
      ['Financeiro:', quote.clienteEmailFinanceiro || 'N/A', 'Retenção:', quote.clienteRetencaoImpostoFonte ? 'SIM' : 'NÃO']
    ],
    margin: { left: marginLeft, right: marginRight }
  });

  // Top Yellow Warning
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 10, fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 0], textColor: [0, 0, 0] },
    body: [['Por gentileza, informar a periodicidade da calibração do(s) instrumento(s) no ato da aprovação.']],
    margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
  });

  // Section 1: Orçamento do Serviço Header
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 2, fontSize: 12, fontStyle: 'bold', fillColor: [180, 180, 180], textColor: [0, 0, 0] },
    body: [['1. Orçamento do Serviço']],
    margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
  });

  const parseQuoteCurrencyValue = (value: number | string | undefined) => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleaned = value
      .toString()
      .replace(/\s/g, '')
      .replace(/[^0-9,-]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
  };

  const formatQuoteCurrencyValue = (value: number | string | undefined) => {
    const num = parseQuoteCurrencyValue(value);
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalGeral = quote.items.reduce((acc, item) => acc + parseQuoteCurrencyValue(item.valorTotal), 0);
  const totalEquips = quote.items.reduce((acc, item) => acc + (item.quantidade || 0), 0);

  const currencyValues = quote.items.map(item => formatQuoteCurrencyValue(item.valorUnitarioFinal || item.valorUnitario));
  const currencyTotals = quote.items.map(item => formatQuoteCurrencyValue(item.valorTotal));
  const numericCellWidth = Math.max(...currencyValues.map(text => text.length), ...currencyTotals.map(text => text.length), formatQuoteCurrencyValue(totalGeral).length);
  const formatQuoteCurrency = (value: number | string | undefined) => {
    const amount = formatQuoteCurrencyValue(value);
    return `R$ ${amount}`;
  };

  const tableData = quote.items.map((item, i) => [
    (i + 1).toString(),
    item.descricao,
    item.quantidade.toString(),
    item.tipoServico || 'N/A',
    item.local || 'Lab',
    formatQuoteCurrency(item.valorUnitarioFinal || item.valorUnitario),
    formatQuoteCurrency(item.valorTotal)
  ]);

  // Apenas a tabela com os instrumentos tenham bordas (theme: 'grid')
  autoTable(doc, {
    // @ts-ignore
    startY: doc.lastAutoTable.finalY,
    head: [['Item', 'Descrição', 'Qtd', 'Tipo de Serviço', 'Local do Serviço', 'Valor Unit. R$', 'Valor Total R$']],
    body: tableData,
    foot: [[
      { content: 'Quantidade Total de Equipamentos', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, 
      { content: totalEquips.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '', colSpan: 2 },
      { content: 'Valor Total:', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: formatQuoteCurrency(totalGeral), styles: { halign: 'right', fontStyle: 'bold' } }
    ]],
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], fontSize: 9, fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.1, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0,0,0], lineWidth: 0.1, cellPadding: 2 },
    footStyles: { fillColor: [245, 245, 245], textColor: [0,0,0], fontSize: 9, lineColor: [0,0,0], lineWidth: 0.1, fontStyle: 'bold', cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 35, halign: 'right', cellPadding: { left: 4, right: 4, top: 4, bottom: 4 } },
      6: { cellWidth: 35, halign: 'right', cellPadding: { left: 4, right: 4, top: 4, bottom: 4 } }
    },
    didParseCell: (data: any) => {
      if ((data.section === 'body' || data.section === 'foot') && (data.column.index === 5 || data.column.index === 6)) {
        // Only blank out if it actually looks like a currency value to prevent hiding other labels
        const raw = data.cell.raw;
        let rawText = '';
        if (typeof raw === 'string') rawText = raw;
        else if (typeof raw === 'object' && raw !== null && 'content' in raw) rawText = String(raw.content);
        else rawText = String(raw || '');

        if (rawText.includes('R$')) {
          data.cell.text = [''];
        }
      }
    },
    didDrawCell: (data: any) => {
      if ((data.section === 'body' || data.section === 'foot') && (data.column.index === 5 || data.column.index === 6)) {
        const raw = data.cell.raw;
        let rawText = '';
        if (typeof raw === 'string') rawText = raw;
        else if (Array.isArray(raw)) rawText = raw.join(' ');
        else if (typeof raw === 'object' && raw !== null && 'content' in raw) rawText = String(raw.content);
        else rawText = String(raw || '');

        // Match R$ followed by optional space and then the value
        const match = rawText.match(/R\$\s*(.*)/);
        if (match) {
          const valueText = match[1].trim();
          const yPos = data.cell.y + data.cell.height / 2;
          const x = data.cell.x;
          const width = data.cell.width;
          const fontSize = data.cell.styles.fontSize || (data.section === 'foot' ? 9 : 8);
          const fontStyle = data.cell.styles.fontStyle || (data.section === 'foot' ? 'bold' : 'normal');

          data.doc.setFont('helvetica', fontStyle);
          data.doc.setFontSize(fontSize);
          data.doc.setTextColor(0, 0, 0);

          // R$ fixed to the left with 2 points padding
          data.doc.text('R$', x + 2, yPos, { baseline: 'middle', align: 'left' });
          
          // Value right-aligned with 2 points margin from the right edge
          data.doc.text(valueText, x + width - 2, yPos, { baseline: 'middle', align: 'right' });
        }
      }
    },
    margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
  });

  // RBC Yellow Warning
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 12, fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 0], textColor: [0, 0, 0] },
    body: [['Caso necessite de calibração RBC, consulte-nos!']],
    margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
  });

  // Definition 
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 2;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 10, fontStyle: 'italic', halign: 'justify', textColor: [0, 0, 0] },
    body: [['Calibração é a operação que estabelece, sob condições específicas, numa primeira etapa, uma relação entre os valores e as incertezas de medição fornecidos por padrões e as indicações correspondentes com as incertezas associadas. Não se aplicando manutenção ou ajustes.']],
    margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
  });

  // Sections 2, 3, 4 Terms
  const renderTermsTable = (title: string, data: any[][]) => {
    // 1. Gray Header
    // @ts-ignore
    let currentY = doc.lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: currentY,
      theme: 'plain',
      styles: { cellPadding: 2, fontSize: 12, fontStyle: 'bold', fillColor: [180, 180, 180], textColor: [0, 0, 0] },
      body: [[title]],
      margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
    });

    // 2. Terms Body
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY;
    autoTable(doc, {
      startY: currentY,
      body: data,
      theme: 'plain',
      styles: { cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, fontSize: 10, textColor: [0, 0, 0], overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 'wrap' },
        1: { cellWidth: 'auto', halign: 'justify' }
      },
      margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
    });
  };

  const parseTerms = (text: string | undefined, defaultTerms: any[][]) => {
    if (!text || !text.trim()) return defaultTerms;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const isPlaceholder = lines.length > 0 && lines.every(line => {
      const match = line.match(/^[\d.]+\s+(.*)$/);
      if (!match) return false;
      const content = match[1].trim();
      return content === '...' || content === '[Forma de pagamento]' || content === '[Forma de pagamento]...';
    });
    if (isPlaceholder) return defaultTerms;
    return lines.map(line => {
      const match = line.match(/^([\d.]+)\s+(.*)/);
      if (match) return [match[1], match[2]];
      return ['', line];
    });
  };

  const defaultCommercial = [
    ['2.1', quote.formaPagamento ? `[${quote.formaPagamento}]` : '[Forma de pagamento]'],
    ['2.2', 'Este orçamento tem validade de 30 dias corridos após a data de emissão.'],
    ['2.3', 'O serviço inicia-se a partir da aprovação formal, via pedido de compras ou proposta assinada.'],
    ['2.4', 'Prazo para entrega dos equipamentos é 07 dias úteis. No caso de grande quantidade, verificar data de entrega com setor comercial.'],
    ['2.5', 'Os certificados serão entregues no prazo máximo de 10 dias úteis.'],
    ['2.6', 'Será cobrado taxa de deslocamento, retirada e devolução. No caso das despesas de viagem, as mesmas deverão ser pagas nos dias que antecederem a ida do(s) técnico(s).']
  ];

  const defaultTechnical = [
    ['3.1', 'O equipamento deve acompanhar todos os cabos, acessórios e softwares necessários para execução da calibração.'],
    ['3.2', 'Os certificados de calibração acreditada atende aos requisitos da Norma ABNT NBR ISO/IEC 17025.'],
    ['3.3', 'Os certificado de calibração de serviço acreditado RBC serão emitidos com o símbolo de acreditação, enquanto que os certificados de calibração de serviço rastreável RBC serão emitidos sem o símbolo de acreditação.'],
    ['3.4', 'A calibração não compreende garantia de aprovação do instrumento.'],
    ['3.5', 'Ajustes, manutenções e/ou trocas de componentes não pertence ao escopo de acreditação do Laboratório.']
  ];

  const defaultGeneral = [
    ['4.1', 'Horário de recebimento e entrega de equipamentos no Laboratório: segunda a sexta-feira das 08h00 às 17h00.'],
    ['4.2', 'Horário de coleta e devolução de equipamentos: segunda a sexta-feira das 08h00 às 15h00.'],
    ['4.3', 'A calibração in loco é realizada somente em horário comercial. Caso seja necessário fora do horário comercial, informar setor comercial para verificar possibilidade.'],
    ['4.4', 'Caso seja necessária a realização de integração do(s) técnico(s) para a realização do serviço, pedimos que nos informem com antecedência sobre, bem como a lista de documentos em geral que serão precisos.'],
    ['4.5', 'Os certificados serão enviados somente por e-mail, após a conclusão do serviço. Certificados físicos fora do perimetro urbano de Manaus é de responsabilidade do cliente.'],
    ['4.6', 'Será cobrado para emissão de laudo.']
  ];

  renderTermsTable('2. Condições Comerciais', parseTerms(template?.commercialConditions, defaultCommercial).map(term => {
    // Dynamic replacement for payment terms if user typed it
    if (term[1] && term[1].includes('[Forma de pagamento]')) {
       return [term[0], term[1].replace('[Forma de pagamento]', `[${quote.formaPagamento || 'A Combinar'}]`)];
    }
    return term;
  }));

  renderTermsTable('3. Informações Técnicas', parseTerms(template?.technicalInformation, defaultTechnical));
  renderTermsTable('4. Condições Gerais', parseTerms(template?.generalConditions, defaultGeneral));

  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 10;
  
  if (quote.observacoes) {
    autoTable(doc, {
      startY: lineY,
      theme: 'plain',
      styles: { cellPadding: 2, fontSize: 10, textColor: [0, 0, 0] },
      body: [
        [{ content: 'Observações:', styles: { fontStyle: 'bold' } }],
        [quote.observacoes]
      ],
      margin: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }
    });
    // @ts-ignore
    lineY = doc.lastAutoTable.finalY + 10;
  }

  if (lineY > (doc.internal.pageSize.getHeight() - marginBottom - 10)) { 
    doc.addPage(); // This will auto-trigger the hook and draw the letterhead!
    lineY = marginTop + 10; 
  }
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
  doc.text('Colocamo-nos ao seu dispor, para os eventuais esclarecimentos adicionais que se fizerem necessários.', pageWidth / 2, lineY, { align: 'center' });

  addStandardFooter(doc, false, template?.footerBase64);
  
  if (returnBlobUrl) {
    return doc.output('bloburl');
  } else {
    doc.save(`Orcamento_${quote.id}.pdf`);
  }
};

export const generateServiceOrderPdf = (
  os: ServiceOrder, 
  client: Client | undefined, 
  quote: Quote | undefined, 
  documentTemplates: DocumentTemplate[] = [],
  preview: boolean = false
) => {
  const template = documentTemplates.find(t => t.id === 'OS' || t.applyTo === 'OS') || documentTemplates.find(t => t.applyTo === 'ALL');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // Custom Header: Focus on the Title and O.S. ID
  const drawCustomOSHeader = (document: jsPDF, title: string) => {
    // Letterhead
    if (template?.letterheadBase64) {
      try {
        document.addImage(template.letterheadBase64, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      } catch (e) {}
    } else {
        try {
            document.addImage(GENERAL_LETTERHEAD, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        } catch (e) {}
    }

    document.setTextColor(...primaryBlue);
    document.setFont('helvetica', 'bold');
    document.setFontSize(14);
    
    let headerText = `${title} Nº ${os.id}`;
    document.text(headerText.toUpperCase(), pageWidth / 2, 50, { align: 'center' });
    return 60;
  };

  // --- PARTE 1: Ordem de Serviço (Administrativa) ---
  let currentY = drawCustomOSHeader(doc, 'ORDEM DE SERVIÇO');

  // Dados do Cliente e Referências (Estruturado conforme solicitado)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      3: { cellWidth: 40 }
    },
    body: [
      ['DATA DE EMISSÃO:', formatDate(os.dataEmissao || os.dataEntrada), 'ORÇAMENTO:', os.orcamentoId],
      ['RAZÃO SOCIAL:', { content: client?.razaoSocial || 'N/A', colSpan: 3 }],
      ['ENDEREÇO:', { content: client?.enderecoPrincipal || 'N/A', colSpan: 3 }],
      ['END. COLETA:', { content: client?.enderecoColeta || client?.enderecoPrincipal || 'N/A', colSpan: 3 }],
      ['RESPONSÁVEL:', quote?.clienteSolicitanteNome || '—', 'TELEFONE:', quote?.clienteSolicitanteContato || '—'],
      ['E-MAIL CERT.:', { content: quote?.clienteSolicitanteEmail || '—', colSpan: 3 }]
    ],
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 5;

  // Conteúdo Técnico
  if (quote?.observacoes) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES TÉCNICAS:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(quote.observacoes, pageWidth - margin * 2);
    doc.text(splitObs, margin, currentY + 4);
    currentY += (splitObs.length * 4) + 8;
  }

  // Tabela de Itens (Consolidada)
  if (quote) {
    const tableData = quote.items.map((item, i) => [
      (i+1).toString(),
      item.descricao,
      item.quantidade.toString(),
      item.tipoServico || 'Calibraçao',
      item.local || 'Laboratório'
    ]);

    const totalEquips = quote.items.reduce((acc, item) => acc + (item.quantidade || 0), 0);

    autoTable(doc, {
      startY: currentY,
      head: [['ITEM', 'DESCRIÇÃO', 'QTD', 'TIPO DE SERVIÇO', 'LOCAL']],
      body: tableData,
      foot: [[
        { content: 'TOTAL DE EQUIPAMENTOS:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalEquips.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
        { content: '', colSpan: 2 }
      ]],
      theme: 'grid',
      headStyles: { fillColor: primaryBlue, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'left' },
      footStyles: { fillColor: [240, 240, 240], textColor: primaryBlue, fontSize: 8, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10;
  }

  // --- PARTE 2: Protocolo de Campo (Manual) ---
  if (currentY > pageHeight - 65) { doc.addPage(); currentY = drawCustomOSHeader(doc, 'ORDEM DE SERVIÇO') + 5; }

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlue);
  doc.text('CHECKLIST DE EXECUÇÃO (PREENCHIMENTO MANUAL)', margin, currentY);
  doc.setTextColor(20, 20, 20);
  currentY += 6;

  const checklistFields = [
    'Quantidade de equipamentos realizados: ________________________________',
    'Quantidade de equipamentos não disponíveis: ____________________________',
    'Quantidade de equipamentos não encontrados: ___________________________',
    'Quantidade de equipamentos não operantes: _____________________________',
    'Quantidade de equipamentos coletados: ________________________________'
  ];

  doc.setFont('helvetica', 'normal');
  checklistFields.forEach(field => {
    doc.text(field, margin + 5, currentY);
    currentY += 6;
  });

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDAÇÃO DO CLIENTE:', margin, currentY);
  currentY += 8;

  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const vWidth = (pageWidth - margin * 2) / 2;
  
  doc.text('Nome: ________________________________', margin, currentY);
  doc.text('Empresa/Setor: ________________________', margin + vWidth, currentY);
  currentY += 8;
  doc.text('Cargo: _______________________________', margin, currentY);
  doc.text('Telefone: _____________________________', margin + vWidth, currentY);
  currentY += 12;
  doc.text('Data: ____/____/____', margin, currentY);
  doc.text('Assinatura: ___________________________', margin + vWidth, currentY);

  // --- PARTE 3: Relatório de Serviço Externo (Operacional) ---
  doc.addPage();
  currentY = drawCustomOSHeader(doc, 'RELATÓRIO DE SERVIÇO EXTERNO');

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`CLIENTE: ${client?.razaoSocial || 'N/A'}`, margin, currentY);
  currentY += 8;

  // Tabela Desmembrada com 5 colunas de Status e Numbering Contínuo
  if (quote) {
    const decomposedData: any[][] = [];
    let globalCounter = 1;
    quote.items.forEach((item, itemIdx) => {
      const qty = item.quantidade || 1;
      for (let i = 0; i < qty; i++) {
        decomposedData.push([
          `${globalCounter}.${itemIdx + 1}`, // Pattern: GlobalCounter.OSItemIndex (ex: 1.1, 2.1, 3.2...)
          '',
          item.descricao,
          '',
          '', '', '', '', ''
        ]);
        globalCounter++;
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['ITEM', 'Nº CERTIFICADO', 'DESCRIÇÃO DO INSTRUMENTO', 'ID-SN (CLIENTE)', '1', '2', '3', '4', '5']],
      body: decomposedData,
      theme: 'grid',
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, minCellHeight: 8, halign: 'center' },
    });
  }

  addStandardFooter(doc, false, template?.footerBase64);
  
  if (preview) {
    return doc.output('bloburl');
  }
  doc.save(`OS_Relatorio_Campo_${os.id}.pdf`);
};

export const generateProtocolPdf = (
  os: ServiceOrder, 
  client: Client | undefined, 
  quote: Quote | undefined, 
  type: 'retirada' | 'entrega', 
  items: { descricao: string; quantidade: number; identificacao: string; estado: string }[],
  employee: { nome: string; cargo: string },
  clientResponsible: { nome: string; cargo: string },
  documentTemplates: DocumentTemplate[] = [],
  preview: boolean = false
) => {
  const template = documentTemplates.find(t => t.id === 'LOGISTICS_PROTOCOL' || t.applyTo === 'LOGISTICS_PROTOCOL') || documentTemplates.find(t => t.applyTo === 'ALL');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // 1. Cabeçalho Unificado (Mesmo da O.S.)
  const drawCustomHeader = (document: jsPDF, title: string) => {
    if (template?.letterheadBase64) {
      try { document.addImage(template.letterheadBase64, 'PNG', 0, 0, 210, 297, undefined, 'FAST'); } catch (e) {}
    } else {
      try { document.addImage(GENERAL_LETTERHEAD, 'PNG', 0, 0, 210, 297, undefined, 'FAST'); } catch (e) {}
    }
    document.setTextColor(...primaryBlue);
    document.setFont('helvetica', 'bold');
    document.setFontSize(14);
    document.text(title.toUpperCase(), pageWidth / 2, 50, { align: 'center' });
    return 60;
  };

  const title = type === 'retirada' ? 'PROTOCOLO DE RETIRADA' : 'PROTOCOLO DE ENTREGA';
  const opLabel = type === 'retirada' ? 'COLETA' : 'ENTREGA';
  let currentY = drawCustomHeader(doc, title);

  // 2. Dados da O.S. e Cliente (Layout O.S.)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      3: { cellWidth: 40 }
    },
    body: [
      ['ORDEM DE SERVIÇO:', os.id, 'ORÇAMENTO:', os.orcamentoId],
      ['RAZÃO SOCIAL:', { content: client?.razaoSocial || 'N/A', colSpan: 3 }],
      ['ENDEREÇO:', { content: client?.enderecoPrincipal || 'N/A', colSpan: 3 }],
      ['RESPONSÁVEL:', quote?.clienteSolicitanteNome || '—', 'TELEFONE:', quote?.clienteSolicitanteContato || '—']
    ],
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 10;

  // 3. Tabela Retilínea de Movimentação
  const tableData = items.map((item, i) => [
    (i + 1).toString(),
    item.descricao,
    item.quantidade.toString()
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['ITEM', 'DESCRIÇÃO', 'QTD']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryBlue, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, halign: 'center', minCellHeight: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 20 }
    },
    margin: { left: margin, right: margin, bottom: 20 }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text(`DATA DA ${opLabel}/DADOS COMPLEMENTARES:`, margin, currentY);
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA DA ${opLabel}: ________________`, margin, currentY);
  currentY += 12;

  // 4. Identificação dos Envolvidos
  if (currentY > pageHeight - 60) { doc.addPage(); currentY = 60; }

  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DOS ENVOLVIDOS:', margin, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, minCellHeight: 15 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
    body: [
      [
        'EXECUTANTE (METROFLOW):', 
        { content: `NOME: ${employee.nome}\nCARGO: ${employee.cargo}`, styles: { halign: 'left' } }
      ],
      [
        'RESP. CLIENTE (MANUAL):', 
        { content: '\nNOME: ___________________________________________________\n\nCARGO: __________________________________________________\n\nTEL: ____________________________________________________\n\nASSINATURA: _____________________________________________\n', styles: { halign: 'left' } }
      ]
    ],
    margin: { left: margin, right: margin }
  });

  // Timestamp automático
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(`Protocolo emitido em: ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 15);

  addStandardFooter(doc, false, template?.footerBase64);
  
  if (preview) {
    return doc.output('bloburl');
  }
  doc.save(`Protocolo_${type}_${os.id}.pdf`);
};


export const generateCautelaPdf = (custody: StandardCustody, resolvedItems: { nome: string; identificacao: string; quantidade: number }[], employeeName: string, documentTemplates: DocumentTemplate[] = []) => {
  const template = documentTemplates.find(t => t.id === 'CAUTELA' || t.applyTo === 'CAUTELA') || documentTemplates.find(t => t.applyTo === 'ALL');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // 1. Cabeçalho e Identificação de Fluxo
  const currentY = addStandardHeader({
    doc,
    title: 'CAUTELA DE EQUIPAMENTOS',
    documentNumber: custody.id,
    date: custody.dataSaida,
    isCertificate: false,
    customLetterhead: template?.letterheadBase64
  });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);

  autoTable(doc, {
    startY: currentY + 5,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Origem:', 'Laboratório Central'],
      ['Responsável pela Emissão/Saída:', employeeName],
      ['Destino:', custody.destino || '—'],
      ['Responsável pelo Recebimento:', custody.responsavel || '—']
    ],
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  let y = doc.lastAutoTable.finalY + 8;

  // 2. Corpo do Documento (Tabela de Ativos)
  const tableData = resolvedItems.map((item, i) => [
    (i + 1).toString(),
    item.quantidade.toString(),
    item.nome,
    item.identificacao || '—'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['ITEM', 'QTD', 'DESCRIÇÃO DO EQUIPAMENTO', 'ID / PATRIMÔNIO / SN']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryBlue, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', lineWidth: 0.1 },
    bodyStyles: { fontSize: 8, halign: 'center', minCellHeight: 6, textColor: [0, 0, 0], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 15 },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 50 }
    },
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10;

  // 3. Termo de Responsabilidade
  if (y > pageHeight - 60) { doc.addPage(); y = 60; }
  
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const termText = "O responsável abaixo assinado declara ter recebido os equipamentos em perfeito estado de conservação e funcionamento, comprometendo-me a zelar pela sua integridade e devolvê-los na data aprazada, sob pena de responsabilidade por danos ou extravios.";
  const termWidth = pageWidth - (margin * 2);
  const termLines = doc.splitTextToSize(termText, termWidth);
  doc.text(termText, margin, y, { align: 'justify', maxWidth: termWidth });
  y += (termLines.length * 4) + 10;

  // 4. Rodapé e Validação (Data Automática)
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const today = new Date();
  const dateStr = `Manaus, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;
  doc.text(dateStr, margin, y);
  y += 20;

  // Bloco de Assinaturas
  const sigWidth = 55;
  const spacing = (pageWidth - margin * 2 - sigWidth * 3) / 2;
  
  const drawSig = (x: number, label: string) => {
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.1);
    doc.line(x, y, x + sigWidth, y);
    doc.setFontSize(7);
    doc.text(label, x + sigWidth / 2, y + 4, { align: 'center' });
  };

  drawSig(margin, 'Responsável Almoxarifado');
  drawSig(margin + sigWidth + spacing, 'Responsável de Origem');
  drawSig(pageWidth - margin - sigWidth, 'Portaria / Recebedor Destino');

  addStandardFooter(doc, false, template?.footerBase64);
  doc.save(`Cautela_${custody.id}.pdf`);
};

export const generateStandardInstrumentPdf = (si: StandardInstrument, documentTemplates: DocumentTemplate[] = []) => {
  const template = documentTemplates.find(t => t.id === 'INSTRUMENT_SHEET' || t.applyTo === 'INSTRUMENT_SHEET');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const currentY = addStandardHeader({
    doc,
    title: 'FICHA DE EQUIPAMENTO PADRÃO',
    documentNumber: si.identificacao,
    isCertificate: false,
    customLetterhead: template?.letterheadBase64
  });

  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);

  let y = currentY + 10;
  const rowSpacing = 8;
  const addLine = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, y);
    y += rowSpacing;
  };

  addLine('Nome / Descrição', si.nome);
  addLine('Identificação (TAG)', si.identificacao);
  addLine('N° Certificado', si.certificadoCalibracao);
  addLine('Órgão Calibrador', si.orgaoCalibrador);
  addLine('Resolução', si.resolucao);
  addLine('Incerteza', (si.uncertainty?.toString() || 'N/A') + ' ' + si.unidadeMedida);
  addLine('Periodicidade', si.periodicidade);
  addLine('Validade', si.dataValidadeCalibracao ? formatDate(si.dataValidadeCalibracao) : 'N/A');

  addStandardFooter(doc, false, template?.footerBase64);
  doc.save(`Ficha_Padrao_${si.identificacao}.pdf`);
};
