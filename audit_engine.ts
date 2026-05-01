
import { executeRow } from './src/utils/calculationEngine';
import { ColumnType, ColumnBehavior } from './src/types';

const columns = [
  { id: 'col_1', name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
  { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
  { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
];

console.log("--- TEST 1: Basic Execution ---");
const rowData = { 'col_1': 10, 'col_2': 2.5 };
const { results } = executeRow(rowData, {}, columns);
console.log("Result for [col_3]:", results['col_3']);
if (results['col_3'] === 25) {
  console.log("✅ PASS");
} else {
  console.log("❌ FAIL");
}

console.log("\n--- TEST 2: ID Stability (Rename) ---");
const columnsRenamed = [
  { id: 'col_1', name: 'New Name', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
  { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
  { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
];
const { results: results2 } = executeRow(rowData, {}, columnsRenamed);
console.log("Result after rename:", results2['col_3']);
if (results2['col_3'] === 25) {
  console.log("✅ PASS: Formula unaffected by column rename");
} else {
  console.log("❌ FAIL: Formula broken by column rename");
}

console.log("\n--- TEST 3: Numerical Stability (Div by Zero) ---");
const divZeroCols = [
  { id: 'val', name: 'V', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
  { id: 'res', name: 'R', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '10 / [val]' }
];
const { results: results3 } = executeRow({ 'val': 0 }, {}, divZeroCols);
console.log("Result for 10/0:", results3['res']);
if (results3['res'] === Infinity) {
  console.log("✅ PASS: Numerical instability handled");
} else {
  console.log("❌ FAIL");
}

console.log("\n--- AUDIT COMPLETE ---");
