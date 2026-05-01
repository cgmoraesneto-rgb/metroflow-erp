// src/services/tecnicoService.ts
import { apiClient } from './apiClient';
import { ServiceOrderSchema, StandardInstrumentSchema, IdSchema } from '../schemas';
import { ServiceOrder, StandardInstrument, CalibrationRecord, CalibrationResult, Procedure } from '../types';

export const tecnicoService = {
  // --- Ordens de Serviço ---
  async getServiceOrders(): Promise<ServiceOrder[]> {
    return apiClient.fetch<ServiceOrder>('/api/mock/service_orders');
  },

  async saveServiceOrder(so: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const validated = ServiceOrderSchema.parse(so);
    return apiClient.post<ServiceOrder>('/api/mock/service_orders', validated);
  },

  // --- Instrumentos Padrão ---
  async getStandardInstruments(): Promise<StandardInstrument[]> {
    return apiClient.fetch<StandardInstrument>('/api/mock/standard_instruments');
  },

  async saveStandardInstrument(si: Partial<StandardInstrument>): Promise<StandardInstrument> {
    const validated = StandardInstrumentSchema.parse(si);
    return apiClient.post<StandardInstrument>('/api/mock/standard_instruments', validated);
  },

  // --- Registros de Calibração ---
  async getCalibrationRecords(): Promise<CalibrationRecord[]> {
    return apiClient.fetch<CalibrationRecord>('/api/mock/calibration_records');
  },

  async saveCalibrationRecord(record: Partial<CalibrationRecord>): Promise<CalibrationRecord> {
    return apiClient.post<CalibrationRecord>('/api/mock/calibration_records', record);
  },
  
  // --- Resultados de Calibração ---
  async getCalibrationResults(): Promise<CalibrationResult[]> {
    return apiClient.fetch<CalibrationResult>('/api/mock/calibration_results');
  },

  async saveCalibrationResult(result: Partial<CalibrationResult>): Promise<CalibrationResult> {
    return apiClient.post<CalibrationResult>('/api/mock/calibration_results', result);
  },
  // --- Procedimentos ---
  async getProcedures(): Promise<Procedure[]> {
    return apiClient.fetch<Procedure>('/api/mock/procedures');
  },

  async saveProcedure(proc: Partial<Procedure>): Promise<Procedure> {
    return apiClient.post<Procedure>('/api/mock/procedures', proc);
  },

  async deleteProcedure(id: string): Promise<void> {
    return apiClient.delete(`/api/mock/procedures/${id}`);
  }
};
