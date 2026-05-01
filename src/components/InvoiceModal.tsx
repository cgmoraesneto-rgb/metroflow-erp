import React, { useState, useEffect } from 'react';
import { FinancialControl, ServiceOrder, Quote, Client, PaymentStatus, PaymentMethod, Bank } from '../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: FinancialControl) => void;
  initialData?: Partial<FinancialControl> | null;
  serviceOrder: ServiceOrder | null;
  quotes: Quote[];
  clients: Client[];
  paymentMethods: PaymentMethod[];
  banks: Bank[];
}

export default function InvoiceModal({ isOpen, onClose, onSave, initialData, serviceOrder, quotes, clients, paymentMethods, banks }: InvoiceModalProps) {
  const [invoiceData, setInvoiceData] = useState<Partial<FinancialControl>>({});

  useEffect(() => {
    if (initialData) {
        setInvoiceData(initialData);
    } else if (serviceOrder) {
      const quote = quotes.find(q => q.id === serviceOrder.orcamentoId);
      const client = clients.find(c => c.id === quote?.clienteId);

      const valorBruto = quote?.items.reduce((acc, item) => acc + item.valorTotal, 0) || 0;
      const impostosRetidos = client?.retencaoImpostoFonte ? valorBruto * 0.0465 : 0;

      setInvoiceData({
        serviceOrderId: serviceOrder.id,
        orcamentoId: serviceOrder.orcamentoId,
        clienteId: client?.id,
        valorBruto: valorBruto,
        percentualImposto: 5,
        impostosRetidos: valorBruto * 0.05,
        desconto: 0,
        valorLiquido: valorBruto - (valorBruto * 0.05),
        statusPagamento: PaymentStatus.PENDING,
        formaPagamento: quote?.formaPagamento || '',
        banco: '',
      });
    }
  }, [serviceOrder, initialData, quotes, clients]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericValue = ['valorBruto', 'impostosRetidos', 'desconto', 'valorLiquido', 'percentualImposto'].includes(name) ? parseFloat(value) || 0 : value;
    
    setInvoiceData(prev => {
      const updated = { ...prev, [name]: numericValue };
      
      // Auto-calculate tax if valorBruto or percentualImposto changes
      if (name === 'valorBruto' || name === 'percentualImposto') {
        const bruto = name === 'valorBruto' ? numericValue as number : (prev.valorBruto || 0);
        const perc = name === 'percentualImposto' ? numericValue as number : (prev.percentualImposto || 5);
        updated.impostosRetidos = bruto * (perc / 100);
      }
      
      return updated;
    });
  };

  useEffect(() => {
    const valorBruto = invoiceData.valorBruto || 0;
    const impostosRetidos = invoiceData.impostosRetidos || 0;
    const desconto = invoiceData.desconto || 0;
    setInvoiceData(prev => {
        if (prev.valorLiquido === valorBruto - impostosRetidos - desconto) return prev;
        return { ...prev, valorLiquido: valorBruto - impostosRetidos - desconto };
    });
  }, [invoiceData.valorBruto, invoiceData.impostosRetidos, invoiceData.desconto]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(invoiceData as FinancialControl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 w-full max-w-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Faturar Serviço</h2>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full uppercase tracking-widest">
              O.S.: {serviceOrder?.id}
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Número da NF</label>
              <input type="text" name="numeroNF" placeholder="Ex: 12345" value={invoiceData.numeroNF || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" required />
              <p className="text-[9px] text-gray-400 ml-1 italic">Número da Nota Fiscal de serviço emitida.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data de Emissão</label>
              <input type="date" name="dataEmissao" value={invoiceData.dataEmissao || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" required />
              <p className="text-[9px] text-gray-400 ml-1 italic">Data em que a Nota Fiscal foi gerada.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Valor Bruto (R$)</label>
              <input type="number" name="valorBruto" placeholder="0.00" value={invoiceData.valorBruto || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" required />
              <p className="text-[9px] text-gray-400 ml-1 italic">Valor total do serviço sem deduções.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Imposto (%)</label>
              <input type="number" name="percentualImposto" placeholder="5" value={invoiceData.percentualImposto ?? 5} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" />
              <p className="text-[9px] text-gray-400 ml-1 italic">Percentual de imposto para cálculo automático.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Impostos Retidos (R$)</label>
              <input type="number" name="impostosRetidos" placeholder="0.00" value={invoiceData.impostosRetidos?.toFixed(2) || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" />
              <p className="text-[9px] text-gray-400 ml-1 italic">Valor de impostos retidos (Bruto * %).</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Desconto (R$)</label>
              <input type="number" name="desconto" placeholder="0.00" value={invoiceData.desconto || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" />
              <p className="text-[9px] text-gray-400 ml-1 italic">Valor a ser subtraído do montante bruto.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Valor Líquido (R$)</label>
              <input type="number" name="valorLiquido" value={invoiceData.valorLiquido || ''} readOnly className="w-full border border-gray-100 dark:border-slate-800 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 font-black text-indigo-600 outline-none" />
              <p className="text-[9px] text-gray-400 ml-1 italic">Resultado final (Bruto - Desconto).</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data Prevista Pagamento</label>
              <input type="date" name="dataPagamento" value={invoiceData.dataPagamento || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white" />
              <p className="text-[9px] text-gray-400 ml-1 italic">Data acordada para o recebimento.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Forma de Pagamento</label>
              <select 
                name="formaPagamento" 
                value={invoiceData.formaPagamento || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white appearance-none"
                required
              >
                <option value="">Selecione...</option>
                {paymentMethods.map(pm => (
                  <option key={pm.id} value={pm.description}>{pm.description}</option>
                ))}
              </select>
              <p className="text-[9px] text-gray-400 ml-1 italic">Método de pagamento escolhido pelo cliente.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Banco / Destino</label>
              <select 
                name="banco" 
                value={invoiceData.banco || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white appearance-none"
              >
                <option value="">Selecione o banco...</option>
                {banks.map(bank => (
                  <option key={bank.id} value={bank.nome}>{bank.nome} (AG: {bank.agencia} / CC: {bank.conta})</option>
                ))}
              </select>
              <p className="text-[9px] text-gray-400 ml-1 italic">Conta bancária onde o valor será depositado.</p>
            </div>

          </div>

          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 dark:border-slate-800 pt-6 shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">Salvar Faturamento</button>
          </div>
        </form>
      </div>
    </div>
  );
}
