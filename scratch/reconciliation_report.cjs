const fs = require('fs');
const quotesPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/quotes.json';
const osPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/service_orders.json';

try {
    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const serviceOrders = JSON.parse(fs.readFileSync(osPath, 'utf8'));
    const targetMonth = '2026-04';

    const aprilQuotes = quotes.filter(q => q.dataEmissao && q.dataEmissao.startsWith(targetMonth) && (!q.revision || q.revision === 0));
    
    console.log(`--- RELATÓRIO DE CONCILIAÇÃO ---`);
    console.log(`1. Orçamentos Emitidos em Abril: ${aprilQuotes.length}`);
    
    const approvedApril = aprilQuotes.filter(q => q.status === 'Aprovado' || q.status === 'APPROVED');
    console.log(`2. Orçamentos de Abril Aprovados: ${approvedApril.length}`);

    const osAbertasGlobal = serviceOrders.filter(os => os.statusServico === 'Pendente');
    const osEmAndamentoGlobal = serviceOrders.filter(os => os.statusServico === 'Em andamento');
    console.log(`3. O.S. Abertas (Global): ${osAbertasGlobal.length}`);
    console.log(`4. O.S. Em Andamento (Global): ${osEmAndamentoGlobal.length}`);

    console.log(`\n--- BUSCANDO DESVIOS ---`);

    // Desvio A: O.S. que não são de orçamentos de Abril
    const osFromOtherMonths = serviceOrders.filter(os => {
        const parentQuote = quotes.find(q => q.id === os.orcamentoId);
        return !parentQuote || !parentQuote.dataEmissao || !parentQuote.dataEmissao.startsWith(targetMonth);
    });
    console.log(`- O.S. que pertencem a meses ANTERIORES: ${osFromOtherMonths.length}`);
    osFromOtherMonths.forEach(os => console.log(`  -> OS ID: ${os.id} (Ref: ${os.orcamentoId})`));

    // Desvio B: Orçamentos de Abril aprovados que ainda não viraram O.S.
    const approvedWithoutOS = approvedApril.filter(q => !serviceOrders.some(os => os.orcamentoId === q.id));
    console.log(`- Orçamentos de Abril APROVADOS mas SEM O.S.: ${approvedWithoutOS.length}`);
    approvedWithoutOS.forEach(q => console.log(`  -> Orçamento ID: ${q.id}`));

} catch (e) {
    console.log('Erro:', e.message);
}
