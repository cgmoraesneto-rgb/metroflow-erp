import React, { useState } from 'react';
import { Employee, Bank, UnitOfMeasure, PaymentMethod, Module, Vehicle, DocumentTemplate } from '../types';
import DocumentTemplateEditor from './DocumentTemplateEditor';
import AuditLogModule from './AuditLogModule';
import { Users, Landmark, Ruler, Plus, Edit2, Trash2, XCircle, FileText, CreditCard, ShieldCheck, Mail, Phone, Briefcase, Hash, Globe, ChevronRight, Car, ActivitySquare, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { migrateERPData } from '../utils/migration';
import { QuoteStatus } from '../types';
import { executeDataMigration, fixOrphanQuoteStatus } from '../services/adminService';

interface GeneralRegistersModuleProps {
  employees: Employee[];
  banks: Bank[];
  unitsOfMeasure: UnitOfMeasure[];
  paymentMethods: PaymentMethod[];
  onSaveEmployee: (employee: Omit<Employee, 'id'> | Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onSaveBank: (bank: Omit<Bank, 'id'> | Bank) => void;
  onDeleteBank: (bankId: string) => void;
  onSaveUnit: (unit: Omit<UnitOfMeasure, 'id'> | UnitOfMeasure) => void;
  onDeleteUnit: (unitId: string) => void;
  onSavePaymentMethod: (pm: Omit<PaymentMethod, 'id'> | PaymentMethod) => void;
  onDeletePaymentMethod: (pmId: string) => void;
  documentTemplates?: DocumentTemplate[];
  onSaveDocumentTemplate?: (doc: any) => void;
  searchQuery?: string;
}

type SubTab = 'employees' | 'banks' | 'payment-methods' | 'vehicles' | 'document-templates' | 'audit';

export default function GeneralRegistersModule({
  employees,
  banks,
  unitsOfMeasure,
  paymentMethods,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveBank,
  onDeleteBank,
  onSaveUnit,
  onDeleteUnit,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  documentTemplates = [],
  onSaveDocumentTemplate,
  searchQuery
}: GeneralRegistersModuleProps) {
  const { saveItem, deleteItem, vehicles, quotes, serviceOrders, calibrationRecords, financialControls } = useData();
  const { employee } = useAuth();
  const isDeveloper = employee?.cargo?.toLowerCase()?.includes('developer') || 
                      employee?.username === 'developer' || 
                      (employee as any)?.isDeveloper === true;
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationConfirm, setMigrationConfirm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('employees');
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // Vehicle State
  const [vehicleForm, setVehicleForm] = useState<Omit<Vehicle, 'id'>>({ placa: '', modelo: '' });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const handleSaveVehicle = async () => {
    if (!vehicleForm.placa && !vehicleForm.modelo) return;
    const vehicle: Vehicle = { ...vehicleForm, id: editingVehicleId || `VEIC-${Date.now().toString().slice(-6)}` };
    await saveItem('vehicles', vehicle);
    setVehicleForm({ placa: '', modelo: '' });
    setEditingVehicleId(null);
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    try {
      toast.info('Iniciando atualização dos registros...');
      await executeDataMigration(quotes, serviceOrders, calibrationRecords, financialControls, saveItem, deleteItem);
      toast.success(`Migração e Sincronização de Status concluída!`);
      setMigrationDone(true);
      setMigrationConfirm(false);
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Erro na migração: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // DIRECT FIRESTORE FIX: Bypasses all schemas and context layers
  const [isFixingStatus, setIsFixingStatus] = useState(false);
  const handleFixQuoteStatus = async () => {
    setIsFixingStatus(true);
    try {
      toast.info(`Iniciando verificação de orçamentos...`);
      const fixedCount = await fixOrphanQuoteStatus(quotes, serviceOrders);

      if (fixedCount === 0) {
        toast.info('Todos os orçamentos vinculados já estão como Aprovados.');
        return;
      }

      toast.success(`✓ ${fixedCount} orçamento(s) atualizados para APROVADO!`);
    } catch (error: any) {
      console.error('Status fix error:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsFixingStatus(false);
    }
  };

  // Employee State
  const [employeeForm, setEmployeeForm] = useState<Omit<Employee, 'id'>>({ nome: '', username: '', cargo: '', email: '', telefone: '', permissions: [], password: '', signatureBase64: '', isSignatory: false, mustChangePassword: true });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  const handleEmployeeSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Assinatura muito grande. Limite de 500KB para assinaturas.');
      return;
    }

    setIsUploadingSignature(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setEmployeeForm(prev => ({ ...prev, signatureBase64: base64 }));
          toast.success('Assinatura processada com sucesso!');
        }
        setIsUploadingSignature(false);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo de assinatura.');
        setIsUploadingSignature(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error processing signature:", error);
      toast.error(`Erro ao processar assinatura: ${error.message || "Falha local"}`);
      setIsUploadingSignature(false);
    }
  };

  // Bank State
  const [bankForm, setBankForm] = useState<Omit<Bank, 'id'>>({ nome: '', codigo: '', agencia: '', conta: '' });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  // Unit State
  const [unitForm, setUnitForm] = useState<Omit<UnitOfMeasure, 'id'>>({ nome: '', simbolo: '' });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Payment Method State
  const [paymentMethodForm, setPaymentMethodForm] = useState<Omit<PaymentMethod, 'id'>>({ description: '' });
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<string | null>(null);

  const handleSaveEmployee = () => {
    if (!employeeForm.nome) return;

    if (employeeForm.isSignatory) {
      employees.forEach((emp) => {
        if (emp.isSignatory && emp.id !== editingEmployeeId) {
          onSaveEmployee({ ...emp, isSignatory: false });
        }
      });
    }

    onSaveEmployee(editingEmployeeId ? { ...employeeForm, id: editingEmployeeId } : employeeForm);
    setEmployeeForm({ nome: '', username: '', cargo: '', email: '', telefone: '', permissions: [], password: '', signatureBase64: '', isSignatory: false, mustChangePassword: true });
    setEditingEmployeeId(null);
  };

  const handleSaveBank = () => {
    if (!bankForm.nome) return;
    onSaveBank(editingBankId ? { ...bankForm, id: editingBankId } : bankForm);
    setBankForm({ nome: '', codigo: '', agencia: '', conta: '' });
    setEditingBankId(null);
  };

  const handleSaveUnit = () => {
    if (!unitForm.nome) return;
    onSaveUnit(editingUnitId ? { ...unitForm, id: editingUnitId } : unitForm);
    setUnitForm({ nome: '', simbolo: '' });
    setEditingUnitId(null);
  };

  const handleSavePaymentMethod = () => {
    if (!paymentMethodForm.description) return;
    onSavePaymentMethod(editingPaymentMethodId ? { ...paymentMethodForm, id: editingPaymentMethodId } : { ...paymentMethodForm, id: Date.now().toString() } as PaymentMethod);
    setPaymentMethodForm({ description: '' });
    setEditingPaymentMethodId(null);
  };

  const TAB_CONFIG = [
    { id: 'employees', label: 'Funcionários', icon: Users, color: 'indigo' },
    { id: 'banks', label: 'Bancos', icon: Landmark, color: 'amber' },
    { id: 'payment-methods', label: 'Pagamentos', icon: CreditCard, color: 'blue' },
    { id: 'vehicles', label: 'Veículos', icon: Car, color: 'emerald' },
    { id: 'document-templates', label: 'Layout', icon: FileText, color: 'rose' },
    { id: 'audit', label: 'Auditoria', icon: ActivitySquare, color: 'slate' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 block">Administração do Sistema</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Configurações</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1 w-full lg:w-auto">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center justify-center px-6 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <tab.icon className="w-4 h-4 mr-2 hidden sm:block" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
          {activeSubTab === 'employees' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={employeeForm.nome}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, nome: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Usuário de Acesso (Username)</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={employeeForm.username || ''}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: joao.silva"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo / Função</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={employeeForm.cargo}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, cargo: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: Técnico de Calibração"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="email"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={employeeForm.telefone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, telefone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="password"
                      value={employeeForm.password || ''}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Assinatura (PNG/JPG)</label>
                    <div className="relative flex items-center gap-4 p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                      <input type="file" accept="image/*" onChange={handleEmployeeSignatureUpload} className="w-full text-xs" disabled={isUploadingSignature} />
                      {isUploadingSignature && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                        </div>
                      )}
                    </div>
                    {employeeForm.signatureBase64 && (
                      <div className="flex items-center gap-3">
                        <img src={employeeForm.signatureBase64} alt="Assinatura" className="h-16 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Assinatura pronta</span>
                      </div>
                    )}
                  </div>

                  <label className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${employeeForm.isSignatory 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={employeeForm.isSignatory} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, isSignatory: e.target.checked })} 
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${employeeForm.isSignatory ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                      {employeeForm.isSignatory && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Signatário Oficial do Laboratório</p>
                      <p className="text-[9px] font-medium opacity-70">Define este funcionário como o responsável oficial pela assinatura dos certificados (ISO 17025).</p>
                    </div>
                  </label>

                  <label className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${employeeForm.mustChangePassword 
                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={employeeForm.mustChangePassword ?? true} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, mustChangePassword: e.target.checked })} 
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${employeeForm.mustChangePassword ? 'bg-amber-500 border-amber-500' : 'border-slate-200'}`}>
                      {employeeForm.mustChangePassword && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Exigir troca de senha no primeiro acesso</p>
                      <p className="text-[9px] font-medium opacity-70">O funcionário será obrigado a definir uma nova senha ao realizar o primeiro login no sistema.</p>
                    </div>
                  </label>
                </div>

                <div className="col-span-full space-y-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Módulos de Acesso do Sistema</label>
                  <div className="flex flex-wrap gap-3 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-[2rem] border border-slate-100/50 dark:border-slate-800/50">
                    {Object.values(Module).map((module) => {
                      const isSelected = employeeForm.permissions.includes(module);
                      return (
                        <label key={module} className={`flex items-center space-x-3 px-5 py-2.5 rounded-2xl border transition-all cursor-pointer select-none group active:scale-95 ${isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-900'
                          }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              const newPermissions = e.target.checked
                                ? [...employeeForm.permissions, module]
                                : employeeForm.permissions.filter((p) => p !== module);
                              setEmployeeForm({ ...employeeForm, permissions: newPermissions });
                            }}
                          />
                          <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? 'border-white bg-white' : 'border-slate-200 group-hover:border-indigo-400'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest">{module}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveEmployee}
                  className="flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none transition-all group active:scale-95"
                >
                  <Plus className={`w-4 h-4 mr-2 transition-transform duration-300 ${editingEmployeeId ? 'rotate-90' : 'rotate-0'}`} />
                  {editingEmployeeId ? 'Salvar Alterações do Perfil' : 'Cadastrar Novo Funcionário'}
                </button>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-lg">Funcionário / Nome</th>
                      <th className="rectilinear-th col-md">Resumo Cargo</th>
                      <th className="rectilinear-th col-lg">Contatos Corporativos</th>
                      <th className="rectilinear-th col-md">Permissões / Acesso</th>
                      <th className="rectilinear-th col-sm">Assinatura</th>
                      <th className="rectilinear-th col-sm px-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {employees
                      .filter(emp => {
                        if (!searchQuery) return true;
                        const term = searchQuery.toLowerCase().trim();
                        return emp.nome.toLowerCase().includes(term) ||
                               emp.cargo.toLowerCase().includes(term) ||
                               emp.email.toLowerCase().includes(term);
                      })
                      .map((emp) => (
                      <tr key={emp.id} className="rectilinear-tr group">
                        <td className="rectilinear-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase shadow-inner relative">
                              {emp.nome.charAt(0)}
                              {emp.isSignatory && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                                  <ShieldCheck className="w-2 h-2" />
                                </div>
                              )}
                            </div>
                            <div className="truncate">
                              <span className="font-black text-slate-900 dark:text-white uppercase text-xs">{emp.nome}</span>
                              {emp.username && <span className="block text-[9px] text-indigo-500 font-bold">@{emp.username}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="rectilinear-td text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                          {emp.cargo}
                        </td>
                        <td className="rectilinear-td">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500 font-medium truncate">{emp.email}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{emp.telefone}</span>
                          </div>
                        </td>
                        <td className="rectilinear-td">
                          <div className="flex flex-wrap gap-1">
                            {emp.permissions?.map(p => (
                              <span key={p} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black rounded uppercase tracking-tighter border border-slate-200/50 dark:border-slate-700/50">
                                {p.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="rectilinear-td text-center">
                          {emp.signatureBase64 ? (
                            <img src={emp.signatureBase64} alt="Assinatura" className="h-6 mx-auto rounded border border-slate-200 dark:border-slate-700 bg-white" />
                          ) : (
                            <span className="text-[9px] text-slate-300 italic">Pendente</span>
                          )}
                        </td>
                        <td className="rectilinear-td">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEmployeeForm({
                                  nome: emp.nome,
                                  username: emp.username || '',
                                  cargo: emp.cargo,
                                  email: emp.email,
                                  telefone: emp.telefone,
                                  permissions: emp.permissions || [],
                                  password: emp.password || '',
                                  signatureBase64: emp.signatureBase64 || '',
                                  isSignatory: emp.isSignatory || false,
                                  mustChangePassword: emp.mustChangePassword ?? false
                                });
                                setEditingEmployeeId(emp.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteEmployee(emp.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


            </div>
          )}

          {activeSubTab === 'banks' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instituição Bancária</label>
                  <div className="relative group">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="text"
                      value={bankForm.nome}
                      onChange={(e) => setBankForm({ ...bankForm, nome: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: Santander"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cód. Banco (COMPE)</label>
                  <div className="relative group">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="text"
                      value={bankForm.codigo}
                      onChange={(e) => setBankForm({ ...bankForm, codigo: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: 033"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Agência</label>
                  <input
                    type="text"
                    value={bankForm.agencia}
                    onChange={(e) => setBankForm({ ...bankForm, agencia: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                    placeholder="0000-0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Conta Corrente</label>
                  <input
                    type="text"
                    value={bankForm.conta}
                    onChange={(e) => setBankForm({ ...bankForm, conta: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                    placeholder="000000-0"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveBank}
                  className="flex items-center px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" /> {editingBankId ? 'Atualizar Dados Bancários' : 'Cadastrar Conta Bancária'}
                </button>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-lg">Instituição / Banco</th>
                      <th className="rectilinear-th col-sm">Cód. COMPE</th>
                      <th className="rectilinear-th col-md">Agência</th>
                      <th className="rectilinear-th col-md">Conta Corrente</th>
                      <th className="rectilinear-th col-sm px-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {banks
                      .filter(bank => {
                        if (!searchQuery) return true;
                        const term = searchQuery.toLowerCase().trim();
                        return bank.nome.toLowerCase().includes(term) ||
                               bank.codigo.toLowerCase().includes(term);
                      })
                      .map((bank) => (
                      <tr key={bank.id} className="rectilinear-tr group">
                        <td className="rectilinear-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                              <Landmark className="w-4 h-4" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white uppercase text-xs">{bank.nome}</span>
                          </div>
                        </td>
                        <td className="rectilinear-td text-xs font-mono text-slate-500">{bank.codigo}</td>
                        <td className="rectilinear-td text-sm font-bold text-slate-700 dark:text-slate-300">{bank.agencia}</td>
                        <td className="rectilinear-td text-sm font-bold text-slate-700 dark:text-slate-300">{bank.conta}</td>
                        <td className="rectilinear-td">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setBankForm({ nome: bank.nome, codigo: bank.codigo, agencia: bank.agencia, conta: bank.conta });
                                setEditingBankId(bank.id);
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteBank(bank.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'payment-methods' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição do Acordo / Forma</label>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={paymentMethodForm.description}
                      onChange={(e) => setPaymentMethodForm({ description: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                      placeholder="Ex: Boleto Bancário 28 dias"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={handleSavePaymentMethod}
                  className="flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" /> {editingPaymentMethodId ? 'Salvar Configuração de Cobrança' : 'Cadastrar Condição de Pagamento'}
                </button>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-xl">Descrição da Condição de Pagamento</th>
                      <th className="rectilinear-th col-sm px-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {paymentMethods.map((pm) => (
                      <tr key={pm.id} className="rectilinear-tr group">
                        <td className="rectilinear-td">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 shadow-inner">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white uppercase text-xs">{pm.description}</span>
                          </div>
                        </td>
                        <td className="rectilinear-td">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setPaymentMethodForm({ description: pm.description });
                                setEditingPaymentMethodId(pm.id);
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeletePaymentMethod(pm.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VEHICLES TAB */}
          {activeSubTab === 'vehicles' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa</label>
                  <input
                    value={vehicleForm.placa}
                    onChange={e => setVehicleForm(p => ({ ...p, placa: e.target.value }))}
                    placeholder="ABC-1234"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Descrição</label>
                  <input
                    value={vehicleForm.modelo}
                    onChange={e => setVehicleForm(p => ({ ...p, modelo: e.target.value }))}
                    placeholder="Fiat Uno Branco"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={handleSaveVehicle} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase shadow-md transition-all">
                    <Plus className="w-4 h-4" />{editingVehicleId ? 'Salvar Edição' : 'Adicionar Veículo'}
                  </button>
                </div>
              </div>

              <div className="rectilinear-container custom-scrollbar shadow-sm">
                <table className="rectilinear-table">
                  <thead>
                    <tr>
                      <th className="rectilinear-th col-sm">Placa</th>
                      <th className="rectilinear-th col-xl">Modelo / Descrição do Veículo</th>
                      <th className="rectilinear-th col-sm px-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {vehicles.map(v => (
                      <tr key={v.id} className="rectilinear-tr group">
                        <td className="rectilinear-td font-mono font-black text-slate-900 dark:text-white uppercase">{v.placa}</td>
                        <td className="rectilinear-td">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600">
                              <Car className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs truncate">{v.modelo}</span>
                          </div>
                        </td>
                        <td className="rectilinear-td">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setVehicleForm({ placa: v.placa, modelo: v.modelo }); setEditingVehicleId(v.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteItem('vehicles', v.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehicles.length === 0 && (
                  <p className="text-center text-slate-400 py-12 italic border-t border-slate-50 dark:border-slate-800">Nenhum veículo cadastrado.</p>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'document-templates' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(documentTemplates || []).map((template) => (
                  <div key={template.id} className="p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 transition-all group relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl text-rose-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{template.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{template.applyTo || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800/30">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[8px] font-black uppercase tracking-widest">
                        Ativo
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          className="p-2 hover:text-indigo-600 transition-colors"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setTemplateEditorOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!documentTemplates || documentTemplates.length === 0) && (
                  <p className="col-span-full py-12 text-center text-slate-400 italic">Nenhum template de documento cadastrado.</p>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'audit' && (
             <AuditLogModule />
          )}
        </div>
        {selectedTemplate && (
          <DocumentTemplateEditor
            isOpen={templateEditorOpen}
            template={selectedTemplate}
            onClose={() => setTemplateEditorOpen(false)}
            onSave={(doc) => {
              onSaveDocumentTemplate?.(doc);
              setTemplateEditorOpen(false);
              setSelectedTemplate(null);
            }}
          />
        )}
    </div>
  );
}
