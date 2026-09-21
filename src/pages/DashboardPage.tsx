import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import SummaryCards from '../components/dashboard/SummaryCards';
import CategoryChart from '../components/dashboard/CategoryChart';
import MonthlyChart from '../components/dashboard/MonthlyChart';
import RecentExpenses from '../components/dashboard/RecentExpenses';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../contexts/AuthContext';
import {
  calculateCategoryTotals,
  calculateMonthlyTotals,
  getCurrentMonth,
  formatMonthYear,
} from '../lib/utils';
import type { ExpenseFormData } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { expenses, loading, addExpense } = useExpenses();
  const [showForm, setShowForm] = useState(false);

  const currentMonth = getCurrentMonth();
  const prevMonth = (() => {
    const [y, m] = currentMonth.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  })();

  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonth)),
    [expenses, currentMonth]
  );
  const lastMonthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(prevMonth)),
    [expenses, prevMonth]
  );

  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalLastMonth = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const categoryTotals = useMemo(() => calculateCategoryTotals(thisMonthExpenses), [thisMonthExpenses]);
  const monthlyTotals = useMemo(() => calculateMonthlyTotals(expenses), [expenses]);
  const recentExpenses = expenses.slice(0, 5);

  const handleAddExpense = async (data: ExpenseFormData) => {
    await addExpense(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            👋 Hola, {user?.displayName?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">
            Resumen de {formatMonthYear(currentMonth)}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuevo Gasto</span>
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        totalThisMonth={totalThisMonth}
        totalLastMonth={totalLastMonth}
        transactionCount={thisMonthExpenses.length}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={categoryTotals} />
        <MonthlyChart data={monthlyTotals} />
      </div>

      {/* Recent Expenses */}
      <RecentExpenses expenses={recentExpenses} />

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          onSubmit={handleAddExpense}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
