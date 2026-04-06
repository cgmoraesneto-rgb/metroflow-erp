import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Database, Terminal, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DEV_USERNAME = 'admin';
const DEV_PASSWORD = 'metroflow2025';

export default function Login() {
  const { loginWithUsername, devLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setIsLoggingIn(true);
    setWrongAttempt(false);

    // Simulate a small network delay for professionalism
    await new Promise(res => setTimeout(res, 600));

    try {
      if (username === DEV_USERNAME && password === DEV_PASSWORD) {
        devLogin();
        toast.success('Acesso concedido. Bem-vindo!');
      } else {
        await loginWithUsername(username, password);
        toast.success('Login efetuado com sucesso!');
      }
    } catch (err: any) {
      setWrongAttempt(true);
      toast.error(err?.message || 'Usuário ou senha incorretos.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl relative z-10"
      >
        {/* Logo */}
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/30">
          <Database className="text-white w-10 h-10" />
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            MetroFlow <span className="text-indigo-500">ERP</span>
          </h1>
          <p className="text-slate-400 font-medium italic text-sm">Gestão Avançada de Metrologia</p>
        </div>

        {/* Dev mode badge */}
        <div className="flex items-center justify-center mb-8">
          <span className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
            <Terminal className="w-3 h-3" />
            Ambiente de Desenvolvimento
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 bg-slate-800/60 border rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-bold text-sm transition-all text-white placeholder:text-slate-600 ${wrongAttempt ? 'border-rose-500/50' : 'border-slate-700'}`}
                placeholder="ex: admin"
                autoComplete="username"
                disabled={isLoggingIn}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-12 pr-12 py-3.5 bg-slate-800/60 border rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-bold text-sm transition-all text-white placeholder:text-slate-600 ${wrongAttempt ? 'border-rose-500/50' : 'border-slate-700'}`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoggingIn}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {wrongAttempt && (
            <p className="text-rose-400 text-xs font-bold text-center animate-pulse">
              Usuário ou senha incorretos. Tente novamente.
            </p>
          )}

          {/* Submit Button */}
          <button
            id="login-submit"
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center space-x-2 group h-14 mt-2 disabled:opacity-60"
          >
            {isLoggingIn ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <span>Acessar Sistema</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-bold text-slate-700 uppercase tracking-widest">
          © 2025 MetroFlow ERP • v4.0.0 (Accreditation Ready)
        </p>
      </motion.div>
    </div>
  );
}
