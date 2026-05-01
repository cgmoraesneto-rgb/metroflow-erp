import { useState } from 'react';
import { FinancialControl, PaymentStatus, Quote, ServiceOrder, Client, PaymentMethod, InstrumentStatus, Bank } from '../types';
import InvoiceModal from './InvoiceModal';
import { Plus, Edit2, Trash2, CreditCard, Receipt, CircleDollarSign, Calendar, Download, ChevronRight, ArrowUpRight, CheckCircle, Clock, DollarSign, Search, Building2, Smartphone, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../utils/formatters';

interface FinanceModuleProps {
  quotes: Quote[];
  serviceOrders: ServiceOrder[];
  clients: Client[];
  financialControls: FinancialControl[];
  paymentMethods: PaymentMethod[];
  banks: Bank[];
  onFinancialControlsChange: (financials: FinancialControl[]) => void;
  onSaveFinancialControl: (fc: FinancialControl) => void;
  onSavePaymentMethod: (pm: PaymentMethod) => void;
  onDeletePaymentMethod: (id: string) => void;
  onDeleteFinancialControl: (id: string) => void;
  onSaveQuote?: (quote: Quote) => void;
  searchQuery?: string;
}

export default function FinanceModule({
  quotes,
  serviceOrders,
  clients,
  financialControls,
  paymentMethods,
  banks,
  onFinancialControlsChange,
  onSaveFinancialControl,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  onDeleteFinancialControl,
  onSaveQuote,
  searchQuery
}: FinanceModuleProps) {

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'billing' | 'commissions'>('dashboard');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [invoiceData, setInvoiceData] = useState<Partial<FinancialControl> | null>(null);
  const [paymentDates, setPaymentDates] = useState<{ [key: string]: string }>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [reportStartDate, setReportStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10));
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [statusFilter, setStatusFilter] = useState<InstrumentStatus | 'ALL'>('ALL');

  const filteredFinancials = financialControls.filter(f => {
    const matchesMonth = f.dataEmissao.startsWith(selectedMonth);
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

  const handleDownloadReport = (type: 'billing' | 'commissions') => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    
    if (type === 'billing') {
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

        const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Relatorio_Faturamento_${reportStartDate}_a_${reportEndDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
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

        const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Relatorio_Comissoes_${reportStartDate}_a_${reportEndDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
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
    // Auto-switch the month filter to the new invoice's emission month so it shows up immediately
    if (invoiceData.dataEmissao) {
      setSelectedMonth(invoiceData.dataEmissao.substring(0, 7));
    }
    setActiveSubTab('billing');
    handleCloseInvoiceModal();
  };

  const handlePaymentDateChange = (nfNumber: string, date: string) => {
    setPaymentDates(prev => ({ ...prev, [nfNumber]: date }));
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
      <div className="flex flex-col lg:flex-row justify-between gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div className="pt-2">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Gestão Estratégica</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Financeiro</h2>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: CircleDollarSign },
              { id: 'billing', label: 'Faturamento', icon: Receipt },
              { id: 'commissions', label: 'Comissões', icon: DollarSign }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center px-6 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Reports & Period Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inicial</span>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 w-[85px]"
              />
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Final</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 w-[85px]"
              />
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => handleDownloadReport('billing')}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none font-black text-[9px] uppercase tracking-wider active:scale-95 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Faturamento</span>
              </button>
              <button
                onClick={() => handleDownloadReport('commissions')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none font-black text-[9px] uppercase tracking-wider active:scale-95 whitespace-nowrap"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Comissões</span>
              </button>
            </div>
          </div>
        </div>
      </div>



      <div className="mt-8 transition-all duration-300">
          {activeSubTab === 'dashboard' ? (
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
          ) : activeSubTab === 'billing' ? (
            <div className="space-y-12">
              <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                    Status Financeiro das Ordens de Serviço
                  </h3>

                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <Filter className="w-4 h-4 text-indigo-500 ml-2" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer uppercase tracking-widest"
                    >
                      <option value="ALL">TODOS OS STATUS</option>
                      {Object.values(InstrumentStatus).map(status => (
                        <option key={status} value={status}>{status.toUpperCase()}</option>
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
                          if (statusFilter !== 'ALL' && order.statusServico !== statusFilter) return false;
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

              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full mr-4"></div>
                    Resumo do Faturamento
                  </h3>
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
                      {filteredFinancials.map((fc) => {
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
          ) : (
            <div className="space-y-12">
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                    <div className="w-2 h-8 bg-amber-500 rounded-full mr-4"></div>
                    Gestão de Comissões
                  </h3>
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
                        return quote?.comissaoVendedor;
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
          )}
        </div>

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
    </div>
  );
}
