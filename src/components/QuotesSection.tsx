import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Quote, Client, PriceTable, PaymentMethod, QuoteStatus, ServiceOrder } from '../types';
import QuoteEditModal from './QuoteEditModal';
import QuoteViewModal from './QuoteViewModal';
import { Eye, Pencil, Trash2, Plus, LayoutGrid, List, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatCurrency, formatNumber } from '../utils/formatters';
import { generateQuotePdf } from '../utils/pdfGenerator';

const handleDownloadPdf = async (quote: Quote, client: Client | undefined, documentTemplates: DocumentTemplate[]) => {
  try {
    await generateQuotePdf(quote, client, documentTemplates);
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Erro ao gerar PDF.");
  }
};

const FinancialValue = ({ value, className = "" }: { value: number | string | undefined, className?: string }) => (
  <div className={`financial-cell ${className}`}>
    <span className="currency">R$</span>
    <span className="value">{formatNumber(value)}</span>
  </div>
);

interface QuotesSectionProps {
  clients: Client[];
  priceTables: PriceTable[];
  quotes: Quote[];
  paymentMethods: PaymentMethod[];
  onSaveQuote: (quote: Quote) => void;
  onDeleteQuote: (quoteId: string) => void;
  onApproveQuote?: (quote: Quote, newServiceOrder: ServiceOrder) => void;
}

type ViewMode = 'grid' | 'list';

export default function QuotesSection({
  clients,
  priceTables,
  quotes,
  paymentMethods,
  onSaveQuote,
  onDeleteQuote,
  onApproveQuote,
}: QuotesSectionProps) {
  const { documentTemplates } = useData();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('quotesViewMode') as ViewMode) || 'grid'
  );

  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    localStorage.setItem('quotesViewMode', next);
  };

  const handleGenerateNewQuote = () => {
    if (clients.length === 0) { toast.error('Por favor, cadastre um cliente primeiro.'); return; }
    if (priceTables.length === 0) { toast.error('Por favor, cadastre uma tabela de preços primeiro.'); return; }

    let maxSeq = 0;
    quotes.forEach(q => {
      // Adjusted regex to match IDs with or without revision suffixes (e.g., OCW000126 or OCW000126/R1)
      const match = q.id.match(/^OCW(\d{4})26/);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const newSeq = (maxSeq + 1).toString().padStart(4, '0');
    const newQuoteId = `OCW${newSeq}26`;
    const emissionDate = new Date();
    const validityDate = new Date();
    validityDate.setDate(emissionDate.getDate() + 30);

    const newQuote: Quote = {
      id: newQuoteId,
      clienteId: '',
      dataEmissao: emissionDate.toISOString().split('T')[0],
      validade: validityDate.toISOString().split('T')[0],
      comissaoVendedor: false,
      tabelaPrecos: '',
      formaPagamento: 'A vista',
      items: [],
      clienteCnpj: '',
      clienteEndereco: '',
      clienteSolicitanteNome: '',
      clienteSolicitanteEmail: '',
      clienteSolicitanteContato: '',
      clienteEmailFinanceiro: '',
      clienteRetencaoImpostoFonte: false,
      status: QuoteStatus.PENDING,
      revision: 0,
    };
    setEditingQuote(newQuote);
    setIsQuoteModalOpen(true);
  };


  const handleApproveQuote = (quote: Quote, newSO: ServiceOrder) => {
    onApproveQuote?.(quote, newSO);
    setViewingQuote(null);
  };

  const getClientName = (clienteId: string) => clients.find(c => c.id === clienteId)?.razaoSocial || clienteId;

  const getStatusBadge = (status?: QuoteStatus) => {
    if (status === QuoteStatus.APPROVED) return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">Aprovado</span>;
    if (status === QuoteStatus.REJECTED) return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 uppercase tracking-wider">Reprovado</span>;
    return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">Pendente</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Orçamentos Emitidos</h3>
          <p className="text-sm text-slate-500 font-medium italic mt-1">Gestão de propostas comerciais e aprovações.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => toggleViewMode()}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => toggleViewMode()}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleGenerateNewQuote}
            className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> Nova Proposta
          </button>
        </div>
      </div>

      {quotes.length > 0 ? (
        viewMode === 'list' ? (
          <div className="rectilinear-container custom-scrollbar shadow-sm">
            <table className="rectilinear-table">
              <thead>
                <tr>
                  <th className="rectilinear-th col-md text-center pl-8">Orçamento</th>
                  <th className="rectilinear-th col-lg text-center">Cliente / Empresa</th>
                  <th className="rectilinear-th col-sm text-center">Emissão</th>
                  <th className="rectilinear-th col-sm text-center">Validade</th>
                   <th className="rectilinear-th col-sm text-center">Total (R$)</th>
                   <th className="rectilinear-th col-sm text-center">Comissão</th>
                   <th className="rectilinear-th col-sm text-center">Status</th>
                  <th className="rectilinear-th col-md text-center pr-8">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {quotes.map(quote => {
                  const total = quote.items.reduce((s, i) => s + (i.valorTotal || 0), 0);
                  const isApproved = quote.status === QuoteStatus.APPROVED;
                  return (
                    <tr key={quote.id} className="rectilinear-tr group">
                      <td className="rectilinear-td col-md text-center pl-8 font-black text-slate-900 dark:text-white uppercase">
                        {quote.id}
                        {quote.revision && quote.revision > 0 ? (
                          <span className="ml-1 text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">R{quote.revision}</span>
                        ) : null}
                      </td>
                      <td className="rectilinear-td text-left text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={getClientName(quote.clienteId)}>
                        {getClientName(quote.clienteId)}
                      </td>
                      <td className="rectilinear-td text-center text-xs text-slate-500 font-medium">{formatDate(quote.dataEmissao)}</td>
                      <td className="rectilinear-td text-center text-xs text-slate-500 font-medium">{formatDate(quote.validade)}</td>
                      <td className="rectilinear-td text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        {formatNumber(total)}
                      </td>
                      <td className="rectilinear-td text-center">
                        <div className="flex items-center justify-center">
                          {quote.comissaoVendedor ? (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" title="Comissão Habilitada"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" title="Sem Comissão"></span>
                          )}
                        </div>
                      </td>
                      <td className="rectilinear-td text-center">
                        <div className="flex items-center justify-center">
                          {getStatusBadge(quote.status)}
                        </div>
                      </td>
                      <td className="rectilinear-td text-center pr-8">
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewingQuote(quote)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Visualizar"><Eye className="w-4 h-4" /></button>
                          {!isApproved && (
                            <button onClick={() => { setEditingQuote(quote); setIsQuoteModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Editar"><Pencil className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleDownloadPdf(quote, clients.find(c => c.id === quote.clienteId), documentTemplates)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Gerar PDF"><FileText className="w-4 h-4" /></button>
                          {!isApproved && (
                            <button onClick={() => onDeleteQuote(quote.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rectilinear-grid">
            {quotes.map(quote => {
              const total = quote.items.reduce((s, i) => s + (i.valorTotal || 0), 0);
              const isApproved = quote.status === QuoteStatus.APPROVED;
              return (
                <div key={quote.id} className="rectilinear-card group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{quote.id}</span>
                        {quote.comissaoVendedor && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Comissão Habilitada"></span>
                        )}
                      </div>
                      {getStatusBadge(quote.status)}
                    </div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white truncate mb-2" title={getClientName(quote.clienteId)}>
                      {getClientName(quote.clienteId)}
                    </h4>
                    <div className="space-y-1 mb-6">
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic">Emissão: {formatDate(quote.dataEmissao)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic">Validade: {formatDate(quote.validade)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Valor Total</p>
                      <FinancialValue value={total} className="text-xl font-black text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                    <button onClick={() => setViewingQuote(quote)} className="flex-1 py-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-all">Ver Detalhes</button>
                    {!isApproved && (
                      <button onClick={() => { setEditingQuote(quote); setIsQuoteModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDownloadPdf(quote, clients.find(c => c.id === quote.clienteId), documentTemplates)} className="p-2 text-slate-400 hover:text-blue-600"><FileText className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Nenhum orçamento emitido</h3>
          <p className="text-slate-500 text-sm">Clique em "Nova Proposta" para criar o seu primeiro orçamento.</p>
        </div>
      )}

      {/* Modals */}
      <QuoteEditModal
        quote={editingQuote}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSave={onSaveQuote}
        clients={clients}
        priceTables={priceTables}
        paymentMethods={paymentMethods}
      />
      <AnimatePresence>
        {viewingQuote && (
          <QuoteViewModal
            quote={viewingQuote}
            client={clients.find(c => c.id === viewingQuote.clienteId)}
            onClose={() => setViewingQuote(null)}
            onApprove={handleApproveQuote}
            onSave={onSaveQuote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
