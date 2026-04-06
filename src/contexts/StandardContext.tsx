import React, { createContext, useContext, useState, useEffect } from 'react';
import { StandardInstrument, StandardInstrumentLog } from '../types';
import { toast } from 'sonner';

interface StandardContextType {
  standards: StandardInstrument[];
  logs: StandardInstrumentLog[];
  saveStandard: (si: StandardInstrument) => Promise<void>;
  deleteStandard: (id: string) => Promise<void>;
  logUsage: (log: StandardInstrumentLog) => Promise<void>;
}

const StandardContext = createContext<StandardContextType | undefined>(undefined);

export function StandardProvider({ children }: { children: React.ReactNode }) {
  const [standards, setStandards] = useState<StandardInstrument[]>([]);
  const [logs, setLogs] = useState<StandardInstrumentLog[]>([]);

  const fetchStandards = async () => {
    try {
      const res = await fetch('/api/mock/standard_instruments');
      if (res.ok) setStandards(await res.json());
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/mock/standard_logs');
      if (res.ok) setLogs(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchStandards();
    fetchLogs();
  }, []);

  const saveStandard = async (si: StandardInstrument) => {
    await fetch('/api/mock/standard_instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(si)
    });
    fetchStandards();
  };

  const deleteStandard = async (id: string) => {
    await fetch(`/api/mock/standard_instruments/${id}`, { method: 'DELETE' });
    fetchStandards();
  };

  const logUsage = async (log: StandardInstrumentLog) => {
    await fetch('/api/mock/standard_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    fetchLogs();
  };

  return (
    <StandardContext.Provider value={{ standards, logs, saveStandard, deleteStandard, logUsage }}>
      {children}
    </StandardContext.Provider>
  );
}

export const useStandard = () => {
  const context = useContext(StandardContext);
  if (!context) throw new Error('useStandard must be used within a StandardProvider');
  return context;
};
