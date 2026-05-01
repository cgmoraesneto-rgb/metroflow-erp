import { 
  CalibrationGroupRecord, 
  StandardInstrumentUncertainty,
  ColumnBehavior
} from '../types';
import { evaluate } from './formulaParser';

/**
 * Motor de Cálculo MetroFlow
 * Realiza cálculos metrológicos robustos e avalia fórmulas dinâmicas.
 */

export const executeRow = (
  row: any, 
  globalValues: Record<string, number>,
  columnDefinitions: any[]
) => {
  const results: Record<string, any> = { ...row };
  const trace: Record<string, { formula: string, output: any }> = {};

  // 1. Extrair valores numéricos da linha para o contexto da fórmula
  const rowContext: Record<string, number> = { ...globalValues };
  columnDefinitions.forEach(col => {
    const val = row[col.id];
    if (val !== undefined && val !== '') {
      // Replaces all commas with dots to ensure correct parsing in PT-BR context
      rowContext[col.id] = parseFloat(String(val).replace(/,/g, '.')) || 0;
    }
  });

  // 2. Processar colunas que possuem fórmulas
  columnDefinitions.forEach(col => {
    if (col.behavior === ColumnBehavior.CALCULATED && col.formula) {
      try {
        const cleanFormula = col.formula.startsWith('=') ? col.formula.substring(1) : col.formula;
        const result = evaluate(cleanFormula, rowContext);
        
        results[col.id] = result;
        trace[col.id] = { formula: col.formula, output: result };
        
        // Atualizar contexto para fórmulas subsequentes na mesma linha
        rowContext[col.id] = result;
      } catch (e) {
        results[col.id] = 'Erro';
        trace[col.id] = { formula: col.formula, output: 'Erro na fórmula' };
      }
    }
  });

  return { results, trace };
};

export const executeDocument = (
  data: { groups: CalibrationGroupRecord[] },
  standardInstruments: any[],
  globalContext: Record<string, number> = {},
  standardDetails: StandardInstrumentUncertainty[] = [],
  metrologyContext: { resolution?: number } = {}
) => {
  const results: Record<string, any> = {};
  
  // 1. Calcular U_PADRAO Combinada (RSS - Root Sum Square)
  // U_total = sqrt( U1^2 + U2^2 + ... )
  let sumSq = 0;
  let maxK = 2.0;

  standardDetails.forEach(detail => {
    const u = detail.declaredU || 0;
    sumSq += (u * u);
    if (detail.certificateK && detail.certificateK > maxK) {
      maxK = detail.certificateK;
    }
  });

  const combinedUPadrao = Math.sqrt(sumSq);

  // 2. Preparar valores globais (TAGS fixas)
  const globalValues: Record<string, number> = {
    ...globalContext,
    'U_PADRAO': combinedUPadrao,
    'K_PADRAO': maxK,
    'RESOLUCAO': metrologyContext.resolution || 0
  };

  // 3. Processar cada grupo e linha
  data.groups.forEach(group => {
    group.rows.forEach((row, ri) => {
      const rowResult = executeRow(row, globalValues, group.columnDefinitions || []);
      const key = `${group.blockId || group.name}_row${ri}`;
      results[key] = {
        ...rowResult.results,
        trace: rowResult.trace
      };
    });
  });

  return { results };
};

export const captureSnapshot = async (
  groups: CalibrationGroupRecord[],
  columnDefinitions: any[]
) => {
  const rowData: Record<string, any> = {};
  const computedValues: Record<string, any> = {};
  
  groups.forEach(group => {
    group.rows.forEach((row, ri) => {
      const key = `${group.blockId || group.name}_row${ri}`;
      rowData[key] = row;
    });
  });

  return {
    rowData,
    computedValues,
    executionOrder: [],
    formulas: {},
    timestamp: new Date().toISOString(),
    hash: 'audit-' + Date.now()
  };
};
