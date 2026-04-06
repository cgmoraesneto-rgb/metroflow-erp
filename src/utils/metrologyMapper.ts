import { CalibrationPointResult, MetrologyField, MetrologyValue } from '../types';

/**
 * Maps a metrology field name to its corresponding formatted value from the engine result.
 * 
 * @param field The MetrologyField to extract
 * @param result The CalibrationPointResult object from the calculation engine
 * @param decimalPlaces Number of decimal places for rounding (default: 4)
 * @returns MetrologyValue object with value and optional formatting
 */
export function getMetrologyValue(
  field: MetrologyField,
  result: CalibrationPointResult,
  decimalPlaces = 4
): MetrologyValue {
  if (!result) {
    return { value: '', formatted: '—' };
  }

  switch (field) {
    case 'mean':
      return { 
        value: result.mean, 
        precision: decimalPlaces, 
        formatted: result.mean.toFixed(decimalPlaces) 
      };
    case 'error':
      return { 
        value: result.error, 
        precision: decimalPlaces, 
        formatted: result.error.toFixed(decimalPlaces) 
      };
    case 'stdDev':
      return { 
        value: result.stdDev, 
        precision: 6, 
        formatted: result.stdDev.toFixed(6) 
      };
    case 'uA':
      return { 
        value: result.uA, 
        precision: 6, 
        formatted: result.uA.toFixed(6) 
      };
    case 'uB_res':
      return { 
        value: result.uB_res, 
        precision: 6, 
        formatted: result.uB_res.toFixed(6) 
      };
    case 'uB_pad':
      return { 
        value: result.uB_pad, 
        precision: 6, 
        formatted: result.uB_pad.toFixed(6) 
      };
    case 'uC':
      return { 
        value: result.uC, 
        precision: 6, 
        formatted: result.uC.toFixed(6) 
      };
    case 'k':
      return { 
        value: result.k, 
        precision: 2, 
        formatted: result.k.toFixed(2) 
      };
    case 'veff':
      return { 
        value: result.veff || 'inf', 
        precision: 1, 
        formatted: result.veff ? result.veff.toFixed(1) : '∞' 
      };
    case 'U':
      return { 
        value: result.U, 
        precision: decimalPlaces, 
        formatted: `± ${result.U.toFixed(decimalPlaces)}` 
      };
    case 'conformity':
      return { 
        value: result.conformity, 
        formatted: result.conformity 
      };
    default:
      return { value: '', formatted: '' };
  }
}
