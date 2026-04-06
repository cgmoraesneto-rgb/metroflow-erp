import React, { useState } from 'react';
import { ServiceOrder, StandardInstrument, CalibrationRecord, Client, CertificateStatus, Procedure, CertificateMask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Wrench, CheckCircle, History } from 'lucide-react';
import QualityApprovalModule from './QualityApprovalModule';
import ProceduresModule from './ProceduresModule';
import StandardInstrumentsModule from './StandardInstrumentsModule';
import IssuedCertificatesModule from './IssuedCertificatesModule';

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
  documentTemplates?: any[];
}

type SubTab = 'procedures' | 'standards' | 'issued' | 'approvals';

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
  documentTemplates = []
}: QualityModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('procedures');

  const TAB_CONFIG = [
    { id: 'procedures', label: 'Procedimentos', icon: BookOpen, color: 'emerald' },
    { id: 'standards', label: 'Instrumentos Padrão', icon: Wrench, color: 'amber' },
    { id: 'issued', label: 'Certificados Emitidos', icon: History, color: 'blue' },
    { id: 'approvals', label: 'Aprovação de Certificados', icon: CheckCircle, color: 'indigo' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Módulo da Qualidade</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Gestão de procedimentos, padrões e aprovação de resultados.</p>
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
          {activeSubTab === 'issued' && (
            <IssuedCertificatesModule
              calibrationRecords={calibrationRecords}
              clients={clients}
              serviceOrders={serviceOrders}
              documentTemplates={documentTemplates}
              onUpdateCertificateStatus={onUpdateCertificateStatus}
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
            />
          )}
          {activeSubTab === 'procedures' && (
            <ProceduresModule
              procedures={procedures}
              onSaveProcedure={onSaveProcedure}
              onDeleteProcedure={onDeleteProcedure}
            />
          )}
          {activeSubTab === 'standards' && (
            <StandardInstrumentsModule
              standardInstruments={standardInstruments}
              procedures={procedures}
              documentTemplates={documentTemplates}
              onSaveStandardInstrument={onSaveStandardInstrument}
              onDeleteStandardInstrument={onDeleteStandardInstrument}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
