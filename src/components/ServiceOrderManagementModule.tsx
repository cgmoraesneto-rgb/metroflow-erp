import { useState, useMemo, useEffect } from 'react';
import { 
    ServiceOrder, 
    Client, 
    Quote, 
    InstrumentStatus, 
    CalibrationRecord, 
    CertificateStatus 
} from '../types';
import { 
    AlertTriangle, 
    CheckCircle2, 
    ClipboardList, 
    Search, 
    TrendingUp, 
    LayoutGrid, 
    List, 
    ChevronRight,
    Calendar,
    User,
    Clock,
    DollarSign,
    Package,
    Info,
    RefreshCw
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface ServiceOrderManagementModuleProps {
    serviceOrders: ServiceOrder[];
    clients: Client[];
    quotes?: Quote[];
    calibrationRecords?: CalibrationRecord[];
    onUpdateServiceOrder?: (id: string, data: Partial<ServiceOrder>) => void;
}

function scopeAlert(so: ServiceOrder, quote: Quote | undefined, records: CalibrationRecord[]) {
    if (!quote) return null;
    const budgetedTotal = quote.items.reduce((sum, item) => sum + (item.quantidade || 1), 0);
    const completedRecords = records.filter(
        r => r.serviceOrderId === so.id &&
            (r.status === CertificateStatus.APPROVED || r.status === CertificateStatus.READY_FOR_SENDING)
    ).length;
    const allRecords = records.filter(r => r.serviceOrderId === so.id && !r.isDraft).length;

    if (allRecords > budgetedTotal) {
        return { type: 'over', msg: `${allRecords} registros para ${budgetedTotal} unidades orçadas — possível cobrança adicional`, color: 'rose' };
    }
    if (completedRecords === budgetedTotal) {
        return { type: 'ok', msg: `Todos os ${budgetedTotal} instrumentos calibrados e aprovados`, color: 'emerald' };
    }
    return { type: 'pending', msg: `${completedRecords}/${budgetedTotal} instrumentos aprovados`, color: 'amber' };
}

export default function ServiceOrderManagementModule({
    serviceOrders,
    clients,
    quotes = [],
    calibrationRecords = [],
    onUpdateServiceOrder
}: ServiceOrderManagementModuleProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    
    // View mode management
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('tech_os_view_mode') as 'grid' | 'list') || 'list';
    });

    useEffect(() => {
        localStorage.setItem('tech_os_view_mode', viewMode);
    }, [viewMode]);

    const handleUpdateOS = (id: string, data: Partial<ServiceOrder>) => {
        if (!onUpdateServiceOrder) return;
        setSavingId(id);
        onUpdateServiceOrder(id, data);
        setTimeout(() => setSavingId(null), 800);
    };

    const filteredOS = useMemo(() =>
        serviceOrders.filter(os => {
            const client = clients.find(c => c.id === os.clienteId);
            return `${os.id} ${client?.razaoSocial} ${os.tecnicoExecutante}`.toLowerCase().includes(searchTerm.toLowerCase());
        }),
        [serviceOrders, clients, searchTerm]
    );

    const statusCls = (status: InstrumentStatus | string) => {
        const map: Record<string, string> = {
            [InstrumentStatus.DELIVERED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            [InstrumentStatus.CALIBRATED]: 'bg-blue-100 text-blue-700 border-blue-200',
            [InstrumentStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-700 border-amber-200',
            [InstrumentStatus.PENDING]: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        return map[status] || 'bg-slate-100 text-slate-500 border-slate-200';
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Gerenciamento de O.S.</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic italic">Gestão operacional e controle de escopo técnico-financeiro.</p>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="Buscar O.S., cliente ou técnico..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm transition-all dark:text-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
            {filteredOS.length} ordens de serviço ativas
        </div>
      </div>

      {/* LISTING SECTION (Layout Retilíneo Estrito) */}
      <div className="rectilinear-container custom-scrollbar shadow-sm">
        <table className="rectilinear-table">
          <thead>
            <tr>
              <th className="rectilinear-th col-sm text-center pl-8">O.S. ID</th>
              <th className="rectilinear-th col-lg text-center">Cliente Solicitante</th>
              <th className="rectilinear-th col-md text-center">Cronograma (E / S)</th>
              <th className="rectilinear-th col-md text-center">Técnico Resp.</th>
              <th className="rectilinear-th col-sm text-center">Status da O.S.</th>
              <th className="rectilinear-th col-md text-center pr-8">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredOS.map(os => {
                const client = clients.find(c => c.id === os.clienteId);
                const quote = quotes.find(q => q.id === os.orcamentoId);
                const alert = scopeAlert(os, quote, calibrationRecords);
                
                return (
                    <tr key={os.id} className="rectilinear-tr group">
                        <td className="rectilinear-td text-center pl-8 font-black text-slate-900 dark:text-white uppercase tabular-nums">
                            {os.id}
                        </td>
                        <td className="rectilinear-td text-left font-bold text-slate-600 dark:text-slate-400 truncate" title={client?.razaoSocial}>
                            {client?.razaoSocial || '—'}
                        </td>
                        <td className="rectilinear-td text-center">
                            <div className="flex items-center justify-center gap-2">
                                <div className="relative group/input">
                                    <input 
                                        type="date" 
                                        value={os.dataEntrada || ''} 
                                        onChange={e => handleUpdateOS(os.id, { dataEntrada: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-500 dark:text-slate-400 focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors text-center"
                                    />
                                </div>
                                <span className="text-slate-200">/</span>
                                <div className="relative group/input">
                                    <input 
                                        type="date" 
                                        value={os.dataSaida || ''} 
                                        onChange={e => handleUpdateOS(os.id, { dataSaida: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[11px] font-black text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer hover:text-indigo-700 transition-colors text-center"
                                    />
                                </div>
                            </div>
                        </td>
                        <td className="rectilinear-td text-center">
                            <input 
                                type="text" 
                                value={os.tecnicoExecutante || ''} 
                                onChange={e => handleUpdateOS(os.id, { tecnicoExecutante: e.target.value })}
                                className="w-full text-center bg-transparent border-none p-0 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 placeholder:italic"
                                placeholder="Definir..."
                            />
                        </td>
                        <td className="rectilinear-td text-center">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border shadow-sm ${statusCls(os.statusServico)}`}>
                                {os.statusServico}
                            </span>
                        </td>
                        <td className="rectilinear-td text-center pr-8">
                            <div className="flex items-center justify-center gap-2">
                                {alert && (
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border flex items-center gap-1.5 ${
                                        alert.color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' :
                                        alert.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                    }`}>
                                        {alert.type === 'over' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Info className="w-2.5 h-2.5" />}
                                        <span className="truncate max-w-[100px]">{alert.msg.split('—')[0]}</span>
                                    </div>
                                )}
                                {savingId === os.id ? (
                                    <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin shrink-0" />
                                ) : (
                                    <div title="Sync Ativado">
                                        <CheckCircle2 className="w-3 h-3 text-slate-200 dark:text-slate-800 shrink-0" />
                                    </div>
                                )}
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
