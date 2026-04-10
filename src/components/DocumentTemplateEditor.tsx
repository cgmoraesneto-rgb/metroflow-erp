import React, { useState, useEffect } from 'react';
import { XCircle, Plus, FileText, Save, Loader2 } from 'lucide-react';
import { DocumentTemplate } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { toast } from 'sonner';

interface DocumentTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate;
  onSave: (template: DocumentTemplate) => void;
}

const DocumentTemplateEditor: React.FC<DocumentTemplateEditorProps> = ({ isOpen, onClose, template, onSave }) => {
  const [form, setForm] = useState<DocumentTemplate>(template);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (template) {
      setForm(template);
    }
  }, [template]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'letterheadBase64' | 'accreditedLetterheadBase64' | 'footerBase64') => {
    const file = e.target.files?.[0];
    if (!file || !form) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Limite de 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const pathId = form.id || 'default';
      const storageRef = ref(storage, `document_templates/${pathId}/${field}`);
      
      console.log(`Iniciando upload para: document_templates/${pathId}/${field}`);

      const uploadTask = async () => {
        await uploadBytes(storageRef, file);
        console.log("Upload concluído, obtendo URL...");
        return await getDownloadURL(storageRef);
      };

      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Tempo limite excedido (30s). Verifique sua conexão com o Firebase.")), 30000)
      );

      const downloadURL = await Promise.race([uploadTask(), timeoutPromise]);
      console.log("URL obtida com sucesso.");
      
      setForm(prev => {
        if (!prev) return prev;
        return { ...prev, [field]: downloadURL };
      });
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro detalhado no upload:", error);
      const isAuthError = error.code === 'storage/unauthorized';
      toast.error(isAuthError 
        ? "Erro de Permissão: Você precisa estar logado com um usuário real do Firebase para enviar arquivos."
        : `Erro ao enviar: ${error.message || "Verifique a conexão"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!form) return;
    
    try {
      // PREVENT FIRESTORE SIZE ERROR:
      const isLetterheadTooBig = (form.letterheadBase64?.length || 0) > 1000000; 
      const isAccreditedTooBig = (form.accreditedLetterheadBase64?.length || 0) > 1000000; 
      const isFooterTooBig = (form.footerBase64?.length || 0) > 1000000;

      if (isLetterheadTooBig || isAccreditedTooBig || isFooterTooBig) {
        toast.error("Este template contém uma imagem antiga muito grande. Por favor, anexe a(s) imagem(ns) novamente clicando no botão de upload.");
        return;
      }

      onSave(form);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Falha ao salvar as configurações.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-2xl text-purple-600">
              {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurar Layout: {form.name}</h3>
              <p className="text-sm text-slate-500 font-bold">Personalize a imagem do layout para o documento.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className={`grid grid-cols-1 ${form.applyTo === 'CALIBRATION_CERTIFICATE' ? 'md:grid-cols-2' : ''} gap-8`}>
          {/* Layout Image Upload (Padrão) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Layout Padrão (Imagem)</label>
            <div className={`relative flex items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer'}`}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => handleImageUpload(e, 'letterheadBase64')} 
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              />
              {form.letterheadBase64 ? (
                <div className="relative group/img text-center">
                  <img src={form.letterheadBase64} alt="Layout Padrão" className="max-h-32 object-contain rounded-xl" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-xl transition-all">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Alterar Layout</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                  ) : (
                    <Plus className="w-10 h-10 mb-2 opacity-30" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {isUploading ? 'Enviando...' : 'Subir Padrão'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {form.applyTo === 'CALIBRATION_CERTIFICATE' && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Layout Acreditado RBC (Imagem)</label>
              <div className={`relative flex items-center justify-center p-8 border-2 border-dashed border-indigo-200 dark:border-indigo-700/50 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer'}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleImageUpload(e, 'accreditedLetterheadBase64')} 
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                />
                {form.accreditedLetterheadBase64 ? (
                  <div className="relative group/img text-center">
                    <img src={form.accreditedLetterheadBase64} alt="Layout RBC" className="max-h-32 object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-xl transition-all">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Alterar Layout RBC</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-indigo-400">
                    {isUploading ? (
                      <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                    ) : (
                      <Plus className="w-10 h-10 mb-2 opacity-30" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {isUploading ? 'Enviando...' : 'Subir Layout RBC'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="px-8 py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isUploading}
            className="flex items-center gap-2 px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isUploading ? 'Aguarde...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentTemplateEditor;
