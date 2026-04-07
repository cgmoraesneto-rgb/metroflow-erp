import { CalibrationRecord, StandardInstrument, Procedure } from '../types';

/**
 * ISO 17025 Compliance Engine
 * Enforces mandatory validation for certificates and reports.
 */

export interface ComplianceValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Performs a full ISO 17025 compliance checklist before certificate generation.
 */
export function validateCalibration(
  record: CalibrationRecord,
  standards: StandardInstrument[],
  procedure: Procedure | undefined
): ComplianceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Environmental Conditions (Clause 6.3)
  if (!record.temperature || record.temperature === 0) {
    errors.push("Temperatura ambiental não registrada ou inválida.");
  }
  if (!record.humidity || record.humidity === 0) {
    errors.push("Umidade ambiental não registrada ou inválida.");
  }
  if (!record.envStandardInstrumentId) {
    errors.push("Termohigrômetro de monitoramento não identificado.");
  }

  // 2. Personnel Identification (Clause 6.2)
  if (!record.technicianName || record.technicianName.trim() === '') {
    errors.push("Técnico executor não identificado.");
  }

  // 3. Equipment & Traceability (Clause 6.4 & 6.5)
  if (!record.identification || record.identification.trim() === '') {
    errors.push("Instrumento sob calibração sem identificação (TAG).");
  }
  if (standards.length === 0) {
    errors.push("Nenhum padrão metrológico associado à calibração.");
  }

  standards.forEach(si => {
    // Check validity
    const today = new Date();
    const validity = new Date(si.dataValidadeCalibracao);
    if (validity < today) {
      errors.push(`Padrão ${si.identificacao} com calibração vencida (${validity.toLocaleDateString()}).`);
    }
    // Check traceability chain
    if (!si.traceabilityChain || si.traceabilityChain.length === 0) {
      warnings.push(`Padrão ${si.identificacao} sem cadeia de rastreabilidade documentada.`);
    }
  });

  // 4. Procedure Reference (Clause 7.2)
  if (!procedure) {
    errors.push("Procedimento de calibração não referenciado.");
  }

  // 5. Non-Conformity Handling (Clause 7.10)
  // Logic: If any record.calculatedPoints[...].conformity is false, check for justification
  const hasNonConformity = Object.values(record.calculatedPoints || {}).some(p => p.conformity === 'Reprovado');
  if (hasNonConformity && (!record.justificationForNonConformity || record.justificationForNonConformity.trim() === '')) {
    errors.push("Instrumento reprovado: justificativa de não-conformidade é obrigatória.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Enforces uncertainty propagation rules (k factor sources).
 */
export function checkUncertaintyCompliance(k: number, n: number): boolean {
  if (n < 30 && k === 2) {
    // Warning: For small samples, k=2 might not cover 95.45%
    return false;
  }
  return true;
}
