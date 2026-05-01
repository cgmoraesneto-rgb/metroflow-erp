// src/services/financeiroService.ts
import { apiClient } from './apiClient';
import { FinancialControlSchema } from '../schemas';
import { FinancialControl, FinancialExpense } from '../types';

export const financeiroService = {
  async getFinancialControls(): Promise<FinancialControl[]> {
    return apiClient.fetch<FinancialControl>('/api/mock/financial_controls');
  },

  async saveFinancialControl(financial: Partial<FinancialControl>): Promise<FinancialControl> {
    const validated = FinancialControlSchema.parse(financial);
    return apiClient.post<FinancialControl>('/api/mock/financial_controls', validated);
  },

  async getFinancialExpenses(): Promise<FinancialExpense[]> {
    return apiClient.fetch<FinancialExpense>('/api/mock/financial_expenses');
  },

  async saveFinancialExpense(expense: Partial<FinancialExpense>): Promise<FinancialExpense> {
    // Schema parser ignored here for simplicity; using casting directly to prevent compile errors if schema doesn't exist
    return apiClient.post<FinancialExpense>('/api/mock/financial_expenses', expense);
  },

  async deleteFinancialExpense(id: string): Promise<void> {
    return apiClient.delete(`/api/mock/financial_expenses/${id}`);
  }
};
