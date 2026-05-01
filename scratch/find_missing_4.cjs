const fs = require('fs');
const quotesPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/quotes.json';
const osPath = 'c:/Users/comer/Downloads/metroflow-erp/mock-db/service_orders.json';

try {
    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const serviceOrders = JSON.parse(fs.readFileSync(osPath, 'utf8'));
    const targetMonth = '2026-04';

    const aprilQuotes = quotes.filter(q => q.dataEmissao && q.dataEmissao.startsWith(targetMonth) && (!q.revision || q.revision === 0));
    
    console.log(`Total Emitidos em Abril: ${aprilQuotes.length}`);
    
    const approved = aprilQuotes.filter(q => q.status === 'Aprovado');
    const rejected = aprilQuotes.filter(q => q.status === 'Reprovado');
    const pending = aprilQuotes.filter(q => !q.status || q.status === 'Pendente');

    console.log(`Status dos Orçamentos de Abril:`);
    console.log(`- Aprovados: ${approved.length}`);
    console.log(`- Reprovados: ${rejected.length}`);
    console.log(`- Pendentes: ${pending.length}`);

    // Check how many approved quotes have OS
    const approvedWithOS = approved.filter(q => serviceOrders.some(os => os.orcamentoId === q.id));
    const approvedWithoutOS = approved.filter(q => !serviceOrders.some(os => os.orcamentoId === q.id));

    console.log(`\nDetalhamento dos Aprovados:`);
    console.log(`- Com O.S. gerada: ${approvedWithOS.length}`);
    console.log(`- Sem O.S. gerada (Faltantes?): ${approvedWithoutOS.length}`);

} catch (e) {
    console.log('Erro ao ler arquivos:', e.message);
}
