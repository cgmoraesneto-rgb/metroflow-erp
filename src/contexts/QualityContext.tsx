import React, { createContext, useContext } from 'react';
import { CertificateStatus } from '../types';
import { useTechnical } from './TechnicalContext';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface QualityContextType {
  approveL1: (recordId: string) => Promise<void>;
  approveL2: (recordId: string) => Promise<void>;
  returnRecord: (recordId: string, justification: string) => Promise<void>;
}

const QualityContext = createContext<QualityContextType | undefined>(undefined);

export function QualityProvider({ children }: { children: React.ReactNode }) {
  const { records, saveRecord } = useTechnical();
  const { logAction } = useAudit();
  const { user, employee } = useAuth();

  const approveL1 = async (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    if (record.submittedBy === (user?.uid || employee?.id)) {
      toast.error("O mesmo usuário que submeteu não pode aprovar.");
      return;
    }

    const updated = { ...record, status: CertificateStatus.APPROVED, l1ApproverId: user?.uid || employee?.id };
    await saveRecord(updated);
    await logAction("APROVACAO_L1", recordId, "CalibrationRecord", { status: record.status }, { status: updated.status });
    toast.success("Aprovado (Nível 1)");
  };

  const approveL2 = async (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    if (record.l1ApproverId === (user?.uid || employee?.id)) {
      toast.error("O aprovador final (L2) não pode ser o mesmo do L1.");
      return;
    }

    const updated = { ...record, status: CertificateStatus.READY_FOR_SENDING, l2ApproverId: user?.uid || employee?.id };
    await saveRecord(updated);
    await logAction("APROVACAO_L2", recordId, "CalibrationRecord", { status: record.status }, { status: updated.status });
    toast.success("Aprovado (Nível 2) e Pronto para Envio");
  };

  const returnRecord = async (recordId: string, justification: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    if (!justification.trim()) {
      toast.error("Justificativa obrigatória para devolução.");
      return;
    }

    const updated = { ...record, status: CertificateStatus.RETURNED, returnJustification: justification };
    await saveRecord(updated);
    await logAction("DEVOLUCAO", recordId, "CalibrationRecord", { status: record.status }, { status: updated.status }, justification);
    toast.warning("Registro Devolvido para Correção");
  };

  return (
    <QualityContext.Provider value={{ approveL1, approveL2, returnRecord }}>
      {children}
    </QualityContext.Provider>
  );
}

export const useQualityContext = () => {
  const context = useContext(QualityContext);
  if (!context) throw new Error('useQualityContext must be used within a QualityProvider');
  return context;
};
