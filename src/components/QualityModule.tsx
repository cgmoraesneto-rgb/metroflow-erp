import React, { useState } from 'react';
import { ServiceOrder, StandardInstrument, CalibrationRecord, Client, CertificateStatus, Procedure, CertificateMask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Wrench, CheckCircle, History, FileText } from 'lucide-react';
import QualityApprovalModule from './QualityApprovalModule';
import ProceduresModule from './ProceduresModule';
import StandardInstrumentsModule from './StandardInstrumentsModule';
import IssuedCertificatesModule from './IssuedCertificatesModule';
import CertificateMasksModule from './CertificateMasksModule';

interface QualityModuleProps {
  standardInstruments: StandardInstrument[];
  procedures: Procedure[];
  calibrationRecords: CalibrationRecord[];
  serviceOrders: ServiceOrder[];
  clients: Client[];
  certificateMasks: CertificateMask[];
  employees: any[];
  onUpdateCertificateStatus: (recordId: string, status: CertificateStatus, justification?: string, signatarioId?: string) => void;
  onCreateRevision: (original: CalibrationRecord) => void;
  onSaveStandardInstrument: (si: any) => void;
  onDeleteStandardInstrument: (id: string) => void;
  onSaveProcedure: (proc: any) => void;
  onDeleteProcedure: (id: string) => void;
  onSaveCertificateMask: (mask: any) => void;
  onDeleteCertificateMask: (id: string) => void;
  documentTemplates?: any[];
  searchQuery?: string;
}

type SubTab = 'masks' | 'procedures' | 'standards' | 'issued' | 'approvals';

export default function QualityModule({
  standardInstruments,
  procedures,
  calibrationRecords,
  serviceOrders,
  clients,
  certificateMasks,
  employees,
  onUpdateCertificateStatus,
  onCreateRevision,
  onSaveStandardInstrument,
  onDeleteStandardInstrument,
  onSaveProcedure,
  onDeleteProcedure,
  onSaveCertificateMask,
  onDeleteCertificateMask,
  documentTemplates = [],
  searchQuery
}: QualityModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('masks');

  const TAB_CONFIG = [
    { id: 'masks', label: 'Máscaras de Certificados', icon: FileText, color: 'blue' },
    { id: 'procedures', label: 'Procedimentos', icon: BookOpen, color: 'emerald' },
    { id: 'standards', label: 'Instrumentos Padrão', icon: Wrench, color: 'amber' },
    { id: 'issued', label: 'Certificados Emitidos', icon: History, color: 'blue' },
    { id: 'approvals', label: 'Aprovação de Certificados', icon: CheckCircle, color: 'indigo' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Garantia da Qualidade</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Qualidade</h2>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center px-6 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${activeSubTab === tab.id
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
              onSave={onSaveCertificateMask}
              onDelete={onDeleteCertificateMask}
              procedures={procedures}
              standardInstruments={standardInstruments}
            />
          )}
          {activeSubTab === 'issued' && (
            <IssuedCertificatesModule
              calibrationRecords={calibrationRecords}
              clients={clients}
              serviceOrders={serviceOrders}
              documentTemplates={documentTemplates}
              onUpdateCertificateStatus={onUpdateCertificateStatus}
              searchQuery={searchQuery}
            />
          )}
          {activeSubTab === 'approvals' && (
            <QualityApprovalModule
              calibrationRecords={calibrationRecords}
              serviceOrders={serviceOrders}
              clients={clients}
              procedures={procedures}
              standardInstruments={standardInstruments}
              certificateMasks={certificateMasks}
              employees={employees}
              documentTemplates={documentTemplates}
              onUpdateCertificateStatus={onUpdateCertificateStatus}
              searchQuery={searchQuery}
            />
          )}
          {activeSubTab === 'procedures' && (
            <ProceduresModule
              procedures={procedures}
              onSaveProcedure={onSaveProcedure}
              onDeleteProcedure={onDeleteProcedure}
              searchQuery={searchQuery}
            />
          )}
          {activeSubTab === 'standards' && (
            <StandardInstrumentsModule
              standardInstruments={standardInstruments}
              procedures={procedures}
              documentTemplates={documentTemplates}
              onSaveStandardInstrument={onSaveStandardInstrument}
              onDeleteStandardInstrument={onDeleteStandardInstrument}
              searchQuery={searchQuery}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
