import { useState, useEffect, useCallback } from 'react';
import { 
  CertificateMask, 
  Procedure, 
  StandardInstrument, 
  CalibrationRecord, 
  ColumnType, 
  ColumnDefinition, 
  StandardInstrumentUncertainty, 
  ColumnBehavior, 
  MetrologyField 
} from '../types';
import { 
  getBehaviorLabel, 
  applyMetrologyDefaults, 
  getDefaultBehaviorByType 
} from '../utils/metrologyUtils';
import { 
  getExecutionOrder, 
  validateFormula, 
  migrateFormula 
} from '../utils/calculationEngine';
import { 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Settings2, 
  Table as TableIcon, 
  CheckCircle2, 
  X, 
  Shield, 
  FileText, 
  Info,
  FunctionSquare,
  AlertCircle,
  Hash,
  Search,
  ChevronDown,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/**
 * Robust UUID-like generator (fallback for missing lib)
 */
const generateId = () => `col_${crypto.randomUUID().split('-')[0]}`;

interface CertificateMasksModuleProps {
  masks: CertificateMask[];
  procedures: Procedure[];
  standardInstruments: StandardInstrument[];
  calibrationRecords?: CalibrationRecord[];
  onSaveCertificateMask: (mask: CertificateMask) => void;
  onDeleteCertificateMask: (id: string) => void;
}

export default function CertificateMasksModule({ 
  masks, 
  procedures, 
  standardInstruments, 
  calibrationRecords = [], 
  onSaveCertificateMask, 
  onDeleteCertificateMask 
}: CertificateMasksModuleProps) {
  const [newMask, setNewMask] = useState<Omit<CertificateMask, 'id'>>({
    title: '',
    procedureId: '',
    standardInstrumentIds: [],
    standardInstrumentUncertainties: [],
    measurementGroups: [],
    instrumentType: '',
    measuredQuantity: '',
    unit: '',
    numberOfPoints: 1,
    repetitions: 3,
    isActive: true,
    version: 1,
    type: 'CALIBRATION_CERTIFICATE'
  });
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingMask, setEditingMask] = useState<CertificateMask | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [columnCountInput, setColumnCountInput] = useState<number>(4);
  
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition[]>([
    { id: generateId(), name: 'Valor de Referência', type: ColumnType.VVC, behavior: ColumnBehavior.INPUT },
    { id: generateId(), name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT },
    { id: 'col_erro', name: 'Erro', type: ColumnType.ERRO, behavior: ColumnBehavior.CALCULATED, formula: '[Leitura] - [Valor de Referência]' },
    { id: 'col_u', name: 'Incerteza (U)', type: ColumnType.INCERTEZA, behavior: ColumnBehavior.METROLOGY, metrologyField: 'U' }
  ]);
  
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [formulaErrors, setFormulaErrors] = useState<Record<number, string>>({});
  const [isAuditorMode, setIsAuditorMode] = useState(false);
  const [instrumentSearchTerm, setInstrumentSearchTerm] = useState('');
  const [showInstrumentDropdown, setShowInstrumentDropdown] = useState(false);

  // LEGACY MIGRATION: Ensure all formulas use IDs
  useEffect(() => {
    setColumnDefinitions(prev => prev.map(def => {
      if (def.behavior === ColumnBehavior.CALCULATED && def.formula) {
        const migrated = migrateFormula(def.formula, prev);
        if (migrated !== def.formula) return { ...def, formula: migrated };
      }
      return def;
    }));
  }, []);

  /**
   * Safe Immutable Update Helper
   */
  const updateColumn = useCallback((index: number, updater: (def: ColumnDefinition) => ColumnDefinition) => {
    setColumnDefinitions(prev => {
      const newDefs = [...prev];
      newDefs[index] = updater({ ...newDefs[index] });
      
      // Real-time validation for formulas
      const updatedDef = newDefs[index];
      if (updatedDef.behavior === ColumnBehavior.CALCULATED && updatedDef.formula) {
        const validation = validateFormula(updatedDef.formula, newDefs);
        setFormulaErrors(errs => ({
          ...errs,
          [index]: validation.valid ? '' : (validation.error || 'Erro na fórmula')
        }));
      } else {
        setFormulaErrors(errs => ({ ...errs, [index]: '' }));
      }

      return newDefs;
    });
  }, []);

  const handleColumnCountChange = (count: number) => {
    const safeCount = Math.max(1, count);
    setColumnCountInput(safeCount);
    
    setColumnDefinitions(prev => {
      if (safeCount > prev.length) {
        const additions: ColumnDefinition[] = [];
        for (let i = prev.length; i < safeCount; i++) {
          additions.push({ 
            id: generateId(),
            name: `Coluna ${i + 1}`, 
            type: ColumnType.TEXTO, 
            behavior: ColumnBehavior.INPUT 
          });
        }
        return [...prev, ...additions];
      } else {
        return prev.slice(0, safeCount);
      }
    });
  };

  const handleColumnNameChange = (index: number, name: string) => {
    updateColumn(index, (def) => ({ ...def, name }));
  };

  const handleColumnTypeChange = (index: number, type: ColumnType) => {
    updateColumn(index, (def) => {
      const behavior = getDefaultBehaviorByType(type);
      return applyMetrologyDefaults({ ...def, type, behavior });
    });
  };

  const handleColumnBehaviorChange = (index: number, behavior: ColumnBehavior) => {
    updateColumn(index, (def) => {
      return applyMetrologyDefaults({ ...def, behavior });
    });
  };

  const handleMetrologyFieldChange = (index: number, field: MetrologyField) => {
    updateColumn(index, (def) => ({ ...def, metrologyField: field }));
  };

  const handleFormulaChange = (index: number, formula: string) => {
    updateColumn(index, (def) => ({ ...def, formula }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumns(prev =>
      prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]
    );
  };

  const handleOpenReviewModal = () => {
    if (!newMask.title.trim()) { toast.error('Título da máscara é obrigatório.'); return; }
    if (!newMask.procedureId) { toast.error('Selecione um Procedimento antes de continuar.'); return; }
    
    // Industrial Validation
    try {
      getExecutionOrder(columnDefinitions);
    } catch (e: any) {
      toast.error(`Falha no motor de cálculo: ${e.message}`);
      return;
    }

    const invalidFormula = columnDefinitions.some((d, idx) => d.behavior === ColumnBehavior.CALCULATED && (!d.formula || formulaErrors[idx]));
    if (invalidFormula) {
      toast.error('Verifique as fórmulas destacadas em vermelho.');
      return;
    }

    setIsReviewModalOpen(true);
  };

  const handleConfirmAddMask = () => {
    if (newMask.measurementGroups.length === 0) { toast.error('Adicione ao menos uma estrutura de medição.'); return; }

    const maskToSave: CertificateMask = {
      ...(editingMask ? editingMask : {}),
      ...newMask,
      id: editingMask?.id || `mask_${Date.now()}`,
      version: editingMask ? (editingMask.version || 1) + 1 : 1,
    } as CertificateMask;

    onSaveCertificateMask(maskToSave);
    resetForm();
    setIsReviewModalOpen(false);
  };

  const resetForm = () => {
    setEditingMask(null);
    setNewMask({ 
      title: '', procedureId: '', standardInstrumentIds: [], standardInstrumentUncertainties: [], 
      measurementGroups: [], instrumentType: '', measuredQuantity: '', unit: '', 
      numberOfPoints: 1, repetitions: 3, isActive: true, version: 1, 
      type: 'CALIBRATION_CERTIFICATE'
    });
    setColumnDefinitions([
      { id: generateId(), name: 'Valor de Referência', type: ColumnType.VVC, behavior: ColumnBehavior.INPUT },
      { id: generateId(), name: 'Leitura', type: ColumnType.LEITURA, behavior: ColumnBehavior.INPUT }
    ]);
  };

  const handleEditMask = (mask: CertificateMask) => {
    setEditingMask(mask);
    setNewMask({ ...mask });
    if (mask.measurementGroups.length > 0) {
      setColumnDefinitions(mask.measurementGroups[0].columnDefinitions || []);
      setHiddenColumns(mask.measurementGroups[0].hiddenColumns || []);
      setColumnCountInput(mask.measurementGroups[0].columnDefinitions?.length || 4);
    }
  };

  const handleDeleteMask = (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o template "${title}" permanentemente?`)) {
      onDeleteCertificateMask(id);
    }
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    
    setNewMask(prev => ({
      ...prev,
      measurementGroups: [...prev.measurementGroups, {
        name: newGroupName,
        columns: columnDefinitions.map(d => d.name),
        columnDefinitions: [...columnDefinitions],
        hiddenColumns: [...hiddenColumns],
        hasGraph: false,
        graphType: 'error_curve'
      }]
    }));
    setNewGroupName('');
  };

  const handleRemoveGroup = (index: number) => {
    setNewMask(prev => ({
      ...prev,
      measurementGroups: prev.measurementGroups.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">
             Criação de Máscaras de Certificados
          </h2>
          <p className="text-sm text-gray-500">Traceabilidade forense ISO 17025 com suporte GUM e Assinatura Digital.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuditorMode(!isAuditorMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
              isAuditorMode 
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Shield className={`w-4 h-4 ${isAuditorMode ? 'animate-pulse text-amber-600' : ''}`} />
            <span className="text-xs font-black uppercase tracking-wider">Modo Auditor</span>
          </button>
        </div>
      </div>

      <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 mb-10">
        <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-8 flex items-center">
          <Settings2 className="mr-2 w-5 h-5 text-indigo-600" />
          {editingMask ? 'Resenhar Template Estratégico' : 'Novo Template de Alta Complexidade'}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Section 1: Metadata */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Título da Máscara</label>
              <input
                type="text"
                value={newMask.title}
                onChange={(e) => setNewMask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Auditoria Interna - Escalas de Tensão"
                className="w-full border border-indigo-100 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Tipo de Documento</label>
                <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setNewMask(prev => ({ ...prev, type: 'CALIBRATION_CERTIFICATE' }))}
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all ${
                        newMask.type === 'CALIBRATION_CERTIFICATE' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-indigo-400 border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      CERTIFICADO DE CALIBRAÇÃO
                    </button>
                    <div className="flex gap-2">
                        <button
                          onClick={() => setNewMask(prev => ({ ...prev, type: 'MAINTENANCE_REPORT' }))}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all ${
                            newMask.type === 'MAINTENANCE_REPORT' ? 'bg-slate-700 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >RELATÓRIO DE TESTE</button>
                        <button
                          onClick={() => setNewMask(prev => ({ ...prev, type: 'TEST_REPORT' }))}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all ${
                            newMask.type === 'TEST_REPORT' ? 'bg-amber-600 text-white border-amber-700 shadow-md' : 'bg-white text-amber-500 border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          RELATÓRIO DE ENSAIO
                        </button>
                    </div>
                  </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Procedimento Técnico (IT/PR)</label>
                <select
                  value={newMask.procedureId}
                  onChange={(e) => setNewMask(prev => ({ ...prev, procedureId: e.target.value }))}
                  className="w-full border border-indigo-100 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-black text-sm bg-white shadow-sm transition-all"
                >
                  <option value="">Selecione o Procedimento...</option>
                  {procedures.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.title}</option>)}
                </select>
              </div>
            </div>

            {/* EXPANDED: Multi-Standard Selection Block (Full Width Area) */}
            <div className="lg:col-span-2 space-y-4 bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden group">
              
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center">
                     <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" />
                     Padrões a serem utilizados na calibração
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Selecione os instrumentos padrão que compõem o escopo deste procedimento.</p>
                </div>
                 {newMask.standardInstrumentIds && newMask.standardInstrumentIds.length > 0 && (
                   <button 
                     type="button"
                     onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNewMask(prev => ({ ...prev, standardInstrumentIds: [] }));
                     }}
                     className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 bg-rose-50 px-4 py-2 rounded-xl transition-all"
                   >
                     Desvincular Todos
                   </button>
                 )}
              </div>
              
              <div className="relative mb-8 group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
                     <Search className={`w-5 h-5 transition-colors ${showInstrumentDropdown ? 'text-indigo-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="text"
                    value={instrumentSearchTerm}
                    onFocus={() => setShowInstrumentDropdown(true)}
                    // Increased timeout significantly to allow scrolling and clicking without immediate closure
                    onBlur={() => setTimeout(() => setShowInstrumentDropdown(false), 300)}
                    onChange={(e) => {
                      setInstrumentSearchTerm(e.target.value);
                      setShowInstrumentDropdown(true);
                    }}
                    placeholder="Procurar ou selecionar instrumentos padrão para o escopo..."
                    className="w-full pl-12 pr-12 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none font-black text-sm transition-all shadow-inner-sm"
                  />
                  <div 
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none transition-transform duration-500"
                    style={{ transform: `translateY(-50%) rotate(${showInstrumentDropdown ? '180deg' : '0deg'})` }}
                  >
                     <ChevronDown className="w-6 h-6" />
                  </div>
                  
                  {showInstrumentDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.15)] z-[200] max-h-[420px] overflow-y-auto overflow-x-hidden p-3 animate-in fade-in slide-in-from-top-4 duration-300">
                       <div className="sticky top-0 bg-white/90 backdrop-blur-md px-5 py-3 mb-2 border-b border-slate-50 z-10 flex justify-between items-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                             {instrumentSearchTerm ? `Filtrando: ${instrumentSearchTerm}` : `Catálogo de Padrões (${(standardInstruments || []).filter(si => !newMask.standardInstrumentIds?.includes(si.id)).length} disponíveis)`}
                          </p>
                          <span className="text-[9px] font-bold text-slate-300 uppercase">Seleção Rápida</span>
                       </div>
                       
                       <div className="space-y-1">
                         {(standardInstruments || [])
                           .filter(si => {
                              const term = instrumentSearchTerm.toLowerCase();
                              return (si.identificacao.toLowerCase().includes(term) || si.nome.toLowerCase().includes(term)) && !newMask.standardInstrumentIds?.includes(si.id);
                           })
                           .map(si => (
                             <div 
                               key={si.id}
                               onMouseDown={(e) => {
                                 // Use onMouseDown instead of onClick to fire before onBlur
                                 e.preventDefault(); 
                                 setNewMask(prev => ({
                                   ...prev,
                                   standardInstrumentIds: [...(prev.standardInstrumentIds || []), si.id]
                                 }));
                                 setInstrumentSearchTerm('');
                                 setShowInstrumentDropdown(false);
                               }}
                               className="flex items-center gap-5 p-5 hover:bg-indigo-50/50 rounded-[1.75rem] cursor-pointer transition-all group active:scale-[0.98]"
                             >
                               <div className="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:text-indigo-600 transition-all shadow-sm border border-slate-100/50">
                                  <Hash className="w-6 h-6" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-[14px] font-black text-slate-800 leading-tight mb-1 truncate">{si.identificacao}</p>
                                 <p className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-400 transition-colors truncate">{si.nome}</p>
                               </div>
                               <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                 <Plus className="w-5 h-5 text-indigo-400" />
                               </div>
                             </div>
                           ))}
                       </div>

                       {(standardInstruments || []).filter(si => (si.identificacao.toLowerCase().includes(instrumentSearchTerm.toLowerCase()) || si.nome.toLowerCase().includes(instrumentSearchTerm.toLowerCase())) && !newMask.standardInstrumentIds?.includes(si.id)).length === 0 && (
                         <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                               <Search className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Nada a incluir</p>
                            <p className="text-[10px] text-slate-300 font-bold max-w-[200px] mx-auto leading-relaxed">Este item já está no escopo ou não existe no cadastro de ativos.</p>
                         </div>
                       )}
                    </div>
                  )}
              </div>

              {/* LIST OF SELECTED INSTRUMENTS */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {(!newMask.standardInstrumentIds || newMask.standardInstrumentIds.length === 0) ? (
                  <div className="py-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum instrumento incluído</p>
                  </div>
                ) : (
                  newMask.standardInstrumentIds.map(id => {
                    const si = (standardInstruments || []).find(s => s.id === id);
                    if (!si) return null;
                    return (
                      <div 
                        key={id}
                        className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-800 leading-tight mb-1">{si.identificacao}</p>
                            <p className="text-[9px] font-bold text-slate-400">{si.nome}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewMask(prev => ({
                            ...prev,
                            standardInstrumentIds: prev.standardInstrumentIds.filter(sid => sid !== id)
                          }))}
                          className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              
              {newMask.standardInstrumentIds?.length > 0 && (
                <div className="pt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (newMask.standardInstrumentIds.length / 5) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 tabular-nums">
                    {newMask.standardInstrumentIds.length} instrumento(s) ativo(s)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Scale Control */}
          <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-center">
            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center">
              <Hash className="mr-2 w-4 h-4 text-indigo-500" />
              Dimensionamento Adatpável
            </h4>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1">Colunas</label>
                 <input
                   type="number"
                   min="1"
                   value={columnCountInput}
                   onChange={(e) => handleColumnCountChange(parseInt(e.target.value) || 1)}
                   className="w-full border border-indigo-200 p-4 rounded-2xl text-xl font-black text-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1">Repetições (n)</label>
                 <input 
                   type="number" 
                   value={newMask.repetitions} 
                   onChange={e => setNewMask(p => ({ ...p, repetitions: Number(e.target.value) }))} 
                   className="w-full border border-indigo-200 p-4 rounded-2xl text-xl font-black text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1">Pontos Calib.</label>
                 <input 
                   type="number" 
                   value={newMask.numberOfPoints} 
                   onChange={e => setNewMask(p => ({ ...p, numberOfPoints: Number(e.target.value) }))} 
                   className="w-full border border-indigo-200 p-4 rounded-2xl text-xl font-black text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
                 />
               </div>
            </div>

            <div className="mb-8 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
               <p className="text-[10px] font-black text-indigo-800 uppercase leading-none mb-1">Capacidade Ilimitada</p>
               <p className="text-[9px] text-indigo-400/80 font-bold">O motor de cálculo e o layout industrial escalam automaticamente conforme os parâmetros definidos acima.</p>
            </div>

            <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Status do Grafo</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">ATIVO & OTIMIZADO</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Segurança de Execução</span>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">ISOLAMENTO TOTAL (NO EVAL)</span>
               </div>
            </div>
          </div>
        </div>

        {/* Column Configuration Area */}
        <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center">
              <FunctionSquare className="mr-2 w-4 h-4 text-indigo-500" />
              Estrutura de Dados & Fórmulas
            </h4>
            <div className="flex gap-2">
               <span className="text-[9px] font-black bg-indigo-50 text-indigo-400 px-3 py-1 rounded-full uppercase">IDs IMUTÁVEIS</span>
               <span className="text-[9px] font-black bg-indigo-50 text-indigo-400 px-3 py-1 rounded-full uppercase">AUTO-MIGRAÇÃO ATIVA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {columnDefinitions.map((def, idx) => (
              <div key={def.id} className="relative group p-5 border border-gray-100 rounded-3xl bg-gray-50/20 hover:bg-white hover:border-indigo-300 hover:shadow-2xl transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-[8px] font-black text-gray-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                  #{idx + 1}
                </div>
                
                <div className="flex items-center justify-between gap-2 mb-4">
                  <input
                    type="text"
                    value={def.name}
                    onChange={(e) => handleColumnNameChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-b border-gray-100 focus:border-indigo-500 outline-none text-xs font-black text-slate-800 py-1"
                    placeholder="Nome da Coluna"
                  />
                  <button onClick={() => toggleColumnVisibility(def.id)} className={`p-1.5 rounded-lg ${hiddenColumns.includes(def.id) ? 'text-rose-400 bg-rose-50' : 'text-emerald-500 bg-emerald-50'}`}>
                    {hiddenColumns.includes(def.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Tipo</label>
                      <select value={def.type} onChange={e => handleColumnTypeChange(idx, e.target.value as ColumnType)} className="w-full bg-white border border-gray-100 p-1.5 rounded-xl text-[9px] font-black outline-none focus:ring-1 focus:ring-indigo-300">
                        {Object.values(ColumnType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Ação</label>
                      <select value={def.behavior} onChange={e => handleColumnBehaviorChange(idx, e.target.value as ColumnBehavior)} className="w-full bg-white border border-gray-100 p-1.5 rounded-xl text-[9px] font-black outline-none focus:ring-1 focus:ring-indigo-300">
                        {Object.values(ColumnBehavior).map(b => <option key={b} value={b}>{getBehaviorLabel(b)}</option>)}
                      </select>
                    </div>
                  </div>

                  {def.behavior === ColumnBehavior.CALCULATED && (
                    <div className="animate-in slide-in-from-top-1">
                      <label className="text-[8px] font-black text-indigo-500 uppercase ml-1 flex items-center">
                        <FunctionSquare size={10} className="mr-1" /> Fórmula Estilo Excel
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={def.formula || ''}
                          onChange={(e) => handleFormulaChange(idx, e.target.value)}
                          className={`w-full border p-2 rounded-xl text-[10px] font-bold outline-none transition-all ${
                            formulaErrors[idx] ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-100' : 'bg-indigo-50/30 border-indigo-100 text-indigo-800'
                          }`}
                          placeholder="ex: [id] * 2"
                        />
                        {formulaErrors[idx] && (
                          <div className="mt-1 flex items-center text-[8px] font-black text-rose-500 animate-pulse">
                            <AlertCircle size={10} className="mr-1" /> {formulaErrors[idx]}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {def.behavior === ColumnBehavior.METROLOGY && (
                    <div className="animate-in slide-in-from-top-1">
                      <label className="text-[8px] font-black text-amber-600 uppercase ml-1 flex items-center">
                        <Shield size={10} className="mr-1" /> Mapeamento GUM
                      </label>
                      <select 
                        value={def.metrologyField || ''} 
                        onChange={e => handleMetrologyFieldChange(idx, e.target.value as MetrologyField)}
                        className="w-full bg-amber-50/30 border border-amber-100 p-2 rounded-xl text-[10px] font-black text-amber-800 outline-none"
                      >
                         <option value="">Selecione...</option>
                         <option value="mean">Ī (Média)</option>
                         <option value="error">E (Erro)</option>
                         <option value="U">U (Expandida)</option>
                         <option value="k">k (Fator)</option>
                         <option value="conformity">Situação</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100/50">
                    <button onClick={() => { navigator.clipboard.writeText(`[${def.id}]`); toast.success(`ID ${def.id} copiado! Útil para referenciar em fórmulas.`); }} className="text-[8px] font-black text-gray-300 uppercase hover:text-indigo-400 transition-colors flex items-center" title="Clique para copiar a tag de ID desta variável">
                      <Hash size={10} className="mr-1" /> ID: {def.id}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-4">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome da Estrutura (Ex: Faixa de 10V)"
              className="flex-1 border border-gray-200 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm bg-gray-50/30"
            />
            <button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl disabled:bg-gray-100 disabled:text-gray-400"
            >
              Vincular Estrutura ao Master
            </button>
          </div>
        </div>

        {/* Saved Groups Review */}
        {newMask.measurementGroups.length > 0 && (
          <div className="space-y-4 mb-10">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estruturas Consolidadas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {newMask.measurementGroups.map((g, gi) => (
                 <div key={gi} className="bg-white border border-indigo-50 p-6 rounded-[32px] shadow-sm relative group">
                    <button onClick={() => handleRemoveGroup(gi)} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500"><Trash2 size={16} /></button>
                    <p className="font-black text-slate-800 mb-4 flex items-center">
                       <TableIcon className="mr-2 text-indigo-400" size={18} /> {g.name}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                       {g.columnDefinitions?.map(c => (
                         <span key={c.id} className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100">{c.name}</span>
                       ))}
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                       <button 
                         onClick={() => {
                           const newGroups = [...newMask.measurementGroups];
                           newGroups[gi] = { ...g, hasGraph: !g.hasGraph };
                           setNewMask(prev => ({ ...prev, measurementGroups: newGroups }));
                         }}
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] font-black uppercase ${
                           g.hasGraph ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-300 border-slate-100'
                         }`}
                       >
                         <Activity size={12} />
                         {g.hasGraph ? 'Gráfico Ativo' : 'Sem Gráfico'}
                       </button>

                       {g.hasGraph && (
                         <select
                           value={g.graphType || 'error_curve'}
                           onChange={(e) => {
                             const newGroups = [...newMask.measurementGroups];
                             newGroups[gi] = { ...g, graphType: e.target.value as any };
                             setNewMask(prev => ({ ...prev, measurementGroups: newGroups }));
                           }}
                           className="bg-slate-50 border-none outline-none text-[9px] font-black text-indigo-700 uppercase cursor-pointer"
                         >
                           <option value="error_curve">Curva de Erro</option>
                           <option value="uncertainty_band">Faixa de Incerteza</option>
                         </select>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-8 border-t border-indigo-100">
           <button
             onClick={handleOpenReviewModal}
             className="px-12 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-lg shadow-2xl hover:bg-slate-900 hover:-translate-y-1 transition-all flex items-center gap-3"
           >
             <CheckCircle2 size={24} />
             {editingMask ? 'Publicar Revisão do Template' : 'Lançar Template Industrial'}
           </button>
        </div>
      </div>

      {/* Grid of Existing Masks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {masks.map(mask => (
          <div key={mask.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-300 transition-all group">
            <div className="flex items-start justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-900 rounded-3xl text-indigo-400 shadow-xl"><Settings2 size={28} /></div>
                  <div>
                     <h3 className="font-black text-slate-800 text-2xl leading-tight">{mask.title}</h3>
                     <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase">v{mask.version}</span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${mask.type === 'TEST_REPORT' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           {mask.type === 'TEST_REPORT' ? 'Relatório de Ensaio' : mask.type === 'MAINTENANCE_REPORT' ? 'Relatório de Teste' : 'Certificado de Calibração'}
                        </span>
                     </div>
                  </div>
               </div>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEditMask(mask)} className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-colors tooltip" aria-label="Editar">
                     <Settings2 size={20} />
                  </button>
                  <button onClick={() => handleDeleteMask(mask.id, mask.title)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors tooltip" aria-label="Excluir">
                     <Trash2 size={20} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="bg-slate-50 p-4 rounded-3xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Procedimento</p>
                  <p className="text-xs font-black text-slate-700 truncate">{procedures.find(p => p.id === mask.procedureId)?.title}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-3xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estruturas</p>
                  <p className="text-xs font-black text-slate-700">{mask.measurementGroups.length} tabelas</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-3xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Configuração</p>
                  <p className="text-xs font-black text-slate-700">{mask.repetitions} leituras/pt</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[48px] shadow-2xl p-12 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Consolidação Industrial</h2>
                <button onClick={() => setIsReviewModalOpen(false)} className="p-4 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={32} /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[40px]">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Master Template Profile</p>
                       <h3 className="text-3xl font-black text-slate-900 mb-6">{newMask.title}</h3>
                       <div className="flex flex-wrap gap-4">
                          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-200 text-xs font-black text-slate-600 flex items-center">
                             <FileText className="mr-2 text-indigo-400" size={16} /> {newMask.type === 'TEST_REPORT' ? 'RELATÓRIO' : 'CERTIFICADO'}
                          </div>
                          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-200 text-xs font-black text-slate-600 flex items-center">
                             <Shield className="mr-2 text-emerald-400" size={16} /> Metodologia GUM ativada
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Matriz de Dependências ({newMask.measurementGroups.length} estruturas)</p>
                       {newMask.measurementGroups.map((g, i) => (
                         <div key={i} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                            <h5 className="font-black text-slate-800 mb-4 flex items-center"><TableIcon size={16} className="mr-2 text-indigo-300" /> {g.name}</h5>
                            <div className="flex flex-wrap gap-2">
                               {g.columnDefinitions?.map(cd => (
                                 <div key={cd.id} className="px-3 py-2 bg-slate-50 rounded-xl flex flex-col items-start border border-slate-50">
                                    <span className="text-[9px] font-black text-slate-700">{cd.name}</span>
                                    <span className="text-[7px] text-indigo-400 font-bold uppercase">{getBehaviorLabel(cd.behavior || 'INPUT')}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">Resumo Técnico & Rastreabilidade</p>
                        <div className="space-y-6">
                           <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                              <span className="text-slate-400 text-xs font-bold uppercase">Pontos de Medição (N)</span>
                              <span className="text-2xl font-black">{newMask.numberOfPoints}</span>
                           </div>
                           <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                              <span className="text-slate-400 text-xs font-bold uppercase">Repetições por Ponto (n)</span>
                              <span className="text-2xl font-black">{newMask.repetitions}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-800 pb-4">
                              <span className="text-slate-400 text-xs font-bold uppercase">Cadeia de Rastreabilidade</span>
                              <div className="text-right">
                                <span className="text-2xl font-black text-emerald-400 block">{newMask.standardInstrumentIds?.length || 0}</span>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">Instrumentos Padrão</p>
                              </div>
                           </div>
                           {newMask.standardInstrumentIds?.length > 0 && (
                             <div className="pt-2 flex flex-wrap gap-2">
                               {newMask.standardInstrumentIds.map(id => {
                                 const si = standardInstruments.find(s => s.id === id);
                                 return si ? (
                                   <div key={id} className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[8px] font-black text-indigo-400">
                                     {si.identificacao}
                                   </div>
                                 ) : null;
                               })}
                             </div>
                           )}
                        </div>
                     </div>
                    
                    <button onClick={handleConfirmAddMask} className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black text-xl shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3">
                       <CheckCircle2 size={24} /> LANÇAR
                    </button>
                    <button onClick={() => setIsReviewModalOpen(false)} className="w-full py-4 text-slate-400 font-black text-sm uppercase tracking-widest hover:text-slate-600 transition-colors">Voltar e Ajustar</button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
