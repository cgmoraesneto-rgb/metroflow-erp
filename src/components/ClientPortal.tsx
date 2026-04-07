import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Download, LogOut, Search, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { generateCertificatePdf, generateStandardInstrumentPdf } from '../utils/pdfGenerator';
import { GENERAL_LETTERHEAD } from '../utils/letterheads';

const ClientPortal: React.FC = () => {
    const { clients, calibrationRecords, serviceOrders, standardInstruments, procedures, certificateMasks, documentTemplates, employees } = useData();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [password, setPassword] = useState('');
    const [loggedClient, setLoggedClient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Normalize input
        const cleanInput = cnpj.replace(/\D/g, '');
        
        const client = clients.find(c => {
            const cleanClientCnpj = c.cnpj.replace(/\D/g, '');
            // Accept match by clean CNPJ OR exact ID
            const isMatch = (cleanInput === cleanClientCnpj && cleanClientCnpj !== '') || c.id === cnpj;
            return isMatch && c.senha === password;
        });

        if (client) {
            setLoggedClient(client);
            setIsLoggedIn(true);
        } else {
            toast.error('CNPJ/ID ou Senha incorretos.');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                            <FileText className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2">Portal do Cliente</h1>
                        <p className="text-slate-400 text-sm">Acesso restrito para consulta de certificados</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CNPJ ou Código</label>
                            <input
                                type="text"
                                value={cnpj}
                                onChange={(e) => setCnpj(e.target.value)}
                                className="w-full bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                placeholder="00.000.000/0000-00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] mt-4"
                        >
                            Acessar Portal
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // Only show published, non-cancelled certificates for this client
    const clientCertificates = calibrationRecords.filter(r => {
        if (!r.isPublished || r.isCancelled) return false;
        const so = serviceOrders.find(s => s.id === r.serviceOrderId);
        if (so?.clienteId !== loggedClient.id) return false;
        const term = searchTerm.toLowerCase();
        return `${r.certificateNumber} ${r.instrumentName} ${r.serialNumber}`.toLowerCase().includes(term);
    });

    const handleDownloadPrimary = (certId: string) => {
        const cert = calibrationRecords.find(c => c.id === certId);
        if (!cert) return;
        generateCertificatePdf(cert, loggedClient, procedures, standardInstruments, certificateMasks, employees, false, false, documentTemplates);
    };

    const handleDownloadStandard = (siId: string) => {
        const si = standardInstruments.find(s => s.id === siId);
        if (si) {
            generateStandardInstrumentPdf(si, documentTemplates);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
                        <FileText className="text-white w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold dark:text-white">Portal do Cliente</h2>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <p className="text-sm font-bold dark:text-white">{loggedClient.razaoSocial}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CNPJ: {loggedClient.cnpj}</p>
                    </div>
                    <button
                        onClick={() => { setIsLoggedIn(false); setCnpj(''); setPassword(''); setLoggedClient(null); }}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-10 max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Bem-vindo, {loggedClient.solicitanteNome}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Consulte e faça o download dos seus certificados de calibração publicados.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-10">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="relative group flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Filtrar por certificado, instrumento ou série..."
                                className="w-full pl-12 pr-6 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-6">
                            {clientCertificates.length} certificado(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nº Certificado</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrumento</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Calibração</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Downloads</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {clientCertificates.length > 0 ? clientCertificates.map(cert => {
                                    const linkedStandards = standardInstruments.filter(si => cert.standardInstrumentIds?.includes(si.id));
                                    return (
                                        <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-6 align-top">
                                                <div className="flex items-center space-x-3 mt-1">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold dark:text-white">{cert.certificateNumber}</p>
                                                        {cert.revisionNumber && (
                                                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Rev. {cert.revisionNumber}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 align-top">
                                                <div className="dark:text-white font-medium mt-1">{cert.instrumentName}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{cert.manufacturer} • {cert.serialNumber}</div>
                                            </td>
                                            <td className="px-8 py-6 dark:text-white/70 font-medium align-top">
                                                <div className="mt-1">{new Date(cert.calibrationDate).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end space-y-2">
                                                    {/* Primary Certificate */}
                                                    <button
                                                        onClick={() => handleDownloadPrimary(cert.id)}
                                                        title={`Baixar Certificado ${cert.certificateNumber}`}
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-95"
                                                    >
                                                        <Download className="w-3.5 h-3.5 mr-2" />
                                                        Certificado Principal
                                                    </button>

                                                    {/* Certificate(s) of standard instruments used */}
                                                    {linkedStandards.map(si => (
                                                        <button
                                                            key={si.id}
                                                            onClick={() => handleDownloadStandard(si.id)}
                                                            title={`Cert. Padrão: ${si.certificadoCalibracao}`}
                                                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                                                        >
                                                            <Download className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                                            Padrão: {si.identificacao}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Search className="text-slate-400 w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-bold dark:text-white mb-2">Nenhum certificado encontrado</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Ainda não há certificados publicados para sua empresa.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-start space-x-4">
                        <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
                            <CheckCircle2 className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-emerald-950 dark:text-emerald-400 font-bold mb-1">Certificados Oficiais</h4>
                            <p className="text-emerald-900/60 dark:text-emerald-400/60 text-sm">Todos os documentos listados são oficiais e aprovados pelo laboratório.</p>
                        </div>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 flex items-start space-x-4">
                        <div className="p-3 bg-indigo-500 rounded-2xl flex-shrink-0">
                            <ShieldCheck className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-indigo-900 dark:text-indigo-400 font-bold mb-1">Dúvidas ou Divergências?</h4>
                            <p className="text-indigo-800/60 dark:text-indigo-400/60 text-sm">Entre em contato diretamente com o laboratório para qualquer esclarecimento sobre os certificados.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientPortal;
