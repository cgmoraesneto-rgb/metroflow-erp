
import { Quote, ServiceOrder, CalibrationRecord, FinancialControl } from '../types';

export const migrateERPData = (
  quotes: Quote[],
  serviceOrders: ServiceOrder[],
  calibrationRecords: CalibrationRecord[],
  financialControls: FinancialControl[]
) => {
  const quoteMapping: Record<string, string> = {};
  const osMapping: Record<string, string> = {};

  // 1. Migrate Quotes
  const migratedQuotes = quotes.map(q => {
    let newId = q.id;
    const match = q.id.match(/^OCW(\d+)26$/) || q.id.match(/^(\d+)$/);
    if (match) {
      const seq = match[1].padStart(4, '0');
      newId = `OCW${seq}26`;
    } else if (q.id.startsWith('OCW') && !q.id.endsWith('26')) {
       // Handle cases like OCW0001
       const seqMatch = q.id.match(/OCW(\d+)/);
       if (seqMatch) {
         newId = `OCW${seqMatch[1].padStart(4, '0')}26`;
       }
    }
    
    quoteMapping[q.id] = newId;
    return { ...q, id: newId };
  });

  // 2. Migrate Service Orders
  const migratedOS = serviceOrders.map(os => {
    let newId = os.id;
    // Match OSW260001 or OS26001 or 26001 or 001
    const match = os.id.match(/^(?:OSW|OS)?26(\d+)$/) || os.id.match(/^(\d+)$/);
    if (match) {
       const seq = match[1].padStart(3, '0');
       newId = `26${seq}`;
    }

    osMapping[os.id] = newId;
    
    return { 
      ...os, 
      id: newId, 
      orcamentoId: quoteMapping[os.orcamentoId] || os.orcamentoId 
    };
  });

  // 3. Migrate Calibration Records
  const migratedRecords = calibrationRecords.map(r => {
    // Standardize Certificate Number
    let newCertNumber = r.certificateNumber;
    const certMatch = r.certificateNumber?.match(/^([A-Z]{2,3}W)?(?:20\d{2}-)?(\d+)$/);
    
    if (certMatch) {
       const prefix = certMatch[1] || (r.isAccredited ? 'CRW' : 'CRW'); // Default to CRW for now if unsure
       // We should ideally check the type from the mask but we don't have it here easily
       // Let's just try to preserve the existing prefix if it has one
       const seq = certMatch[2].padStart(3, '0');
       newCertNumber = `${prefix || 'CRW'}26${seq}`;
    } else if (r.certificateNumber?.startsWith('CERT-')) {
       const seqMatch = r.certificateNumber.match(/CERT-\d+-(\d+)/);
       if (seqMatch) {
         newCertNumber = `CRW26${seqMatch[1].padStart(3, '0')}`;
       }
    }

    return {
      ...r,
      certificateNumber: newCertNumber,
      serviceOrderId: osMapping[r.serviceOrderId] || r.serviceOrderId
    };
  });

  // 4. Migrate Financial Controls
  const migratedFinancial = financialControls.map(f => ({
    ...f,
    serviceOrderId: osMapping[f.serviceOrderId] || f.serviceOrderId
  }));

  return {
    quotes: migratedQuotes,
    serviceOrders: migratedOS,
    calibrationRecords: migratedRecords,
    financialControls: migratedFinancial
  };
};
