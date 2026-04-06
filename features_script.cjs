const fs = require('fs');

function updateTypes() {
  const file = 'C:/Users/comer/Downloads/metroflow-erp/src/types.ts';
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add MAINTENANCE_REPORT to Document Type in CertificateMask
  content = content.replace(
    /type\?\:\s*'CALIBRATION_CERTIFICATE'\s*\|\s*'TEST_REPORT'\s*;/g,
    "type?: 'CALIBRATION_CERTIFICATE' | 'TEST_REPORT' | 'MAINTENANCE_REPORT';"
  );
  
  // 2. Add attachments to CalibrationRecord
  if (!content.includes('attachments?: string[];')) {
    content = content.replace(
      /observations:\s*string;/g,
      "observations: string;\n  attachments?: string[]; // Array of base64 images for annexes"
    );
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('types.ts updated');
}

function updateCertificateMasksModule() {
  const file = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CertificateMasksModule.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Add the 3 buttons
  const buttonsHtml = `
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewMask(prev => ({ ...prev, type: 'CALIBRATION_CERTIFICATE' }))}
                      className={\`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border font-bold text-[10px] transition-all \${
                        newMask.type === 'CALIBRATION_CERTIFICATE' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-400 border-indigo-100'
                      }\`}
                    >
                      CERTIFICADO DE CALIBRAÇÃO
                    </button>
                    <button
                      onClick={() => setNewMask(prev => ({ ...prev, type: 'MAINTENANCE_REPORT' }))}
                      className={\`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border font-bold text-[10px] transition-all \${
                        newMask.type === 'MAINTENANCE_REPORT' ? 'bg-slate-600 text-white border-slate-700' : 'bg-white text-slate-500 border-indigo-100'
                      }\`}
                    >
                      RELATÓRIO DE MANUTENÇÃO
                    </button>
                    <button
                      onClick={() => setNewMask(prev => ({ ...prev, type: 'TEST_REPORT' }))}
                      className={\`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border font-bold text-[10px] transition-all \${
                        newMask.type === 'TEST_REPORT' ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-amber-500 border-indigo-100'
                      }\`}
                    >
                      RELATÓRIO DE ENSAIO
                    </button>
                  </div>
                </div>
  `;

  // Find the existing block and replace
  const matchBlock = content.match(/<div className="flex gap-2">\s*<button[\s\S]*?RELATÓRIO\s*<\/button>\s*<\/div>/);
  if (matchBlock) {
    content = content.replace(matchBlock[0], buttonsHtml.trim());
  } else {
    // maybe formatted differently
    const altRegex = /<div className="flex gap-2">[\s\S]*?onClick=\{\(\) => setNewMask\(prev => \(\{ \.\.\.prev, type: 'TEST_REPORT' \}\)\)\}[\s\S]*?<\/div>/;
    const matchAlt = content.match(altRegex);
    if (matchAlt) {
       content = content.replace(matchAlt[0], buttonsHtml.trim());
    }
  }

  // Update display tags in grid block
  content = content.replace(
    /\{mask\.type === 'TEST_REPORT' \? 'Relatório de Ensaio' : 'Certificado'\}/g,
    "{mask.type === 'TEST_REPORT' ? 'Relatório de Ensaio' : mask.type === 'MAINTENANCE_REPORT' ? 'Relatório de Manutenção' : 'Certificado de Calibração'}"
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('CertificateMasksModule.tsx updated');
}

function updatePdfGenerator() {
  const file = 'C:/Users/comer/Downloads/metroflow-erp/src/utils/pdfGenerator.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Replace document type logic
  // const isTest = mask?.type === 'TEST_REPORT';
  // we want to support MAINTENANCE_REPORT too.
  content = content.replace(
    /const isTest \= mask\?\.type \=\=\= 'TEST_REPORT';/g,
    "const isTest = mask?.type === 'TEST_REPORT';\n  const isMaintenance = mask?.type === 'MAINTENANCE_REPORT';"
  );

  content = content.replace(
    /const wordCalibration \= isTest \? 'ENSAIO' \: 'CALIBRAÇÃO';/g,
    "const wordCalibration = isTest ? 'ENSAIO' : isMaintenance ? 'MANUTENÇÃO' : 'CALIBRAÇÃO';"
  );
  
  content = content.replace(
    /\`\$\{isTest \? 'RELATÓRIO' \: 'CERTIFICADO'\} DE \$\{wordCalibration\} N.º \$\{record\.certificateNumber\}\`/g,
    "`${(isTest || isMaintenance) ? 'RELATÓRIO' : 'CERTIFICADO'} DE ${wordCalibration} N.º ${record.certificateNumber}`"
  );
  
  content = content.replace(
    /const calibDateLabel \= isTest \? 'Data do Ensaio:' \: 'Data da Calibração:';/g,
    "const calibDateLabel = isTest ? 'Data do Ensaio:' : isMaintenance ? 'Data da Manutenção:' : 'Data da Calibração:';"
  );
  
  content = content.replace(
    /const nextCalibLabel \= isTest \? \`Próximo \$\{wordCalibration\.toLowerCase\(\)\}:\` \: \`Próxima \$\{wordCalibration\.toLowerCase\(\)\}:\`;/g,
    "const nextCalibLabel = isTest ? `Próximo ${wordCalibration.toLowerCase()}:` : isMaintenance ? `Próxima ${wordCalibration.toLowerCase()}:` : `Próxima ${wordCalibration.toLowerCase()}:`;"
  );

  content = content.replace(
    /\`Local d\$\{isTest \? 'o ensaio' \: 'a calibração'\}\:\`/g,
    "`Local d${isTest ? 'o ensaio' : isMaintenance ? 'a manutenção' : 'a calibração'}:`"
  );

  content = content.replace(
    /\`3\. CONDIÇÕES AMBIENTAIS DURANTE \$\{isTest \? 'O ENSAIO' \: 'A CALIBRAÇÃO'\}\:\`/g,
    "`3. CONDIÇÕES AMBIENTAIS DURANTE ${isTest ? 'O ENSAIO' : isMaintenance ? 'A MANUTENÇÃO' : 'A CALIBRAÇÃO'}:`"
  );
  
  content = content.replace(
    /\`RESULTADOS D\$\{isTest \? 'O ENSAIO' \: 'A CALIBRAÇÃO'\}\:\`/g,
    "`RESULTADOS D${isTest ? 'O ENSAIO' : isMaintenance ? 'A MANUTENÇÃO' : 'A CALIBRAÇÃO'}:`"
  );

  content = content.replace(
    /Realizado apenas \$\{isTest \? 'ensaio' \: 'calibração'\} do instrumento em questão/g,
    "Realizado apenas ${isTest ? 'ensaio' : isMaintenance ? 'manutenção' : 'calibração'} do instrumento em questão"
  );

  content = content.replace(
    /na data d\$\{isTest \? 'o ensaio' \: 'a calibração'\}/g,
    "na data d${isTest ? 'o ensaio' : isMaintenance ? 'a manutenção' : 'a calibração'}"
  );

  content = content.replace(
    /const responsibleSuffix \= isTest \? 'DO RELATÓRIO' \: 'DO CERTIFICADO';/g,
    "const responsibleSuffix = (isTest || isMaintenance) ? 'DO RELATÓRIO' : 'DO CERTIFICADO';"
  );
  
  // Now add processing for attachments at the end of the PDF, before putting total pages and save
  const attachmentCode = `
  // ANEXAR IMAGENS
  if (record.attachments && record.attachments.length > 0) {
    for (let i = 0; i < record.attachments.length; i++) {
        doc.addPage();
        callHeader(doc);
        const yTop = currentY;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(\`ANEXO \${i + 1}\`, pageWidth / 2, yTop, { align: 'center' });
        
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
  `;
  
  // Insert before addStandardFooter(doc, true, template?.footerBase64);
  content = content.replace(
    /addStandardFooter\(doc, true, template\?\.footerBase64\);/,
    attachmentCode + "\n  addStandardFooter(doc, true, template?.footerBase64);"
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('pdfGenerator.ts updated with attachments logic');
}


updateTypes();
updateCertificateMasksModule();
updatePdfGenerator();
