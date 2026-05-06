/**
 * Utilitários Financeiros MetroFlow
 * Focado em precisão de cálculos decimais e regras de negócio financeiras.
 */

/**
 * Calcula o valor de uma comissão garantindo 2 casas decimais.
 */
export function calculateCommission(grossValue: number, percentage: number): number {
  if (!grossValue || !percentage) return 0;
  // Usamos arredondamento para centavos para evitar erros de ponto flutuante do JS (ex: 0.1 + 0.2)
  return Math.round(grossValue * (percentage / 100) * 100) / 100;
}

/**
 * Calcula o valor líquido com base nos impostos retidos.
 */
export function calculateNetValue(grossValue: number, taxRate: number): number {
  if (!grossValue) return 0;
  const taxes = Math.round(grossValue * (taxRate / 100) * 100) / 100;
  return Math.round((grossValue - taxes) * 100) / 100;
}

/**
 * Formata um valor monetário para exibição (BRL).
 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
