import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { addDoc, updateDoc, deleteDoc, getDocs, getDoc, doc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  db,
  getUserAccountsRef,
  getUserAccountDocRef,
} from '../lib/firebase';
import { useAuth } from './AuthContext';
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
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  const [maxCompanies, setMaxCompanies] = useState<number>(2);

  const fetchAccounts = useCallback(async () => {
    if (!user) { setBusinessAccounts([]); setLoading(false); return; }
    try {
      // 1. Fetch user custom maxCompanies limit from user document
      try {
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          if (typeof uData.maxCompanies === 'number') {
            setMaxCompanies(uData.maxCompanies);
          }
        }
      } catch (e) {
        console.error('Error fetching user maxCompanies doc:', e);
      }

      // 2. Fetch business accounts
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
        };
      });
      setBusinessAccounts(data);
    } catch (e) {
      console.error('Error fetching accounts:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const setActiveAccountId = (id: string) => {
    setActiveAccountIdState(id);
    localStorage.setItem('activeAccountId', id);
  };

  const accounts = [personalAccount, ...businessAccounts];
  const activeAccount = accounts.find(a => a.id === activeAccountId) || personalAccount;

  const addAccount = async (data: Omit<Account, 'id' | 'type'>) => {
    if (!user || businessAccounts.length >= maxCompanies) return;
    const ref = getUserAccountsRef(user.uid);
    const docRef = await addDoc(ref, { ...data, type: 'business', createdAt: serverTimestamp() });
    setBusinessAccounts(prev => [...prev, { id: docRef.id, type: 'business', ...data }]);
  };

  const updateAccount = async (id: string, data: Omit<Account, 'id' | 'type'>) => {
    if (!user || id === 'personal') return;
    const ref = getUserAccountDocRef(user.uid, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    setBusinessAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  };

  const deleteAccount = async (id: string) => {
    if (!user || id === 'personal') return;
    const ref = getUserAccountDocRef(user.uid, id);
    await deleteDoc(ref);
    setBusinessAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) setActiveAccountId('personal');
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
      canAddMore: businessAccounts.length < maxCompanies,
      maxCompanies,
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
