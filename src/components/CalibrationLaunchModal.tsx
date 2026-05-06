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
import { X, Shield, Plus, Settings2, ClipboardList, Lock, Trash2, LayoutGrid } from 'lucide-react';
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
    <div className="relative group/cell w-full h-full">
      <input 
        ref={inputRef}
        type="text" 
        value={localValue} 
        onChange={e => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onChange(localValue);
        }}
        disabled={disabled}
        placeholder={type === ColumnType.TEXTO ? "---" : "0,000"}
        className={`w-full h-full px-3 py-2 text-[11px] font-bold text-center transition-all border-transparent bg-transparent outline-none focus:bg-white focus:shadow-sm disabled:cursor-not-allowed ${type === ColumnType.TEXTO ? 'text-left' : 'tabular-nums'} ${className}`}
      />
      {type === ColumnType.TEXTO && !disabled && (
        <button 
          onClick={handleInsertOmega}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-[10px] font-black opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-indigo-600 hover:text-white"
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
        // GERA ESTRUTURA AUTOMÁTICA SE FOR NOVO (Considerando Seções como Tabelas)
        let allGroups: any[] = [];
        
        if (currentMask.sections && currentMask.sections.length > 0) {
          allGroups = currentMask.sections.map((sec, sIdx) => {
            const mg = sec.groups?.[0] || { name: sec.title, columnDefinitions: [], templateRows: [] };
            return {
              ...mg,
              groupName: sec.title,
              blockId: mg.blockId || `T${sIdx + 1}`,
              rows: (mg.templateRows && mg.templateRows.length > 0) ? JSON.parse(JSON.stringify(mg.templateRows)) : [{}, {}, {}],
              columnDefinitions: mg.columnDefinitions || []
            };
          });
        } else {
          // Fallback para máscaras legadas
          allGroups = currentMask.measurementGroups.map((mg, mIdx) => ({
            ...mg,
            groupName: mg.name,
            blockId: mg.blockId || `T${mIdx + 1}`,
            rows: (mg.templateRows && mg.templateRows.length > 0) ? JSON.parse(JSON.stringify(mg.templateRows)) : [{}, {}, {}],
            columnDefinitions: mg.columnDefinitions || []
          }));
        }
        setGroups(allGroups);
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
                          let allGroups: any[] = [];
                          if (m.sections && m.sections.length > 0) {
                            allGroups = m.sections.map((sec, sIdx) => {
                              const mg = sec.groups?.[0] || { name: sec.title, columnDefinitions: [], templateRows: [] };
                              return {
                                ...mg,
                                groupName: sec.title,
                                blockId: mg.blockId || `T${sIdx + 1}`, // Garante ID estável
                                rows: (mg.templateRows && mg.templateRows.length > 0) ? JSON.parse(JSON.stringify(mg.templateRows)) : [{}, {}, {}],
                                columnDefinitions: mg.columnDefinitions || []
                              };
                            });
                          } else {
                            allGroups = m.measurementGroups.map((mg, mIdx) => ({ 
                              ...mg, 
                              rows: (mg.templateRows && mg.templateRows.length > 0) ? JSON.parse(JSON.stringify(mg.templateRows)) : [], 
                              groupName: mg.name, 
                              blockId: mg.blockId || `T${mIdx + 1}`, // Garante ID estável para legado
                              columns: (mg.columnDefinitions || []).map(d => d.id) 
                            }));
                          }
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
            ) : selectedMask?.sections && selectedMask.sections.length > 0 ? (
              // RENDERIZAÇÃO POR SEÇÕES (NOVO)
              <div className="space-y-16">
                {selectedMask.sections.map((section, si) => (
                  <div key={si} className="space-y-8">
                    <div className="flex items-center gap-4 ml-2">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <LayoutGrid size={24} />
                       </div>
                       <div>
                         <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">{section.title}</h2>
                         {section.description && <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">{section.description}</p>}
                       </div>
                    </div>
                    
                    <div className="space-y-10">
                      {section.groups.map((groupInMask) => {
                        const gi = groups.findIndex(g => g.blockId === groupInMask.blockId);
                        if (gi === -1) return null;
                        const group = groups[gi];
                        const visibleCols = (group.columnDefinitions || []);

                        return (
                          <div key={groupInMask.blockId || groupInMask.name} className="bg-slate-50/40 rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8 px-4">
                               <div className="flex items-center gap-3">
                                  <h3 className="font-black text-slate-800 text-[12px] uppercase tracking-widest opacity-80">{group.name}</h3>
                               </div>
                               {!isSubmitted && (
                                 <button onClick={() => { 
                                    const updated = [...groups];
                                    const newRow: any = { _pointIdx: updated[gi].rows.length.toString() };
                                    (group.columnDefinitions || []).forEach(col => { newRow[col.id] = ''; });
                                    updated[gi].rows.push(newRow); 
                                    setGroups(updated); 
                                 }} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                    <Plus size={14} /> Add Linha
                                 </button>
                               )}
                            </div>
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                              <table className="w-full border-collapse">
                                 <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                      {visibleCols.map((def, ci) => (
                                        <th key={ci} className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100 last:border-r-0">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {def.isLocked && <Lock size={9} className="text-amber-400" />}
                                            {def.name}
                                          </div>
                                        </th>
                                      ))}
                                      {!isSubmitted && <th className="px-4 py-3 border-none w-10 bg-slate-50/20"></th>}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {group.rows.map((row, ri) => {
                                      const calc = calculatedPoints[`${group.blockId || group.name}_row${ri}`];
                                      return (
                                        <tr key={ri} className="hover:bg-slate-50/30 transition-colors group/row">
                                          {visibleCols.map((def, ci) => {
                                            const isReadOnly = (def.behavior === ColumnBehavior.CALCULATED && !!def.formula?.trim()) || def.isLocked || isSubmitted;
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
                                              <td key={ci} className="p-0 border-r border-slate-100 last:border-r-0 h-10 min-w-[110px]">
                                                <CellInput 
                                                  value={Array.isArray(val) ? val.join('; ') : (val ?? '') as any} 
                                                  onChange={newVal => updateCell(gi, ri, def.id, newVal)}
                                                  disabled={isReadOnly}
                                                  type={def.type}
                                                  className={isReadOnly ? 'text-slate-400 opacity-60' : 'text-slate-700 font-black'} 
                                                />
                                              </td>
                                            );
                                          })}
                                          {!isSubmitted && (
                                            <td className="p-2 text-center w-12">
                                               <button 
                                                 onClick={() => {
                                                   const updated = [...groups];
                                                   updated[gi].rows.splice(ri, 1);
                                                   setGroups(updated);
                                                   setIsDirty(true);
                                                 }}
                                                 className="p-2 text-slate-200 hover:text-rose-400 transition-all rounded-full hover:bg-rose-50"
                                               >
                                                 <Trash2 className="w-4 h-4" />
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
                ))}
              </div>
            ) : (
              <div className="space-y-10">
                {groups.map((group, gi) => {
                  const visibleCols = (group.columnDefinitions || []);
                  return (
                    <div key={gi} className="bg-slate-50/40 rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8 px-4">
                         <h3 className="font-black text-slate-800 text-[12px] uppercase tracking-widest opacity-80">{group.name}</h3>
                         {!isSubmitted && (
                           <button onClick={() => { 
                              const updated = [...groups];
                              const newRow: any = { _pointIdx: updated[gi].rows.length.toString() };
                              (group.columnDefinitions || []).forEach(col => { newRow[col.id] = ''; });
                              updated[gi].rows.push(newRow); 
                              setGroups(updated); 
                           }} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                              <Plus size={14} /> Add Linha
                           </button>
                         )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0 border border-slate-200 rounded-2xl overflow-hidden">
                           <thead>
                              <tr className="bg-slate-100/50">
                                {visibleCols.map((def, ci) => (
                                  <th key={ci} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-r border-slate-200 last:border-r-0">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {def.isLocked && <Lock size={10} className="text-amber-400" />}
                                      {def.name}
                                    </div>
                                  </th>
                                ))}
                                {!isSubmitted && <th className="px-4 py-4 border-b border-slate-200 w-12 bg-slate-100/30"></th>}
                              </tr>
                           </thead>
                           <tbody>
                              {group.rows.map((row, ri) => {
                                const calc = calculatedPoints[`${group.blockId || group.name}_row${ri}`];
                                return (
                                  <tr key={ri}>
                                    {visibleCols.map((def, ci) => {
                                      const isReadOnly = (def.behavior === ColumnBehavior.CALCULATED && !!def.formula?.trim()) || def.isLocked || isSubmitted;
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
                                        <td key={ci} className="p-0 border-b border-r border-slate-100 last:border-r-0 h-12">
                                          <CellInput 
                                            value={Array.isArray(val) ? val.join('; ') : (val ?? '') as any} 
                                            onChange={newVal => updateCell(gi, ri, def.id, newVal)}
                                            disabled={isReadOnly}
                                            type={def.type}
                                            className={isReadOnly ? 'bg-slate-50/30 text-slate-400 opacity-60' : 'bg-transparent text-slate-700'} 
                                          />
                                        </td>
                                      );
                                    })}
                                    {!isSubmitted && (
                                      <td className="p-2 text-center w-12 border-b border-slate-100 bg-slate-50/10">
                                         <button 
                                           onClick={() => {
                                             const updated = [...groups];
                                             updated[gi].rows.splice(ri, 1);
                                             setGroups(updated);
                                             setIsDirty(true);
                                           }}
                                           className="p-2 text-slate-200 hover:text-rose-400 transition-all rounded-full hover:bg-rose-50"
                                         >
                                           <Trash2 className="w-4 h-4" />
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
            )}
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
