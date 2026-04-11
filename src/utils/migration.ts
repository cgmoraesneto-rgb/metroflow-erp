import { Quote, ServiceOrder, CalibrationRecord, FinancialControl } from '../types';

/**
 * EXACT REMAPPING TABLES
 * 
 * Quotes: OCW0001 -> OCW0410, OCW0002 -> OCW0411, OCW0003 -> OCW0412 ...
 * The sequence offset is 409 (because 0001 becomes 0410, i.e. 0001 + 409 = 0410)
 * 
 * Service Orders (exact manual mapping):
 *   WS837683 -> 26280
 *   WS179090 -> 26281
 *   WS541325 -> 26282
 */

const QUOTE_SEQUENCE_OFFSET = 409; // 0001 + 409 = 0410

const OS_EXACT_MAP: Record<string, string> = {
  'WS837683': '26280',
  'WS179090': '26281',
  'WS541325': '26282',
};

/**
 * Remaps a quote ID from the old format to the new format.
 * OCW000126 -> extracts seq 1, adds 409 -> 410 -> OCW041026
 * OCW000226 -> seq 2 + 409 = 411 -> OCW041126
 */
export const remapQuoteId = (oldId: string): string => {
  // Match format OCW0001 26 or OCW000126
  const match = oldId.match(/^OCW(\d{4})26/);
  if (match) {
    const seq = parseInt(match[1], 10);
    const newSeq = seq + QUOTE_SEQUENCE_OFFSET;
    return `OCW${newSeq.toString().padStart(4, '0')}26`;
  }
  // Already in new format or unknown format – return as-is
  return oldId;
};

/**
 * Remaps an OS ID from old WS format to new numeric format.
 * Uses the exact manual map for known IDs.
 */
export const remapOsId = (oldId: string): string => {
  if (OS_EXACT_MAP[oldId]) return OS_EXACT_MAP[oldId];
  // If already in new format (numeric 26XXX), return as-is
  if (/^\d+$/.test(oldId)) return oldId;
  return oldId;
};

/**
 * Main migration function.
 * Returns migrated copies of all data arrays with updated IDs and cross-references.
 */
export const migrateERPData = (
  quotes: Quote[],
  serviceOrders: ServiceOrder[],
  calibrationRecords: CalibrationRecord[],
  financialControls: FinancialControl[]
) => {
  // Build mapping tables FIRST so cross-references can be updated
  const quoteMapping: Record<string, string> = {};
  quotes.forEach(q => {
    quoteMapping[q.id] = remapQuoteId(q.id);
  });

  const osMapping: Record<string, string> = {};
  serviceOrders.forEach(os => {
    osMapping[os.id] = remapOsId(os.id);
  });

  // 1. Migrate Quotes
  const migratedQuotes: Quote[] = quotes.map(q => ({
    ...q,
    id: quoteMapping[q.id] ?? q.id,
  }));

  // 2. Migrate Service Orders – also update the linked quote reference
  const migratedOS: ServiceOrder[] = serviceOrders.map(os => ({
    ...os,
    id: osMapping[os.id] ?? os.id,
    orcamentoId: quoteMapping[os.orcamentoId] ?? os.orcamentoId,
  }));

  // 3. Migrate Calibration Records – update linked OS reference
  const migratedRecords: CalibrationRecord[] = calibrationRecords.map(r => ({
    ...r,
    serviceOrderId: osMapping[r.serviceOrderId] ?? r.serviceOrderId,
  }));

  // 4. Migrate Financial Controls – update linked OS reference
  const migratedFinancial: FinancialControl[] = financialControls.map(f => ({
    ...f,
    serviceOrderId: (osMapping as any)[f.serviceOrderId] ?? (f as any).serviceOrderId,
  }));

  return {
    quotes: migratedQuotes,
    serviceOrders: migratedOS,
    calibrationRecords: migratedRecords,
    financialControls: migratedFinancial,
    // Return mappings so caller can delete old records
    quoteMapping,
    osMapping,
  };
};

/**
 * Generates the next quote ID based on existing quotes.
 * Will always be >= OCW041026.
 */
export const generateNextQuoteId = (existingQuotes: Quote[]): string => {
  const MIN_SEQ = 410; // OCW041026 is the first valid number
  let maxSeq = MIN_SEQ - 1;

  existingQuotes.forEach(q => {
    const match = q.id.match(/^OCW(\d{4})26/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = Math.max(maxSeq + 1, MIN_SEQ);
  return `OCW${nextSeq.toString().padStart(4, '0')}26`;
};

/**
 * Generates the next OS ID based on existing service orders.
 * Will always be >= 26283 (26280–26282 are the manually mapped ones).
 */
export const generateNextOsId = (existingOrders: ServiceOrder[]): string => {
  const MIN_SEQ = 26283; // 26280-26282 are the migrated IDs
  let maxSeq = MIN_SEQ - 1;

  existingOrders.forEach(os => {
    const match = os.id.match(/^(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = Math.max(maxSeq + 1, MIN_SEQ);
  return nextSeq.toString();
};
