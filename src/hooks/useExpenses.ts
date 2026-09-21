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
  getUserExpensesRef,
  getUserExpenseDocRef,
} from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, ExpenseFormData } from '../types';

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const ref = getUserExpensesRef(user.uid);
      const q = query(ref, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      const data: Expense[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount as number,
          category: d.category,
          description: d.description as string,
          date: d.date as string,
          paymentMethod: d.paymentMethod,
          notes: d.notes as string | undefined,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
        };
      });

      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Error al cargar los gastos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (formData: ExpenseFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const ref = getUserExpensesRef(user.uid);
    const newExpense = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description.trim(),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes?.trim() || null,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(ref, newExpense);

    // Optimistic update
    const optimisticExpense: Expense = {
      id: docRef.id,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description.trim(),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes?.trim() || undefined,
      createdAt: new Date(),
    };

    setExpenses((prev) =>
      [optimisticExpense, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const updateExpense = async (id: string, formData: ExpenseFormData): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const ref = getUserExpenseDocRef(user.uid, id);
    const updates = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description.trim(),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes?.trim() || null,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(ref, updates);

    setExpenses((prev) =>
      prev
        .map((e) =>
          e.id === id
            ? {
                ...e,
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description.trim(),
                date: formData.date,
                paymentMethod: formData.paymentMethod,
                notes: formData.notes?.trim() || undefined,
                updatedAt: new Date(),
              }
            : e
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const deleteExpense = async (id: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const ref = getUserExpenseDocRef(user.uid, id);
    await deleteDoc(ref);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
