import React, { createContext, useContext, useState, useEffect } from 'react';
import { InstrumentCard } from '../types';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';

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
      const data = await apiClient.fetch<InstrumentCard>('/api/mock/instrument_cards');
      setInstrumentCards(data);
    } catch (e) {
      console.error("Erro ao buscar InstrumentCards do Firestore", e);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const saveInstrumentCard = async (card: InstrumentCard) => {
    // Optimistic update
    setInstrumentCards(prev => {
      const exists = prev.some(c => c.id === card.id);
      return exists ? prev.map(c => c.id === card.id ? card : c) : [...prev, card];
    });

    const promise = apiClient.post<InstrumentCard>('/api/mock/instrument_cards', card)
      .then(() => fetchInstruments());

    toast.promise(promise, {
      loading: 'Salvando prontuário...',
      success: 'Prontuário salvo!',
      error: 'Erro ao salvar prontuário',
    });

    await promise;
  };

  const deleteInstrumentCard = async (id: string) => {
    // Optimistic update
    const previous = [...instrumentCards];
    setInstrumentCards(prev => prev.filter(c => c.id !== id));

    const promise = apiClient.delete(`/api/mock/instrument_cards/${id}`)
      .then(() => fetchInstruments())
      .catch(() => setInstrumentCards(previous));

    toast.promise(promise, {
      loading: 'Excluindo prontuário...',
      success: 'Prontuário excluído!',
      error: 'Erro ao excluir prontuário',
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
