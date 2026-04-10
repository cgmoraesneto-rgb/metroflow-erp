import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { X, Save, Plus, Trash2, Search, ArrowRight, Upload, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { Quote, QuoteItem, Client, ClientStatus, QuoteStatus, PriceTable, PaymentMethod, DocumentTemplate } from '../types';
import { GENERAL_LETTERHEAD } from '../utils/letterheads';
import { generateQuotePdf } from '../utils/pdfGenerator';
import { formatNumber } from '../utils/formatters';

export interface QuoteEditModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuote: Quote) => void;
  clients: Client[];
  priceTables: PriceTable[];
  paymentMethods: PaymentMethod[];
}

// const priceTables = ['Padrão', 'Premium', 'Desconto']; // Example price tables - now passed as prop

// Define um objeto Quote padrão para inicialização
const defaultQuote: Quote = {
  id: '',
  clienteId: '',
  dataEmissao: '',
  validade: '',
  comissaoVendedor: false,
  tabelaPrecos: '',
  formaPagamento: '',
  items: [],
  clienteCnpj: '',
  clienteEndereco: '',
  clienteSolicitanteNome: '',
  clienteSolicitanteEmail: '',
  clienteSolicitanteContato: '',
  clienteEmailFinanceiro: '',
  clienteRetencaoImpostoFonte: false,
};

export default function QuoteEditModal({
  quote,
  isOpen,
  onClose,
  onSave,
  clients,
  priceTables,
  paymentMethods,
}: QuoteEditModalProps) {
  const [formData, setFormData] = useState<Quote | null>({ ...defaultQuote, ...(quote || {}) });
  const [newItem, setNewItem] = useState<Omit<QuoteItem, 'item'>>({
    descricao: '',
    quantidade: 1,
    tipoServico: '',
    local: 'Laboratório',
    valorUnitario: 0,
    desconto: 0,
    valorUnitarioFinal: 0,
    valorTotal: 0,
  });

  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');

  const selectedPriceTable = priceTables.find(table => table.nome === formData?.tabelaPrecos);

  const calculateFinalValues = (item: Omit<QuoteItem, 'item'>) => {
    const valorUnitarioFinal = item.valorUnitario * (1 - (item.desconto / 100));
    const valorTotal = item.quantidade * valorUnitarioFinal;
    return { valorUnitarioFinal, valorTotal };
  };

  const isApproved = formData?.status === QuoteStatus.APPROVED;

  useEffect(() => {
    if (selectedPriceTable && selectedInstrument && selectedServiceType) {
      const itemFromTable = selectedPriceTable.items.find(item => item.nomeInstrumento === selectedInstrument);
      if (itemFromTable) {
        let valorUnitario = 0;
        switch (selectedServiceType) {
          case 'Rastreável':
            valorUnitario = itemFromTable.valorRastreavel;
            break;
          case 'Acreditado':
            valorUnitario = itemFromTable.valorAcreditado;
            break;
          case 'Manutenção':
            valorUnitario = itemFromTable.manutencao;
            break;
          case 'Ensaio':
            valorUnitario = itemFromTable.ensaio;
            break;
          case 'Teste':
            valorUnitario = itemFromTable.teste;
            break;
          case 'Qualificação':
            valorUnitario = itemFromTable.qualificacao;
            break;
          default:
            valorUnitario = 0;
        }

        setNewItem(prev => {
          const updatedItem = {
            ...prev,
            descricao: selectedInstrument,
            tipoServico: selectedServiceType,
            valorUnitario: valorUnitario,
          };
          const { valorUnitarioFinal, valorTotal } = calculateFinalValues(updatedItem);
          return { ...updatedItem, valorUnitarioFinal, valorTotal };
        });
      }
    }
  }, [selectedPriceTable, selectedInstrument, selectedServiceType, newItem.desconto, newItem.quantidade]);

  const handleSelectInstrument = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInstrument(e.target.value);
  };

  const handleSelectServiceType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedServiceType(e.target.value);
  };

  const prevQuoteIdRef = useRef<string | undefined>(quote?.id);
  useEffect(() => {
    if (quote?.id !== prevQuoteIdRef.current) {
        setFormData({ ...defaultQuote, ...(quote || {}) });
        prevQuoteIdRef.current = quote?.id;
    }
    
    if (quote && quote.clienteId) {
      const selectedClient = clients.find(c => c.id === quote.clienteId);
      if (selectedClient) {
        setFormData(prevData => ({
          ...prevData!,
          clienteId: selectedClient.id,
          clienteCnpj: selectedClient.cnpj,
          clienteEndereco: selectedClient.enderecoPrincipal,
          clienteSolicitanteNome: selectedClient.solicitanteNome,
          clienteSolicitanteEmail: selectedClient.solicitanteEmail,
          clienteSolicitanteContato: selectedClient.solicitanteContato,
          clienteEmailFinanceiro: selectedClient.emailFinanceiro,
          clienteRetencaoImpostoFonte: selectedClient.retencaoImpostoFonte,
        }));
      }
    }
  }, [quote, clients]);

  const selectedClient = clients.find(c => c.id === formData?.clienteId);

  const showAlert = selectedClient && (selectedClient.status === ClientStatus.NOT_UPDATED || selectedClient.restricaoPagamento);

  if (!isOpen || !formData) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prevData) => {
      const newData = { ...prevData, [name]: val };
      
      // Auto-fill client data if client changed
      if (name === 'clienteId') {
        const client = clients.find(c => c.id === value);
        if (client) {
          return {
            ...newData,
            clienteCnpj: client.cnpj,
            clienteEndereco: client.enderecoPrincipal,
            clienteSolicitanteNome: client.solicitanteNome,
            clienteSolicitanteEmail: client.solicitanteEmail,
            clienteSolicitanteContato: client.solicitanteContato,
            clienteEmailFinanceiro: client.emailFinanceiro,
            clienteRetencaoImpostoFonte: client.retencaoImpostoFonte,
          };
        }
      }
      return newData;
    });
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem((prevItem) => {
      const updatedItem = {
        ...prevItem,
        [name]: name === 'quantidade' || name === 'desconto' ? parseFloat(value) || 0 : value,
      };
      const { valorUnitarioFinal, valorTotal } = calculateFinalValues(updatedItem);
      return { ...updatedItem, valorUnitarioFinal, valorTotal };
    });
  };

  const handleAddItem = () => {
    if (newItem.descricao && newItem.quantidade > 0 && newItem.valorUnitarioFinal >= 0) {
      setFormData((prevData) => {
        const itemToAdd: QuoteItem = {
          ...newItem,
          item: prevData.items.length + 1,
        };
        return {
          ...prevData,
          items: [...prevData.items, itemToAdd],
        };
      });
      setNewItem({
        descricao: '',
        quantidade: 1,
        tipoServico: '',
        local: 'Laboratório',
        valorUnitario: 0,
        desconto: 0,
        valorUnitarioFinal: 0,
        valorTotal: 0,
      });
      setSelectedInstrument('');
      setSelectedServiceType('');
    }
  };

  const handleRemoveItem = (itemIndex: number) => {
    setFormData((prevData) => {
      const updatedItems = prevData.items.filter((_, index) => index !== itemIndex);
      return {
        ...prevData,
        items: updatedItems.map((item, index) => ({ ...item, item: index + 1 })), // Re-index items
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      try {
        await onSave(formData);
        onClose();
      } catch (error) {
        console.error("Erro ao salvar orçamento:", error);
        toast.error("Erro ao salvar o orçamento. Tente novamente.");
      }
    }
  };

  const { documentTemplates } = useData();

  const handleGeneratePdf = async () => {
    if (formData) {
      try {
        await generateQuotePdf(formData, clients.find(c => c.id === formData.clienteId), documentTemplates);
      } catch (err) {
        console.error("PDF generation error:", err);
        toast.error("Erro ao gerar PDF.");
      }
    }
  };

  const totalQuoteValue = formData.items.reduce((sum, item) => sum + item.valorTotal, 0);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Editar Orçamento: {formData.id}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {showAlert && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
              <p className="font-bold">Atenção!</p>
              <p>
                Este cliente possui:
                {selectedClient?.status === ClientStatus.NOT_UPDATED && ' Cadastro Não Atualizado'}
                {selectedClient?.status === ClientStatus.NOT_UPDATED && selectedClient?.restricaoPagamento && ' e'}
                {selectedClient?.restricaoPagamento && ' Restrição de Pagamento'}.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="clienteId" className="block text-sm font-medium text-gray-700">Cliente</label>
              <select
                name="clienteId"
                id="clienteId"
                value={formData.clienteId}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.razaoSocial} ({client.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="clienteCnpj" className="block text-sm font-medium text-gray-700">CNPJ</label>
              <input
                type="text"
                name="clienteCnpj"
                id="clienteCnpj"
                value={formData.clienteCnpj}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            <div>
              <label htmlFor="clienteEndereco" className="block text-sm font-medium text-gray-700">Endereço Principal</label>
              <input
                type="text"
                name="clienteEndereco"
                id="clienteEndereco"
                value={formData.clienteEndereco}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            <div>
              <label htmlFor="clienteSolicitanteNome" className="block text-sm font-medium text-gray-700">Nome Solicitante</label>
              <input
                type="text"
                name="clienteSolicitanteNome"
                id="clienteSolicitanteNome"
                value={formData.clienteSolicitanteNome}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            <div>
              <label htmlFor="clienteSolicitanteEmail" className="block text-sm font-medium text-gray-700">Email Solicitante</label>
              <input
                type="email"
                name="clienteSolicitanteEmail"
                id="clienteSolicitanteEmail"
                value={formData.clienteSolicitanteEmail}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            <div>
              <label htmlFor="clienteSolicitanteContato" className="block text-sm font-medium text-gray-700">Contato Solicitante</label>
              <input
                type="text"
                name="clienteSolicitanteContato"
                id="clienteSolicitanteContato"
                value={formData.clienteSolicitanteContato}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            {/* Financeiro row: 1 col param, 2 cols checkboxes */}
            <div>
              <label htmlFor="clienteEmailFinanceiro" className="block text-sm font-medium text-gray-700">Email Financeiro</label>
              <input
                type="email"
                name="clienteEmailFinanceiro"
                id="clienteEmailFinanceiro"
                value={formData.clienteEmailFinanceiro}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                disabled
              />
            </div>
            <div className="col-span-2 flex items-center gap-6 mt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="clienteRetencaoImpostoFonte"
                  id="clienteRetencaoImpostoFonte"
                  checked={formData.clienteRetencaoImpostoFonte}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  disabled
                />
                <label htmlFor="clienteRetencaoImpostoFonte" className="ml-2 block text-sm text-gray-900">Retenção de Imposto na Fonte</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="comissaoVendedor"
                  id="comissaoVendedor"
                  checked={formData.comissaoVendedor}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="comissaoVendedor" className="ml-2 block text-sm text-gray-900 font-bold text-indigo-600">Comissão para Vendedor</label>
              </div>
            </div>

            {/* Price Table, Payment, Commissioner */}
            <div>
              <label htmlFor="tabelaPrecos" className="block text-sm font-medium text-gray-700">Tabela de Preços</label>
              <select
                name="tabelaPrecos"
                id="tabelaPrecos"
                value={formData.tabelaPrecos}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Selecione uma tabela de preços</option>
                {priceTables.map((table) => (
                  <option key={table.id} value={table.nome}>{table.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="formaPagamento" className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
              <select
                name="formaPagamento"
                id="formaPagamento"
                value={formData.formaPagamento}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Selecione uma forma de pagamento</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.description}>{pm.description}</option>
                ))}
              </select>
            </div>
            
            {formData.comissaoVendedor ? (
              <div>
                <label htmlFor="nomeComissionado" className="block text-sm font-medium text-gray-700">Nome do Comissionado</label>
                <input
                  type="text"
                  name="nomeComissionado"
                  id="nomeComissionado"
                  value={formData.nomeComissionado || ''}
                  onChange={handleChange}
                  placeholder="Nome de quem recebe a comissão"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
            ) : (
              <div></div> /* Empty div to keep the 3-column grid aligned if nothing else fits */
            )}

            <div className="col-span-1 md:col-span-2">
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                name="observacoes"
                id="observacoes"
                rows={5}
                value={formData.observacoes || ''}
                onChange={handleChange}
                placeholder="Anotações adicionais que aparecerão no orçamento e na O.S."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="dataEmissao" className="block text-sm font-medium text-gray-700">Data de Emissão <span className="text-xs text-gray-400 font-normal italic">(Calculado)</span></label>
                <input
                  type="date"
                  name="dataEmissao"
                  id="dataEmissao"
                  value={formData.dataEmissao}
                  className="mt-1 block w-full border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500 rounded-md shadow-sm p-2"
                  required
                  disabled
                />
              </div>
              <div>
                <label htmlFor="validade" className="block text-sm font-medium text-gray-700">Validade <span className="text-xs text-gray-400 font-normal italic">(30 Dias)</span></label>
                <input
                  type="date"
                  name="validade"
                  id="validade"
                  value={formData.validade}
                  className="mt-1 block w-full border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500 rounded-md shadow-sm p-2"
                  required
                  disabled
                />
              </div>
            </div>

          </div>

          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3">Itens do Orçamento</h3>
            <div className="space-y-3">
            <div className="rectilinear-container mt-2">
              <table className="rectilinear-table">
                <thead>
                  <tr>
                    <th className="rectilinear-th col-sm text-center">Item</th>
                    <th className="rectilinear-th col-xl text-center">Descrição do Serviço / Instrumento</th>
                    <th className="rectilinear-th col-md text-center">Total (R$)</th>
                    <th className="rectilinear-th col-sm text-center px-6">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="rectilinear-tr">
                      <td className="rectilinear-td text-center font-black text-slate-400">{item.item}</td>
                      <td className="rectilinear-td text-center font-bold text-slate-700">
                        {item.descricao} <span className="text-[10px] text-slate-400">({item.quantidade}x {item.tipoServico})</span>
                      </td>
                      <td className="rectilinear-td text-center font-black text-indigo-600">
                        {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="rectilinear-td text-center px-6">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {!isApproved && (
              <div className="mt-4 p-4 border border-gray-200 rounded-md space-y-3">
                <h4 className="text-lg font-semibold mb-2">Adicionar Novo Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="selectInstrument" className="block text-sm font-medium text-gray-700">Instrumento</label>
                  <select
                    id="selectInstrument"
                    onChange={handleSelectInstrument}
                    value={selectedInstrument}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="" disabled>Selecione um Instrumento</option>
                    {selectedPriceTable?.items.map((item) => (
                      <option key={item.id} value={item.nomeInstrumento}>{item.nomeInstrumento}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="selectServiceType" className="block text-sm font-medium text-gray-700">Tipo de Serviço</label>
                  <select
                    id="selectServiceType"
                    onChange={handleSelectServiceType}
                    value={selectedServiceType}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="" disabled>Selecione um Tipo de Serviço</option>
                    {/* Os tipos de serviço vêm dos campos da PriceTableItem */}
                    <option value="Rastreável">Rastreável</option>
                    <option value="Acreditado">Acreditado (RBC)</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Ensaio">Ensaio</option>
                    <option value="Teste">Teste</option>
                    <option value="Qualificação">Qualificação</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newItemQuantidade" className="block text-sm font-medium text-gray-700">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    id="newItemQuantidade"
                    value={newItem.quantidade}
                    onChange={handleItemChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="newItemLocal" className="block text-sm font-medium text-gray-700">Local</label>
                  <select
                    name="local"
                    id="newItemLocal"
                    value={newItem.local}
                    onChange={handleItemChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="Laboratório">Laboratório</option>
                    <option value="In Loco">In Loco</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newItemValorUnitario" className="block text-sm font-medium text-gray-700">Valor Unitário (Tabela)</label>
                  <input
                    type="number"
                    name="valorUnitario"
                    id="newItemValorUnitario"
                    value={newItem.valorUnitario}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
                    step="0.01"
                    min="0"
                    disabled
                  />
                </div>
                <div>
                  <label htmlFor="newItemDesconto" className="block text-sm font-medium text-gray-700">Desconto (%)</label>
                  <input
                    type="number"
                    name="desconto"
                    id="newItemDesconto"
                    value={newItem.desconto}
                    onChange={handleItemChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label htmlFor="newItemValorUnitarioFinal" className="block text-sm font-medium text-gray-700">Valor Unitário Final</label>
                  <input
                    type="number"
                    name="valorUnitarioFinal"
                    id="newItemValorUnitarioFinal"
                    value={newItem.valorUnitarioFinal}
                    className="mt-1 block w-full p-2 text-gray-900 font-semibold bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Total Item</label>
                  <p className="mt-1 block w-full p-2 text-gray-900 font-semibold">R$ {newItem.valorTotal.toFixed(2)}</p>
                </div>
              </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition duration-200"
                >
                  Adicionar Item
                </button>
              </div>
            )}
          </div>

          <div className="text-right text-2xl font-bold text-gray-900 mt-6 px-[10px] flex items-center justify-between">
            <span>Valor Total do Orçamento:</span>
            <span className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-600">R$</span>
              <span className="text-2xl font-black text-gray-900">{formatNumber(totalQuoteValue)}</span>
            </span>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
            >
              Gerar PDF
            </button>
            {!isApproved && (
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Salvar Orçamento
              </button>
            )}
          </div>
          {formData.criadoPor && (
            <div className="mt-2 text-right">
              <span className="text-xs text-gray-400 font-medium italic">
                Criado por {formData.criadoPor} em {formData.criadoEm || ''}
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
