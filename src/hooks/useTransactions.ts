import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  collection,
  serverTimestamp,
  getUserTransactionsRef,
  getUserTransactionDocRef,
  db,
} from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Transaction, TransactionFormData } from '../types';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Read from BOTH collections so old data (expenses) still shows up
      const oldRef = collection(db, 'users', user.uid, 'expenses');
      const newRef = getUserTransactionsRef(user.uid);

      const [oldSnap, newSnap] = await Promise.all([
        getDocs(query(oldRef, orderBy('date', 'desc'))),
        getDocs(query(newRef, orderBy('date', 'desc'))),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapDoc = (doc: any, defaultType: 'income' | 'expense' = 'expense'): Transaction => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount as number,
          category: d.category,
          description: d.description as string,
          date: d.date as string,
          paymentMethod: d.paymentMethod || 'cash',
          type: (d.type as 'income' | 'expense') || defaultType,
        };
      };

      const oldData: Transaction[] = oldSnap.docs.map(d => mapDoc(d, 'expense'));
      const newData: Transaction[] = newSnap.docs.map(d => mapDoc(d, 'expense'));

      // Merge and sort by date (avoid duplicates by id)
      const allById = new Map<string, Transaction>();
      [...oldData, ...newData].forEach(t => allById.set(t.id, t));
      const merged = Array.from(allById.values()).sort((a, b) => b.date.localeCompare(a.date));

      setTransactions(merged);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error al cargar las transacciones. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (formData: TransactionFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const ref = getUserTransactionsRef(user.uid);
    const newTransaction = {
      ...formData,
      amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
      description: formData.description.trim(),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(ref, newTransaction);

    // Optimistic update
    const optimisticTransaction: Transaction = {
      id: docRef.id,
      ...formData,
      amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
      description: formData.description.trim(),
    };

    setTransactions((prev) =>
      [optimisticTransaction, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const updateTransaction = async (id: string, formData: TransactionFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const ref = getUserTransactionDocRef(user.uid, id);
    const updates = {
      ...formData,
      amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
      description: formData.description.trim(),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(ref, updates);

    setTransactions((prev) =>
      prev
        .map((t) =>
          t.id === id
            ? {
                ...t,
                ...formData,
                amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount,
                description: formData.description.trim(),
              }
            : t
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const ref = getUserTransactionDocRef(user.uid, id);
    await deleteDoc(ref);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
