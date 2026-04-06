
import { executeRow, validateFormula, getExecutionOrder } from './src/utils/calculationEngine';
import { ColumnType, ColumnBehavior } from './src/types';

const columns = [
  { id: 'col_1', name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
  { id: 'col_2', name: 'Fator', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
  { id: 'col_3', name: 'Calculado', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[col_1] * [col_2]' }
];

console.log("--- TEST 1: Basic Execution ---");
const rowData = { 'col_1': 10, 'col_2': 2.5 };
const result = executeRow(rowData, columns);
console.log("Result for [col_3]:", result.values['col_3']);
if (result.values['col_3'] === 25) {
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
const result2 = executeRow(rowData, columnsRenamed);
console.log("Result after rename:", result2.values['col_3']);
if (result2.values['col_3'] === 25) {
  console.log("✅ PASS: Formula unaffected by column rename");
} else {
  console.log("❌ FAIL: Formula broken by column rename");
}

console.log("\n--- TEST 3: Circular Dependency ---");
const circularCols = [
  { id: 'a', name: 'A', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[b] + 1' },
  { id: 'b', name: 'B', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '[a] + 1' }
];
try {
  getExecutionOrder(circularCols);
  console.log("❌ FAIL: Circular dependency not detected");
} catch (e: any) {
  console.log("✅ PASS: Circular dependency blocked:", e.message);
}

console.log("\n--- TEST 4: Numerical Stability (Div by Zero) ---");
const divZeroCols = [
  { id: 'val', name: 'V', type: ColumnType.TEXTO, behavior: ColumnBehavior.INPUT },
  { id: 'res', name: 'R', type: ColumnType.TEXTO, behavior: ColumnBehavior.CALCULATED, formula: '10 / [val]' }
];
const result3 = executeRow({ 'val': 0 }, divZeroCols);
console.log("Result for 10/0:", result3.values['res']);
console.log("Error recorded:", result3.errors['res']);
if (result3.errors['res']) {
  console.log("✅ PASS: Numerical instability handled via error");
} else {
  console.log("❌ FAIL");
}

console.log("\n--- AUDIT COMPLETE ---");
