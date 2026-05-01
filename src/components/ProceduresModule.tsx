import { useState, useEffect } from 'react';
import { Procedure } from '../types';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  BookOpen, 
  FileText, 
  Search, 
  X, 
  LayoutGrid, 
  List,
  Eye,
  ChevronRight
} from 'lucide-react';

interface ProceduresModuleProps {
  procedures: Procedure[];
  onSaveProcedure: (procedure: Omit<Procedure, 'id'> | Procedure) => void;
  onDeleteProcedure: (id: string) => void;
  searchQuery?: string;
}

export default function ProceduresModule({ 
  procedures, 
  onSaveProcedure, 
  onDeleteProcedure,
  searchQuery
}: ProceduresModuleProps) {
  const [newProcedure, setNewProcedure] = useState<Omit<Procedure, 'id'>>({ title: '', content: '' });
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  const effectiveSearch = searchQuery !== undefined ? searchQuery : localSearchTerm;
  
  // View mode management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('procedures_view_mode') as 'grid' | 'list') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('procedures_view_mode', viewMode);
  }, [viewMode]);

  const handleSave = async () => {
    if (newProcedure.title.trim() === '') return;
    onSaveProcedure(editingProcedure ? { ...newProcedure, id: editingProcedure.id } : newProcedure);
    setNewProcedure({ title: '', content: '' });
    setEditingProcedure(null);
  };

  const handleEdit = (proc: Procedure) => {
    setEditingProcedure(proc);
    setNewProcedure({ title: proc.title, content: proc.content });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredProcedures = procedures.filter(proc =>
    proc.title.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    proc.content.toLowerCase().includes(effectiveSearch.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Procedimentos Técnicos</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Gestão de normas e métodos de calibração padronizados.</p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-emerald-50/30 dark:bg-emerald-900/10 p-8 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/30 mb-12">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest flex items-center">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mr-3 shadow-lg shadow-emerald-100 dark:shadow-none">
                    {editingProcedure ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                {editingProcedure ? 'Editar Método de Trabalho' : 'Criar Novo Procedimento'}
            </h3>
            {editingProcedure && (
                <button 
                onClick={() => { setEditingProcedure(null); setNewProcedure({ title: '', content: '' }); }} 
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center font-black text-xs uppercase"
                >
                    <X className="w-4 h-4 mr-1" /> Descartar Edição
                </button>
            )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ml-1">Título do Procedimento</label>
            <input
              type="text"
              value={newProcedure.title}
              onChange={(e) => setNewProcedure({ ...newProcedure, title: e.target.value })}
              placeholder="Ex: PC-001 - Calibração de Paquímetros Digitais"
              className="w-full border-2 border-transparent bg-white dark:bg-slate-900 p-4 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-all shadow-sm dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ml-1">Conteúdo e Instruções Normativas</label>
            <textarea
              value={newProcedure.content}
              onChange={(e) => setNewProcedure({ ...newProcedure, content: e.target.value })}
              placeholder="Descreva detalhadamente o passo a passo, critérios de aceitação e normas aplicáveis (ABNT, ISO, etc)..."
              className="w-full border-2 border-transparent bg-white dark:bg-slate-900 p-6 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-all shadow-sm min-h-[180px] scrollbar-hide dark:text-white"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all flex items-center active:scale-95"
          >
            <Save className="mr-2 w-5 h-5" />
            {editingProcedure ? 'Salvar Procedimento' : 'Publicar Procedimento'}
          </button>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="Pesquisar procedimentos..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm transition-all dark:text-white"
                value={effectiveSearch}
                onChange={(e) => searchQuery !== undefined ? null : setLocalSearchTerm(e.target.value)}
                readOnly={searchQuery !== undefined}
            />
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
            {filteredProcedures.length} registros encontrados
        </div>
      </div>

      {/* LISTING SECTION (Layout Retilíneo Estrito) */}
      <div className="rectilinear-container custom-scrollbar shadow-sm">
        <table className="rectilinear-table">
          <thead>
            <tr>
              <th className="rectilinear-th col-sm text-center pl-8">Cód. Interno</th>
              <th className="rectilinear-th col-lg text-center">Procedimento / Norma</th>
              <th className="rectilinear-th col-xl text-center">Metodologia / Resumo</th>
              <th className="rectilinear-th col-sm text-center pr-8">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredProcedures.map(proc => (
                 <tr key={proc.id} className="rectilinear-tr group">
                    <td className="rectilinear-td text-center pl-8 font-mono text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tabular-nums">
                        {proc.id}
                    </td>
                    <td className="rectilinear-td text-left font-black text-slate-900 dark:text-white truncate" title={proc.title}>
                        {proc.title}
                    </td>
                    <td className="rectilinear-td text-left text-xs text-slate-500 dark:text-slate-400 truncate max-w-md" title={proc.content.replace(/<[^>]*>?/gm, '')}>
                        {proc.content.replace(/<[^>]*>?/gm, '')}
                    </td>
                    <td className="rectilinear-td text-center pr-8">
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(proc)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Editar">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteProcedure(proc.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProcedures.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Nenhum procedimento encontrado</h3>
            <p className="text-slate-500 font-medium text-sm">Tente ajustar sua busca ou crie um novo registro acima.</p>
        </div>
      )}
    </div>
  );
}
