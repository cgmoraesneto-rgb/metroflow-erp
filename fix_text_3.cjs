const fs = require('fs');

function replaceHeaderTitle() {
    const fileModule = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CertificateMasksModule.tsx';
    let contentMod = fs.readFileSync(fileModule, 'utf8');
    
    // Changing the section title text (ignoring the span for version just in case)
    contentMod = contentMod.replace(
        /Industrial Calculation Engine\s*<span[^>]*>v3\.0<\/span>/, 
        'Criação de Máscaras de Certificados'
    );
    
    // Alternatively fallback in case there is no span or my regex misses:
    contentMod = contentMod.replace(
        /Industrial Calculation Engine v3\.0/g,
        'Criação de Máscaras de Certificados'
    );
    
    // Also remove the span if it was like text-indigo-500>v3.0</span> inside the h2
    contentMod = contentMod.replace(
        /<h2 className="text-2xl font-bold text-gray-900 font-sans">\s*Industrial Calculation Engine <span className="text-indigo-500">v3\.0<\/span>\s*<\/h2>/g,
        '<h2 className="text-2xl font-bold text-gray-900 font-sans">\n             Criação de Máscaras de Certificados\n          </h2>'
    );


    fs.writeFileSync(fileModule, contentMod, 'utf8');
}

replaceHeaderTitle();
