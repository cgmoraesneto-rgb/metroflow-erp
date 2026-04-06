import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuditTrail } from '../types';
import { useAuth } from './AuthContext';

interface AuditContextType {
  auditLogs: AuditTrail[];
  logAction: (action: string, entityId: string, entityType: string, previousState?: any, newState?: any, justification?: string) => Promise<void>;
  getLogsForEntity: (entityId: string) => AuditTrail[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const { user, employee } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditTrail[]>([]);

  // Carrega os logs iniciais
  useEffect(() => {
    fetch('/api/mock/audit_trails')
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setAuditLogs(data))
      .catch(() => console.error("Falha ao carregar Audit Trail"));
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

    // Atualiza estado local
    setAuditLogs(prev => [...prev, newLog]);

    // Grava no mock DB
    try {
      await fetch('/api/mock/audit_trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
    } catch (e) {
      console.error("Falha ao salvar Audit Trail no Mock DB", e);
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
