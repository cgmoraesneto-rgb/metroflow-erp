import React, { useState } from 'react';
import { PriceTable, PriceTableItem } from '../types';
import { Plus, Edit2, Trash2, Save, X, Search, Copy } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const FinancialValue = ({ value }: { value: number | string | undefined }) => (
  <div className="financial-cell">
    <span className="currency">R$</span>
    <span className="value">{formatNumber(value)}</span>
  </div>
);

interface PriceTableManagementModuleProps {
  priceTables: PriceTable[];
  onSavePriceTable: (priceTable: PriceTable) => void;
  onDeletePriceTable: (id: string) => void;
  searchQuery?: string;
}

export default function PriceTableManagementModule({ priceTables, onSavePriceTable, onDeletePriceTable, searchQuery }: PriceTableManagementModuleProps) {
  const [newPriceTableName, setNewPriceTableName] = useState('');
  const [editingPriceTableId, setEditingPriceTableId] = useState<string | null>(null);
  const [editingPriceTable, setEditingPriceTable] = useState<PriceTable | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newPriceTableItem, setNewPriceTableItem] = useState<Omit<PriceTableItem, 'id'>>({
    nomeInstrumento: '',
    valorRastreavel: 0,
    valorAcreditado: 0,
    manutencao: 0,
    ensaio: 0,
    teste: 0,
    qualificacao: 0,
    logistica: 0,
  });

  const handleAddPriceTable = () => {
    if (newPriceTableName.trim() === '') return;
    const newTable: PriceTable = {
      id: `PT-${Date.now()}`,
      nome: newPriceTableName,
      items: [],
    };
    onSavePriceTable(newTable);
    setNewPriceTableName('');
  };

  const handleEditPriceTable = (table: PriceTable) => {
    setEditingPriceTableId(table.id);
    setEditingPriceTable({ ...table });
  };

  const handleSavePriceTable = () => {
    if (editingPriceTable) {
      onSavePriceTable(editingPriceTable);
      setEditingPriceTableId(null);
      setEditingPriceTable(null);
    }
  };

  const handleDeletePriceTable = (id: string) => {
    onDeletePriceTable(id);
  };

  const handleDuplicatePriceTable = (table: PriceTable) => {
    const copy: PriceTable = {
      ...table,
      id: `PT-${Date.now()}`,
      nome: `Cópia de ${table.nome}`,
      items: table.items.map(item => ({ ...item, id: `PTI-${Date.now()}-${Math.random().toString(36).slice(2)}` })),
    };
    onSavePriceTable(copy);
  };

  const handleAddItemToPriceTable = () => {
    if (editingPriceTable && newPriceTableItem.nomeInstrumento.trim() !== '') {
      if (editingItemId) {
        // Update existing item
        setEditingPriceTable(prev => ({
          ...prev!,
          items: prev!.items.map(item =>
            item.id === editingItemId ? { ...newPriceTableItem, id: editingItemId } : item
          ),
        }));
        setEditingItemId(null);
      } else {
        // Add new item
        const itemToAdd: PriceTableItem = {
          ...newPriceTableItem,
          id: `PTI-${Date.now()}`,
        };
        setEditingPriceTable(prev => ({
          ...prev!,
          items: [...prev!.items, itemToAdd],
        }));
      }
      setNewPriceTableItem({
        nomeInstrumento: '',
        valorRastreavel: 0,
        valorAcreditado: 0,
        manutencao: 0,
        ensaio: 0,
        teste: 0,
        qualificacao: 0,
        logistica: 0,
      });
    }
  };

  const handleEditItemInPriceTable = (item: PriceTableItem) => {
    setEditingItemId(item.id);
    setNewPriceTableItem({
      nomeInstrumento: item.nomeInstrumento,
      valorRastreavel: item.valorRastreavel,
      valorAcreditado: item.valorAcreditado,
      manutencao: item.manutencao,
      ensaio: item.ensaio,
      teste: item.teste,
      qualificacao: item.qualificacao,
      logistica: item.logistica || 0,
    });
  };

  const handleRemoveItemFromPriceTable = (itemId: string) => {
    if (editingPriceTable) {
      setEditingPriceTable(prev => ({
        ...prev!,
        items: prev!.items.filter(item => item.id !== itemId),
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">

        <div className="flex space-x-3 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Nome da nova tabela (ex: Tabela 2024)"
              value={newPriceTableName}
              onChange={(e) => setNewPriceTableName(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm shadow-sm"
            />
          </div>
          <button
            onClick={handleAddPriceTable}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center group active:scale-95"
          >
            <Plus className="mr-2 w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Criar Tabela
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {priceTables
          .filter(table => {
            if (!searchQuery) return true;
            const term = searchQuery.toLowerCase().trim();
            return table.nome.toLowerCase().includes(term);
          })
          .map((table) => (
          <div key={table.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{table.nome}</h4>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{table.items.length} Instrumentos</p>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDuplicatePriceTable(table)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEditPriceTable(table)}
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePriceTable(table.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (table.items.length / 20) * 100)}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {editingPriceTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Configurar Tabela</h2>
                <p className="text-sm text-gray-500">Defina os valores para cada tipo de serviço.</p>
              </div>
              <button onClick={() => { setEditingPriceTableId(null); setEditingPriceTable(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nome da Tabela</label>
                  <input
                    type="text"
                    value={editingPriceTable.nome}
                    onChange={(e) => setEditingPriceTable(prev => ({ ...prev!, nome: e.target.value }))}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-indigo-600 rounded-full mr-2"></span>
                    Itens Cadastrados
                  </h3>
                  <div className="border border-gray-100 rounded-2xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instrumento</th>
                          <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rastreável</th>
                          <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acreditado</th>
                          <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Logística</th>
                          <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {[...editingPriceTable.items].sort((a, b) => a.nomeInstrumento.localeCompare(b.nomeInstrumento, undefined, { numeric: true, sensitivity: 'base' })).map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm font-bold text-gray-700">{item.nomeInstrumento}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              <FinancialValue value={item.valorRastreavel ?? 0} />
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              <FinancialValue value={item.valorAcreditado ?? 0} />
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              <FinancialValue value={item.logistica ?? 0} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end space-x-1">
                                <button
                                  onClick={() => handleEditItemInPriceTable(item)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveItemFromPriceTable(item.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 h-fit space-y-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {editingItemId ? 'Editar Item' : 'Novo Item'}
                </h4>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Instrumento</label>
                    <input
                      type="text"
                      value={newPriceTableItem.nomeInstrumento}
                      onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, nomeInstrumento: e.target.value }))}
                      placeholder="Ex: Paquímetro 150mm"
                      className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Rastreável</label>
                      <input
                        type="number"
                        value={newPriceTableItem.valorRastreavel}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, valorRastreavel: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Acreditado</label>
                      <input
                        type="number"
                        value={newPriceTableItem.valorAcreditado}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, valorAcreditado: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Manutenção</label>
                      <input
                        type="number"
                        value={newPriceTableItem.manutencao}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, manutencao: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Ensaio</label>
                      <input
                        type="number"
                        value={newPriceTableItem.ensaio}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, ensaio: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Teste</label>
                      <input
                        type="number"
                        value={newPriceTableItem.teste}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, teste: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Qualificação</label>
                      <input
                        type="number"
                        value={newPriceTableItem.qualificacao}
                        onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, qualificacao: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Logística</label>
                    <input
                      type="number"
                      value={newPriceTableItem.logistica}
                      onChange={(e) => setNewPriceTableItem(prev => ({ ...prev!, logistica: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  {editingItemId && (
                    <button
                      onClick={() => {
                        setEditingItemId(null);
                        setNewPriceTableItem({ nomeInstrumento: '', valorRastreavel: 0, valorAcreditado: 0, logistica: 0, manutencao: 0, ensaio: 0, teste: 0, qualificacao: 0 });
                      }}
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={handleAddItemToPriceTable}
                    className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center"
                  >
                    {editingItemId ? <Save className="mr-2 w-4 h-4" /> : <Plus className="mr-2 w-4 h-4" />}
                    {editingItemId ? 'Salvar Item' : 'Adicionar Item'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end space-x-3 border-t border-gray-100 pt-8">
              <button
                type="button"
                onClick={() => { setEditingPriceTableId(null); setEditingPriceTable(null); }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSavePriceTable}
                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                Salvar Tabela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
