import { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import StandardInstrumentForm, { StandardInstrumentFormData } from './StandardInstrumentForm';

interface StandardInstrumentsModuleProps {
  standardInstruments: StandardInstrument[];
  onSaveStandardInstrument: (si: any) => void;
  onDeleteStandardInstrument: (id: string) => void;
  procedures?: any[];
  documentTemplates?: any[];
}

export default function StandardInstrumentsModule({ 
  standardInstruments, 
  onSaveStandardInstrument, 
  onDeleteStandardInstrument,
  procedures = [],
  documentTemplates = [] 
}: StandardInstrumentsModuleProps) {
  const [editingInstrument, setEditingInstrument] = useState<StandardInstrument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View mode management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('standard_instruments_view_mode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('standard_instruments_view_mode', viewMode);
  }, [viewMode]);

  const handleSave = async (data: StandardInstrumentFormData) => {
    onSaveStandardInstrument(data);
    setEditingInstrument(null);
  };

  const handleEdit = (inst: StandardInstrument) => {
    setEditingInstrument(inst);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const filteredInstruments = standardInstruments.filter(inst => 
    inst.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.identificacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.certificadoCalibracao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Instrumentos Padrão</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Gestão de ativos e rastreabilidade metrológica.</p>
        </div>
      </div>

      {/* FORM SECTION */}
      <StandardInstrumentForm 
        key={editingInstrument ? editingInstrument.id : 'new'} 
        initialData={editingInstrument} 
        onSave={handleSave} 
        onCancel={() => setEditingInstrument(null)} 
      />

      <div className="mb-8 flex items-center justify-between">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="Filtrar instrumentos..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm transition-all dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
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
                                <span className={diffDays < 0 ? 'text-rose-600 font-black' : 'text-slate-600 dark:text-slate-400'}>{formatDate(inst.dataValidadeCalibracao)}</span>
                            </div>
                        </td>
                        <td className="rectilinear-td">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(inst)} className="p-2 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                    <Eye className="w-4 h-4" />
                                </button>
                                {inst.certificadoPdf && (
                                    <button onClick={() => handleClearAttachment(inst)} className="p-2 text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                        <FileText className="w-4 h-4" />
                                    </button>
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
    </div>
  );
}
