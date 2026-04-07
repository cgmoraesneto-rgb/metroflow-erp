import { ColumnDefinition, ColumnType, ColumnBehavior, CellValue, RowData, ExecutionResult, ExecutionTrace, ExecutionSnapshot } from '../types';
import { evaluate, extractColumnDependencies } from './formulaParser';
import { executeMetrology } from './metrologyEngine';

/**
 * Builds a topological sort order for column execution
 */
export function getExecutionOrder(definitions: ColumnDefinition[]): ColumnDefinition[] {
  const order: ColumnDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const defMap = new Map<string, ColumnDefinition>();
  definitions.forEach(d => defMap.set(d.id, d));

  function visit(id: string) {
    if (visiting.has(id)) throw new Error('Depêndencia circular detectada!');
    if (visited.has(id)) return;

    visiting.add(id);
    const def = defMap.get(id);
    if (def && def.formula) {
      const deps = extractColumnDependencies(def.formula);
      deps.forEach(depId => visit(depId));
    }
    visiting.delete(id);
    visited.add(id);
    if (def) order.push(def);
  }

  definitions.forEach(d => visit(d.id));
  return order;
}

/**
 * Industrial execution engine for a single row
 */
export function executeRow(
  rowData: RowData,
  definitions: ColumnDefinition[],
  metrologyContext?: {
    readings: number[];
    vvc: number;
    resolution: number;
    uncertainties: any[];
  },
  enableTrace: boolean = false
): ExecutionResult {
  const values = { ...rowData };
  const errors: Record<string, string> = {};
  const trace: ExecutionTrace = {};
  
  // 1. Resolve Order
  let order: ColumnDefinition[];
  try {
    order = getExecutionOrder(definitions);
  } catch (e: any) {
    return { values, errors: { global: e.message } };
  }

  // 2. Compute Metrology Context if available (Source of Truth)
  let metrologyResult: any = null;
  if (metrologyContext) {
    metrologyResult = executeMetrology(
      metrologyContext.readings,
      metrologyContext.uncertainties,
      metrologyContext.resolution,
      metrologyContext.vvc
    );
  }

  // 3. Execute in Order
  order.forEach((def, index) => {
    try {
      if (def.behavior === ColumnBehavior.METROLOGY && def.metrologyField) {
        if (metrologyResult) {
           values[def.id] = metrologyResult[def.metrologyField];
           
           if (enableTrace) {
             trace[def.id] = {
               formula: `metrology:${def.metrologyField}`,
               dependencies: [],
               inputs: {},
               output: values[def.id],
               executionIndex: index,
               timestamp: Date.now()
             };
           }
        }
      } else if (def.behavior === ColumnBehavior.CALCULATED && def.formula) {
        const deps = extractColumnDependencies(def.formula);
        const inputs: Record<string, CellValue> = {};
        deps.forEach(d => inputs[d] = values[d]);

        values[def.id] = evaluate(def.formula, values);

        if (enableTrace) {
          trace[def.id] = {
            formula: def.formula,
            dependencies: deps,
            inputs: inputs,
            output: values[def.id],
            executionIndex: index,
            timestamp: Date.now()
          };
        }
      }
    } catch (err: any) {
      values[def.id] = null;
      errors[def.id] = err.message;
    }
  });

  return { values, errors, trace: enableTrace ? trace : undefined };
}

/**
 * Milestone 6: Captures a full execution snapshot for a mask/result pair.
 * Ensures that if the mask is edited later, the historical record remains frozen.
 */
export async function captureSnapshot(
    groups: any[],
    definitions: ColumnDefinition[]
): Promise<ExecutionSnapshot> {
    const rowData: Record<string, CellValue> = {};
    const computedValues: Record<string, number> = {};
    const formulas: Record<string, string> = {};
    
    // Aggregate data across all groups
    groups.forEach(group => {
        group.rows.forEach((row: any, idx: number) => {
            const rowKeyPrefix = `${group.name}_row${idx}_`;
            definitions.forEach(def => {
                rowData[`${rowKeyPrefix}${def.id}`] = row[def.id];
            });
        });
    });

    const executionOrder = getExecutionOrder(definitions).map(d => d.id);
    definitions.forEach(d => {
        if (d.formula) formulas[d.id] = d.formula;
    });

    const snapshot: Omit<ExecutionSnapshot, 'hash'> = {
        rowData,
        computedValues,
        executionOrder,
        formulas,
        timestamp: new Date().toISOString()
    };

    // Calculate integrity hash
    const snapshotString = JSON.stringify(snapshot);
    const hash = await import('./auditEngine').then(m => m.sha256(snapshotString));

    return {
        ...snapshot,
        hash
    };
}

/**
 * Helper to identify which columns need recalculating when one changes
 */
export function getAffectedColumns(changedId: string, definitions: ColumnDefinition[]): string[] {
  const affected: string[] = [];
  const defMap = new Map<string, ColumnDefinition>();
  definitions.forEach(d => defMap.set(d.id, d));

  function search(id: string) {
    definitions.forEach(d => {
      if (d.formula && extractColumnDependencies(d.formula).includes(id)) {
        if (!affected.includes(d.id)) {
          affected.push(d.id);
          search(d.id);
        }
      }
    });
  }

  search(changedId);
  return affected;
}

/**
 * Migration utility for legacy name-based formulas
 */
export function migrateFormula(formula: string, columns: ColumnDefinition[]): string {
  let migrated = formula;
  columns.forEach(col => {
    // Regex to match [Name] specifically (not partially)
    const escapedName = col.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[${escapedName}\\]`, 'g');
    migrated = migrated.replace(regex, `[${col.id}]`);
  });
  return migrated;
}

export function validateFormula(formula: string, columns: ColumnDefinition[]): { valid: boolean; error?: string } {
  try {
    const deps = extractColumnDependencies(formula);
    const validIds = new Set(columns.map(c => c.id));
    for (const depId of deps) {
      if (!validIds.has(depId)) return { valid: false, error: `Referência desconhecida: ${depId}` };
    }
    
    // Check syntax
    evaluate(formula, Object.fromEntries(columns.map(c => [c.id, 0])));
    
    // Check circular dependencies by simulating execution order
    getExecutionOrder(columns);
    
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}
