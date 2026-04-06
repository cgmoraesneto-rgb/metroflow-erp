// src/services/financeiroService.ts
import { apiClient } from './apiClient';
import { FinancialControlSchema } from '../schemas';
import { FinancialControl } from '../types';

export const financeiroService = {
  async getFinancialControls(): Promise<FinancialControl[]> {
    return apiClient.fetch<FinancialControl>('/api/mock/financial_controls');
  },

  async saveFinancialControl(financial: Partial<FinancialControl>): Promise<FinancialControl> {
    const validated = FinancialControlSchema.parse(financial);
    return apiClient.post<FinancialControl>('/api/mock/financial_controls', validated);
  }
};
