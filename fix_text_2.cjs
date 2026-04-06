const fs = require('fs');

function replaceTraceabilityText() {
    const fileModule = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CertificateMasksModule.tsx';
    let contentMod = fs.readFileSync(fileModule, 'utf8');
    
    // Changing the section title text
    contentMod = contentMod.replace(
        /Qualificação de Rastreabilidade Técnica/g, 
        'Padrões a serem utilizados na calibração'
    );

    fs.writeFileSync(fileModule, contentMod, 'utf8');
}

replaceTraceabilityText();
