const fs = require('fs');
const masksPath = 'src/components/CertificateMasksModule.tsx';
let content = fs.readFileSync(masksPath, 'utf8');

// The regex-based removal in patch_groups.cjs left orphan fragment.
// We need to remove the leftover lines 722-737 (the "×" div and "Repetições" input + closing divs)
// that remain between the column tags div and the graph controls div.

// The orphan is a single `\n` followed by the repeticoes half.
// Let's identify the exact pattern to remove:
const ORPHAN = /\n(\s+<div className="flex items-end pb-2 text-indigo-300 font-black text-lg">×<\/div>\r?\n\s+<div className="flex-1 space-y-1">\r?\n\s+<label className="block text-\[9px\] font-black text-indigo-400 uppercase tracking-widest">Repetições<\/label>\r?\n\s+<input\r?\n\s+type="number"\r?\n\s+min="1"\r?\n\s+value=\{g\.repetitions \?\? newMask\.repetitions \?\? 3\}\r?\n\s+onChange=\{\(e\) => \{\r?\n\s+const newGroups = \[\.\.\.newMask\.measurementGroups\];\r?\n\s+newGroups\[gi\] = \{ \.\.\.g, repetitions: parseInt\(e\.target\.value\) \|\| 1 \};\r?\n\s+setNewMask\(prev => \(\{ \.\.\.prev, measurementGroups: newGroups \}\)\);\r?\n\s+\}\}\r?\n\s+className="w-full border border-indigo-200 p-2 rounded-xl text-base font-black text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none text-center"\r?\n\s+\/>\r?\n\s+<\/div>\r?\n\s+<\/div>)/;

const match = content.match(ORPHAN);
if (match) {
  content = content.replace(match[0], '');
  fs.writeFileSync(masksPath, content, 'utf8');
  console.log('SUCCESS: Orphan fragment removed cleanly.');
} else {
  console.error('ERROR: Orphan fragment not matched by regex.');
  // Show context around line 721 area
  const lines = content.split('\n');
  console.log('Lines 718-740:');
  lines.slice(717, 740).forEach((l, i) => console.log(`${718+i}: ${JSON.stringify(l)}`));
}
