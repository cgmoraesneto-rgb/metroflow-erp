import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface FirstLoginPasswordChangeProps {
  employeeName: string;
  onConfirm: (newPassword: string) => Promise<void>;
}

export default function FirstLoginPasswordChange({ employeeName, onConfirm }: FirstLoginPasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const rules = [
    { label: 'Mínimo 8 caracteres', valid: newPassword.length >= 8 },
    { label: 'Pelo menos uma letra maiúscula', valid: /[A-Z]/.test(newPassword) },
    { label: 'Pelo menos um número', valid: /[0-9]/.test(newPassword) },
    { label: 'As senhas coincidem', valid: newPassword === confirmPassword && confirmPassword.length > 0 },
  ];

  const isValid = rules.every(r => r.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Verifique os requisitos de senha.');
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(newPassword);
      toast.success('Senha alterada com sucesso! Bem-vindo ao MetroFlow ERP.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/15 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/15 blur-[120px] rounded-full animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl relative z-10"
      >
        {/* Icon */}
        <div className="bg-emerald-600/20 border border-emerald-500/30 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/10">
          <ShieldCheck className="text-emerald-400 w-10 h-10" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            Primeiro Acesso
          </h1>
          <p className="text-slate-400 text-sm">
            Olá, <span className="text-white font-bold">{employeeName}</span>! Por segurança, defina uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nova Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none font-bold text-sm text-white placeholder:text-slate-600 transition-all"
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none font-bold text-sm text-white placeholder:text-slate-600 transition-all"
                placeholder="Repita a nova senha"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password rules */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs font-semibold transition-colors ${rule.valid ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 transition-all ${rule.valid ? 'scale-100' : 'scale-75 opacity-40'}`} />
                {rule.label}
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 h-14 mt-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Definir Senha e Entrar</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold text-slate-700 uppercase tracking-widest">
          © 2025 MetroFlow ERP • Segurança de Acesso
        </p>
      </motion.div>
    </div>
  );
}
