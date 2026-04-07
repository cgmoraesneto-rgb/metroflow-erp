import React, { createContext, useContext, useState, useEffect } from 'react';
import { CalibrationRecord, CalibrationResult, MaskVersion, CertificateMask } from '../types';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';
import { useAudit } from './AuditContext';

interface TechnicalContextType {
  records: CalibrationRecord[];
  results: CalibrationResult[];
  masks: CertificateMask[];
  maskVersions: MaskVersion[];
  saveRecord: (record: CalibrationRecord) => Promise<void>;
  saveResult: (result: CalibrationResult) => Promise<void>;
  saveMask: (mask: CertificateMask) => Promise<void>;
  createMaskVersion: (maskId: string) => Promise<MaskVersion | null>;
}

const TechnicalContext = createContext<TechnicalContextType | undefined>(undefined);

export function TechnicalProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [results, setResults] = useState<CalibrationResult[]>([]);
  const [masks, setMasks] = useState<CertificateMask[]>([]);
  const [maskVersions, setMaskVersions] = useState<MaskVersion[]>([]);
  const { logAction } = useAudit();

  const loadData = async () => {
    try {
      const [recData, resData, maskData, versData] = await Promise.all([
        apiClient.fetch<CalibrationRecord>('/api/mock/calibration_records'),
        apiClient.fetch<CalibrationResult>('/api/mock/calibration_results'),
        apiClient.fetch<CertificateMask>('/api/mock/certificate_masks'),
        apiClient.fetch<MaskVersion>('/api/mock/mask_versions'),
      ]);

      setRecords(recData);
      setResults(resData);
      setMasks(maskData);
      setMaskVersions(versData);
    } catch (e) {
      console.error("TechnicalContext load failed", e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveRecord = async (record: CalibrationRecord) => {
    // Optimistic update
    setRecords(prev => {
      const exists = prev.some(r => r.id === record.id);
      return exists ? prev.map(r => r.id === record.id ? record : r) : [...prev, record];
    });

    const promise = apiClient.post<CalibrationRecord>('/api/mock/calibration_records', record)
      .then(async (saved) => {
        const previous = records.find(r => r.id === record.id);
        await logAction(previous ? 'UPDATE' : 'CREATE', record.id, 'calibration_records', previous, record);
        apiClient.fetch<CalibrationRecord>('/api/mock/calibration_records').then(setRecords);
        return saved;
      });

    toast.promise(promise, {
      loading: 'Salvando registro...',
      success: 'Registro salvo!',
      error: 'Erro ao salvar registro',
    });

    await promise;
  };

  const saveResult = async (result: CalibrationResult) => {
    setResults(prev => {
      const exists = prev.some(r => r.id === result.id);
      return exists ? prev.map(r => r.id === result.id ? result : r) : [...prev, result];
    });

    const promise = apiClient.post<CalibrationResult>('/api/mock/calibration_results', result)
      .then(() => apiClient.fetch<CalibrationResult>('/api/mock/calibration_results').then(setResults));

    toast.promise(promise, {
      loading: 'Salvando resultado...',
      success: 'Resultado salvo!',
      error: 'Erro ao salvar resultado',
    });

    await promise;
  };

  const saveMask = async (mask: CertificateMask) => {
    setMasks(prev => {
      const exists = prev.some(m => m.id === mask.id);
      return exists ? prev.map(m => m.id === mask.id ? mask : m) : [...prev, mask];
    });

    const promise = apiClient.post<CertificateMask>('/api/mock/certificate_masks', mask)
      .then(async (saved) => {
        const previous = masks.find(m => m.id === mask.id);
        await logAction(previous ? 'UPDATE' : 'CREATE', mask.id, 'certificate_masks', previous, mask);
        apiClient.fetch<CertificateMask>('/api/mock/certificate_masks').then(setMasks);
        return saved;
      });

    toast.promise(promise, {
      loading: 'Salvando máscara...',
      success: 'Máscara salva!',
      error: 'Erro ao salvar máscara',
    });

    await promise;
  };

  const createMaskVersion = async (maskId: string) => {
    const mask = masks.find(m => m.id === maskId);
    if (!mask) return null;

    const version: MaskVersion = {
      ...mask,
      versionId: `VER-${Date.now()}`,
      originalMaskId: mask.id,
      createdAt: new Date().toISOString()
    };

    setMaskVersions(prev => [...prev, version]);

    await apiClient.post<MaskVersion>('/api/mock/mask_versions', version);
    apiClient.fetch<MaskVersion>('/api/mock/mask_versions').then(setMaskVersions);

    return version;
  };

  return (
    <TechnicalContext.Provider value={{ records, results, masks, maskVersions, saveRecord, saveResult, saveMask, createMaskVersion }}>
      {children}
    </TechnicalContext.Provider>
  );
}

export const useTechnical = () => {
  const context = useContext(TechnicalContext);
  if (!context) throw new Error('useTechnical must be used within a TechnicalProvider');
  return context;
};
