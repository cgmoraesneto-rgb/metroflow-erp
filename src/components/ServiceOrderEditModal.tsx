import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Edit3, Settings, Calendar, Info, Clock, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, Quote, InstrumentStatus, CertificateStatus, Client } from '../types';

interface ServiceOrderEditModalProps {
  serviceOrder: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedServiceOrder: ServiceOrder) => void;
  quotes: Quote[];
  clients: Client[];
}

export default function ServiceOrderEditModal({ serviceOrder, isOpen, onClose, onSave, quotes, clients }: ServiceOrderEditModalProps) {
  const [formData, setFormData] = useState<ServiceOrder | null>(serviceOrder);

  if (!isOpen || !formData) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      if (!prevData) return null;
      return {
        ...prevData,
        [name]: value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      try {
        await onSave(formData);
      } catch (error) {
        console.error("Erro ao salvar O.S.:", error);
        toast.error("Erro ao salvar a ordem de serviço. Tente novamente.");
      }
    }
  };

  const currentQuote = quotes.find(q => q.id === formData.orcamentoId);
  const currentClient = clients.find(c => c.id === formData.clienteId);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ordem de Serviço: {formData.id}</h2>
            <p className="text-sm text-gray-500">Detalhamento e edição da O.S.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informações do Cliente</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Razão Social / Nome</p>
                  <p className="text-sm font-bold text-gray-800">{currentClient?.razaoSocial} ({formData.clienteId})</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço Principal</p>
                  <p className="text-xs text-gray-600">{currentClient?.enderecoPrincipal}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço de Coleta</p>
                  <p className="text-xs text-gray-600">{currentClient?.enderecoColeta}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Solicitante</p>
                    <p className="text-xs text-gray-600">{currentClient?.solicitanteNome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contato</p>
                    <p className="text-xs text-gray-600">{currentClient?.solicitanteContato}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail para Certificado</p>
                  <p className="text-xs text-gray-600">{currentClient?.emailCertificados}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Itens a serem Calibrados</h3>
              <div className="space-y-2">
                {currentQuote?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs bg-white p-2 rounded-lg border border-indigo-50">
                    <span className="text-indigo-900 font-medium">{item.descricao}</span>
                    <span className="text-indigo-400 font-bold">Qtd: {item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
