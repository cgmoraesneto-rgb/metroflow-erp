const fs = require('fs');

function fixButtons() {
    const file = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CertificateMasksModule.tsx';
    let content = fs.readFileSync(file, 'utf8');

    const newStr = `<div className="flex flex-col gap-2">
                    <button
                      onClick={() => setNewMask(prev => ({ ...prev, type: 'CALIBRATION_CERTIFICATE' }))}
                      className={\`w-full flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all \${
                        newMask.type === 'CALIBRATION_CERTIFICATE' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-indigo-400 border-indigo-100 hover:bg-indigo-50'
                      }\`}
                    >
                      CERTIFICADO DE CALIBRAÇÃO
                    </button>
                    <div className="flex gap-2">
                        <button
                          onClick={() => setNewMask(prev => ({ ...prev, type: 'MAINTENANCE_REPORT' }))}
                          className={\`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all \${
                            newMask.type === 'MAINTENANCE_REPORT' ? 'bg-slate-700 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }\`}
                        >
                          RELATÓRIO DE MAN.
                        </button>
                        <button
                          onClick={() => setNewMask(prev => ({ ...prev, type: 'TEST_REPORT' }))}
                          className={\`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-[10px] transition-all \${
                            newMask.type === 'TEST_REPORT' ? 'bg-amber-600 text-white border-amber-700 shadow-md' : 'bg-white text-amber-500 border-amber-200 hover:bg-amber-50'
                          }\`}
                        >
                          RELATÓRIO DE ENSAIO
                        </button>
                    </div>
                  </div>`;

    // Regex to match the entire existing block
    const regex = /<div className="flex flex-col gap-2">\s*<div className="flex gap-2">[\s\S]*?<\/div>\s*<\/div>/;
    
    content = content.replace(regex, newStr);
    
    fs.writeFileSync(file, content, 'utf8');
}

fixButtons();
