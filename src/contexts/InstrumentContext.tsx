import React, { createContext, useContext, useState, useEffect } from 'react';
import { InstrumentCard } from '../types';
import { toast } from 'sonner';

interface InstrumentContextType {
  instrumentCards: InstrumentCard[];
  saveInstrumentCard: (card: InstrumentCard) => Promise<void>;
  deleteInstrumentCard: (id: string) => Promise<void>;
  getInstrumentsByClient: (clientId: string) => InstrumentCard[];
}

const InstrumentContext = createContext<InstrumentContextType | undefined>(undefined);

export function InstrumentProvider({ children }: { children: React.ReactNode }) {
  const [instrumentCards, setInstrumentCards] = useState<InstrumentCard[]>([]);

  const fetchInstruments = async () => {
    try {
      const res = await fetch('/api/mock/instrument_cards');
      if (res.ok) {
        const data = await res.json();
        setInstrumentCards(data);
      }
    } catch (e) {
      console.error("Erro ao buscar InstrumentCards", e);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const saveInstrumentCard = async (card: InstrumentCard) => {
    const promise = fetch('/api/mock/instrument_cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    }).then(res => {
      if (!res.ok) throw new Error('Falha ao salvar InstrumentCard');
    });

    toast.promise(promise, {
      loading: 'Salvando prontuário...',
      success: 'Prontuário salvo!',
      error: 'Erro ao salvar prontuário',
      finally: fetchInstruments
    });

    await promise;
  };

  const deleteInstrumentCard = async (id: string) => {
    // Soft delete logic could be explicitly added here, but API simulates hard delete
    const promise = fetch(`/api/mock/instrument_cards/${id}`, { method: 'DELETE' });
    toast.promise(promise, {
      loading: 'Excluindo prontuário...',
      success: 'Prontuário excluído!',
      error: 'Erro ao excluir prontuário',
      finally: fetchInstruments
    });
    await promise;
  };

  const getInstrumentsByClient = (clientId: string) => {
    return instrumentCards.filter(c => c.clientId === clientId);
  };

  return (
    <InstrumentContext.Provider value={{ instrumentCards, saveInstrumentCard, deleteInstrumentCard, getInstrumentsByClient }}>
      {children}
    </InstrumentContext.Provider>
  );
}

export const useInstrument = () => {
  const context = useContext(InstrumentContext);
  if (!context) throw new Error('useInstrument must be used within an InstrumentProvider');
  return context;
};
