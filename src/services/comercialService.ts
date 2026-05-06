// src/services/comercialService.ts
import { apiClient } from './apiClient';
import { ClientSchema, QuoteSchema, IdSchema } from '../schemas';
import { Client, Quote } from '../types';

export const comercialService = {
  // --- Clientes ---
  async getClients(): Promise<Client[]> {
    return apiClient.fetch<Client>('/api/mock/clients');
  },

  async saveClient(client: Partial<Client>): Promise<Client> {
    console.log("[comercialService] Final client object to parse:", client);
    try {
      const validated = ClientSchema.parse(client) as Client;
      const result = await apiClient.post<Client>('/api/mock/clients', validated, ClientSchema as any);
      return result;
    } catch (err) {
      console.error("[comercialService] Validation ERROR for client:", client, err);
      throw err;
    }
  },

  async deleteClient(id: string): Promise<void> {
    IdSchema.parse(id);
    
    // Verificação de Integridade Referencial
    const quotes = await this.getQuotes();
    if (quotes.some(q => q.clienteId === id)) {
      throw new Error("Não é possível excluir o cliente pois ele possui orçamentos vinculados. Remova os orçamentos primeiro.");
    }

    // Nota: A verificação de OS seria ideal aqui, mas para evitar dependência circular pesada, 
    // dependemos do DataContext ou de uma query centralizada no futuro.
    
    return apiClient.delete(`/api/mock/clients/${id}`);
  },

  // --- Orçamentos ---
  async getQuotes(): Promise<Quote[]> {
    const all = await apiClient.fetch<Quote>('/api/mock/quotes');
    // Filtro básico para garantir que não mostramos itens marcados como deletados (se usarmos soft delete no futuro)
    return all.filter(q => !q.isDeleted);
  },

  async saveQuote(quote: Partial<Quote>): Promise<Quote> {
    const validated = QuoteSchema.parse(quote);
    return apiClient.post<Quote>('/api/mock/quotes', validated);
  },

  async deleteQuote(id: string): Promise<void> {
    IdSchema.parse(id);
    const all = await this.getQuotes();
    const quote = all.find(q => q.id === id);
    if (quote) {
      await apiClient.post(`/api/mock/quotes`, { ...quote, isDeleted: true });
      return;
    }
    await apiClient.delete(`/api/mock/quotes/${id}`);
  }
};
