import { Quote, QuoteItem, PriceTable, QuoteStatus } from '../types';

/**
 * Calcula o valor total de uma lista de itens de orçamento.
 */
export const calculateQuoteTotal = (items: QuoteItem[]): number => {
  return (items || []).reduce((sum, item) => sum + (item.valorTotal || 0), 0);
};

/**
 * Calcula o valor unitário final e o valor total de um item individual,
 * aplicando o desconto especificado.
 */
export const calculateQuoteItemTotals = (item: { valorUnitario: number, desconto: number, quantidade: number }) => {
  const descontoPercentual = item.desconto || 0;
  const valorUnitarioFinal = item.valorUnitario * (1 - (descontoPercentual / 100));
  const valorTotal = item.quantidade * valorUnitarioFinal;
  return { valorUnitarioFinal, valorTotal };
};

/**
 * Busca o preço de um serviço específico em uma tabela de preços.
 */
export const getServicePriceFromTable = (
  table: PriceTable, 
  instrumentName: string, 
  serviceType: string
): number => {
  const itemFromTable = table.items.find(item => item.nomeInstrumento === instrumentName);
  if (!itemFromTable) return 0;

  const logistica = itemFromTable.logistica || 0;
  
  switch (serviceType) {
    case 'Rastreável':
      return itemFromTable.valorRastreavel + logistica;
    case 'Acreditado':
      return itemFromTable.valorAcreditado + logistica;
    case 'Manutenção':
      return itemFromTable.manutencao + logistica;
    case 'Ensaio':
      return itemFromTable.ensaio + logistica;
    case 'Teste':
      return itemFromTable.teste + logistica;
    case 'Qualificação':
      return itemFromTable.qualificacao + logistica;
    case 'Logística':
      return logistica;
    default:
      return 0;
  }
};

/**
 * Cria um objeto de revisão baseado em um orçamento original.
 */
export const createQuoteRevision = (original: Quote, nextRevisionNumber: number, employeeName: string): Quote => {
  const baseId = original.parentQuoteId || original.id;
  
  return {
    ...original,
    id: `${baseId}-REV${nextRevisionNumber}`,
    parentQuoteId: baseId,
    revision: nextRevisionNumber,
    status: QuoteStatus.PENDING,
    dataEmissao: new Date().toISOString().split('T')[0],
    criadoEm: new Date().toLocaleString('pt-BR'),
    criadoPor: employeeName || 'Sistema',
  };
};
