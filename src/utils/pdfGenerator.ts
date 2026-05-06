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
  Employee,
  ThirdPartyRecord,
  MeasurementGroup
} from '../types';
import { formatDate, formatCurrency, parseNumericInput, formatStandardValidity } from './formatters';
import { getMetrologyValue } from './metrologyMapper';
import { getDefaultMetrologyField } from '../metrologyDefaults';
import { urlToBase64 } from './imageUtils';
import { GENERAL_LETTERHEAD, CERTIFICATE_LETTERHEAD } from './letterheads';
import Chart from 'chart.js/auto';

const findPointCalculation = (record: any, group: any, p: number, repetitions: number, groupIndex?: number) => {
    if (!record.calculatedPoints) return null;
    
    const rowIndexPoint = p * repetitions;
    const suffixes = [`_row${rowIndexPoint}`, `-${p}`];
    const prefixes = [group.blockId, group.name, group.groupName];
    
    // 1. Tenta por chaves explícitas (ID da tabela + Índice da linha)
    for (const pref of prefixes) {
        if (!pref) continue;
        for (const suff of suffixes) {
            const key = `${pref}${suff}`;
            if (record.calculatedPoints[key]) return record.calculatedPoints[key];
        }
    }

    // 2. Fallback de Segurança: Se não achou por ID, tenta por posição absoluta (gi_rowRI)
    // Isso resolve casos onde o blockId mudou no designer mas o registro mantém a ordem original.
    if (groupIndex !== undefined) {
        const fallbackKey = `${groupIndex}_row${rowIndexPoint}`;
        if (record.calculatedPoints[fallbackKey]) return record.calculatedPoints[fallbackKey];
    }
    
    // 3. Fallback Final: Busca o valor em qualquer chave que termine com o índice da linha
    // Útil para migrações de dados legados
    const lastResortKey = Object.keys(record.calculatedPoints).find(k => k.endsWith(`_row${rowIndexPoint}`));
    if (lastResortKey) return record.calculatedPoints[lastResortKey];

    return null;
};

/**
 * Normalizes text for PDF generation to avoid character corruption.
 * Standard PDF fonts (Helvetica/Times) only support WinAnsiEncoding.
 */
const fixPdfText = (text: any): string => {
    if (text === undefined || text === null) return '';
    const str = String(text);
    return str
        .replace(/±/g, '±') // Standard encoding usually works for this
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/°/g, '°');
};

/**
 * Filtra e ordena os grupos do registro de acordo com a estrutura da máscara.
 * Isso garante que apenas o que está na máscara apareça no PDF, na ordem correta,
 * e evita que dados duplicados ou legados no registro causem "fantasmas".
 */
const getEffectiveGroups = (record: any, mask: CertificateMask | undefined | null) => {
    const effective: { group: any; maskGroup: MeasurementGroup; gi: number; section?: any }[] = [];
    if (!record.groups || record.groups.length === 0) return effective;

    const usedRecordIndices = new Set<number>();

    const findMatch = (mg: MeasurementGroup, section?: any) => {
        // 1. Busca por blockId (mais seguro)
        let foundIdx = record.groups.findIndex((g: any, idx: number) => 
            !usedRecordIndices.has(idx) && mg.blockId && g.blockId === mg.blockId
        );

        // 2. Fallback por nome
        if (foundIdx === -1) {
            foundIdx = record.groups.findIndex((g: any, idx: number) => 
                !usedRecordIndices.has(idx) && (g.groupName === mg.name || g.name === mg.name)
            );
        }

        if (foundIdx !== -1) {
            effective.push({ 
                group: record.groups[foundIdx], 
                maskGroup: mg, 
                gi: foundIdx,
                section
            });
            usedRecordIndices.add(foundIdx);
        }
    };

    if (mask?.sections && mask.sections.length > 0) {
        mask.sections.forEach(sec => {
            if (sec.groups) sec.groups.forEach(mg => findMatch(mg, sec));
        });
    } else if (mask?.measurementGroups && mask.measurementGroups.length > 0) {
        mask.measurementGroups.forEach(mg => findMatch(mg));
    } else {
        // Caso não haja estrutura na máscara (improvável), mantém comportamento original como fallback de segurança
        record.groups.forEach((g: any, idx: number) => {
            const mg = findGroupMask(mask, g);
            if (mg) effective.push({ group: g, maskGroup: mg, gi: idx });
        });
    }

    return effective;
};

/**
 * Custom renderer for cells that contain scientific symbols (like Ω).
 * Since standard PDF fonts don't support these, we manually draw 
 * the text switching between Helvetica and Symbol fonts.
 */
const drawCellWithSymbols = (data: any, doc: jsPDF) => {
    const { cell, cursor } = data;
    const originalText = cell.raw ? String(cell.raw) : '';
    
    if (!originalText.includes('Ω')) return;

    // We don't clear the background because autoTable already drew it
    // We just need to draw the text correctly since we suppressed it in willDrawCell
    
    const paddingLeft = cell.padding('left');
    const paddingRight = cell.padding('right');
    const cellWidth = cell.width - paddingLeft - paddingRight;
    
    // Calculate vertical position (approximate centering)
    const fontSize = cell.styles.fontSize || 8;
    const fontHeight = fontSize * 0.352778; // points to mm
    const currentY = cursor.y + (cell.height / 2) + (fontHeight / 3); 
    
    let currentX = cursor.x + paddingLeft;
    
    // Handle alignment
    if (cell.styles.halign === 'center') {
        // We need to calculate total mixed width first
        let totalWidth = 0;
        const parts = originalText.split('Ω');
        for (let i = 0; i < parts.length; i++) {
            doc.setFont('helvetica', cell.styles.fontStyle || 'normal');
            doc.setFontSize(fontSize);
            totalWidth += doc.getTextWidth(parts[i]);
            if (i < parts.length - 1) {
                doc.setFont('Symbol');
                totalWidth += doc.getTextWidth('W');
            }
        }
        currentX = cursor.x + (cell.width / 2) - (totalWidth / 2);
    } else if (cell.styles.halign === 'right') {
         // Similar logic for right alignment... but center/left is enough for now
    }

    const segments = originalText.split('Ω');
    for (let i = 0; i < segments.length; i++) {
        // Normal text
        if (segments[i]) {
            doc.setFont('helvetica', cell.styles.fontStyle || 'normal');
            doc.setFontSize(fontSize);
            doc.setTextColor(0, 0, 0);
            doc.text(segments[i], currentX, currentY);
            currentX += doc.getTextWidth(segments[i]);
        }
        
        // Omega symbol
        if (i < segments.length - 1) {
            doc.setFont('Symbol');
            doc.setFontSize(fontSize);
            doc.setTextColor(0, 0, 0);
            doc.text('W', currentX, currentY); // W in Symbol font is Ω
            currentX += doc.getTextWidth('W');
        }
    }
};

/**
 * Robustly finds the corresponding mask group definition for a given record group.
 * Prioritizes blockId (strict), then name/groupName matching.
 */
const findGroupMask = (mask: any | undefined | null, group: any): any | null => {
    if (!mask) return null;
    
    const searchInGroups = (groups: any[]): any | null => {
        // 1. Prioridade Máxima: blockId (ID lógico estável) - Apenas se ambos existirem e não forem vazios
        const gBlockId = group.blockId || group.id; // Suporte a blockId ou id legado no registro
        if (gBlockId && typeof gBlockId === 'string' && gBlockId.trim()) {
            const found = groups.find(mg => mg.blockId === gBlockId);
            if (found) return found;
        }

        // 2. Segunda Prioridade: Nome exato (Case sensitive)
        const gName = group.groupName || group.name;
        if (gName && typeof gName === 'string') {
            const found = groups.find(mg => mg.name === gName);
            if (found) return found;
        }

        // 3. Fallback: Nome case-insensitive (apenas se for uma string válida)
        if (gName && typeof gName === 'string') {
            const upperName = gName.toUpperCase();
            const found = groups.find(mg => (mg.name || '').toUpperCase() === upperName);
            if (found) return found;
        }

        return null;
    };

    // Tenta em seções (novo formato)
    if (mask.sections && mask.sections.length > 0) {
        for (const section of mask.sections) {
            const found = searchInGroups(section.groups || []);
            if (found) return found;
        }
    }

    // Tenta em measurementGroups (formato legado)
    if (mask.measurementGroups && mask.measurementGroups.length > 0) {
        return searchInGroups(mask.measurementGroups);
    }

    return null;
};

const generateChartImage = async (group: any, record: any, groupMask: any, groupIndex?: number): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800; // High resolution for PDF
            canvas.height = 300;
            
            // Extract data
            const labels = [];
            const errors = [];
            const uncertainties = [];
            
            const repetitions = Math.max(1, groupMask?.repetitions ?? 1);
            const numPoints = Math.ceil(group.rows.length / repetitions);

            // Obter definições do registro (prioridade) ou da máscara (fallback)
            const definitions = group.columnDefinitions || groupMask?.columnDefinitions || [];
            const hiddenCols = group.hiddenColumns || groupMask?.hiddenColumns || [];
            const visibleDefs = definitions.filter((d: any) => !hiddenCols.includes(d.id));
            
            for (let p = 0; p < numPoints; p++) {
                const calc = findPointCalculation(record, group, p, repetitions, groupIndex);
                if (calc) {
                    const row = group.rows[p * repetitions];
                    
                    // 1. Identificar X (Referência/VVC) - Busca por Tipo, ID, Nome ou Comportamento
                    const refDef = visibleDefs.find((d: any) => d.type === ColumnType.VVC) || 
                                   visibleDefs.find((d: any) => d.id?.toUpperCase().includes('VVC')) ||
                                   visibleDefs.find((d: any) => d.metrologyField === 'vvc') ||
                                   visibleDefs.find((d: any) => d.name?.toUpperCase().includes('VALOR VERDADEIRO')) ||
                                   visibleDefs.find((d: any) => d.name?.toUpperCase().includes('REFERENCIA')) ||
                                   visibleDefs.find((d: any) => d.behavior === ColumnBehavior.INPUT); // Fallback para a primeira entrada
                    
                    const xLabel = (refDef && row && row[refDef.id] !== undefined) ? row[refDef.id] : (row && row['VVC'] !== undefined ? row['VVC'] : `P. ${p+1}`);
                    labels.push(xLabel);

                    // 2. Extração Robusta de Erro e Incerteza (Prioridade: Tipo > Campo > Nome)
                    let errorVal = 0;
                    let uncVal = 0;
                    let errorFound = false;
                    let uncFound = false;

                    // Pass 1: Strict Match (Type or metrologyField)
                    visibleDefs.forEach(def => {
                        const val = calc[def.id];
                        if (val === undefined || val === null) return;
                        const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;

                        if (def.type === ColumnType.ERRO || def.metrologyField === 'error' || def.metrologyField === 'ERRO') {
                            errorVal = numVal;
                            errorFound = true;
                        }
                        if (def.type === ColumnType.INCERTEZA || def.metrologyField === 'uncertainty' || def.metrologyField === 'U') {
                            uncVal = numVal;
                            uncFound = true;
                        }
                    });

                    // Pass 2: Fallback Match (Name or ID) - Only if not found in Pass 1
                    if (!errorFound || !uncFound) {
                        visibleDefs.forEach(def => {
                            const val = calc[def.id];
                            if (val === undefined || val === null) return;
                            const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
                            const idUpper = def.id?.toUpperCase() || '';
                            const nameUpper = (def.name || '').toUpperCase();

                            if (!errorFound && (idUpper.includes('ERRO') || nameUpper.includes('ERRO'))) {
                                errorVal = numVal;
                                errorFound = true;
                            }
                            if (!uncFound && (idUpper.includes('INCERTEZA') || idUpper === 'U' || nameUpper.includes('INCERTEZA') || nameUpper === 'U')) {
                                uncVal = numVal;
                                uncFound = true;
                            }
                        });
                    }

                    errors.push(errorVal);
                    uncertainties.push(uncVal);
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
            
            // Allow minimal tick for canvas to render (increased for reliability)
            setTimeout(() => {
                resolve(canvas.toDataURL('image/png'));
            }, 150);
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

export const loadRemoteImage = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  try {
    const base64 = await urlToBase64(url);
    if (base64 && base64.startsWith('data:image')) return base64;
    return url;
  } catch (error) {
    console.warn("Could not convert image to base64, using original URL:", url);
    return url;
  }
};

const getImageFormat = (dataUrl: string): any => {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return undefined; // Let jsPDF try to auto-detect
};

const addImageToDoc = async (doc: jsPDF, imageData: string, x: number, y: number, w: number, h: number) => {
  if (!imageData || imageData.length < 10) return;
  
  // Ensure numeric coordinates to avoid NaN errors in jsPDF
  const safeX = Number(x) || 0;
  const safeY = Number(y) || 0;
  const safeW = Number(w) || 10;
  const safeH = Number(h) || 10;

  return new Promise<void>((resolve) => {
    try {
      const format = imageData.startsWith('data:image') ? getImageFormat(imageData) : undefined;
      
      if (imageData.startsWith('http')) {
        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        img.src = imageData;
        img.onload = () => {
          try {
            doc.addImage(img, format || 'PNG', safeX, safeY, safeW, safeH, undefined, 'FAST');
          } catch (e) {
            console.error("Error drawing image object:", e);
          }
          resolve();
        };
        img.onerror = () => {
          console.warn("Failed to load image URL for PDF (likely CORS):", imageData);
          resolve();
        };
      } else {
        doc.addImage(imageData, format || 'PNG', safeX, safeY, safeW, safeH, undefined, 'FAST');
        resolve();
      }
    } catch (e) {
      console.error("Critical error in addImageToDoc:", e);
      resolve();
    }
  });
};

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
  if (letterhead) {
    try {
      const format = letterhead.startsWith('data:image') ? getImageFormat(letterhead) : 'PNG';
      doc.addImage(letterhead, format, 0, 0, 210, 297, undefined, 'FAST');
    } catch (e) {
      console.warn("Erro ao adicionar timbrado ao documento (ignorado para evitar crash):", e);
    }
  }
  
  // Ensure headerTitleY and pageWidth are always finite numbers
  const headerTitleY = 48; 
  const safePageWidth = Number.isFinite(pageWidth) && pageWidth > 0 ? pageWidth : 210;

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(title.length > 30 ? 16 : 18);
  
  doc.text((title || '').toUpperCase(), safePageWidth / 2, headerTitleY, { align: 'center' });

  if (subtitle && typeof subtitle === 'string') {
    doc.setFontSize(10);
    doc.text(subtitle, safePageWidth / 2, headerTitleY + 6, { align: 'center' });
  }

  if (!hideMeta) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);

    if (documentNumber) {
      doc.text(`Nº do Documento: ${documentNumber}`, margin, headerTitleY + 12);
    }
    
    const displayDate = date || new Date().toLocaleDateString('pt-BR');
    doc.text(`Data da Emissão: ${displayDate}`, safePageWidth - margin, headerTitleY + 12, { align: 'right' });
    
    return headerTitleY + 22;
  }

  return headerTitleY + 10;
};

export const addStandardFooter = (doc: jsPDF, isCertificate: boolean = false, customFooter?: string, extraLegend?: string, legendStartPage: number = 1) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    if (customFooter) {
      try {
        const format = customFooter.startsWith('data:image') ? getImageFormat(customFooter) : 'PNG';
        // Desenha o rodapé na base (Y=267mm, Altura=30mm)
        doc.addImage(customFooter, format, 0, 267, 210, 30, undefined, 'FAST');
      } catch (e) {
        console.error("Erro ao adicionar rodapé:", e);
      }
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    
    if (extraLegend && i >= legendStartPage) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); 
      doc.text(extraLegend, pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
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
  const marginX = 20;
  const marginTop = 35; // Standardized margin
  const marginBottom = 25; 
  const contentWidth = pageWidth - marginX * 2;

  const mask = record.maskSnapshot || certificateMasks.find(m => m.id === record.certificateMaskId);
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

  const template = documentTemplates.find(t => t.id === 'CALIBRATION_CERTIFICATE') || 
                   documentTemplates.find(t => t.applyTo === 'CALIBRATION_CERTIFICATE') ||
                   documentTemplates.find(t => t.applyTo === 'ALL');

  let letterhead = template?.letterheadBase64;
  if (record.isAccredited && template?.accreditedLetterheadBase64) {
    letterhead = template.accreditedLetterheadBase64;
  }
  
  let footerImage = template?.footerBase64;
  
  // Pre-load remote images if necessary to avoid async issues
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  if (footerImage?.startsWith('http')) footerImage = await loadRemoteImage(footerImage);

  function drawBackgrounds(d: jsPDF) {
    if (letterhead) {
       const format = letterhead.startsWith('data:image') ? getImageFormat(letterhead) : 'PNG';
       d.addImage(letterhead, format, 0, 0, 210, 297, undefined, 'FAST');
    }
    if (footerImage) {
       const format = footerImage.startsWith('data:image') ? getImageFormat(footerImage) : 'PNG';
       d.addImage(footerImage, format, 0, 267, 210, 30, undefined, 'FAST');
    }
  }

  // Draw first page background manually
  drawBackgrounds(doc);

  const callHeader = (document: jsPDF) => {
    currentY = addStandardHeader({
      doc: document,
      title: '', 
      isCertificate: true,
      hideMeta: true,
      customLetterhead: letterhead
    });
    
    currentY = marginTop; 
    
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
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }
  
  currentY = drawSectionTitle(`2. DADOS DO INSTRUMENTO${isTest ? '' : 'S'}:`, currentY);
  
  doc.setFillColor(...secondaryColor);
  const tarjaHeight = 8;
  doc.rect(marginX, currentY, contentWidth, tarjaHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text((record.instrumentName || '').toUpperCase(), pageWidth / 2, currentY + 5.5, { align: 'center' });
  currentY += tarjaHeight + 6; // Espaço de segurança aumentado

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
  doc.setFont('helvetica', 'bold'); doc.text(record.nextCalibrationDate ? formatStandardValidity(record.nextCalibrationDate) : 'N/A', rightValueX, currentY);
  currentY += lineSpacing;

  doc.setFont('helvetica', 'normal'); doc.text(`Local d${isTest ? 'o ensaio' : isMaintenance ? 'o teste' : 'a calibração'}:`, leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.calibrationLocation || 'N/A', leftValueX, currentY);
  currentY += sectionSpacing;

  // 3. CONDIÇÕES AMBIENTAIS DURANTE A CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }
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

  const envStandard = record.envStandardInstrumentSnapshot || standardInstruments.find(si => si.id === record.envStandardInstrumentId);
  if (envStandard) {
    doc.setFontSize(7);
    doc.text(`P: (Termohigrômetro, código ${envStandard.identificacao || '-'}, certificado n° ${envStandard.certificadoCalibracao || '-'} emitido por ${envStandard.orgaoCalibrador}, válido até ${formatStandardValidity(envStandard.dataValidadeCalibracao)})`, leftX + 5, currentY);
  }
  currentY += sectionSpacing;

  // 4. PROCEDIMENTO DE CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 20) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }
  currentY = drawSectionTitle(`4. PROCEDIMENTO DE ${wordCalibration}:`, currentY);
  
  const procedure = procedures.find(p => p.id === record.procedureId || (p.code && p.code === record.procedureId));
  
  const procTitle = procedure 
    ? (`${procedure.code ? procedure.code + ' - ' : ''}${procedure.title}`) 
    : (mask?.title ? `Baseado em: ${mask.title}` : 'Procedimento não especificado');
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const procLines = doc.splitTextToSize(`4.1 ${procTitle}`, contentWidth - 10);
  doc.text(procLines, marginX + 5, currentY);
  currentY += (procLines.length * lineSpacing) + sectionSpacing - lineSpacing;

  // 5. PADRÕES UTILIZADOS
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }
  currentY = drawSectionTitle('5. PADRÃO(ÕES) UTILIZADO(S):', currentY);

  const serviceStandards = record.standardInstrumentsSnapshot || standardInstruments.filter(si => record.standardInstrumentIds?.includes(si.id));
  if (serviceStandards.length > 0) {
    const tableData = serviceStandards.map(si => [
      si.identificacao || '-',
      si.nome || '-',
      si.certificadoCalibracao || '-',
      si.orgaoCalibrador || '-',
      formatStandardValidity(si.dataValidadeCalibracao)
    ]);
    autoTable(doc, {
      startY: currentY,
      head: [['ID', 'Descrição', 'Certificado n.º', 'Órgão Calibrador', 'Validade']],
      body: tableData,
      theme: 'plain',
      styles: { cellPadding: 2 },
      headStyles: { fillColor: false, textColor: [0,0,0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [0,0,0], halign: 'center' },
      margin: { left: marginX, right: marginX, top: marginTop + 25, bottom: marginBottom },
      didDrawPage: (data) => {
        drawBackgrounds(doc);
        if (data.pageNumber > 1) callHeader(doc);
      }
    });
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + sectionSpacing;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nenhum padrão utilizado/informado.', marginX + 5, currentY);
    currentY += sectionSpacing;
  }

  // 6. OBSERVAÇÕES
  if (currentY > pageHeight - marginBottom - 40) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }
  currentY = drawSectionTitle('6. OBSERVAÇÕES:', currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  if (record.observations) {
    const obsLines = doc.splitTextToSize(record.observations, contentWidth - 10);
    doc.text(obsLines, marginX + 5, currentY);
    currentY += (obsLines.length * lineSpacing) + sectionSpacing;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Nenhuma observação registrada.', marginX + 5, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += lineSpacing + sectionSpacing;
  }

  // 7. RESPONSÁVEIS PELA EMISSÃO
  if (currentY > pageHeight - marginBottom - 50) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const responsibleSuffix = (isTest || isMaintenance) ? 'DO RELATÓRIO' : 'DO CERTIFICADO';
  doc.text(`7. RESPONSÁVEL(EIS) PELA EMISSÃO ${responsibleSuffix}:`, marginX, currentY);
  
  currentY += 2;
  // Linhas removidas conforme solicitado
  currentY += 1;

  currentY += 25; 

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

  let sigBase64 = authorizedEmployee?.signatureBase64;
  if (sigBase64?.startsWith('http')) sigBase64 = await loadRemoteImage(sigBase64);

  if (sigBase64 && (sigBase64.startsWith('data:image') || sigBase64.startsWith('http'))) {
    try { 
      const format = sigBase64.startsWith('data:image') ? getImageFormat(sigBase64) : undefined;
      doc.addImage(sigBase64, format || 'PNG', signatureX2, currentY - signatureHeight, signatureWidth, signatureHeight, undefined, 'FAST'); 
    } catch (e) {
      console.error("Error adding signature image:", e);
    }
  }

  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.3);
  doc.line(signatureX2, currentY, signatureX2 + signatureWidth, currentY);

  currentY += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let techName = 'Não identificado';
  const techByTechField = employees.find(e => e.id === record.technicianName);
  const techBySubmittedBy = employees.find(e => e.id === record.submittedBy);
  if (techByTechField?.nome) {
    techName = techByTechField.nome;
  } else if (techBySubmittedBy?.nome) {
    techName = techBySubmittedBy.nome;
  } else if (record.technicianName && !record.technicianName.startsWith('emp_')) {
    techName = record.technicianName;
  }
  
  doc.text('Técnico Executante:', signatureX1, currentY);
  doc.setFont('helvetica', 'italic');
  doc.text(techName, signatureX1 + 35, currentY);

  if (record.approvedAt) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    const dateApp = new Date(record.approvedAt);
    doc.text(`Aprovado digitalmente no dia:`, signatureX2 + (signatureWidth/2) + 20, currentY - 21, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${dateApp.toLocaleDateString('pt-BR')} ${dateApp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, signatureX2 + (signatureWidth/2) + 20, currentY - 18, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(authorizedEmployee?.nome || '', signatureX2 + (signatureWidth/2), currentY, { align: 'center' });
  doc.text('Gerente Técnico', signatureX2 + (signatureWidth/2), currentY + 4, { align: 'center' });
  currentY += sectionSpacing + 2;

  // DIGITAL SIGNATURES COMPLIANCE
  if (signatures.length > 0) {
    if (currentY > pageHeight - 60) { doc.addPage(); drawBackgrounds(doc); callHeader(doc); currentY = 100; }
    currentY += 5;

    doc.setFillColor(232, 245, 233);
    doc.roundedRect(marginX, currentY, contentWidth, 20, 3, 3, 'F');
    doc.setDrawColor(76, 175, 80);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, currentY, contentWidth, 20, 3, 3, 'D');

    doc.setTextColor(46, 125, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO ASSINADO DIGITALMENTE', marginX + 5, currentY + 7);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`HASH SHA-256: ${signatures[0].documentHash}`, marginX + 5, currentY + 12);
    doc.text(`Integridade verificável via portal MetroFlow ERP.`, marginX + 5, currentY + 16);
    currentY += 25;
  }

  // RESOLUÇÃO DOS GRUPOS EFETIVOS (Mask-Centric)
  // Filtramos o que deve ser impresso baseados na máscara para evitar duplicatas e "fantasmas"
  const effectiveGroups = getEffectiveGroups(record, mask);

  // Pre-generate chart images for groups with hasGraph enabled (must be async before sync render loop)
  const chartImageMap: Record<number, string | null> = {};
  for (const item of effectiveGroups) {
    if (item.maskGroup?.hasGraph) {
      chartImageMap[item.gi] = await generateChartImage(item.group, record, item.maskGroup, item.gi);
    }
  }

  // 8. RESULTADOS
  if (record.groups && record.groups.length > 0) {
    // FORCE START ON NEW PAGE (AT LEAST PAGE 2)
    doc.addPage();
    drawBackgrounds(doc);
    callHeader(doc);
    
    currentY = drawSectionTitle(`8. RESULTADOS D${isTest ? 'O ENSAIO' : isMaintenance ? 'O TESTE' : 'A CALIBRAÇÃO'}:`, currentY);

    let lastSectionTitle = '';
    
    for (const item of effectiveGroups) {
      const { group, maskGroup, gi, section } = item;
      if (group.rows.length === 0) continue;

      const groupMask = maskGroup;
      
      // NEW: Renderizar título da seção se houver hierarquia definida e mudou de seção
      if (section && section.title !== lastSectionTitle) {
        lastSectionTitle = section.title;
        if (currentY > pageHeight - marginBottom - 15) {
          doc.addPage();
          drawBackgrounds(doc);
          callHeader(doc);
          currentY = marginTop + 25;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102); // Azul escuro para seções
        doc.text(section.title.toUpperCase(), marginX + 2, currentY);
        currentY += 6;
      }

      // PRIORIDADE TOTAL: Usar as definições que estão no REGISTRO (o que foi lançado)
      // Fallback: Se o registro não tiver definições (legado), busca na máscara
      let definitions = group.columnDefinitions || groupMask?.columnDefinitions || [];
      if (definitions.length === 0 && groupMask?.columns && groupMask.columns.length > 0) {
        definitions = groupMask.columns.map((colName: string) => ({ id: colName, name: colName, type: ColumnType.TEXTO, behavior: ColumnBehavior.METROLOGY }));
      }

      // Mesma lógica para colunas ocultas
      const hiddenCols = group.hiddenColumns || groupMask?.hiddenColumns || [];
      let visibleDefs = definitions.filter(d => !hiddenCols.includes(d.id));
      if (!isInternalMemory) {
        const allowedTypes = [
          ColumnType.VVC, 
          ColumnType.LEITURA, 
          ColumnType.MEDIA, 
          ColumnType.ERRO, 
          ColumnType.INCERTEZA, 
          ColumnType.CONFORMIDADE, 
          ColumnType.TEXTO,
          ColumnType.NUMBER,
          ColumnType.DESVIO_PADRAO
        ];
        visibleDefs = visibleDefs.filter(d => allowedTypes.includes(d.type));
      }

      if (visibleDefs.length === 0) continue;

      const head = [visibleDefs.map(d => (d.name || '').toUpperCase())];
      const bodyData: any[] = [];
      const repetitions = Math.max(1, groupMask?.repetitions ?? mask?.repetitions ?? 1);
      const numPoints = Math.ceil(group.rows.length / repetitions);

      for (let p = 0; p < numPoints; p++) {
        const calc = findPointCalculation(record, group, p, repetitions, gi);
        
        // Verificação de linha vazia: Se não houver leitura/indicação preenchida (ou for zero e VVC não for zero), pulamos o ponto
        const firstRow = group.rows[p * repetitions];
        const hasVVC = firstRow?.[visibleDefs.find(d => d.type === ColumnType.VVC)?.id || ''] !== undefined;
        const vvcVal = parseFloat(String(firstRow?.[visibleDefs.find(d => d.type === ColumnType.VVC)?.id || '0']).replace(',', '.'));
        const hasReading = firstRow?.[visibleDefs.find(d => d.type === ColumnType.LEITURA || d.metrologyField === 'LEITURA')?.id || ''] !== undefined;
        
        // Se for um ponto onde o VVC não é zero mas não houve leitura (ou leitura é zero/vazia), e não for o primeiro ponto
        // decidimos se pulamos para evitar as 7 linhas do template
        if (p > 0 && vvcVal > 0 && !hasReading && !calc?.mean) continue;

        for (let r = 0; r < repetitions; r++) {
          const rowIndex = p * repetitions + r;
          const row = group.rows[rowIndex];
          
          const rowData = visibleDefs.map(def => {
            if (!row) return '—';
            
            const isMetrology = def.behavior === ColumnBehavior.METROLOGY;
            const isCalculated = def.behavior === ColumnBehavior.CALCULATED || def.behavior === ColumnBehavior.DERIVED;
            
            // Se temos cálculos realizados para este ponto
            if (calc) {
              if (r === 0) {
                if (def.metrologyField) {
                  const metVal = getMetrologyValue(def.metrologyField, calc as any, def.decimalPlaces ?? 4);
                  if (metVal.formatted) return fixPdfText(metVal.formatted);
                }
                
                if (def.type === ColumnType.MEDIA && (calc as any).mean !== undefined) return fixPdfText((calc as any).mean.toFixed(def.decimalPlaces ?? 4));
                if (def.type === ColumnType.ERRO && (calc as any).error !== undefined) return fixPdfText((calc as any).error.toFixed(def.decimalPlaces ?? 4));
                if (def.type === ColumnType.INCERTEZA && (calc as any).U !== undefined) return fixPdfText((calc as any).U.toFixed(def.decimalPlaces ?? 4));
                if (def.type === ColumnType.DESVIO_PADRAO && (calc as any).stdDev !== undefined) return fixPdfText((calc as any).stdDev.toFixed(def.decimalPlaces ?? 6));
                if (def.type === ColumnType.CONFORMIDADE) return fixPdfText((calc as any).conformity || '');
                if (def.type === ColumnType.VVC && (calc as any).vvc !== undefined) return fixPdfText((calc as any).vvc.toFixed(def.decimalPlaces ?? 4));
                
                if (def.id && (calc as any)[def.id] !== undefined) {
                  const val = (calc as any)[def.id];
                  return typeof val === 'number' ? val.toFixed(def.decimalPlaces ?? 4) : String(val);
                }
              } else {
                const isPointSummary = [ColumnType.MEDIA, ColumnType.ERRO, ColumnType.INCERTEZA, ColumnType.CONFORMIDADE].includes(def.type) || 
                                       (isCalculated && def.type !== ColumnType.LEITURA) ||
                                       (isMetrology && !['LEITURA', 'readings'].includes(def.metrologyField || ''));

                if (isPointSummary) return '';
              }
            }

            const rawVal = row[def.id] !== undefined ? row[def.id] : (def.name ? row[def.name] : undefined);
            return fixPdfText(rawVal !== undefined && rawVal !== null ? String(rawVal) : (r === 0 ? '—' : ''));
          });
          bodyData.push(rowData);
        }
      }

      if (bodyData.length === 0) continue;

      // AJUSTE DINÂMICO DE CABEÇALHOS PARA INCERTEZA
      let finalHead = head;
      const isUncertaintyTable = group.groupName?.toUpperCase().includes('INCERTEZA') || visibleDefs.some(d => d.type === ColumnType.INCERTEZA);
      if (isUncertaintyTable && visibleDefs.length <= 4) {
         // Se for a tabela de incerteza/K, garantimos que os nomes façam sentido
         finalHead = [visibleDefs.map(d => {
            if (d.type === ColumnType.INCERTEZA || d.metrologyField === 'U') return 'INCERTEZA EXPANDIDA';
            if (d.id?.toLowerCase().includes('k_factor') || d.name?.toUpperCase().includes('K')) return 'FATOR DE ABRANGÊNCIA (K)';
            return (d.name || d.id || '').toUpperCase();
         })];
      }

      const estimatedHeaderHeight = 12;
      const estimatedMinRows = Math.min(3, bodyData.length) * 6;
      if (currentY + estimatedHeaderHeight + estimatedMinRows > pageHeight - marginBottom) {
        doc.addPage();
        drawBackgrounds(doc);
        callHeader(doc);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text((group.groupName || '').toUpperCase(), marginX, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: finalHead,
        body: bodyData,
        theme: 'grid',
        showHead: 'firstPage', // Evita duplicidade em quebras conforme pedido
        styles: { cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: secondaryColor, textColor: [0,0,0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: [0,0,0], halign: 'center' },
        margin: { left: marginX, right: marginX, top: marginTop + 25, bottom: marginBottom },
        willDrawCell: (data) => {
          // If cell contains Ω, we suppress autoTable's text drawing
          // and handle it manually in didDrawCell
          if (data.section === 'body' && data.cell.raw && String(data.cell.raw).includes('Ω')) {
            data.cell.text = []; 
          }
        },
        didDrawCell: (data) => {
          drawBackgrounds(doc);
          if (data.pageNumber > 1) callHeader(doc);
          
          // Manual render for symbols
          if (data.section === 'body' && data.cell.raw && String(data.cell.raw).includes('Ω')) {
            drawCellWithSymbols(data, doc);
          }
        }
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + sectionSpacing;

      // GRÁFICO: inserir imagem pré-gerada caso o grupo tenha hasGraph ativado
      const chartImg = chartImageMap[gi];
      if (chartImg) {
        const chartH = 60; // altura em mm
        const chartW = contentWidth;
        if (currentY + chartH > pageHeight - marginBottom) {
          doc.addPage();
          drawBackgrounds(doc);
          callHeader(doc);
        }
        try {
          doc.addImage(chartImg, 'PNG', marginX, currentY, chartW, chartH);
          currentY += chartH + sectionSpacing;
        } catch (e) {
          console.error('Erro ao inserir gráfico no PDF:', e);
        }
      }
    }
  }

  
  // ANEXAR IMAGENS
  if (record.attachments && record.attachments.length > 0) {
    for (let i = 0; i < record.attachments.length; i++) {
        doc.addPage();
        drawBackgrounds(doc);
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
            const attachment = record.attachments[i];
            const format = attachment.startsWith('data:image') ? getImageFormat(attachment) : undefined;
            doc.addImage(attachment, format || 'JPEG', marginX, yTop + 10, maxW, maxH, undefined, 'FAST');
        } catch (e) {
            doc.setFont('helvetica', 'normal');
            doc.text('Erro ao carregar imagem em anexo.', marginX, yTop + 20);
        }
    }
  }
  
  if (footerImage?.startsWith('http')) {
     const loaded = await loadRemoteImage(footerImage);
     if (loaded) addStandardFooter(doc, true, loaded);
     else addStandardFooter(doc, true, footerImage);
  } else {
     addStandardFooter(doc, true, footerImage);
  }

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

export const generateClientReportPdf = async (
  records: CalibrationRecord[],
  client: Client | undefined,
  year: number,
  documentTemplates: DocumentTemplate[] = []
): Promise<void> => {
  const template = documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  let footerImage = template?.footerBase64;
  if (footerImage?.startsWith('http')) footerImage = await loadRemoteImage(footerImage);

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
    customLetterhead: letterhead
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
  addStandardFooter(doc, true, footerImage);

  const fileName = `Relatorio_Certificados_${(client?.razaoSocial || 'Cliente').replace(/[^a-z0-9]/gi, '_')}_${year}.pdf`;
  doc.save(fileName);
};

export const generateQuotePdf = async (quote: Quote, client: Client | undefined, documentTemplates: DocumentTemplate[] = [], returnBlobUrl: boolean = false): Promise<string | void> => {
  const template = documentTemplates.find(t => t.id === 'QUOTE') || 
                   documentTemplates.find(t => t.applyTo === 'QUOTE') || 
                   documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  let footerImage = template?.footerBase64;
  if (footerImage?.startsWith('http')) footerImage = await loadRemoteImage(footerImage);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 12; 
  const marginRight = 12;
  const marginTop = 45; 
  const marginBottom = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // We draw the background letterhead on page 1
  addStandardHeader({
    doc,
    title: '', 
    isCertificate: false,
    hideMeta: true,
    customLetterhead: letterhead
  });

  // Footer will be added only at the end of the document to avoid overlaps
  // addStandardFooter(doc, false, footerImage);

  // Intercept doc.addPage to automatically draw the background
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function() {
    originalAddPage(...arguments);
    addStandardHeader({ 
      doc, 
      title: '', 
      isCertificate: false, 
      hideMeta: true, 
      customLetterhead: letterhead 
    });
    // Removed duplicate footer call that causes numbering overlap
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
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 25 },
      1: { cellWidth: 'auto' }, 
      2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 25 }, 
      3: { cellWidth: 40 } 
    },
    body: [
      ['Emitido em:', formatDate(quote.dataEmissao), 'Válido até:', formatDate(quote.validade)],
      ['Cliente:', client?.razaoSocial || 'N/A', 'CNPJ:', quote.clienteCnpj || 'N/A'],
      ['Insc. Estadual:', client?.inscricaoEstadual || 'Isento', 'Insc. Municipal:', client?.inscricaoMunicipal || 'Isento'],
      ['Endereço:', { content: quote.clienteEndereco || 'N/A', colSpan: 3 }],
      ['Solicitante:', quote.clienteSolicitanteNome || 'N/A', 'Telefone:', quote.clienteSolicitanteContato || 'N/A'],
      ['E-mail:', { content: quote.clienteSolicitanteEmail || 'N/A', colSpan: 3 }],
      ['Financeiro:', quote.clienteEmailFinanceiro || 'N/A', 'Retenção:', quote.clienteRetencaoImpostoFonte ? 'SIM' : 'NÃO']
    ],
    margin: { left: marginLeft, right: marginRight, top: marginTop }
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
    showFoot: 'lastPage',
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
    margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
  });

  // RBC Yellow Warning
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 12, fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 0], textColor: [0, 0, 0] },
    body: [['Caso necessite de calibração RBC, consulte-nos!']],
    margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
  });

  // Definition 
  // @ts-ignore
  lineY = doc.lastAutoTable.finalY + 2;
  autoTable(doc, {
    startY: lineY,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 10, fontStyle: 'italic', halign: 'justify', textColor: [0, 0, 0] },
    body: [['Calibração é a operação que estabelece, sob condições específicas, numa primeira etapa, uma relação entre os valores e as incertezas de medição fornecidos por padrões e as indicações correspondentes com as incertezas associadas. Não se aplicando manutenção ou ajustes.']],
    margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
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
      margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
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
      margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
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
      margin: { left: marginLeft, right: marginRight, top: 45, bottom: marginBottom }
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
  
  // Nota de Rodapé (Preparador)
  lineY += 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  const footnoteY = pageHeight - marginBottom - 5; 
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento ${quote.id} confeccionado por ${quote.criadoPor || 'Sistema'} ${quote.criadoEm ? 'em ' + quote.criadoEm : ''}`, marginLeft, footnoteY);

  addStandardFooter(doc, false, template?.footerBase64);
  
  if (returnBlobUrl) {
    return doc.output('bloburl') as any;
  } else {
    doc.save(`Orcamento_${quote.id}.pdf`);
  }
};

export const generateServiceOrderPdf = async (
  os: ServiceOrder, 
  client: Client | undefined, 
  quote: Quote | undefined, 
  documentTemplates: DocumentTemplate[] = [],
  preview: boolean = false
): Promise<string | void> => {
  const template = documentTemplates.find(t => t.id === 'OS' || t.applyTo === 'OS') || documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // Header Drawing
  const callHeader = (document: jsPDF, title: string) => {
    addStandardHeader({
      doc: document,
      title: '', 
      isCertificate: false,
      hideMeta: true,
      customLetterhead: letterhead
    });

    const titleY = 46;
    document.setFontSize(18);
    document.setFont('helvetica', 'bold');
    document.setTextColor(0, 0, 0);
    document.text(`${title} Nº ${os.id}`, pageWidth / 2, titleY, { align: 'center' });

    return titleY + 6;
  };

  // --- PARTE 1: Ordem de Serviço (Administrativa) ---
  let currentY = callHeader(doc, 'ORDEM DE SERVIÇO');

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
  const observationsToShow = os.observacoes || quote?.observacoes;
  if (observationsToShow) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES TÉCNICAS:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(observationsToShow, pageWidth - margin * 2);
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
  if (currentY > pageHeight - 65) { doc.addPage(); currentY = callHeader(doc, 'ORDEM DE SERVIÇO') + 5; }

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
  const reportStartPage = doc.getNumberOfPages();
  currentY = callHeader(doc, 'RELATÓRIO DE SERVIÇO EXTERNO');

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`CLIENTE: ${client?.razaoSocial || 'N/A'}`, margin, currentY + 4);
  currentY += 12;

  // Tabela Desmembrada com 5 colunas de Status e Numbering Contínuo
  if (quote) {
    const decomposedData: any[][] = [];
    let globalCounter = 1;

    // Tenta extrair o número do certificado das observações (se houver)
    let certPlaceholder = '';
    if (os.observacoes) {
      const match = os.observacoes.match(/CERTIFICADO:\s*(.*)/);
      if (match && match[1]) certPlaceholder = match[1].trim();
    }

    quote.items.forEach((item, itemIdx) => {
      const qty = item.quantidade || 1;
      for (let i = 0; i < qty; i++) {
        decomposedData.push([
          `${globalCounter}.${itemIdx + 1}`, 
          certPlaceholder, // Injeta o certificado previsto
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

  const currentTotalPages = doc.getNumberOfPages();
  // We want the legend only on the Report pages. 
  // Let's assume the report starts on the page we just added or last page.
  // PARTE 3 starts at doc.addPage() which is usually the last page or second to last.
  // For safety, we'll use the page count before the report started if we had tracked it.
  // But let's just use the current page count logic.
  
  // Since we don't have the exact start page of Part 3 easily available without more logic,
  // I will just use the fact that Part 3 usually starts at the last few pages.
  // Actually, I'll just pass a calculated start page.
  
  addStandardFooter(doc, false, template?.footerBase64, "LEGENDA DE STATUS: 1. Equipamento realizado; 2. Não disponível; 3. Não encontrado; 4. Não operante; 5. Coletado.", reportStartPage);
  
  if (preview) {
    return doc.output('bloburl') as any;
  }
  doc.save(`OS_Relatorio_Campo_${os.id}.pdf`);
};

export const generateProtocolPdf = async (
  os: ServiceOrder, 
  client: Client | undefined, 
  quote: Quote | undefined, 
  type: 'retirada' | 'entrega', 
  items: { descricao: string; quantidade: number; identificacao: string; estado: string }[],
  employee: { nome: string; cargo: string },
  clientResponsible: { nome: string; cargo: string },
  documentTemplates: DocumentTemplate[] = [],
  preview: boolean = false
): Promise<string | void> => {
  const template = documentTemplates.find(t => t.id === 'LOGISTICS_PROTOCOL' || t.applyTo === 'LOGISTICS_PROTOCOL') || documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // Standardized Header
  const title = type === 'retirada' ? 'PROTOCOLO DE RETIRADA' : 'PROTOCOLO DE ENTREGA';
  const opLabel = type === 'retirada' ? 'COLETA' : 'ENTREGA';
  
  let currentY = addStandardHeader({
    doc,
    title,
    isCertificate: false,
    hideMeta: true,
    customLetterhead: letterhead
  });

  // 2. Dados da O.S. e Cliente (Layout O.S.)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
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
  currentY = doc.lastAutoTable.finalY + 5;

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
  currentY = doc.lastAutoTable.finalY + 5;

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
    return doc.output('bloburl') as any;
  }
  doc.save(`Protocolo_${type}_${os.id}.pdf`);
};


export const generateCautelaPdf = async (custody: StandardCustody, resolvedItems: { nome: string; identificacao: string; quantidade: number }[], respOrigemName: string, respDestinoName: string, documentTemplates: DocumentTemplate[] = []) => {
  const template = documentTemplates.find(t => t.id === 'CAUTELA' || t.applyTo === 'CAUTELA') || documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  let footerImage = template?.footerBase64;
  if (footerImage?.startsWith('http')) footerImage = await loadRemoteImage(footerImage);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryBlue: [number, number, number] = [0, 51, 102];

  // 1. Cabeçalho e Identificação de Fluxo
  const currentY = addStandardHeader({
    doc,
    title: `CAUTELA DE EQUIPAMENTOS Nº ${custody.id}`,
    isCertificate: false,
    hideMeta: true,
    customLetterhead: letterhead
  });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 55 },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['ORIGEM:', custody.origem || '—'],
      ['RESPONSÁVEL ORIGEM:', respOrigemName || '—'],
      ['DESTINO:', custody.destino || '—'],
      ['RESPONSÁVEL DESTINO:', respDestinoName || '—']
    ],
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  let y = doc.lastAutoTable.finalY + 5;

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
  y = doc.lastAutoTable.finalY + 5;

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

  drawSig(margin, 'Responsável Origem');
  drawSig(margin + sigWidth + spacing, 'Responsável Saída');
  drawSig(pageWidth - margin - sigWidth, 'Portaria / Recebedor Destino');

  addStandardFooter(doc, false, footerImage);
  doc.save(`Cautela_${custody.id}.pdf`);
};

export const generateStandardInstrumentPdf = async (si: StandardInstrument, documentTemplates: DocumentTemplate[] = []) => {
  const template = documentTemplates.find(t => t.id === 'INSTRUMENT_SHEET' || t.applyTo === 'INSTRUMENT_SHEET') || documentTemplates.find(t => t.applyTo === 'ALL');
  
  let letterhead = template?.letterheadBase64;
  if (letterhead?.startsWith('http')) letterhead = await loadRemoteImage(letterhead);
  
  let footerImage = template?.footerBase64;
  if (footerImage?.startsWith('http')) footerImage = await loadRemoteImage(footerImage);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const currentY = addStandardHeader({
    doc,
    title: 'FICHA DE EQUIPAMENTO PADRÃO',
    documentNumber: si.identificacao,
    isCertificate: false,
    customLetterhead: letterhead
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

  addStandardFooter(doc, false, footerImage);
  doc.save(`Ficha_Padrao_${si.identificacao}.pdf`);
};

/**
 * Geração de Relatório Consolidado de Terceiros
 */
export async function generateThirdPartyReportPdf(
  record: ThirdPartyRecord,
  documentTemplates: DocumentTemplate[] = []
): Promise<string | void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let currentY = 40;

  const template = documentTemplates.find(t => t.applyTo === 'TECHNICAL' || t.applyTo === 'ALL');
  const letterhead = template?.letterheadBase64;
  const footer = template?.footerBase64;

  const drawBackground = (d: jsPDF) => {
    if (letterhead) {
      const format = letterhead.startsWith('data:image') ? getImageFormat(letterhead) : 'PNG';
      d.addImage(letterhead, format, 0, 0, 210, 297, undefined, 'FAST');
    }
    if (footer) {
      const format = footer.startsWith('data:image') ? getImageFormat(footer) : 'PNG';
      d.addImage(footer, format, 0, 267, 210, 30, undefined, 'FAST');
    }
  };

  drawBackground(doc);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`RELATÓRIO DE CALIBRAÇÃO PARCEIRO: ${record.laboratorioNome.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // Header Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Referência: ${record.numeroReferencia || '-'}`, marginX, currentY);
  doc.text(`Data de Envio: ${record.dataEnvio || '-'}`, pageWidth - marginX, currentY, { align: 'right' });
  currentY += 6;
  doc.text(`Cliente: ${record.clienteNome || '-'}`, marginX, currentY);
  currentY += 12;

  // Instruments Loop
  for (const item of record.items) {
    if (currentY > 240) {
      doc.addPage();
      drawBackground(doc);
      currentY = 40;
    }

    // Instrument Header (Row 1)
    doc.setFillColor(245, 247, 250);
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.tipoCalibracao} - ${item.descricao}`, marginX + 3, currentY + 5.5);
    doc.text(`Certificado: ${item.numeroCertificado}`, pageWidth - marginX - 3, currentY + 5.5, { align: 'right' });
    currentY += 12;

    // Grid System for Metadata
    const col1 = marginX;
    const col2 = marginX + 95;
    const valueOffset = 42; // Space for label
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Row 1: Dates
    doc.setFont('helvetica', 'normal');
    doc.text('DATA DA CALIBRAÇÃO:', col1, currentY);
    doc.text('DATA DA PRÓXIMA:', col2, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.dataCalibracao}`, col1 + valueOffset, currentY);
    doc.text(`${item.dataProximaCalibracao || '-'}`, col2 + valueOffset, currentY);
    currentY += 6;

    // Row 2: Marca & Modelo
    doc.setFont('helvetica', 'normal');
    doc.text('MARCA:', col1, currentY);
    doc.text('MODELO:', col2, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.marca || '-'}`, col1 + valueOffset, currentY);
    doc.text(`${item.modelo || '-'}`, col2 + valueOffset, currentY);
    currentY += 6;

    // Row 3: Série & ID
    doc.setFont('helvetica', 'normal');
    doc.text('Nº DE SÉRIE:', col1, currentY);
    doc.text('ID / TAG:', col2, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.serialNumber || '-'}`, col1 + valueOffset, currentY);
    doc.text(`${item.identificacao || '-'}`, col2 + valueOffset, currentY);
    currentY += 6;

    // Row 4: Capacidade & Resolução
    doc.setFont('helvetica', 'normal');
    doc.text('CAPACIDADE:', col1, currentY);
    doc.text('RESOLUÇÃO:', col2, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.capacidadeMinima} a ${item.capacidadeMaxima} ${item.unidade}`, col1 + valueOffset, currentY);
    doc.text(`${item.resolucao} ${item.unidade}`, col2 + valueOffset, currentY);
    currentY += 8;

    // Status / Resultado Final
    doc.setFont('helvetica', 'bold');
    doc.text(`RESULTADO FINAL: ${item.status.toUpperCase()}`, marginX, currentY);
    currentY += 6;

    // Measurement Table
    if (item.medicoes && item.medicoes.length > 0) {
      const tableData = item.medicoes.map(m => [
        m.padrao,
        m.leitura1,
        m.leitura2,
        m.leitura3
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Padrão / Nominal', 'Leitura 1', 'Leitura 2', 'Leitura 3']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontSize: 7, halign: 'center' },
        bodyStyles: { fontSize: 7, halign: 'center' },
        margin: { left: marginX + 10, right: marginX + 10 },
        didDrawPage: (data) => {
          drawBackground(doc);
        }
      });
      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma medição registrada para este instrumento.', marginX + 10, currentY);
      currentY += 8;
    }

    if (item.observacoes) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Obs: ${item.observacoes}`, marginX + 2, currentY);
      currentY += 10;
    }
    
    currentY += 5; // Extra space between instruments
  }

  // General Observations
  if (record.observacoesGerais) {
    if (currentY > 250) {
      doc.addPage();
      drawBackground(doc);
      currentY = 40;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES GERAIS:', marginX, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(record.observacoesGerais, pageWidth - (marginX * 2));
    doc.text(lines, marginX, currentY);
  }

  const fileName = `Relatorio_Terceiros_${record.id}.pdf`;
  doc.save(fileName);
  return fileName;
}
