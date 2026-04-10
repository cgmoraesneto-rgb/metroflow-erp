import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { ServiceOrder, Quote, Client, InstrumentStatus, CertificateStatus, CalibrationRecord } from '../types';
import { GENERAL_LETTERHEAD } from '../utils/letterheads';
import { generateServiceOrderPdf } from '../utils/pdfGenerator';
import ServiceOrderEditModal from './ServiceOrderEditModal';
import { FileText, Plus, Search, User, MapPin, Phone, Mail, ClipboardList, Trash2, Edit3, Eye, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface ServiceOrdersSectionProps {
  clients: Client[];
  quotes: Quote[];
  serviceOrders: ServiceOrder[];
  calibrationRecords?: CalibrationRecord[];
  onSaveServiceOrder: (serviceOrder: ServiceOrder) => void;
  onDeleteServiceOrder: (serviceOrderId: string) => void;
}

function scopeAlert(os: ServiceOrder, quote: Quote | undefined, records: CalibrationRecord[]) {
    if (!quote) return null;
    const budgetedTotal = quote.items.reduce((sum, item) => sum + (item.quantidade || 1), 0);
    const completedRecords = records.filter(
        r => r.serviceOrderId === os.id &&
            (r.status === CertificateStatus.APPROVED || r.status === CertificateStatus.READY_FOR_SENDING)
    ).length;
    const allRecords = records.filter(r => r.serviceOrderId === os.id && !r.isDraft).length;

    if (allRecords > budgetedTotal) {
        return { type: 'over', msg: `${allRecords} reg. / ${budgetedTotal} orçado`, color: 'rose' };
    }
    if (completedRecords === budgetedTotal) {
        return { type: 'ok', msg: `Escopo Completo (${budgetedTotal}/${budgetedTotal})`, color: 'emerald' };
    }
    return { type: 'pending', msg: `${completedRecords}/${budgetedTotal} regs.`, color: 'amber' };
}

export default function ServiceOrdersSection({ clients, quotes, serviceOrders, calibrationRecords = [], onSaveServiceOrder, onDeleteServiceOrder }: ServiceOrdersSectionProps) {
  const { documentTemplates } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const filteredOS = serviceOrders.filter(os => {
    const client = clients.find(c => c.id === os.clienteId);
    const searchStr = `${os.id} ${os.orcamentoId} ${client?.razaoSocial}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });


  const handleGenerateServiceOrder = (quoteId: string) => {
    const selectedQuote = quotes.find(q => q.id === quoteId);
    if (!selectedQuote) {
      toast.error('Selecione um orçamento válido para gerar a Ordem de Serviço.');
      return;
    }

    let maxSeq = 0;
    serviceOrders.forEach(os => {
      const match = os.id.match(/^OSW26(\d+)$/);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const newSeq = (maxSeq + 1).toString().padStart(4, '0');
    const newServiceOrderId = `OSW26${newSeq}`;

    const entryDate = new Date().toISOString().split('T')[0];

    const newServiceOrder: ServiceOrder = {
      id: newServiceOrderId,
      orcamentoId: selectedQuote.id,
      clienteId: selectedQuote.clienteId,
      dataEntrada: entryDate,
      dataSaida: '',
      responsavelEntrada: 'Responsável Padrão',
      responsavelSaida: '',
      tecnicoExecutante: '',
      statusServico: InstrumentStatus.IN_PROGRESS,
      statusCertificado: CertificateStatus.BEING_MADE,
    };
    onSaveServiceOrder(newServiceOrder);
  };

  const handleEditServiceOrder = (serviceOrder: ServiceOrder) => {
    setEditingServiceOrder(serviceOrder);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h2>
            <p className="text-sm text-gray-500">Gerencie o fluxo de trabalho técnico a partir de orçamentos aprovados.</p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-10">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center">
            <Plus className="mr-2 w-4 h-4 text-indigo-600" />
            Gerar Nova O.S.
          </h3>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-grow space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Selecione o Orçamento</label>
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm bg-white"
              >
                <option value="">Selecione um orçamento aprovado</option>
                {quotes.map(quote => (
                  <option key={quote.id} value={quote.id}>
                    {quote.id} - {clients.find(c => c.id === quote.clienteId)?.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => {
                if (selectedQuoteId) {
                  handleGenerateServiceOrder(selectedQuoteId);
                  setSelectedQuoteId('');
                } else {
                  toast.error('Selecione um orçamento primeiro.');
                }
              }} 
              className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center whitespace-nowrap"
            >
              Gerar O.S.
            </button>
          </div>
        </div>

        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Pesquisar por OS, Orçamento ou Cliente..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List view (Layout Retilíneo Estrito) */}
        <div className="rectilinear-container custom-scrollbar shadow-sm">
          <table className="rectilinear-table">
            <thead>
              <tr>
                <th className="rectilinear-th col-sm">O.S. Nº</th>
                <th className="rectilinear-th col-sm">Ref. Orç.</th>
                <th className="rectilinear-th col-lg">Cliente / Empresa</th>
                <th className="rectilinear-th col-md">Solicitante</th>
                <th className="rectilinear-th col-md">Escopo Resumo</th>
                <th className="rectilinear-th col-sm">Entrada</th>
                <th className="rectilinear-th col-sm">Status Serv.</th>
                <th className="rectilinear-th col-md text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredOS.map((os) => {
                const client = clients.find(c => c.id === os.clienteId);
                const quote = quotes.find(q => q.id === os.orcamentoId);
                const alert = scopeAlert(os, quote, calibrationRecords);
                const itemsSummary = quote?.items.map(i => i.descricao).join(', ') || 'Sem itens';
                
                return (
                  <tr key={os.id} className="rectilinear-tr group">
                    <td className="rectilinear-td font-black text-slate-900 dark:text-white uppercase">{os.id}</td>
                    <td className="rectilinear-td text-xs font-bold text-indigo-600 dark:text-indigo-400">{os.orcamentoId}</td>
                    <td className="rectilinear-td text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={client?.razaoSocial}>
                      {client?.razaoSocial}
                    </td>
                    <td className="rectilinear-td text-sm text-slate-600 dark:text-slate-400 truncate" title={client?.solicitanteNome}>
                      {client?.solicitanteNome || '-'}
                    </td>
                    <td className="rectilinear-td">
                      <div className="flex items-center gap-2">
                        {alert && (
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${
                            alert.color === 'rose' ? 'bg-rose-500' :
                            alert.color === 'emerald' ? 'bg-emerald-500' :
                            'bg-amber-500'
                          }`} title={alert.msg} />
                        )}
                        <span className="text-xs text-slate-500 truncate" title={itemsSummary}>{itemsSummary}</span>
                      </div>
                    </td>
                    <td className="rectilinear-td text-xs text-slate-500 font-medium">{os.dataEntrada}</td>
                    <td className="rectilinear-td">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                        os.statusServico === InstrumentStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20'
                      }`}>
                        {os.statusServico}
                      </span>
                    </td>
                    <td className="rectilinear-td">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={async () => {
                          const promise = generateServiceOrderPdf(os, client, quote, documentTemplates);
                          toast.promise(promise, {
                            loading: 'Gerando PDF da O.S...',
                            success: 'O.S. gerada!',
                            error: 'Erro ao gerar PDF.'
                          });
                          await promise;
                        }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Gerar PDF"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => handleEditServiceOrder(os)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleEditServiceOrder(os)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Editar"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteServiceOrder(os.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingServiceOrder && (
        <ServiceOrderEditModal
          key={editingServiceOrder.id}
          serviceOrder={editingServiceOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={(updatedOrder) => {
            onSaveServiceOrder(updatedOrder);
            setIsModalOpen(false);
          }}
          quotes={quotes}
          clients={clients}
        />
      )}
    </div>
  );
}
