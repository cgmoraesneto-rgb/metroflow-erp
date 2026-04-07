const fs = require('fs');

function replaceMaintenanceWithTest() {
    const fileModule = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CertificateMasksModule.tsx';
    let contentMod = fs.readFileSync(fileModule, 'utf8');
    
    // Changing button text
    contentMod = contentMod.replace(/>\s*RELATÓRIO DE MAN.\s*<\/button>/, '>RELATÓRIO DE TESTE</button>');
    contentMod = contentMod.replace(/>\s*RELATÓRIO DE MANUTENÇÃO\s*<\/button>/, '>RELATÓRIO DE TESTE</button>');
    
    // Changing fallback strings in module grid
    contentMod = contentMod.replace(/mask\.type === 'MAINTENANCE_REPORT' \? 'Relatório de Manutenção'/g, "mask.type === 'MAINTENANCE_REPORT' ? 'Relatório de Teste'");

    fs.writeFileSync(fileModule, contentMod, 'utf8');

    const filePdf = 'C:/Users/comer/Downloads/metroflow-erp/src/utils/pdfGenerator.ts';
    let contentPdf = fs.readFileSync(filePdf, 'utf8');
    
    // Changing PDF text mapping
    contentPdf = contentPdf.replace(/isMaintenance \? 'MANUTENÇÃO'/g, "isMaintenance ? 'TESTE'");
    contentPdf = contentPdf.replace(/isMaintenance \? 'Data da Manutenção:'/g, "isMaintenance ? 'Data do Teste:'");
    contentPdf = contentPdf.replace(/isMaintenance \? 'a manutenção'/g, "isMaintenance ? 'o teste'");
    contentPdf = contentPdf.replace(/isMaintenance \? 'A MANUTENÇÃO'/g, "isMaintenance ? 'O TESTE'");
    contentPdf = contentPdf.replace(/isMaintenance \? 'manutenção'/g, "isMaintenance ? 'teste'");

    fs.writeFileSync(filePdf, contentPdf, 'utf8');
}

replaceMaintenanceWithTest();
