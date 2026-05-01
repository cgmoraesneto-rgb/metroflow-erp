import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { FinancialExpense, ExpenseCategory, PaymentStatus, Bank } from '../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<FinancialExpense>) => void;
  initialData?: Partial<FinancialExpense> | null;
  banks: Bank[];
}

export default function ExpenseModal({ isOpen, onClose, onSave, initialData, banks }: ExpenseModalProps) {
  const [formData, setFormData] = useState<Partial<FinancialExpense>>({
    descricao: '',
    valor: 0,
    dataVencimento: new Date().toISOString().substring(0, 10),
    dataPagamento: '',
    categoria: ExpenseCategory.OPERACIONAL,
    bancoId: '',
    status: PaymentStatus.PENDING,
    observacoes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData
      });
    } else {
      setFormData({
        descricao: '',
        valor: 0,
        dataVencimento: new Date().toISOString().substring(0, 10),
        dataPagamento: '',
        categoria: ExpenseCategory.OPERACIONAL,
        bancoId: '',
        status: PaymentStatus.PENDING,
        observacoes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {initialData?.id ? 'Editar Despesa' : 'Nova Despesa'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Lançamento Financeiro</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição / Fornecedor</label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  placeholder="Ex: Aluguel do mês, Fornecedor X"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor || ''}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                <select
                  required
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as ExpenseCategory })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                >
                  {Object.values(ExpenseCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={formData.dataVencimento}
                  onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Conta de Pagamento</label>
                <select
                  value={formData.bancoId || ''}
                  onChange={(e) => setFormData({ ...formData, bancoId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                >
                  <option value="">Selecione uma conta...</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.nome} ({b.agencia}/{b.conta})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => {
                    const status = e.target.value as PaymentStatus;
                    setFormData({ 
                      ...formData, 
                      status,
                      dataPagamento: status === PaymentStatus.PAID ? new Date().toISOString().substring(0, 10) : ''
                    });
                  }}
                  className={`w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-rose-500 outline-none transition-all ${
                    formData.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700' :
                    formData.status === PaymentStatus.OVERDUE ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-700'
                  }`}
                >
                  {Object.values(PaymentStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {formData.status === PaymentStatus.PAID && (
                <div className="space-y-2 animate-in fade-in">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data do Pagamento Real</label>
                  <input
                    type="date"
                    required
                    value={formData.dataPagamento || ''}
                    onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Observações</label>
                <textarea
                  rows={2}
                  value={formData.observacoes || ''}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none"
                  placeholder="Notas adicionais sobre a despesa..."
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="expense-form"
            className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 dark:shadow-none transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            Salvar Despesa
          </button>
        </div>
      </div>
    </div>
  );
}
