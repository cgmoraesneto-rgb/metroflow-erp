import React, { createContext, useContext, useState, useEffect } from 'react';
import { CalibrationRecord, CalibrationResult, MaskVersion, CertificateMask } from '../types';
import { toast } from 'sonner';

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

  const loadData = async () => {
    try {
      const [recRes, resRes, maskRes, versRes] = await Promise.all([
        fetch('/api/mock/calibration_records'),
        fetch('/api/mock/calibration_results'),
        fetch('/api/mock/certificate_masks'),
        fetch('/api/mock/mask_versions')
      ]);

      if (recRes.ok) setRecords(await recRes.json());
      if (resRes.ok) setResults(await resRes.json());
      if (maskRes.ok) setMasks(await maskRes.json());
      if (versRes.ok) setMaskVersions(await versRes.json());
    } catch (e) {
      console.error("TechnicalContext load failed", e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveRecord = async (record: CalibrationRecord) => {
    await fetch('/api/mock/calibration_records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    loadData();
  };

  const saveResult = async (result: CalibrationResult) => {
    await fetch('/api/mock/calibration_results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    loadData();
  };

  const saveMask = async (mask: CertificateMask) => {
    await fetch('/api/mock/certificate_masks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mask)
    });
    loadData();
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

    await fetch('/api/mock/mask_versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(version)
    });
    loadData();
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
