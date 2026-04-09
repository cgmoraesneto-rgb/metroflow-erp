import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, FileText, Printer, Clock, User, Mail, 
  Hash, Calendar, DollarSign, Search, Download, LayoutGrid, Loader2
} from 'lucide-react';
import { Quote, Client, QuoteStatus, ServiceOrder, CertificateStatus, DocumentTemplate } from '../types';
import { formatDate, formatNumber } from '../utils/formatters';
import { generateQuotePdf } from '../utils/pdfGenerator';
import { useData } from '../contexts/DataContext';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { pdfjs, Document, Page } from 'react-pdf';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FinancialValue = ({ value, className = "" }: { value: number | string | undefined, className?: string }) => (
  <div className={`financial-cell ${className}`}>
    <span className="currency">R$</span>
    <span className="value">{formatNumber(value)}</span>
  </div>
);

interface QuoteViewModalProps {
  quote: Quote;
  client?: Client;
  onClose: () => void;
  onApprove: (quote: Quote, newServiceOrder: ServiceOrder) => void;
  onSave?: (quote: Quote) => void;
}

const QuoteViewModal: React.FC<QuoteViewModalProps> = ({ quote, client, onClose, onApprove }) => {
  const { documentTemplates } = useData();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  React.useEffect(() => {
    let active = true;
    if (showPreview) {
      const loadPreview = async () => {
        setIsGeneratingPreview(true);
        try {
          const url = await generateQuotePdf(quote, client, documentTemplates, true);
          if (active) setPreviewUrl(url as string);
        } catch (err) {
          console.error("Preview generation error:", err);
          toast.error("Erro ao gerar prévia do PDF.");
        } finally {
          if (active) setIsGeneratingPreview(false);
        }
      };
      loadPreview();
    } else {
      setPreviewUrl(null);
    }
    return () => { active = false; };
  }, [showPreview, quote, client, documentTemplates]);

  const handleDownloadPdf = async () => {
    try {
      await generateQuotePdf(quote, client, documentTemplates);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Erro ao gerar PDF para download.");
    }
  };

  const getClientName = (id: string) => client?.razaoSocial || id;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 w-full transition-all duration-500 overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] ${showPreview ? 'max-w-7xl' : 'max-w-3xl'}`}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Details Side */}
          <div className={`transition-all duration-500 overflow-y-auto custom-scrollbar pr-4 ${showPreview ? 'w-1/2' : 'w-full'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-3xl text-indigo-600">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{quote.id}</h3>
                  <p className="text-slate-500 font-bold mt-0.5">{getClientName(quote.clienteId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isApproved ? (
                  <span className="text-[10px] font-black px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200">Aprovado</span>
                ) : (
                  <span className="text-[10px] font-black px-4 py-2 rounded-full bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200">Pendente</span>
                )}
                
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className={`p-3 rounded-2xl transition-all border ${showPreview ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
                  title="Alternar Prévia do PDF"
                >
                  <Search className="w-6 h-6" />
                </button>

                <button 
                  onClick={handleDownloadPdf}
                  className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 dark:border-slate-700 disabled:opacity-50"
                  title="Download PDF"
                >
                  <Printer className="w-6 h-6" />
                </button>
                <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">Dados da Proposta</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Emissão</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatDate(quote.dataEmissao)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Validade</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatDate(quote.validade)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Pagamento</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.formaPagamento}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Tabela</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.tabelaPrecos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Comissão</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.comissaoVendedor ? 'SIM' : 'NÃO'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">Contato do Cliente</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-300" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.clienteSolicitanteNome || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-300" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{quote.clienteSolicitanteEmail || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Itens de Serviço</h4>
              <div className="space-y-3">
                {quote.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900 group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        {item.item || i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{item.descricao}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.tipoServico} · Qtd: {item.quantidade}</p>
                      </div>
                    </div>
                    <div className="text-right w-32">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 px-[10px]">Subtotal</p>
                      <FinancialValue value={item.valorTotal || 0} className="text-base font-black text-slate-900 dark:text-white" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-8 bg-slate-900 dark:bg-indigo-600 rounded-[2.5rem] flex justify-between items-center text-white shadow-2xl shadow-indigo-500/30">
                <div>
                  <p className="font-black text-indigo-200 text-[10px] uppercase tracking-[0.3em] mb-2 px-[10px]">Investimento Total</p>
                  <FinancialValue value={total} className="text-3xl font-black text-white" />
                </div>
                {!showPreview && <Printer className="w-10 h-10 text-white/20" />}
              </div>
            </div>

            <div className="pt-4 pb-10">
              {!isApproved ? (
                !confirmApprove ? (
                  <button
                    onClick={() => setConfirmApprove(true)}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/40 transition-all hover:scale-[1.01] active:scale-[0.98] uppercase tracking-widest text-xs"
                  >
                    <CheckCircle className="w-6 h-6" />
                    Aprovar Orçamento e Gerar O.S.
                  </button>
                ) : (
                  <div className="p-8 bg-amber-50 dark:bg-amber-900/20 rounded-[3rem] border border-amber-200 dark:border-amber-700/50 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-600 mb-4 animate-bounce">
                        <Clock className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest text-sm mb-2">Ação Irreversível</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium max-w-sm">
                        Ao confirmar, o orçamento será marcado como **APROVADO** e uma Ordem de Serviço será disparada no Módulo Logística.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setConfirmApprove(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all">
                        Voltar
                      </button>
                      <button onClick={handleApprove} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95">
                        Confirmar Aprovação
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2.5rem] border border-emerald-200/50 flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest text-[10px]">Documento Aprovado e O.S. Gerada</p>
                </div>
              )}
            </div>
          </div>

          {/* PDF Preview Side */}
          <AnimatePresence>
            {showPreview && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-1/2 ml-8 pl-8 border-l border-slate-100 flex flex-col overflow-hidden"
              >
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] overflow-y-auto custom-scrollbar p-6 flex flex-col items-center border border-slate-100 dark:border-slate-800">
                  {isGeneratingPreview ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerando prévia...</p>
                    </div>
                  ) : previewUrl && (
                    <Document
                      file={previewUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<div className="flex items-center justify-center p-20"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>}
                      className="shadow-2xl rounded-lg overflow-hidden border border-slate-200"
                    >
                      {Array.from(new Array(numPages), (el, index) => (
                        <div key={`page_${index + 1}`} className="mb-4">
                          <Page
                            pageNumber={index + 1}
                            width={Math.min(window.innerWidth / 2 - 100, 500)}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      ))}
                    </Document>
                  )}
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Confira todos os itens antes de aprovar.</p>
                  <button 
                    onClick={handleDownloadPdf}
                    className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 border border-indigo-100 dark:border-indigo-800"
                  >
                    <Download className="w-4 h-4" /> Baixar PDF Final
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default QuoteViewModal;
