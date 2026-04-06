import { ColumnType, ColumnBehavior, ColumnDefinition, MetrologyField } from '../types';
import { getDefaultMetrologyField } from '../metrologyDefaults';

/**
 * Portuguese labels for ColumnBehavior
 */
export function getBehaviorLabel(behavior: ColumnBehavior | string): string {
  switch (behavior) {
    case ColumnBehavior.INPUT:
      return 'Entrada Manual';
    case ColumnBehavior.CALCULATED:
      return 'Cálculo Automático';
    case ColumnBehavior.DERIVED:
      return 'Derivado';
    case ColumnBehavior.METROLOGY:
      return 'Metrológico';
    default:
      return behavior;
  }
}

/**
 * Shared utility to ensure metrologyField is correctly set based on behavior/type
 */
export function applyMetrologyDefaults(def: ColumnDefinition): ColumnDefinition {
  const newDef = { ...def };
  
  // If behavior is not METROLOGY, metrologyField MUST be undefined (System Invariant)
  if (newDef.behavior !== ColumnBehavior.METROLOGY) {
    newDef.metrologyField = undefined;
  }
  
  // If behavior is METROLOGY and no field set, use centralized defaults
  if (newDef.behavior === ColumnBehavior.METROLOGY && !newDef.metrologyField) {
    newDef.metrologyField = getDefaultMetrologyField(newDef.type);
  }
  
  return newDef;
}

/**
 * Business rule for auto-assigning behavior based on type
 */
export function getDefaultBehaviorByType(type: ColumnType): ColumnBehavior {
  const calculatedTypes = [ColumnType.MEDIA, ColumnType.ERRO, ColumnType.DESVIO_PADRAO];
  
  if (calculatedTypes.includes(type)) {
    return ColumnBehavior.CALCULATED;
  }
  
  if (type === ColumnType.INCERTEZA) {
    return ColumnBehavior.METROLOGY;
  }
  
  return ColumnBehavior.INPUT;
}
