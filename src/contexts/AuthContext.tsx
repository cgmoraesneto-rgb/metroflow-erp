import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Employee, UserRole } from '../types';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  mustChangePassword: boolean;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  devLogin: () => void;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const setDevState = () => {
    const mockUser = {
      uid: 'dev-user-id',
      email: 'c.g.moraesneto@gmail.com',
      displayName: 'Developer Access',
      photoURL: null,
      emailVerified: true,
    } as User;

    setUser(mockUser);
    setEmployee({
      id: 'dev-emp-id',
      nome: 'Desenvolvedor MetroFlow',
      cargo: 'Super User',
      email: 'c.g.moraesneto@gmail.com',
      telefone: '(00) 00000-0000',
      role: UserRole.ADMIN,
      permissions: [
        'Dashboard' as any,
        'Clientes' as any,
        'Comercial' as any,
        'Logística' as any,
        'Técnico' as any,
        'Qualidade' as any,
        'Financeiro' as any,
        'Cadastros' as any,
      ]
    } as Employee);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Re-trigger loading when a check starts (especially on refresh)
      setLoading(true);
      
      try {
        if (localStorage.getItem('metroflow_dev_mode') === 'true') {
          setDevState();
          return;
        }

        let finalUser = currentUser;

        // Fallback: Check local storage for persisted login if Firebase Auth yields null
        if (!finalUser) {
          const persistedUserId = localStorage.getItem('metroflow_local_uid');
          if (persistedUserId) {
            try {
              let empData: any = null;
              try {
                let employeeDoc = await getDoc(doc(db, 'employees', persistedUserId));
                if (employeeDoc.exists()) {
                  empData = employeeDoc.data();
                }
              } catch(e) { console.warn('Firestore fallback fetch err', e); }

              if (!empData) {
                const employees = await apiClient.fetch<Employee>('/api/mock/employees');
                empData = employees.find(e => e.id === persistedUserId);
              }

              if (empData) {
                finalUser = {
                  uid: persistedUserId,
                  email: empData.email,
                  displayName: empData.nome,
                  photoURL: null,
                  emailVerified: true,
                } as User;
              }
            } catch(e) {
               console.warn("Failed to persist local session", e);
            }
          }
        }

        setUser(finalUser);
        if (finalUser) {
          let emp: Employee | null = null;
          try {
            // Try to find employee by UID first
            let employeeDoc = await getDoc(doc(db, 'employees', finalUser.uid));
            if (employeeDoc.exists()) {
              emp = { ...employeeDoc.data(), id: employeeDoc.id } as Employee;
            } else {
              // If not found by UID, try to find by email
              const q = query(collection(db, 'employees'), where('email', '==', finalUser.email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const empData = querySnapshot.docs[0].data();
                const empId = querySnapshot.docs[0].id;
                emp = { ...empData, id: empId } as Employee;
              }
            }
          } catch(e) { console.warn("Firestore employee fetch failed", e); }

          if (!emp) {
            try {
              const employees = await apiClient.fetch<Employee>('/api/mock/employees');
              emp = employees.find(e => e.id === finalUser?.uid || e.email === finalUser?.email) || null;
            } catch(e) {}
          }
          setEmployee(emp);
        } else {
          setEmployee(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);


  const loginWithUsername = async (username: string, password: string) => {
    try {
      // First, try local mock DB path (development mode)
      let empData: Employee | undefined;

      try {
        const employees = await apiClient.fetch<Employee>('/api/mock/employees');
        empData = employees.find(e => 
          (e.username && e.username.toLowerCase() === username.toLowerCase()) || 
          (e.email && e.email.toLowerCase() === username.toLowerCase())
        );
      } catch (mockError) {
        console.warn('Mock employee fetch falhou, tentaremos Firebase:', mockError);
      }

      // If not found in local JSON, try Firestore path
      if (!empData) {
        let q = query(collection(db, 'employees'), where('username', '==', username));
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          q = query(collection(db, 'employees'), where('email', '==', username));
          querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          empData = { ...docSnap.data(), id: docSnap.id } as Employee;
        }
      }

      if (!empData) {
        throw new Error('Usuário não encontrado');
      }

      if (!empData.password) {
        throw new Error('Usuário não possui senha cadastrada. Contate o administrador.');
      }

      if (empData.password !== password) {
        throw new Error('Usuário ou senha incorretos');
      }

      try {
        await signInWithEmailAndPassword(auth, empData.email, password);
      } catch (authError) {
        console.warn('Firebase Auth login falhou - fallback local:', authError);
      }

      const localUser = {
        uid: empData.id,
        email: empData.email,
        displayName: empData.nome,
        photoURL: null,
        emailVerified: true,
      } as User;

      // Role inference for existing mock accounts
      if (!empData.role) {
        const cargo = (empData.cargo || '').toLowerCase();
        if (cargo.includes('responsável técnico') || cargo.includes('responsavel tecnico')) {
          empData.role = UserRole.RESPONSAVEL_TECNICO;
        } else if (cargo.includes('qualidade') || cargo.includes('revisor')) {
          empData.role = UserRole.REVISOR;
        } else if (cargo.includes('técnico') || cargo.includes('tecnico')) {
          empData.role = UserRole.TECNICO;
        } else {
          empData.role = UserRole.RESPONSAVEL_TECNICO;
        }
      }

      setUser(localUser);
      setEmployee(empData);
      setMustChangePassword(empData.mustChangePassword === true);
      localStorage.setItem('metroflow_local_uid', empData.id);
      setLoading(false);
    } catch (error: any) {
      console.error('Username Login error:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!employee) throw new Error('Nenhum usuário logado.');
    // Update password and clear the mustChangePassword flag in Firestore
    const empRef = doc(db, 'employees', employee.id);
    await updateDoc(empRef, { password: newPassword, mustChangePassword: false });
    setEmployee(prev => prev ? { ...prev, password: newPassword, mustChangePassword: false } : prev);
    setMustChangePassword(false);
  };

  const devLogin = () => {
    setDevState();
    setLoading(false);
    // Persist dev mode in session storage
    localStorage.setItem('metroflow_dev_mode', 'true');
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setEmployee(null);
      localStorage.removeItem('metroflow_dev_mode');
      localStorage.removeItem('metroflow_local_uid');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, mustChangePassword, loginWithUsername, devLogin, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
