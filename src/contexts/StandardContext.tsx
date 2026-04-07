import React, { createContext, useContext, useState, useEffect } from 'react';
import { StandardInstrument, StandardInstrumentLog } from '../types';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';

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
      const data = await apiClient.fetch<StandardInstrument>('/api/mock/standard_instruments');
      setStandards(data);
    } catch (e) {
      console.error("Erro ao buscar Standard Instruments do Firestore", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiClient.fetch<StandardInstrumentLog>('/api/mock/standard_logs');
      setLogs(data);
    } catch (e) {
      console.error("Erro ao buscar Standard Logs do Firestore", e);
    }
  };

  useEffect(() => {
    fetchStandards();
    fetchLogs();
  }, []);

  const saveStandard = async (si: StandardInstrument) => {
    // Optimistic update
    setStandards(prev => {
      const exists = prev.some(s => s.id === si.id);
      return exists ? prev.map(s => s.id === si.id ? si : s) : [...prev, si];
    });

    const promise = apiClient.post<StandardInstrument>('/api/mock/standard_instruments', si)
      .then(() => fetchStandards());

    toast.promise(promise, {
      loading: 'Salvando padrão...',
      success: 'Padrão salvo!',
      error: 'Erro ao salvar padrão',
    });

    await promise;
  };

  const deleteStandard = async (id: string) => {
    const previous = [...standards];
    setStandards(prev => prev.filter(s => s.id !== id));

    const promise = apiClient.delete(`/api/mock/standard_instruments/${id}`)
      .then(() => fetchStandards())
      .catch(() => setStandards(previous));

    toast.promise(promise, {
      loading: 'Excluindo padrão...',
      success: 'Padrão excluído!',
      error: 'Erro ao excluir padrão',
    });

    await promise;
  };

  const logUsage = async (log: StandardInstrumentLog) => {
    setLogs(prev => [...prev, log]);

    const promise = apiClient.post<StandardInstrumentLog>('/api/mock/standard_logs', log)
      .then(() => fetchLogs());

    toast.promise(promise, {
      loading: 'Registrando uso...',
      success: 'Uso registrado!',
      error: 'Erro ao registrar uso',
    });

    await promise;
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
