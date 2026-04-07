import React, { useState } from 'react';
import { CalibrationRecord, StandardInstrument, ServiceOrder, Quote, Client, InstrumentType, CertificateMask, Procedure, CertificateStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ClipboardList, Activity, Clock, CheckCircle2 } from 'lucide-react';

interface TechnicalModuleProps {
  standardInstruments: StandardInstrument[];
  serviceOrders: ServiceOrder[];
  quotes: Quote[];
  clients: Client[];
  instrumentTypes: InstrumentType[];
  certificateMasks: CertificateMask[];
  calibrationRecords: CalibrationRecord[];
  procedures: Procedure[];
  onCalibrationRecordSubmit: (record: CalibrationRecord) => void;
  onSaveServiceOrder: (serviceOrder: ServiceOrder) => void;
  onSaveCalibrationRecord: (record: CalibrationRecord) => void;
  onSaveCertificateMask: (mask: any) => void;
  onDeleteCertificateMask: (id: string) => void;
  onUpdateCertificateStatus: (recordId: string, status: CertificateStatus, justification?: string) => void;
  documentTemplates?: any[];
  employees?: any[];
}

import CertificateMasksModule from './CertificateMasksModule';
import CalibrationRecordModule from './CalibrationRecordModule';
import CalibrationHistoryModule from './CalibrationHistoryModule';
import { toast } from 'sonner';

type SubTab = 'masks' | 'records' | 'history';

export default function TechnicalModule({
  standardInstruments,
  serviceOrders,
  quotes,
  clients,
  instrumentTypes,
  certificateMasks,
  calibrationRecords,
  procedures,
  onSaveServiceOrder,
  onSaveCalibrationRecord,
  onSaveCertificateMask,
  onDeleteCertificateMask,
  onUpdateCertificateStatus,
  documentTemplates = [],
  employees = []
}: TechnicalModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('masks');

  const TAB_CONFIG = [
    { id: 'masks', label: 'Máscaras de Certificados', icon: FileText, color: 'blue' },
    { id: 'records', label: 'Registro de Calibração', icon: ClipboardList, color: 'emerald' },
    { id: 'history', label: 'Histórico', icon: Clock, color: 'amber' },
  ];

  const handleRevisionRequest = (record: CalibrationRecord) => {
    if (!confirm(`Deseja iniciar uma revisão para o certificado ${record.certificateNumber}?\n\nO certificado original será despublicado do portal e um novo rascunho será aberto para edição.`)) return;

    onSaveCalibrationRecord({ ...record, isPublished: false });

    const revision: CalibrationRecord = {
      ...record,
      id: `CAL-REV-${crypto.randomUUID()}`,
      revisionOf: record.id,
      revisionNumber: (record.revisionNumber || 0) + 1,
      status: CertificateStatus.BEING_MADE,
      isDraft: true,
      isPublished: false,
      headerValidated: false,
      groups: record.groups || [],
    };

    onSaveCalibrationRecord(revision);
    toast.success(
      `Revisão ${revision.revisionNumber} iniciada! Procure a O.S. ${record.serviceOrderId} na aba de Registro de Calibração.`,
      { duration: 6000 }
    );
    setActiveSubTab('records');
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Módulo Técnico</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Gestão operacional de calibrações e máscaras de certificados.</p>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center px-4 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          {activeSubTab === 'masks' && (
            <CertificateMasksModule
              masks={certificateMasks}
              procedures={procedures}
              standardInstruments={standardInstruments}
              onSaveCertificateMask={onSaveCertificateMask}
              onDeleteCertificateMask={onDeleteCertificateMask}
            />
          )}
          {activeSubTab === 'records' &&
            <CalibrationRecordModule
              serviceOrders={serviceOrders}
              calibrationRecords={calibrationRecords}
              certificateMasks={certificateMasks}
              procedures={procedures}
              standardInstruments={standardInstruments}
              quotes={quotes}
              clients={clients}
              onSaveCalibrationRecord={onSaveCalibrationRecord}
            />}
          {activeSubTab === 'history' && (
            <CalibrationHistoryModule
              calibrationRecords={calibrationRecords}
              serviceOrders={serviceOrders}
              clients={clients}
              procedures={procedures}
              standardInstruments={standardInstruments}
              certificateMasks={certificateMasks}
              documentTemplates={documentTemplates}
              employees={employees}
              onRevisionRequest={handleRevisionRequest}
              onUpdateCertificateStatus={onUpdateCertificateStatus}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
