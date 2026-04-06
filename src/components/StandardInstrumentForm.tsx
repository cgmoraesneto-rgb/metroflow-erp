import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StandardInstrument } from '../types';
import { Plus, Pencil, X, Calendar, FileUp, FileCheck, Save } from 'lucide-react';
import { parseNumericInput } from '../utils/formatters';
import { toast } from 'sonner';

const standardInstrumentSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  identificacao: z.string().min(1, 'Identificação é obrigatória'),
  certificadoCalibracao: z.string().min(1, 'Certificado é obrigatório'),
  dataCalibracao: z.string().min(1, 'Data de calibração é obrigatória'),
  orgaoCalibrador: z.string().min(1, 'Órgão calibrador é obrigatório'),
  periodicidade: z.string().min(1, 'Periodicidade é obrigatória'),
  dataValidadeCalibracao: z.string().min(1, 'Validade é obrigatória'),
  resolucao: z.string().optional(),
  unidadeMedida: z.string().optional(),
  uncertainty: z.number().optional(),
  statusMovimentacao: z.enum(['Disponível', 'Vencido', 'Em calibração', 'Em manutenção', 'Emprestado']),
  certificadoPdf: z.string().optional()
});

export type StandardInstrumentFormData = z.infer<typeof standardInstrumentSchema>;

interface StandardInstrumentFormProps {
  initialData?: StandardInstrument | null;
  onSave: (data: StandardInstrumentFormData) => void;
  onCancel: () => void;
}

export default function StandardInstrumentForm({ initialData, onSave, onCancel }: StandardInstrumentFormProps) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<StandardInstrumentFormData>({
    resolver: zodResolver(standardInstrumentSchema),
    defaultValues: {
      nome: '',
      identificacao: '',
      certificadoCalibracao: '',
      dataCalibracao: '',
      orgaoCalibrador: '',
      periodicidade: '',
      dataValidadeCalibracao: '',
      resolucao: '',
      unidadeMedida: '',
      uncertainty: 0,
      statusMovimentacao: 'Disponível',
      certificadoPdf: ''
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        unidadeMedida: initialData.unidadeMedida || '',
        resolucao: initialData.resolucao || '',
        uncertainty: initialData.uncertainty || 0,
        certificadoPdf: initialData.certificadoPdf || '',
        statusMovimentacao: initialData.statusMovimentacao || 'Disponível'
      });
    } else {
      reset({
        nome: '', identificacao: '', certificadoCalibracao: '', dataCalibracao: '', orgaoCalibrador: '',
        periodicidade: '', dataValidadeCalibracao: '', resolucao: '', unidadeMedida: '', uncertainty: 0,
        statusMovimentacao: 'Disponível', certificadoPdf: ''
      });
    }
  }, [initialData, reset]);

  const dataCalibracao = watch('dataCalibracao');
  const periodicidade = watch('periodicidade');
  const certificadoPdf = watch('certificadoPdf');

  useEffect(() => {
    if (dataCalibracao && periodicidade) {
      const d = new Date(dataCalibracao + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = parseInt(periodicidade, 10);
        if (!isNaN(m)) {
          d.setMonth(d.getMonth() + m);
          setValue('dataValidadeCalibracao', d.toISOString().split('T')[0], { shouldValidate: true });
        }
      }
    }
  }, [dataCalibracao, periodicidade, setValue]);

  const onSubmit = (data: StandardInstrumentFormData) => {
    onSave(data);
    toast.success(initialData ? 'Instrumento Padrão atualizado com sucesso!' : 'Novo Instrumento Padrão cadastrado com sucesso!');
  };

  return (
    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mr-3 shadow-lg shadow-indigo-100">
            {initialData ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </div>
          {initialData ? 'Editar Instrumento Padrão' : 'Cadastrar Novo Padrão'}
        </h3>
        {initialData && (
          <button 
            type="button"
            onClick={onCancel} 
            className="text-slate-400 hover:text-slate-600 flex items-center font-bold text-xs"
          >
            <X className="w-4 h-4 mr-1" /> Cancelar Edição
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2 lg:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Instrumento</label>
            <input 
              {...register('nome')}
              placeholder="Ex: Bloco Padrão de Aço"
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.nome ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.nome && <p className="text-red-500 text-xs mt-1 ml-1">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação / TAG</label>
            <input 
              {...register('identificacao')}
              placeholder="Ex: MET-001"
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.identificacao ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.identificacao && <p className="text-red-500 text-xs mt-1 ml-1">{errors.identificacao.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificado</label>
            <input 
              {...register('certificadoCalibracao')}
              placeholder="Nº Certificado"
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.certificadoCalibracao ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.certificadoCalibracao && <p className="text-red-500 text-xs mt-1 ml-1">{errors.certificadoCalibracao.message}</p>}
          </div>

          <div className="space-y-2 text-slate-500">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> Data da Calibração
            </label>
            <input 
              type="date"
              {...register('dataCalibracao')}
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.dataCalibracao ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.dataCalibracao && <p className="text-red-500 text-xs mt-1 ml-1">{errors.dataCalibracao.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calibrador (Órgão)</label>
            <input 
              {...register('orgaoCalibrador')}
              placeholder="Ex: RBC / INMETRO"
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.orgaoCalibrador ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.orgaoCalibrador && <p className="text-red-500 text-xs mt-1 ml-1">{errors.orgaoCalibrador.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Período (Meses)</label>
            <input 
              type="number"
              {...register('periodicidade')}
              className={`w-full border-2 bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm ${errors.periodicidade ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.periodicidade && <p className="text-red-500 text-xs mt-1 ml-1">{errors.periodicidade.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade</label>
            <input 
              type="date"
              {...register('dataValidadeCalibracao')}
              readOnly
              className={`w-full border-2 border-transparent bg-slate-100 p-3.5 rounded-2xl font-bold text-sm text-slate-400 cursor-not-allowed ${errors.dataValidadeCalibracao ? 'border-red-400' : 'border-transparent'}`}
            />
            {errors.dataValidadeCalibracao && <p className="text-red-500 text-xs mt-1 ml-1">{errors.dataValidadeCalibracao.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolução / Unidade</label>
            <div className="flex gap-2">
                <input 
                  {...register('resolucao')}
                  placeholder="0.01"
                  className="w-1/2 border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
                />
                <input 
                  {...register('unidadeMedida')}
                  placeholder="mm"
                  className="w-1/2 border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incerteza Padrão</label>
            <input 
              type="text" 
              defaultValue={initialData?.uncertainty?.toString().replace('.', ',') || ''}
              onChange={(e) => setValue('uncertainty', parseNumericInput(e.target.value))}
              placeholder="0,005"
              className="w-full border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <select
              {...register('statusMovimentacao')}
              className="w-full border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            >
              <option value="Disponível">Disponível</option>
              <option value="Vencido">Vencido</option>
              <option value="Em calibração">Em calibração</option>
              <option value="Em manutenção">Em manutenção</option>
              <option value="Emprestado">Emprestado</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexo PDF (Certificado)</label>
            <div className={`relative flex items-center gap-4 p-1.5 rounded-2xl border-2 border-dashed transition-all ${certificadoPdf ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${certificadoPdf ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {certificadoPdf ? <FileCheck className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                    <p className={`text-xs font-bold ${certificadoPdf ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {certificadoPdf || 'Nenhum arquivo selecionado'}
                    </p>
                    <p className="text-[10px] text-slate-400">PDF de calibração do padrão</p>
                </div>
                <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setValue('certificadoPdf', file.name, { shouldValidate: true });
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {certificadoPdf && (
                    <button 
                        onClick={(e) => { e.preventDefault(); setValue('certificadoPdf', '', { shouldValidate: true }); }}
                        className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg mr-2 relative z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button 
            type="submit" 
            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center"
          >
            <Save className="mr-2 w-5 h-5" />
            {initialData ? 'Salvar Alterações' : 'Cadastrar Instrumento'}
          </button>
        </div>
      </form>
    </div>
  );
}
