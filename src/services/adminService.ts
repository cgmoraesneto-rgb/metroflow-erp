import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { migrateERPData } from '../utils/migration';
import { Quote, ServiceOrder, CalibrationRecord, FinancialControl, QuoteStatus } from '../types';

/**
 * Executa a migração de dados do ERP.
 */
export const executeDataMigration = async (
  quotes: Quote[],
  serviceOrders: ServiceOrder[],
  calibrationRecords: CalibrationRecord[],
  financialControls: FinancialControl[],
  saveItem: (collection: string, item: any) => Promise<void>,
  deleteItem: (collection: string, id: string) => Promise<void>
) => {
  const result = migrateERPData(quotes, serviceOrders, calibrationRecords, financialControls);
  
  // Save Quotes one by one
  for (const q of result.quotes) {
    await saveItem('quotes', q);
  }

  // Save Service Orders
  for (const os of result.serviceOrders) {
    await saveItem('service_orders', os);
  }

  // Save Calibration Records
  for (const r of result.calibrationRecords) {
    await saveItem('calibration_records', r);
  }

  // Save Financial Controls
  for (const f of result.financialControls) {
    await saveItem('financial_controls', f as any);
  }

  // Clean up old records
  const oldQuoteIds = Object.entries(result.quoteMapping)
    .filter(([oldId, newId]) => oldId !== newId).map(([oldId]) => oldId);
  const oldOsIds = Object.entries(result.osMapping)
    .filter(([oldId, newId]) => oldId !== newId).map(([oldId]) => oldId);

  for (const id of oldQuoteIds) await deleteItem('quotes', id);
  for (const id of oldOsIds) await deleteItem('service_orders', id);

  return result;
};

/**
 * Corrige o status de orçamentos que possuem O.S. vinculada mas não estão como "Aprovados".
 */
export const fixOrphanQuoteStatus = async (
  quotes: Quote[],
  serviceOrders: ServiceOrder[]
) => {
  const linkedQuoteIds = new Set(serviceOrders.map(os => os.orcamentoId));
  const quotesNeedingFix = quotes.filter(q =>
    linkedQuoteIds.has(q.id) && q.status !== QuoteStatus.APPROVED
  );

  for (const q of quotesNeedingFix) {
    const docRef = doc(db, 'quotes', q.id);
    await updateDoc(docRef, { status: QuoteStatus.APPROVED });
  }

  return quotesNeedingFix.length;
};
