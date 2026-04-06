import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { ShieldOff } from 'lucide-react';

interface RBACGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  /** If true, renders an "Access Denied" page instead of redirecting */
  showDenied?: boolean;
}

/**
 * ISO 17025 Route-level RBAC Guard.
 * - Admins (UserRole.ADMIN) always bypass the guard (full access).
 * - Employees with no role field also bypass (legacy accounts).
 * - All others are checked against allowedRoles.
 */
export default function RBACGuard({ allowedRoles, children, showDenied = true }: RBACGuardProps) {
  const { employee } = useAuth();

  // No employee profile → bypass (truly unauthenticated flow handled by App.tsx)
  if (!employee) return <>{children}</>;

  const role = employee.role as UserRole | undefined;

  // Admins always have full access to every module
  if (role === UserRole.ADMIN) return <>{children}</>;

  // No role set (legacy account/corrupted session) → BLOCK strictly  
  if (!role) {
    if (showDenied) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="bg-rose-50 p-5 rounded-full shadow-sm border border-rose-100">
            <ShieldOff className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Acesso Bloqueado</h2>
            <p className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              Sua conta contorna políticas de segurança e não possui um perfil definido.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific role
  if (!allowedRoles.includes(role)) {
    if (showDenied) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="bg-rose-50 p-5 rounded-full">
            <ShieldOff className="w-10 h-10 text-rose-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-900 mb-1">Acesso Negado</h2>
            <p className="text-sm text-slate-500">
              Sua função <strong>({role})</strong> não tem permissão para acessar este módulo.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Acesso permitido para: {allowedRoles.join(', ')}
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
