import React, { useState } from 'react';
import { ServiceOrder, Client, Quote, InstrumentStatus, StandardCustody, FleetLog, CustodyItem, DocumentTemplate, CertificateStatus } from '../types';
import { ClipboardList, LayoutGrid, List, FileText, Download, ArrowDownToLine, ArrowUpFromLine, Pencil, CheckCircle2, X, Activity, Key, FileCheck, CarFront, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import EmployeeSelect from './EmployeeSelect';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import { generateServiceOrderPdf, generateCautelaPdf } from '../utils/pdfGenerator';
import LogisticsProtocolModal from './LogisticsProtocolModal';

interface LogisticsModuleProps {
  serviceOrders: ServiceOrder[];
  clients: Client[];
  quotes: Quote[];
  documentTemplates?: DocumentTemplate[];
  onSaveServiceOrder: (so: ServiceOrder) => void;
  searchQuery?: string;
}

type ViewMode = 'grid' | 'list';
type TabMode = 'os' | 'standards' | 'fleet';

const statusConfig: Record<string, { color: string; label: string }> = {
  [InstrumentStatus.PENDING]: { color: 'bg-slate-100 text-slate-600', label: 'Pendente' },
  [InstrumentStatus.IN_PROGRESS]: { color: 'bg-amber-100 text-amber-700', label: 'Em Andamento' },
  [InstrumentStatus.CALIBRATED]: { color: 'bg-blue-100 text-blue-700', label: 'Calibrado' },
  [InstrumentStatus.COMPLETED]: { color: 'bg-indigo-100 text-indigo-700', label: 'Concluído' },
  [InstrumentStatus.DELIVERED]: { color: 'bg-emerald-100 text-emerald-700', label: 'Entregue' },
};


export default function LogisticsModule({ 
  serviceOrders = [], 
  clients = [], 
  quotes = [], 
  documentTemplates = [], 
  onSaveServiceOrder,
  searchQuery: searchQueryProp
}: LogisticsModuleProps) {
  const context = useData();
  const { standardCustodies = [], fleetLogs = [], standardInstruments = [], employees = [], vehicles = [], saveItem, deleteItem } = context || {};

  const [activeTab, setActiveTab] = useState<TabMode>('os');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('logisticsViewMode') as ViewMode) || 'list');
  const [statusFilter, setStatusFilter] = useState<'all' | InstrumentStatus>('all');
  const { searchQuery: searchQueryContext } = useData();
  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : searchQueryContext;

  // OS Edit State
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [editForm, setEditForm] = useState({
    entradaConfirmada: false,
    dataEntrada: '',
    saidaConfirmada: false,
    dataSaida: '',
    calibracaoConcluida: false,
    certificadosEnviados: false,
    dataCalibracaoFim: '',
    dataEnvioCertificado: '',
  });

  // Protocol Modal State
  const [protocolModal, setProtocolModal] = useState<{ 
    isOpen: boolean; 
    os: ServiceOrder | null; 
    type: 'retirada' | 'entrega' 
  }>({
    isOpen: false,
    os: null,
    type: 'retirada'
  });

  // Custody Edit State  
  const [editingCustody, setEditingCustody] = useState<StandardCustody | null>(null);

  // Fleet Edit State
  const [editingFleet, setEditingFleet] = useState<FleetLog | null>(null);

  // --- O.S. Logic ---
  const handleEditOS = (os: ServiceOrder) => {
    setEditingOS(os);
    setEditForm({
      entradaConfirmada: !!os.dataEntrada,
      dataEntrada: os.dataEntrada || '',
      saidaConfirmada: !!os.dataSaida,
      dataSaida: os.dataSaida || '',
      calibracaoConcluida: os.calibracaoConcluida || false,
      certificadosEnviados: os.certificadosEnviados || false,
      dataCalibracaoFim: os.dataCalibracaoFim || '',
      dataEnvioCertificado: os.dataEnvioCertificado || '',
    });
  };

  const handleSaveOS = async () => {
    if (editingOS) {
      let newStatus = InstrumentStatus.PENDING;
      if (editForm.calibracaoConcluida && editForm.certificadosEnviados && editForm.saidaConfirmada && editForm.dataSaida) {
        newStatus = InstrumentStatus.COMPLETED;
      } else if (editForm.saidaConfirmada && editForm.dataSaida) {
        newStatus = InstrumentStatus.DELIVERED;
      } else if (editForm.calibracaoConcluida) {
        newStatus = InstrumentStatus.CALIBRATED;
      } else if (editForm.entradaConfirmada && editForm.dataEntrada) {
        newStatus = InstrumentStatus.IN_PROGRESS;
      }
      const updatedOS: ServiceOrder = {
        ...editingOS!,
        dataEntrada: editForm.entradaConfirmada ? editForm.dataEntrada : '',
        dataSaida: editForm.saidaConfirmada ? editForm.dataSaida : '',
        calibracaoConcluida: editForm.calibracaoConcluida,
        certificadosEnviados: editForm.certificadosEnviados,
        dataCalibracaoFim: editForm.dataCalibracaoFim || undefined,
        dataEnvioCertificado: editForm.dataEnvioCertificado || undefined,
        statusServico: newStatus,
      };
      onSaveServiceOrder(updatedOS);
      toast.success('O.S. atualizada com sucesso!');
      setEditingOS(null);
    }
  };

  const handleOpenProtocol = (os: ServiceOrder, type: 'retirada' | 'entrega') => {
    setProtocolModal({ isOpen: true, os, type });
  };

  const filteredOS = (serviceOrders || []).filter(os => {
    const matchesStatus = statusFilter === 'all' || os.statusServico === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery) return true;
    const client = (clients || []).find(c => c.id === os.clienteId);
    const term = searchQuery.toLowerCase().trim();
    const digits = term.replace(/\D/g, '');
    
    // Textual
    const matchesText = (os.id || "").toLowerCase().includes(term) || 
                       (os.orcamentoId || "").toLowerCase().includes(term) || 
                       client?.razaoSocial?.toLowerCase().includes(term) ||
                       client?.cnpj?.toLowerCase().includes(term);
    
    if (matchesText) return true;

    // Numeric
    if (digits && digits.length >= 3) {
        const idDigits = (os.id || "").replace(/\D/g, '');
        const cnpjDigits = (client?.cnpj || "").replace(/\D/g, '');
        if (idDigits.includes(digits) || cnpjDigits.includes(digits)) return true;
    }

    return false;
  });
  const sortedOS = [...filteredOS].sort((a, b) => {
    // Attempt to extract numbers from the IDs for a true numerical sort
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB; // Ordem crescente (da menor para a maior)
  });

  // --- Cautelas Logic ---
  const newEmptyCustody = (): StandardCustody => {
    let maxId = 26000;
    standardCustodies.forEach(c => {
      const match = c.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxId) maxId = num;
      }
    });
    return {
      id: `${maxId + 1}`,
      items: [{ standardInstrumentId: '', quantidade: 1 }],
      origem: 'Laboratório Central',
      responsavelOrigem: '',
      destino: '',
      responsavelDestino: '',
      dataSaida: new Date().toISOString().split('T')[0],
      dataRetorno: '',
      responsavel: ''
    };
  };

  const handleEditCustody = (custody?: StandardCustody) => {
    setEditingCustody(custody ? { ...custody } : newEmptyCustody());
  };

  const updateCustodyItem = (index: number, field: keyof CustodyItem, value: string | number) => {
    setEditingCustody(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addCustodyItem = () => {
    setEditingCustody(prev => prev ? { ...prev, items: [...prev.items, { standardInstrumentId: '', quantidade: 1 }] } : prev);
  };

  const removeCustodyItem = (index: number) => {
    setEditingCustody(prev => prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev);
  };

  const handleSaveCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustody) {
      await saveItem('standard_custodies', editingCustody);
      setEditingCustody(null);
    }
  };

  const handleGenerateCautelaPdf = async (custody: StandardCustody) => {
    const empOrigem = employees.find(e => e.id === custody.responsavelOrigem);
    
    // Resolve responsavelDestino (could be ID or name)
    const empDestino = employees.find(e => e.id === custody.responsavelDestino);
    
    const resolvedItems = (custody.items || []).map(it => {
      const st = standardInstruments.find(s => s.id === it.standardInstrumentId);
      return { nome: st?.nome || it.standardInstrumentId, identificacao: st?.identificacao || '', quantidade: it.quantidade };
    });
    
    const respOrigemName = empOrigem?.nome || custody.responsavelOrigem;
    const respDestinoName = empDestino?.nome || custody.responsavelDestino;
    
    const promise = generateCautelaPdf(custody, resolvedItems, respOrigemName, respDestinoName, documentTemplates);
    toast.promise(promise, {
      loading: 'Gerando Termo de Cautela...',
      success: 'Termo gerado!',
      error: 'Erro ao gerar PDF.'
    });
    await promise;
  };

  // --- Frota Logic ---
  const handleEditFleet = (fleet?: FleetLog) => {
    if (fleet) {
      setEditingFleet({ ...fleet });
    } else {
      let maxId = 26000;
      fleetLogs.forEach(f => {
        const match = f.id?.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxId) maxId = num;
        }
      });
      setEditingFleet({
        id: `${maxId + 1}`,
        motorista: '',
        veiculoId: '',
        trajetoDescricao: '',
        dataSaida: new Date().toISOString().split('T')[0],
        dataRetorno: '',
        kmInicial: 0,
        kmFinal: 0
      });
    }
  };

  const handleSaveFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFleet) {
      await saveItem('fleet_logs', editingFleet);
      setEditingFleet(null);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Gestão Operacional</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Logística</h2>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
          {[
            { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList },
            { id: 'standards', label: 'Cautelas', icon: Key },
            { id: 'fleet', label: 'Controle de Frota', icon: CarFront }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabMode)}
                className={`flex items-center px-6 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full max-w-full min-w-0 overflow-hidden">

          {/* TAB 1: ORDENS DE SERVIÇO */}
          {activeTab === 'os' && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden min-h-[400px]">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ordens de Serviço</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Gestão de fluxo de entrada e saída de instrumentos.</p>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-800 ml-4">
                      <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Todas
                      </button>
                      <button 
                        onClick={() => setStatusFilter(InstrumentStatus.PENDING)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${statusFilter === InstrumentStatus.PENDING ? 'bg-white dark:bg-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Pendentes
                      </button>
                      <button 
                        onClick={() => setStatusFilter(InstrumentStatus.IN_PROGRESS)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${statusFilter === InstrumentStatus.IN_PROGRESS ? 'bg-white dark:bg-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Em Andamento
                      </button>
                      <button 
                        onClick={() => setStatusFilter(InstrumentStatus.CALIBRATED)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${statusFilter === InstrumentStatus.CALIBRATED ? 'bg-white dark:bg-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Calibrado
                      </button>
                      <button 
                        onClick={() => setStatusFilter(InstrumentStatus.DELIVERED)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${statusFilter === InstrumentStatus.DELIVERED ? 'bg-white dark:bg-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Entregue
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {searchQuery && (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-indigo-100">
                      {filteredOS.length} resultado(s)
                    </span>
                  )}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="rectilinear-container custom-scrollbar shadow-sm">
                  <table className="rectilinear-table">
                    <thead>
                      <tr>
                        <th className="rectilinear-th col-sm text-center pl-8">O.S. (ID)</th>
                        <th className="rectilinear-th col-lg text-left">Cliente Remetente</th>
                        <th className="rectilinear-th col-md text-center">Rápido / Prioritário</th>
                        <th className="rectilinear-th col-md text-center">Status Logístico</th>
                        <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {sortedOS.map(os => {
                        const client = clients.find(c => c.id === os.clienteId);
                        const quote = quotes.find(q => q.id === os.orcamentoId);
                        const sc = statusConfig[os.statusServico] || { color: 'bg-slate-100 text-slate-600', label: os.statusServico };
                        return (
                          <tr key={os.id} className="rectilinear-tr group">
                            <td className="rectilinear-td text-center pl-8 font-black text-slate-900 dark:text-white uppercase tabular-nums">
                              {os.id}
                            </td>
                            <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate" title={client?.razaoSocial}>
                              {client?.razaoSocial || 'Cliente N/A'}
                            </td>
                            <td className="rectilinear-td text-center font-mono text-[10px] text-slate-500 uppercase tracking-tighter">
                              {os.dataEntrada ? formatDate(os.dataEntrada) : '—'}
                            </td>
                            <td className="rectilinear-td text-center">
                              <div className="flex justify-center">
                                <span className={`inline-flex items-center text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${sc.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-')}`}>
                                  {sc.label}
                                </span>
                              </div>
                            </td>
                            <td className="rectilinear-td text-center pr-8">
                              <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditOS(os)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Gerenciar"><Activity className="w-4 h-4" /></button>
                                <button onClick={async () => {
                                  const promise = generateServiceOrderPdf(os, client, quote, documentTemplates);
                                  toast.promise(promise, {
                                    loading: 'Gerando PDF da O.S...',
                                    success: 'O.S. gerada!',
                                    error: 'Erro no PDF.'
                                  });
                                  await promise;
                                }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="PDF O.S."><FileText className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenProtocol(os, 'retirada')} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-amber-900/20 rounded-lg shadow-sm border border-transparent hover:border-amber-100 transition-all"><ArrowDownToLine className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenProtocol(os, 'entrega')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-emerald-900/20 rounded-lg shadow-sm border border-transparent hover:border-emerald-100 transition-all"><ArrowUpFromLine className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-8">
                  {sortedOS.map(os => {
                    const client = clients.find(c => c.id === os.clienteId);
                    const sc = statusConfig[os.statusServico] || { color: 'bg-slate-100 text-slate-600', label: os.statusServico };
                    return (
                      <div key={os.id} onDoubleClick={() => handleEditOS(os)} className="rectilinear-card group flex flex-col justify-between h-full cursor-pointer hover:border-indigo-200">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{os.id}</span>
                            <span className={`inline-flex items-center text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${sc.color}`}>
                              {sc.label}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white truncate mb-2" title={client?.razaoSocial}>
                            {client?.razaoSocial || 'N/A'}
                          </h4>
                          <div className="space-y-1 mb-6">
                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Orç: {os.orcamentoId}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Entrada: {os.dataEntrada ? formatDate(os.dataEntrada) : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                          <button onClick={() => handleEditOS(os)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Gerenciar</button>
                          <div className="flex gap-1">
                            <button onClick={async (e) => { 
                             e.stopPropagation(); 
                             const promise = generateServiceOrderPdf(os, client, quotes.find(q => q.id === os.orcamentoId), documentTemplates); 
                             toast.promise(promise, {
                                loading: 'Gerando PDF...',
                                success: 'PDF gerado!',
                                error: 'Erro no PDF.'
                             });
                             await promise;
                           }} className="p-1.5 text-slate-400 hover:text-indigo-600"><FileText className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAUTELAS DE PADRÕES */}
          {activeTab === 'standards' && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Custódia de Padrões</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Controle de localização de ativos fixos e portáteis.</p>
                </div>
                <button onClick={() => handleEditCustody()} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Nova Cautela
                </button>
              </div>
              <div className="rectilinear-container custom-scrollbar shadow-sm overflow-x-hidden">
                <table className="rectilinear-table !min-w-0 !table-auto w-full">
                  <thead>
                    <tr>
                      <th className="rectilinear-th w-[100px] text-center pl-8">ID Cautela</th>
                      <th className="rectilinear-th text-left">Destino / Finalidade</th>
                      <th className="rectilinear-th w-[20%] text-left">Padrão Mobilizado</th>
                      <th className="rectilinear-th w-[150px] text-center">Cronograma S/R</th>
                      <th className="rectilinear-th w-[150px] text-center">Responsável</th>
                      <th className="rectilinear-th w-[100px] text-center pr-8">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {standardCustodies.map(cust => {
                      const emp = employees.find(e => e.id === cust.responsavel);
                      const resolvedItems = (cust.items || []).map(it => {
                        const st = standardInstruments.find(s => s.id === it.standardInstrumentId);
                        return { nome: st?.nome || it.standardInstrumentId, identificacao: st?.identificacao || '', quantidade: it.quantidade };
                      });
                      const itemsSummary = resolvedItems.map(it => `${it.nome} (x${it.quantidade})`).join(', ');

                      return (
                         <tr key={cust.id} className="rectilinear-tr group">
                           <td className="rectilinear-td text-center pl-8 font-black text-slate-900 dark:text-white uppercase">{cust.id}</td>
                           <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate" title={cust.destino}>
                             {cust.destino || '—'}
                           </td>
                           <td className="rectilinear-td text-left text-xs font-medium text-indigo-600 truncate" title={itemsSummary}>
                             {itemsSummary}
                           </td>
                           <td className="rectilinear-td text-center text-xs text-slate-500 font-medium">
                             {formatDate(cust.dataSaida)} <span className="opacity-30">/</span> {cust.dataRetorno ? formatDate(cust.dataRetorno) : <span className="text-amber-500 font-black uppercase text-[9px]">Aberto</span>}
                           </td>
                           <td className="rectilinear-td text-center text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                             {emp?.nome || cust.responsavel || '—'}
                           </td>
                            <td className="rectilinear-td text-center pr-8">
                                <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleEditCustody(cust)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"><Pencil className="w-4 h-4" /></button>
                               <button onClick={() => handleGenerateCautelaPdf(cust)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Gerar Cautela"><Download className="w-4 h-4" /></button>
                               <button onClick={() => deleteItem('standard_custodies', cust.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"><Trash2 className="w-4 h-4" /></button>
                             </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
 
           {/* TAB 3: CONTROLE DE FROTA */}
           {activeTab === 'fleet' && (
             <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Controle de Frota</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Histórico de deslocamentos e uso de veículos.</p>
                  </div>
                 <button onClick={() => handleEditFleet()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2">
                   <CarFront className="w-5 h-5" /> Registrar Saída
                 </button>
               </div>
               <div className="rectilinear-container custom-scrollbar shadow-sm overflow-x-hidden">
                 <table className="rectilinear-table !min-w-0 !table-auto w-full">
                   <thead>
                     <tr>
                        <th className="rectilinear-th w-[100px] text-center pl-8">ID Viagem</th>
                        <th className="rectilinear-th text-left">Motorista</th>
                        <th className="rectilinear-th w-[25%] text-left">Veículo / Placa</th>
                        <th className="rectilinear-th w-[180px] text-center">Saída / Retorno</th>
                        <th className="rectilinear-th w-[150px] text-center">Trajeto</th>
                        <th className="rectilinear-th w-[100px] text-center pr-8">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                     {fleetLogs.map(fleet => {
                       const emp = employees.find(e => e.id === fleet.motorista);
                       const veh = vehicles.find(v => v.id === fleet.veiculoId);
                       const diff = (fleet.kmFinal || 0) > fleet.kmInicial ? ((fleet.kmFinal || 0) - fleet.kmInicial).toFixed(1) : 'Em trâns.';
                       return (
                         <tr key={fleet.id} className="rectilinear-tr group">
                            <td className="rectilinear-td text-center pl-8 font-black text-slate-900 dark:text-white uppercase tabular-nums">{fleet.id}</td>
                            <td className="rectilinear-td text-left text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{emp?.nome || fleet.motorista || '—'}</td>
                            <td className="rectilinear-td text-center truncate font-medium text-slate-600 dark:text-slate-400">
                              {veh ? `${veh.modelo} (${veh.placa})` : '—'}
                            </td>
                            <td className="rectilinear-td text-center text-xs text-slate-500 font-medium tabular-nums">
                              {formatDate(fleet.dataSaida)} / {fleet.dataRetorno ? formatDate(fleet.dataRetorno) : <span className="text-indigo-500 font-black animate-pulse">TRÂNSITO</span>}
                            </td>
                            <td className="rectilinear-td text-center font-black text-indigo-600 text-xs tabular-nums">{diff} km</td>
                            <td className="rectilinear-td text-left text-sm text-slate-500 italic truncate" title={fleet.trajetoDescricao}>{fleet.trajetoDescricao || '—'}</td>
                            <td className="rectilinear-td text-center pr-8">
                              <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditFleet(fleet)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => deleteItem('fleet_logs', fleet.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* MODALS SECTION */}
      
      {/* Edit OS Modal */}
      <AnimatePresence>
        {editingOS && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingOS(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-12 w-full max-w-[95%] md:max-w-xl border border-slate-100 dark:border-slate-800 relative flex flex-col max-h-[95vh] overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500 shrink-0" />
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div><h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Fluxo de Trabalho</h3><p className="text-indigo-600 font-black text-xs mt-1 uppercase tracking-widest">{editingOS.id}</p></div>
                <button onClick={() => setEditingOS(null)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center gap-4 border border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Abertura Automática</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">{editingOS.dataEmissao ? formatDate(editingOS.dataEmissao) : (editingOS.dataEntrada ? formatDate(editingOS.dataEntrada) : 'Sincronizando...')}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* 1. Recebimento */}
                  <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${editForm.entradaConfirmada ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800/50 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${editForm.entradaConfirmada ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <ClipboardList className={`w-6 h-6 ${editForm.entradaConfirmada ? 'text-sky-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-black uppercase tracking-tight ${editForm.entradaConfirmada ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>1. Recebimento</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editForm.entradaConfirmada ? 'Instrumento Recebido' : 'Aguardando Chegada'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !editForm.entradaConfirmada;
                          setEditForm(p => ({ 
                            ...p, 
                            entradaConfirmada: nextVal,
                            dataEntrada: (nextVal && !p.dataEntrada) ? new Date().toISOString().split('T')[0] : p.dataEntrada
                          }));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${editForm.entradaConfirmada ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${editForm.entradaConfirmada ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    {editForm.entradaConfirmada && (
                      <div className="mt-4 pt-4 border-t border-sky-200/50 dark:border-sky-800/30 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-sky-600/60 dark:text-sky-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Data de Entrada</label>
                        <input 
                          type="date" 
                          value={editForm.dataEntrada} 
                          onChange={e => setEditForm(p => ({ ...p, dataEntrada: e.target.value }))} 
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-sky-100 dark:border-sky-900/50 focus:border-sky-500 rounded-2xl font-black text-sm outline-none transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Calibração */}
                  <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${editForm.calibracaoConcluida ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${editForm.calibracaoConcluida ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <Activity className={`w-6 h-6 ${editForm.calibracaoConcluida ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-black uppercase tracking-tight ${editForm.calibracaoConcluida ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>2. Calibração</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editForm.calibracaoConcluida ? 'Calibração Concluída' : 'Aguardando Técnico'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !editForm.calibracaoConcluida;
                          setEditForm(p => ({ 
                            ...p, 
                            calibracaoConcluida: nextVal,
                            dataCalibracaoFim: (nextVal && !p.dataCalibracaoFim) ? new Date().toISOString().split('T')[0] : p.dataCalibracaoFim
                          }));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${editForm.calibracaoConcluida ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${editForm.calibracaoConcluida ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    {editForm.calibracaoConcluida && (
                      <div className="mt-4 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/30 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-indigo-600/60 dark:text-indigo-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Data da Calibração</label>
                        <input 
                          type="date" 
                          value={editForm.dataCalibracaoFim} 
                          onChange={e => setEditForm(p => ({ ...p, dataCalibracaoFim: e.target.value }))} 
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/50 focus:border-indigo-500 rounded-2xl font-black text-sm outline-none transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Certificados */}
                  <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${editForm.certificadosEnviados ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${editForm.certificadosEnviados ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <FileText className={`w-6 h-6 ${editForm.certificadosEnviados ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-black uppercase tracking-tight ${editForm.certificadosEnviados ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>3. Certificados</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editForm.certificadosEnviados ? 'Enviados ao Cliente' : 'Pendente Revisão'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !editForm.certificadosEnviados;
                          setEditForm(p => ({ 
                            ...p, 
                            certificadosEnviados: nextVal,
                            dataEnvioCertificado: (nextVal && !p.dataEnvioCertificado) ? new Date().toISOString().split('T')[0] : p.dataEnvioCertificado
                          }));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${editForm.certificadosEnviados ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${editForm.certificadosEnviados ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    {editForm.certificadosEnviados && (
                      <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-emerald-600/60 dark:text-emerald-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Data de Envio</label>
                        <input 
                          type="date" 
                          value={editForm.dataEnvioCertificado} 
                          onChange={e => setEditForm(p => ({ ...p, dataEnvioCertificado: e.target.value }))} 
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/50 focus:border-emerald-500 rounded-2xl font-black text-sm outline-none transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Entrega */}
                  <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${editForm.saidaConfirmada ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${editForm.saidaConfirmada ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <CarFront className={`w-6 h-6 ${editForm.saidaConfirmada ? 'text-purple-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-black uppercase tracking-tight ${editForm.saidaConfirmada ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>4. Entrega</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editForm.saidaConfirmada ? 'Equipamento Retirado' : 'Aguardando Saída'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !editForm.saidaConfirmada;
                          setEditForm(p => ({ 
                            ...p, 
                            saidaConfirmada: nextVal,
                            dataSaida: (nextVal && !p.dataSaida) ? new Date().toISOString().split('T')[0] : p.dataSaida
                          }));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${editForm.saidaConfirmada ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${editForm.saidaConfirmada ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    {editForm.saidaConfirmada && (
                      <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-800/30 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-purple-600/60 dark:text-purple-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Data de Saída</label>
                        <input 
                          type="date" 
                          value={editForm.dataSaida} 
                          onChange={e => setEditForm(p => ({ ...p, dataSaida: e.target.value }))} 
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900/50 focus:border-purple-500 rounded-2xl font-black text-sm outline-none transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 flex gap-4">
                  <button onClick={() => setEditingOS(null)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">Cancelar</button>
                  <button onClick={handleSaveOS} className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95">Gravar Alterações</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Custody Modal */}
      <AnimatePresence>
        {editingCustody && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingCustody(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-12 w-full max-w-[95%] md:max-w-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Formalizar Cautela</h3>
              <button onClick={() => setEditingCustody(null)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveCustody} className="space-y-8 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Origem</label>
                    <input required value={editingCustody.origem} onChange={e => setEditingCustody(p => ({...p!, origem: e.target.value}))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <EmployeeSelect label="Responsável Origem" value={editingCustody.responsavelOrigem} onChange={val => setEditingCustody(p => ({...p!, responsavelOrigem: val}))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Destino</label>
                    <input required value={editingCustody.destino} onChange={e => setEditingCustody(p => ({...p!, destino: e.target.value}))} placeholder="Local ou Cliente..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Responsável Destino</label>
                    <input 
                      list="employee-list"
                      required 
                      value={editingCustody.responsavelDestino} 
                      onChange={e => setEditingCustody(p => ({...p!, responsavelDestino: e.target.value}))} 
                      placeholder="Selecione ou digite o nome..."
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner"
                    />
                    <datalist id="employee-list">
                      {employees.map(e => (
                        <option key={e.id} value={e.nome} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instrumentos Padrões</label>
                    <button type="button" onClick={addCustodyItem} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-all uppercase tracking-widest"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>
                  <div className="space-y-3">
                    {editingCustody.items.map((item, index) => (
                        <div key={index} className="flex gap-3 items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <select required value={item.standardInstrumentId} onChange={e => updateCustodyItem(index, 'standardInstrumentId', e.target.value)} className="flex-1 bg-transparent px-4 py-2.5 font-black text-sm outline-none">
                                <option value="">Selecione o instrumento...</option>
                                {standardInstruments.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.identificacao})</option>)}
                            </select>
                            <input type="number" min="1" value={item.quantidade} onChange={e => updateCustodyItem(index, 'quantidade', Number(e.target.value))} className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-2 px-3 text-center font-black text-sm focus:ring-2 focus:ring-indigo-300" />
                            {editingCustody.items.length > 1 && (
                                <button type="button" onClick={() => removeCustodyItem(index)} className="p-2.5 text-rose-400 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                            )}
                        </div>
                    ))}
                  </div>
                </div>

                <EmployeeSelect label="Responsável pela Saída (Transportador)" value={editingCustody.responsavel} onChange={val => setEditingCustody(p => ({...p!, responsavel: val}))} />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Dta Saída</label>
                    <input type="date" required value={editingCustody.dataSaida} onChange={e => setEditingCustody(p => ({...p!, dataSaida: e.target.value}))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-black text-sm shadow-inner outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Retorno Previsto</label>
                    <input type="date" value={editingCustody.dataRetorno || ''} onChange={e => setEditingCustody(p => ({...p!, dataRetorno: e.target.value}))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-black text-sm shadow-inner outline-none transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/30 transition-all active:scale-95">Gerar e Salvar Registro</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Fleet Modal */}
      <AnimatePresence>
        {editingFleet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingFleet(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-10 w-full max-w-md border border-slate-100 dark:border-slate-800 relative flex flex-col max-h-[92vh]">
               <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none -z-10"><CarFront className="w-24 h-24" /></div>
              <div className="flex items-center justify-between mb-8 shrink-0">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestão de Bordo</h3>
                <button onClick={() => setEditingFleet(null)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveFleet} className="space-y-6 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-2">
                <EmployeeSelect label="Motorista do Período" value={editingFleet.motorista} onChange={val => setEditingFleet(p => ({...p!, motorista: val}))} />

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Veículo Mobilizado</label>
                  <select value={editingFleet.veiculoId} onChange={e => setEditingFleet(p => ({...p!, veiculoId: e.target.value}))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] font-black text-sm outline-none transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="">A pé / Externo / Particular...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.modelo} — {v.placa}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Itinerário / Ocorrências</label>
                  <textarea value={editingFleet.trajetoDescricao} onChange={e => setEditingFleet(p => ({...p!, trajetoDescricao: e.target.value}))} rows={3} placeholder="Descreva o trajeto e qualquer intercorrência..." className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-[2.5rem] font-bold text-sm outline-none shadow-inner resize-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Km Inicial</label>
                    <input type="number" min="0" step="0.1" required value={editingFleet.kmInicial} onChange={e => setEditingFleet(p => ({...p!, kmInicial: Number(e.target.value)}))} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-3xl font-black text-center text-lg shadow-inner outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Km Final</label>
                    <input type="number" min="0" step="0.1" value={editingFleet.kmFinal || ''} onChange={e => setEditingFleet(p => ({...p!, kmFinal: Number(e.target.value)}))} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-3xl font-black text-center text-lg shadow-inner outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Partida</label>
                    <input type="date" required value={editingFleet.dataSaida} onChange={e => setEditingFleet(p => ({...p!, dataSaida: e.target.value}))} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] font-black text-sm outline-none shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Chegada</label>
                    <input type="date" value={editingFleet.dataRetorno || ''} onChange={e => setEditingFleet(p => ({...p!, dataRetorno: e.target.value}))} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] font-black text-sm outline-none shadow-sm transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-slate-900 dark:bg-emerald-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black dark:hover:bg-emerald-500 transition-all active:scale-95">Salvar Registro de Viagem</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logistics Protocol Modal */}
      {protocolModal.os && (
        <LogisticsProtocolModal
          isOpen={protocolModal.isOpen}
          onClose={() => setProtocolModal(p => ({ ...p, isOpen: false }))}
          os={protocolModal.os}
          client={clients.find(c => c.id === protocolModal.os?.clienteId)}
          quote={quotes.find(q => q.id === protocolModal.os?.orcamentoId)}
          type={protocolModal.type}
          documentTemplates={documentTemplates}
          onStatusUpdate={() => {
            // Updated by internal logic 
          }}
        />
      )}
    </div>
  );
}
