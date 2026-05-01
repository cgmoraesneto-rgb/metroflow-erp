const fs = require('fs');
const path = require('path');

// Mock path for inspection
const quotesPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/quotes.json';

try {
    if (!fs.existsSync(quotesPath)) {
        console.log('Database file not found at path');
        process.exit(1);
    }

    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const targetMonth = '2026-04';

    const aprilQuotes = quotes.filter(q => q.dataEmissao && q.dataEmissao.startsWith(targetMonth));

    console.log(`--- Auditoria de Orçamentos (Abril/2026) ---`);
    console.log(`Total bruto encontrado: ${aprilQuotes.length}`);

    // Check for revisions
    const uniqueParents = new Set();
    const revisionCount = aprilQuotes.filter(q => q.parentQuoteId).length;
    
    const ids = aprilQuotes.map(q => q.id);
    const duplicateIds = ids.filter((item, index) => ids.indexOf(item) !== index);

    console.log(`Orçamentos com parentQuoteId (revisões): ${revisionCount}`);
    console.log(`IDs duplicados na lista: ${duplicateIds.length > 0 ? duplicateIds.join(', ') : 'Nenhum'}`);

    // Sample IDs
    console.log('\nLista de IDs em Abril:');
    aprilQuotes.forEach(q => {
        console.log(`- ID: ${q.id} | Data: ${q.dataEmissao} | Parent: ${q.parentQuoteId || 'N/A'} | Revision: ${q.revision || 0}`);
    });

} catch (error) {
    console.error('Erro ao auditar:', error);
}
