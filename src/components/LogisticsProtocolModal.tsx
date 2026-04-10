import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  CheckCircle2, 
  AlertCircle,
  X,
  ClipboardCheck,
  User,
  Tags
} from 'lucide-react';
import { ServiceOrder, Client, Quote, DocumentTemplate, InstrumentStatus } from '../types';
import { generateProtocolPdf } from '../utils/pdfGenerator';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { pdfjs, Document, Page } from 'react-pdf';
import { Loader2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LogisticsProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  os: ServiceOrder;
  client?: Client;
  quote?: Quote;
  type: 'retirada' | 'entrega';
  documentTemplates: DocumentTemplate[];
  onStatusUpdate: () => void;
}

interface ProtocolItemSelection {
  id: number;
  descricao: string;
  quantidade: number;
  identificacao: string;
  estado: string;
  selected: boolean;
}

const LogisticsProtocolModal: React.FC<LogisticsProtocolModalProps> = ({
  isOpen,
  onClose,
  os,
  client,
  quote,
  type,
  documentTemplates,
  onStatusUpdate
}) => {
  const [items, setItems] = useState<ProtocolItemSelection[]>(
    (quote?.items || []).map((item, idx) => ({
      id: idx,
      descricao: item.descricao,
      quantidade: item.quantidade,
      identificacao: '',
      estado: '',
      selected: true
    }))
  );

  const [executante, setExecutante] = useState({ nome: '', cargo: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const { pdfState, previewUrl, generate, reset } = usePdfGenerator();
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  if (!isOpen) return null;

  const handleToggleItem = (idx: number) => {
    setItems(prev => prev.map(item => 
      item.id === idx ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleUpdateItem = (idx: number, field: keyof ProtocolItemSelection, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === idx ? { ...item, [field]: value } : item
    ));
  };

  const handleGenerate = async (previewOnly: boolean = false) => {
    setIsGenerating(true);
    try {
      const selectedItems = items.filter(i => i.selected);
      
      if (previewOnly) {
          const promise = generateProtocolPdf(
            os,
            client,
            quote,
            type,
            selectedItems,
            executante,
            { nome: '', cargo: '' },
            documentTemplates,
            true
          );
          
          toast.promise(promise, {
            loading: 'Gerando prévia...',
            success: 'Prévia aberta!',
            error: 'Erro na prévia.'
          });
          
          const result = await promise;
          
          if (result) {
            const url = typeof result === 'string' ? result : (result as any).toString();
            window.open(url, '_blank');
          }
          return;
      }

      const promise = generateProtocolPdf(
        os,
        client,
        quote,
        type,
        selectedItems,
        executante,
        { nome: '', cargo: '' },
        documentTemplates
      );

      toast.promise(promise, {
        loading: 'Gerando protocolo...',
        success: 'Protocolo gerado!',
        error: 'Erro ao gerar protocolo.'
      });

      await promise;

      // Workflow: Update OS status if it's a Retirada
      if (type === 'retirada' && os.statusServico === InstrumentStatus.PENDING) {
        const osRef = doc(db, 'serviceOrders', os.id);
        await updateDoc(osRef, {
          statusServico: InstrumentStatus.IN_PROGRESS,
          dataEntradaReal: new Date().toISOString()
        });
        onStatusUpdate();
      }

      onClose();
      toast.success("Protocolo emitido e registrado!");
    } catch (error) {
      console.error('Erro ao gerar protocolo:', error);
      toast.error("Erro técnico ao gerar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.95, y: 20 }} 
          className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 flex flex-col"
        >
          {/* Header */}
          <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${type === 'retirada' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {type === 'retirada' ? <ArrowDownToLine className="w-6 h-6" /> : <ArrowUpFromLine className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {type === 'retirada' ? 'Protocolo de Retirada' : 'Protocolo de Entrega'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">O.S. {os.id} — Configuração de Itens e Inspeção</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> Conferência de Itens
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase">
                    {items.filter(i => i.selected).length} selecionados
                  </span>
                </div>
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-3xl border-2 transition-all ${item.selected ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-50 bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-4">
                        <button 
                          onClick={() => handleToggleItem(item.id)}
                          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}`}
                        >
                          {item.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.descricao}</span>
                            <div className="flex items-center gap-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase">Qtd:</label>
                              <input 
                                type="number" 
                                value={item.quantidade} 
                                onChange={e => handleUpdateItem(item.id, 'quantidade', Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsible Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <User className="w-4 h-4" /> Envolvidos
                  </h4>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] space-y-4">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Executante (MetroFlow)</p>
                      <input 
                        type="text" 
                        value={executante.nome} 
                        onChange={e => setExecutante(p => ({ ...p, nome: e.target.value }))}
                        placeholder="Nome do Funcionário"
                        className="w-full px-5 py-3 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-bold outline-none transition-all shadow-sm"
                      />
                      <input 
                        type="text" 
                        value={executante.cargo} 
                        onChange={e => setExecutante(p => ({ ...p, cargo: e.target.value }))}
                        placeholder="Cargo / Setor"
                        className="w-full px-5 py-3 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-[10px] font-bold outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating || items.filter(i => i.selected).length === 0}
                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                  >
                    <FileText className="w-5 h-5" /> Ver Prévia do PDF
                  </button>

                  <button 
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating || items.filter(i => i.selected).length === 0}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Formalizando...
                      </span>
                    ) : (
                      <>
                        <ClipboardCheck className="w-5 h-5" /> Emitir e Concluir
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogisticsProtocolModal;
