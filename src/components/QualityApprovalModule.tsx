import { useState, useEffect } from 'react';
import { CalibrationRecord, ServiceOrder, Client, CertificateStatus, Procedure, StandardInstrument, CertificateMask } from '../types';
import { 
    Search, 
    CheckCircle, 
    XCircle, 
    FileText, 
    ShieldCheck, 
    Eye, 
    Loader2, 
    LayoutGrid, 
    List,
    Download,
    Calendar,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface QualityApprovalModuleProps {
    calibrationRecords: CalibrationRecord[];
    serviceOrders: ServiceOrder[];
    clients: Client[];
    procedures: Procedure[];
    standardInstruments: StandardInstrument[];
    certificateMasks: CertificateMask[];
    employees: any[];
    onUpdateCertificateStatus: (recordId: string, status: CertificateStatus, justification?: string, signatarioId?: string) => void;
    documentTemplates?: any[];
}

export default function QualityApprovalModule({
    calibrationRecords,
    serviceOrders,
    clients,
    procedures,
    standardInstruments,
    certificateMasks,
    employees,
    onUpdateCertificateStatus,
    documentTemplates = []
}: QualityApprovalModuleProps) {
    const { employee } = useAuth();
    const { pdfState, previewUrl: previewPdfUrl, generate: generatePdf, reset: resetPdf } = usePdfGenerator();
    const [searchTerm, setSearchTerm] = useState('');
    const [returnJustification, setReturnJustification] = useState<Record<string, string>>({});
    const [returnModalId, setReturnModalId] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number>();
    const [pdfIsInternal, setPdfIsInternal] = useState(false);
    const [recordInPreview, setRecordInPreview] = useState<CalibrationRecord | null>(null);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('quality_approvals_view_mode') as 'grid' | 'list') || 'list';
    });

    useEffect(() => {
        localStorage.setItem('quality_approvals_view_mode', viewMode);
    }, [viewMode]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    const recordsToReview = calibrationRecords.filter(record => {
        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
        const client = clients.find(c => c.id === serviceOrder?.clienteId);
        const searchStr = `${record.certificateNumber} ${record.instrumentName} ${client?.razaoSocial || ''}`.toLowerCase();
        const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
        
        const status = record.status || serviceOrder?.statusCertificado;
        const isRelevantStatus = [
            CertificateStatus.IN_ANALYSIS,
            CertificateStatus.APPROVED,
            CertificateStatus.READY_FOR_SENDING
        ].includes(status as CertificateStatus);
        
        return matchesSearch && isRelevantStatus;
    });

    const handleSuperiorApproval = (record: CalibrationRecord) => {
        if (!employee?.isSignatory) {
            toast.error('Aprovação L2 restrita ao signatário oficial.');
            return;
        }
        onUpdateCertificateStatus(record.id, CertificateStatus.READY_FOR_SENDING, undefined, employee.id);
        toast.success(`Certificado assinado p/ envio!`);
        closePreview();
    };

    const handleL1Approval = (record: CalibrationRecord) => {
        if (record.submittedBy === employee?.id) {
            toast.error('O revisor não pode ser o mesmo que calibrou.');
            return;
        }
        onUpdateCertificateStatus(record.id, CertificateStatus.APPROVED);
        toast.success('Aprovado em L1! Aguardando assinatura final.');
        closePreview();
    };

    const handleOpenReturnModal = (recordId: string) => {
        setReturnModalId(recordId);
    };

    const handleConfirmReturn = (record: CalibrationRecord) => {
        const justification = returnJustification[record.id];
        if (!justification?.trim()) {
            toast.error('Justificativa obrigatória.');
            return;
        }
        onUpdateCertificateStatus(record.id, CertificateStatus.RETURNED, justification);
        setReturnModalId(null);
        toast.warning('Registro devolvido.');
        closePreview();
    };

    const handleGeneratePdf = (record: CalibrationRecord, preview: boolean = false, isInternalMemory: boolean = false) => {
        toast.info('Gerando documento...');
        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
        const client = clients.find(c => c.id === serviceOrder?.clienteId);
        setPdfIsInternal(isInternalMemory);
        setRecordInPreview(record);
        generatePdf(record, client, procedures, standardInstruments, certificateMasks, employees, preview, isInternalMemory, documentTemplates);
    };

    const closePreview = () => {
        resetPdf();
        setRecordInPreview(null);
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Qualidade: Aprovação Técnica</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Revisão obrigatória de certificados e memórias de cálculo ISO 17025.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="mb-8 relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="text" placeholder="Filtrar fila de aprovação..." className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            {viewMode === 'list' ? (
                <div className="rectilinear-container custom-scrollbar shadow-sm">
                    <table className="rectilinear-table">
                        <thead>
                            <tr>
                                <th className="rectilinear-th col-sm text-center pl-8">Certificado</th>
                                <th className="rectilinear-th col-lg text-center">Cliente Solicitante</th>
                                <th className="rectilinear-th col-md text-center">Instrumento</th>
                                <th className="rectilinear-th col-sm text-center">Data Calib.</th>
                                <th className="rectilinear-th col-md text-center">Status Auditoria</th>
                                <th className="rectilinear-th col-sm text-center pr-8">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {recordsToReview.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma calibração pendente de análise técnica</p>
                                    </td>
                                </tr>
                            ) : (
                                recordsToReview.map(record => {
                                    const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
                                    const client = clients.find(c => c.id === serviceOrder?.clienteId);
                                    const status = record.status || serviceOrder?.statusCertificado;
                                    return (
                                        <tr key={record.id} className="rectilinear-tr group">
                                            <td className="rectilinear-td text-center pl-8">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="font-black text-slate-900 dark:text-white tabular-nums">{record.certificateNumber}</span>
                                                    {record.isAccredited && (
                                                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">RBC</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="rectilinear-td text-left font-bold text-slate-500 truncate" title={client?.razaoSocial}>{client?.razaoSocial || '—'}</td>
                                            <td className="rectilinear-td text-left font-bold text-slate-500 truncate" title={record.instrumentName}>{record.instrumentName}</td>
                                            <td className="rectilinear-td text-center font-mono text-xs tabular-nums">{formatDate(record.calibrationDate)}</td>
                                            <td className="rectilinear-td text-center">
                                                <div className="flex items-center justify-center">
                                                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider border transition-all ${
                                                      status === CertificateStatus.IN_ANALYSIS ? 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm' : 
                                                      status === CertificateStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                      'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                  }`}>
                                                      {status === CertificateStatus.IN_ANALYSIS ? 'Em Análise' : status === CertificateStatus.APPROVED ? 'Aprovado L1' : 'Apto p/ Envio'}
                                                  </span>
                                                </div>
                                            </td>
                                            <td className="rectilinear-td text-center pr-8">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleGeneratePdf(record, true, false)}
                                                        className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-slate-900 transition-all outline-none"
                                                        title="Visualizar Certificado para Auditoria"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rectilinear-grid">
                    {recordsToReview.map(record => {
                        const serviceOrder = serviceOrders.find(so => so.id === record.serviceOrderId);
                        const client = clients.find(c => c.id === serviceOrder?.clienteId);
                        const status = record.status || serviceOrder?.statusCertificado;
                        return (
                            <div key={record.id} className="rectilinear-card group flex flex-col justify-between hover:border-indigo-500">
                                <div>
                                    <div className="flex justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tabular-nums">{record.certificateNumber}</span>
                                            {record.isAccredited && (
                                                <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-sm">RBC</span>
                                            )}
                                        </div>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${status === CertificateStatus.IN_ANALYSIS ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{status}</span>
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 dark:text-white truncate" title={client?.razaoSocial}>{client?.razaoSocial}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">{record.instrumentName}</p>
                                </div>
                                <button 
                                    onClick={() => handleGeneratePdf(record, true, false)} 
                                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                    title="Visualizar Certificado"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Devolução (Reprovação Técnica) */}
            {returnModalId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 w-full max-w-lg shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight">Devolver Certificado</h3>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Exponha as ressalvas técnicas ao técnico</p>
                            </div>
                        </div>
                        <textarea
                            value={returnJustification[returnModalId] || ''}
                            onChange={e => setReturnJustification(prev => ({ ...prev, [returnModalId!]: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-amber-400 rounded-3xl p-6 text-sm font-bold h-40 outline-none transition-all shadow-inner resize-none"
                            placeholder="Descreva aqui o motivo da devolução para que o técnico possa corrigir..."
                        />
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setReturnModalId(null)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                            <button onClick={() => {
                                const record = calibrationRecords.find(r => r.id === returnModalId);
                                if (record) handleConfirmReturn(record);
                            }} className="flex-[2] py-5 bg-amber-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">Sinalizar Correção</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF View Modal (Principal p/ Auditoria) */}
            {previewPdfUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-white/10">
                        <div className="px-6 sm:px-10 py-4 sm:py-6 border-b flex justify-between items-center bg-white/50">
                            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl sm:rounded-2xl text-indigo-600 shrink-0">
                                    <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <div className="truncate">
                                    <h3 className="text-sm sm:text-xl font-black truncate text-slate-900 uppercase tracking-tight">Auditória: Certificado {recordInPreview?.certificateNumber}</h3>
                                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Revise os dados técnicos para aprovação</p>
                                </div>
                            </div>
                            <button onClick={closePreview} className="p-2 hover:bg-slate-50 rounded-full transition-all shrink-0">
                                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                            </button>
                        </div>

                        <div className="flex-1 bg-slate-50 overflow-y-auto min-h-0 p-4 sm:p-10 block relative">
                            {/* Scroll Indicator */}
                            <div className="sticky top-2 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce pointer-events-none w-max">
                                Desça para visualizar as demais informações do certificado ↓
                            </div>
                            <div className="w-full flex flex-col items-center">
                            {pdfState === 'generating' && (
                                <div className="flex flex-col items-center mt-20 gap-4">
                                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                    <p className="text-xs font-black text-indigo-600 tracking-widest uppercase">Processando PDF...</p>
                                </div>
                            )}
                            {pdfState === 'ready' && previewPdfUrl && (
                                <Document 
                                    file={previewPdfUrl} 
                                    onLoadSuccess={onDocumentLoadSuccess} 
                                    className="shadow-2xl rounded-lg overflow-hidden border bg-white"
                                    loading={<Loader2 className="w-12 h-12 text-indigo-600 animate-spin mt-20" />}
                                >
                                    {Array.from(new Array(numPages), (_, i) => (
                                        <div key={i} className="mb-4 sm:mb-8">
                                            <Page 
                                                pageNumber={i + 1} 
                                                renderTextLayer={false} 
                                                renderAnnotationLayer={false} 
                                                width={Math.min(windowWidth - (windowWidth < 640 ? 32 : 80), 850)} 
                                                className="max-w-full shadow-lg"
                                            />
                                        </div>
                                    ))}
                                </Document>
                            )}
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 bg-white border-t-2 border-slate-100 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                            <button onClick={closePreview} className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Fechar</button>
                            {recordInPreview && (() => {
                                const status = recordInPreview.status;
                                return (
                                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                                        {status === CertificateStatus.IN_ANALYSIS ? (
                                            <>
                                                <button onClick={() => handleOpenReturnModal(recordInPreview.id)} className="w-full sm:w-auto px-8 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"><RefreshCw className="w-4 h-4" /> Devolver</button>
                                                <button onClick={() => handleL1Approval(recordInPreview)} className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"><CheckCircle className="w-4 h-4" /> Aprovar L1</button>
                                            </>
                                        ) : status === CertificateStatus.APPROVED ? (
                                            <>
                                                <button onClick={() => handleOpenReturnModal(recordInPreview.id)} className="w-full sm:w-auto px-8 py-3 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all"><XCircle className="w-4 h-4" /> Recusar</button>
                                                <button onClick={() => handleSuperiorApproval(recordInPreview)} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><ShieldCheck className="w-4 h-4" /> Autorizar e Assinar (L2)</button>
                                            </>
                                        ) : null}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
