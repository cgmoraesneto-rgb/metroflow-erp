import { useState, useMemo } from 'react';
import { 
    CalibrationRecord, 
    ServiceOrder, 
    Client, 
    CertificateStatus, 
    Procedure, 
    StandardInstrument, 
    CertificateMask 
} from '../types';
import { 
    Search, 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    Clock, 
    FileText, 
    BarChart3, 
    Activity, 
    ChevronDown, 
    ChevronUp,
    List,
    Download,
    History as HistoryIcon,
    Share2,
    CheckCircle,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { generateCertificatePdf } from '../utils/pdfGenerator';
import { formatDate, formatNumber } from '../utils/formatters';

interface CalibrationHistoryModuleProps {
    calibrationRecords: CalibrationRecord[];
    serviceOrders: ServiceOrder[];
    clients: Client[];
    procedures: Procedure[];
    standardInstruments: StandardInstrument[];
    certificateMasks: CertificateMask[];
    onRevisionRequest: (record: CalibrationRecord) => void;
    onUpdateCertificateStatus?: (recordId: string, status: CertificateStatus, justification?: string) => void;
    documentTemplates?: any[];
    employees?: any[];
}

function Sparkline({ values, color = '#6366f1', height = 36 }: { values: number[]; color?: string; height?: number }) {
    if (values.length < 2) return <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">N/A</span>;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const w = 120;
    const h = height;
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - minV) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg width={w} height={h} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => {
                const x = (i / (values.length - 1)) * w;
                const y = h - ((v - minV) / range) * (h - 4) - 2;
                return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="white" strokeWidth="1" />;
            })}
        </svg>
    );
}

function daysBetween(a: string, b: string): number {
    return Math.abs(Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function CalibrationHistoryModule({
    calibrationRecords,
    serviceOrders,
    clients,
    procedures,
    standardInstruments,
    certificateMasks,
    onRevisionRequest,
    onUpdateCertificateStatus,
    documentTemplates = [],
    employees = []
}: CalibrationHistoryModuleProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedInstrument, setExpandedInstrument] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'instrument' | 'list'>('instrument');
    const { pdfState, generate: generatePdf } = usePdfGenerator();

    const instrumentGroups = useMemo(() => {
        const map = new Map<string, { records: CalibrationRecord[]; client?: Client }>();
        calibrationRecords.filter(r => !r.isDraft).forEach(record => {
            const so = serviceOrders.find(s => s.id === record.serviceOrderId);
            const client = clients.find(c => c.id === so?.clienteId);
            const key = record.instrumentName || 'Sem Nome';
            if (!map.has(key)) map.set(key, { records: [], client });
            map.get(key)!.records.push(record);
        });
        
        map.forEach(g => g.records.sort((a, b) => new Date(a.calibrationDate).getTime() - new Date(b.calibrationDate).getTime()));
        
        return Array.from(map.entries())
            .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (map.get(name)?.client?.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b[1].records.length - a[1].records.length);
    }, [calibrationRecords, serviceOrders, clients, searchTerm]);

    const handleDownloadPdf = (record: CalibrationRecord, isInternal: boolean) => {
        const so = serviceOrders.find(s => s.id === record.serviceOrderId);
        const client = clients.find(c => c.id === so?.clienteId);
        generatePdf(record, client, procedures, standardInstruments, certificateMasks, employees, false, isInternal, documentTemplates);
    };

    const handlePreviewPdf = async (record: CalibrationRecord, isInternal: boolean) => {
        const so = serviceOrders.find(s => s.id === record.serviceOrderId);
        const client = clients.find(c => c.id === so?.clienteId);
        const url = await generateCertificatePdf(record, client, procedures, standardInstruments, certificateMasks, employees, true, isInternal, documentTemplates);
        if (url) window.open(url as string, '_blank');
    };

    const statusBadge = (status: CertificateStatus | string | undefined) => {
        const s = status as CertificateStatus;
        const map: Record<CertificateStatus, { label: string; cls: string }> = {
            [CertificateStatus.PENDING]: { label: 'Pendente', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
            [CertificateStatus.BEING_MADE]: { label: 'Em Confecção', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
            [CertificateStatus.IN_ANALYSIS]: { label: 'Em Análise', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
            [CertificateStatus.APPROVED]: { label: 'Aprovado', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
            [CertificateStatus.READY_FOR_SENDING]: { label: 'Apto p/ Envio', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            [CertificateStatus.RETURNED]: { label: 'Correção', cls: 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' },
            [CertificateStatus.REJECTED]: { label: 'Rejeitado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
        };
        const info = map[s] || { label: status?.toString() || 'Pendente', cls: 'bg-slate-100 text-slate-500' };
        return <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${info.cls}`}>{info.label}</span>;
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Histórico & Rastreabilidade</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Análise de deriva e histórico metrológico completo.</p>
                    
                    <div className="relative max-w-md mt-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por instrumento ou cliente..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none font-bold text-sm transition-all shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setViewMode('instrument')}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'instrument' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest px-1">Deriva</span>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest px-1">Registros</span>
                    </button>
                </div>
            </div>

            {/* Instrument Groups View */}
            {viewMode === 'instrument' && (
                <div className="space-y-6">
                    {instrumentGroups.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                            <HistoryIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Nenhum registro histórico encontrado</p>
                        </div>
                    ) : (
                        instrumentGroups.map(([name, { records, client }]) => {
                            const isExpanded = expandedInstrument === name;
                            const lastRecord = records[records.length - 1];
                            const intervals = records.slice(1).map((r, i) => daysBetween(records[i].calibrationDate, r.calibrationDate));
                            const avgInterval = intervals.length ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length) : null;
                            const driftValues = records.map(r => r.resolution || 0);
                            const driftTrend = driftValues.length >= 2 ? driftValues[driftValues.length - 1] - driftValues[0] : 0;

                            return (
                                <div key={name} className="bg-white rounded-[2rem] border border-slate-100 hover:border-amber-400 hover:shadow-2xl transition-all group overflow-hidden">
                                    <button
                                        onClick={() => setExpandedInstrument(isExpanded ? null : name)}
                                        className="w-full flex flex-col md:flex-row items-center justify-between p-8 text-left gap-6 group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                                                <Activity className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 text-xl mb-1">{name}</h3>
                                                <p className="text-sm font-bold text-slate-500">{client?.razaoSocial || 'Cliente Indefinido'}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200">
                                                        {records.length} EVENTOS
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        DOC: {formatDate(lastRecord.calibrationDate)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-12">
                                            <div className="hidden lg:flex flex-col items-end gap-2">
                                                <Sparkline values={driftValues} color={driftTrend > 0 ? '#f43f5e' : '#10b981'} />
                                                <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${driftTrend > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {driftTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    Tendência: {driftTrend > 0 ? '+' : ''}{formatNumber(driftTrend, 3)}
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex flex-col items-end">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" /> Periodicidade Real
                                                </p>
                                                <p className="text-lg font-black text-slate-700 tabular-nums">
                                                    {avgInterval ? `~${avgInterval} dias` : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-all">
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                            </div>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden bg-slate-50/50"
                                            >
                                                <div className="px-10 pb-10 border-t border-slate-100 pt-8 relative">
                                                    <div className="absolute left-[3.15rem] top-8 bottom-10 w-1 bg-amber-200/50 rounded-full" />
                                                    <div className="space-y-6">
                                                        {records.map((record, idx) => (
                                                            <div key={record.id} className="flex items-start gap-8 pl-12 relative animate-in slide-in-from-left-4">
                                                                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 ${idx === records.length - 1 ? 'bg-amber-500 border-white shadow-lg ring-2 ring-amber-100' : 'bg-white border-slate-200'}`} />
                                                                <div className="flex-1 bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:border-amber-400 transition-all">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">O.S. {record.serviceOrderId}</span>
                                                                            <span className="text-base font-black text-slate-900">{record.certificateNumber}</span>
                                                                            {statusBadge(record.status)}
                                                                            {record.isPublished && (
                                                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center">
                                                                                    <Globe className="w-3 h-3 mr-1" /> No Portal
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                                                                                <p className="text-xs font-bold text-slate-700">{formatDate(record.calibrationDate)}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Técnico</p>
                                                                                <p className="text-xs font-bold text-slate-700">{record.technicianName || '—'}</p>
                                                                            </div>
                                                                            <div className="col-span-2">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observações</p>
                                                                                <p className="text-xs text-slate-500 font-medium italic">"{record.observations || 'Nenhuma nota registrada'}"</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center space-x-2">
                                                                        {(record.status === CertificateStatus.READY_FOR_SENDING || record.status === CertificateStatus.APPROVED) && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handlePreviewPdf(record, false)}
                                                                                    className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                                                                                >
                                                                                    <FileText className="w-3.5 h-3.5 mr-2" /> Ver PDF
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDownloadPdf(record, false)}
                                                                                    className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest"
                                                                                >
                                                                                    <Download className="w-3.5 h-3.5 mr-2" /> Baixar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDownloadPdf(record, true)}
                                                                                    className="flex items-center px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] border border-slate-200 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
                                                                                >
                                                                                    <BarChart3 className="w-3.5 h-3.5 mr-2" /> Memória
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => onRevisionRequest(record)}
                                                                                    className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-black text-[10px] border border-amber-100 hover:bg-amber-600 hover:text-white transition-all uppercase tracking-widest"
                                                                                >
                                                                                    <HistoryIcon className="w-3.5 h-3.5 mr-2" /> Revisionar
                                                                                </button>
                                                                                {!record.isPublished ? (
                                                                                    <button 
                                                                                        onClick={() => onUpdateCertificateStatus?.(record.id, record.status, 'Publicado pelo portal')}
                                                                                        className="flex items-center px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] border border-slate-200 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest" 
                                                                                        title="Publicar no Portal"
                                                                                    >
                                                                                        <Globe className="w-3.5 h-3.5 mr-2" /> Publicar
                                                                                    </button>
                                                                                ) : (
                                                                                    <button 
                                                                                        onClick={() => onUpdateCertificateStatus?.(record.id, record.status, 'Despublicado pelo portal')}
                                                                                        className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] border border-emerald-200 hover:bg-rose-600 hover:text-white transition-all uppercase tracking-widest" 
                                                                                        title="Remover do Portal"
                                                                                    >
                                                                                        <Globe className="w-3.5 h-3.5 mr-2" /> Despublicar
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* List View (Layout Retilíneo Estrito) */}
            {viewMode === 'list' && (
                <div className="rectilinear-container custom-scrollbar shadow-sm">
                    <table className="rectilinear-table">
                        <thead>
                            <tr>
                                <th className="rectilinear-th col-md text-center pl-8">Certificado / O.S.</th>
                                <th className="rectilinear-th col-sm text-center">Data Calib.</th>
                                <th className="rectilinear-th col-lg text-center">Cliente Solicitante</th>
                                <th className="rectilinear-th col-md text-center">Equipamento / Instrumento</th>
                                <th className="rectilinear-th col-md text-center">Status Técnico</th>
                                <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {calibrationRecords
                                .filter(r => !r.isDraft)
                                .filter(r => {
                                    const so = serviceOrders.find(s => s.id === r.serviceOrderId);
                                    const cl = clients.find(c => c.id === so?.clienteId);
                                    return `${r.certificateNumber} ${r.instrumentName} ${cl?.razaoSocial}`.toLowerCase().includes(searchTerm.toLowerCase());
                                })
                                .map(record => {
                                    const so = serviceOrders.find(s => s.id === record.serviceOrderId);
                                    const cl = clients.find(c => c.id === so?.clienteId);
                                    return (
                                        <tr key={record.id} className="rectilinear-tr group">
                                            <td className="rectilinear-td text-center pl-8">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-slate-900 dark:text-white font-black truncate tabular-nums">{record.certificateNumber}</span>
                                                    <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter tabular-nums">O.S. {record.serviceOrderId}</span>
                                                    {record.isPublished && (
                                                        <div className="flex items-center gap-1 mt-1 justify-center">
                                                            <Globe className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-[8px] font-bold text-emerald-500 uppercase">Publicado</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="rectilinear-td text-center font-mono text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                                                {formatDate(record.calibrationDate)}
                                            </td>
                                            <td className="rectilinear-td text-left font-bold text-slate-500 dark:text-slate-400 truncate" title={cl?.razaoSocial}>
                                                {cl?.razaoSocial || '—'}
                                            </td>
                                            <td className="rectilinear-td text-left font-black text-slate-800 dark:text-slate-200 truncate" title={record.instrumentName}>
                                                {record.instrumentName}
                                            </td>
                                            <td className="rectilinear-td text-center">
                                                <div className="flex justify-center">
                                                    {statusBadge(record.status)}
                                                </div>
                                            </td>
                                            <td className="rectilinear-td text-center pr-8">
                                                <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {(record.status === CertificateStatus.READY_FOR_SENDING || record.status === CertificateStatus.APPROVED) && (
                                                        <>
                                                            <div className="flex items-center gap-1 mr-2 border-r border-slate-100 dark:border-slate-800 pr-2">
                                                                <button onClick={() => handlePreviewPdf(record, false)} className="p-1.5 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all" title="Visualizar PDF"><FileText className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDownloadPdf(record, false)} className="p-1.5 text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all" title="Baixar PDF"><Download className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDownloadPdf(record, true)} className="p-1.5 text-purple-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all" title="Memória de Cálculo"><BarChart3 className="w-4 h-4" /></button>
                                                            </div>
                                                            <button onClick={() => onRevisionRequest(record)} className="p-1.5 text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all" title="Revisionar"><HistoryIcon className="w-4 h-4" /></button>
                                                            
                                                            {!record.isPublished ? (
                                                                <button 
                                                                    onClick={() => onUpdateCertificateStatus?.(record.id, record.status, 'Publicado pelo portal')}
                                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" 
                                                                    title="Publicar no Portal"
                                                                >
                                                                    <Globe className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => onUpdateCertificateStatus?.(record.id, record.status, 'Despublicado pelo portal')}
                                                                    className="p-1.5 text-emerald-500 hover:text-rose-500 transition-all" 
                                                                    title="Remover do Portal"
                                                                >
                                                                    <Globe className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PDF Status Overlay */}
            {pdfState === 'generating' && (
                <div className="fixed bottom-10 right-10 bg-black text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 z-[9999]">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Compilando Certificado...
                </div>
            )}
        </div>
    );
}
