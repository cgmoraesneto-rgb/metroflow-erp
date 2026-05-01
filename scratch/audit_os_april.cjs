const fs = require('fs');
const quotesPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/quotes.json';
const osPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/service_orders.json';

try {
    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const serviceOrders = JSON.parse(fs.readFileSync(osPath, 'utf8'));
    const targetMonth = '2026-04';

    // 1. Get all April quotes
    const aprilQuotes = quotes.filter(q => q.dataEmissao && q.dataEmissao.startsWith(targetMonth) && (!q.revision || q.revision === 0));
    const aprilQuoteIds = aprilQuotes.map(q => q.id);

    // 2. Get all OS linked to these quotes
    const osFromAprilQuotes = serviceOrders.filter(os => aprilQuoteIds.includes(os.orcamentoId));

    console.log(`--- Auditoria de O.S. de Abril ---`);
    console.log(`Total de O.S. Geradas para orçamentos de Abril: ${osFromAprilQuotes.length}`);

    console.log(`\nDetalhamento por Status:`);
    const statusCounts = {};
    osFromAprilQuotes.forEach(os => {
        statusCounts[os.statusServico] = (statusCounts[os.statusServico] || 0) + 1;
        console.log(`- OS ID: ${os.id} | Status: ${os.statusServico} | Saída: ${os.dataSaidaReal || 'NÃO PREENCHIDA'}`);
    });

} catch (e) {
    console.log('Erro:', e.message);
}
