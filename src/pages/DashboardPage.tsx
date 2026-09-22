import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import SummaryCards from '../components/dashboard/SummaryCards';
import CategoryChart from '../components/dashboard/CategoryChart';
import MonthlyChart from '../components/dashboard/MonthlyChart';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import TransactionForm from '../components/transactions/TransactionForm';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../contexts/AuthContext';
import {
  calculateCategoryTotals,
  calculateMonthlyTotals,
  getCurrentMonth,
  getLast6Months,
  formatMonthYear,
} from '../lib/utils';
import type { TransactionFormData } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { transactions, loading, addTransaction } = useTransactions();
  const [showForm, setShowForm] = useState(false);

  const currentMonth = getCurrentMonth();
  const months = getLast6Months();

  const currentMonthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const monthlyTotals = useMemo(() => calculateMonthlyTotals(transactions, months), [transactions, months]);
  const currentMonthTotal = monthlyTotals.find(m => m.month === currentMonth);

  const expenseTotals = useMemo(
    () => calculateCategoryTotals(currentMonthTransactions.filter(t => t.type === 'expense')),
    [currentMonthTransactions]
  );

  const handleAdd = async (data: TransactionFormData) => {
    await addTransaction(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            👋 Hola, {user?.displayName?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 capitalize">
            Resumen de {formatMonthYear(currentMonth + '-01')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Transacción</span>
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        currentMonthTotal={currentMonthTotal}
        transactionCount={currentMonthTransactions.length}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={expenseTotals} />
        <MonthlyChart data={monthlyTotals} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={transactions.slice(0, 5)} />

      {/* Form Modal */}
      {showForm && (
        <TransactionForm
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
