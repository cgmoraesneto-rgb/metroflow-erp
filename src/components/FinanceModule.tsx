import { useState, useMemo } from 'react';
import { FinancialControl, FinancialExpense, ExpenseCategory, PaymentStatus, Quote, ServiceOrder, Client, PaymentMethod, InstrumentStatus, Bank, InventoryItem, InventoryMovement, InventoryMovementType, StandardInstrument } from '../types';
import InvoiceModal from './InvoiceModal';
import ExpenseModal from './ExpenseModal';
import { Plus, Edit2, Trash2, Receipt, CircleDollarSign, Download, CheckCircle, Clock, DollarSign, Filter, Tag, Package, ArrowDownCircle, ArrowUpCircle, History, X, Link, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../utils/formatters';

interface FinanceModuleProps {
  quotes: Quote[];
  serviceOrders: ServiceOrder[];
  clients: Client[];
  financialControls: FinancialControl[];
  financialExpenses: FinancialExpense[];
  paymentMethods: PaymentMethod[];
  banks: Bank[];
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  standardInstruments: StandardInstrument[];
  onFinancialControlsChange: (financials: FinancialControl[]) => void;
  onSaveFinancialControl: (fc: FinancialControl) => void;
  onSavePaymentMethod: (pm: PaymentMethod) => void;
  onDeletePaymentMethod: (id: string) => void;
  onDeleteFinancialControl: (id: string) => void;
  onSaveExpense: (expense: Partial<FinancialExpense>) => void;
  onDeleteExpense: (id: string) => void;
  onSaveQuote?: (quote: Quote) => void;
  onSaveInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (id: string) => void;
  onSaveInventoryMovement: (mov: InventoryMovement) => void;
  searchQuery?: string;
}

export default function FinanceModule({
  quotes,
  serviceOrders,
  clients,
  financialControls,
  financialExpenses,
  paymentMethods,
  banks,
  inventoryItems,
  inventoryMovements,
  standardInstruments,
  onFinancialControlsChange,
  onSaveFinancialControl,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  onDeleteFinancialControl,
  onSaveExpense,
  onDeleteExpense,
  onSaveQuote,
  onSaveInventoryItem,
  onDeleteInventoryItem,
  onSaveInventoryMovement,
  searchQuery
}: FinanceModuleProps) {

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'services' | 'billing' | 'expenses' | 'commissions' | 'inventory'>('dashboard');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [invoiceData, setInvoiceData] = useState<Partial<FinancialControl> | null>(null);
  const [expenseData, setExpenseData] = useState<Partial<FinancialExpense> | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [newMovement, setNewMovement] = useState<Partial<InventoryMovement> | null>(null);

  const today = new Date().toISOString().substring(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);

  // Contextual Filters
  const [filters, setFilters] = useState({
    dashboard: { month: new Date().toISOString().substring(0, 7) },
    services: { status: 'ALL' as InstrumentStatus | 'ALL' },
    billing: { start: firstOfMonth, end: today, status: 'ALL' as PaymentStatus | 'ALL' },
    expenses: { start: firstOfMonth, end: today, category: 'ALL' as ExpenseCategory | 'ALL', status: 'ALL' as PaymentStatus | 'ALL' },
    commissions: { start: firstOfMonth, end: today, status: 'ALL' as 'ALL' | 'Pendente' | 'Pago' }
  });

  // Helper: get date range for active tab (used by export button)
  const getActiveTabDates = () => {
    if (activeSubTab === 'billing') return { start: filters.billing.start, end: filters.billing.end };
    if (activeSubTab === 'expenses') return { start: filters.expenses.start, end: filters.expenses.end };
    if (activeSubTab === 'commissions') return { start: filters.commissions.start, end: filters.commissions.end };
    return { start: firstOfMonth, end: today };
  };

  const setActiveTabDates = (start: string, end: string) => {
    if (activeSubTab === 'billing') setFilters(p => ({ ...p, billing: { ...p.billing, start, end } }));
    else if (activeSubTab === 'expenses') setFilters(p => ({ ...p, expenses: { ...p.expenses, start, end } }));
    else if (activeSubTab === 'commissions') setFilters(p => ({ ...p, commissions: { ...p.commissions, start, end } }));
  };

  const activeDates = getActiveTabDates();

  const filteredFinancials = financialControls.filter(f => {
    const matchesMonth = f.dataEmissao.startsWith(filters.dashboard.month);
    if (!searchQuery) return matchesMonth;

    const client = clients.find(c => c.id === f.clienteId);
    const term = searchQuery.toLowerCase().trim();
    const digits = term.replace(/\D/g, '');

    const matchesText = (f.numeroNF || "").toLowerCase().includes(term) ||
                       (f.serviceOrderId || "").toLowerCase().includes(term) ||
                       client?.razaoSocial?.toLowerCase().includes(term);

    if (matchesText) return true;

    if (digits && digits.length >= 3) {
        const nfDigits = (f.numeroNF || "").replace(/\D/g, '');
        const osDigits = (f.serviceOrderId || "").replace(/\D/g, '');
        const cnpjDigits = (client?.cnpj || "").replace(/\D/g, '');
        if (nfDigits.includes(digits) || osDigits.includes(digits) || cnpjDigits.includes(digits)) return true;
    }

    return false;
  });

  const totalBilled = filteredFinancials.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
  const totalReceived = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalToReceive = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PENDING).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalOverdue = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.OVERDUE).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);

  const handleDownloadReport = () => {
    if (activeSubTab === 'services') {
        const data = serviceOrders.filter(order => {
          if (filters.services.status !== 'ALL' && order.statusServico !== filters.services.status) return false;
          return true;
        });
        const headers = ['O.S.', 'Orçamento', 'Cliente', 'Data Limite NF', 'Status'];
        const rows = data.map(order => {
            const quote = quotes.find(q => q.id === order.orcamentoId);
            const client = clients.find(c => c.id === quote?.clienteId);
            return [order.id, order.orcamentoId, client?.razaoSocial || '—', client?.dataLimiteNF || '—', order.statusServico];
        });
        triggerCsvDownload(headers, rows, `Relatorio_OS_${new Date().toISOString().substring(0,10)}.csv`);
    } else if (activeSubTab === 'billing') {
        const start = new Date(filters.billing.start);
        const end = new Date(filters.billing.end);
        const data = financialControls.filter(f => {
            const date = new Date(f.dataEmissao);
            return date >= start && date <= end;
        });

        const headers = ['NF', 'Emissão', 'Cliente', 'OS', 'Valor Bruto', 'Valor Líquido', 'Status Pagamento', 'Data Pagamento'];
        const rows = data.map(f => {
            const client = clients.find(c => c.id === f.clienteId);
            return [
                f.numeroNF,
                f.dataEmissao,
                client?.razaoSocial || 'N/A',
                f.serviceOrderId,
                f.valorBruto?.toFixed(2),
                f.valorLiquido?.toFixed(2),
                f.statusPagamento,
                f.dataPagamentoReal || '—'
            ];
        });
        triggerCsvDownload(headers, rows, `Relatorio_Faturamento_${filters.billing.start}_a_${filters.billing.end}.csv`);
    } else if (activeSubTab === 'expenses') {
        const start = new Date(filters.expenses.start);
        const end = new Date(filters.expenses.end);
        const data = financialExpenses.filter(e => {
            const date = new Date(e.dataVencimento);
            const inPeriod = date >= start && date <= end;
            const matchesCat = filters.expenses.category === 'ALL' || e.categoria === filters.expenses.category;
            return inPeriod && matchesCat;
        });

        const headers = ['Descrição', 'Categoria', 'Vencimento', 'Valor', 'Status', 'Data Pagamento'];
        const rows = data.map(e => [
            e.descricao,
            e.categoria,
            e.dataVencimento,
            e.valor.toFixed(2),
            e.status,
            e.dataPagamento || '—'
        ]);
        triggerCsvDownload(headers, rows, `Relatorio_Despesas_${filters.expenses.start}_a_${filters.expenses.end}.csv`);
    } else if (activeSubTab === 'commissions') {
        const start = new Date(filters.commissions.start);
        const end = new Date(filters.commissions.end);
        const data = financialControls.filter(fc => {
            const quote = quotes.find(q => q.id === fc.orcamentoId);
            const date = new Date(fc.dataEmissao);
            return quote?.comissaoVendedor && date >= start && date <= end;
        });

        const headers = ['NF', 'Orçamento', 'Comissionado', 'Valor Bruto', '% Comissão', 'Valor Comissão', 'Status'];
        const rows = data.map(f => {
            const quote = quotes.find(q => q.id === f.orcamentoId);
            const perc = f.percentualComissao || 0;
            const val = (f.valorBruto || 0) * (perc / 100);
            return [
                f.numeroNF,
                f.orcamentoId,
                quote?.nomeComissionado || '—',
                f.valorBruto?.toFixed(2),
                perc + '%',
                val.toFixed(2),
                f.statusComissao || 'Pendente'
            ];
        });
        triggerCsvDownload(headers, rows, `Relatorio_Comissoes_${filters.commissions.start}_a_${filters.commissions.end}.csv`);
    } else {
        toast.info('Não há relatório disponível para a aba Dashboard.');
    }
  };

  const triggerCsvDownload = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInvoiceModal = (serviceOrder: ServiceOrder) => {
    setSelectedServiceOrder(serviceOrder);
    setInvoiceData(null);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setSelectedServiceOrder(null);
    setInvoiceData(null);
    setIsInvoiceModalOpen(false);
  };

  const handleSaveInvoice = (invoiceData: FinancialControl) => {
    onSaveFinancialControl(invoiceData);
    // Auto-switch the dashboard filter to the new invoice's emission month so it shows up immediately
    if (invoiceData.dataEmissao) {
      setFilters(prev => ({ ...prev, dashboard: { month: invoiceData.dataEmissao.substring(0, 7) } }));
    }
    setActiveSubTab('billing');
    handleCloseInvoiceModal();
  };


  const handleDeleteInvoice = (fc: FinancialControl) => {
    if (window.confirm(`Excluir permanentemente o faturamento da NF ${fc.numeroNF}?`)) {
        if (fc.id) onDeleteFinancialControl(fc.id);
        else toast.error('Não é possível excluir um registro sem ID.');
    }
  };

  const handleEditInvoice = (fc: FinancialControl) => {
    const serviceOrder = serviceOrders.find(so => so.id === fc.serviceOrderId);
    if (serviceOrder) {
        setSelectedServiceOrder(serviceOrder);
        setInvoiceData(fc); // We need a way to pass initial data to InvoiceModal
        setIsInvoiceModalOpen(true);
    }
  };

  const handleSaveExpenseModal = (expenseData: Partial<FinancialExpense>) => {
    onSaveExpense(expenseData);
    setIsExpenseModalOpen(false);
  };

  const handleEditExpense = (expense: FinancialExpense) => {
    setExpenseData(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpenseModal = (expense: FinancialExpense) => {
    if (window.confirm(`Excluir permanentemente a despesa: ${expense.descricao}?`)) {
      if (expense.id) onDeleteExpense(expense.id);
    }
  };

  const getInternalStatusBadge = (status: InstrumentStatus) => {
    let classes = '';
    switch (status) {
      case InstrumentStatus.PENDING:
        classes = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
      case InstrumentStatus.IN_PROGRESS:
        classes = 'bg-amber-100 text-amber-700 border-amber-200';
        break;
      case InstrumentStatus.CALIBRATED:
        classes = 'bg-blue-100 text-blue-700 border-blue-200';
        break;
      case InstrumentStatus.COMPLETED:
        classes = 'bg-indigo-100 text-indigo-700 border-indigo-200';
        break;
      case InstrumentStatus.DELIVERED:
        classes = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        break;
      default:
        classes = 'bg-slate-50 text-slate-400 border-slate-100';
    }

    return (
      <span className={`px-3 py-1.5 text-[9px] font-black rounded-xl uppercase tracking-wider border shadow-sm transition-all ${classes}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      {/* --- Main Module Header --- */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div className="pt-2">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Gestão Estratégica</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Financeiro</h2>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: CircleDollarSign },
              { id: 'services', label: 'Serviços', icon: Receipt },
              { id: 'billing', label: 'Faturamento', icon: Receipt },
              { id: 'expenses', label: 'Despesas', icon: CircleDollarSign },
              { id: 'commissions', label: 'Comissões', icon: DollarSign },
              { id: 'inventory', label: 'Inventário', icon: Package },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center px-5 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Date filters + Export — only for tabs that have date range */}
          {(activeSubTab === 'billing' || activeSubTab === 'expenses' || activeSubTab === 'commissions') && (
            <div className="flex items-center gap-2">
              {/* Date Inicial */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Data Inicial</span>
                <input
                  type="date"
                  value={activeDates.start}
                  onChange={(e) => setActiveTabDates(e.target.value, activeDates.end)}
                  className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 w-[95px]"
                />
              </div>
              {/* Date Final */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Data Final</span>
                <input
                  type="date"
                  value={activeDates.end}
                  onChange={(e) => setActiveTabDates(activeDates.start, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 w-[95px]"
                />
              </div>
              {/* Export Button */}
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl transition-all shadow-xl dark:shadow-none font-black text-[10px] uppercase tracking-widest active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          )}

          {/* Services tab: only export (no date range) */}
          {activeSubTab === 'services' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl transition-all shadow-xl dark:shadow-none font-black text-[10px] uppercase tracking-widest active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 transition-all duration-300">
        {activeSubTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</span>
                <input
                  type="month"
                  value={filters.dashboard.month}
                  onChange={(e) => setFilters(prev => ({ ...prev, dashboard: { month: e.target.value } }))}
                  className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 w-[105px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Faturado (Bruto)', value: totalBilled, lightBg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-900/20', iconColor: 'text-indigo-600', icon: Receipt },
                { label: 'Total Recebido (Líquido)', value: totalReceived, lightBg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/20', iconColor: 'text-emerald-600', icon: CheckCircle },
                { label: 'A Receber (Líquido)', value: totalToReceive, lightBg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20', iconColor: 'text-amber-600', icon: Clock },
                { label: 'Atrasado (Líquido)', value: totalOverdue, lightBg: 'bg-rose-50', darkBg: 'dark:bg-rose-900/20', iconColor: 'text-rose-600', icon: CircleDollarSign }
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="premium-card p-8"
                >
                  <div className={`${stat.lightBg} ${stat.darkBg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                    <stat.icon className={`${stat.iconColor} w-7 h-7`} />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xs font-black text-slate-400">R$</span>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                      {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : activeSubTab === 'services' ? (
          <div className="space-y-12">
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                  <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                  Status Financeiro das Ordens de Serviço
                </h3>
                {/* Status filter — where dates used to be */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <Filter className="w-4 h-4 text-indigo-500 ml-1" />
                  <select
                    value={filters.services.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, services: { status: e.target.value as InstrumentStatus | 'ALL' } }))}
                    className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest pr-1"
                  >
                    <option value="ALL">Todos os Status</option>
                    {Object.values(InstrumentStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-md text-center pl-8">O.S. / Orç.</th>
                      <th className="rectilinear-th col-lg text-center">Cliente / Empresa Solicitante</th>
                      <th className="rectilinear-th col-sm text-center">Data Limite NF</th>
                      <th className="rectilinear-th col-md text-center">Status Interno</th>
                      <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {serviceOrders
                      .filter(order => {
                        if (filters.services.status !== 'ALL' && order.statusServico !== filters.services.status) return false;
                        if (!searchQuery) return true;
                        const quote = quotes.find(q => q.id === order.orcamentoId);
                        const client = clients.find(c => c.id === quote?.clienteId);
                        const term = searchQuery.toLowerCase().trim();
                        const digits = term.replace(/\D/g, '');

                        const matchesText = (order.id || "").toLowerCase().includes(term) ||
                                           (order.orcamentoId || "").toLowerCase().includes(term) ||
                                           client?.razaoSocial?.toLowerCase().includes(term);
                        if (matchesText) return true;

                        if (digits && digits.length >= 3) {
                            const osDigits = (order.id || "").replace(/\D/g, '');
                            const quoteDigits = (order.orcamentoId || "").replace(/\D/g, '');
                            const cnpjDigits = (client?.cnpj || "").replace(/\D/g, '');
                            if (osDigits.includes(digits) || quoteDigits.includes(digits) || cnpjDigits.includes(digits)) return true;
                        }
                        return false;
                      })
                      .map((order) => {
                        const quote = quotes.find(q => q.id === order.orcamentoId);
                        const client = clients.find(c => c.id === quote?.clienteId);
                        const isBilled = financialControls.some(fc => fc.serviceOrderId === order.id);

                        return (
                          <tr key={order.id} className="rectilinear-tr group">
                            <td className="rectilinear-td text-center pl-8 font-black text-slate-900 dark:text-white uppercase tabular-nums">
                              {order.id} <span className="text-[10px] text-slate-400 font-bold ml-1 opacity-50">Ref: {order.orcamentoId}</span>
                            </td>
                            <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate" title={client?.razaoSocial}>
                              {client?.razaoSocial || '—'}
                            </td>
                            <td className="rectilinear-td text-center font-bold text-slate-500 tabular-nums text-xs">
                              {client?.dataLimiteNF || '—'}
                            </td>
                            <td className="rectilinear-td text-center">
                              {getInternalStatusBadge(order.statusServico)}
                            </td>
                            <td className="rectilinear-td text-center pr-8">
                              <button
                                onClick={() => handleOpenInvoiceModal(order)}
                                className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isBilled
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                    : 'bg-indigo-600 text-white hover:bg-slate-900'
                                  }`}
                                disabled={isBilled}
                              >
                                {isBilled ? 'Faturado' : 'Faturar O.S.'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : activeSubTab === 'billing' ? (
          <div className="space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full mr-4"></div>
                  Resumo do Faturamento
                </h3>
                {/* Status filter for billing */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <Filter className="w-4 h-4 text-emerald-500 ml-1" />
                  <select
                    value={filters.billing.status}
                    onChange={(e) => setFilters(p => ({ ...p, billing: { ...p.billing, status: e.target.value as PaymentStatus | 'ALL' } }))}
                    className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest pr-1"
                  >
                    <option value="ALL">Todos os Status</option>
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-md text-center pl-8">NF / Doc</th>
                      <th className="rectilinear-th col-lg text-center">Cliente Pagador</th>
                      <th className="rectilinear-th col-md text-center">Valores (L / B)</th>
                      <th className="rectilinear-th col-md text-center">Referência O.S.</th>
                      <th className="rectilinear-th col-md text-center">Status</th>
                      <th className="rectilinear-th col-md text-center">Data Pagam.</th>
                      <th className="rectilinear-th col-sm text-center pr-8">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {financialControls.filter(f => {
                      if (!f.dataEmissao) return false;
                      if (f.dataEmissao < filters.billing.start || f.dataEmissao > filters.billing.end) return false;
                      if (filters.billing.status !== 'ALL') {
                        const isPaid = !!f.dataPagamentoReal;
                        const isOverdue = !isPaid && f.dataPagamento && today > f.dataPagamento;
                        const computedStatus = isPaid ? PaymentStatus.PAID : (isOverdue ? PaymentStatus.OVERDUE : PaymentStatus.PENDING);
                        if (computedStatus !== filters.billing.status) return false;
                      }
                      return true;
                    }).map((fc) => {
                      const client = clients.find(c => c.id === fc.clienteId);
                      return (
                        <tr key={fc.numeroNF} className="rectilinear-tr group">
                          <td className="rectilinear-td text-center pl-8">
                            <div className="font-black text-slate-900 dark:text-white tabular-nums">{fc.numeroNF}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {fc.dataEmissao.split('-').reverse().join('/')}
                            </div>
                          </td>
                          <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate" title={client?.razaoSocial}>
                            {client?.razaoSocial || '—'}
                          </td>
                          <td className="rectilinear-td text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-indigo-600 tabular-nums">L: {formatNumber(fc.valorLiquido ?? 0)}</span>
                              <span className="text-[9px] text-slate-400 font-bold tabular-nums">B: {formatNumber(fc.valorBruto ?? 0)}</span>
                            </div>
                          </td>
                          <td className="rectilinear-td text-center text-xs font-black text-slate-500 uppercase tabular-nums">
                              {fc.serviceOrderId}
                          </td>
                          <td className="rectilinear-td text-center">
                              <div className="flex justify-center min-w-[100px]">
                                  {(() => {
                                      const isPaid = !!fc.dataPagamentoReal;
                                      const isOverdue = !isPaid && fc.dataPagamento && new Date().toISOString().substring(0, 10) > fc.dataPagamento;
                                      const status = isPaid ? PaymentStatus.PAID : (isOverdue ? PaymentStatus.OVERDUE : PaymentStatus.PENDING);
                                      
                                      return (
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                              status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                              status === PaymentStatus.OVERDUE ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                              'bg-amber-100 text-amber-700 border-amber-200'
                                          }`}>
                                              {status}
                                          </span>
                                      );
                                  })()}
                              </div>
                          </td>
                          <td className="rectilinear-td text-center">
                              <div className="flex flex-col items-center">
                                  <input 
                                      type="date"
                                      className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all"
                                      value={fc.dataPagamentoReal || ''}
                                      onChange={(e) => onSaveFinancialControl({ 
                                          ...fc, 
                                          dataPagamentoReal: e.target.value || undefined,
                                          statusPagamento: e.target.value ? PaymentStatus.PAID : (fc.dataPagamento && new Date().toISOString().substring(0, 10) > fc.dataPagamento ? PaymentStatus.OVERDUE : PaymentStatus.PENDING) 
                                      })}
                                      title="Clique para definir a data de pagamento"
                                  />
                              </div>
                          </td>
                          <td className="rectilinear-td text-center pr-8">
                            <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditInvoice(fc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteInvoice(fc)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : activeSubTab === 'expenses' ? (
          <div className="space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                  <div className="w-2 h-8 bg-rose-500 rounded-full mr-4"></div>
                  Gestão de Despesas
                </h3>
                <div className="flex items-center gap-2">
                  {/* Category filter */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <Tag className="w-3.5 h-3.5 text-rose-400 ml-1" />
                    <select
                      value={filters.expenses.category}
                      onChange={(e) => setFilters(p => ({ ...p, expenses: { ...p.expenses, category: e.target.value as ExpenseCategory | 'ALL' } }))}
                      className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest pr-1"
                    >
                      <option value="ALL">Todas as Categorias</option>
                      {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Status filter */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <Filter className="w-3.5 h-3.5 text-rose-400 ml-1" />
                    <select
                      value={filters.expenses.status}
                      onChange={(e) => setFilters(p => ({ ...p, expenses: { ...p.expenses, status: e.target.value as PaymentStatus | 'ALL' } }))}
                      className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest pr-1"
                    >
                      <option value="ALL">Todos os Status</option>
                      {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setExpenseData(null); setIsExpenseModalOpen(true); }} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Nova Despesa
                  </button>
                </div>
              </div>

                  <div className="rectilinear-container custom-scrollbar shadow-sm">
                    <table className="rectilinear-table">
                      <thead>
                        <tr>
                          <th className="rectilinear-th col-lg text-left pl-8">Descrição / Fornecedor</th>
                          <th className="rectilinear-th col-md text-left">Categoria</th>
                          <th className="rectilinear-th col-sm text-center">Vencimento</th>
                          <th className="rectilinear-th col-sm text-center">Valor (R$)</th>
                          <th className="rectilinear-th col-sm text-center">Status</th>
                          <th className="rectilinear-th col-sm text-center">Data Pagam.</th>
                          <th className="rectilinear-th col-sm text-center pr-8">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {financialExpenses.filter(e => {
                           if (!e.dataVencimento) return false;
                           if (e.dataVencimento < filters.expenses.start || e.dataVencimento > filters.expenses.end) return false;
                           if (filters.expenses.category !== 'ALL' && e.categoria !== filters.expenses.category) return false;
                           if (filters.expenses.status !== 'ALL' && e.status !== filters.expenses.status) return false;
                           return true;
                        }).map((exp) => (
                          <tr key={exp.id} className="rectilinear-tr group">
                            <td className="rectilinear-td text-left pl-8 font-bold text-slate-700 dark:text-slate-300 truncate">
                              {exp.descricao}
                            </td>
                            <td className="rectilinear-td text-left">
                              <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Tag className="w-3 h-3 opacity-50" /> {String(exp.categoria).split(' ')[0]}
                              </span>
                            </td>
                            <td className="rectilinear-td text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                              {exp.dataVencimento.split('-').reverse().join('/')}
                            </td>
                            <td className="rectilinear-td text-center font-black text-rose-600 tabular-nums">
                              R$ {formatNumber(exp.valor)}
                            </td>
                            <td className="rectilinear-td text-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                                exp.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                exp.status === PaymentStatus.OVERDUE ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {exp.status}
                              </span>
                            </td>
                            <td className="rectilinear-td text-center text-[10px] font-bold text-slate-400 tabular-nums">
                              {exp.dataPagamento ? exp.dataPagamento.split('-').reverse().join('/') : '—'}
                            </td>
                            <td className="rectilinear-td text-center pr-8">
                              <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditExpense(exp)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteExpenseModal(exp)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </section>
             </div>
        ) : activeSubTab === 'commissions' ? (
          <div className="space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                  <div className="w-2 h-8 bg-amber-500 rounded-full mr-4"></div>
                  Gestão de Comissões
                </h3>
                {/* Status filter for commissions */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <Filter className="w-4 h-4 text-amber-500 ml-1" />
                  <select
                    value={filters.commissions.status}
                    onChange={(e) => setFilters(p => ({ ...p, commissions: { ...p.commissions, status: e.target.value as 'ALL' | 'Pendente' | 'Pago' } }))}
                    className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest pr-1"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>

                <div className="rectilinear-container custom-scrollbar shadow-sm">
                  <table className="rectilinear-table">
                    <thead>
                      <tr>
                        <th className="rectilinear-th col-sm text-center pl-8">NF / Doc</th>
                        <th className="rectilinear-th col-sm text-center">Orçamento</th>
                        <th className="rectilinear-th col-md text-center">Comissionado</th>
                        <th className="rectilinear-th col-md text-center">Valor Total</th>
                        <th className="rectilinear-th col-sm text-center">% Comiss.</th>
                        <th className="rectilinear-th col-sm text-center">V. Comiss.</th>
                        <th className="rectilinear-th col-sm text-center pr-8">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {financialControls.filter(fc => {
                        const quote = quotes.find(q => q.id === fc.orcamentoId);
                        if (!quote?.comissaoVendedor) return false;
                        if (!fc.dataEmissao) return false;
                        if (fc.dataEmissao < filters.commissions.start || fc.dataEmissao > filters.commissions.end) return false;
                        if (filters.commissions.status !== 'ALL' && (fc.statusComissao || 'Pendente') !== filters.commissions.status) return false;
                        return true;
                      }).map((fc) => {
                        const quote = quotes.find(q => q.id === fc.orcamentoId);
                        const comissaoPerc = fc.percentualComissao || 0;
                        const vComiss = ((fc.valorBruto || 0) * (comissaoPerc / 100));
                        return (
                          <tr key={fc.id || fc.numeroNF} className="rectilinear-tr group">
                            <td className="rectilinear-td text-center pl-8 font-black text-slate-900 tabular-nums">
                              {fc.numeroNF}
                            </td>
                            <td className="rectilinear-td text-center text-xs font-bold text-indigo-600">
                              {fc.orcamentoId}
                            </td>
                            <td className="rectilinear-td text-center">
                              <input
                                type="text"
                                className="w-full text-center border-none bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 transition-all"
                                value={quote?.nomeComissionado || quote?.criadoPor || ''}
                                placeholder="—"
                                onChange={(e) => {
                                  if (quote && onSaveQuote) {
                                    onSaveQuote({ ...quote, nomeComissionado: e.target.value });
                                  }
                                }}
                                title="Editar nome do comissionado"
                              />
                            </td>
                            <td className="rectilinear-td text-center text-sm font-black text-slate-500 tabular-nums">
                              R$ {formatNumber(fc.valorBruto ?? 0)}
                            </td>
                            <td className="rectilinear-td text-center">
                              <input
                                type="number"
                                className="w-16 p-1 text-center border rounded bg-transparent"
                                value={comissaoPerc}
                                onChange={(e) => onSaveFinancialControl({ ...fc, percentualComissao: Number(e.target.value) })}
                              /> %
                            </td>
                            <td className="rectilinear-td text-center font-black text-indigo-600 tabular-nums">
                              R$ {formatNumber(vComiss)}
                            </td>
                            <td className="rectilinear-td text-center pr-8">
                              <select
                                className={`text-xs font-black uppercase rounded p-1 cursor-pointer outline-none ${fc.statusComissao === 'Pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                                value={fc.statusComissao || 'Pendente'}
                                onChange={(e) => onSaveFinancialControl({ ...fc, statusComissao: e.target.value as 'Pago' | 'Pendente' })}
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Pago">Pago</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : activeSubTab === 'inventory' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                <div className="w-2 h-8 bg-violet-500 rounded-full mr-4"></div>
                Inventário de Materiais
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar item..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-violet-500 outline-none transition-all w-48"
                />
                <button
                  onClick={async () => {
                    const missing = standardInstruments.filter(inst => !inventoryItems.some(inv => inv.standardInstrumentId === inst.id));
                    if (missing.length === 0) {
                      toast.info('Tudo sincronizado!');
                      return;
                    }
                    toast.loading(`Sincronizando ${missing.length} itens...`);
                    for (const inst of missing) {
                      const newItem: InventoryItem = {
                        id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        descricao: inst.nome,
                        categoria: 'Instrumento',
                        quantidade: 1,
                        unidade: 'un',
                        valorUnitario: 0,
                        statusMovimentacao: 'Disponível',
                        instrumentoId: inst.identificacao,
                        standardInstrumentId: inst.id
                      };
                      await onSaveInventoryItem(newItem);
                    }
                    toast.dismiss();
                    toast.success('Sincronização concluída!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                  title="Sincronizar com Instrumentos Padrão"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                </button>
                <button
                  onClick={() => {
                    const id = `INV-${Date.now()}`;
                    const newItem: InventoryItem = { id, descricao: '', categoria: 'Geral', quantidade: 0, unidade: 'un', valorUnitario: 0, statusMovimentacao: 'Disponível' };
                    setEditingInventoryItem(newItem);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-violet-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Item
                </button>
                <button
                  onClick={() => {
                    const headers = ['ID', 'Ativo Fixo', 'ID Instrumento', 'Descrição', 'Categoria', 'Qtd', 'Unidade', 'Valor Unit.', 'Total', 'Localização', 'Status'];
                    const rows = inventoryItems.map(i => [i.id, i.ativoFixo||'—', i.instrumentoId||'—', i.descricao, i.categoria, i.quantidade, i.unidade, i.valorUnitario.toFixed(2), (i.quantidade*i.valorUnitario).toFixed(2), i.localizacao||'—', i.statusMovimentacao||'Disponível']);
                    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
                    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Inventario_${today}.csv`; a.click();
                    toast.success('Relatório exportado!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total de Itens', value: inventoryItems.length.toString(), icon: Package, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                { label: 'Valor em Estoque', value: `R$ ${formatNumber(inventoryItems.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0))}`, icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Em Cautela', value: inventoryItems.filter(i => i.statusMovimentacao === 'Em Cautela').length.toString(), icon: ArrowUpCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              ].map((c, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="premium-card p-5 flex items-center gap-4">
                  <div className={`${c.bg} w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0`}><c.icon className={`${c.color} w-5 h-5`} /></div>
                  <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.label}</p><p className="text-lg font-black text-slate-900 dark:text-white">{c.value}</p></div>
                </motion.div>
              ))}
            </div>

            <div className="rectilinear-container custom-scrollbar shadow-sm">
              <table className="rectilinear-table">
                <thead>
                  <tr>
                    <th className="rectilinear-th text-left pl-8 w-[45%]">Descrição</th>
                    <th className="rectilinear-th text-center w-[15%]">Categoria</th>
                    <th className="rectilinear-th text-center w-[10%]">Qtd.</th>
                    <th className="rectilinear-th text-center w-[10%]">Valor Total</th>
                    <th className="rectilinear-th text-center w-[10%]">Status</th>
                    <th className="rectilinear-th text-center pr-8 w-[10%]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {[...inventoryItems]
                    .sort((a, b) => (a.ativoFixo || '').localeCompare(b.ativoFixo || ''))
                    .filter(item =>
                    !inventorySearch ||
                    item.descricao.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                    (item.ativoFixo||'').toLowerCase().includes(inventorySearch.toLowerCase()) ||
                    (item.instrumentoId||'').toLowerCase().includes(inventorySearch.toLowerCase()) ||
                    item.categoria.toLowerCase().includes(inventorySearch.toLowerCase())
                  ).map((item) => {
                    const linkedInstrument = standardInstruments.find(s => s.id === item.standardInstrumentId);
                    return (
                      <tr key={item.id} className="rectilinear-tr group">
                        <td className="rectilinear-td text-left pl-8">
                          <div className="flex items-center gap-2">
                            {linkedInstrument && <span title={`Vinculado: ${linkedInstrument.nome}`}><Link className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /></span>}
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate">
                              {item.ativoFixo ? <span className="text-slate-400 font-medium mr-1.5">[{item.ativoFixo}]</span> : null}
                              {item.descricao}
                            </span>
                          </div>
                        </td>
                        <td className="rectilinear-td text-center text-[10px] font-black uppercase text-slate-500">{item.categoria}</td>
                        <td className="rectilinear-td text-center">
                          <span className={`font-black text-sm w-7 text-center tabular-nums ${item.quantidade <= 2 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{item.quantidade} {item.unidade}</span>
                        </td>
                        <td className="rectilinear-td text-center font-black text-violet-600 tabular-nums text-xs">
                          R$ {formatNumber(item.quantidade * item.valorUnitario)}
                        </td>
                        <td className="rectilinear-td text-center">
                          <span className={`text-[10px] font-black uppercase rounded-lg px-2 py-1 ${item.statusMovimentacao === 'Disponível' ? 'bg-emerald-50 text-emerald-700' : item.statusMovimentacao === 'Em Cautela' ? 'bg-amber-50 text-amber-700' : item.statusMovimentacao === 'Em Manutenção' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'}`}>
                            {item.statusMovimentacao || 'Disponível'}
                          </span>
                        </td>
                        <td className="rectilinear-td text-center pr-8">
                          <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingInventoryItem(item)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-slate-50 rounded-lg transition-all" title="Editar / Detalhes"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => setHistoryItem(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all" title="Histórico"><History className="w-4 h-4" /></button>
                            <button onClick={() => { if(window.confirm(`Excluir "${item.descricao}"?`)) onDeleteInventoryItem(item.id); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {inventoryItems.length === 0 && (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-400 font-bold">Nenhum item cadastrado. Clique em "Novo Item" para começar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* History Modal */}
            <AnimatePresence>
              {historyItem && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setHistoryItem(null)}>
                  <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-slate-100 dark:border-slate-800 max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Histórico de Movimentação</h3>
                        <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{historyItem.descricao}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setNewMovement({inventoryItemId: historyItem.id, data: today, tipo: InventoryMovementType.ENTRADA, quantidade: 1})}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all">
                          <Plus className="w-3.5 h-3.5" /> Registrar
                        </button>
                        <button onClick={() => setHistoryItem(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                    {newMovement && (
                      <div className="mb-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-200 dark:border-violet-800 flex flex-wrap gap-3 items-end flex-shrink-0">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 block mb-1">Tipo</label>
                          <select value={newMovement.tipo} onChange={e=>setNewMovement(p=>({...p,tipo:e.target.value as InventoryMovementType}))} className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white font-bold">
                            {Object.values(InventoryMovementType).map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 block mb-1">Quantidade</label>
                          <input type="number" min={1} value={newMovement.quantidade||1} onChange={e=>setNewMovement(p=>({...p,quantidade:Number(e.target.value)}))} className="w-20 text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white font-bold" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 block mb-1">Data</label>
                          <input type="date" value={newMovement.data||today} onChange={e=>setNewMovement(p=>({...p,data:e.target.value}))} className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white font-bold" />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 block mb-1">Observação</label>
                          <input type="text" value={newMovement.observacao||''} onChange={e=>setNewMovement(p=>({...p,observacao:e.target.value}))} placeholder="Opcional..." className="w-full text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white font-bold" />
                        </div>
                        <button onClick={() => {
                          if (!newMovement.tipo || !newMovement.quantidade) return;
                          const mov: InventoryMovement = { id:`MOV-${Date.now()}`, inventoryItemId: historyItem.id, tipo: newMovement.tipo!, quantidade: newMovement.quantidade!, data: newMovement.data||today, observacao: newMovement.observacao };
                          onSaveInventoryMovement(mov);
                          const delta = [InventoryMovementType.ENTRADA, InventoryMovementType.DEVOLUCAO].includes(mov.tipo) ? mov.quantidade : -mov.quantidade;
                          const updated = {...historyItem, quantidade: Math.max(0, historyItem.quantidade + delta)};
                          onSaveInventoryItem(updated);
                          setHistoryItem(updated);
                          setNewMovement(null);
                          toast.success('Movimentação registrada!');
                        }} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-black text-[10px] uppercase transition-all">Salvar</button>
                        <button onClick={()=>setNewMovement(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-black text-[10px] uppercase transition-all">Cancelar</button>
                      </div>
                    )}
                    <div className="overflow-y-auto custom-scrollbar space-y-2">
                      {inventoryMovements.filter(m => m.inventoryItemId === historyItem.id).length === 0
                        ? <p className="text-center text-slate-400 py-10 font-medium">Nenhuma movimentação registrada.</p>
                        : inventoryMovements.filter(m => m.inventoryItemId === historyItem.id).sort((a,b)=>b.data.localeCompare(a.data)).map(mov => (
                          <div key={mov.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${[InventoryMovementType.ENTRADA,InventoryMovementType.DEVOLUCAO].includes(mov.tipo)?'bg-emerald-100 text-emerald-600':'bg-rose-100 text-rose-600'}`}>
                              {[InventoryMovementType.ENTRADA,InventoryMovementType.DEVOLUCAO].includes(mov.tipo)?<ArrowUpCircle className="w-4 h-4"/>:<ArrowDownCircle className="w-4 h-4"/>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2"><span className="font-black text-xs text-slate-700 dark:text-slate-200 uppercase">{mov.tipo}</span><span className="text-[10px] text-slate-400">{mov.data.split('-').reverse().join('/')}</span>{mov.cautelaId && <span className="text-[9px] text-indigo-500 font-black">Cautela #{mov.cautelaId}</span>}</div>
                              {mov.observacao && <p className="text-[10px] text-slate-400 italic">{mov.observacao}</p>}
                            </div>
                            <span className={`font-black text-sm tabular-nums ${[InventoryMovementType.ENTRADA,InventoryMovementType.DEVOLUCAO].includes(mov.tipo)?'text-emerald-600':'text-rose-600'}`}>
                              {[InventoryMovementType.ENTRADA,InventoryMovementType.DEVOLUCAO].includes(mov.tipo)?'+':'-'}{mov.quantidade}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
        </div>

      {/* Modal de Inventário */}
      <AnimatePresence>
        {editingInventoryItem && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setEditingInventoryItem(null)}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-12 w-full max-w-2xl border border-slate-100 dark:border-slate-800 relative flex flex-col max-h-[95vh]">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhes do Item</h3>
                  {editingInventoryItem.standardInstrumentId && <p className="text-[10px] font-black uppercase text-indigo-500 mt-1">Vinculado a Instrumento Padrão</p>}
                </div>
                <button onClick={() => setEditingInventoryItem(null)} className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-2 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Descrição</label>
                  <input type="text" value={editingInventoryItem.descricao} disabled={!!editingInventoryItem.standardInstrumentId} onChange={e=>setEditingInventoryItem({...editingInventoryItem, descricao: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner disabled:opacity-60" placeholder="Ex: Fita Crepe 50mm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Categoria</label>
                    <input type="text" value={editingInventoryItem.categoria} onChange={e=>setEditingInventoryItem({...editingInventoryItem, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Unidade</label>
                    <input type="text" value={editingInventoryItem.unidade} onChange={e=>setEditingInventoryItem({...editingInventoryItem, unidade: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" placeholder="Ex: un, cx, kg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ativo Fixo (Patrimônio)</label>
                    <input type="text" value={editingInventoryItem.ativoFixo || ''} onChange={e=>setEditingInventoryItem({...editingInventoryItem, ativoFixo: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">ID Instrumento</label>
                    <input type="text" value={editingInventoryItem.instrumentoId || ''} disabled={!!editingInventoryItem.standardInstrumentId} onChange={e=>setEditingInventoryItem({...editingInventoryItem, instrumentoId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner disabled:opacity-60" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Quantidade Atual</label>
                    <input type="number" min="0" value={editingInventoryItem.quantidade} onChange={e=>setEditingInventoryItem({...editingInventoryItem, quantidade: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Valor Unitário</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                      <input type="number" step="0.01" min="0" value={editingInventoryItem.valorUnitario} onChange={e=>setEditingInventoryItem({...editingInventoryItem, valorUnitario: Number(e.target.value)})} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Status</label>
                    <select value={editingInventoryItem.statusMovimentacao || 'Disponível'} onChange={e=>setEditingInventoryItem({...editingInventoryItem, statusMovimentacao: e.target.value as any})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner">
                      <option>Disponível</option><option>Em Cautela</option><option>Em Manutenção</option><option>Baixado</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Localização</label>
                    <input type="text" value={editingInventoryItem.localizacao || ''} onChange={e=>setEditingInventoryItem({...editingInventoryItem, localizacao: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] font-bold text-sm outline-none transition-all shadow-inner" />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  onSaveInventoryItem(editingInventoryItem);
                  setEditingInventoryItem(null);
                }} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 mt-4">Salvar Alterações</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        onSave={handleSaveInvoice}
        initialData={invoiceData}
        serviceOrder={selectedServiceOrder}
        quotes={quotes}
        clients={clients}
        paymentMethods={paymentMethods}
        banks={banks}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpenseModal}
        initialData={expenseData}
        banks={banks}
      />
    </div>
  );
}
