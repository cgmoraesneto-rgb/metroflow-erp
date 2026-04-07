import React, { useState, useMemo } from 'react';
import { useAudit } from '../contexts/AuditContext';
import {
  ShieldCheck, Search, Download, Filter, Calendar,
  UserCircle, Database, ChevronDown, ChevronRight,
  Plus, Edit3, Trash2, X, AlertTriangle, Eye, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<any> }> = {
  CREATE: { label: 'Criação',   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: Plus    },
  UPDATE: { label: 'Alteração', color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-900/20',    border: 'border-amber-200 dark:border-amber-800',   icon: Edit3   },
  DELETE: { label: 'Exclusão',  color: 'text-rose-700 dark:text-rose-400',      bg: 'bg-rose-50 dark:bg-rose-900/20',      border: 'border-rose-200 dark:border-rose-800',     icon: Trash2  },
  APROVACAO_L1: { label: 'Aprov. Técnica (L1)', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', icon: ShieldCheck },
  APROVACAO_L2: { label: 'Aprov. Final (L2)', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: FileCheck },
  DEVOLUCAO: { label: 'Devolvido', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: AlertTriangle },
};

const getActionConfig = (action: string) =>
  ACTION_CONFIG[action.toUpperCase()] ?? {
    label: action, color: 'text-slate-700 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: Database
  };

const ENTITY_LABELS: Record<string, string> = {
  certificate_masks:    'Máscaras de Certificado',
  calibration_records:  'Registros de Calibração',
  clients:              'Clientes',
  quotes:               'Orçamentos',
  service_orders:       'Ordens de Serviço',
  employees:            'Funcionários',
  standard_instruments: 'Instrumentos Padrão',
  procedures:           'Procedimentos',
  banks:                'Bancos',
  vehicles:             'Veículos',
  financial_controls:   'Controle Financeiro',
  price_tables:         'Tabelas de Preço',
  payment_methods:      'Formas de Pagamento',
  document_templates:   'Templates de Documento',
};

function StateDiffViewer({ prev, next }: { prev?: string; next?: string }) {
  if (!prev && !next) return null;

  let prevObj: any = null;
  let nextObj: any = null;
  try { prevObj = prev ? JSON.parse(prev) : null; } catch { prevObj = prev; }
  try { nextObj = next ? JSON.parse(next) : null; } catch { nextObj = next; }

  const allKeys = Array.from(new Set([
    ...Object.keys(prevObj ?? {}),
    ...Object.keys(nextObj ?? {}),
  ])).filter(k => !['id'].includes(k));

  const changedKeys = allKeys.filter(k => {
    const a = JSON.stringify((prevObj ?? {})[k]);
    const b = JSON.stringify((nextObj ?? {})[k]);
    return a !== b;
  });

  const displayKeys = changedKeys.length > 0 ? changedKeys : allKeys.slice(0, 8);

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-[10px] font-mono">
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        {prevObj !== null && (
          <div className="p-3 bg-rose-50/50 dark:bg-rose-900/10">
            <p className="font-black text-rose-500 uppercase tracking-widest text-[8px] mb-2">Antes</p>
            <div className="space-y-1">
              {displayKeys.map(k => (
                <div key={k} className="flex gap-1 items-start">
                  <span className="text-slate-400 shrink-0">{k}:</span>
                  <span className="text-rose-600 dark:text-rose-400 break-all line-clamp-2">
                    {String((prevObj ?? {})[k] ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {nextObj !== null && (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10">
            <p className="font-black text-emerald-500 uppercase tracking-widest text-[8px] mb-2">Depois</p>
            <div className="space-y-1">
              {displayKeys.map(k => (
                <div key={k} className="flex gap-1 items-start">
                  <span className="text-slate-400 shrink-0">{k}:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 break-all line-clamp-2">
                    {String((nextObj ?? {})[k] ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AuditLogModule() {
  const { auditLogs } = useAudit();

  const [search, setSearch]         = useState('');
  const [filterAction, setAction]   = useState<string>('ALL');
  const [filterEntity, setEntity]   = useState<string>('ALL');
  const [filterUser, setUser]       = useState<string>('ALL');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [expandedId, setExpanded]   = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────

  const uniqueUsers    = useMemo(() => Array.from(new Set(auditLogs.map(l => l.userName))), [auditLogs]);
  const uniqueEntities = useMemo(() => Array.from(new Set(auditLogs.map(l => l.entityType))), [auditLogs]);

  const filtered = useMemo(() => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(log => {
        if (filterAction !== 'ALL' && log.action.toUpperCase() !== filterAction) return false;
        if (filterEntity !== 'ALL' && log.entityType !== filterEntity) return false;
        if (filterUser !== 'ALL' && log.userName !== filterUser) return false;
        if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(log.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            log.userName.toLowerCase().includes(q) ||
            log.entityType.toLowerCase().includes(q) ||
            log.entityId.toLowerCase().includes(q) ||
            log.action.toLowerCase().includes(q) ||
            (log.justification ?? '').toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [auditLogs, filterAction, filterEntity, filterUser, dateFrom, dateTo, search]);

  const stats = useMemo(() => ({
    total:   auditLogs.length,
    creates: auditLogs.filter(l => l.action.toUpperCase() === 'CREATE').length,
    updates: auditLogs.filter(l => l.action.toUpperCase() === 'UPDATE').length,
    deletes: auditLogs.filter(l => l.action.toUpperCase() === 'DELETE').length,
  }), [auditLogs]);

  // ── Export CSV ────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'ID do Registro', 'Justificativa'];
    const rows = filtered.map(l => [
      new Date(l.timestamp).toLocaleString('pt-BR'),
      l.userName,
      getActionConfig(l.action).label,
      ENTITY_LABELS[l.entityType] ?? l.entityType,
      l.entityId,
      l.justification ?? ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_metroflow_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = filterAction !== 'ALL' || filterEntity !== 'ALL' || filterUser !== 'ALL' || dateFrom || dateTo;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Trilha de Auditoria</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Rastreabilidade forense · ISO/IEC 17025</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          Exportar CSV ({filtered.length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Registros', value: stats.total,   bg: 'bg-slate-50   dark:bg-slate-800/50',    icon: Database, iconColor: 'text-indigo-500' },
          { label: 'Criações',           value: stats.creates, bg: 'bg-emerald-50 dark:bg-emerald-900/20',  icon: Plus,     iconColor: 'text-emerald-500' },
          { label: 'Alterações',         value: stats.updates, bg: 'bg-amber-50   dark:bg-amber-900/20',    icon: Edit3,    iconColor: 'text-amber-500' },
          { label: 'Exclusões',          value: stats.deletes, bg: 'bg-rose-50    dark:bg-rose-900/20',     icon: Trash2,   iconColor: 'text-rose-500' },
        ].map(card => (
          <div key={card.label} className={`p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner ${card.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, ID, módulo ou ação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 dark:text-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${showFilters || hasActiveFilters
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'
              : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && <span className="bg-white/30 text-white rounded-full px-1.5 text-[9px]">ON</span>}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* Action filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Ação</label>
                  <select value={filterAction} onChange={e => setAction(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="ALL">Todas as ações</option>
                    <option value="CREATE">Criação</option>
                    <option value="UPDATE">Alteração</option>
                    <option value="DELETE">Exclusão</option>
                  </select>
                </div>

                {/* Entity filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo</label>
                  <select value={filterEntity} onChange={e => setEntity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="ALL">Todos os módulos</option>
                    {uniqueEntities.map(e => (
                      <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
                    ))}
                  </select>
                </div>

                {/* User filter */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                  <select value={filterUser} onChange={e => setUser(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="ALL">Todos os usuários</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Date range */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Período</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="text-slate-400 text-[10px] shrink-0">até</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>

                {hasActiveFilters && (
                  <button onClick={() => { setAction('ALL'); setEntity('ALL'); setUser('ALL'); setDateFrom(''); setDateTo(''); }}
                    className="col-span-full text-[10px] text-indigo-500 font-black uppercase tracking-widest hover:text-indigo-700 transition-colors text-left ml-1">
                    ✕ Limpar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Log Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-400 font-bold text-sm">Nenhum registro encontrado</p>
          <p className="text-slate-300 dark:text-slate-600 text-xs font-medium">
            {auditLogs.length === 0
              ? 'A trilha de auditoria registrará as próximas ações no sistema.'
              : 'Tente ajustar os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, i) => {
            const cfg     = getActionConfig(log.action);
            const Icon    = cfg.icon;
            const isOpen  = expandedId === log.id;
            const hasDiff = !!(log.previousState || log.newState);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Action badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </div>

                  {/* Entity */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    </p>
                    <code className="text-[9px] font-mono text-indigo-400 truncate block">
                      {log.entityId}
                    </code>
                  </div>

                  {/* User */}
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-[9px] font-black uppercase">
                      {log.userName.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-[120px] truncate">{log.userName}</span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[9px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[9px] font-mono font-black text-slate-600 dark:text-slate-300">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>

                  {/* Expand toggle */}
                  {hasDiff && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                      className={`p-2 rounded-xl transition-all shrink-0 ${isOpen
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                      title="Ver alterações detalhadas"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Diff Drawer */}
                <AnimatePresence>
                  {isOpen && hasDiff && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-slate-50 dark:border-slate-800/50 pt-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Comparação de estado
                          {log.justification && (
                            <span className="ml-3 text-indigo-400 normal-case font-medium italic">"{log.justification}"</span>
                          )}
                        </p>
                        <StateDiffViewer prev={log.previousState} next={log.newState} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-center text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest pb-4">
          Exibindo {filtered.length} de {auditLogs.length} registros
        </p>
      )}
    </div>
  );
}
