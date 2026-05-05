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
  globalValues: Record<string, any>,
  columnDefinitions: any[],
  rowIndex: number
) => {
  const results: Record<string, any> = { ...row };
  const trace: Record<string, { formula: string, output: any }> = {};

  // 1. Preparar o contexto da linha
  // O contexto inclui valores globais, valores da linha atual e referências cruzadas
  const rowContext: Record<string, any> = { ...globalValues };
  
  // Adicionar valores da linha atual (sobrescreve se houver conflito com global, o que é desejado)
  columnDefinitions.forEach(col => {
    const val = row[col.id];
    if (val !== undefined && val !== '') {
      rowContext[col.id] = typeof val === 'string' ? parseFloat(val.replace(/,/g, '.')) || 0 : val;
    } else {
      rowContext[col.id] = 0;
    }
  });

  // 2. Processar colunas calculadas
  columnDefinitions.forEach(col => {
    if (col.behavior === ColumnBehavior.CALCULATED && col.formula) {
      try {
        const cleanFormula = col.formula.startsWith('=') ? col.formula.substring(1) : col.formula;
        
        // Injetar valores de outras tabelas para o índice atual se solicitado explicitamente ou como fallback
        // Se a fórmula usa [OUTRA_TABELA.COLUNA], o rowContext já deve ter isso mapeado como Array.
        // O evaluate() do formulaParser lida com arrays se as funções (MEAN, SUM) forem usadas.
        
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
  
  // 1. Preparar Contexto Global e de Referência Cruzada
  const globalValues: Record<string, any> = {
    ...globalContext,
    'RESOLUCAO': metrologyContext.resolution || 0
  };

  // Cálculo de Incerteza do Padrão (RSS)
  let sumSq = 0;
  let maxK = 2.0;
  standardDetails.forEach(detail => {
    const u = detail.declaredU || 0;
    sumSq += (u * u);
    if (detail.certificateK && detail.certificateK > maxK) maxK = detail.certificateK;
  });
  globalValues['U_PADRAO'] = Math.sqrt(sumSq);
  globalValues['K_PADRAO'] = maxK;

  // 2. Pré-mapear todos os valores de todas as tabelas para permitir referências cruzadas [GRUPO.COLUNA]
  data.groups.forEach(group => {
    const groupId = group.blockId || group.name;
    if (!group.columnDefinitions) return;

    group.columnDefinitions.forEach(col => {
      const colKey = `${groupId}.${col.id}`;
      // Mapeia a coluna inteira como um array para funções como MEAN([GRUPO.COL])
      globalValues[colKey] = group.rows.map(r => {
        const val = r[col.id];
        return typeof val === 'string' ? parseFloat(val.replace(/,/g, '.')) || 0 : (val || 0);
      });
    });
  });

  // 3. Processar cada grupo e linha
  data.groups.forEach(group => {
    group.rows.forEach((row, ri) => {
      // O executeRow recebe o globalValues que agora contém as referências [GRUPO.COL]
      const rowResult = executeRow(row, globalValues, group.columnDefinitions || [], ri);
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
