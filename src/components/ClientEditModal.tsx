import React, { useEffect } from 'react';
import { Client, ClientStatus } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientSchema, ClientFormData } from '../schemas';
import { X, Save, Building2, MapPin, Phone, Mail, FileText, CheckCircle2, User, HelpCircle, Activity, Globe, Download, Camera, Loader2, ArrowRight, Trash2, ShieldAlert, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientEditModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClient: Client) => void;
  onDelete: (id: string) => void;
}

export default function ClientEditModal({ client, isOpen, onClose, onSave, onDelete }: ClientEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isValid },
    watch
  } = useForm<ClientFormData>({
    resolver: zodResolver(ClientSchema),
    defaultValues: client || {
      razaoSocial: '',
      cnpj: '',
      enderecoPrincipal: '',
      enderecoColeta: '',
      solicitanteNome: '',
      solicitanteEmail: '',
      solicitanteContato: '',
      emailFinanceiro: '',
      emailCertificados: '',
      retencaoImpostoFonte: false,
      restricaoPagamento: false,
      status: ClientStatus.NOT_UPDATED,
      funcionarioCadastro: '',
      inscricaoMunicipal: '',
      inscricaoEstadual: '',
    },
    mode: 'onChange'
  });

  useEffect(() => {
    if (client) {
      reset(client);
    } else {
      reset({
        razaoSocial: '',
        cnpj: '',
        enderecoPrincipal: '',
        enderecoColeta: '',
        solicitanteNome: '',
        solicitanteEmail: '',
        solicitanteContato: '',
        emailFinanceiro: '',
        emailCertificados: '',
        retencaoImpostoFonte: false,
        restricaoPagamento: false,
        status: ClientStatus.NOT_UPDATED,
        funcionarioCadastro: '',
        inscricaoMunicipal: '',
        inscricaoEstadual: '',
      });
    }
  }, [client, reset]);

  const onSubmit = (data: ClientFormData) => {
    onSave({ ...data, id: client?.id || '' } as Client);
    onClose();
  };

  const isBilledRestricted = watch('restricaoPagamento');
  const [isFetchingCnpj, setIsFetchingCnpj] = React.useState(false);

  const fetchCnpjData = async (cnpjValue: string) => {
    const endpoints = [
      'https://brasilapi.com.br/api/cnpj/v1',
      'https://brasilapi.dev/api/cnpj/v1'
    ];

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/${cnpjValue}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('CNPJ não encontrado');
          }
          throw new Error(`Falha ao buscar CNPJ (${response.status})`);
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;
        console.warn(`CNPJ lookup failed for ${endpoint}:`, error);
      }
    }

    throw lastError || new Error('Falha ao buscar CNPJ');
  };

  const handleSearchCnpj = async () => {
    const cnpjValue = watch('cnpj')?.replace(/\D/g, '');
    if (!cnpjValue || cnpjValue.length !== 14) {
      toast.error('Por favor, informe um CNPJ válido com 14 dígitos (apenas números).');
      return;
    }

    setIsFetchingCnpj(true);
    try {
      const data = await fetchCnpjData(cnpjValue);

      if (data.razao_social) {
        setValue('razaoSocial', data.razao_social, { shouldDirty: true, shouldValidate: true });
      }

      const addressParts = [];
      if (data.logradouro) addressParts.push(`${data.descricao_tipo_de_logradouro || ''} ${data.logradouro}`.trim());
      if (data.numero) addressParts.push(data.numero);
      if (data.bairro) addressParts.push(data.bairro);
      if (data.municipio) addressParts.push(`${data.municipio} - ${data.uf}`);

      if (addressParts.length > 0) {
        setValue('enderecoPrincipal', addressParts.join(', '), { shouldDirty: true });
      }

      if (data.ddd_telefone_1) {
        setValue('solicitanteContato', data.ddd_telefone_1, { shouldDirty: true });
      }
    } catch (error: any) {
      console.error(error);
      if (error?.message === 'CNPJ não encontrado') {
        toast.error('CNPJ não encontrado. Verifique se o número está correto.');
      } else {
        toast.error('Não foi possível buscar as informações do CNPJ. Verifique a conexão ou se o CNPJ é válido.');
      }
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-[101] p-1"
          >
            <div className="premium-card overflow-hidden">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {client ? 'Editar Cliente' : 'Novo Cadastro'}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {client?.razaoSocial || 'Preencha as informações da entidade'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>              <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-10 space-y-8 sm:space-y-10">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Informações Fiscais & Identidade</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Razão Social *</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          {...register('razaoSocial')}
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border ${errors.razaoSocial ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white`}
                          placeholder="Nome da Empresa"
                        />
                      </div>
                      {errors.razaoSocial && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.razaoSocial.message}</p>}
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ *</label>
                      <div className="relative group flex items-center">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                        <input
                          {...register('cnpj')}
                          className={`w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border ${errors.cnpj ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white`}
                          placeholder="00.000.000/0000-00"
                        />
                        <button
                          type="button"
                          onClick={handleSearchCnpj}
                          disabled={isFetchingCnpj}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors disabled:opacity-50"
                          title="Buscar CNPJ na Receita"
                        >
                          {isFetchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.cnpj && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.cnpj.message}</p>}
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha do Portal</label>
                      <div className="relative group">
                        <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="password"
                          {...register('senha')}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Inscrição Municipal</label>
                      <input
                        {...register('inscricaoMunicipal')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="Caso possua"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Inscrição Estadual</label>
                      <input
                        {...register('inscricaoEstadual')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="Caso possua"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Localização & Logística</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço Principal *</label>
                      <input
                        {...register('enderecoPrincipal')}
                        className={`w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border ${errors.enderecoPrincipal ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white`}
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                      />
                      {errors.enderecoPrincipal && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.enderecoPrincipal.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço de Coleta (Opcional)</label>
                      <input
                        {...register('enderecoColeta')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="Caso seja diferente do principal"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacts Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Contatos de Negócio</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Solicitante *</label>
                      <input
                        {...register('solicitanteNome')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="Nome do contato"
                      />
                      {errors.solicitanteNome && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.solicitanteNome.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Solicitante</label>
                      <input
                        {...register('solicitanteEmail')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="contato@empresa.com"
                      />
                      {errors.solicitanteEmail && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.solicitanteEmail.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone / Whats</label>
                      <input
                        {...register('solicitanteContato')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="(00) 00000-0000"
                      />
                      {errors.solicitanteContato && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.solicitanteContato.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Automation Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Automação de Envio</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Financeiro</label>
                      <input
                        {...register('emailFinanceiro')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="faturamento@empresa.com"
                      />
                      {errors.emailFinanceiro && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.emailFinanceiro.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Certificados</label>
                      <input
                        {...register('emailCertificados')}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white"
                        placeholder="qualidade@empresa.com"
                      />
                      {errors.emailCertificados && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.emailCertificados.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Flags Section */}
                <div className="pt-8 border-t border-slate-50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <label className={`flex items-center space-x-4 p-4 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer select-none ${watch('retencaoImpostoFonte') ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" {...register('retencaoImpostoFonte')} className="hidden" />
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${watch('retencaoImpostoFonte') ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                      {watch('retencaoImpostoFonte') && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-widest">Retenção de Imposto</p>
                      <p className="text-[10px] font-bold opacity-60">Deduzir 4.65% na fonte automaticamente</p>
                    </div>
                  </label>

                  <label className={`flex items-center space-x-4 p-4 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer select-none ${isBilledRestricted ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" {...register('restricaoPagamento')} className="hidden" />
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isBilledRestricted ? 'bg-rose-600 border-rose-600' : 'border-slate-200'}`}>
                      {isBilledRestricted && <AlertCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-widest">Restrição de Pagamento</p>
                      <p className="text-[10px] font-bold opacity-60">Sinalizar bloqueio comercial por inadimplência</p>
                    </div>
                  </label>
                </div>

                {/* Footer Actions */}
                <div className="pt-10 border-t border-slate-50 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl -mx-4 sm:-mx-10 px-4 sm:px-10 pb-6 sm:pb-10">
                  <div className="flex items-center space-x-3 order-2 md:order-1">
                    {client && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este cliente?')) {
                            onDelete(client.id);
                            onClose();
                          }
                        }}
                        className="flex items-center px-4 sm:px-6 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir Registro
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 sm:px-6 py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all"
                    >
                      Descartar
                    </button>
                  </div>

                  <div className="flex flex-col items-center md:items-end w-full md:w-auto order-1 md:order-2 gap-2">
                    <button
                      type="submit"
                      title="Salvar alterações"
                      className="flex items-center px-10 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 w-full md:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 dark:shadow-none"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {client ? 'Gravar Alterações' : 'Finalizar Cadastro'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}