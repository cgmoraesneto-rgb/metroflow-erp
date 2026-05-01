const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);

// Keep lines 1–325 (0-indexed: 0–324), replace everything from line 326 onward
const cleanLogic = lines.slice(0, 325).join(CRLF);

const jsxReturn = `
  // Get n from mask/record or default 3
  const repetitions = (record as any).maskRepetitions || 3;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col"
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              {isSubmitted ? (
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
              ) : (
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <SendHorizontal className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="truncate">
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5 overflow-hidden text-ellipsis">
                  {record.instrumentName}
                </h2>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{record.certificateNumber}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>Técnico: <strong className="text-slate-700">{employees.find(e => e.id === record.technicianName)?.nome || record.technicianName}</strong></span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>Data: <strong className="text-slate-700">{new Date(record.calibrationDate).toLocaleDateString('pt-BR')}</strong></span>
                  {isSubmitted && <span className="ml-2 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">● Somente Leitura</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newMode = !isAuditorMode;
                  setIsAuditorMode(newMode);
                  if (groups.length > 0) runCalculations(groups);
                }}
                className={\`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all \${isAuditorMode
                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-gray-50'
                  }\`}
              >
                <Shield className={\`w-4 h-4 \${isAuditorMode ? 'animate-pulse text-amber-600' : ''}\`} />
                <span className="text-[10px] font-black uppercase tracking-widest">Modo Auditor</span>
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Configuration Panel — collapsible */}
          {!isSubmitted && (
            <div className="flex-shrink-0 border-b border-slate-200">

              {/* Toggle handle */}
              <div
                className="bg-slate-50 px-6 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors select-none"
                onClick={() => setIsConfigOpen(o => !o)}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Configurações de Lançamento
                  </span>
                  {selectedMask && (
                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                      {selectedMask.title}
                    </span>
                  )}
                  {groups.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                      ✓ Estrutura gerada
                    </span>
                  )}
                </div>
                <span className={\`text-slate-400 text-xs transition-transform duration-200 \${isConfigOpen ? 'rotate-180' : ''}\`}>▼</span>
              </div>

              {/* Collapsible body */}
              {isConfigOpen && (
                <div className="bg-white px-6 py-4 space-y-4">

                  {/* Row 1: Mask + Resolution + Generate */}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo de Cálculo (Máscara)</label>
                      <select
                        value={selectedMask?.id || ''}
                        onChange={(e) => {
                          const maskId = e.target.value;
                          const m = certificateMasks.find(mask => mask.id === maskId) || null;
                          setSelectedMask(m);
                          if (m) {
                            const p = m.numberOfPoints || 5;
                            const r = m.repetitions || 3;
                            setPointsCount(p);
                            setRowsCount(r);
                            setGroupSettings(m.measurementGroups.map(mg => ({
                              points: mg.numberOfPoints ?? p,
                              rows: mg.repetitions ?? r
                            })));
                            if (groups.length === 0) {
                              generateStructureTemplate(m, p, r);
                            } else if (confirm('Alterar a máscara irá resetar os dados preenchidos. Continuar?')) {
                              generateStructureTemplate(m, p, r);
                            }
                          }
                          setIsDirty(true);
                        }}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-sm shadow-sm"
                      >
                        <option value="">-- Selecione uma Máscara --</option>
                        {certificateMasks.map(mask => (
                          <option key={mask.id} value={mask.id}>{mask.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 flex-shrink-0">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Resolução:</span>
                      <input
                        type="number"
                        step="any"
                        value={instrumentResolution}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setInstrumentResolution(val);
                          runCalculations(groups);
                        }}
                        className="w-20 bg-white border border-amber-200/50 p-1.5 rounded-lg font-black text-sm text-center text-amber-700 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleGenerateStructure}
                      className="flex-shrink-0 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md"
                    >
                      Gerar Estrutura
                    </button>
                  </div>

                  {/* Row 2: Per-group points×reps grid */}
                  {selectedMask && (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Pontos × Repetições por Estrutura</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {selectedMask.measurementGroups.map((mg, mgi) => (
                          <div key={mgi} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 hover:border-indigo-200 transition-colors">
                            <span className="text-[9px] font-bold text-slate-600 truncate flex-1" title={mg.name}>{mg.name}</span>
                            <input
                              type="number"
                              title="Pontos"
                              min="1"
                              value={groupSettings[mgi]?.points ?? mg.numberOfPoints ?? pointsCount}
                              onChange={e => setGroupSettings(prev => {
                                const next = [...prev];
                                next[mgi] = { ...next[mgi], points: parseInt(e.target.value) || 1 };
                                return next;
                              })}
                              className="w-9 bg-white border border-indigo-200 p-0.5 rounded-lg font-black text-xs text-center text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                            <span className="text-slate-300 text-[10px]">×</span>
                            <input
                              type="number"
                              title="Repetições"
                              min="1"
                              value={groupSettings[mgi]?.rows ?? mg.repetitions ?? rowsCount}
                              onChange={e => setGroupSettings(prev => {
                                const next = [...prev];
                                next[mgi] = { ...next[mgi], rows: parseInt(e.target.value) || 1 };
                                return next;
                              })}
                              className="w-9 bg-white border border-slate-200 p-0.5 rounded-lg font-black text-xs text-center outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Standards as compact horizontal chips */}
                  {standardDetails.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Padrões Qualificados (U & k)</label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {standardDetails.map((detail, idx) => {
                          const si = standardInstruments.find(s => s.id === detail.instrumentId);
                          return (
                            <div key={idx} className="flex-shrink-0 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 min-w-[220px]">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <Shield size={14} className="text-indigo-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-slate-700 uppercase truncate">{si?.identificacao || 'Padrão'}</p>
                                <p className="text-[8px] text-slate-400 truncate">{si?.nome}</p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <div className="relative">
                                  <span className="absolute -top-1.5 left-1 text-[6px] font-black text-indigo-500 bg-white px-1 rounded-full border border-indigo-100 z-10">U</span>
                                  <input
                                    type="number"
                                    title="Incerteza"
                                    value={detail.declaredU}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updated = [...standardDetails];
                                      updated[idx].declaredU = val;
                                      setStandardDetails(updated);
                                      runCalculations(groups);
                                    }}
                                    className="w-16 bg-white border border-indigo-100 p-1 pt-3 rounded-lg text-xs font-black text-center text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-300"
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute -top-1.5 left-1 text-[6px] font-black text-indigo-500 bg-white px-1 rounded-full border border-indigo-100 z-10">k</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    title="Fator k"
                                    value={detail.certificateK}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updated = [...standardDetails];
                                      updated[idx].certificateK = val;
                                      setStandardDetails(updated);
                                      runCalculations(groups);
                                    }}
                                    className="w-16 bg-white border border-slate-100 p-1 pt-3 rounded-lg text-xs font-black text-center outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* Standards read-only bar (when submitted) */}
          {isSubmitted && record.standardInstrumentIds?.length > 0 && (
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex items-center space-x-4 flex-shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Padrões Utilizados:</span>
              {record.standardInstrumentIds.map(id => {
                const si = standardInstruments.find(s => s.id === id);
                if (!si) return null;
                return (
                  <span key={id} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    {si.nome} ({si.identificacao})
                  </span>
                );
              })}
            </div>
          )}

          {/* Main content — data tables */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {groups.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-400 text-sm">Nenhuma estrutura de medição neste registro.</p>
              </div>
            ) : groups.map((group, gi) => {
              const visibleCols = (group.columns ?? []).filter(c => !group.hiddenColumns?.includes(c));
              const groupRepetitions = (group as any).repetitions ?? rowsCount;
              return (
                <div key={gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="font-black text-slate-800">{group.name}</h3>
                  </div>
                  <div className="rectilinear-container border-none rounded-none bg-transparent">
                    <table className="rectilinear-table !min-w-full">
                      <thead>
                        <tr className="rectilinear-tr">
                          {(group.columnDefinitions || []).map((def, ci) => (
                            <th key={ci} className={\`rectilinear-th text-center \${group.hiddenColumns?.includes(def.id) ? 'opacity-30' : ''}\`}>
                              {def.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(group.rows || []).map((row, ri) => {
                          const pointIdx = typeof row._pointIdx === 'number' ? row._pointIdx : parseInt(String(row._pointIdx || '0'), 10);
                          const isNewPoint = ri % groupRepetitions === 0;
                          const calc = calculatedPoints[\`\${group.name}-\${pointIdx}\`];

                          return (
                            <tr key={ri} className={\`rectilinear-tr \${isNewPoint ? 'border-t-4 border-slate-100' : ''}\`}>
                              {(group.columnDefinitions || []).map((def, ci) => {
                                const isMetric = [
                                  ColumnType.MEDIA,
                                  ColumnType.ERRO,
                                  ColumnType.DESVIO_PADRAO,
                                  ColumnType.INCERTEZA,
                                  ColumnType.CONFORMIDADE
                                ].includes(def.type);

                                const isMetrologyCol = def.behavior === ColumnBehavior.METROLOGY;
                                const isCalculatedCol = def.behavior === ColumnBehavior.CALCULATED;
                                const isReadOnlyMode = isMetrologyCol || isCalculatedCol || isSubmitted;

                                let displayValue = row[def.id] || '';

                                if ((isMetrologyCol || isCalculatedCol || isMetric) && calc) {
                                  if (calc[def.id] !== undefined) {
                                    const val = calc[def.id];
                                    displayValue = Array.isArray(val) ? \`[\${val.length}]\` : (typeof val === 'number' ? val.toFixed(4) : String(val));
                                  }
                                } else if ((isMetrologyCol || isCalculatedCol) && !calc) {
                                  displayValue = '--';
                                }

                                const finalDisplayValue = String(displayValue ?? '');
                                const isFirstInBlock = ri % groupRepetitions === 0;

                                return (
                                  <td key={ci} className={\`rectilinear-td text-center border-r border-slate-50 last:border-r-0 \${group.hiddenColumns?.includes(def.id) ? 'bg-slate-50/50' : ''}\`}>
                                    <div className="relative group/trace px-1 py-1">
                                      <input
                                        type="text"
                                        value={(isReadOnlyMode && !isFirstInBlock && (isMetrologyCol || isCalculatedCol || isMetric)) ? '' : finalDisplayValue}
                                        onChange={e => updateCell(gi, ri, def.id, e.target.value)}
                                        disabled={isReadOnlyMode}
                                        className={\`w-full h-8 text-xs text-center rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-black tabular-nums \${isReadOnlyMode
                                            ? (isMetrologyCol ? 'bg-amber-50 text-amber-800 cursor-not-allowed border-amber-100' :
                                              isCalculatedCol ? 'bg-indigo-50 text-indigo-800 cursor-not-allowed border-indigo-100' :
                                                'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed')
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                          } \${isAuditorMode && (isMetrologyCol || isCalculatedCol) ? 'ring-1 ring-amber-200 ring-offset-1' : ''}\`}
                                        placeholder={isReadOnlyMode ? "" : "—"}
                                      />

                                      {isAuditorMode && calc?.trace?.[def.id] && isFirstInBlock && (
                                        <div className="absolute left-full ml-2 top-0 z-[60] w-64 bg-slate-900 text-white p-3 rounded-xl shadow-2xl opacity-0 group-hover/trace:opacity-100 transition-opacity pointer-events-none text-[10px]">
                                          <div className="flex items-center gap-1.5 mb-2 text-indigo-400 font-black uppercase tracking-tighter">
                                            <Shield size={10} /> Rastro Metrológico
                                          </div>
                                          <div className="font-mono bg-slate-800/50 p-2 rounded border border-slate-700 mb-2 whitespace-pre-wrap">
                                            {calc.trace[def.id].formula}
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-slate-400 font-bold flex justify-between">
                                              <span>Entradas:</span>
                                              <span className="text-indigo-300">
                                                {Object.keys(calc.trace[def.id].inputs).length || 'Constante'}
                                              </span>
                                            </p>
                                            {Object.entries(calc.trace[def.id].inputs).map(([depId, val]) => (
                                              <p key={depId} className="flex justify-between border-t border-slate-800 pt-1">
                                                <span className="text-slate-500">[{selectedMask?.measurementGroups[0]?.columnDefinitions?.find(d => d.id === depId)?.name || depId}]</span>
                                                <span className="text-emerald-400">{Array.isArray(val) ? \`[\${val.length}]\` : val}</span>
                                              </p>
                                            ))}
                                            <p className="flex justify-between border-t border-indigo-500/30 pt-1 mt-1">
                                              <span className="font-bold text-indigo-200 uppercase">Saída:</span>
                                              <span className="font-bold text-indigo-100">{calc.trace[def.id].output}</span>
                                            </p>
                                          </div>
                                          <div className="mt-2 text-[8px] text-slate-500 text-right italic">
                                            Ordem de Execução: #{calc.trace[def.id].executionIndex}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          {!isSubmitted && (() => {
            const usedStandardIds = selectedMask?.standardInstrumentIds || [];
            const unavailableStandards = standardInstruments.filter(
              std => usedStandardIds.includes(std.id) && std.statusMovimentacao !== 'Disponível'
            );
            const hasUnavailableStandards = unavailableStandards.length > 0;

            return (
              <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
                <div className="text-xs text-slate-400">
                  {isDirty ? <span className="text-amber-500 font-bold">● Alterações não salvas</span> : <span className="text-emerald-500 font-bold">● Sem alterações pendentes</span>}
                  {hasUnavailableStandards && (
                    <div className="mt-1 text-rose-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Padrões indisponíveis bloqueiam submissão.
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Rascunho</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || hasUnavailableStandards}
                    title={hasUnavailableStandards ? "Existem padrões indisponíveis" : ""}
                    className="flex items-center space-x-2 px-8 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SendHorizontal className="w-4 h-4" />
                    <span>Submeter para Revisão</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
`;

const finalContent = cleanLogic + jsxReturn;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('SUCCESS: File fully rebuilt. Lines:', finalContent.split('\n').length);
