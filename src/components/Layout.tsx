import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    ShieldCheck,
    Wrench,
    CircleDollarSign,
    Database,
    LayoutDashboard,
    LogOut,
    RefreshCw,
    Search,
    Bell,
    Sun,
    Moon,
    ChevronRight,
    Truck
} from 'lucide-react';
import { Module } from '../types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, employee, logout } = useAuth();
    const { hasPermission, isSyncing } = useData();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        setIsSidebarOpen(false); // Close sidebar on route change
    }, [location.pathname]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: Module.DASHBOARD },
        { to: '/comercial', icon: Users, label: 'Comercial', module: Module.COMMERCIAL },
        { to: '/logistica', icon: Truck, label: 'Logística', module: Module.LOGISTICS },
        { to: '/qualidade', icon: ShieldCheck, label: 'Qualidade', module: Module.QUALITY },
        { to: '/tecnico', icon: Wrench, label: 'Técnico', module: Module.TECHNICAL },
        { to: '/financeiro', icon: CircleDollarSign, label: 'Financeiro', module: Module.FINANCE },
        { to: '/cadastros', icon: Database, label: 'Cadastros', module: Module.REGISTRY },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300 overflow-x-hidden">
            {/* Sidebar Backdrop (Mobile) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[25] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ 
                    x: isSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0),
                    opacity: 1 
                }}
                className={`w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-[30] transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none animate-float">
                                <Database className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">MetroFlow</h1>
                                <div className="flex items-center mt-1">
                                    {isSyncing ? (
                                        <span className="flex items-center text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full animate-pulse capitalize">
                                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
                                            Sincronizando
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full capitalize">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                                            Online
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
                            <RefreshCw className="w-5 h-5 rotate-45" />
                        </button>
                    </div>

                    <nav className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-4 mb-3">Módulos</div>

                        {navItems.map((item) => hasPermission(item.module) && (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `
                  relative group flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300
                  ${isActive
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
                `}
                            >
                                <item.icon className={`mr-3 w-5 h-5 transition-transform duration-300 group-hover:scale-110`} />
                                <span>{item.label}</span>
                                {location.pathname.startsWith(item.to) && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-indigo-600 rounded-2xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <ChevronRight className={`ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0`} />
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] mb-4 group cursor-default">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-800/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black mr-3 border border-indigo-200/50 dark:border-indigo-500/20">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.displayName || 'Usuário'}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider truncate">{employee?.cargo || 'Colaborador'}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Sair"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="flex-1 flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-72 transition-all duration-300">
                {/* Header / Global Search */}
                <header className="h-20 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-[20] transition-colors duration-300">
                    <div className="flex items-center space-x-4 flex-1">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2.5 text-slate-500 lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        >
                            <LayoutDashboard className="w-6 h-6" />
                        </button>
                        <div className="relative group flex-1 max-w-md hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Pesquisar..."
                                className="w-full pl-12 pr-6 py-2.5 bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-800 border focus:border-indigo-500/30 focus:ring-8 focus:ring-indigo-500/5 rounded-2xl text-sm transition-all outline-none font-medium dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 sm:space-x-6">
                        <button className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all relative group">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 group-hover:scale-125 transition-transform"></span>
                        </button>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-10 flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="max-w-7xl mx-auto"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Layout;
