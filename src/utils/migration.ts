import { Quote, ServiceOrder, CalibrationRecord, FinancialControl, QuoteStatus } from '../types';

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
 */
export const remapQuoteId = (oldId: string): string => {
  const match = oldId.match(/^OCW(\d{4})26/);
  if (match) {
    const seq = parseInt(match[1], 10);
    // If it's already a high number (>= 410), it might already be migrated or new
    if (seq >= 410) return oldId;
    const newSeq = seq + QUOTE_SEQUENCE_OFFSET;
    return `OCW${newSeq.toString().padStart(4, '0')}26`;
  }
  return oldId;
};

/**
 * Remaps an OS ID from old WS format to new numeric format.
 */
export const remapOsId = (oldId: string): string => {
  if (OS_EXACT_MAP[oldId]) return OS_EXACT_MAP[oldId];
  if (/^\d+$/.test(oldId)) return oldId;
  return oldId;
};

/**
 * Main migration function.
 */
export const migrateERPData = (
  quotes: Quote[],
  serviceOrders: ServiceOrder[],
  calibrationRecords: CalibrationRecord[],
  financialControls: FinancialControl[]
) => {
  const quoteMapping: Record<string, string> = {};
  quotes.forEach(q => {
    quoteMapping[q.id] = remapQuoteId(q.id);
  });

  const osMapping: Record<string, string> = {};
  serviceOrders.forEach(os => {
    osMapping[os.id] = remapOsId(os.id);
  });

  // IDENTIFY QUOTES THAT HAVE OS (to mark as APPROVED)
  // We check all possible mappings to be sure
  const linkedQuoteIds = new Set<string>();
  serviceOrders.forEach(os => {
    linkedQuoteIds.add(os.orcamentoId);
    if (quoteMapping[os.orcamentoId]) linkedQuoteIds.add(quoteMapping[os.orcamentoId]);
  });

  // 1. Migrate Quotes
  const migratedQuotes: Quote[] = quotes.map(q => {
    const newId = quoteMapping[q.id] ?? q.id;
    const hasOS = linkedQuoteIds.has(q.id) || linkedQuoteIds.has(newId);
    
    return {
      ...q,
      id: newId,
      status: hasOS ? QuoteStatus.APPROVED : q.status
    };
  });

  // 2. Migrate Service Orders
  const migratedOS: ServiceOrder[] = serviceOrders.map(os => ({
    ...os,
    id: osMapping[os.id] ?? os.id,
    orcamentoId: quoteMapping[os.orcamentoId] ?? os.orcamentoId,
  }));

  // 3. Migrate Calibration Records
  const migratedRecords: CalibrationRecord[] = calibrationRecords.map(r => ({
    ...r,
    serviceOrderId: osMapping[r.serviceOrderId] ?? r.serviceOrderId,
  }));

  // 4. Migrate Financial Controls
  const migratedFinancial: FinancialControl[] = financialControls.map(f => ({
    ...f,
    serviceOrderId: (osMapping as any)[f.serviceOrderId] ?? (f as any).serviceOrderId,
  }));

  return {
    quotes: migratedQuotes,
    serviceOrders: migratedOS,
    calibrationRecords: migratedRecords,
    financialControls: migratedFinancial,
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
