import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuditTrail } from '../types';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';

interface AuditContextType {
  auditLogs: AuditTrail[];
  logAction: (action: string, entityId: string, entityType: string, previousState?: any, newState?: any, justification?: string) => Promise<void>;
  getLogsForEntity: (entityId: string) => AuditTrail[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const { user, employee } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditTrail[]>([]);

  // Carrega os logs do Firestore (sincronizado entre todos os usuários)
  useEffect(() => {
    apiClient.fetch<AuditTrail>('/api/mock/audit_trails')
      .then(data => setAuditLogs(data))
      .catch(() => console.error("Falha ao carregar Audit Trail do Firestore"));
  }, []);

  const logAction = async (action: string, entityId: string, entityType: string, previousState?: any, newState?: any, justification?: string) => {
    if (!user) return;

    const newLog: AuditTrail = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.uid || 'unknown',
      userName: employee?.nome || user.email || 'Sistema',
      action,
      entityId,
      entityType,
      timestamp: new Date().toISOString(),
      previousState: previousState ? JSON.stringify(previousState) : undefined,
      newState: newState ? JSON.stringify(newState) : undefined,
      justification
    };

    // Atualiza estado local (otimista)
    setAuditLogs(prev => [...prev, newLog]);

    // Persiste no Firestore via apiClient
    try {
      await apiClient.post<AuditTrail>('/api/mock/audit_trails', newLog);
    } catch (e) {
      console.error("Falha ao salvar Audit Trail no Firestore", e);
    }
  };

  const getLogsForEntity = (entityId: string) => {
    return auditLogs.filter(log => log.entityId === entityId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return (
    <AuditContext.Provider value={{ auditLogs, logAction, getLogsForEntity }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) throw new Error('useAudit must be used within an AuditProvider');
  return context;
};
