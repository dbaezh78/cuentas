import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import {
  calculateCategoryTotals,
  calculateMonthlyTotals,
  getLast6Months,
  formatMonthYear,
  exportToCSV,
  getCategoryConfig,
} from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

export default function ReportsPage() {
  const { transactions } = useTransactions();
  const { formatCurrency, customCategories } = useSettings();
  const months = getLast6Months();
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = all months

  const monthlyTotals = useMemo(
    () => calculateMonthlyTotals(transactions, months),
    [transactions]
  );

  // For the selected month (or all)
  const filteredTx = useMemo(() =>
    selectedMonth ? transactions.filter(t => t.date.startsWith(selectedMonth)) : transactions,
    [transactions, selectedMonth]
  );

  const expenseTotals = useMemo(
    () => calculateCategoryTotals(filteredTx.filter(t => t.type === 'expense')),
    [filteredTx]
  );

  const income = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  // Balance for "all months" is the cumulative (last month's running balance)
  const balance = selectedMonth
    ? (monthlyTotals.find(m => m.month === selectedMonth)?.balance || income - expense)
    : (monthlyTotals[monthlyTotals.length - 1]?.balance || income - expense);

  const maxExpense = expenseTotals[0]?.total || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Análisis de tus finanzas</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todos los meses</option>
            {months.map(m => (
              <option key={m} value={m}>{formatMonthYear(m + '-01')}</option>
            ))}
          </select>
          <button
            onClick={() => exportToCSV(transactions, customCategories)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-2xl p-5">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(income)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-2xl p-5">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide mb-1">Gastos</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(expense)}</p>
        </div>
        <div className={`rounded-2xl p-5 border ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Expense by Category */}
      {expenseTotals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Gastos por Categoría</h2>
          <div className="space-y-3">
            {expenseTotals.map(item => {
              const cat = getCategoryConfig(item.category, customCategories);
              const pct = (item.total / maxExpense) * 100;
              return (
                <div key={item.category} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{cat?.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{cat?.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Historial de 6 Meses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 font-medium">Mes</th>
                <th className="pb-3 font-medium text-green-600">Ingresos</th>
                <th className="pb-3 font-medium text-red-600">Gastos</th>
                <th className="pb-3 font-medium text-blue-600">Balance</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTotals.map(m => (
                <tr key={m.month} className={`border-b border-gray-50 dark:border-gray-700 last:border-0 ${m.month === selectedMonth ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                  <td className="py-3 font-medium text-gray-900 dark:text-white capitalize">
                    {formatMonthYear(m.month + '-01')}
                  </td>
                  <td className="py-3 text-green-600">{formatCurrency(m.income)}</td>
                  <td className="py-3 text-red-600">{formatCurrency(m.expense)}</td>
                  <td className={`py-3 font-semibold ${m.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(m.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
