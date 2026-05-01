import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Quote, ServiceOrder, FinancialControl, CalibrationRecord, InstrumentStatus, StandardInstrument, PaymentStatus, CertificateStatus, QuoteStatus } from '../types';
import { Users, FileText, ClipboardList, CircleDollarSign, Activity, CheckCircle, Clock, Calendar, AlertCircle, ChevronRight, ArrowUpRight, TrendingUp, PackageCheck, Hourglass, AlertTriangle, Database, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
} from 'chart.js';
import { Bar, Doughnut, Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
);

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

  // --- SAFE DATE HELPERS ---
  const isValidDate = (date: any) => date instanceof Date && !isNaN(date.getTime());
  const safeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
  };

  // --- ROBUST DATA PROCESSING (Process Flow Logic) ---
  const [currentYear, currentMonth] = selectedMonth.split('-');
  const isAnnual = currentMonth === 'all';
  const filterPrefix = isAnnual ? currentYear : selectedMonth;

  // 1. Commercial Metrics (Sales Pipeline) - MUST BE FIRST
  const monthEmittedQuotes = quotes.filter(q => 
    q.dataEmissao?.startsWith(filterPrefix) && 
    (!q.revision || q.revision === 0)
  );
  
  const monthApprovedQuotes = monthEmittedQuotes.filter(q => q.status === QuoteStatus.APPROVED).length;
  const monthRejectedQuotes = monthEmittedQuotes.filter(q => q.status === QuoteStatus.REJECTED).length;
  const monthPendingQuotes = monthEmittedQuotes.filter(q => !q.status || q.status === QuoteStatus.PENDING).length;

  const globalPendingQuotes = quotes.filter(q => 
    (!q.status || q.status === QuoteStatus.PENDING) &&
    (!q.revision || q.revision === 0)
  ).length;

  // 2. OS Metrics (Operational Workload & Throughput)
  // Workload: Global state (what's currently in the lab)
  const globalOpenOS = serviceOrders.filter(os => os.statusServico === InstrumentStatus.PENDING).length;
  const globalInProgressOS = serviceOrders.filter(os => os.statusServico === InstrumentStatus.IN_PROGRESS).length;
  
  // Throughput: Specific Month/Year Quote Conversions
  const aprilOS = serviceOrders.filter(os => 
    monthEmittedQuotes.some(q => q.id === os.orcamentoId)
  );

  const monthCompletedOS = aprilOS.filter(os => 
    os.statusServico === InstrumentStatus.CALIBRATED || 
    os.statusServico === InstrumentStatus.DELIVERED
  );

  const monthCalibratedCount = aprilOS.filter(os => os.statusServico === InstrumentStatus.CALIBRATED).length;
  const monthDeliveredCount = aprilOS.filter(os => os.statusServico === InstrumentStatus.DELIVERED).length;
  const monthGeneratedOSCount = aprilOS.length;

  // 3. Certificate Metrics (Quality Sign-off)
  // Issued in period: Based on approval date (sign-off)
  const monthIssuedCerts = calibrationRecords.filter(r => 
    r.approvedAt?.startsWith(filterPrefix) &&
    (r.status === CertificateStatus.APPROVED || r.status === CertificateStatus.READY_FOR_SENDING)
  );
  
  // Pending Approval: Global workload for reviewers
  const globalPendingApproval = calibrationRecords.filter(r => 
    r.status === CertificateStatus.IN_ANALYSIS || r.status === CertificateStatus.PENDING
  ).length;
  
  // Accuracy Rate (Monthly/Annual)
  const monthApprovedCount = monthIssuedCerts.length;
  const monthRejectedCount = calibrationRecords.filter(r => 
    r.approvedAt?.startsWith(filterPrefix) && 
    (r.status === CertificateStatus.RETURNED || r.status === CertificateStatus.REJECTED)
  ).length;
  const totalDecided = monthApprovedCount + monthRejectedCount;
  const approvalRate = totalDecided > 0 ? Math.round((monthApprovedCount / totalDecided) * 100) : null;

  // Conversion rate (Quotes that became OS)
  const monthConvertedToOS = monthEmittedQuotes.filter(q => 
    serviceOrders.some(os => os.orcamentoId === q.id)
  );

  const conversionRate = monthEmittedQuotes.length > 0 
    ? Math.round((monthConvertedToOS.length / monthEmittedQuotes.length) * 100) 
    : 0;

  // Traceability: Approved quotes without OS
  const approvedWithoutOS = monthEmittedQuotes.filter(q => 
    q.status === QuoteStatus.APPROVED &&
    !serviceOrders.some(os => os.orcamentoId === q.id)
  );

  // Top 10 Instruments Sold (Approved Quotes)
  const topInstrumentsMap = new Map<string, number>();
  const approvedQuotesForTop10 = monthEmittedQuotes.filter(q => q.status === QuoteStatus.APPROVED);
  approvedQuotesForTop10.forEach(q => {
    q.items.forEach(item => {
      if (item.descricao) {
        const current = topInstrumentsMap.get(item.descricao) || 0;
        topInstrumentsMap.set(item.descricao, current + item.quantidade);
      }
    });
  });

  const top10Instruments = Array.from(topInstrumentsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 4. Financial Metrics (Revenue Recognition)
  // Group by serviceOrderId to avoid double counting from revisions
  const financialMap = new Map<string, FinancialControl>();
  financialControls.forEach(f => {
    if (f.dataEmissao.startsWith(filterPrefix)) {
      // Only keep the latest record for a service order if multiples exist
      if (!f.serviceOrderId || !financialMap.has(f.serviceOrderId)) {
        financialMap.set(f.serviceOrderId || f.id || Math.random().toString(), f);
      }
    }
  });
  
  const filteredFinancials = Array.from(financialMap.values());
  const totalBilled = filteredFinancials.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
  const totalReceived = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalToReceive = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.PENDING).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);
  const totalOverdue = filteredFinancials.filter(f => f.statusPagamento === PaymentStatus.OVERDUE).reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);



  // Standards
  const expiredStandards = standardInstruments.filter(si => {
    const expiry = safeDate(si.dataValidadeCalibracao);
    return expiry && expiry < today;
  });
  
  const warningStandards = standardInstruments.filter(si => {
    const expiry = safeDate(si.dataValidadeCalibracao);
    if (!expiry) return false;
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  const comercialKPIs = [
    {
      label: 'Orçamentos Emitidos',
      value: monthEmittedQuotes.length,
      icon: FileText,
      lightBg: 'bg-blue-50',
      darkBg: 'dark:bg-blue-900/20',
      iconColor: 'text-blue-600',
      borderColor: 'hover:border-blue-300',
      onClick: () => navigate('/comercial'),
    },
    {
      label: 'Orçamentos Aguardando Fechamento',
      value: globalPendingQuotes,
      icon: Clock,
      lightBg: 'bg-slate-50',
      darkBg: 'dark:bg-slate-900/20',
      iconColor: 'text-slate-600',
      borderColor: 'hover:border-slate-300',
      onClick: () => navigate('/comercial'),
    },
  ];

  const operacionalKPIs = [
    {
      label: 'O.S. Abertas (Carga Atual)',
      value: globalOpenOS,
      icon: Clock,
      lightBg: 'bg-slate-50',
      darkBg: 'dark:bg-slate-900/20',
      iconColor: 'text-slate-600',
      borderColor: 'hover:border-slate-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'O.S. Em Andamento',
      value: globalInProgressOS,
      icon: Activity,
      lightBg: 'bg-amber-50',
      darkBg: 'dark:bg-amber-900/20',
      iconColor: 'text-amber-600',
      borderColor: 'hover:border-amber-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'O.S. Finalizadas (Mês)',
      value: monthCompletedOS.length,
      icon: CheckCircle,
      lightBg: 'bg-emerald-50',
      darkBg: 'dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600',
      borderColor: 'hover:border-emerald-300',
      onClick: () => navigate('/logistica'),
    },
    {
      label: 'Certificados Emitidos',
      value: monthIssuedCerts.length,
      icon: PackageCheck,
      lightBg: 'bg-indigo-50',
      darkBg: 'dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600',
      borderColor: 'hover:border-indigo-300',
      onClick: () => navigate('/qualidade'),
    },
    {
      label: 'Certificados em Análise Técnica',
      value: globalPendingApproval,
      icon: Hourglass,
      lightBg: 'bg-violet-50',
      darkBg: 'dark:bg-violet-900/20',
      iconColor: 'text-violet-600',
      borderColor: 'hover:border-violet-300',
      onClick: () => navigate('/qualidade'),
    },
    {
      label: 'Índice de Conformidade Técnica',
      value: approvalRate !== null ? `${approvalRate}%` : '—',
      icon: TrendingUp,
      lightBg: 'bg-teal-50',
      darkBg: 'dark:bg-teal-900/20',
      iconColor: 'text-teal-600',
      borderColor: 'hover:border-teal-300',
      onClick: () => navigate('/qualidade'),
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
  ];

  // --- ANALYTICS DATA PROCESSING ---

  // 1. Period Trends (Last 6 Months or 12 Months if Annual)
  const getTrendData = () => {
    const months: string[] = [];
    const year = filterPrefix.substring(0, 4);

    if (isAnnual) {
      // Show all 12 months of the selected year
      for (let i = 1; i <= 12; i++) {
        months.push(`${year}-${i.toString().padStart(2, '0')}`);
      }
    } else {
      // Show last 6 months leading up to the selected month
      const [y, m] = selectedMonth.split('-');
      const yearNum = parseInt(y);
      const monthNum = parseInt(m);
      
      if (!isNaN(yearNum) && !isNaN(monthNum)) {
        const date = new Date(yearNum, monthNum - 1, 1);
        for (let i = 5; i >= 0; i--) {
          const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
          if (isValidDate(d)) {
            months.push(d.toISOString().substring(0, 7));
          }
        }
      }
    }

    const labels = months.map(m => {
      const parts = m.split('-');
      if (parts.length < 2) return m;
      const [y, mm] = parts;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthIdx = parseInt(mm) - 1;
      return `${monthNames[monthIdx] || '?'}/${y.substring(2)}`;
    });

    const billingData = months.map(m => 
      financialControls.filter(f => f.dataEmissao.startsWith(m))
        .reduce((acc, curr) => acc + (curr.valorBruto || 0), 0)
    );

    const osVolumeData = months.map(m => 
      serviceOrders.filter(os => os.dataEntrada?.startsWith(m)).length
    );

    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: 'Volume O.S.',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 3,
          fill: false,
          data: osVolumeData,
          yAxisID: 'y1',
          tension: 0.4,
          pointBackgroundColor: 'rgb(99, 102, 241)',
        },
        {
          type: 'bar' as const,
          label: 'Faturamento',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          data: billingData,
          yAxisID: 'y',
          borderRadius: 8,
        },
      ],
    };
  };

  // 2. Top 5 Clients (Revenue)
  const getTopClients = () => {
    const clientRevenue: Record<string, number> = {};
    filteredFinancials.forEach(f => {
      if (f.clienteId) {
        clientRevenue[f.clienteId] = (clientRevenue[f.clienteId] || 0) + (f.valorBruto || 0);
      }
    });

    return Object.entries(clientRevenue)
      .map(([id, revenue]) => ({
        name: clients.find(c => c.id === id)?.razaoSocial || id,
        revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // 3. Service Mix (Current Global Mix)
  const getServiceMix = () => {
    const osMix = {
      'Concluídas (Mês)': monthCompletedOS.length,
      'Em Andamento (Global)': globalInProgressOS,
      'Pendentes (Global)': globalOpenOS
    };

    return {
      labels: Object.keys(osMix),
      datasets: [{
        data: Object.values(osMix),
        backgroundColor: [
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(100, 116, 139, 0.6)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(100, 116, 139)',
        ],
        borderWidth: 2,
      }]
    };
  };

  // 4. Avg Lead Time (Days from Entry to Exit)
  const getAvgLeadTime = () => {
    // Lead time is calculated for OS FINISHED in the month
    if (monthCompletedOS.length === 0) return 0;

    const totalDays = monthCompletedOS.reduce((acc, os) => {
      const start = safeDate(os.dataEntrada);
      const end = safeDate(os.dataSaidaReal);
      
      if (!start || !end) return acc;
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return acc + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, 0);

    return Math.round(totalDays / monthCompletedOS.length);
  };

  const topClients = getTopClients();
  const maxRevenue = topClients.length > 0 ? topClients[0].revenue : 1;
  const avgLeadTime = getAvgLeadTime();

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Ecossistema MetroFlow</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Dashboard</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-indigo-500 ml-2" />
            <select
              value={currentMonth}
              onChange={(e) => {
                setSelectedMonth(`${currentYear}-${e.target.value}`);
              }}
              className="bg-transparent border-none text-xs font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 px-2"
            >
              <option value="all">Relatório Anual</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800"></div>
            <select
              value={currentYear}
              onChange={(e) => {
                setSelectedMonth(`${e.target.value}-${currentMonth}`);
              }}
              className="bg-transparent border-none text-xs font-black text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0 px-2"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
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
              Padrões
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

              {/* 1. SECTION: COMERCIAL */}
              <div className="mb-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
                  <div className="w-2 h-8 bg-blue-600 rounded-full mr-4"></div>
                  Dados de Orçamento (Comercial)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {comercialKPIs.map((card, i) => (
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
                      
                      {card.label === 'Orçamentos Emitidos' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-emerald-500 uppercase">Aprovados</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthApprovedQuotes}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-rose-500 uppercase">Reprovados</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthRejectedQuotes}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-amber-500 uppercase">Pendentes (Mês)</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthPendingQuotes}</span>
                          </div>
                        </div>
                      )}

                      {card.label === 'Orçamentos Aguardando Fechamento' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-indigo-500 uppercase">Taxa de Conversão</span>
                            <span className="text-slate-700 dark:text-slate-300">{conversionRate}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${conversionRate}%` }}
                              className="h-full bg-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors mt-auto pt-2">
                        <span>Ver detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                      </div>
                    </motion.div>
                  ))}

                  {/* Top 10 Instrumentos Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="premium-card p-5 flex flex-col md:col-span-2 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 p-2.5 rounded-xl w-fit mr-3">
                        <TrendingUp className="w-5 h-5 text-fuchsia-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Top 10 Instrumentos Mais Vendidos</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isAnnual ? 'No Ano' : 'No Mês'}</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[160px]">
                      {top10Instruments.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
                          Nenhum dado de venda para este período.
                        </div>
                      ) : (
                        top10Instruments.map(([descricao, qtde], idx) => {
                          const maxQtde = top10Instruments[0][1];
                          const percentage = Math.round((qtde / maxQtde) * 100);
                          return (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-700 dark:text-slate-300 truncate pr-2 max-w-[200px]" title={descricao}>{idx + 1}. {descricao}</span>
                                <span className="text-fuchsia-600 tabular-nums">{qtde} un</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-fuchsia-400 to-fuchsia-600 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* 2. SECTION: LOGÍSTICA / TÉCNICO */}
              <div className="mb-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
                  <div className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></div>
                  Dados Logística / Técnico (Operacional)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                  {operacionalKPIs.map((card, i) => (
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

                      {card.label === 'O.S. Finalizadas (Mês)' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-emerald-600 uppercase tracking-tighter">Calibrados</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthCalibratedCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-blue-600 uppercase tracking-tighter">Entregues</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthDeliveredCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold mt-1 pt-1 border-t border-slate-50 dark:border-slate-800/50">
                            <span className="text-indigo-500 uppercase tracking-tighter">Total Gerado (Mês)</span>
                            <span className="text-slate-700 dark:text-slate-300">{monthGeneratedOSCount}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors mt-auto pt-2">
                        <span>Ver detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Lead Time Card */}
                  <div className="lg:col-span-1 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-center items-center text-center">
                    <div className="p-4 bg-white/10 rounded-2xl mb-4">
                      <TrendingUp className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Lead Time Médio</p>
                    <p className="text-5xl font-black mt-2">{avgLeadTime} <span className="text-lg font-bold opacity-60">Dias</span></p>
                    <p className="text-xs mt-4 opacity-70 font-medium max-w-[200px]">Eficiência operacional entre entrada e saída.</p>
                  </div>

                  {/* Service Mix Chart */}
                  <div className="lg:col-span-2 premium-card p-6 flex flex-col items-center justify-center">
                    <div className="flex items-center space-x-8">
                      <div className="w-40 h-40">
                        <Doughnut 
                          data={getServiceMix()} 
                          options={{ cutout: '75%', plugins: { legend: { display: false } } }}
                        />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Composição de Serviços</h4>
                        {getServiceMix().labels.map((label, i) => (
                          <div key={label} className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getServiceMix().datasets[0].backgroundColor[i] }}></div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SECTION: FATURAMENTO */}
              <div className="mb-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full mr-4"></div>
                  Dados de Faturamento (Financeiro)
                </h3>
                <div className="premium-card p-8 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {[
                      { label: 'Faturado', value: totalBilled },
                      { label: 'Recebido', value: totalReceived },
                      { label: 'A Receber', value: totalToReceive },
                      { label: 'Atrasado', value: totalOverdue }
                    ].map((item) => (
                      <div key={item.label} className="p-5 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">{item.label}</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top Clients */}
                    <div className="lg:col-span-1 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 5 Clientes</h4>
                      {topClients.map((client, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span className="truncate max-w-[120px]">{client.name}</span>
                            <span>{formatCurrency(client.revenue)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(client.revenue / maxRevenue) * 100}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Trend Chart */}
                    <div className="lg:col-span-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-right">Comparativo: Volume de O.S. vs. Faturamento</h4>
                      <div className="h-[250px]">
                        <Chart 
                          type='bar'
                          data={getTrendData()} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                              legend: { 
                                display: true,
                                position: 'top',
                                align: 'end',
                                labels: {
                                  boxWidth: 8,
                                  usePointStyle: true,
                                  pointStyle: 'circle',
                                  font: { size: 10, weight: 'bold' }
                                }
                              },
                              tooltip: {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                titleFont: { size: 12, weight: 'bold' },
                                bodyFont: { size: 12 },
                                padding: 12,
                                cornerRadius: 12,
                                displayColors: true
                              }
                            },
                            scales: {
                              y: { 
                                display: true, 
                                position: 'left',
                                grid: { display: false },
                                ticks: { 
                                  font: { size: 9, weight: 'bold' },
                                  callback: (val) => formatCurrency(Number(val))
                                }
                              },
                              y1: { 
                                display: true, 
                                position: 'right',
                                grid: { display: false },
                                ticks: { 
                                  font: { size: 9, weight: 'bold' },
                                  stepSize: 1
                                }
                              },
                              x: { 
                                grid: { display: false }, 
                                ticks: { font: { size: 9, weight: 'bold' } } 
                              }
                            }
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/financeiro')}
                    className="w-full mt-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg transition-all group active:scale-95"
                  >
                    <span>Acessar Módulo Financeiro</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
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
                      const expiry = safeDate(si.dataValidadeCalibracao);
                      const isExpired = expiry && expiry < today;
                      const isWarning = expiry && !isExpired && (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 30;

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
