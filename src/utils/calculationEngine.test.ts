
import { describe, it, expect } from 'vitest';
import { executeRow, validateFormula, getExecutionOrder } from './calculationEngine';
import { ColumnType, ColumnBehavior } from '../types';

describe('Industrial Calculation Engine - Production Audit', () => {
  const columns = [
    { id: 'col_1', name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
    { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
    { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
  ];

  it('should execute basic math correctly (Determinism)', () => {
    const rowData = { 'col_1': 10, 'col_2': 2.5 };
    const result = executeRow(rowData, columns);
    expect(result.values['col_3']).toBe(25);
  });

  it('should maintain formula integrity after column rename (ID-Based Stability)', () => {
    const columnsRenamed = [
      { id: 'col_1', name: 'New Name', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
      { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
      { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
    ];
    const rowData = { 'col_1': 10, 'col_2': 2.5 };
    const result = executeRow(rowData, columnsRenamed);
    expect(result.values['col_3']).toBe(25);
  });

  it('should detect and block circular dependencies', () => {
    const circularCols = [
      { id: 'a', name: 'A', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[b] + 1' },
      { id: 'b', name: 'B', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[a] + 1' }
    ];
    expect(() => getExecutionOrder(circularCols)).toThrow('Depêndencia circular detectada!');
  });

  it('should handle numerical instability (NaN/Infinity) gracefully', () => {
    const divZeroCols = [
      { id: 'val', name: 'V', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
      { id: 'res', name: 'R', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '10 / [val]' }
    ];
    const result = executeRow({ 'val': 0 }, divZeroCols);
    expect(result.errors['res']).toBeDefined();
    expect(result.errors['res']).toContain('Resultado numérico inválido');
  });

  it('should support array math (GUM Compliance Context)', () => {
    const arrayCols = [
      { id: 'readings', name: 'Leituras', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
      { id: 'avg', name: 'Média', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: 'mean([readings])' }
    ];
    const rowData = { 'readings': [10, 20, 30] };
    const result = executeRow(rowData, arrayCols);
    expect(result.values['avg']).toBe(20);
  });
});
