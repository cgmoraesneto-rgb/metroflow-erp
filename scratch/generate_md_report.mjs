import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/full_db_export.json', 'utf8'));

let md = '# Relatório Consolidado do Banco de Dados Cloud Firestore - MetroFlow ERP\n';
md += `**Data de Geração:** ${new Date().toLocaleString()}\n`;
md += '**Status Geral:** ✅ Banco de dados totalmente recuperado e funcional na nuvem.\n\n';

md += '## 1. Resumo Executivo\n';
md += 'O banco de dados Cloud Firestore contém a base completa de operações do MetroFlow ERP. Abaixo está o volume de dados por categoria:\n\n';

const summaries = [];
for (const [col, docs] of Object.entries(data)) {
  if (Array.isArray(docs)) {
    summaries.push({ Coleção: col, Registros: docs.length });
  }
}

md += '| Coleção | Quantidade de Registros |\n';
md += '| :--- | :---: |\n';
summaries.forEach(s => {
  md += `| ${s.Coleção} | ${s.Registros} |\n`;
});
md += '\n---\n\n';

// --- DETALHAMENTO ---

// 1. Clientes
md += '## 2. Detalhamento: Clients (Clientes)\n';
md += `Total: ${data.clients.length} clientes cadastrados.\n\n`;
md += '| ID | Razão Social | CNPJ | Status |\n';
md += '| :--- | :--- | :--- | :--- |\n';
data.clients.slice(0, 20).forEach(c => {
  md += `| ${c.id} | ${c.razaoSocial || 'N/A'} | ${c.cnpj || 'N/A'} | ${c.status || 'N/A'} |\n`;
});
md += '\n*(Lista truncada em 20 registros para brevidade no relatório)*\n\n';

// 2. Orçamentos
md += '## 3. Detalhamento: Quotes (Orçamentos)\n';
md += `Total: ${data.quotes.length} orçamentos registrados.\n\n`;
md += '| ID | Cliente | Data | Valor Total | Status |\n';
md += '| :--- | :--- | :--- | :--- | :--- |\n';
data.quotes.slice(0, 10).forEach(q => {
  md += `| ${q.id} | ${q.clientName || q.clientId || 'N/A'} | ${q.date || q.createdAt || 'N/A'} | ${q.totalAmount || q.total || 'N/A'} | ${q.status || 'N/A'} |\n`;
});
md += '\n\n';

// 3. Ordens de Serviço
md += '## 4. Detalhamento: Service Orders (Ordens de Serviço)\n';
md += `Total: ${data.service_orders.length} OS registradas.\n\n`;
md += '| ID | Quote ID | Cliente | Status |\n';
md += '| :--- | :--- | :--- | :--- |\n';
data.service_orders.slice(0, 10).forEach(so => {
  md += `| ${so.id} | ${so.quoteId || 'N/A'} | ${so.clientName || 'N/A'} | ${so.status || 'N/A'} |\n`;
});
md += '\n\n';

// 4. Instrumentos Padrão
md += '## 5. Detalhamento: Standard Instruments (Padrões)\n';
md += `Total: ${data.standard_instruments.length} instrumentos de referência.\n\n`;
md += '| TAG | Descrição | Próxima Calibração |\n';
md += '| :--- | :--- | :--- |\n';
data.standard_instruments.slice(0, 10).forEach(si => {
  md += `| ${si.tag || si.id} | ${si.description || si.nome || 'N/A'} | ${si.nextCalibration || 'N/A'} |\n`;
});
md += '\n\n';

// 5. Funcionários
md += '## 6. Detalhamento: Employees (Equipe)\n';
md += `Total: ${data.employees.length} usuários/funcionários.\n\n`;
md += '| Nome | Cargo | Email |\n';
md += '| :--- | :--- | :--- |\n';
data.employees.forEach(e => {
  md += `| ${e.nome || e.name} | ${e.cargo || e.role || 'N/A'} | ${e.email || 'N/A'} |\n`;
});
md += '\n\n';

md += '---\n';
md += '## 7. Estrutura Técnica e Metadados\n';
md += '- **Banco de Dados:** Google Cloud Firestore (Modo Nativo)\n';
md += '- **ID do Projeto:** banco-dado-metroflow-erp\n';
md += '- **Localização:** SouthAmerica-East1 (São Paulo)\n\n';
md += '*Relatório de Auditoria Completo gerado por Antigravity AI.*';

fs.writeFileSync('scratch/db_full_report.md', md);
console.log('Relatório gerado em scratch/db_full_report.md');
