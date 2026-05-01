import React, { useState, useEffect, useRef } from 'react';
import { 
  CalibrationRecord, 
  CalibrationResult, 
  CalibrationGroupRecord, 
  CertificateStatus, 
  StandardInstrument, 
  CertificateMask, 
  StandardInstrumentUncertainty, 
  CalibrationPointResult, 
  ColumnBehavior,
  ColumnType
} from '../types';
import { X, Shield, Plus, Settings2, ClipboardList, Lock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { executeDocument } from '../utils/calculationEngine';

interface CalibrationLaunchModalProps {
  record: CalibrationRecord | null;
  certificateMasks: CertificateMask[];
  standardInstruments: StandardInstrument[];
  documentTemplates?: any[];
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: (result: any, maskId?: string) => Promise<void>;
  onSubmit: (result: any, maskId?: string) => Promise<void>;
  onPreview: (record: CalibrationRecord) => void;
  existingResult?: any;
  calibrationResults?: any[];
}

const CellInput = ({ value, onChange, disabled, className, type }: { value: string, onChange: (val: string) => void, disabled?: boolean, className?: string, type?: ColumnType }) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInsertOmega = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newValue = localValue + 'Ω';
    setLocalValue(newValue);
    onChange(newValue);
    inputRef.current?.focus();
  };

  return (
    <div className="relative group/cell">
      <input 
        ref={inputRef}
        type="text" 
        value={localValue} 
        onChange={e => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onChange(localValue);
        }}
        disabled={disabled}
        className={`w-full h-9 px-2 text-[11px] text-center rounded-lg border font-black transition-all ${type === ColumnType.TEXTO ? '' : 'tabular-nums'} ${className}`}
      />
      {type === ColumnType.TEXTO && !disabled && (
        <button 
          onClick={handleInsertOmega}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-[10px] font-bold opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-indigo-100"
          title="Inserir Ω"
        >
          Ω
        </button>
      )}
    </div>
  );
};

export default function CalibrationLaunchModal({
  record, certificateMasks, standardInstruments, documentTemplates, isOpen, onClose, onSaveDraft, onSubmit, onPreview, existingResult, calibrationResults = []
}: CalibrationLaunchModalProps) {
  const [groups, setGroups] = useState<CalibrationGroupRecord[]>([]);
  const groupsRef = useRef<CalibrationGroupRecord[]>([]);

  // Sincroniza o ref com o estado para garantir que os handlers de salvamento tenham o dado mais atual
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const [selectedMask, setSelectedMask] = useState<CertificateMask | null>(null);
  const [instrumentResolution, setInstrumentResolution] = useState(0);
  const [standardDetails, setStandardDetails] = useState<StandardInstrumentUncertainty[]>([]);
  const [calculatedPoints, setCalculatedPoints] = useState<Record<string, CalibrationPointResult>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditorMode, setIsAuditorMode] = useState(false);

  const isSubmitted = record?.status === CertificateStatus.IN_ANALYSIS ||
    record?.status === CertificateStatus.APPROVED ||
    record?.status === CertificateStatus.READY_FOR_SENDING;

  // Carregamento Inicial
  useEffect(() => {
    if (!record) return;

    let currentMask = null;
    if (record.certificateMaskId) {
      currentMask = certificateMasks.find(m => m.id === record.certificateMaskId) || null;
      if (currentMask) setSelectedMask(currentMask);
    }

    if (record.resolution) setInstrumentResolution(parseFloat(String(record.resolution).replace(',', '.')) || 0);

    if (existingResult?.groups?.length) {
      setGroups(existingResult.groups as any);
    } else {
      // Fallback: busca nos resultados carregados se o registro principal estiver vazio
      const foundResult = (calibrationResults as any[]).find(r => r.calibrationRecordId === record.id);
      if (foundResult?.groups?.length) {
        setGroups(foundResult.groups as any);
      } else if (currentMask) {
        // GERA ESTRUTURA AUTOMÁTICA SE FOR NOVO
        const allGroups = currentMask.measurementGroups.map((mg) => ({
          ...mg,
          groupName: mg.name,
          rows: [],
          columns: (mg.columnDefinitions || []).map(d => d.id)
        }));
        setGroups(allGroups as any);
      }
    }
    
    if (existingResult?.calculatedPoints) setCalculatedPoints(existingResult.calculatedPoints);
    if (record.standardInstrumentUncertainties?.length) setStandardDetails(record.standardInstrumentUncertainties);
    
    setIsDirty(false);
  }, [record, existingResult, certificateMasks]);

  // Motor de Cálculo com Debounce para Performance
  useEffect(() => {
    if (groups.length === 0) return;
    
    const timer = setTimeout(() => {
      const { results } = executeDocument({ groups }, [], {}, standardDetails, { resolution: instrumentResolution });
      setCalculatedPoints(results as any);
    }, 300); // 300ms de fôlego para o processador

    return () => clearTimeout(timer);
  }, [groups, standardDetails, instrumentResolution]);

  const handleAddStandard = (stdId: string) => {
    if (!stdId || standardDetails.find(d => d.instrumentId === stdId)) return;
    const si = standardInstruments.find(s => s.id === stdId);
    if (!si) return;
    const updated = [...standardDetails, { instrumentId: stdId, declaredU: si.uncertainty || 0, certificateK: si.kFactor || 2 }];
    setStandardDetails(updated);
    setIsDirty(true);
  };

  const removeStandard = (stdId: string) => {
    const updated = standardDetails.filter(d => d.instrumentId !== stdId);
    setStandardDetails(updated);
    setIsDirty(true);
  };

  const updateCell = (groupIdx: number, rowIdx: number, col: string, val: string) => {
    if (isSubmitted) return;
    const newGroups = groupsRef.current.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      rows: g.rows.map((r, ri) => ri !== rowIdx ? r : { ...r, [col]: val })
    });
    setGroups(newGroups);
    groupsRef.current = newGroups; // Immediate ref update to avoid race conditions
    setIsDirty(true);
  };

  if (!isOpen || !record) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex flex-col">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
               {isSubmitted ? <Lock size={18} /> : <Settings2 size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{record.instrumentName}</h2>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{record.certificateNumber}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAuditorMode(!isAuditorMode)} 
              className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                isAuditorMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
               <Shield size={12} /> {isAuditorMode ? 'Modo Auditor' : 'Auditar'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {/* BARRA TÉCNICA - CONFIGURAÇÃO MINIMALISTA */}
          {!isSubmitted && (
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[250px]">
                    <select
                      value={selectedMask?.id || ''}
                      onChange={(e) => {
                        const m = certificateMasks.find(mask => mask.id === e.target.value) || null;
                        setSelectedMask(m);
                        if (m) {
                          const allGroups = m.measurementGroups.map(mg => ({ ...mg, rows: [], groupName: mg.name, columns: (mg.columnDefinitions || []).map(d => d.id) }));
                          setGroups(allGroups as any);
                        }
                        setIsDirty(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg font-bold text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/10"
                    >
                      <option value="">-- SELECIONE A MÁSCARA --</option>
                      {certificateMasks.map(mask => <option key={mask.id} value={mask.id}>{mask.title.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="min-w-[250px]">
                    <select onChange={(e) => { handleAddStandard(e.target.value); e.target.value = ""; }} className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg font-bold text-[11px] outline-none">
                      <option value="">+ VINCULAR PADRÃO</option>
                      {standardInstruments
                        .filter(s => s.statusMovimentacao === 'Disponível')
                        .sort((a, b) => (a.identificacao || '').localeCompare(b.identificacao || ''))
                        .map(s => <option key={s.id} value={s.id}>{s.identificacao} - {s.nome}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Res:</span>
                    <span className="text-[10px] font-black text-slate-600">{instrumentResolution.toString().replace('.', ',')}</span>
                  </div>
                </div>

                {standardDetails.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-50">
                    {standardDetails.map((detail, idx) => {
                        const si = standardInstruments.find(s => s.id === detail.instrumentId);
                        return (
                          <div key={idx} className="flex items-center gap-2 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 text-[9px] font-black uppercase text-indigo-600">
                             <span>{si?.identificacao}</span>
                             <span className="text-indigo-200">|</span>
                             <span>U={detail.declaredU.toString().replace('.', ',')}</span>
                             <button onClick={() => removeStandard(detail.instrumentId)}><X size={10} /></button>
                          </div>
                        );
                    })}
                  </div>
                )}
            </div>
          )}

          <div className="p-6 space-y-8">
            {groups.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white opacity-50">
                  <ClipboardList className="w-12 h-12 mb-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Seleção de Máscara</p>
               </div>
            ) : groups.map((group, gi) => {
              const visibleCols = (group.columnDefinitions || []); // Show all columns to technician as they might be needed for input/calculation
              return (
                <div key={gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50/50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-black text-[9px] italic">{gi + 1}</span>
                        <h3 className="font-black text-slate-800 text-[11px] uppercase opacity-70 tracking-tight">{group.name}</h3>
                     </div>
                     {!isSubmitted && (
                       <button onClick={() => { 
                          const updated = [...groups];
                          const newRow: any = { _pointIdx: updated[gi].rows.length.toString() };
                          (group.columnDefinitions || []).forEach(col => { newRow[col.id] = ''; });
                          updated[gi].rows.push(newRow); 
                          setGroups(updated); 
                           
                       }} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase shadow-sm hover:bg-slate-900 transition-all">
                          <Plus size={12} /> Linha
                       </button>
                     )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                       <thead className="bg-slate-50/30">
                          <tr>{visibleCols.map((def, ci) => <th key={ci} className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">{def.name}</th>)}{!isSubmitted && <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-10"></th>}</tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {group.rows.map((row, ri) => {
                            const calc = calculatedPoints[`${group.blockId || group.name}_row${ri}`];
                            return (
                              <tr key={ri} className="hover:bg-slate-50/20 transition-colors">
                                {visibleCols.map((def, ci) => {
                                  const isReadOnly = (def.behavior === ColumnBehavior.CALCULATED && !!def.formula?.trim()) || isSubmitted;
                                  let val = row[def.id] || '';
                                  if (def.behavior === ColumnBehavior.CALCULATED && calc?.[def.id] !== undefined) {
                                     const decimals = def.decimalPlaces ?? 4;
                                     if (typeof calc[def.id] === 'number') {
                                       val = def.displayFormat === 'percent' 
                                          ? (calc[def.id] * 100).toFixed(decimals).replace('.', ',') + '%'
                                          : calc[def.id].toFixed(decimals).replace('.', ',');
                                     } else {
                                       val = calc[def.id];
                                     }
                                  }
                                  return (
                                    <td key={ci} className="p-1 text-center">
                                      <CellInput 
                                        value={Array.isArray(val) ? val.join('; ') : (val ?? '') as any} 
                                        onChange={newVal => updateCell(gi, ri, def.id, newVal)}
                                        disabled={isReadOnly}
                                        type={def.type}
                                        className={isReadOnly ? 'bg-slate-50/50 border-transparent text-slate-500' : 'bg-white border-slate-200 focus:border-indigo-500 outline-none'} 
                                      />
                                    </td>
                                  );
                                })}
                                {isAuditorMode && (
                                  <td className="p-1 text-center bg-emerald-50/10">
                                     <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-[7px] font-black text-emerald-600 uppercase">
                                           <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                           Valid
                                        </div>
                                     </div>
                                  </td>
                                )}
                                 {!isSubmitted && (
                                   <td className="p-1 text-center">
                                      <button 
                                        onClick={() => {
                                          const updated = [...groups];
                                          updated[gi].rows.splice(ri, 1);
                                          setGroups(updated);
                                          setIsDirty(true);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                   </td>
                                 )}
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
        </div>

        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
           <button 
             disabled={isSaving}
             onClick={async () => {
               if (!selectedMask) {
                 toast.error("Selecione uma máscara antes de gerar a prévia.");
                 return;
               }
               setIsSaving(true);
               try {
                 await onPreview({ 
                   ...record, 
                   groups, 
                   calculatedPoints: (calculatedPoints as any),
                   certificateMaskId: selectedMask.id,
                   procedureId: selectedMask.procedureId || record.procedureId,
                   standardInstrumentIds: standardDetails.map(d => d.instrumentId)
                 });
               } finally {
                 setIsSaving(false);
               }
             }} 
             className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
           >
             {isSaving ? <Plus className="w-3 h-3 animate-spin" /> : 'Prévia PDF'}
           </button>
           
           <button 
             disabled={isSaving}
             onClick={async () => {
               setIsSaving(true);
                try {
                  await onSaveDraft({ 
                    ...record, 
                    calibrationRecordId: record.id, 
                    groups: groupsRef.current, 
                    calculatedPoints: (calculatedPoints as any), 
                    standardInstrumentIds: standardDetails.map(d => d.instrumentId),
                    standardInstrumentUncertainties: standardDetails 
                  } as any, selectedMask?.id);
                } finally {
                 setIsSaving(false);
               }
             }} 
             className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-200 transition-all disabled:opacity-50"
           >
             Salvar Rascunho
           </button>

           {!isSubmitted && (
             <button 
               disabled={isSaving}
               onClick={async () => {
                 if (!selectedMask) {
                    toast.error("Selecione uma máscara antes de finalizar.");
                    return;
                 }
                 setIsSaving(true);
                  try {
                    await onSubmit({ 
                      ...record, 
                      calibrationRecordId: record.id, 
                      groups: groupsRef.current, 
                      calculatedPoints: (calculatedPoints as any), 
                      standardInstrumentIds: standardDetails.map(d => d.instrumentId),
                      standardInstrumentUncertainties: standardDetails
                    } as any, selectedMask?.id);
                  } finally {
                   setIsSaving(false);
                 }
               }} 
               className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200 hover:bg-slate-900 transition-all disabled:opacity-50"
             >
               {isSaving ? 'Processando...' : 'Finalizar'}
             </button>
           )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
