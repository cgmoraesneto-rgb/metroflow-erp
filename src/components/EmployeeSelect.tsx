import React from 'react';
import { useData } from '../contexts/DataContext';
import { UserCheck } from 'lucide-react';

interface EmployeeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function EmployeeSelect({ value, onChange, label, placeholder = 'Selecionar responsável...', className = '' }: EmployeeSelectProps) {
  const { employees } = useData();

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none font-bold text-sm transition-all dark:text-white appearance-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nome}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
