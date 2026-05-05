import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceOrder, StandardInstrument, CalibrationRecord, Procedure } from '../types';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Calendar, 
  Activity, 
  LayoutGrid, 
  List,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileUp,
  FileCheck,
  FileText,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatStandardValidity } from '../utils/formatters';
import { generateStandardInstrumentPdf } from '../utils/pdfGenerator';
import StandardInstrumentForm from './StandardInstrumentForm';

interface StandardInstrumentsModuleProps {
  standardInstruments: StandardInstrument[];
  onSaveStandardInstrument: (instrument: Omit<StandardInstrument, 'id'> | StandardInstrument) => void;
  onDeleteStandardInstrument: (id: string) => void;
  procedures?: any[];
  documentTemplates?: any[];
  searchQuery?: string;
}

export default function StandardInstrumentsModule({ 
  standardInstruments, 
  onSaveStandardInstrument, 
  onDeleteStandardInstrument,
  procedures = [],
  documentTemplates = [],
  searchQuery
}: StandardInstrumentsModuleProps) {
  const [editingInstrument, setEditingInstrument] = useState<StandardInstrument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Disponíveis' | 'Vencidos'>('Todos');

  // View mode management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('standard_instruments_view_mode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('standard_instruments_view_mode', viewMode);
  }, [viewMode]);

  const handleSave = async (data: StandardInstrument) => {
    onSaveStandardInstrument(data);
    setEditingInstrument(null);
    setIsModalOpen(false);
  };

  const handleDownloadStandard = async (inst: StandardInstrument) => {
    try {
      const promise = generateStandardInstrumentPdf(inst, documentTemplates);
      toast.promise(promise, {
        loading: 'Gerando Ficha Padrão PDF...',
        success: 'Ficha baixada com sucesso!',
        error: 'Erro ao gerar ficha.'
      });
      await promise;
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (inst: StandardInstrument) => {
    setEditingInstrument(inst);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este instrumento? Esta ação não pode ser desfeita.')) {
      onDeleteStandardInstrument(id);
    }
  };

  const handleClearAttachment = (inst: StandardInstrument) => {
    if (window.confirm('Remover o arquivo anexado a este instrumento?')) {
      onSaveStandardInstrument({ ...inst, certificadoPdf: undefined });
    }
  };

  const today = new Date();
  
  const filteredInstruments = standardInstruments.filter(inst => {
    const isSearchMatch = searchQuery === undefined || inst.nome.toLowerCase().includes(searchQuery.toLowerCase()) || inst.identificacao?.toLowerCase().includes(searchQuery.toLowerCase()) || inst.certificadoCalibracao?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!isSearchMatch) return false;

    const validityDate = new Date(inst.dataValidadeCalibracao);
    const diffTime = validityDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isVencido = diffDays < 0;

    if (activeFilter === 'Disponíveis') return inst.statusMovimentacao === 'Disponível' && !isVencido;
    if (activeFilter === 'Vencidos') return isVencido;
    return true; // Todos
  });

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Instrumentos Padrão</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Gestão de ativos e rastreabilidade metrológica.</p>
        </div>
        <button onClick={() => { setEditingInstrument(null); setIsModalOpen(true); }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 self-start">
          <Plus className="w-5 h-5" /> Novo Instrumento
        </button>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {['Todos', 'Disponíveis', 'Vencidos'].map((filterName) => {
            const isActive = activeFilter === filterName;
            
            let count = 0;
            if (filterName === 'Todos') count = standardInstruments.length;
            else if (filterName === 'Disponíveis') count = standardInstruments.filter(i => i.statusMovimentacao === 'Disponível' && new Date(i.dataValidadeCalibracao).getTime() >= today.getTime()).length;
            else if (filterName === 'Vencidos') count = standardInstruments.filter(i => new Date(i.dataValidadeCalibracao).getTime() < today.getTime()).length;

            return (
              <button 
                key={filterName}
                onClick={() => setActiveFilter(filterName as any)}
                className={`px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all border ${
                  isActive 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {filterName} <span className="opacity-60 ml-1">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filteredInstruments.length} registros encontrados
        </div>
      </div>

      {/* LISTING SECTION (Layout Retilíneo Estrito) */}
      <div className="rectilinear-container custom-scrollbar shadow-sm">
        <table className="rectilinear-table">
          <thead>
            <tr>
              <th className="rectilinear-th col-sm">TAG/ID</th>
              <th className="rectilinear-th col-md">Equipamento Padrão</th>
              <th className="rectilinear-th col-md">Certificado / Calibrador</th>
              <th className="rectilinear-th col-sm">Status</th>
              <th className="rectilinear-th col-sm">Validade</th>
              <th className="rectilinear-th col-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredInstruments.map(inst => {
                const today = new Date();
                const validityDate = new Date(inst.dataValidadeCalibracao);
                const diffTime = validityDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                    <tr key={inst.id} className="rectilinear-tr group">
                        <td className="rectilinear-td font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                            {inst.identificacao}
                        </td>
                        <td className="rectilinear-td font-black text-slate-900 dark:text-white truncate" title={inst.nome}>
                            {inst.nome}
                        </td>
                        <td className="rectilinear-td font-bold text-slate-500 dark:text-slate-400 truncate text-[11px]">
                            {inst.certificadoCalibracao} <span className="opacity-50 text-[9px]">({inst.orgaoCalibrador})</span>
                        </td>
                        <td className="rectilinear-td text-center">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border shadow-sm ${
                                diffDays < 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' :
                                inst.statusMovimentacao === 'Disponível' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                                'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                            }`}>
                                {diffDays < 0 ? 'Vencido' : inst.statusMovimentacao}
                            </span>
                        </td>
                        <td className="rectilinear-td font-mono text-xs font-bold tabular-nums">
                            <div className="flex items-center gap-1.5">
                                <Clock className={`w-3 h-3 ${diffDays < 0 ? 'text-rose-500' : diffDays < 30 ? 'text-amber-500' : 'text-slate-400'}`} />
                                <span className={diffDays < 0 ? 'text-rose-600 font-black' : 'text-slate-600 dark:text-slate-400'}>{formatStandardValidity(inst.dataValidadeCalibracao)}</span>
                            </div>
                        </td>
                        <td className="rectilinear-td">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(inst)} className="p-2 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Editar Padrão">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDownloadStandard(inst)} className="p-2 text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Gerar Ficha Padrão (PDF)">
                                    <FileDown className="w-4 h-4" />
                                </button>
                                {inst.certificadoPdf && (
                                    <>
                                      <button onClick={() => window.open(inst.certificadoPdf, '_blank')} className="p-2 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all text-[10px] font-black uppercase flex items-center gap-1" title="Ver PDF">
                                          <ExternalLink className="w-4 h-4" /> PDF
                                      </button>
                                      <button onClick={() => handleClearAttachment(inst)} className="p-2 text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Remover PDF">
                                          <X className="w-4 h-4" />
                                      </button>
                                    </>
                                )}
                                <button onClick={() => handleDelete(inst.id)} className="p-2 text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-10 w-full max-w-4xl border border-slate-100 dark:border-slate-800 max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between mb-8 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingInstrument ? 'Editar Instrumento' : 'Novo Instrumento'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
                    Preencha os dados do padrão metrológico.
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                <StandardInstrumentForm 
                  key={editingInstrument ? editingInstrument.id : 'new'} 
                  initialData={editingInstrument || {}} 
                  onSubmit={handleSave} 
                  onCancel={() => setIsModalOpen(false)} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
