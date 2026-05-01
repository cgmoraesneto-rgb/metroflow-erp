const fs = require('fs');

// ============================================================
// PATCH 1: Revert CertificateMasksModule — remove per-group controls
// ============================================================
const masksPath = 'src/components/CertificateMasksModule.tsx';
let masks = fs.readFileSync(masksPath, 'utf8');

// Remove the entire per-group points/repetitions block that was added
const regexPerGroup = /\r?\n\s+<div className="flex gap-3 mb-4 p-3 bg-indigo-50\/50 rounded-2xl border border-indigo-100">.*?<\/div>\r?\n/s;
const perGroupBlock = masks.match(regexPerGroup);
if (perGroupBlock) {
  masks = masks.replace(perGroupBlock[0], '\n');
  console.log('MASKS: Per-group block removed.');
} else {
  console.error('MASKS ERROR: Per-group block not found.');
}

// Also fix mb-4 back to mb-6 in the column tags div (inside group card)
masks = masks.replace(
  '<div className="flex flex-wrap gap-2 mb-4">',
  '<div className="flex flex-wrap gap-2 mb-6">'
);

fs.writeFileSync(masksPath, masks, 'utf8');
console.log('MASKS: Revert complete.');

// ============================================================
// PATCH 2: CalibrationLaunchModal — replace global Pontos×Repetições 
//           with a per-group table when a mask is selected
// ============================================================
const launchPath = 'src/components/CalibrationLaunchModal.tsx';
let launch = fs.readFileSync(launchPath, 'utf8');

// Target: the single "Pontos x Repetições" block (one pair of inputs)
const OLD_GLOBAL = `                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pontos x Repetições</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      title="Pontos de Calibração"
                      value={pointsCount}
                      onChange={e => setPointsCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                      min="1"
                    />
                    <div className="flex items-center text-slate-300">×</div>
                    <input
                      type="number"
                      title="Repetições por Ponto"
                      value={rowsCount}
                      onChange={e => setRowsCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                      min="1"
                    />
                  </div>
                </div>`;

const NEW_PER_GROUP = `                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {selectedMask ? 'Pontos × Repetições por Estrutura' : 'Pontos × Repetições (Global)'}
                  </label>
                  {selectedMask ? (
                    <div className="space-y-2">
                      {selectedMask.measurementGroups.map((mg, mgi) => (
                        <div key={mgi} className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl">
                          <span className="text-[10px] font-black text-slate-500 truncate flex-1 ml-1" title={mg.name}>{mg.name}</span>
                          <input
                            type="number"
                            title="Pontos"
                            min="1"
                            value={groupSettings[mgi]?.points ?? mg.numberOfPoints ?? pointsCount}
                            onChange={e => {
                              setGroupSettings(prev => {
                                const next = [...prev];
                                next[mgi] = { ...next[mgi], points: parseInt(e.target.value) || 1 };
                                return next;
                              });
                            }}
                            className="w-14 bg-slate-50 border border-slate-100 p-1.5 rounded-lg font-black text-sm text-center text-indigo-700"
                          />
                          <span className="text-slate-300 font-bold text-xs">×</span>
                          <input
                            type="number"
                            title="Repetições"
                            min="1"
                            value={groupSettings[mgi]?.rows ?? mg.repetitions ?? rowsCount}
                            onChange={e => {
                              setGroupSettings(prev => {
                                const next = [...prev];
                                next[mgi] = { ...next[mgi], rows: parseInt(e.target.value) || 1 };
                                return next;
                              });
                            }}
                            className="w-14 bg-slate-50 border border-slate-100 p-1.5 rounded-lg font-black text-sm text-center"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        title="Pontos de Calibração"
                        value={pointsCount}
                        onChange={e => setPointsCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                        min="1"
                      />
                      <div className="flex items-center text-slate-300">×</div>
                      <input
                        type="number"
                        title="Repetições por Ponto"
                        value={rowsCount}
                        onChange={e => setRowsCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm text-center"
                        min="1"
                      />
                    </div>
                  )}
                </div>`;

// Try with CRLF
const OLD_CRLF = OLD_GLOBAL.replace(/\n/g, '\r\n');
if (launch.includes(OLD_GLOBAL)) {
  launch = launch.replace(OLD_GLOBAL, NEW_PER_GROUP);
  console.log('LAUNCH: Per-group controls injected (LF).');
} else if (launch.includes(OLD_CRLF)) {
  const NEW_CRLF = NEW_PER_GROUP.replace(/\n/g, '\r\n');
  launch = launch.replace(OLD_CRLF, NEW_CRLF);
  console.log('LAUNCH: Per-group controls injected (CRLF).');
} else {
  console.error('LAUNCH ERROR: Global Pontos x Repetições block not found.');
}

// PATCH 2b: Add groupSettings state declaration right after rowsCount state line
const stateTarget = `  const [rowsCount, setRowsCount] = useState(3); // Repetitions (n)`;
const stateReplacement = `  const [rowsCount, setRowsCount] = useState(3); // Repetitions (n)
  const [groupSettings, setGroupSettings] = useState<{points: number; rows: number}[]>([]); // Per-group override`;

if (launch.includes(stateTarget)) {
  launch = launch.replace(stateTarget, stateReplacement);
  console.log('LAUNCH: groupSettings state added.');
} else {
  console.error('LAUNCH ERROR: rowsCount state line not found for groupSettings injection.');
}

// PATCH 2c: Reset groupSettings when mask changes (inside the mask onChange, after setRowsCount)
const resetTarget = `                        setPointsCount(p);
                        setRowsCount(r);`;
const resetReplacement = `                        setPointsCount(p);
                        setRowsCount(r);
                        // Reset per-group settings so user sees fresh defaults for new mask
                        setGroupSettings(m.measurementGroups.map(mg => ({
                          points: mg.numberOfPoints ?? p,
                          rows: mg.repetitions ?? r
                        })));`;

if (launch.includes(resetTarget)) {
  launch = launch.replace(resetTarget, resetReplacement);
  console.log('LAUNCH: groupSettings reset on mask change.');
} else {
  console.error('LAUNCH ERROR: setPointsCount/setRowsCount target not found.');
}

// PATCH 2d: Update generateStructureTemplate call in handleGenerateStructure to pass groupSettings
const genTarget = `    generateStructureTemplate(selectedMask, pointsCount, rowsCount);`;
const genReplacement = `    generateStructureTemplate(selectedMask, pointsCount, rowsCount, groupSettings);`;

if (launch.includes(genTarget)) {
  launch = launch.replace(genTarget, genReplacement);
  console.log('LAUNCH: handleGenerateStructure updated to pass groupSettings.');
} else {
  console.error('LAUNCH ERROR: handleGenerateStructure call not found.');
}

// PATCH 2e: Update generateStructureTemplate signature and body to accept groupSettings
const funcStart = `  const generateStructureTemplate = (mask: CertificateMask, defaultPoints: number, defaultRows: number) => {
    const newGroups: CalibrationGroupRecord[] = mask.measurementGroups.map(mg => {
      const rowsArr: CalibrationRow[] = [];
      const defs: ColumnDefinition[] = mg.columnDefinitions || [];
      // Per-group override: use group's own settings if defined, else fall back to mask/global defaults
      const groupPoints = mg.numberOfPoints ?? defaultPoints;
      const groupRows = mg.repetitions ?? defaultRows;`;

const funcReplacement = `  const generateStructureTemplate = (mask: CertificateMask, defaultPoints: number, defaultRows: number, perGroupSettings?: {points: number; rows: number}[]) => {
    const newGroups: CalibrationGroupRecord[] = mask.measurementGroups.map((mg, mgi) => {
      const rowsArr: CalibrationRow[] = [];
      const defs: ColumnDefinition[] = mg.columnDefinitions || [];
      // Per-group override: use per-group settings from UI if provided, else group's own stored values, else global defaults
      const groupPoints = perGroupSettings?.[mgi]?.points ?? mg.numberOfPoints ?? defaultPoints;
      const groupRows = perGroupSettings?.[mgi]?.rows ?? mg.repetitions ?? defaultRows;`;

const funcStart_CRLF = funcStart.replace(/\n/g, '\r\n');
if (launch.includes(funcStart)) {
  launch = launch.replace(funcStart, funcReplacement);
  console.log('LAUNCH: generateStructureTemplate signature updated (LF).');
} else if (launch.includes(funcStart_CRLF)) {
  const funcReplacement_CRLF = funcReplacement.replace(/\n/g, '\r\n');
  launch = launch.replace(funcStart_CRLF, funcReplacement_CRLF);
  console.log('LAUNCH: generateStructureTemplate signature updated (CRLF).');
} else {
  console.error('LAUNCH ERROR: generateStructureTemplate header not found.');
}

fs.writeFileSync(launchPath, launch, 'utf8');
console.log('LAUNCH: All patches complete.');

// ============================================================
// PATCH 3: Fix responsiveness — standards panel max-h + overflow
// ============================================================
let launchFinal = fs.readFileSync(launchPath, 'utf8');

const responsiveTarget = `                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4">`;
const responsiveReplacement = `                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">`;

if (launchFinal.includes(responsiveTarget)) {
  launchFinal = launchFinal.replace(responsiveTarget, responsiveReplacement);
  console.log('RESPONSIVE: Standards grid max-h applied.');
} else {
  console.error('RESPONSIVE ERROR: standards grid not found.');
}

fs.writeFileSync(launchPath, launchFinal, 'utf8');
console.log('\nAll patches done!');
