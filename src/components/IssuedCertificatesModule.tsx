import { useState, useEffect } from 'react';
import { CalibrationRecord, CertificateStatus, Client, ServiceOrder } from '../types';
import { 
    Search,
    Download,
    Eye,
    ShieldCheck,
    History,
    ChevronRight,
    ChevronDown,
    Printer,
    User,
    Calendar,
    Activity,
    LayoutGrid,
    List,
    Share2,
    CheckCircle,
    FileText,
    RotateCcw,
    AlertTriangle,
    X,
    Trash2
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { generateClientReportPdf, generateCertificatePdf } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface IssuedCertificatesModuleProps {
    calibrationRecords: CalibrationRecord[];
    clients: Client[];
    serviceOrders: ServiceOrder[];
    onUpdateCertificateStatus: (recordId: string, status: CertificateStatus, justification?: string) => void;
    documentTemplates?: any[];
    searchQuery?: string;
}

export default function IssuedCertificatesModule({
    calibrationRecords,
    clients,
    serviceOrders,
    onUpdateCertificateStatus,
    documentTemplates = [],
    searchQuery
}: IssuedCertificatesModuleProps) {
    const { employee } = useAuth();
    const { saveItem, deleteItem, procedures, standardInstruments, certificateMasks, employees = [] } = useData();
    const [revisionDetailTarget, setRevisionDetailTarget] = useState<CalibrationRecord | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('issued_certs_view_mode') as 'grid' | 'list') || 'list';
    });
    const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

    const issuedRecords = (calibrationRecords || []).filter(record => {
        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
        const client = clients.find(c => c.id === serviceOrder?.clienteId);
        
        const isIssued = record.status === CertificateStatus.READY_FOR_SENDING || serviceOrder?.isCertificateSent;
        if (!isIssued) return false;
        if (!searchQuery) return true;

        const term = searchQuery.toLowerCase().trim();
        const digits = term.replace(/\D/g, '');

        const searchStr = `${record.certificateNumber || ''} ${record.instrumentName || ''} ${client?.razaoSocial || ''} ${record.serviceOrderId || ''} ${serviceOrder?.orcamentoId || ''} ${client?.cnpj || ''}`.toLowerCase();
        const matchesText = searchStr.includes(term);

        if (matchesText) return true;

        if (digits && digits.length >= 3) {
            const certDigits = (record.certificateNumber || "").replace(/\D/g, '');
            const osDigits = (record.serviceOrderId || "").replace(/\D/g, '');
            const cnpjDigits = (client?.cnpj || "").replace(/\D/g, '');
            if (certDigits.includes(digits) || osDigits.includes(digits) || cnpjDigits.includes(digits)) return true;
        }

        return false;
    });

    // Grouping logic
    const groupedData: Record<string, Record<number, CalibrationRecord[]>> = {};
    issuedRecords.forEach(record => {
        const so = serviceOrders.find(s => s.id === record.serviceOrderId);
        const client = clients.find(c => c.id === so?.clienteId);
        const clientName = client?.razaoSocial || 'Cliente não identificado';
        const year = new Date(record.calibrationDate).getFullYear();

        if (!groupedData[clientName]) groupedData[clientName] = {};
        if (!groupedData[clientName][year]) groupedData[clientName][year] = [];
        groupedData[clientName][year].push(record);
    });

    // Sort records within groups
    Object.values(groupedData).forEach(years => {
        Object.values(years).forEach(recs => {
            recs.sort((a, b) => b.certificateNumber.localeCompare(a.certificateNumber));
        });
    });

    const toggleClient = (client: string) => {
        setExpandedClients(prev => ({ ...prev, [client]: !prev[client] }));
    };

    const toggleYear = (clientYear: string) => {
        setExpandedYears(prev => ({ ...prev, [clientYear]: !prev[clientYear] }));
    };

    const handleClientReport = async (clientName: string, year: number) => {
        const client = clients.find(c => c.razaoSocial === clientName);
        const yearRecords = groupedData[clientName][year];
        
        if (!yearRecords || yearRecords.length === 0) {
            toast.error('Nenhum registro encontrado para este ano.');
            return;
        }

        toast.info(`Gerando relatório consolidado (${year}) para: ${clientName}`);
        try {
            await generateClientReportPdf(yearRecords, client, year, documentTemplates);
        } catch (err) {
            console.error("Client report generation error:", err);
            toast.error("Erro ao gerar relatório consolidado.");
        }
    };

    const handleUnpublish = async (record: CalibrationRecord, reason: string) => {
        await saveItem('calibration_records', { ...record, isPublished: false, revisionRequested: false });
        toast.success(`Certificado ${record.certificateNumber} despublicado do portal.`);
    };

    const handleCancelCertificate = async (record: CalibrationRecord) => {
        if (!window.confirm(`Cancelar permanentemente o certificado ${record.certificateNumber}? Esta ação irá removê-lo do portal do cliente.`)) return;
        await saveItem('calibration_records', { ...record, isPublished: false, isCancelled: true, revisionRequested: false });
        toast.success('Certificado cancelado e removido do portal.');
    };

    const handleAcknowledgeRevision = async (record: CalibrationRecord) => {
        await saveItem('calibration_records', { ...record, revisionRequested: false, isPublished: false, revisionReason: record.revisionReason });
        toast.info(`Revisão do certificado ${record.certificateNumber} iniciada — despublicado do portal.`);
    };

    const handleDownloadPdf = async (record: CalibrationRecord) => {
        toast.info('Gerando certificado para download...');
        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
        const client = clients.find(c => c.id === serviceOrder?.clienteId);
        await generateCertificatePdf(record, client, procedures, standardInstruments, certificateMasks, employees, false, false, documentTemplates, []);
    };

    const handlePreviewPdf = async (record: CalibrationRecord) => {
        toast.info('Gerando preview do certificado...');
        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
        const client = clients.find(c => c.id === serviceOrder?.clienteId);
        const url = await generateCertificatePdf(record, client, procedures, standardInstruments, certificateMasks, employees, true, false, documentTemplates, []);
        if (url) window.open(url as string, '_blank');
    };

    const toggleViewMode = () => {
        const next = viewMode === 'grid' ? 'list' : 'grid';
        setViewMode(next);
        localStorage.setItem('issued_certs_view_mode', next);
    };

    const sortedClients = Object.keys(groupedData).sort();

    return (
        <>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Certificados Emitidos</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Histórico completo de certificados aprovados e enviados aos clientes.</p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-end">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        Total: {issuedRecords.length} Certificados
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {sortedClients.length === 0 ? (
                    <div className="py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                        <History className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-400 font-black text-lg tabular-nums">Nenhum certificado emitido encontrado</p>
                    </div>
                ) : (
                    sortedClients.map(clientName => (
                        <div key={clientName} className="border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            {/* Client Header */}
                            <div 
                                onClick={() => toggleClient(clientName)}
                                className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg">{clientName}</h3>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {expandedClients[clientName] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>

                            {/* Years and Records */}
                            {expandedClients[clientName] && (
                                <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
                                    {Object.keys(groupedData[clientName]).sort((a, b) => Number(b) - Number(a)).map(year => {
                                        const clientYearKey = `${clientName}-${year}`;
                                        return (
                                            <div key={year} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                                <div 
                                                    onClick={() => toggleYear(clientYearKey)}
                                                    className="p-4 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                                >
                                                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-widest">{year}</span>
                                                    <div className="flex items-center space-x-4">
                                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">{groupedData[clientName][Number(year)].length} Certificados</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleClientReport(clientName, Number(year)); }}
                                                            className="p-1.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-all shadow-sm"
                                                            title="Gerar Relatório Anual"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedYears[clientYearKey] && (
                                                    <div className="rectilinear-container max-h-[400px] custom-scrollbar overflow-x-auto">
                                                        <table className="rectilinear-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className="rectilinear-th col-md text-center pl-8">Doc. / Revisão</th>
                                                                    <th className="rectilinear-th col-lg text-center">Equipamento / Instrumento</th>
                                                                    <th className="rectilinear-th col-md text-center">Status no Portal</th>
                                                                    <th className="rectilinear-th col-md text-center pr-8">Gestão Administrativa</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                                {groupedData[clientName][Number(year)].map(record => {
                                                                    const isRevision = !!record.revisionOf;
                                                                    return (
                                                                         <tr key={record.id} className="rectilinear-tr group">
                                                                             <td className="rectilinear-td text-center pl-8">
                                                                                 <div className="flex items-center justify-center gap-2">
                                                                                     <span className="font-black text-slate-900 dark:text-white tabular-nums text-xs">{record.certificateNumber}</span>
                                                                                     {isRevision && (
                                                                                         <span className="bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">REV {record.revisionNumber}</span>
                                                                                     )}
                                                                                     {record.isAccredited && (
                                                                                         <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase ml-1 shadow-sm">RBC</span>
                                                                                     )}
                                                                                 </div>
                                                                             </td>
                                                                            <td className="rectilinear-td text-left text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={record.instrumentName}>
                                                                                {record.instrumentName}
                                                                            </td>
                                                                            <td className="rectilinear-td text-center">
                                                                                <div className="flex items-center justify-center gap-2">
                                                                                    {record.isPublished && (
                                                                                        <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-md uppercase border border-emerald-100 flex items-center">
                                                                                            <Share2 className="w-2.5 h-2.5 mr-1" /> No Portal
                                                                                        </span>
                                                                                    )}
                                                                                    {record.revisionRequested && (
                                                                                        <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-2 py-1 rounded-md uppercase border border-amber-100 flex items-center">
                                                                                            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Revisão Pend.
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="rectilinear-td text-center pr-8">
                                                                                <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={(e) => { e.stopPropagation(); handlePreviewPdf(record); }} className="p-2 text-indigo-600 hover:bg-slate-50 rounded-lg transition-all" title="Ver"><Eye className="w-4 h-4" /></button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadPdf(record); }} className="p-2 text-emerald-600 hover:bg-slate-50 rounded-lg transition-all" title="Download"><Download className="w-4 h-4" /></button>
                                                                                    {!record.isPublished ? (
                                                                                        <button 
                                                                                            onClick={() => onUpdateCertificateStatus?.(record.id, record.status, 'Publicado pelo portal')}
                                                                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" 
                                                                                            title="Publicar no Portal"
                                                                                        >
                                                                                            <Share2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    ) : (
                                                                                        <button 
                                                                                            onClick={() => handleUnpublish(record, 'Despublicado manualmente')}
                                                                                            className="p-2 text-emerald-600 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" 
                                                                                            title="Despublicar do Portal"
                                                                                        >
                                                                                            <Share2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                    {record.revisionRequested && (
                                                                                        <button
                                                                                            onClick={() => handleAcknowledgeRevision(record)}
                                                                                            className="p-2 text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                                                                                            title="Iniciar Revisão"
                                                                                        >
                                                                                            <RotateCcw className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={() => handleCancelCertificate(record)}
                                                                                        className="p-2 text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                                                                                        title="Cancelar Permanentemente"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Revision Detail Modal */}
        {revisionDetailTarget && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRevisionDetailTarget(null)}>
                <div onClick={e => e.stopPropagation()} className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                            <div>
                                <h3 className="font-black text-slate-900">Revisão Solicitada</h3>
                                <p className="text-xs text-slate-500">Cert. {revisionDetailTarget.certificateNumber}</p>
                            </div>
                        </div>
                        <button onClick={() => setRevisionDetailTarget(null)} className="p-2 text-slate-400 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo informado pelo cliente</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-amber-900 font-medium">{revisionDetailTarget.revisionReason || 'Nenhum motivo informado.'}</p>
                        {revisionDetailTarget.revisionRequestedAt && (
                            <p className="text-[10px] text-amber-600 mt-2 font-bold">Solicitado em: {new Date(revisionDetailTarget.revisionRequestedAt).toLocaleString('pt-BR')}</p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setRevisionDetailTarget(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase">Fechar</button>
                        <button onClick={() => { handleAcknowledgeRevision(revisionDetailTarget); setRevisionDetailTarget(null); }} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase">
                            Iniciar Revisão (Despublicar)
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
