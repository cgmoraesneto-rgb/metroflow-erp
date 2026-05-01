import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { StandardInstrument } from '../types';
import { useEffect } from 'react';
import { Shield, Hash, Calendar, Ruler, Info, Search, FileUp, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  identificacao: z.string().min(1, 'Identificação é obrigatória'),
  certificadoCalibracao: z.string().min(1, 'Número do certificado é obrigatório'),
  certificadoPdf: z.string().optional(),
  dataCalibracao: z.string().min(1, 'Data de calibração é obrigatória'),
  dataValidadeCalibracao: z.string().min(1, 'Data de validade é obrigatória'),
  orgaoCalibrador: z.string().min(1, 'Órgão calibrador é obrigatório'),
  periodicidade: z.string().min(1, 'Periodicidade é obrigatória'),
  resolucao: z.string().min(1, 'Resolução é obrigatória'),
  unidadeMedida: z.string().min(1, 'Unidade de medida é obrigatória'),
  statusMovimentacao: z.enum(['Disponível', 'Vencido', 'Em calibração', 'Em manutenção', 'Emprestado']),
  uncertainty: z.number().min(0, 'Incerteza deve ser positiva'),
  kFactor: z.number().min(0, 'Fator k deve ser positivo').default(2.00),
});

interface StandardInstrumentFormProps {
  onSubmit: (data: StandardInstrument) => void | Promise<void>;
  initialData?: Partial<StandardInstrument>;
  onCancel: () => void;
}

export default function StandardInstrumentForm({ onSubmit, initialData, onCancel }: StandardInstrumentFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      statusMovimentacao: 'Disponível',
      uncertainty: 0,
      kFactor: 2.00,
      ...initialData
    }
  });

  const watchDataCalibracao = watch('dataCalibracao');
  const watchPeriodicidade = watch('periodicidade');

  useEffect(() => {
    if (watchDataCalibracao && watchPeriodicidade) {
      const date = new Date(watchDataCalibracao);
      const months = parseInt(watchPeriodicidade, 10);
      if (!isNaN(date.getTime()) && !isNaN(months)) {
        date.setMonth(date.getMonth() + months);
        setValue('dataValidadeCalibracao', date.toISOString().split('T')[0]);
      }
    }
  }, [watchDataCalibracao, watchPeriodicidade, setValue]);

  const parseNumericInput = (val: string) => {
    const sanitized = val.replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-6">
        {/* Linha 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Padrão</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <input 
                {...register('nome')} 
                className="w-full border-2 border-transparent bg-slate-50 p-3.5 pl-11 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
                placeholder="Ex: Micrômetro Analógico"
              />
            </div>
            {errors.nome && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.nome.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação / TAG</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <input 
                {...register('identificacao')} 
                className="w-full border-2 border-transparent bg-slate-50 p-3.5 pl-11 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
                placeholder="Ex: PAD-001"
              />
            </div>
            {errors.identificacao && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.identificacao.message as string}</p>}
          </div>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº do Certificado</label>
            <input 
              {...register('certificadoCalibracao')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            />
            {errors.certificadoCalibracao && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.certificadoCalibracao.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calibrado por (Órgão)</label>
            <input 
              {...register('orgaoCalibrador')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            />
            {errors.orgaoCalibrador && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.orgaoCalibrador.message as string}</p>}
          </div>
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Calib.</label>
            <input 
              type="date"
              {...register('dataCalibracao')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            />
            {errors.dataCalibracao && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.dataCalibracao.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodicidade (Meses)</label>
            <input 
              type="number"
              min="1"
              {...register('periodicidade')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
              placeholder="Ex: 12"
            />
            {errors.periodicidade && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.periodicidade.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              Validade (Auto) <Info className="w-3 h-3 text-indigo-400" />
            </label>
            <input 
              type="date"
              {...register('dataValidadeCalibracao')} 
              readOnly
              className="w-full border-2 border-transparent bg-slate-100 p-3.5 rounded-2xl outline-none font-bold text-sm text-slate-500 shadow-sm cursor-not-allowed"
            />
            {errors.dataValidadeCalibracao && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.dataValidadeCalibracao.message as string}</p>}
          </div>
        </div>

        {/* Linha 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolução</label>
            <input 
              {...register('resolucao')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm text-center"
            />
            {errors.resolucao && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.resolucao.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
            <input 
              {...register('unidadeMedida')} 
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm text-center"
            />
            {errors.unidadeMedida && <p className="text-rose-500 text-[10px] font-bold ml-1 uppercase">{errors.unidadeMedida.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incerteza Padrão / Fator k</label>
            <div className="flex gap-2">
                <div className="w-2/3">
                  <input 
                    type="text" 
                    defaultValue={initialData?.uncertainty?.toString().replace('.', ',') || ''}
                    onChange={(e) => setValue('uncertainty', parseNumericInput(e.target.value))}
                    placeholder="Incerteza"
                    className="w-full border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm border-slate-200"
                  />
                  {errors.uncertainty && <p className="text-rose-500 text-[9px] font-bold mt-1 uppercase">{errors.uncertainty.message as string}</p>}
                </div>
                <div className="w-1/3">
                  <input 
                    type="text" 
                    defaultValue={initialData?.kFactor?.toString().replace('.', ',') || '2,00'}
                    onChange={(e) => setValue('kFactor', parseNumericInput(e.target.value))}
                    placeholder="k"
                    className="w-full border-2 border-transparent bg-white p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm text-center border-slate-200"
                  />
                  {errors.kFactor && <p className="text-rose-500 text-[9px] font-bold mt-1 uppercase">{errors.kFactor.message as string}</p>}
                </div>
            </div>
          </div>
        </div>

        {/* Linha 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexo do Certificado (PDF)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl flex items-center justify-center transition-all text-slate-500 font-bold text-xs gap-2">
                <FileUp className="w-4 h-4" />
                Upload PDF
                <input 
                  type="file" 
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 800 * 1024) {
                        toast.error('O arquivo PDF é muito grande (máximo 800KB). Para arquivos maiores, utilize um link externo.');
                        e.target.value = '';
                        return;
                      }

                      const reader = new FileReader();
                      reader.onloadstart = () => {
                        toast.loading('Processando PDF...', { id: 'pdf-loading' });
                      };
                      reader.onloadend = () => {
                        setValue('certificadoPdf', reader.result as string, { shouldDirty: true });
                        toast.dismiss('pdf-loading');
                        toast.success('PDF anexado com sucesso!');
                      };
                      reader.onerror = () => {
                        toast.dismiss('pdf-loading');
                        toast.error('Erro ao ler o arquivo PDF.');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {watch('certificadoPdf') && (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm shrink-0" title="PDF Anexado">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                        setValue('certificadoPdf', undefined, { shouldDirty: true });
                        toast.info('Anexo removido.');
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Remover anexo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Operacional</label>
            <select
              {...register('statusMovimentacao')}
              className="w-full border-2 border-transparent bg-slate-50 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
            >
              <option value="Disponível">Disponível</option>
              <option value="Vencido">Vencido</option>
              <option value="Em calibração">Em calibração</option>
              <option value="Em manutenção">Em manutenção</option>
              <option value="Emprestado">Emprestado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95"
        >
          Salvar Padrão
        </button>
      </div>
    </form>
  );
}
