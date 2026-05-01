import { useState, useEffect, useRef } from 'react';
import { 
  CertificateMask, ColumnType, ColumnBehavior, ColumnDefinition, MeasurementGroup,
  Procedure, StandardInstrument 
} from '../types';
import { 
  Plus, 
  Trash2, 
  Table as TableIcon, 
  FileText, 
  Beaker,
  Tag as TagIcon,
  Zap,
  FlaskConical,
  History as HistoryIcon,
  Eye,
  CheckCircle2,
  X,
  ChevronDown,
  User,
  Hash,
  LayoutGrid,
  List,
  Pencil,
  Shield,
  Settings2,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { evaluate } from '../utils/formulaParser';

interface CertificateMasksModuleProps {
  masks: CertificateMask[];
  onSave: (mask: CertificateMask) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  procedures?: Procedure[];
  standardInstruments?: StandardInstrument[];
}

const DICTIONARY_TAGS = [
  { tag: '[U_PADRAO]', desc: 'INCERTEZA DO INSTRUMENTO PADRÃO' },
  { tag: '[K_PADRAO]', desc: 'FATOR DE ABRANGÊNCIA (k)' },
  { tag: '[RESOLUCAO]', desc: 'RESOLUÇÃO DO INSTRUMENTO (CLIENTE)' },
  { tag: 'RAIZ(x)', desc: 'FUNÇÃO RAIZ QUADRADA' }
];

export default function CertificateMasksModule({ masks, onSave, onDelete, procedures = [], standardInstruments = [] }: CertificateMasksModuleProps) {
  const [editingMask, setEditingMask] = useState<CertificateMask | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => 
    (localStorage.getItem('masksViewMode') as 'grid' | 'list') || 'grid'
  );

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('masksViewMode', mode);
  };

  const handleCreateNew = () => {
    const newMask: CertificateMask = {
      id: `mask-${Date.now()}`,
      title: 'Nova Máscara de Calibração',
      description: '',
      procedureId: '',
      standardInstrumentIds: [],
      version: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      measurementGroups: [{
        name: 'Tabela de Resultados 1',
        blockId: 'T1',
        columnDefinitions: [
          { id: 'TAG_1', name: 'Nova Coluna', type: ColumnType.NUMBER, behavior: ColumnBehavior.INPUT }
        ],
        isDynamic: true
      }],
      uncertaintyBudget: []
    };
    setEditingMask(newMask);
  };

  const handleDuplicate = async (mask: CertificateMask) => {
    const duplicatedMask: CertificateMask = {
      ...JSON.parse(JSON.stringify(mask)),
      id: `mask-${Date.now()}`,
      title: `${mask.title} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await onSave(duplicatedMask);
    toast.success('Máscara duplicada com sucesso!');
  };

  if (editingMask) {
    return (
      <MaskIDE 
        mask={editingMask} 
        onSave={async (m) => { await onSave(m); setEditingMask(null); }}
        onClose={() => setEditingMask(null)}
        procedures={procedures}
        standardInstruments={standardInstruments}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-6 px-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50">
           <button 
             onClick={() => toggleViewMode('grid')}
             className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <LayoutGrid size={20}/>
           </button>
           <button 
             onClick={() => toggleViewMode('list')}
             className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <List size={20}/>
           </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <button onClick={handleCreateNew} className="h-64 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-white/50 flex flex-col items-center justify-center gap-4 group hover:border-indigo-500/50 transition-all">
             <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
               <Plus size={32} />
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Criar Nova Máscara</span>
          </button>
          {masks.map((mask) => (
            <div key={mask.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-500 transition-all group relative">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-6">
                <TableIcon size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">{mask.title}</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black">V{mask.version || '1.0'}</span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{mask.measurementGroups.length} Tab</span>
                </div>
                 <div className="flex gap-1">
                  <button onClick={() => setEditingMask(mask)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Editar"><Pencil size={20} /></button>
                  <button onClick={() => handleDuplicate(mask)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="Duplicar"><Copy size={20} /></button>
                  {onDelete && <button onClick={() => onDelete(mask.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all" title="Excluir"><Trash2 size={20} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação da Máscara</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Versão</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estruturas</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={handleCreateNew}>
                <td colSpan={4} className="px-8 py-6 text-center text-xs font-black text-indigo-600 uppercase tracking-widest">
                  + Criar Nova Máscara de Calibração
                </td>
              </tr>
              {masks.map((mask) => (
                <tr key={mask.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                        <TableIcon size={20} />
                      </div>
                      <span className="font-black text-slate-800 uppercase tracking-tight">{mask.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">V{mask.version || '1.0'}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{mask.measurementGroups.length} Tabelas</span>
                  </td>
                   <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                       <button onClick={() => setEditingMask(mask)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar">
                          <Pencil size={18} />
                       </button>
                       <button onClick={() => handleDuplicate(mask)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Duplicar">
                          <Copy size={18} />
                       </button>
                       {onDelete && (
                         <button onClick={() => onDelete(mask.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Excluir">
                            <Trash2 size={18} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MaskIDE({ 
  mask, 
  onSave, 
  onClose,
  procedures,
  standardInstruments
}: { 
  mask: CertificateMask, 
  onSave: (m: CertificateMask) => Promise<void>, 
  onClose: () => void,
  procedures: Procedure[],
  standardInstruments: StandardInstrument[]
}) {
  const [localMask, setLocalMask] = useState<CertificateMask>({ 
    type: 'CALIBRATION_CERTIFICATE',
    ...mask 
  });
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [lastFocusedInput, setLastFocusedInput] = useState<{ groupId: number, colId: number } | null>(null);
  const [sandboxValues, setSandboxValues] = useState<Record<string, string>>({});
  const [sandboxResults, setSandboxResults] = useState<Record<string, any>>({});
  
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const results: Record<string, any> = {};
    const currentGroup = localMask.measurementGroups[activeTabIdx];
    if (currentGroup) {
      const context: Record<string, number> = {};
      const parseSafe = (v: any) => parseFloat(String(v || '0').replace(',', '.')) || 0;

      currentGroup.columnDefinitions.forEach(col => {
        if (col.behavior === ColumnBehavior.INPUT || col.behavior === ColumnBehavior.MANUAL) {
          context[col.id] = parseSafe(sandboxValues[`${activeTabIdx}-${col.id}`]);
        }
      });
      context['U_PADRAO'] = 0.005;
      context['K_PADRAO'] = 2.0;
      context['RESOLUCAO'] = 0.01;

      currentGroup.columnDefinitions.forEach(col => {
        if (col.behavior === ColumnBehavior.CALCULATED && col.formula) {
          try {
            const cleanFormula = col.formula.startsWith('=') ? col.formula.substring(1) : col.formula;
            results[`${activeTabIdx}-${col.id}`] = evaluate(cleanFormula, context);
            context[col.id] = results[`${activeTabIdx}-${col.id}`];
          } catch (e) {
            results[`${activeTabIdx}-${col.id}`] = 'ERR!';
          }
        }
      });
    }
    setSandboxResults(results);
  }, [localMask, sandboxValues, activeTabIdx]);

  const insertTagAtCursor = (tag: string) => {
    if (!lastFocusedInput) {
       toast.error('Clique em um campo de fórmula primeiro!');
       return;
    }
    const { groupId, colId } = lastFocusedInput;
    const inputId = `formula-${groupId}-${colId}`;
    const inputNode = inputRefs.current[inputId];
    if (inputNode) {
      const start = inputNode.selectionStart || 0;
      const end = inputNode.selectionEnd || 0;
      const text = inputNode.value;
      const newValue = text.substring(0, start) + tag + text.substring(end);
      const updatedGroups = [...localMask.measurementGroups];
      updatedGroups[groupId].columnDefinitions[colId].formula = newValue;
      if (updatedGroups[groupId].columnDefinitions[colId].behavior !== ColumnBehavior.CALCULATED) {
         updatedGroups[groupId].columnDefinitions[colId].behavior = ColumnBehavior.CALCULATED;
      }
      setLocalMask({ ...localMask, measurementGroups: updatedGroups });
      setTimeout(() => {
        inputNode.focus();
        const newPos = start + tag.length;
        inputNode.setSelectionRange(newPos, newPos);
      }, 10);
    }
  };

  const addColumn = () => {
    const updatedGroups = [...localMask.measurementGroups];
    const newCol: ColumnDefinition = {
      id: `TAG_${updatedGroups[activeTabIdx].columnDefinitions.length + 1}`,
      name: 'Nova Coluna',
      type: ColumnType.NUMBER,
      behavior: ColumnBehavior.INPUT
    };
    updatedGroups[activeTabIdx].columnDefinitions.push(newCol);
    setLocalMask({ ...localMask, measurementGroups: updatedGroups });
  };

  const addGroup = () => {
    const newGroup: MeasurementGroup = {
      name: `Tabela de Resultados ${localMask.measurementGroups.length + 1}`,
      blockId: `T${localMask.measurementGroups.length + 1}`,
      columnDefinitions: [
        { id: 'TAG_1', name: 'Nova Coluna', type: ColumnType.NUMBER, behavior: ColumnBehavior.INPUT }
      ],
      isDynamic: true
    };
    setLocalMask({ ...localMask, measurementGroups: [...localMask.measurementGroups, newGroup] });
    setActiveTabIdx(localMask.measurementGroups.length);
  };

  const duplicateGroup = () => {
    const currentGroup = localMask.measurementGroups[activeTabIdx];
    if (!currentGroup) return;
    const newGroup: MeasurementGroup = JSON.parse(JSON.stringify(currentGroup));
    newGroup.name = `${currentGroup.name} (Cópia)`;
    newGroup.blockId = `T${localMask.measurementGroups.length + 1}`;
    
    setLocalMask({ ...localMask, measurementGroups: [...localMask.measurementGroups, newGroup] });
    setActiveTabIdx(localMask.measurementGroups.length);
    toast.success('Tabela duplicada com sucesso!');
  };

  const updateColumn = (colIdx: number, updates: Partial<ColumnDefinition>) => {
    const updatedGroups = [...localMask.measurementGroups];
    updatedGroups[activeTabIdx].columnDefinitions[colIdx] = {
      ...updatedGroups[activeTabIdx].columnDefinitions[colIdx],
      ...updates
    };
    setLocalMask({ ...localMask, measurementGroups: updatedGroups });
  };

  const toggleVisibility = (colIdx: number) => {
    const updatedGroups = [...localMask.measurementGroups];
    const group = updatedGroups[activeTabIdx];
    const colId = group.columnDefinitions[colIdx].id;
    const hidden = group.hiddenColumns || [];
    
    if (hidden.includes(colId)) {
      group.hiddenColumns = hidden.filter(id => id !== colId);
      toast.success(`Coluna ${colId} visível no PDF`);
    } else {
      group.hiddenColumns = [...hidden, colId];
      toast.info(`Coluna ${colId} oculta no PDF`);
    }
    
    setLocalMask({ ...localMask, measurementGroups: updatedGroups });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-24 p-6 bg-slate-50 min-h-screen">
      {/* 1. BARRA SUPERIOR SLIM */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-white shadow-lg shadow-slate-200/50 flex items-center justify-between sticky top-6 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
             <FileText size={20} />
          </div>
          <div className="flex items-center gap-3">
             <input 
                value={localMask.title}
                onChange={(e) => setLocalMask({...localMask, title: e.target.value})}
                placeholder="Título da Máscara..."
                className="text-lg font-black text-slate-800 outline-none w-[300px] bg-transparent focus:text-indigo-600 transition-all uppercase placeholder:opacity-30"
             />
             <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest ring-1 ring-emerald-100">
                <Shield size={10} /> Live Edit
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative group">
              <select 
                value={localMask.type || 'CALIBRATION_CERTIFICATE'}
                onChange={(e) => {
                  setLocalMask({...localMask, type: e.target.value as any});
                  toast.success(`Tipo alterado para: ${e.target.value}`);
                }}
                className="bg-slate-100/50 px-4 pr-9 py-2 rounded-xl text-[9px] font-black uppercase text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer hover:bg-white border border-transparent hover:border-slate-200"
              >
                <option value="CALIBRATION_CERTIFICATE">Certificado</option>
                <option value="TEST_REPORT">Rel. Teste</option>
                <option value="MAINTENANCE_REPORT">Rel. Ensaio</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
           </div>
           <button onClick={onClose} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors px-2">Sair</button>
           <button 
             onClick={() => onSave({ ...localMask, updatedAt: new Date().toISOString() })}
             className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2"
           >
             <CheckCircle2 size={14} /> Atualizar
           </button>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* 2. CONFIGURAÇÕES BASE */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Settings2 size={20} />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configurações Base</h4>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Descrição do Escopo</label>
              <textarea 
                value={localMask.description}
                onChange={(e) => setLocalMask({...localMask, description: e.target.value})}
                rows={1}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none h-[46px] flex items-center"
                placeholder="Ex: Calibração de paquímetros analógicos..."
              />
            </div>
            
            <div className="lg:col-span-2 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">V. Documento</label>
              <input 
                type="number" 
                step="0.1"
                value={localMask.version}
                onChange={(e) => setLocalMask({...localMask, version: parseFloat(e.target.value)})}
                className="w-full h-[46px] bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-black text-slate-700 outline-none focus:bg-white transition-all text-center"
              />
            </div>

            <div className="lg:col-span-4 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Procedimento Técnico</label>
              <select 
                value={localMask.procedureId}
                onChange={(e) => setLocalMask({...localMask, procedureId: e.target.value})}
                className="w-full h-[46px] bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-black text-slate-700 outline-none focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione o Procedimento...</option>
                {procedures.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. ESTRUTURA DE TABELAS */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm border border-slate-100">
                {localMask.measurementGroups[activeTabIdx]?.blockId}
              </div>
              <input 
                value={localMask.measurementGroups[activeTabIdx]?.name}
                onChange={(e) => {
                  const updated = [...localMask.measurementGroups];
                  updated[activeTabIdx].name = e.target.value;
                  setLocalMask({...localMask, measurementGroups: updated});
                }}
                className="text-xl font-black text-slate-900 outline-none bg-transparent placeholder-slate-200 uppercase tracking-tight w-full max-w-sm"
                placeholder="Nome da Estrutura..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
                <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localMask.measurementGroups[activeTabIdx]?.hasGraph || false}
                    onChange={(e) => {
                      const updated = [...localMask.measurementGroups];
                      updated[activeTabIdx].hasGraph = e.target.checked;
                      if(e.target.checked && !updated[activeTabIdx].graphType) {
                        updated[activeTabIdx].graphType = 'error_curve';
                      }
                      setLocalMask({...localMask, measurementGroups: updated});
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  Gerar Gráfico
                </label>
                {localMask.measurementGroups[activeTabIdx]?.hasGraph && (
                  <select
                    value={localMask.measurementGroups[activeTabIdx]?.graphType || 'error_curve'}
                    onChange={(e) => {
                      const updated = [...localMask.measurementGroups];
                      updated[activeTabIdx].graphType = e.target.value as any;
                      setLocalMask({...localMask, measurementGroups: updated});
                    }}
                    className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[9px] font-bold outline-none uppercase"
                  >
                    <option value="error_curve">Curva de Erros</option>
                    <option value="uncertainty_band">Banda de Incerteza</option>
                  </select>
                )}
              </div>
              <button onClick={addColumn} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all">
                <Plus size={14} /> Coluna
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="flex flex-wrap gap-2">
              {DICTIONARY_TAGS.map((t, idx) => (
                <button 
                  key={idx}
                  onClick={() => insertTagAtCursor(t.tag)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2 hover:border-indigo-400 transition-all group shadow-sm"
                >
                  <span className="text-indigo-600 font-bold text-[9px] uppercase">{t.tag}</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-slate-600">{t.desc}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {localMask.measurementGroups[activeTabIdx]?.columnDefinitions.map((col, idx) => {
                const isHidden = (localMask.measurementGroups[activeTabIdx]?.hiddenColumns || []).includes(col.id);
                return (
                  <div key={idx} className={`p-5 rounded-[2rem] border transition-all ${col.behavior === ColumnBehavior.CALCULATED ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50/30 border-slate-100'} hover:border-indigo-200 group relative`}>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => insertTagAtCursor(`[${col.id}]`)} className="px-3 py-1 bg-white border border-indigo-50 rounded-lg text-[10px] font-black text-indigo-600 uppercase hover:bg-indigo-600 hover:text-white transition-all">
                        {col.id}
                      </button>
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleVisibility(idx)} className={`p-2 rounded-lg transition-all ${isHidden ? 'bg-rose-50 text-rose-500' : 'text-slate-300 hover:bg-slate-100'}`}>
                          {isHidden ? <X size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => {
                          const updated = [...localMask.measurementGroups];
                          updated[activeTabIdx].columnDefinitions.splice(idx, 1);
                          setLocalMask({...localMask, measurementGroups: updated});
                        }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <input 
                          value={col.id}
                          onChange={(e) => updateColumn(idx, { id: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                          className="w-full bg-transparent text-[10px] font-black text-indigo-600 uppercase outline-none"
                          placeholder="TAG_ID"
                        />
                      </div>
                      <div>
                        <input 
                          value={col.name}
                          onChange={(e) => updateColumn(idx, { name: e.target.value })}
                          className="w-full bg-transparent text-xs font-black text-slate-900 outline-none"
                          placeholder="Título no PDF..."
                        />
                      </div>
                      <div className="relative">
                        {col.behavior === ColumnBehavior.CALCULATED && col.formula && <span className="absolute left-0 text-indigo-500 font-black">=</span>}
                        <input 
                          id={`formula-${activeTabIdx}-${idx}`}
                          ref={(el) => { inputRefs.current[`formula-${activeTabIdx}-${idx}`] = el; }}
                          value={col.formula || ''}
                          onFocus={() => {
                            setLastFocusedInput({ groupId: activeTabIdx, colId: idx });
                          }}
                          onChange={(e) => {
                            const newFormula = e.target.value;
                            // Se tem conteúdo, é uma coluna calculada; se estiver vazia, volta a ser INPUT
                            const newBehavior = newFormula.trim().length > 0 ? ColumnBehavior.CALCULATED : ColumnBehavior.INPUT;
                            updateColumn(idx, { formula: newFormula, behavior: newBehavior });
                          }}
                          className={`w-full bg-transparent ${col.behavior === ColumnBehavior.CALCULATED && col.formula ? 'pl-4' : ''} text-xs font-bold text-slate-500 outline-none border-b border-transparent focus:border-indigo-100 italic`}
                          placeholder="Fórmula ou Dado..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={col.displayFormat || 'number'}
                          onChange={(e) => updateColumn(idx, { displayFormat: e.target.value })}
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded p-1 text-[9px] font-bold outline-none uppercase text-slate-600"
                        >
                          <option value="number">Número</option>
                          <option value="percent">Porcentagem (%)</option>
                          <option value="text">Texto</option>
                        </select>
                        <input 
                          type="number"
                          min="0"
                          max="6"
                          value={col.decimalPlaces ?? 4}
                          onChange={(e) => updateColumn(idx, { decimalPlaces: parseInt(e.target.value, 10) })}
                          title="Casas Decimais"
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded p-1 text-[9px] font-bold outline-none text-center"
                          placeholder="Decimais (ex: 4)"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-2">
              {localMask.measurementGroups.map((g, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${activeTabIdx === idx ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                >
                  {g.blockId}
                </button>
              ))}
              <button onClick={addGroup} className="w-8 h-8 flex items-center justify-center bg-white border border-dashed border-indigo-200 text-indigo-500 rounded-xl hover:bg-white transition-all">+</button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={duplicateGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                Duplicar Tabela
              </button>
              {localMask.measurementGroups.length > 1 && (
                <button 
                  onClick={() => {
                    const updated = localMask.measurementGroups.filter((_, i) => i !== activeTabIdx);
                    setLocalMask({...localMask, measurementGroups: updated});
                    setActiveTabIdx(0);
                  }}
                  className="text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. SIMULADOR E CONTROLE */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#121826] rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-8">
              <FlaskConical size={16} className="text-indigo-400" />
              <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Simulador de Resultados</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {localMask.measurementGroups[activeTabIdx]?.columnDefinitions.map(col => {
                const isInput = col.behavior === ColumnBehavior.INPUT || col.behavior === ColumnBehavior.MANUAL;
                const result = sandboxResults[`${activeTabIdx}-${col.id}`];
                return (
                  <div key={col.id} className="group">
                    <label className="text-slate-500 font-black text-[8px] uppercase tracking-[0.2em] mb-1.5 block ml-1 group-hover:text-indigo-400 transition-colors">{col.id}</label>
                    {isInput ? (
                      <input 
                        value={sandboxValues[`${activeTabIdx}-${col.id}`] || ''}
                        onChange={(e) => setSandboxValues({ ...sandboxValues, [`${activeTabIdx}-${col.id}`]: e.target.value })}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-[11px] font-black text-white focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="w-full h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 flex items-center text-[10px] font-black text-indigo-300 shadow-inner">
                        {result !== undefined ? (typeof result === 'number' ? (col.displayFormat === 'percent' ? (result * 100).toFixed(col.decimalPlaces ?? 4) + '%' : result.toFixed(col.decimalPlaces ?? 4)) : result) : '---'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Controle de Documento</h4>
                <div className="flex items-center gap-2 font-black text-sm text-slate-800 uppercase tracking-tight mb-1">
                  <HistoryIcon size={18} className="text-indigo-600" /> Versão Vigente: {localMask.version || '1.0'}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Todas as calibrações vinculadas serão atualizadas ao salvar mudanças estruturais.</p>
              </div>
              
              <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 text-sm font-black border border-slate-100">GM</div>
                <div>
                  <span className="text-xs font-black text-slate-800 block uppercase tracking-tight">C.G. MORAES NETO</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Metrologista Responsável</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
