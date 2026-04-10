import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Quote, ServiceOrder, FinancialControl, CalibrationRecord, InstrumentStatus, StandardInstrument, PaymentStatus, CertificateStatus, QuoteStatus } from '../types';
import { Users, FileText, ClipboardList, CircleDollarSign, Activity, CheckCircle, Clock, Calendar, AlertCircle, ChevronRight, ArrowUpRight, TrendingUp, PackageCheck, Hourglass, AlertTriangle, Database, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatCurrency } from '../utils/formatters';
import { migrateERPData } from '../utils/migration';
import { toast } from 'sonner';

interface DashboardModuleProps {
  clients: Client[];
  quotes: Quote[];
  serviceOrders: ServiceOrder[];
  financialControls: FinancialControl[];
  calibrationRecords: CalibrationRecord[];
  standardInstruments: StandardInstrument[];
  saveItem?: (collection: string, item: any) => Promise<void>;
  deleteItem?: (collection: string, id: string) => Promise<void>;
}

export default function DashboardModule({ 
  clients, quotes, serviceOrders, financialControls, calibrationRecords, standardInstruments,
  saveItem, deleteItem
}: DashboardModuleProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'standards'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  const today = new Date();

  // Filter by period
  const monthServiceOrders = serviceOrders.filter(os => os.dataEntrada?.startsWith(selectedMonth));
  const monthRecords = calibrationRecords.filter(r => r.calibrationDate?.startsWith(selectedMonth));

  // OS Metrics (Period)
  const openOS = monthServiceOrders.filter(os => os.statusServico === InstrumentStatus.PENDING).length;
  const inProgressOS = monthServiceOrders.filter(os => os.statusServico === InstrumentStatus.IN_PROGRESS).length;
  const completedOS = monthServiceOrders.filter(os =>
    os.statusServico === InstrumentStatus.CALIBRATED || os.statusServico === InstrumentStatus.DELIVERED
  ).length;

  // Certificate Metrics (Period)
  const issuedCerts = monthRecords.filter(r =>
    r.status === CertificateStatus.APPROVED || r.status === CertificateStatus.READY_FOR_SENDING
  ).length;
  
  // Pending Approval (Global)
  const pendingApproval = calibrationRecords.filter(r => r.status === CertificateStatus.IN_ANALYSIS).length;
  
  // Stats for Rate (Period)
  const monthApproved = monthRecords.filter(r => r.status === CertificateStatus.APPROVED || r.status === CertificateStatus.READY_FOR_SENDING).length;
  const monthRejected = monthRecords.filter(r => r.status === CertificateStatus.RETURNED || r.status === CertificateStatus.REJECTED).length;
  const totalDecided = monthApproved + monthRejected;
  const approvalRate = totalDecided > 0 ? Math.round((monthApproved / totalDecided) * 100) : null;

  // Quotes waiting for approval
  const pendingQuotes = quotes.filter(q => !q.status || q.status === QuoteStatus.PENDING).length;

  // Financial
  const filteredFinancials = financialControls.filter(f => f.dataEmissao.startsWith(selectedMonth));
  const totalBilled = filteredFinancials.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
  const totalReceived = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalToReceive = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PENDING).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalOverdue = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.OVERDUE).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);

  // Standards
  const expiredStandards = standardInstruments.filter(si => new Date(si.dataValidadeCalibracao) < today);
  const warningStandards = standardInstruments.filter(si => {
    const expiry = new Date(si.dataValidadeCalibracao);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  const kpiCards = [
    {
      label: 'O.S. Abertas',
      value: openOS,
      icon: Clock,
      lightBg: 'bg-slate-50',
      darkBg: 'dark:bg-slate-900/20',
      iconColor: 'text-slate-600',
      borderColor: 'hover:border-slate-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'O.S. Em Andamento',
      value: inProgressOS,
      icon: Activity,
      lightBg: 'bg-amber-50',
      darkBg: 'dark:bg-amber-900/20',
      iconColor: 'text-amber-600',
      borderColor: 'hover:border-amber-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'O.S. Concluídas',
      value: completedOS,
      icon: CheckCircle,
      lightBg: 'bg-emerald-50',
      darkBg: 'dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600',
      borderColor: 'hover:border-emerald-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'Certificados Emitidos',
      value: issuedCerts,
      icon: PackageCheck,
      lightBg: 'bg-indigo-50',
      darkBg: 'dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600',
      borderColor: 'hover:border-indigo-300',
      onClick: () => navigate('/qualidade'),
    },
    {
      label: 'Aguardando Aprovação',
      value: pendingApproval,
      icon: Hourglass,
      lightBg: 'bg-violet-50',
      darkBg: 'dark:bg-violet-900/20',
      iconColor: 'text-violet-600',
      borderColor: 'hover:border-violet-300',
      onClick: () => navigate('/qualidade'),
    },
    {
      label: 'Orçamentos Pendentes',
      value: pendingQuotes,
      icon: FileText,
      lightBg: 'bg-blue-50',
      darkBg: 'dark:bg-blue-900/20',
      iconColor: 'text-blue-600',
      borderColor: 'hover:border-blue-300',
      onClick: () => navigate('/comercial'),
    },
    {
      label: 'Padrões Vencendo (30d)',
      value: warningStandards.length + expiredStandards.length,
      icon: AlertTriangle,
      lightBg: 'bg-rose-50',
      darkBg: 'dark:bg-rose-900/20',
      iconColor: 'text-rose-600',
      borderColor: 'hover:border-rose-300',
      onClick: () => setActiveTab('standards'),
    },
    {
      label: 'Taxa de Aprovação',
      value: approvalRate !== null ? `${approvalRate}%` : '—',
      icon: TrendingUp,
      lightBg: 'bg-teal-50',
      darkBg: 'dark:bg-teal-900/20',
      iconColor: 'text-teal-600',
      borderColor: 'hover:border-teal-300',
      onClick: () => navigate('/qualidade'),
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Visão geral do ecossistema MetroFlow.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-indigo-500 ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-sm font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${activeTab === 'overview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('standards')}
              className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${activeTab === 'standards'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Validade de Padrões
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' ? (
            <>
              {(expiredStandards.length > 0 || warningStandards.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 rounded-2xl bg-gradient-to-r border flex items-start space-x-3 cursor-pointer hover:shadow-md transition-shadow
                    from-rose-50 to-orange-50 border-rose-200"
                  onClick={() => setActiveTab('standards')}
                >
                  <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">Atenção aos Padrões de Referência</h4>
                    <p className="text-sm text-rose-700 mt-1">
                      Você possui {expiredStandards.length > 0 ? <span className="font-extrabold">{expiredStandards.length} padrão(ões) vencido(s)</span> : null}
                      {expiredStandards.length > 0 && warningStandards.length > 0 ? ' e ' : ''}
                      {warningStandards.length > 0 ? <span className="font-extrabold">{warningStandards.length} padrão(ões) vencendo em menos de 30 dias</span> : null}.
                      <span className="underline ml-1">Clique aqui para verificar.</span>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {kpiCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={card.onClick}
                    className={`premium-card p-5 flex flex-col gap-3 cursor-pointer border border-transparent ${card.borderColor} hover:shadow-xl transition-all duration-300 group active:scale-95`}
                  >
                    <div className={`${card.lightBg} ${card.darkBg} p-3 rounded-2xl w-fit shadow-inner`}>
                      <card.icon className={`${card.iconColor} w-6 h-6`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-snug">{card.label}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{card.value}</p>
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                      <span>Ver detalhes</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* MAINTENANCE & STANDARDIZATION PANEL (PROMINENT POSITION) */}
              <div className="mt-10 p-8 rounded-[2.5rem] bg-indigo-900 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
                 <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                       <div className="flex items-center gap-5">
                          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 translate-y-0 group-hover:-translate-y-1 transition-transform">
                             <RefreshCw className="w-8 h-8 text-indigo-300 animate-[spin_10s_linear_infinite]" />
                          </div>
                          <div>
                             <h4 className="text-2xl font-black tracking-tight">Standardização da Base de Dados</h4>
                             <p className="text-indigo-200 text-sm font-medium mt-1">
                                Atualize todos os registros históricos (OS e Orçamentos) para o novo padrão **v26**.
                             </p>
                          </div>
                       </div>
                       
                       <button 
                          onClick={async () => {
                             if (!saveItem || !deleteItem) return;
                             const confirmed = confirm("ATENÇÃO: Este processo irá reescrever IDs de documentos históricos (OCW, OS, Certificados) para o novo padrão v26. Esta ação é irreversível. Deseja prosseguir?");
                             if (!confirmed) return;

                             const t = toast.loading("Standardizando base de dados...");
                             try {
                                const result = migrateERPData(quotes, serviceOrders, calibrationRecords, financialControls);
                                
                                for (const q of result.quotes) await saveItem('quotes', q);
                                for (const os of result.serviceOrders) await saveItem('service_orders', os);
                                for (const r of result.calibrationRecords) await saveItem('calibration_records', r);
                                for (const f of result.financialControls) await saveItem('financial_controls', f);

                                const oldQuoteIds = quotes.map(q => q.id);
                                for (const id of oldQuoteIds) {
                                   if (!result.quotes.find(nq => nq.id === id)) await deleteItem('quotes', id);
                                }
                                const oldOSIds = serviceOrders.map(os => os.id);
                                for (const id of oldOSIds) {
                                   if (!result.serviceOrders.find(no => no.id === id)) await deleteItem('service_orders', id);
                                }

                                toast.success("Base de dados standardizada com sucesso!", { id: t });
                                setTimeout(() => window.location.reload(), 2000);
                             } catch (e) {
                                toast.error("Erro durante a migração.", { id: t });
                                console.error(e);
                             }
                          }}
                          className="w-full md:w-auto px-8 py-5 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
                       >
                          Executar Standardização v26
                       </button>
                    </div>
                 </div>
              </div>

              {/* Financial Summary */}
              <div className="mt-10 premium-card p-8 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full mr-4"></div>
                    Resumo Financeiro
                  </h3>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">{selectedMonth}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Faturado', value: totalBilled, colorClass: 'text-blue-500' },
                    { label: 'Recebido', value: totalReceived, colorClass: 'text-emerald-500' },
                    { label: 'A Receber', value: totalToReceive, colorClass: 'text-amber-500' },
                    { label: 'Atrasado', value: totalOverdue, colorClass: 'text-rose-500' }
                  ].map((item) => (
                    <div key={item.label} className="p-5 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">{item.label}</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/financeiro')}
                  className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all group active:scale-95"
                >
                  <span>Ver Módulo Financeiro</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>

              {/* OS Status + Cert Approval Rate side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="premium-card p-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                    Status das O.S.
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Abertas', value: openOS, icon: Clock, iconColor: 'text-slate-600', route: '/logistica' },
                      { label: 'Em Andamento', value: inProgressOS, icon: Activity, iconColor: 'text-amber-600', route: '/logistica' },
                      { label: 'Concluídas', value: completedOS, icon: CheckCircle, iconColor: 'text-emerald-600', route: '/logistica' }
                    ].map((item) => (
                      <div
                        key={item.label}
                        onClick={() => navigate(item.route)}
                        className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 ${item.iconColor}`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-black text-slate-900 dark:text-white">{item.value}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-card p-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center">
                    <div className="w-2 h-8 bg-violet-600 rounded-full mr-4"></div>
                    Certificados
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Aguardando Aprovação', value: pendingApproval, iconColor: 'text-amber-600', icon: Hourglass, route: '/qualidade' },
                      { label: 'Aprovados', value: monthApproved, iconColor: 'text-emerald-600', icon: CheckCircle, route: '/qualidade' },
                      { label: 'Devolvidos p/ Correção', value: monthRejected, iconColor: 'text-rose-600', icon: AlertCircle, route: '/qualidade' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        onClick={() => navigate(item.route)}
                        className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 ${item.iconColor}`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-black text-slate-900 dark:text-white">{item.value}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    ))}
                    {approvalRate !== null && (
                      <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800/50 flex items-center justify-between">
                        <span className="text-sm font-bold text-teal-700 dark:text-teal-400">Taxa de Aprovação</span>
                        <span className="text-2xl font-black text-teal-700 dark:text-teal-300">{approvalRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="premium-card p-10">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 flex items-center">
                <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                Controle de Validade de Padrões
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] border border-rose-100 dark:border-rose-800/50 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">Padrões Vencidos</p>
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <p className="text-5xl font-black text-rose-900 dark:text-white">{expiredStandards.length}</p>
                </div>
                <div className="p-8 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] border border-amber-100 dark:border-amber-800/50 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Vencendo em 30 dias</p>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-5xl font-black text-amber-900 dark:text-white">{warningStandards.length}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="p-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Padrão</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identificação</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Validade</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {standardInstruments.map(si => {
                      const expiry = new Date(si.dataValidadeCalibracao);
                      const isExpired = expiry < today;
                      const isWarning = !isExpired && (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 30;

                      return (
                        <tr key={si.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="p-5">
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{si.nome}</p>
                          </td>
                          <td className="p-5 text-sm text-slate-500 dark:text-slate-400 font-medium">{si.identificacao}</td>
                          <td className="p-5 text-sm text-slate-500 dark:text-slate-400 font-medium">{formatDate(si.dataValidadeCalibracao)}</td>
                          <td className="p-5 text-right">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block ${isExpired ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                              isWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}>
                              {isExpired ? 'Criticamente Vencido' : isWarning ? 'Atenção: Vencendo' : 'Regular'}
                            </span>
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
    </div>
  );
}
