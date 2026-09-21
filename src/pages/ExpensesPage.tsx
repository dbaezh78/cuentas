import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import ExpenseList from '../components/expenses/ExpenseList';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { useExpenses } from '../hooks/useExpenses';
import type { Expense, ExpenseFormData } from '../types';

export default function ExpensesPage() {
  const { expenses, loading, error, addExpense, updateExpense, deleteExpense, refetch } = useExpenses();
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const handleSubmit = async (data: ExpenseFormData) => {
    if (editExpense) {
      await updateExpense(editExpense.id, data);
    } else {
      await addExpense(data);
    }
    setEditExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditExpense(expense);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditExpense(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💸 Mis Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="p-2.5 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* List with filters */}
      <ExpenseList
        expenses={expenses}
        onEdit={handleEdit}
        onDelete={deleteExpense}
      />

      {/* Form Modal */}
      {showForm && (
        <ExpenseForm
          onSubmit={handleSubmit}
          onClose={handleClose}
          editExpense={editExpense}
        />
      )}
    </div>
  );
}
