const fs = require('fs');
const quotesPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/quotes.json';
const osPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/service_orders.json';

try {
    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const targetMonth = '2026-04';

    const aprilQuotes = quotes.filter(q => q.dataEmissao && q.dataEmissao.startsWith(targetMonth) && (!q.revision || q.revision === 0));
    
    console.log(`--- Auditoria Detalhada de Orçamentos (Abril/2026) ---`);
    console.log(`Total Identificado: ${aprilQuotes.length}\n`);

    console.log(`| ID Orçamento | Status | Data Emissão | Tem O.S.? |`);
    console.log(`|-------------|--------|--------------|-----------|`);
    
    const serviceOrders = JSON.parse(fs.readFileSync(osPath, 'utf8'));

    aprilQuotes.forEach(q => {
        const hasOS = serviceOrders.some(os => os.orcamentoId === q.id);
        console.log(`| ${q.id} | ${q.status || 'SEM STATUS'} | ${q.dataEmissao} | ${hasOS ? 'SIM' : 'NÃO'} |`);
    });

} catch (e) {
    console.log('Erro na auditoria:', e.message);
}
