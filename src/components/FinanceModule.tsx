import { useState } from 'react';
import { FinancialControl, PaymentStatus, Quote, ServiceOrder, Client, PaymentMethod } from '../types';
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
  onFinancialControlsChange: (controls: FinancialControl[]) => void;
  onSaveFinancialControl: (fc: any) => void;
  onSavePaymentMethod: (pm: PaymentMethod) => void;
  onDeletePaymentMethod: (id: string) => void;
  onDeleteFinancialControl: (id: string) => void;
}

export default function FinanceModule({
  quotes,
  serviceOrders,
  clients,
  financialControls,
  paymentMethods,
  onFinancialControlsChange,
  onSaveFinancialControl,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  onDeleteFinancialControl
}: FinanceModuleProps) {

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'billing'>('dashboard');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [invoiceData, setInvoiceData] = useState<Partial<FinancialControl> | null>(null);
  const [paymentDates, setPaymentDates] = useState<{ [key: string]: string }>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const filteredFinancials = financialControls.filter(f => f.dataEmissao.startsWith(selectedMonth));

  const totalBilled = filteredFinancials.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
  const totalReceived = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalToReceive = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PENDING).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalOverdue = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.OVERDUE).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);

  const handleDownloadReport = () => {
    const headers = ['NF', 'Emissão', 'Cliente', 'OS', 'Valor Bruto', 'Valor Líquido', 'Status'];
    const rows = filteredFinancials.map(f => {
      const client = clients.find(c => c.id === f.clienteId);
      return [
        f.numeroNF,
        f.dataEmissao,
        client?.razaoSocial || 'N/A',
        f.serviceOrderId,
        f.valorBruto?.toFixed(2),
        f.valorLiquido?.toFixed(2),
        f.statusPagamento
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Financeiro_${selectedMonth}.csv`);
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Financeiro</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Gestão de faturamento, recebíveis e fluxo de caixa.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-emerald-500 ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-sm font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
            />
          </div>

          <button
            onClick={handleDownloadReport}
            className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-2xl transition-all shadow-sm font-black text-xs active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Relatório CSV</span>
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex items-center px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${activeSubTab === 'dashboard'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <CircleDollarSign className="mr-2 w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab('billing')}
              className={`flex items-center px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${activeSubTab === 'billing'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <Receipt className="mr-2 w-4 h-4" />
              Faturamento
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 transition-all duration-300">
          {activeSubTab === 'dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Faturado', value: totalBilled, lightBg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/20', iconColor: 'text-blue-600', icon: Receipt },
                { label: 'Total Recebido', value: totalReceived, lightBg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/20', iconColor: 'text-emerald-600', icon: CheckCircle },
                { label: 'A Receber', value: totalToReceive, lightBg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20', iconColor: 'text-amber-600', icon: Clock },
                { label: 'Valor Atrasado', value: totalOverdue, lightBg: 'bg-rose-50', darkBg: 'dark:bg-rose-900/20', iconColor: 'text-rose-600', icon: CircleDollarSign }
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
          ) : (
            <div className="space-y-12">
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                    Status Financeiro das Ordens de Serviço
                  </h3>
                </div>

                <div className="rectilinear-container custom-scrollbar shadow-sm">
                  <table className="rectilinear-table">
                    <thead>
                      <tr>
                        <th className="rectilinear-th col-md text-center pl-8">O.S. / Orç.</th>
                        <th className="rectilinear-th col-lg text-center">Cliente / Empresa Solicitante</th>
                        <th className="rectilinear-th col-md text-center">Status Interno</th>
                        <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {serviceOrders
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
                              <td className="rectilinear-td text-center">
                                <span className={`px-3 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider ${order.statusServico === 'Concluído'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30'
                                  }`}>
                                  {order.statusServico}
                                </span>
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
                        <th className="rectilinear-th col-sm text-center">Status</th>
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
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{fc.dataEmissao}</div>
                            </td>
                            <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate" title={client?.razaoSocial}>
                              {client?.razaoSocial || '—'}
                            </td>
                            <td className="rectilinear-td text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-indigo-600 tabular-nums">L: {formatNumber(fc.valorLiquido ?? 0)}</span>
                                <span className="text-[9px] text-slate-400 opacity-50 line-through tabular-nums">B: {formatNumber(fc.valorBruto ?? 0)}</span>
                              </div>
                            </td>
                            <td className="rectilinear-td text-center text-xs font-black text-slate-500 uppercase tabular-nums">
                                {fc.serviceOrderId}
                            </td>
                            <td className="rectilinear-td text-center">
                                <div className="flex justify-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                        fc.statusPagamento === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600' :
                                        fc.statusPagamento === PaymentStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                                        'bg-rose-50 text-rose-600'
                                    }`}>
                                        {fc.statusPagamento}
                                    </span>
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
      />
    </div>
  );
}
