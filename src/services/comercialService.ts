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
    return apiClient.delete(`/api/mock/clients/${id}`);
  },

  // --- Orçamentos ---
  async getQuotes(): Promise<Quote[]> {
    return apiClient.fetch<Quote>('/api/mock/quotes');
  },

  async saveQuote(quote: Partial<Quote>): Promise<Quote> {
    const validated = QuoteSchema.parse(quote);
    return apiClient.post<Quote>('/api/mock/quotes', validated);
  },

  async deleteQuote(id: string): Promise<void> {
    IdSchema.parse(id);
    return apiClient.delete(`/api/mock/quotes/${id}`);
  }
};
