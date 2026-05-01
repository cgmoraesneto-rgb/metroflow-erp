import { describe, it, expect } from 'vitest';
import { executeRow } from './calculationEngine';
import { ColumnType, ColumnBehavior } from '../types';

describe('Industrial Calculation Engine - Production Audit', () => {
  const columns = [
    { id: 'col_1', name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
    { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
    { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
  ];

  it('should execute basic math correctly (Determinism)', () => {
    const rowData = { 'col_1': 10, 'col_2': 2.5 };
    const { results } = executeRow(rowData, {}, columns);
    expect(results['col_3']).toBe(25);
  });

  it('should maintain formula integrity after column rename (ID-Based Stability)', () => {
    const columnsRenamed = [
      { id: 'col_1', name: 'New Name', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
      { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
      { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
    ];
    const rowData = { 'col_1': 10, 'col_2': 2.5 };
    const { results } = executeRow(rowData, {}, columnsRenamed);
    expect(results['col_3']).toBe(25);
  });

  it('should handle numerical instability (NaN/Infinity) gracefully', () => {
    const divZeroCols = [
      { id: 'val', name: 'V', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
      { id: 'res', name: 'R', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '10 / [val]' }
    ];
    const { results } = executeRow({ 'val': 0 }, {}, divZeroCols);
    expect(results['res']).toBe(Infinity);
  });

  it('should support RAIZ function (GUM Compliance Context)', () => {
    const arrayCols = [
      { id: 'val', name: 'Valor', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
      { id: 'sqrt_val', name: 'Raiz', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: 'RAIZ([val])' }
    ];
    const rowData = { 'val': 16 };
    const { results } = executeRow(rowData, {}, arrayCols);
    expect(results['sqrt_val']).toBe(4);
  });
});
