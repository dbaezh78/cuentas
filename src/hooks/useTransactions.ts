import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  collection,
  doc,
  serverTimestamp,
  getAccountTransactionsRef,
  getAccountTransactionDocRef,
  db,
} from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../contexts/AccountsContext';
import { useLogger } from '../contexts/LoggerContext';
import type { Transaction, TransactionFormData } from '../types';

export function useTransactions() {
  const { user } = useAuth();
  const { activeAccountId } = useAccounts();
  const { addLog } = useLogger();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) { setTransactions([]); setLoading(false); return; }

    try {
      setLoading(true);
      setError(null);
      addLog('FIREBASE_READ', `Cargando transacciones de cuenta ${activeAccountId}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapDoc = (docSnap: any, src: 'expenses' | 'transactions'): Transaction => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          amount: d.amount as number,
          category: d.category as string,
          description: d.description as string,
          date: d.date as string,
          paymentMethod: d.paymentMethod || 'cash',
          type: (d.type as 'income' | 'expense') || 'expense',
          details: Array.isArray(d.details) ? d.details : [],
          _sourceCollection: src,
        };
      };

      if (activeAccountId === 'personal') {
        // Personal: read from BOTH collections for backward compatibility
        const oldRef = collection(db, 'users', user.uid, 'expenses');
        const newRef = getAccountTransactionsRef(user.uid, 'personal');
        const [oldSnap, newSnap] = await Promise.all([
          getDocs(query(oldRef, orderBy('date', 'desc'))),
          getDocs(query(newRef, orderBy('date', 'desc'))),
        ]);
        const oldData = oldSnap.docs.map(d => mapDoc(d, 'expenses'));
        const newData = newSnap.docs.map(d => mapDoc(d, 'transactions'));
        const allById = new Map<string, Transaction>();
        [...oldData, ...newData].forEach(t => allById.set(t.id, t));
        const res = Array.from(allById.values()).sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(res);
        addLog('APP_ACTION', `Cargadas ${res.length} transacciones personales`);
      } else {
        // Business account: only read from its own transactions sub-collection
        const ref = getAccountTransactionsRef(user.uid, activeAccountId);
        const snap = await getDocs(query(ref, orderBy('date', 'desc')));
        const res = snap.docs.map(d => mapDoc(d, 'transactions'));
        setTransactions(res);
        addLog('APP_ACTION', `Cargadas ${res.length} transacciones de empresa ${activeAccountId}`);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error al cargar las transacciones. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [user, activeAccountId]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const addTransaction = async (formData: TransactionFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    addLog('FIREBASE_WRITE', 'Guardando nueva transacción', `${formData.type.toUpperCase()}: $${formData.amount} - ${formData.description}`);
    const ref = getAccountTransactionsRef(user.uid, activeAccountId);
    const payload = {
      amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
      category: formData.category,
      description: formData.description.trim(),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      type: formData.type,
      details: (formData.details || []).filter(d => d.detalle.trim()),
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(ref, payload);
    const optimistic: Transaction = { id: docRef.id, ...payload, amount: payload.amount, _sourceCollection: 'transactions' };
    setTransactions(prev => [optimistic, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    addLog('FIREBASE_WRITE', 'Transacción guardada exitosamente', `ID: ${docRef.id}`);
  };

  const updateTransaction = async (id: string, formData: TransactionFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const existing = transactions.find(t => t.id === id);
    const src = existing?._sourceCollection || 'transactions';
    const payload = {
      amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
      category: formData.category,
      description: formData.description.trim(),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      type: formData.type,
      details: (formData.details || []).filter(d => d.detalle.trim()),
      updatedAt: serverTimestamp(),
    };

    if (src === 'expenses') {
      // Migrate old expenses doc → new transactions path
      const transRef = getAccountTransactionsRef(user.uid, activeAccountId);
      const oldRef = doc(db, 'users', user.uid, 'expenses', id);
      await addDoc(transRef, { ...payload, createdAt: serverTimestamp() });
      await deleteDoc(oldRef);
      await fetchTransactions();
      return;
    }

    const ref = getAccountTransactionDocRef(user.uid, activeAccountId, id);
    await updateDoc(ref, payload);
    setTransactions(prev =>
      prev.map(t => t.id === id
        ? { ...t, ...formData, amount: payload.amount, details: payload.details, _sourceCollection: 'transactions' as const }
        : t
      ).sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const existing = transactions.find(t => t.id === id);
    const src = existing?._sourceCollection || 'transactions';
    if (src === 'expenses') {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
    } else {
      await deleteDoc(getAccountTransactionDocRef(user.uid, activeAccountId, id));
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction, refetch: fetchTransactions };
}
