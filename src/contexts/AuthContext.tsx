import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Employee, UserRole } from '../types';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  devLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

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
      permissions: ['Dashboard', 'Clientes', 'Comercial', 'Técnico', 'Qualidade', 'Financeiro', 'Cadastros']
    } as Employee);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (sessionStorage.getItem('metroflow_dev_mode') === 'true') {
          setDevState();
          setLoading(false);
          return;
        }

        setUser(currentUser);
        if (currentUser) {
          // Try to find employee by UID first
          let employeeDoc = await getDoc(doc(db, 'employees', currentUser.uid));

          if (employeeDoc.exists()) {
            setEmployee({ ...employeeDoc.data(), id: employeeDoc.id } as Employee);
          } else {
            // If not found by UID, try to find by email
            const q = query(collection(db, 'employees'), where('email', '==', currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const empData = querySnapshot.docs[0].data();
              const empId = querySnapshot.docs[0].id;
              const emp = { ...empData, id: empId } as Employee;
              setEmployee(emp);
            } else {
              setEmployee(null);
            }
          }
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
        empData = employees.find(e => e.username === username || e.email === username);
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
      setLoading(false);
    } catch (error: any) {
      console.error('Username Login error:', error);
      throw error;
    }
  };

  const devLogin = () => {
    setDevState();
    setLoading(false);
    // Persist dev mode in session storage
    sessionStorage.setItem('metroflow_dev_mode', 'true');
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setEmployee(null);
      sessionStorage.removeItem('metroflow_dev_mode');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, loginWithUsername, devLogin, logout }}>
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
