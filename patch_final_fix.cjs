const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);

// Broken section: lines 575–589 (0-indexed)
// 575: '                <div className="flex items-end">'   <- orphan from old "Gerar Estrutura" button
// 576–589: The isSubmitted standards block WITHOUT its outer condition wrapper
// The outer condition was accidentally deleted.
// Replace lines 575–589 with the correctly wrapped block.

const correctBlock = [
  `          {isSubmitted && record.standardInstrumentIds?.length > 0 && (`,
  `            <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex items-center space-x-4 flex-shrink-0">`,
  `              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Padrões Utilizados:</span>`,
  `              {record.standardInstrumentIds.map(id => {`,
  `                const si = standardInstruments.find(s => s.id === id);`,
  `                if (!si) return null;`,
  `                return (`,
  `                  <span key={id} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">`,
  `                    {si.nome} ({si.identificacao})`,
  `                  </span>`,
  `                );`,
  `              })}`,
  `            </div>`,
  `          )}`
].join(CRLF);

// Lines 575 to 589 (0-indexed), = lines 576 to 590 in the file (1-indexed)
console.log('Replacing lines 576-590:');
for (let i = 575; i <= 589; i++) console.log(i+1, JSON.stringify(lines[i]));

lines.splice(575, 15, correctBlock);

fs.writeFileSync(filePath, lines.join(CRLF), 'utf8');
console.log('\nSUCCESS: Broken block repaired. New line count:', lines.length);
