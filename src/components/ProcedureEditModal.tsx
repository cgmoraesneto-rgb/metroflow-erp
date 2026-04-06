import { useState, useEffect } from 'react';

interface ProcedureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTitle: string, updatedContent: string) => void;
  procedureTitle: string;
  procedureContent: string;
}

export default function ProcedureEditModal({ isOpen, onClose, onSave, procedureTitle, procedureContent }: ProcedureEditModalProps) {
  const [editTitle, setEditTitle] = useState(procedureTitle);
  const [editContent, setEditContent] = useState(procedureContent);

  useEffect(() => {
    setEditTitle(procedureTitle);
    setEditContent(procedureContent);
  }, [procedureTitle, procedureContent]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(editTitle, editContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Editar Procedimento</h2>
        <div className="mb-4">
          <label htmlFor="procedureTitle" className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            id="procedureTitle"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="procedureContent" className="block text-sm font-medium text-gray-700">Conteúdo</label>
          <textarea
            id="procedureContent"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-40 resize-y"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          ></textarea>
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
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
