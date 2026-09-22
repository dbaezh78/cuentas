import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
  getUserTransactionsRef,
  getUserTransactionDocRef,
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
      const ref = getUserTransactionsRef(user.uid);
      const q = query(ref, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      const data: Transaction[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount as number,
          category: d.category,
          description: d.description as string,
          date: d.date as string,
          paymentMethod: d.paymentMethod,
          type: d.type || 'expense', // fallback
          notes: d.notes as string | undefined,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
        };
      });

      setTransactions(data);
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
