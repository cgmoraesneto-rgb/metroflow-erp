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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'letterheadBase64' | 'footerBase64') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (optional but good practice)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Limite de 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      // Use the template ID or a generic path if ID is missing (should not be missing)
      const pathId = form.id || 'default';
      const storageRef = ref(storage, `document_templates/${pathId}/${field}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setForm(prev => ({ ...prev, [field]: downloadURL }));
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem. Verifique sua conexão.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    // PREVENT FIRESTORE SIZE ERROR:
    // If the image is still a base64 string and exceeded 1MB, we block saving.
    // The user must re-upload using the new storage logic to fix this.
    const isLetterheadTooBig = (form.letterheadBase64?.length || 0) > 1048487; // Firestore limit
    const isFooterTooBig = (form.footerBase64?.length || 0) > 1048487;

    if (isLetterheadTooBig || isFooterTooBig) {
      toast.error("Este template contém uma imagem antiga muito grande. Por favor, anexe a imagem novamente clicando no botão de upload para convertê-la para o novo formato compatível.");
      return;
    }

    onSave(form);
    onClose();
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

        <div className="grid grid-cols-1 gap-8">
          {/* Layout Image Upload */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Layout (Imagem)</label>
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
                  <img src={form.letterheadBase64} alt="Layout" className="max-h-32 object-contain rounded-xl" />
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
                    {isUploading ? 'Enviando...' : 'Subir Layout'}
                  </span>
                </div>
              )}
            </div>
          </div>
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
