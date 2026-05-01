import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { CertificateStatus, QuoteStatus, Module } from '../types';
import { Bell, AlertCircle, FileText, Wrench, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopNotifications() {
    const { calibrationRecords, quotes, standardInstruments, serviceOrders, hasPermission } = useData();
    const { employee } = useAuth();
    const navigate = useNavigate();
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const notifications = useMemo(() => {
        const notifs: any[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Notificações do Técnico (Certificados Devolvidos)
        if (hasPermission(Module.TECHNICAL)) {
            const returnedRecords = calibrationRecords.filter(r => 
                r.status === CertificateStatus.RETURNED && 
                (!employee || r.technicianName === employee.id)
            );
            
            returnedRecords.forEach(r => {
                notifs.push({
                    id: `returned-${r.id}`,
                    type: 'danger',
                    icon: AlertCircle,
                    title: 'Certificado Devolvido',
                    message: `O Certificado ${r.certificateNumber} foi devolvido. Justificativa: ${r.returnJustification}`,
                    action: () => navigate('/tecnico'),
                    time: 'Técnico'
                });
            });

            // Certificados Aguardando Assinatura (Para Revisores/RT)
            const signaturePending = calibrationRecords.filter(r => r.status === CertificateStatus.IN_ANALYSIS);
            signaturePending.forEach(r => {
                notifs.push({
                    id: `sign-pending-${r.id}`,
                    type: 'warning',
                    icon: Wrench,
                    title: 'Aguardando Assinatura',
                    message: `O Certificado ${r.certificateNumber} está pronto para análise e assinatura.`,
                    action: () => navigate('/qualidade'),
                    time: 'Qualidade'
                });
            });
        }

        // 2. Notificações da Qualidade (Padrões Vencendo / Vencidos)
        if (hasPermission(Module.QUALITY)) {
            const now = new Date();
            const soon = new Date();
            soon.setDate(now.getDate() + 30); 

            standardInstruments.forEach(std => {
                const dueDate = std.dataValidadeCalibracao ? new Date(std.dataValidadeCalibracao) : null;
                if (dueDate && dueDate < now) {
                    notifs.push({
                        id: `std-exp-${std.id}`,
                        type: 'danger',
                        icon: Wrench,
                        title: 'Padrão Vencido',
                        message: `O Padrão ${std.identificacao} venceu em ${dueDate.toLocaleDateString('pt-BR')}.`,
                        action: () => navigate('/cadastros'), 
                        time: 'Qualidade'
                    });
                }
            });

            // Certificados Aprovados Hoje
            const approvedToday = calibrationRecords.filter(r => r.status === CertificateStatus.APPROVED && r.calibrationDate === todayStr);
            if (approvedToday.length > 0) {
              notifs.push({
                  id: 'certs-approved-today',
                  type: 'info',
                  icon: FileText,
                  title: 'Certificados Aprovados',
                  message: `${approvedToday.length} certificados foram aprovados e estão prontos para envio.`,
                  action: () => navigate('/qualidade'),
                  time: 'Sucesso'
              });
            }
        }

        // 3. Notificações Comerciais & Logística (O.S. Criadas e Pendências)
        if (hasPermission(Module.COMMERCIAL) || hasPermission(Module.LOGISTICS)) {
            const newOS = serviceOrders.filter(os => os.dataEmissao === todayStr);
            if (newOS.length > 0) {
                notifs.push({
                    id: 'new-os-today',
                    type: 'info',
                    icon: FileText,
                    title: 'Novas O.S. Criadas',
                    message: `Existem ${newOS.length} novas Ordens de Serviço abertas hoje.`,
                    action: () => navigate('/logistica'),
                    time: 'Logística'
                });
            }

            const pendingQuotes = quotes.filter(q => q.status === QuoteStatus.PENDING);
            const pendingOS = serviceOrders.filter(os => os.statusServico === 'Pendente');
            
            if (pendingQuotes.length > 0 || pendingOS.length > 0) {
                notifs.push({
                    id: 'summary-pending',
                    type: 'warning',
                    icon: FileText,
                    title: 'Resumo de Pendências',
                    message: `Pendentes: ${pendingQuotes.length} orçamentos e ${pendingOS.length} ordens de serviço.`,
                    action: () => navigate('/comercial'),
                    time: 'Ação Necessária'
                });
            }
        }

        // 4. Notificações Financeiras (Serviços Concluídos)
        if (hasPermission(Module.FINANCE)) {
            const completedServices = serviceOrders.filter(os => os.statusServico === 'Concluído');
            if (completedServices.length > 0) {
                notifs.push({
                    id: 'finance-pending',
                    type: 'info',
                    icon: FileText,
                    title: 'Serviços Concluídos',
                    message: `Existem ${completedServices.length} serviços concluídos aguardando faturamento.`,
                    action: () => navigate('/financeiro'),
                    time: 'Financeiro'
                });
            }
        }

        return notifs;
    }, [calibrationRecords, quotes, standardInstruments, serviceOrders, hasPermission, employee, navigate]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all relative group"
            >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 group-hover:scale-125 transition-transform flex items-center justify-center"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Notificações</h3>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{notifications.length} avisos</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 rounded-xl shadow-sm transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto w-full flex flex-col">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center">
                                <Bell className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                                <p className="text-sm font-black text-slate-400 tracking-widest uppercase">Tudo limpo!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            n.action();
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-2xl flex-shrink-0 h-min ${
                                                n.type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' :
                                                n.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                                                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                                            }`}>
                                                <n.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">{n.title}</h4>
                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap">{n.time}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
