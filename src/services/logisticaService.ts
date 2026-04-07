// src/services/logisticaService.ts
import { apiClient } from './apiClient';
import { FleetLogSchema } from '../schemas';
import { FleetLog, StandardCustody, Vehicle } from '../types';

export const logisticaService = {
  // --- Frotas ---
  async getFleetLogs(): Promise<FleetLog[]> {
    return apiClient.fetch<FleetLog>('/api/mock/fleet_logs');
  },

  async saveFleetLog(log: Partial<FleetLog>): Promise<FleetLog> {
    const validated = FleetLogSchema.parse(log);
    return apiClient.post<FleetLog>('/api/mock/fleet_logs', validated);
  },

  async getVehicles(): Promise<Vehicle[]> {
    return apiClient.fetch<Vehicle>('/api/mock/vehicles');
  },

  // --- Custódia ---
  async getStandardCustodies(): Promise<StandardCustody[]> {
    return apiClient.fetch<StandardCustody>('/api/mock/standard_custodies');
  },

  async saveStandardCustody(custody: Partial<StandardCustody>): Promise<StandardCustody> {
    return apiClient.post<StandardCustody>('/api/mock/standard_custodies', custody);
  }
};
