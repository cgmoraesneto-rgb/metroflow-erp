import React, { useState } from 'react';
import { ThirdPartyRecord, ThirdPartyItem, ThirdPartyMeasurement, Client } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, Trash2, Pencil, ExternalLink, CheckCircle2, Clock, X, Beaker, Download, Scale, Calendar, Hash, Tag, Info, ListPlus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { generateThirdPartyReportPdf } from '../utils/pdfGenerator';

interface ThirdPartyModuleProps {
  searchQuery?: string;
  records: ThirdPartyRecord[];
  onSave?: (record: ThirdPartyRecord) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  inventoryItems?: any[];
  clients?: Client[];
  documentTemplates?: any[];
}

export default function ThirdPartyModule({
  searchQuery = '',
  records = [],
  onSave,
  onDelete,
  inventoryItems = [],
  clients = [],
  documentTemplates = []
}: ThirdPartyModuleProps) {
  const [editingRecord, setEditingRecord] = useState<ThirdPartyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States for the Instrument Modal
  const [editingItem, setEditingItem] = useState<ThirdPartyItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const filteredRecords = records.filter(r => 
    r.laboratorioNome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.numeroReferencia && r.numeroReferencia.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.clienteNome && r.clienteNome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewRecord = () => {
    const newRecord: ThirdPartyRecord = {
      id: `PAR-${Date.now()}`,
      numeroReferencia: '',
      laboratorioNome: '',
      clienteNome: '',
      dataEnvio: '',
      status: 'Pendente',
      items: [],
      criadoEm: new Date().toISOString(),
    };
    setEditingRecord(newRecord);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: ThirdPartyRecord) => {
    setEditingRecord({ ...record });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('Deseja excluir este registro de parceiros?')) {
      if (onDelete) await onDelete(id);
    }
  };

  const handleSave = async () => {
    if (!editingRecord) return;
    if (!editingRecord.laboratorioNome) {
      toast.error('Informe o nome do laboratório.');
      return;
    }
    if (!editingRecord.clienteNome) {
      toast.error('Informe o nome do cliente.');
      return;
    }
    if ((editingRecord.items || []).length === 0) {
      toast.error('Adicione pelo menos um instrumento.');
      return;
    }

    if (onSave) {
      await onSave(editingRecord);
      setIsModalOpen(false);
      setEditingRecord(null);
    }
  };

  // --- Instrument Modal Handlers ---

  const openAddItem = () => {
    const newItem: ThirdPartyItem = {
      id: crypto.randomUUID(),
      tipoCalibracao: 'Rastreável',
      numeroCertificado: '',
      descricao: '',
      marca: '',
      modelo: '',
      serialNumber: '',
      identificacao: '',
      capacidadeMinima: '',
      capacidadeMaxima: '',
      resolucao: '',
      unidade: '',
      dataCalibracao: new Date().toISOString().split('T')[0],
      dataProximaCalibracao: '',
      medicoes: [],
      measurementTables: [
        { id: crypto.randomUUID(), name: 'Tabela 1', measurements: [] }
      ],
      parameters: [],
      observacoes: '',
      status: 'N/A'
    };
    setEditingItem(newItem);
    setEditingItemIndex(null);
    setIsItemModalOpen(true);
  };

  const openEditItem = (index: number) => {
    if (!editingRecord) return;
    setEditingItem({ ...editingRecord.items[index] });
    setEditingItemIndex(index);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!editingItem || !editingRecord) return;
    
    if (!editingItem.descricao) {
      toast.error('Informe o nome do instrumento.');
      return;
    }

    const newItems = [...(editingRecord.items || [])];
    if (editingItemIndex !== null) {
      newItems[editingItemIndex] = editingItem;
    } else {
      newItems.push(editingItem);
    }

    setEditingRecord({ ...editingRecord, items: newItems });
    setIsItemModalOpen(false);
    setEditingItem(null);
    setEditingItemIndex(null);
  };

  const removeItem = (index: number) => {
    if (!editingRecord) return;
    const newItems = (editingRecord.items || []).filter((_, i) => i !== index);
    setEditingRecord({ ...editingRecord, items: newItems });
  };

  // --- Parameter Handlers ---
  
  const addParameter = () => {
    if (!editingItem) return;
    const newParam = {
      id: crypto.randomUUID(),
      capacidadeMinima: editingItem.capacidadeMinima || '',
      capacidadeMaxima: editingItem.capacidadeMaxima || '',
      resolucao: editingItem.resolucao || '',
      unidadeMedida: editingItem.unidade || ''
    };
    setEditingItem({
      ...editingItem,
      parameters: [...(editingItem.parameters || []), newParam]
    });
  };

  const updateParameter = (id: string, field: string, value: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      parameters: (editingItem.parameters || []).map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const removeParameter = (id: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      parameters: (editingItem.parameters || []).filter(p => p.id !== id)
    });
  };

  // --- Measurement Table Handlers ---

  const addMeasurementTable = () => {
    if (!editingItem) return;
    const newTable = {
      id: crypto.randomUUID(),
      name: `Tabela ${(editingItem.measurementTables?.length || 0) + 1}`,
      measurements: []
    };
    setEditingItem({
      ...editingItem,
      measurementTables: [...(editingItem.measurementTables || []), newTable]
    });
  };

  const updateMeasurementTable = (tableId: string, name: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      measurementTables: (editingItem.measurementTables || []).map(t => t.id === tableId ? { ...t, name } : t)
    });
  };

  const removeMeasurementTable = (tableId: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      measurementTables: (editingItem.measurementTables || []).filter(t => t.id !== tableId)
    });
  };

  const addMeasurement = (tableId: string) => {
    if (!editingItem) return;
    const newMeasurement: ThirdPartyMeasurement = {
      id: crypto.randomUUID(),
      padrao: '',
      leitura1: '',
      leitura2: '',
      leitura3: '',
    };

    setEditingItem({
      ...editingItem,
      measurementTables: (editingItem.measurementTables || []).map(t => 
        t.id === tableId ? { ...t, measurements: [...t.measurements, newMeasurement] } : t
      )
    });
  };

  const updateMeasurement = (tableId: string, measurementIndex: number, field: keyof ThirdPartyMeasurement, value: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      measurementTables: (editingItem.measurementTables || []).map(t => {
        if (t.id === tableId) {
          const newMedicoes = [...t.measurements];
          newMedicoes[measurementIndex] = { ...newMedicoes[measurementIndex], [field]: value };
          return { ...t, measurements: newMedicoes };
        }
        return t;
      })
    });
  };

  const removeMeasurement = (tableId: string, measurementIndex: number) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      measurementTables: (editingItem.measurementTables || []).map(t => {
        if (t.id === tableId) {
          return { ...t, measurements: t.measurements.filter((_, i) => i !== measurementIndex) };
        }
        return t;
      })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Calibrações de Parceiros</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Gestão de instrumentos e certificados de laboratórios parceiros.</p>
        </div>
        <button onClick={handleNewRecord} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 self-start">
          <Plus className="w-5 h-5" /> Novo Registro
        </button>
      </div>

      <div className="rectilinear-container custom-scrollbar shadow-sm overflow-x-auto">
        <table className="rectilinear-table min-w-[1000px]">
          <thead>
            <tr>
              <th className="rectilinear-th pl-8 w-[120px] text-center">Referência</th>
              <th className="rectilinear-th text-left">Laboratório Parceiro</th>
              <th className="rectilinear-th text-left">Cliente</th>
              <th className="rectilinear-th w-[120px] text-center">Data Envio</th>
              <th className="rectilinear-th w-[80px] text-center">Itens</th>
              <th className="rectilinear-th w-[130px] text-center">Status</th>
              <th className="rectilinear-th pr-8 w-[150px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredRecords.length > 0 ? filteredRecords.map(record => (
              <tr key={record.id} className="rectilinear-tr group">
                <td className="rectilinear-td pl-8 text-center font-black text-indigo-600 uppercase tracking-widest text-[10px]">
                  {record.numeroReferencia || record.id}
                </td>
                <td className="rectilinear-td text-left">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{record.laboratorioNome}</span>
                </td>
                <td className="rectilinear-td text-left">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{record.clienteNome}</span>
                </td>
                <td className="rectilinear-td text-center text-sm font-bold text-slate-500 italic">{record.dataEnvio || '-'}</td>
                <td className="rectilinear-td text-center">
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{(record.items || []).length}</span>
                </td>
                <td className="rectilinear-td text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    record.status === 'Enviado' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {record.status === 'Enviado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {record.status}
                  </span>
                </td>
                <td className="rectilinear-td pr-8 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditRecord(record)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => generateThirdPartyReportPdf(record, documentTemplates)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Baixar Relatório"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400 italic font-medium">Nenhum registro de calibração externa encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Principal (Registro) */}
      <AnimatePresence>
        {isModalOpen && editingRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-10 w-full max-w-6xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registro de Calibração Externa</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{editingRecord.id}</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${editingRecord.status === 'Enviado' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {editingRecord.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Referência (OS / etc)</label>
                  <input value={editingRecord.numeroReferencia} onChange={e => setEditingRecord({...editingRecord, numeroReferencia: e.target.value})} placeholder="Ex: OS-2024-001..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Laboratório Parceiro</label>
                  <input value={editingRecord.laboratorioNome} onChange={e => setEditingRecord({...editingRecord, laboratorioNome: e.target.value})} placeholder="Nome do laboratório..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cliente</label>
                  <input value={editingRecord.clienteNome} onChange={e => setEditingRecord({...editingRecord, clienteNome: e.target.value})} placeholder="Nome do cliente..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Data de Envio</label>
                  <input 
                    type="date" 
                    value={editingRecord.dataEnvio} 
                    onChange={e => {
                      const date = e.target.value;
                      setEditingRecord({
                        ...editingRecord, 
                        dataEnvio: date,
                        status: date ? 'Enviado' : 'Pendente'
                      });
                    }} 
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" 
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Scale className="w-4 h-4 text-indigo-500" /> Instrumentos Calibrados
                  </h4>
                  <button onClick={openAddItem} className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Cadastrar Instrumento
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    {(editingRecord.items || []).map((item, index) => (
                      <div key={item.id} className="bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm group hover:shadow-md transition-all flex items-center gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shrink-0 ${item.tipoCalibracao === 'RBC' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                              {item.tipoCalibracao}
                            </span>
                            <h5 className="font-black text-slate-900 dark:text-white uppercase text-sm truncate">{item.descricao}</h5>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Tag className="w-3 h-3" /> {item.identificacao || 'N/A'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Hash className="w-3 h-3" /> {item.numeroCertificado || '-'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Beaker className="w-3 h-3" /> {(item.medicoes || []).length} med.</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Data Calibração</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">{item.dataCalibracao || '-'}</span>
                          </div>
                          
                          <div className="flex gap-1">
                            <button onClick={() => openEditItem(index)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar Detalhes"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => removeItem(index)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Remover"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(editingRecord.items || []).length === 0 && (
                      <div className="py-20 text-center text-slate-400 text-xs italic font-medium">Nenhum instrumento cadastrado para este registro.</div>
                    )}
                    
                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <Info className="w-3 h-3" /> Observações Gerais do Registro
                        </label>
                        <textarea 
                          value={editingRecord.observacoesGerais || ''} 
                          onChange={e => setEditingRecord({...editingRecord, observacoesGerais: e.target.value})} 
                          placeholder="Notas gerais sobre este conjunto de instrumentos..." 
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-sm min-h-[120px] resize-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95">Salvar Registro</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Instrumento (Nested) */}
      <AnimatePresence>
        {isItemModalOpen && editingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 w-full max-w-5xl border border-white/20 dark:border-slate-800 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhes do Instrumento</h3>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Informações técnicas e resultados da calibração</p>
                  </div>
                </div>
                <button onClick={() => setIsItemModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4 space-y-8">
                {/* Cabeçalho do Instrumento */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="col-span-full md:col-span-1 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo Calibração</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                      {['Rastreável', 'RBC'].map(type => (
                        <button key={type} onClick={() => setEditingItem({...editingItem, tipoCalibracao: type as any})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${editingItem.tipoCalibracao === type ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nº Certificado</label>
                    <input value={editingItem.numeroCertificado} onChange={e => setEditingItem({...editingItem, numeroCertificado: e.target.value})} placeholder="0000/24..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="col-span-full md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Instrumento</label>
                    <input value={editingItem.descricao} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} placeholder="Ex: Micrômetro Externo..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Marca</label>
                    <input value={editingItem.marca} onChange={e => setEditingItem({...editingItem, marca: e.target.value})} placeholder="Mitutoyo..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Modelo</label>
                    <input value={editingItem.modelo} onChange={e => setEditingItem({...editingItem, modelo: e.target.value})} placeholder="293-240..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nº de Série</label>
                    <input value={editingItem.serialNumber} onChange={e => setEditingItem({...editingItem, serialNumber: e.target.value})} placeholder="S/N..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">TAG / Identificação</label>
                    <input value={editingItem.identificacao} onChange={e => setEditingItem({...editingItem, identificacao: e.target.value})} placeholder="ID-001..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>

                  {/* Multiparâmetros / Faixas Adicionais */}
                  <div className="col-span-full space-y-4">
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                      <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" /> Faixas / Parâmetros Adicionais
                      </h4>
                      <button 
                        onClick={addParameter}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Faixa
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(editingItem.parameters || []).map((p, idx) => (
                        <div key={p.id} className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-wrap md:flex-nowrap items-center gap-4 group animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">C. Mínima</label>
                              <input value={p.capacidadeMinima} onChange={e => updateParameter(p.id, 'capacidadeMinima', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">C. Máxima</label>
                              <input value={p.capacidadeMaxima} onChange={e => updateParameter(p.id, 'capacidadeMaxima', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Resolução</label>
                              <input value={p.resolucao} onChange={e => updateParameter(p.id, 'resolucao', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Unidade</label>
                              <input value={p.unidadeMedida} onChange={e => updateParameter(p.id, 'unidadeMedida', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                            </div>
                          </div>
                          <button onClick={() => removeParameter(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(editingItem.parameters || []).length === 0 && (
                        <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          <p className="text-[10px] text-slate-400 italic">Nenhuma faixa adicional cadastrada.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Data Calibração</label>
                    <input type="date" value={editingItem.dataCalibracao} onChange={e => setEditingItem({...editingItem, dataCalibracao: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Próxima Calibração</label>
                    <input type="date" value={editingItem.dataProximaCalibracao} onChange={e => setEditingItem({...editingItem, dataProximaCalibracao: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-inner" />
                  </div>
                  <div className="col-span-full md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Resultado Final</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                      {['Aprovado', 'Reprovado', 'N/A'].map(status => (
                        <button key={status} onClick={() => setEditingItem({...editingItem, status: status as any})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${editingItem.status === status ? (status === 'Aprovado' ? 'bg-emerald-500 text-white' : status === 'Reprovado' ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-white shadow-sm') : 'text-slate-400'}`}>
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabela de Medições */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <ListPlus className="w-4 h-4 text-indigo-500" /> Tabelas de Medições
                    </h4>
                    <button onClick={addMeasurementTable} className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Nova Tabela
                    </button>
                  </div>

                  <div className="space-y-8">
                    {(editingItem.measurementTables || []).map((table, tableIdx) => (
                      <div key={table.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between gap-4">
                          <input 
                            value={table.name} 
                            onChange={e => updateMeasurementTable(table.id, e.target.value)}
                            className="bg-transparent border-none focus:ring-0 font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs p-0 w-full max-w-md hover:bg-slate-200/50 rounded px-2 py-1 transition-colors"
                            placeholder="Nome da Tabela (ex: Escala DC)..."
                          />
                          <div className="flex items-center gap-2">
                            <button onClick={() => addMeasurement(table.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[8px] uppercase tracking-tighter">Add Linha</button>
                            <button onClick={() => removeMeasurementTable(table.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
                            <thead>
                              <tr>
                                <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-2">Padrão / Nominal</th>
                                <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-2 text-center">Leitura 1</th>
                                <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-2 text-center">Leitura 2</th>
                                <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-2 text-center">Leitura 3</th>
                                <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-2 w-[50px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.measurements.map((med, idx) => (
                                <tr key={med.id} className="group">
                                  <td className="px-2">
                                    <input value={med.padrao} onChange={e => updateMeasurement(table.id, idx, 'padrao', e.target.value)} placeholder="0.000..." className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none shadow-sm" />
                                  </td>
                                  <td className="px-2">
                                    <input value={med.leitura1} onChange={e => updateMeasurement(table.id, idx, 'leitura1', e.target.value)} placeholder="0.000..." className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold text-center outline-none shadow-sm" />
                                  </td>
                                  <td className="px-2">
                                    <input value={med.leitura2} onChange={e => updateMeasurement(table.id, idx, 'leitura2', e.target.value)} placeholder="0.000..." className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold text-center outline-none shadow-sm" />
                                  </td>
                                  <td className="px-2">
                                    <input value={med.leitura3} onChange={e => updateMeasurement(table.id, idx, 'leitura3', e.target.value)} placeholder="0.000..." className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold text-center outline-none shadow-sm" />
                                  </td>
                                  <td className="px-2">
                                    <button onClick={() => removeMeasurement(table.id, idx)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                  </td>
                                </tr>
                              ))}
                              {table.measurements.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400 text-[10px] italic font-medium">Nenhuma medição nesta tabela.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Observações do Instrumento
                  </label>
                  <textarea value={editingItem.observacoes} onChange={e => setEditingItem({...editingItem, observacoes: e.target.value})} placeholder="Descreva observações específicas para este certificado ou instrumento..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-xs outline-none transition-all shadow-inner h-32 resize-none" />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
                <button onClick={() => setIsItemModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200">Voltar</button>
                <button onClick={handleSaveItem} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95">Confirmar Instrumento</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

