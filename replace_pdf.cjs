const fs = require('fs');

const path = 'C:/Users/comer/Downloads/metroflow-erp/src/utils/pdfGenerator.ts';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');

const startIndex = 232; 
const endIndex = 648; 

const prefix = lines.slice(0, startIndex);
const suffix = lines.slice(endIndex);

const newFunction = `
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
  
  const primaryColor: [number, number, number] = [0, 51, 102];
  const secondaryColor: [number, number, number] = [230, 230, 230];
  const textColor: [number, number, number] = [20, 20, 20];

  let currentY = marginTop;
  const lineSpacing = 5;
  const sectionSpacing = 8;

  const totalPagesExp = '{total_pages_count_string}';
  const wordCalibration = isTest ? 'ENSAIO' : 'CALIBRAÇÃO';
  let headerTitle = isInternalMemory 
    ? \`MEMÓRIA DE CÁLCULO D\${isTest ? 'O' : 'A'} \${wordCalibration} N.º \${record.certificateNumber}\`
    : \`\${isTest ? 'RELATÓRIO' : 'CERTIFICADO'} DE \${wordCalibration} N.º \${record.certificateNumber}\`.toUpperCase();

  const template = documentTemplates.find(t => t.id === 'CALIBRATION_CERTIFICATE' || t.applyTo === 'CALIBRATION_CERTIFICATE');

  const callHeader = (document: jsPDF) => {
    // Escondendo metadados porque os desenharemos aqui
    currentY = addStandardHeader({
      doc: document,
      title: headerTitle,
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
    
    const calibDateLabel = isTest ? 'Data do Ensaio:' : 'Data da Calibração:';
    const calibDateValue = record.calibrationDate ? new Date(record.calibrationDate).toLocaleDateString('pt-BR') : '';
    const emitDateLabel = 'Data da emissão:';
    const emitDateValue = new Date().toLocaleDateString('pt-BR');
    
    document.setDrawColor(50, 50, 50);
    document.setLineWidth(0.3);
    document.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
    
    document.text(\`\${calibDateLabel}  \${calibDateValue}\`, marginX, currentY);
    document.text(\`\${emitDateLabel}  \${emitDateValue}\`, pageWidth / 2, currentY, { align: 'center' });
    document.text(\`Página \${document.internal.getNumberOfPages()} de \${totalPagesExp}\`, pageWidth - marginX, currentY, { align: 'right' });
    
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
  
  currentY = drawSectionTitle(\`2. DADOS DO INSTRUMENTO\${isTest ? '' : 'S'}:\`, currentY);
  
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
  doc.setFont('helvetica', 'bold'); doc.text(record.serviceOrderNumber || 'N/A', leftValueX, currentY);
  const nextCalibLabel = isTest ? \`Próximo \${wordCalibration.toLowerCase()}:\` : \`Próxima \${wordCalibration.toLowerCase()}:\`;
  doc.setFont('helvetica', 'normal'); doc.text(nextCalibLabel, rightX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.nextCalibrationDate ? new Date(record.nextCalibrationDate).toLocaleDateString('pt-BR') : 'N/A', rightValueX, currentY);
  currentY += lineSpacing;

  doc.setFont('helvetica', 'normal'); doc.text(\`Local d\${isTest ? 'o ensaio' : 'a calibração'}:\`, leftX, currentY);
  doc.setFont('helvetica', 'bold'); doc.text(record.calibrationLocation || 'N/A', leftValueX, currentY);
  currentY += sectionSpacing;

  // 3. CONDIÇÕES AMBIENTAIS DURANTE A CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 30) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle(\`3. CONDIÇÕES AMBIENTAIS DURANTE \${isTest ? 'O ENSAIO' : 'A CALIBRAÇÃO'}:\`, currentY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('• Temperatura do Ar:', leftX + 5, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(\`\${record.temperature || 'N/A'} °C ± 1 °C\`, leftX + 45, currentY);
  
  doc.setFont('helvetica', 'bold');
  doc.text('• Umidade Relativa do Ar:', rightX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(\`\${record.humidity || 'N/A'} %UR ± 5 %UR\`, rightX + 45, currentY);
  currentY += lineSpacing;

  const envStandard = standardInstruments.find(si => si.id === record.envStandardInstrumentId);
  if (envStandard) {
    doc.setFontSize(7);
    doc.text(\`P: (Termohigrômetro, código \${envStandard.identificacao || '-'}, certificado n° \${envStandard.certificadoCalibracao || '-'} emitido por \${envStandard.orgaoCalibrador}, válido até \${new Date(envStandard.dataValidadeCalibracao).toLocaleDateString('pt-BR')})\`, leftX + 5, currentY);
  }
  currentY += sectionSpacing;

  // 4. PROCEDIMENTO DE CALIBRAÇÃO
  if (currentY > pageHeight - marginBottom - 20) { doc.addPage(); callHeader(doc); }
  currentY = drawSectionTitle(\`4. PROCEDIMENTO DE \${wordCalibration}:\`, currentY);
  
  const procedure = procedures.find(p => p.id === record.procedureId);
  const procTitle = procedure ? (\`\${procedure.code ? procedure.code + ' - ' : ''}\${procedure.title}\`) : 'Procedimento não especificado';
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const procLines = doc.splitTextToSize(\`4.1 \${procTitle}\`, contentWidth - 10);
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
      margin: { left: marginX, right: marginX, bottom: marginBottom },
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
    currentY = drawSectionTitle(\`RESULTADOS D\${isTest ? 'O ENSAIO' : 'A CALIBRAÇÃO'}:\`, currentY);

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
        margin: { left: marginX, right: marginX, bottom: marginBottom },
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
  
  doc.text(\`6.\${obsCounter++} Realizado apenas \${isTest ? 'ensaio' : 'calibração'} do instrumento em questão.\`, marginX + 5, currentY); currentY += lineSpacing;
  doc.text(\`6.\${obsCounter++} Valores obtidos correspondem à média de três medições.\`, marginX + 5, currentY); currentY += lineSpacing;
  
  if (!isTest) {
    const incStr = \`6.\${obsCounter++} A incerteza declarada foi fundamentada conforme o procedimento interno para o nível de confiança de aproximadamente 95%.\`;
    const incLines = doc.splitTextToSize(incStr, contentWidth - 10);
    doc.text(incLines, marginX + 5, currentY); currentY += (incLines.length * lineSpacing);
    
    const limitsStr = \`6.\${obsCounter++} A inclusão da informação de "Erro Máximo Admissível" no conteúdo do certificado, foram referenciados pelas normas vigentes.\`;
    const limitsLines = doc.splitTextToSize(limitsStr, contentWidth - 10);
    doc.text(limitsLines, marginX + 5, currentY); currentY += (limitsLines.length * lineSpacing);
  }
  
  if (record.observations) {
    const defaultObs = doc.splitTextToSize(\`6.\${obsCounter++} \${record.observations}\`, contentWidth - 10);
    doc.text(defaultObs, marginX + 5, currentY);
    currentY += (defaultObs.length * lineSpacing);
  }
  
  const finalObs = doc.splitTextToSize(\`6.\${obsCounter++} Os resultados apresentados neste documento têm significância restrita e se aplicam somente ao instrumento em questão, na data d\${isTest ? 'o ensaio' : 'a calibração'}.\`, contentWidth - 10);
  doc.text(finalObs, marginX + 5, currentY);
  currentY += (finalObs.length * lineSpacing) + sectionSpacing;

  // FINAL SIGNATURES 
  if (currentY > pageHeight - marginBottom - 50) { doc.addPage(); callHeader(doc); }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const responsibleSuffix = isTest ? 'DO RELATÓRIO' : 'DO CERTIFICADO';
  doc.text(\`RESPONSÁVEL(EIS) PELA EMISSÃO \${responsibleSuffix}\`, marginX, currentY);
  
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
  if (record.approvalDate) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    const dateApp = new Date(record.approvalDate);
    doc.text(\`Aprovado digitalmente no dia:\`, signatureX2 + (signatureWidth/2) + 20, currentY - 26, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(\`\${dateApp.toLocaleDateString('pt-BR')} \${dateApp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}\`, signatureX2 + (signatureWidth/2) + 20, currentY - 23, { align: 'center' });
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
    doc.text(\`HASH SHA-256: \${signatures[0].documentHash}\`, marginX + 5, currentY + 12);
    doc.text(\`Integridade verificável via QR Code ou no portal MetroFlow ERP.\`, marginX + 5, currentY + 16);
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
    doc.save(\`\${prefix}\${record.certificateNumber}.pdf\`);
  }
};
`;

const finalContent = [...prefix, newFunction.trim(), ...suffix].join('\n');
fs.writeFileSync(path, finalContent, 'utf8');
console.log('Successfully updated pdfGenerator.ts');
