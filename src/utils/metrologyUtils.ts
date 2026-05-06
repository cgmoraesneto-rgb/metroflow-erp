import { ColumnType, ColumnBehavior, ColumnDefinition, CalibrationRecord, CertificateStatus } from '../types';
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

/**
 * Sanitiza e reduz o tamanho do objeto da máscara para salvamento em snapshots.
 * Remove metadados de UI, descrições longas e templateRows redundantes.
 */
export function sanitizeMaskSnapshot(mask: any): any {
  if (!mask) return null;
  const s = { ...mask };
  
  // Remove campos não essenciais para a reconstrução metrológica do PDF
  delete s.description;
  delete s.updatedAt;
  delete s.createdAt;
  delete s.createdBy;
  delete s.status;
  
  const cleanGroup = (grp: any) => ({
    ...grp,
    templateRows: undefined, // Remove linhas de exemplo/template (pesadas e desnecessárias)
    columnDefinitions: grp.columnDefinitions?.map((col: any) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      behavior: col.behavior,
      formula: col.formula,
      decimalPlaces: col.decimalPlaces,
      metrologyField: col.metrologyField,
      unit: col.unit,
      displayFormat: col.displayFormat
    }))
  });

  if (s.sections && Array.isArray(s.sections)) {
    s.sections = s.sections.map((sec: any) => ({
      ...sec,
      description: undefined,
      groups: sec.groups?.map(cleanGroup)
    }));
  }

  if (s.measurementGroups && Array.isArray(s.measurementGroups)) {
    s.measurementGroups = s.measurementGroups.map(cleanGroup);
  }

  return s;
}

/**
 * Gera um número de certificado único.
 */
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CERT-${year}-${random}`;
}

/**
 * Prepara um objeto de registro de calibração para salvamento.
 */
export function prepareCalibrationRecord(params: {
  existing?: CalibrationRecord,
  isAvulso: boolean,
  selectedOSId?: string,
  clientId?: string,
  quoteItemIndex: number,
  unitIndex?: number,
  instrumentDetails: any,
  topDetails: any,
  envConditions: any,
  kFactorJustification: string,
  observations: string,
  attachments: string[],
  standardInstruments: any[],
  isOfficial: boolean
}): CalibrationRecord {
  const { existing, isAvulso, selectedOSId, clientId, quoteItemIndex, unitIndex, instrumentDetails, topDetails, envConditions, kFactorJustification, observations, attachments, standardInstruments, isOfficial } = params;

  return {
    ...existing,
    id: existing?.id || `CAL-${Date.now()}`,
    serviceOrderId: isAvulso ? 'AVULSO' : (selectedOSId || 'AVULSO'),
    clientId: isAvulso ? clientId : undefined,
    quoteItemIndex: isAvulso ? -1 : quoteItemIndex,
    unitIndex: unitIndex !== undefined ? unitIndex : undefined,
    instrumentName: instrumentDetails.instrumentName,
    certificateNumber: topDetails.certificateNumber,
    calibrationDate: topDetails.calibrationDate,
    nextCalibrationDate: topDetails.nextCalibrationDate,
    technicianName: topDetails.technicianName,
    manufacturer: instrumentDetails.manufacturer,
    model: instrumentDetails.model,
    serialNumber: instrumentDetails.serialNumber,
    identification: instrumentDetails.identification,
    periodicity: instrumentDetails.periodicity,
    calibrationLocation: envConditions.calibrationLocation || 'Laboratório Wantec/LRM',
    resolution: instrumentDetails.resolution,
    capacidadeMinima: instrumentDetails.capacidadeMinima,
    capacidadeMaxima: instrumentDetails.capacidadeMaxima,
    unidadeMedida: instrumentDetails.unidadeMedida,
    temperature: envConditions.temperature,
    humidity: envConditions.humidity,
    envStandardInstrumentId: envConditions.envStandardInstrumentId,
    environmentalStandardId: envConditions.envStandardInstrumentId,
    // Preserve core metrology links
    certificateMaskId: existing?.certificateMaskId || '',
    procedureId: existing?.procedureId || '',
    standardInstrumentIds: existing?.standardInstrumentIds || [],
    observations: observations,
    attachments: attachments,
    groups: existing?.groups || [],
    calculatedPoints: existing?.calculatedPoints || {},
    status: existing?.status || CertificateStatus.BEING_MADE,
    isDraft: existing?.isDraft ?? !isOfficial,
    headerValidated: isOfficial,
    headerSaved: true,
    isAccredited: topDetails.isAccredited,
    kFactorJustification: kFactorJustification as 'Padrão (k=2 para 95.45%)' | 'Welch-Satterthwaite',
    // Snapshot of environmental standard
    envStandardInstrumentSnapshot: standardInstruments?.find(si => si.id === envConditions.envStandardInstrumentId)
  };
}
