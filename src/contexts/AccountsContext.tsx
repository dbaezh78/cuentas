import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { addDoc, updateDoc, deleteDoc, getDocs, getDoc, doc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  db,
  getUserAccountsRef,
  getUserAccountDocRef,
} from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useLogger } from './LoggerContext';
import type { Account } from '../types';

interface AccountsContextType {
  accounts: Account[];           // [personal, ...businesses]
  activeAccount: Account;
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  addAccount: (data: Omit<Account, 'id' | 'type'>) => Promise<void>;
  updateAccount: (id: string, data: Omit<Account, 'id' | 'type'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  loading: boolean;
  canAddMore: boolean;
  maxCompanies: number;
  deadlineDate: string | null;
  refetch: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addLog } = useLogger();
  const [businessAccounts, setBusinessAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() =>
    localStorage.getItem('activeAccountId') || 'personal'
  );
  const [loading, setLoading] = useState(true);

  // The personal account is always derived from the Firebase user
  const personalAccount: Account = {
    id: 'personal',
    type: 'personal',
    rnc: '',
    razonSocial: user?.displayName || 'Personal',
    telefono: '',
    direccion: '',
    correo: user?.email || '',
    direccionWeb: '',
  };

  const isAdmin = user?.email?.toLowerCase() === 'dbaezh78@gmail.com';
  const [maxCompanies, setMaxCompanies] = useState<number>(2);
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) { setBusinessAccounts([]); setLoading(false); return; }
    try {
      addLog('FIREBASE_READ', 'Leyendo límite y plazo de usuario', `users/${user.uid}`);
      // 1. Fetch user custom maxCompanies limit and deadlineDate from user document
      try {
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          if (typeof uData.maxCompanies === 'number') {
            setMaxCompanies(uData.maxCompanies);
          } else {
            setMaxCompanies(2);
          }
          if (uData.deadlineDate) {
            setDeadlineDate(String(uData.deadlineDate));
          } else {
            setDeadlineDate(null);
          }
        } else {
          setMaxCompanies(2);
          setDeadlineDate(null);
        }
      } catch (e) {
        console.error('Error fetching user maxCompanies doc:', e);
      }

      // 2. Fetch business accounts
      addLog('FIREBASE_READ', 'Leyendo empresas creadas', `users/${user.uid}/accounts`);
      const ref = getUserAccountsRef(user.uid);
      const snap = await getDocs(query(ref, orderBy('createdAt', 'asc')));
      const data: Account[] = snap.docs.map(d => {
        const fd = d.data();
        return {
          id: d.id,
          type: 'business' as const,
          rnc: fd.rnc || '',
          razonSocial: fd.razonSocial || '',
          telefono: fd.telefono || '',
          direccion: fd.direccion || '',
          correo: fd.correo || '',
          direccionWeb: fd.direccionWeb || '',
          isPublic: Boolean(fd.isPublic),
          sharePassword: fd.sharePassword || '',
          viewers: Array.isArray(fd.viewers) ? fd.viewers : [],
        };
      });
      setBusinessAccounts(data);
      addLog('APP_ACTION', `Cargadas ${data.length} empresas para usuario`);
    } catch (e) {
      console.error('Error fetching accounts:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccounts();

    if (!user) return;
    // Real-time listener on user doc so limit updates instantly across all active sessions
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        if (typeof uData.maxCompanies === 'number') {
          setMaxCompanies(uData.maxCompanies);
        } else {
          setMaxCompanies(2);
        }
        if (uData.deadlineDate) {
          setDeadlineDate(String(uData.deadlineDate));
        } else {
          setDeadlineDate(null);
        }
        addLog('REALTIME', 'Sincronización en vivo recibida', `Límite: ${uData.maxCompanies || 2}, Plazo: ${uData.deadlineDate || 'Sin plazo'}`);
      }
    });

    return () => unsubscribe();
  }, [user, fetchAccounts]);

  const setActiveAccountId = (id: string) => {
    setActiveAccountIdState(id);
    localStorage.setItem('activeAccountId', id);
    addLog('APP_ACTION', 'Cuenta activa cambiada', `ID activo: ${id}`);
  };

  const accounts = [personalAccount, ...businessAccounts];
  const activeAccount = accounts.find(a => a.id === activeAccountId) || personalAccount;

  const canAddMore = isAdmin || businessAccounts.length < maxCompanies;

  const addAccount = async (data: Omit<Account, 'id' | 'type'>) => {
    if (!user) return;
    if (!canAddMore) return;
    addLog('FIREBASE_WRITE', 'Guardando nueva empresa en Firebase', data.razonSocial);
    const ref = getUserAccountsRef(user.uid);
    const docRef = await addDoc(ref, { ...data, type: 'business', createdAt: serverTimestamp() });
    setBusinessAccounts(prev => [...prev, { id: docRef.id, type: 'business', ...data }]);
    addLog('FIREBASE_WRITE', 'Empresa agregada exitosamente', `ID: ${docRef.id}`);
  };

  const updateAccount = async (id: string, data: Omit<Account, 'id' | 'type'>) => {
    if (!user || id === 'personal') return;
    addLog('FIREBASE_WRITE', 'Actualizando empresa en Firebase', `ID: ${id}`);
    const ref = getUserAccountDocRef(user.uid, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    setBusinessAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    addLog('APP_ACTION', 'Empresa actualizada', data.razonSocial);
  };

  const deleteAccount = async (id: string) => {
    if (!user || id === 'personal') return;
    addLog('FIREBASE_WRITE', 'Eliminando empresa de Firebase', `ID: ${id}`);
    const ref = getUserAccountDocRef(user.uid, id);
    await deleteDoc(ref);
    setBusinessAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) setActiveAccountId('personal');
    addLog('APP_ACTION', 'Empresa eliminada', `ID: ${id}`);
  };

  return (
    <AccountsContext.Provider value={{
      accounts,
      activeAccount,
      activeAccountId,
      setActiveAccountId,
      addAccount,
      updateAccount,
      deleteAccount,
      loading,
      canAddMore,
      maxCompanies: maxCompanies,
      deadlineDate,
      refetch: fetchAccounts,
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

// Suppress the unused import warning for Timestamp
const _ts = Timestamp;
void _ts;

export function useAccounts(): AccountsContextType {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error('useAccounts must be used within AccountsProvider');
  return ctx;
}
