import { useState, useEffect, useRef } from 'react';
import {
  CalibrationRecord,
  CalibrationResult,
  CalibrationGroupRecord,
  CalibrationRow,
  CertificateStatus,
  StandardInstrument,
  CertificateMask,
  ColumnType,
  ColumnDefinition,
  StandardInstrumentUncertainty,
  CalibrationPointResult,
  ColumnBehavior
} from '../types';
import { X, Save, SendHorizontal, AlertTriangle, Lock, CheckCircle, ClipboardList, Info, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { executeRow } from '../utils/calculationEngine';
import { getBehaviorLabel } from '../utils/metrologyUtils';


interface CalibrationLaunchModalProps {
  record: CalibrationRecord | null;
  certificateMasks: CertificateMask[];
  standardInstruments: StandardInstrument[];
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: (result: CalibrationResult, maskId?: string) => Promise<void>;
  onSubmit: (result: CalibrationResult, maskId?: string) => Promise<void>;
  existingResult?: CalibrationResult | null;
  documentTemplates?: any[];
}

function calcMean(readings: number[]): number {
  if (!readings.length) return 0;
  return readings.reduce((s, v) => s + v, 0) / readings.length;
}

function calcStd(readings: number[]): number {
  if (readings.length < 2) return 0;
  const mean = calcMean(readings);
  const variance = readings.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (readings.length - 1);
  return Math.sqrt(variance);
}

export default function CalibrationLaunchModal({
  record, certificateMasks, standardInstruments, isOpen, onClose, onSaveDraft, onSubmit, existingResult, documentTemplates = []
}: CalibrationLaunchModalProps) {
  const { employees } = useData();
  const [groups, setGroups] = useState<CalibrationGroupRecord[]>([]);
  const [selectedMask, setSelectedMask] = useState<CertificateMask | null>(null);
  const [rowsCount, setRowsCount] = useState(3); // Repetitions (n)
  const [pointsCount, setPointsCount] = useState(5); // Number of calibration points
  const [instrumentResolution, setInstrumentResolution] = useState(0.01);
  const [standardDetails, setStandardDetails] = useState<StandardInstrumentUncertainty[]>([]);
  const [calculatedPoints, setCalculatedPoints] = useState<Record<string, CalibrationPointResult>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditorMode, setIsAuditorMode] = useState(false);

  // Lock after submitting to Quality (IN_ANALYSIS, APPROVED, READY_FOR_SENDING)
  // BEING_MADE and PENDING are still editable draft states
  const isSubmitted = record?.status === CertificateStatus.IN_ANALYSIS ||
    record?.status === CertificateStatus.APPROVED ||
    record?.status === CertificateStatus.READY_FOR_SENDING;

  // Init groups from existing result or from record.groups
  // Normalize shape: persisted records use { groupName, rows } (no columns, no name)
  // We need: { name, columns, rows, hiddenColumns?, formulas? }
  const normalizeGroups = (rawGroups: any[], mask?: CertificateMask): CalibrationGroupRecord[] =>
    rawGroups.map(g => {
      const name: string = g.name || g.groupName || 'Grupo';
      let rows: CalibrationRow[] = g.rows || [];

      // MIGRATION: If rows use names as keys instead of IDs, migrate them
      if (mask && rows.length > 0) {
        const mg = mask.measurementGroups.find(m => m.name === name);
        if (mg && mg.columnDefinitions) {
          rows = rows.map(row => {
            const newRow: CalibrationRow = { ...row };
            mg.columnDefinitions?.forEach(col => {
              if (row[col.name] !== undefined && row[col.id] === undefined) {
                newRow[col.id] = row[col.name];
              }
            });
            return newRow;
          });
        }
      }

      const columns: string[] = g.columns?.length
        ? g.columns
        : rows.length > 0 ? Object.keys(rows[0]).filter(k => !k.startsWith('_')) : [];

      return {
        groupName: name,
        name,
        columns,
        hiddenColumns: g.hiddenColumns ?? [],
        formulas: g.formulas ?? {},
        rows,
      };
    });

  useEffect(() => {
    if (!record) return;

    let currentMask = selectedMask;
    if (record.certificateMaskId) {
      currentMask = certificateMasks.find(m => m.id === record.certificateMaskId) || null;
      if (currentMask) {
        setSelectedMask(currentMask);
        setPointsCount(currentMask.numberOfPoints || 1);
        setRowsCount(currentMask.repetitions || 1);
      }
    }

    if (record.resolution) setInstrumentResolution(record.resolution);
    if (existingResult?.calculatedPoints) setCalculatedPoints(existingResult.calculatedPoints);

    if (record.standardInstrumentUncertainties?.length) {
      setStandardDetails(record.standardInstrumentUncertainties);
    } else if (currentMask?.standardInstrumentUncertainties?.length) {
      setStandardDetails(currentMask.standardInstrumentUncertainties);
    }

    if (existingResult?.groups?.length) {
      setGroups(normalizeGroups(existingResult.groups, currentMask || undefined));
    } else if (record.groups?.length) {
      setGroups(normalizeGroups(record.groups, currentMask || undefined));
    } else if (record.certificateMaskId && currentMask) {
      if (groups.length === 0) {
        generateStructureTemplate(currentMask, currentMask.numberOfPoints || 5, currentMask.repetitions || 3);
      }
    }
    setIsDirty(false);
  }, [record, existingResult, certificateMasks]);

  const handleClose = () => {
    if (isDirty) {
      if (!confirm('Existem alterações não salvas. Deseja fechar sem salvar?')) return;
    }
    onClose();
  };

  const runCalculations = (updatedGroups: CalibrationGroupRecord[]) => {
    const results: Record<string, any> = {};

    updatedGroups.forEach(group => {
      const defs = group.columnDefinitions || [];
      const vvcCol = defs.find(d => d.type === ColumnType.VVC);
      const leituraCol = defs.find(d => d.type === ColumnType.LEITURA);

      if (!vvcCol || !leituraCol) return;

      for (let p = 0; p < pointsCount; p++) {
        const pointRows = group.rows.slice(p * rowsCount, (p + 1) * rowsCount);
        const firstRow = pointRows[0];

        if (!firstRow) continue;

        const vvc = parseFloat(String(firstRow[vvcCol.id])) || 0;
        const readings = pointRows.map(r => parseFloat(String(r[leituraCol.id]))).filter(val => !isNaN(val));

        // We only calculate if we have ALL readings for the point
        if (readings.length === rowsCount && vvc !== 0) {
          const std = standardDetails[0] || { declaredU: 0, certificateK: 2 };

          try {
            // New INDUSTRIAL engine call
            const execution = executeRow(
              { ...firstRow, [leituraCol.id]: readings }, // Pass readings as array for functions like mean()
              defs,
              {
                readings,
                vvc,
                resolution: instrumentResolution,
                uncertainties: standardDetails.length ? standardDetails : [std]
              },
              isAuditorMode
            );
            results[`${group.name}-${p}`] = {
              ...execution.values,
              trace: execution.trace
            };
          } catch (e) {
            console.error('Calculation error for point:', p, e);
          }
        }
      }
    });

    setCalculatedPoints(results as any);
  };

  const generateStructureTemplate = (mask: CertificateMask, points: number, rows: number) => {
    const newGroups: CalibrationGroupRecord[] = mask.measurementGroups.map(mg => {
      const rowsArr: CalibrationRow[] = [];
      const defs: ColumnDefinition[] = mg.columnDefinitions || [];

      for (let p = 0; p < points; p++) {
        for (let r = 0; r < rows; r++) {
          const row: CalibrationRow = {
            _pointIdx: p.toString()
          };
          defs.forEach(col => {
            row[col.id] = ''; // Use ID as key
          });
          rowsArr.push(row);
        }
      }

      return {
        groupName: mg.name,
        name: mg.name,
        columns: defs.map(d => d.id),
        columnDefinitions: defs,
        hiddenColumns: mg.hiddenColumns || [],
        formulas: {}, // Formulas are now in columnDefinitions
        rows: rowsArr
      };
    });

    if (mask.standardInstrumentUncertainties) {
      setStandardDetails(mask.standardInstrumentUncertainties);
    }

    setGroups(newGroups);
    setCalculatedPoints({});
  };

  const handleGenerateStructure = () => {
    if (!selectedMask) {
      toast.error("Selecione uma máscara antes de gerar a estrutura.");
      return;
    }
    generateStructureTemplate(selectedMask, pointsCount, rowsCount);
    setIsDirty(true);
    toast.success("Estrutura gerada com sucesso!");
  };

  const updateCell = (groupIdx: number, rowIdx: number, col: string, val: string) => {
    if (isSubmitted) return;
    setGroups(prev => {
      const updated = prev.map((g, gi) => gi !== groupIdx ? g : {
        ...g,
        rows: g.rows.map((r, ri) => ri !== rowIdx ? r : { ...r, [col]: val })
      });
      runCalculations(updated);
      return updated;
    });
    setIsDirty(true);
  };


  const buildResult = (): CalibrationResult => ({
    id: existingResult?.id || `RES-${Date.now()}`,
    calibrationRecordId: record!.id,
    groups,
    calculatedPoints,
    standardInstrumentUncertainties: standardDetails,
    resolution: instrumentResolution
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await onSaveDraft(buildResult(), selectedMask?.id);
    setIsDirty(false);
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!selectedMask) {
      toast.error("Seleção de máscara é obrigatória para submeter.");
      return;
    }

    const usedStandardIds = selectedMask?.standardInstrumentIds || [];
    const unavailableStandards = standardInstruments.filter(
      std => usedStandardIds.includes(std.id) && std.statusMovimentacao !== 'Disponível'
    );

    if (unavailableStandards.length > 0) {
      toast.error(`Padrões indisponíveis: ${unavailableStandards.map(s => s.identificacao).join(', ')}`);
      return;
    }

    if (!confirm('Após submeter, os dados ficam somente leitura. Confirma?')) return;
    setIsSaving(true);
    await onSubmit(buildResult(), selectedMask.id);
    setIsSaving(false);
  };

  if (!isOpen || !record) return null;

  // Get n from mask/record or default 3
  const repetitions = (record as any).maskRepetitions || 3;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col"
        >
          {/* Header - Read Only */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              {isSubmitted ? (
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
              ) : (
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <SendHorizontal className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="truncate">
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5 overflow-hidden text-ellipsis">
                  {record.instrumentName}
                </h2>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{record.certificateNumber}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>Técnico: <strong className="text-slate-700">{employees.find(e => e.id === record.technicianName)?.nome || record.technicianName}</strong></span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>Data: <strong className="text-slate-700">{new Date(record.calibrationDate).toLocaleDateString('pt-BR')}</strong></span>
                  {isSubmitted && <span className="ml-2 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">● Somente Leitura</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newMode = !isAuditorMode;
                  setIsAuditorMode(newMode);
                  // Trigger re-calculation with trace enabled
                  if (groups.length > 0) runCalculations(groups);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${isAuditorMode
                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-gray-50'
                  }`}
              >
                <Shield className={`w-4 h-4 ${isAuditorMode ? 'animate-pulse text-amber-600' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">Modo Auditor</span>
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Part 2 Configuration: Mask and Structure */}
          {/* Part 2 Configuration: Mask and Structure */}
          {!isSubmitted && (
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 space-y-6 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Cálculo (Máscara)</label>
                  <select
                    value={selectedMask?.id || ''}
                    onChange={(e) => {
                      const maskId = e.target.value;
                      const m = certificateMasks.find(mask => mask.id === maskId) || null;
                      setSelectedMask(m);
                      if (m) {
                        const p = m.numberOfPoints || 5;
                        const r = m.repetitions || 3;
                        setPointsCount(p);
                        setRowsCount(r);

                        // Auto-generate if empty, otherwise ask
                        if (groups.length === 0) {
                          generateStructureTemplate(m, p, r);
                        } else if (confirm('Alterar a máscara irá resetar os dados preenchidos. Continuar?')) {
                          generateStructureTemplate(m, p, r);
                        }
                      }
                      setIsDirty(true);
                    }}
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm shadow-sm"
                  >
                    <option value="">-- Selecione uma Máscara --</option>
                    {certificateMasks.map(mask => (
                      <option key={mask.id} value={mask.id}>{mask.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pontos x Repetições</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      title="Pontos de Calibração"
                      value={pointsCount}
                      onChange={e => setPointsCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                      min="1"
                    />
                    <div className="flex items-center text-slate-300">×</div>
                    <input
                      type="number"
                      title="Repetições por Ponto"
                      value={rowsCount}
                      onChange={e => setRowsCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                      min="1"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGenerateStructure}
                    className="w-full h-[46px] bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    Gerar Estrutura
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Padrões Qualificados para Calibração (U & k)
                    </label>
                    <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 shadow-sm">
                      <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center">
                        <Info className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                        Resolução do Instrumento:
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={instrumentResolution}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setInstrumentResolution(val);
                          runCalculations(groups);
                        }}
                        className="w-24 bg-white border border-amber-200/50 p-1.5 rounded-lg font-black text-sm text-center text-amber-700 focus:ring-4 focus:ring-amber-500/10 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4">
                    {standardDetails.map((detail, idx) => {
                      const si = standardInstruments.find(s => s.id === detail.instrumentId);
                      return (
                        <div key={idx} className="flex flex-col gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:border-indigo-400 hover:shadow-indigo-500/10 group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                              <Shield size={24} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-black text-slate-900 leading-none mb-1 uppercase tracking-tighter truncate">{si?.identificacao || 'PADRÃO'}</span>
                              <span className="text-[10px] font-bold text-slate-400 truncate w-full" title={si?.nome}>{si?.nome || 'Descrição do Padrão...'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                            <div className="relative">
                               <span className="absolute -top-2 left-4 text-[7px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest z-10">Incerteza (U)</span>
                               <input
                                 type="number"
                                 title="Incerteza do Padrão"
                                 value={detail.declaredU}
                                 onChange={e => {
                                   const val = parseFloat(e.target.value) || 0;
                                   const updated = [...standardDetails];
                                   updated[idx].declaredU = val;
                                   setStandardDetails(updated);
                                   runCalculations(groups);
                                 }}
                                 className="w-full bg-slate-50 border border-transparent focus:border-indigo-200 p-3 pt-5 rounded-xl text-sm font-black text-center focus:ring-4 focus:ring-indigo-500/5 outline-none text-indigo-600 transition-all"
                                 placeholder="U"
                               />
                            </div>
                            <div className="relative">
                               <span className="absolute -top-2 left-4 text-[7px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest z-10">Fator (k)</span>
                               <input
                                 type="number"
                                 step="0.01"
                                 title="Fator k do Padrão"
                                 value={detail.certificateK}
                                 onChange={e => {
                                   const val = parseFloat(e.target.value) || 0;
                                   const updated = [...standardDetails];
                                   updated[idx].certificateK = val;
                                   setStandardDetails(updated);
                                   runCalculations(groups);
                                 }}
                                 className="w-full bg-slate-50 border border-transparent focus:border-indigo-200 p-3 pt-5 rounded-xl text-sm font-black text-center focus:ring-4 focus:ring-indigo-500/5 outline-none text-indigo-600 transition-all"
                                 placeholder="k"
                               />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isSubmitted && record.standardInstrumentIds?.length > 0 && (
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex items-center space-x-4 flex-shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Padrões Utilizados:</span>
              {record.standardInstrumentIds.map(id => {
                const si = standardInstruments.find(s => s.id === id);
                if (!si) return null;
                return (
                  <span key={id} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    {si.nome} ({si.identificacao})
                  </span>
                );
              })}
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {groups.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-400 text-sm">Nenhuma estrutura de medição neste registro.</p>
              </div>
            ) : groups.map((group, gi) => {
              const visibleCols = (group.columns ?? []).filter(c => !group.hiddenColumns?.includes(c));
              return (
                <div key={gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="font-black text-slate-800">{group.name}</h3>
                  </div>
                  <div className="rectilinear-container border-none rounded-none bg-transparent">
                    <table className="rectilinear-table !min-w-full">
                      <thead>
                        <tr className="rectilinear-tr">
                          {(group.columnDefinitions || []).map((def, ci) => (
                            <th key={ci} className={`rectilinear-th text-center ${group.hiddenColumns?.includes(def.id) ? 'opacity-30' : ''}`}>
                              {def.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(group.rows || []).map((row, ri) => {
                          const pointIdx = typeof row._pointIdx === 'number' ? row._pointIdx : parseInt(String(row._pointIdx || '0'), 10);
                          const isNewPoint = ri % rowsCount === 0;
                          const calc = calculatedPoints[`${group.name}-${pointIdx}`];

                          return (
                            <tr key={ri} className={`rectilinear-tr ${isNewPoint ? 'border-t-4 border-slate-100' : ''}`}>
                              {(group.columnDefinitions || []).map((def, ci) => {
                                const isMetric = [
                                  ColumnType.MEDIA,
                                  ColumnType.ERRO,
                                  ColumnType.DESVIO_PADRAO,
                                  ColumnType.INCERTEZA,
                                  ColumnType.CONFORMIDADE
                                ].includes(def.type);

                                const isMetrologyCol = def.behavior === ColumnBehavior.METROLOGY;
                                const isCalculatedCol = def.behavior === ColumnBehavior.CALCULATED;
                                const isReadOnlyMode = isMetrologyCol || isCalculatedCol || isSubmitted;

                                let displayValue = row[def.id] || '';

                                if ((isMetrologyCol || isCalculatedCol || isMetric) && calc) {
                                  if (calc[def.id] !== undefined) {
                                    const val = calc[def.id];
                                    displayValue = Array.isArray(val) ? `[${val.length}]` : (typeof val === 'number' ? val.toFixed(4) : String(val));
                                  }
                                } else if ((isMetrologyCol || isCalculatedCol) && !calc) {
                                  displayValue = '--';
                                }

                                const finalDisplayValue = String(displayValue ?? '');

                                const isFirstInBlock = ri % rowsCount === 0;

                                return (
                                  <td key={ci} className={`rectilinear-td text-center border-r border-slate-50 last:border-r-0 ${group.hiddenColumns?.includes(def.id) ? 'bg-slate-50/50' : ''}`}>
                                    <div className="relative group/trace px-1 py-1">
                                      <input
                                        type="text"
                                        value={(isReadOnlyMode && !isFirstInBlock && (isMetrologyCol || isCalculatedCol || isMetric)) ? '' : finalDisplayValue}
                                        onChange={e => updateCell(gi, ri, def.id, e.target.value)}
                                        disabled={isReadOnlyMode}
                                        className={`w-full h-8 text-xs text-center rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-black tabular-nums ${isReadOnlyMode
                                            ? (isMetrologyCol ? 'bg-amber-50 text-amber-800 cursor-not-allowed border-amber-100' :
                                              isCalculatedCol ? 'bg-indigo-50 text-indigo-800 cursor-not-allowed border-indigo-100' :
                                                'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed')
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                          } ${isAuditorMode && (isMetrologyCol || isCalculatedCol) ? 'ring-1 ring-amber-200 ring-offset-1' : ''}`}
                                        placeholder={isReadOnlyMode ? "" : "—"}
                                      />

                                      {isAuditorMode && calc?.trace?.[def.id] && isFirstInBlock && (
                                        <div className="absolute left-full ml-2 top-0 z-[60] w-64 bg-slate-900 text-white p-3 rounded-xl shadow-2xl opacity-0 group-hover/trace:opacity-100 transition-opacity pointer-events-none text-[10px]">
                                          <div className="flex items-center gap-1.5 mb-2 text-indigo-400 font-black uppercase tracking-tighter">
                                            <Shield size={10} /> Rastro Metrológico
                                          </div>
                                          <div className="font-mono bg-slate-800/50 p-2 rounded border border-slate-700 mb-2 whitespace-pre-wrap">
                                            {calc.trace[def.id].formula}
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-slate-400 font-bold flex justify-between">
                                              <span>Entradas:</span>
                                              <span className="text-indigo-300">
                                                {Object.keys(calc.trace[def.id].inputs).length || 'Constante'}
                                              </span>
                                            </p>
                                            {Object.entries(calc.trace[def.id].inputs).map(([depId, val]) => (
                                              <p key={depId} className="flex justify-between border-t border-slate-800 pt-1">
                                                <span className="text-slate-500">[{selectedMask?.measurementGroups[0]?.columnDefinitions?.find(d => d.id === depId)?.name || depId}]</span>
                                                <span className="text-emerald-400">{Array.isArray(val) ? `[${val.length}]` : val}</span>
                                              </p>
                                            ))}
                                            <p className="flex justify-between border-t border-indigo-500/30 pt-1 mt-1">
                                              <span className="font-bold text-indigo-200 uppercase">Saída:</span>
                                              <span className="font-bold text-indigo-100">{calc.trace[def.id].output}</span>
                                            </p>
                                          </div>
                                          <div className="mt-2 text-[8px] text-slate-500 text-right italic">
                                            Ordem de Execução: #{calc.trace[def.id].executionIndex}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          {!isSubmitted && (() => {
            const usedStandardIds = selectedMask?.standardInstrumentIds || [];
            const unavailableStandards = standardInstruments.filter(
              std => usedStandardIds.includes(std.id) && std.statusMovimentacao !== 'Disponível'
            );
            const hasUnavailableStandards = unavailableStandards.length > 0;

            return (
              <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
                <div className="text-xs text-slate-400">
                  {isDirty ? <span className="text-amber-500 font-bold">● Alterações não salvas</span> : <span className="text-emerald-500 font-bold">● Sem alterações pendentes</span>}
                  {hasUnavailableStandards && (
                    <div className="mt-1 text-rose-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Padrões indisponíveis bloqueiam submissão.
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Rascunho</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || hasUnavailableStandards}
                    title={hasUnavailableStandards ? "Existem padrões indisponíveis" : ""}
                    className="flex items-center space-x-2 px-8 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SendHorizontal className="w-4 h-4" />
                    <span>Submeter para Revisão</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}