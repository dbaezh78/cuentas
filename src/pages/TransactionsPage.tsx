import { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import TransactionList from '../components/transactions/TransactionList';
import TransactionForm from '../components/transactions/TransactionForm';
import type { Transaction, TransactionFormData } from '../types';

export default function TransactionsPage() {
  const { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction, refetch } = useTransactions();
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  const handleAdd = async (data: TransactionFormData) => {
    await addTransaction(data);
  };

  const handleEdit = async (data: TransactionFormData) => {
    if (editTransaction) {
      await updateTransaction(editTransaction.id, data);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
  };

  const openEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTransaction(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando transacciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transacciones</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {transactions.length} movimiento{transactions.length !== 1 ? 's' : ''} registrado{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="p-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Actualizar desde Firebase"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <TransactionList
        transactions={transactions}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {showForm && (
        <TransactionForm
          onSubmit={editTransaction ? handleEdit : handleAdd}
          onClose={closeForm}
          editTransaction={editTransaction}
        />
      )}
    </div>
  );
}
