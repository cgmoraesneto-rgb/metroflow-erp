import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Module, UserRole } from '../types';
import { ShieldOff } from 'lucide-react';

interface RBACGuardProps {
  /** Modules that grant access. If the employee has any of these in their permissions, access is granted. */
  allowedModules: Module[];
  children: ReactNode;
  showDenied?: boolean;
}

/**
 * Permission-based Route Guard.
 * - Admins (UserRole.ADMIN) always bypass.
 * - All other users are checked against their employee.permissions array (modules selected on registration).
 */
export default function RBACGuard({ allowedModules, children, showDenied = true }: RBACGuardProps) {
  const { employee } = useAuth();

  // No employee profile → pass through (App.tsx handles unauthenticated)
  if (!employee) return <>{children}</>;

  // Admins always have full access
  if (employee.role === UserRole.ADMIN) return <>{children}</>;

  // Check if the employee's permissions include any of the allowed modules
  const hasAccess = allowedModules.some(m => employee.permissions?.includes(m));

  if (!hasAccess) {
    if (showDenied) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="bg-rose-50 p-5 rounded-full shadow-sm border border-rose-100">
            <ShieldOff className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Acesso Negado</h2>
            <p className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              Você não possui permissão para acessar este módulo.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Solicite ao administrador que adicione os módulos necessários ao seu perfil.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
