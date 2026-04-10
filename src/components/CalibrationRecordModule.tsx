import { useState, useRef, useEffect } from 'react';
import { 
    ServiceOrder, 
    CalibrationRecord, 
    CertificateMask, 
    Procedure, 
    StandardInstrument, 
    Quote, 
    Client,
    CertificateStatus, 
    CalibrationResult 
} from '../types';
import { 
    CheckCircle2, 
    ArrowLeft, 
    ClipboardList, 
    Thermometer, 
    Droplets, 
    User, 
    Calendar, 
    Info, 
    Activity, 
    Edit2, 
    Plus, 
    CheckCircle, 
    PlayCircle, 
    AlertTriangle, 
    Lock,
    Search,
    LayoutGrid,
    List,
    ChevronRight,
    Loader2,
    X
} from 'lucide-react';
import CalibrationLaunchModal from './CalibrationLaunchModal';
import EmployeeSelect from './EmployeeSelect';
import { toast } from 'sonner';

interface CalibrationRecordModuleProps {
    serviceOrders: ServiceOrder[];
    calibrationRecords: CalibrationRecord[];
    certificateMasks: CertificateMask[];
    procedures: Procedure[];
    standardInstruments: StandardInstrument[];
    quotes: Quote[];
    clients: Client[];
    onSaveCalibrationRecord: (record: CalibrationRecord) => void;
    onSaveCalibrationResult?: (result: CalibrationResult) => Promise<void>;
    documentTemplates?: any[];
}

export default function CalibrationRecordModule({
    serviceOrders,
    calibrationRecords = [],
    certificateMasks,
    procedures,
    standardInstruments,
    quotes,
    clients,
    onSaveCalibrationRecord,
    onSaveCalibrationResult,
    documentTemplates = []
}: CalibrationRecordModuleProps) {
    const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
    const [selectedQuoteItemIndex, setSelectedQuoteItemIndex] = useState<number | null>(null);
    const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [launchModalRecord, setLaunchModalRecord] = useState<CalibrationRecord | null>(null);
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [observations, setObservations] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    
    const [instrumentDetails, setInstrumentDetails] = useState({
        manufacturer: '',
        model: '',
        serialNumber: '',
        identification: '',
        instrumentName: '',
        resolution: 0,
        measurementRange: '',
        capacidadeMinima: '',
        capacidadeMaxima: '',
        unidadeMedida: '',
        periodicity: '12 meses',
        calibrationLocation: 'Laboratório'
    });

    const [topDetails, setTopDetails] = useState({
        certificateNumber: `CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        calibrationDate: new Date().toISOString().split('T')[0],
        nextCalibrationDate: '',
        technicianName: ''
    });

    const [isAccredited, setIsAccredited] = useState<boolean>(false);

    const [envConditions, setEnvConditions] = useState({
        temperature: 20,
        humidity: 50,
        envStandardInstrumentId: ''
    });

    const [kFactorJustification, setKFactorJustification] = useState<'Padrão (k=2 para 95.45%)' | 'Welch-Satterthwaite'>('Padrão (k=2 para 95.45%)');

    const handleSaveHeader = async (isOfficial: boolean = false) => {
        if (!selectedOS || selectedQuoteItemIndex === null) {
            toast.error("Preencha todos os campos obrigatórios do cabeçalho.");
            return;
        }

        if (!topDetails.technicianName) {
            toast.error("Selecione o técnico responsável.");
            return;
        }

        setIsSaving(true);
        const record: CalibrationRecord = {
            id: editingRecordId || `CAL-${Date.now()}`,
            serviceOrderId: selectedOS.id,
            clientId: undefined,
            quoteItemIndex: selectedQuoteItemIndex as number,
            unitIndex: selectedUnitIndex !== null ? selectedUnitIndex : undefined,
            instrumentName: instrumentDetails.instrumentName,
            certificateNumber: topDetails.certificateNumber,
            isAccredited: isAccredited,
            calibrationDate: topDetails.calibrationDate,
            nextCalibrationDate: topDetails.nextCalibrationDate,
            technicianName: topDetails.technicianName,
            manufacturer: instrumentDetails.manufacturer,
            model: instrumentDetails.model,
            serialNumber: instrumentDetails.serialNumber,
            identification: instrumentDetails.identification,
            periodicity: instrumentDetails.periodicity,
            calibrationLocation: instrumentDetails.calibrationLocation,
            resolution: instrumentDetails.resolution,
            capacidadeMinima: instrumentDetails.capacidadeMinima,
            capacidadeMaxima: instrumentDetails.capacidadeMaxima,
            unidadeMedida: instrumentDetails.unidadeMedida,
            temperature: envConditions.temperature,
            humidity: envConditions.humidity,
            envStandardInstrumentId: envConditions.envStandardInstrumentId,
            environmentalStandardId: envConditions.envStandardInstrumentId,
            certificateMaskId: '', 
            procedureId: '', 
            standardInstrumentIds: [], 
            observations: observations,
            attachments: attachments,
            groups: [],
            status: CertificateStatus.BEING_MADE,
            isDraft: true,
            headerValidated: isOfficial,
            headerSaved: true,
            kFactorJustification: kFactorJustification
        };

        try {
            await onSaveCalibrationRecord(record);
            setShowSuccess(true);
            toast.success(isOfficial ? 'Cabeçalho validado com sucesso!' : 'Cabeçalho salvo como rascunho!');
            
            setTimeout(() => {
                setShowSuccess(false);
                if (isOfficial) {
                    setSelectedQuoteItemIndex(null);
                    setSelectedUnitIndex(null);
                }
                setEditingRecordId(null);
                setIsSaving(false);
            }, 1000);
        } catch (error) {
            toast.error("Erro ao salvar.");
            setIsSaving(false);
        }
    };

    const handleEditRecord = (record: CalibrationRecord, index: number, unitIdx: number) => {
        setSelectedQuoteItemIndex(index);
        setSelectedUnitIndex(unitIdx);
        setEditingRecordId(record.id);
        
        setTopDetails({
            certificateNumber: record.certificateNumber,
            calibrationDate: record.calibrationDate,
            nextCalibrationDate: record.nextCalibrationDate,
            technicianName: record.technicianName
        });
        
        setInstrumentDetails({
            manufacturer: record.manufacturer,
            model: record.model,
            serialNumber: record.serialNumber || '',
            identification: record.identification || '',
            instrumentName: record.instrumentName || '',
            resolution: record.resolution || 0,
            measurementRange: record.measurementRange || '',
            capacidadeMinima: record.capacidadeMinima || '',
            capacidadeMaxima: record.capacidadeMaxima || '',
            unidadeMedida: record.unidadeMedida || '',
            periodicity: record.periodicity || '12 meses',
            calibrationLocation: record.calibrationLocation || 'Laboratório'
        });
        
        setEnvConditions({
            temperature: record.temperature,
            humidity: record.humidity,
            envStandardInstrumentId: record.envStandardInstrumentId
        });
        
        setKFactorJustification(record.kFactorJustification || 'Padrão (k=2 para 95.45%)');
        setIsAccredited(record.isAccredited || false);
        setObservations(record.observations);
        setAttachments(record.attachments || []);
    };

    const handleNewRecord = (index: number, itemName: string, unitIdx: number) => {
        setSelectedQuoteItemIndex(index);
        setSelectedUnitIndex(unitIdx);
        setEditingRecordId(null);
        setInstrumentDetails({ 
            instrumentName: itemName,
            manufacturer: '',
            model: '',
            serialNumber: '',
            identification: '',
            resolution: 0,
            measurementRange: '',
            capacidadeMinima: '',
            capacidadeMaxima: '',
            unidadeMedida: '',
            periodicity: '12 meses',
            calibrationLocation: 'Laboratório'
        });
        setIsAccredited(false);
        setAttachments([]);
    };

    const handleLaunchResults = (record: CalibrationRecord) => {
        if (!record.headerValidated) {
            toast.error("O cabeçalho precisa ser validado oficialmente antes de lançar resultados.");
            return;
        }
        
        setLaunchModalRecord(record);
        setIsLaunchModalOpen(true);
    };

    const handleSubmitResults = async (result: any, maskId?: string) => {
        if (!launchModalRecord) return;
        
        const mask = certificateMasks.find(m => m.id === maskId);
        
        const officialRecord: CalibrationRecord = { 
            ...launchModalRecord, 
            groups: result.groups,
            calculatedPoints: result.calculatedPoints,
            standardInstrumentUncertainties: result.standardInstrumentUncertainties,
            resolution: result.resolution || launchModalRecord.resolution,
            certificateMaskId: maskId || launchModalRecord.certificateMaskId,
            procedureId: mask?.procedureId || launchModalRecord.procedureId,
            standardInstrumentIds: mask?.standardInstrumentIds || launchModalRecord.standardInstrumentIds,
            maskSnapshot: mask || launchModalRecord.maskSnapshot,
            status: CertificateStatus.IN_ANALYSIS,
            isDraft: false 
        };

        if (onSaveCalibrationResult) await onSaveCalibrationResult(result);
        await onSaveCalibrationRecord(officialRecord);
        
        setIsLaunchModalOpen(false);
        setLaunchModalRecord(null);
        toast.success('Calibração finalizada e enviada para revisão!');
    };

    const handleSaveLaunchDraft = async (result: any, maskId?: string) => {
        if (!launchModalRecord) return;
        const mask = certificateMasks.find(m => m.id === maskId);
        
        const updatedRecord: CalibrationRecord = {
            ...launchModalRecord,
            groups: result.groups,
            calculatedPoints: result.calculatedPoints,
            standardInstrumentUncertainties: result.standardInstrumentUncertainties,
            resolution: result.resolution || launchModalRecord.resolution,
            certificateMaskId: maskId || launchModalRecord.certificateMaskId,
            procedureId: mask?.procedureId || launchModalRecord.procedureId,
            standardInstrumentIds: mask?.standardInstrumentIds || launchModalRecord.standardInstrumentIds,
            maskSnapshot: mask || launchModalRecord.maskSnapshot,
        };
        
        await onSaveCalibrationRecord(updatedRecord);
        toast.info('Rascunho de lançamento atualizado');
    };

    const filteredOS = serviceOrders.filter(os => 
        os.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotes.find(q => q.id === os.orcamentoId)?.clienteId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Registros de Calibração</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Fluxo operacional para emissão de certificados.</p>
                    
                    {!selectedOS && (
                        <div className="relative max-w-md mt-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar O.S. ou Cliente..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm transition-all shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {!selectedOS && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* O.S. Selection (Layout Retilíneo Estrito) */}
            {!selectedOS ? (
                viewMode === 'list' ? (
                    <div className="rectilinear-container custom-scrollbar shadow-sm">
                        <table className="rectilinear-table">
                            <thead>
                                <tr className="rectilinear-tr">
                                    <th className="rectilinear-th col-sm text-center pl-8">O.S. / Orç.</th>
                                    <th className="rectilinear-th col-lg text-center">Cliente Solicitante</th>
                                    <th className="rectilinear-th col-sm text-center">Referência</th>
                                    <th className="rectilinear-th col-md text-center">Progresso Geral</th>
                                    <th className="rectilinear-th col-sm text-center pr-8">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {filteredOS.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Nenhuma O.S. encontrada</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOS.map(os => {
                                        const currentQuote = quotes.find(q => q.id === os.orcamentoId);
                                        const client = clients.find(c => c.id === currentQuote?.clienteId);
                                        const totalItems = currentQuote?.items.reduce((sum, item) => sum + (item.quantidade || 1), 0) || 0;
                                        const finalizedRecords = calibrationRecords.filter(r => r.serviceOrderId === os.id && !r.isDraft);
                                        const uniqueProcessedUnits = new Set(finalizedRecords.map(r => `${r.quoteItemIndex}-${r.unitIndex}`));
                                        const recordedItems = uniqueProcessedUnits.size;
                                        const isComplete = totalItems > 0 && recordedItems >= totalItems;
                                        const progress = totalItems > 0 ? (recordedItems / totalItems) * 100 : 0;

                                        return (
                                            <tr key={os.id} onClick={() => setSelectedOS(os)} className="rectilinear-tr group cursor-pointer hover:bg-slate-50/50 transition-colors">
                                                <td className="rectilinear-td text-center pl-8">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-black text-slate-900 dark:text-white uppercase text-xs tabular-nums tracking-tighter block">{os.id}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{os.orcamentoId}</span>
                                                    </div>
                                                </td>
                                                <td className="rectilinear-td text-left font-bold text-slate-700 dark:text-slate-300 truncate text-xs" title={client?.razaoSocial}>
                                                    {client?.razaoSocial || '—'}
                                                </td>
                                                <td className="rectilinear-td text-center text-xs font-mono font-bold text-slate-500 uppercase tracking-tighter">REF-{os.id.slice(-4)}</td>
                                                <td className="rectilinear-td text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="flex-1 max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400 tabular-nums min-w-[30px]">
                                                            {recordedItems}/{totalItems}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="rectilinear-td text-center pr-8">
                                                    <div className="flex justify-center">
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
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
                        {filteredOS.map(os => {
                            const currentQuote = quotes.find(q => q.id === os.orcamentoId);
                            const totalItems = currentQuote?.items.reduce((sum, item) => sum + (item.quantidade || 1), 0) || 0;
                            const finalizedRecords = calibrationRecords.filter(r => r.serviceOrderId === os.id && !r.isDraft);
                            const uniqueProcessedUnits = new Set(finalizedRecords.map(r => `${r.quoteItemIndex}-${r.unitIndex}`));
                            const recordedItems = uniqueProcessedUnits.size;
                            const progress = totalItems > 0 ? (recordedItems / totalItems) * 100 : 0;

                            return (
                                <div key={os.id} onClick={() => setSelectedOS(os)} className="rectilinear-card group cursor-pointer flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{os.id}</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">{os.orcamentoId}</span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-900 dark:text-white truncate mb-2" title={clients.find(c => c.id === currentQuote?.clienteId)?.razaoSocial}>
                                            {clients.find(c => c.id === currentQuote?.clienteId)?.razaoSocial || 'N/A'}
                                        </h4>
                                        <div className="mt-4 mb-6">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Progresso</p>
                                                <p className="text-[9px] text-slate-900 font-black tracking-widest">{recordedItems}/{totalItems}</p>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-600 transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end border-t border-slate-50 pt-4">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Selecionar O.S.</span>
                                        <ChevronRight className="w-3.5 h-3.5 ml-1 text-indigo-600" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : selectedQuoteItemIndex === null ? (
                /* STEP 2: Itens da O.S. (Layout Retilíneo Estrito) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Detalhados</p>
                            <h3 className="text-xl font-black text-indigo-600">{selectedOS.id}</h3>
                        </div>
                        <button 
                            onClick={() => {
                                setSelectedOS(null);
                            }} 
                            className="flex items-center px-4 py-2 bg-white text-slate-600 rounded-xl font-bold text-sm hover:shadow-md transition-all border border-slate-200"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para lista de O.S.
                        </button>
                    </div>

                    <div className="rectilinear-container custom-scrollbar shadow-sm">
                        <table className="rectilinear-table">
                            <thead>
                                <tr>
                                    <th className="rectilinear-th text-left pl-8 col-md">Descrição do Item / Serviço</th>
                                    <th className="rectilinear-th text-center col-sm">Unidade</th>
                                    <th className="rectilinear-th text-center col-md">Progresso do Registro</th>
                                    <th className="rectilinear-th text-center col-md">Identificação / TAG</th>
                                    <th className="rectilinear-th text-center col-md pr-8">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(quotes.find(q => q.id === selectedOS.orcamentoId)?.items || []).flatMap((item, itemIdx) => {
                                    const itemRecords = calibrationRecords.filter(r => r.serviceOrderId === selectedOS.id && r.quoteItemIndex === itemIdx);
                                    const qtdNum = item.quantidade || 1;
                                    
                                    return Array.from({ length: qtdNum }).map((_, unitIdx) => {
                                        const existingRecord = itemRecords.find(r => r.unitIndex === unitIdx);
                                        return (
                                            <tr key={`${itemIdx}-${unitIdx}`} className="rectilinear-tr">
                                                <td className="rectilinear-td text-left pl-8 font-bold text-slate-900 dark:text-white uppercase text-xs truncate max-w-sm" title={item.descricao}>{item.descricao}</td>
                                                <td className="rectilinear-td text-center font-black text-slate-400 tabular-nums">UN</td>
                                                <td className="rectilinear-td text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {existingRecord ? (
                                                            <>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{existingRecord.certificateNumber}</span>
                                                                        {existingRecord.isAccredited && (
                                                                            <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">RBC</span>
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                        existingRecord.status === CertificateStatus.IN_ANALYSIS ? 'bg-amber-100 text-amber-700' :
                                                                        existingRecord.headerValidated ? 'bg-indigo-100 text-indigo-700' :
                                                                        'bg-slate-100 text-slate-400'
                                                                    }`}>
                                                                        {existingRecord.status === CertificateStatus.IN_ANALYSIS ? 'Em Análise' :
                                                                         existingRecord.headerValidated ? 'Apto p/ Lanç' : 'Rascunho'}
                                                                    </span>
                                                                </div>
                                                                {existingRecord.revisionOf && (
                                                                    <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Rev</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase">Pendente</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="rectilinear-td text-center font-mono text-[10px] text-slate-500">
                                                    {existingRecord?.identification || '—'}
                                                </td>
                                                <td className="rectilinear-td text-center pr-8">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {existingRecord ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleEditRecord(existingRecord, itemIdx, unitIdx)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all"
                                                                    title="Editar Cabeçalho"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {existingRecord.headerValidated && (
                                                                    <button
                                                                        onClick={() => handleLaunchResults(existingRecord)}
                                                                        className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-[9px] hover:bg-slate-900 transition-all uppercase tracking-widest shadow-sm"
                                                                    >
                                                                        <PlayCircle className="w-3 h-3 mr-1.5" /> Lançar
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleNewRecord(itemIdx, item.descricao, unitIdx)}
                                                                className="flex items-center px-3 py-1 bg-emerald-500 text-white rounded-lg font-black text-[9px] hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-sm"
                                                            >
                                                                <Plus className="w-3 h-3 mr-1.5" /> Iniciar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* STEP 3: HEADER FORM (Refined rectilinear container) */
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center justify-between bg-indigo-600 p-6 rounded-2xl text-white shadow-xl">
                        <div>
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Etapa 1: Cabeçalho & Instrumento</p>
                            <h3 className="text-xl font-black">{selectedOS.id}</h3>
                        </div>
                        <button 
                            onClick={() => {
                                setSelectedQuoteItemIndex(null);
                                setSelectedUnitIndex(null);
                                setEditingRecordId(null);
                            }} 
                            className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all border border-white/20"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </button>
                    </div>

                    {/* Certificate Identity */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Certificado</label>
                                <input 
                                    type="text" 
                                    value={topDetails.certificateNumber}
                                    onChange={(e) => setTopDetails(prev => ({ ...prev, certificateNumber: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Calibração</label>
                                <input 
                                    type="date" 
                                    value={topDetails.calibrationDate}
                                    onChange={(e) => setTopDetails(prev => ({ ...prev, calibrationDate: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento</label>
                                <input 
                                    type="date" 
                                    value={topDetails.nextCalibrationDate}
                                    onChange={(e) => setTopDetails(prev => ({ ...prev, nextCalibrationDate: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <EmployeeSelect 
                                    label="Técnico Resp."
                                    value={topDetails.technicianName}
                                    onChange={(val) => setTopDetails(prev => ({ ...prev, technicianName: val }))}
                                    placeholder="Selecione o técnico"
                                />
                            </div>
                            <div className="col-span-full md:col-span-2 lg:col-span-4 mt-2">
                                <label className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${isAccredited 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-500'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={isAccredited} 
                                        onChange={(e) => setIsAccredited(e.target.checked)} 
                                    />
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isAccredited ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                                        {isAccredited && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            Acreditação RBC
                                        </p>
                                        <p className="text-[9px] font-medium opacity-70">Marque se o certificado fará parte do escopo acreditado (Layout RBC).</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Mask and Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" /> Instrumento de Cliente
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrumento (Confirmação)</label>
                                    <input 
                                        type="text" 
                                        value={instrumentDetails.instrumentName}
                                        onChange={(e) => setInstrumentDetails(prev => ({ ...prev, instrumentName: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fabricante</label>
                                        <input type="text" value={instrumentDetails.manufacturer} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, manufacturer: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                                        <input type="text" value={instrumentDetails.model} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, model: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Série</label>
                                        <input type="text" value={instrumentDetails.serialNumber} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, serialNumber: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TAG / ID</label>
                                        <input type="text" value={instrumentDetails.identification} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, identification: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cap. Mínima</label>
                                        <input type="text" value={instrumentDetails.capacidadeMinima} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, capacidadeMinima: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cap. Máxima</label>
                                        <input type="text" value={instrumentDetails.capacidadeMaxima} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, capacidadeMaxima: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolução</label>
                                        <input type="number" step="any" value={instrumentDetails.resolution} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, resolution: parseFloat(e.target.value) || 0 }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                                        <input type="text" value={instrumentDetails.unidadeMedida} onChange={(e) => setInstrumentDetails(prev => ({ ...prev, unidadeMedida: e.target.value }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                             <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Thermometer className="w-4 h-4 text-rose-500" /> Condições Ambientais
                             </h4>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperatura (°C)</label>
                                    <input type="number" value={envConditions.temperature} onChange={(e) => setEnvConditions(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Umidade (%UR)</label>
                                    <input type="number" value={envConditions.humidity} onChange={(e) => setEnvConditions(prev => ({ ...prev, humidity: parseFloat(e.target.value) }))} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Padrão Ambiental Utilizado</label>
                                    <select 
                                        value={envConditions.envStandardInstrumentId}
                                        onChange={(e) => setEnvConditions(prev => ({ ...prev, envStandardInstrumentId: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm"
                                    >
                                        <option value="">-- Selecione o Padrão --</option>
                                        {standardInstruments.map(si => (
                                            <option key={si.id} value={si.id}>{si.nome}</option>
                                        ))}
                                    </select>
                                </div>
                             </div>
                             
                             <div className="mt-8 space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Registro</label>
                                <textarea 
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-3 rounded-xl font-medium text-xs h-24 resize-none"
                                    placeholder="Notas técnicas sobre a calibração..."
                                />
                             </div>

                             <div className="mt-6 space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexos / Imagens do Registro</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    multiple 
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                if (ev.target?.result) {
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        const canvas = document.createElement('canvas');
                                                        const MAX_WIDTH = 800;
                                                        const MAX_HEIGHT = 800;
                                                        let width = img.width;
                                                        let height = img.height;
                                                        
                                                        if (width > height) {
                                                            if (width > MAX_WIDTH) {
                                                                height *= MAX_WIDTH / width;
                                                                width = MAX_WIDTH;
                                                            }
                                                        } else {
                                                            if (height > MAX_HEIGHT) {
                                                                width *= MAX_HEIGHT / height;
                                                                height = MAX_HEIGHT;
                                                            }
                                                        }
                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        const ctx = canvas.getContext('2d');
                                                        ctx?.drawImage(img, 0, 0, width, height);
                                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                                        setAttachments(prev => [...prev, dataUrl]);
                                                    };
                                                    img.src = ev.target.result as string;
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }}
                                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-4 mt-4">
                                        {attachments.map((src, idx) => (
                                            <div key={idx} className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden group shadow-sm">
                                                <img src={src} alt="Anexo" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg">Pronto para salvar?</h4>
                                <p className="text-slate-400 text-sm font-bold">A etapa de cabeçalho é crucial para a rastreabilidade.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button 
                                onClick={() => handleSaveHeader(false)}
                                disabled={isSaving}
                                className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Rascunho'}
                            </button>
                            <button 
                                onClick={() => handleSaveHeader(true)}
                                disabled={isSaving}
                                className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar Cabeçalho'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESULTS MODAL (STEP 2) */}
            {isLaunchModalOpen && launchModalRecord && (
                <CalibrationLaunchModal
                    record={launchModalRecord}
                    certificateMasks={certificateMasks}
                    isOpen={isLaunchModalOpen}
                    standardInstruments={standardInstruments}
                    documentTemplates={documentTemplates}
                    onClose={() => setIsLaunchModalOpen(false)}
                    onSaveDraft={handleSaveLaunchDraft}
                    onSubmit={handleSubmitResults}
                />
            )}
        </div>
    );
}
