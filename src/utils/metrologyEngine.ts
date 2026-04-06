import { CalibrationPointResult, StandardInstrumentUncertainty } from '../types';

const T_STUDENT_TABLE: Record<number, number> = {
  1: 13.97, 2: 4.53, 3: 3.31, 4: 2.87, 5: 2.65, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
  15: 2.18, 20: 2.13, 25: 2.11, 30: 2.09,
};

function getTStudent(veff: number): number {
  if (veff <= 0) return 13.97;
  if (veff >= 30) return 2.00;
  const vKeys = Object.keys(T_STUDENT_TABLE).map(Number).sort((a, b) => a - b);
  if (T_STUDENT_TABLE[veff]) return T_STUDENT_TABLE[veff];
  let v1 = vKeys[0];
  let v2 = vKeys[vKeys.length - 1];
  for (let i = 0; i < vKeys.length - 1; i++) {
    if (veff > vKeys[i] && veff < vKeys[i + 1]) {
      v1 = vKeys[i]; v2 = vKeys[i + 1]; break;
    }
  }
  const k1 = T_STUDENT_TABLE[v1];
  const k2 = T_STUDENT_TABLE[v2];
  return k1 + (veff - v1) * (k2 - k1) / (v2 - v1);
}

/**
 * Industrial Metrology Engine - GUM Compliant
 * Processes array of readings and returns full metrological analysis.
 */
export function executeMetrology(
  readings: number[],
  uncertainties: StandardInstrumentUncertainty[],
  resolution: number,
  vvc: number,
  tolerance?: number
): CalibrationPointResult {
  const n = readings.length;
  if (n === 0) throw new Error("Nenhuma leitura fornecida.");

  const mean = readings.reduce((a, b) => a + b, 0) / n;
  const error = mean - vvc;
  
  let stdDev = 0;
  if (n > 1) {
    const variance = readings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    stdDev = Math.sqrt(variance);
  }

  // uA: Type A Uncertainty (Repeatability)
  const uA = n > 1 ? stdDev / Math.sqrt(n) : 0;
  
  // uB_res: Type B Uncertainty from Resolution (Rectangular distribution)
  const uB_res = (resolution / 2) / Math.sqrt(3);
  
  // uB_pad: Type B Uncertainty from Standards
  const uB_pad = Math.sqrt(uncertainties.reduce((acc, unc) => {
    // Normal distribution assumed if k is provided, else rectangular
    const divisor = unc.certificateK || Math.sqrt(3);
    return acc + Math.pow(unc.declaredU / divisor, 2);
  }, 0));

  // uC: Combined Standard Uncertainty
  const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB_res, 2) + Math.pow(uB_pad, 2));

  let k = 2.00;
  let kMethod: 'standard' | 'tStudent' = 'standard';
  let veff: number | undefined = undefined;

  // Use t-Student if uA is dominant and n is small
  if (uA >= 0.5 * uC && n < 30 && uA > 0) {
    // Welch-Satterthwaite simplification for dominant uA
    veff = Math.pow(uC / uA, 4) * (n - 1);
    k = getTStudent(Math.round(veff));
    kMethod = 'tStudent';
  }

  // U: Expanded Uncertainty
  const U = k * uC;
  if (!Number.isFinite(U) || isNaN(U)) {
    throw new Error("Erro no cálculo da incerteza: verifique os padrões e a resolução.");
  }
  const result = `${mean.toFixed(4)} ± ${U.toFixed(4)}`;
  
  let conformity: 'Aprovado' | 'Reprovado' | 'Sem Tolerância' = 'Sem Tolerância';
  if (tolerance !== undefined) {
    conformity = Math.abs(error) + U <= tolerance ? 'Aprovado' : 'Reprovado';
  }

  return {
    mean, 
    error, 
    stdDev, 
    uA, 
    uB_res, 
    uB_pad, 
    uC, 
    k, 
    kMethod, 
    veff, 
    U, 
    result, 
    conformity, 
    vvc, 
    readings
  };
}
