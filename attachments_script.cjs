const fs = require('fs');

function updateModule() {
  const file = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CalibrationRecordModule.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Import X from lucide-react if not present
  if (!content.includes('X,')) {
    content = content.replace(/Loader2\n\} from 'lucide-react';/, "Loader2,\n    X\n} from 'lucide-react';");
  }

  // 1. Add state for attachments
  content = content.replace(
    /const \[observations, setObservations\] \= useState\(''\);/,
    "const [observations, setObservations] = useState('');\n    const [attachments, setAttachments] = useState<string[]>([]);"
  );

  // 2. Add attachments to CalibrationRecord creation
  content = content.replace(
    /observations\: observations,/,
    "observations: observations,\n            attachments: attachments,"
  );

  // 3. Attachments population in handleEditRecord
  content = content.replace(
    /setObservations\(record\.observations\);/,
    "setObservations(record.observations);\n        setAttachments(record.attachments || []);"
  );
  
  // 4. Attachments reset in handleNewRecord
  content = content.replace(
    /calibrationLocation\: 'Laboratório'\n        \}\);/,
    "calibrationLocation: 'Laboratório'\n        });\n        setAttachments([]);"
  );
  
  // 5. Append attachment block below observations text area
  const attachmentsBlock = `
                             <div className="mt-6 space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexos / Imagens do Registro</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    multiple 
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                if (ev.target?.result) {
                                                    setAttachments(prev => [...prev, ev.target.result]);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }}
                                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-4 mt-4">
                                        {attachments.map((src, idx) => (
                                            <div key={idx} className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden group shadow-sm">
                                                <img src={src} alt="Anexo" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>`;

  content = content.replace(
    /placeholder\="Notas técnicas sobre a calibração\.\.\."\n                                \/\>\n                             \<\/div\>/,
    `placeholder="Notas técnicas sobre a calibração..."\n                                />\n                             </div>\n${attachmentsBlock}`
  );
  
  fs.writeFileSync(file, content, 'utf8');
}

updateModule();

