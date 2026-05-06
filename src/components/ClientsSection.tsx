import React, { useState } from 'react';
import { Users, ShieldCheck, Trash2, Search, Plus, Eye, Pencil, LayoutGrid, List, FileText, ClipboardList, RefreshCw } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Client, ClientStatus, Quote, ServiceOrder, QuoteStatus, CertificateStatus, InstrumentStatus } from '../types';
import ClientEditModal from './ClientEditModal';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientsSectionProps {
    clients: Client[];
    quotes: Quote[];
    serviceOrders: ServiceOrder[];
    onAddClient: () => void;
    onSaveClient: (client: Client) => void;
    onDeleteClient: (id: string) => void;
    onUpdateStatus: (id: string) => void;
    documentTemplates?: any[];
    searchQuery?: string;
}

const ClientsSection: React.FC<ClientsSectionProps> = ({
    clients,
    quotes,
    serviceOrders,
    onAddClient,
    onSaveClient,
    onDeleteClient,
    onUpdateStatus,
    documentTemplates = [],
    searchQuery
}) => {
    const { pagination } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);
    const [viewModalTab, setViewModalTab] = useState<'details' | 'quotes' | 'services'>('details');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
        (localStorage.getItem('clientsViewMode') as 'grid' | 'list') || 'grid'
    );

    const toggleViewMode = () => {
        const next = viewMode === 'grid' ? 'list' : 'grid';
        setViewMode(next);
        localStorage.setItem('clientsViewMode', next);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleAddNewClient = () => {
        // Encontra o próximo ID sequencial (ignorando timestamps de Date.now())
        const numericIds = (clients || [])
            .map(c => {
                // Remove qualquer prefixo não numérico
                const numericPart = c.id.replace(/\D/g, '');
                return numericPart.length > 0 && numericPart.length < 10 ? parseInt(numericPart, 10) : null;
            })
            .filter((id): id is number => id !== null);

        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        const nextId = (maxId + 1).toString().padStart(4, '0');

        const newClient: Client = {
            id: nextId,
            razaoSocial: '',
            cnpj: '',
            enderecoPrincipal: '',
            enderecoColeta: '',
            solicitanteNome: '',
            solicitanteEmail: '',
            solicitanteContato: '',
            emailFinanceiro: '',
            emailCertificados: '',
            retencaoImpostoFonte: false,
            status: ClientStatus.NOT_UPDATED,
            restricaoPagamento: false,
            funcionarioCadastro: 'Sistema',
        };
        setEditingClient(newClient);
        setIsModalOpen(true);
    };


    const filteredClients = (clients || []).filter(client => {
        if (!searchQuery) return true;
        const term = searchQuery.toLowerCase().trim();
        const digits = term.replace(/\D/g, '');

        const matchesText = (client.razaoSocial || "").toLowerCase().includes(term) ||
                           (client.cnpj || "").includes(term);

        if (matchesText) return true;

        if (digits && digits.length >= 3) {
            const cnpjDigits = (client.cnpj || "").replace(/\D/g, '');
            if (cnpjDigits.includes(digits)) return true;
        }

        return false;
    });

    const sortedClients = [...filteredClients].sort((a, b) => (a.razaoSocial || '').localeCompare(b.razaoSocial || ''));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    {searchQuery && (
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-indigo-100">
                             {filteredClients.length} registros
                        </span>
                    )}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => { setViewMode('list'); localStorage.setItem('clientsViewMode', 'list'); }}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => { setViewMode('grid'); localStorage.setItem('clientsViewMode', 'grid'); }}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleAddNewClient}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center group active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="mr-2 w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* View modal (read-only) */}
            <AnimatePresence>
                {viewingClient && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setViewingClient(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white truncate pr-4">{viewingClient.razaoSocial}</h3>
                                <button
                                    onClick={() => setViewingClient(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all flex-shrink-0"
                                >✕</button>
                            </div>

                            <div className="flex space-x-2 border-b border-slate-100 dark:border-slate-800 mb-6 flex-shrink-0 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'details', label: 'Dados Básicos' },
                                    { id: 'quotes', label: 'Orçamentos' },
                                    { id: 'services', label: 'Serviços' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setViewModalTab(tab.id as 'details'|'quotes'|'services')}
                                        className={`px-4 py-2 font-black text-xs uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${viewModalTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-y-auto space-y-4 pr-2 scrollbar-hide flex-1 min-h-[300px]">
                                {viewModalTab === 'details' && (
                                    <div className="space-y-4 text-sm">
                                        {[
                                            { label: 'CNPJ', value: viewingClient.cnpj },
                                            { label: 'Insc. Municipal', value: viewingClient.inscricaoMunicipal },
                                            { label: 'Insc. Estadual', value: viewingClient.inscricaoEstadual },
                                            { label: 'Endereço Principal', value: viewingClient.enderecoPrincipal },
                                            { label: 'Endereço de Coleta', value: viewingClient.enderecoColeta },
                                            { label: 'Solicitante', value: viewingClient.solicitanteNome },
                                            { label: 'E-mail', value: viewingClient.solicitanteEmail },
                                            { label: 'Contato', value: viewingClient.solicitanteContato },
                                            { label: 'E-mail Financeiro', value: viewingClient.emailFinanceiro },
                                            { label: 'Retenção de Imposto', value: viewingClient.retencaoImpostoFonte ? 'Sim' : 'Não' },
                                            { label: 'Status', value: viewingClient.status },
                                        ].map(row => (
                                            <div key={row.label} className="flex flex-col sm:flex-row justify-between sm:gap-4 border-b border-slate-50 dark:border-slate-800 pb-3 pt-1">
                                                <span className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-1 sm:mb-0 w-full sm:w-40 flex-shrink-0">{row.label}</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-medium sm:text-right break-words">{row.value || <span className="opacity-50 italic">Não informado</span>}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {viewModalTab === 'quotes' && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Acumulado</span>
                                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                                {quotes.filter(q => q.clienteId === viewingClient.id).length}
                                            </span>
                                        </div>
                                        {quotes.filter(q => q.clienteId === viewingClient.id).length === 0 ? (
                                            <p className="text-xs text-slate-400 italic text-center py-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">Nenhum orçamento emitido para este cliente.</p>
                                        ) : (
                                            quotes.filter(q => q.clienteId === viewingClient.id)
                                                .sort((a, b) => b.id.localeCompare(a.id))
                                                .map(q => (
                                                    <div key={q.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors shadow-sm">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{q.id}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{new Date(q.dataEmissao).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                                                            q.status === QuoteStatus.APPROVED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                                                            q.status === QuoteStatus.REJECTED ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        }`}>
                                                            {q.status}
                                                        </span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                )}

                                {viewModalTab === 'services' && (
                                    <div className="space-y-4">
                                        {serviceOrders.filter(so => so.clienteId === viewingClient.id).length === 0 ? (
                                            <p className="text-xs text-slate-400 italic text-center py-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">Nenhum serviço realizado para este cliente.</p>
                                        ) : (
                                            serviceOrders.filter(so => so.clienteId === viewingClient.id)
                                                .sort((a, b) => b.id.localeCompare(a.id))
                                                .map(so => (
                                                    <div key={so.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors shadow-sm">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-black text-slate-900 dark:text-white flex items-center">
                                                                <ClipboardList className="w-4 h-4 mr-2 text-indigo-500" />
                                                                {so.id}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold tracking-wider">{so.dataEntrada}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                                so.statusServico === InstrumentStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-700 dark:bg-slate-700'
                                                            }`}>
                                                                OS: {so.statusServico}
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                                so.statusCertificado === CertificateStatus.APPROVED ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' : 'border border-slate-200 dark:border-slate-700 text-slate-500'
                                                            }`}>
                                                                Cert: {so.statusCertificado}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {sortedClients.length > 0 ? (
                viewMode === 'list' ? (
                    <div className="rectilinear-container custom-scrollbar shadow-sm">
                        <table className="rectilinear-table">
                            <thead>
                                <tr className="rectilinear-tr">
                                    <th className="rectilinear-th col-sm text-center pl-8">ID</th>
                                    <th className="rectilinear-th col-lg text-left">Razão Social</th>
                                    <th className="rectilinear-th col-md text-center">CNPJ / Documento</th>
                                    <th className="rectilinear-th col-md text-center">Solicitante Primário</th>
                                    <th className="rectilinear-th col-sm text-center">Status VLD</th>
                                    <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {sortedClients.map((client) => (
                                    <tr key={client.id} className="rectilinear-tr group">
                                        <td className="rectilinear-td text-center pl-8 font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs tabular-nums">
                                            {client.id}
                                        </td>
                                        <td className="rectilinear-td text-left font-black text-slate-900 dark:text-white truncate" title={client.razaoSocial}>
                                            {client.razaoSocial}
                                        </td>
                                        <td className="rectilinear-td text-center text-[11px] text-slate-500 dark:text-slate-400 font-black tracking-widest tabular-nums">
                                            {client.cnpj}
                                        </td>
                                        <td className="rectilinear-td text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {client.solicitanteNome || <span className="opacity-30 italic">Não inf.</span>}
                                        </td>
                                        <td className="rectilinear-td text-center">
                                            <div className="flex items-center justify-center">
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${client.status === ClientStatus.UPDATED
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800/50'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-800/50'
                                                    }`}>{client.status}</span>
                                            </div>
                                        </td>
                                        <td className="rectilinear-td pr-8">
                                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {client.status === ClientStatus.NOT_UPDATED && (
                                                    <button 
                                                        onClick={() => onUpdateStatus(client.id)} 
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" 
                                                        title="Validar Cadastro (Marcar como Atualizado)"
                                                    >
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => setViewingClient(client)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Visualizar"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => onDeleteClient(client.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rectilinear-grid">
                        {sortedClients.map(client => (
                            <div key={client.id} className="rectilinear-card group flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${client.status === ClientStatus.UPDATED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                #{client.id}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${client.status === ClientStatus.UPDATED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {client.status}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white mb-2 line-clamp-2" title={client.razaoSocial}>
                                        {client.razaoSocial}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">{client.cnpj}</p>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                            <span className="font-bold truncate">{client.solicitanteNome || 'Solicitante não informado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            <span className="truncate">{client.solicitanteEmail || 'E-mail não informado'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                                    <button onClick={() => setViewingClient(client)} className="flex-1 py-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-all">Perfil</button>
                                    {client.status === ClientStatus.NOT_UPDATED && (
                                        <button onClick={() => onUpdateStatus(client.id)} className="p-2 text-slate-400 hover:text-emerald-600 transition-all" title="Validar Cadastro">
                                            <ShieldCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-amber-600 transition-all"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteClient(client.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800"
                >
                    <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm">
                        Não encontramos nenhum cliente com os termos pesquisados. Tente outro termo ou cadastre um novo.
                    </p>
                </motion.div>
            )}

            {pagination.clients.hasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={pagination.clients.loadMore}
                        disabled={pagination.clients.loading}
                        className="flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        {pagination.clients.loading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" />
                        )}
                        {pagination.clients.loading ? 'Carregando...' : 'Ver Mais Clientes'}
                    </button>
                </div>
            )}

            <ClientEditModal
                client={editingClient}
                isOpen={isModalOpen}
                existingClients={clients}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingClient(null);
                }}
                onSave={(updatedClient) => {
                    onSaveClient(updatedClient);
                    setIsModalOpen(false);
                    setEditingClient(null);
                }}
                onDelete={(id) => {
                    onDeleteClient(id);
                    setIsModalOpen(false);
                    setEditingClient(null);
                }}
            />
        </div>
    );
};

export default ClientsSection;
