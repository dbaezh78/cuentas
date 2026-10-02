import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../contexts/SettingsContext';
import { getCategoryConfig, formatDate, formatMonthYear, CATEGORIES } from '../lib/utils';

export default function ContabilidadPage() {
  const { transactions } = useTransactions();
  const { formatCurrency, customCategories } = useSettings();

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState(''); // '', 'income', 'expense'

  // All months with transactions (newest first for dropdown)
  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [transactions]);

  // All categories that appear in transactions
  const allCategories = useMemo(() => {
    const used = new Set(transactions.map(t => t.category));
    const built = Object.entries(CATEGORIES)
      .filter(([key]) => used.has(key))
      .map(([key, cat]) => ({ value: key, label: cat.label, icon: cat.icon }));
    const custom = customCategories
      .filter(c => used.has(c.id))
      .map(c => ({ value: c.id, label: c.label, icon: c.icon }));
    return [...built, ...custom].sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions, customCategories]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions
      .filter(t => !selectedMonth || t.date.startsWith(selectedMonth))
      .filter(t => !selectedCategory || t.category === selectedCategory)
      .filter(t => !selectedType || t.type === selectedType)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedMonth, selectedCategory, selectedType]);

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
          <BookOpen size={22} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contabilidad</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {filtered.length} transacciones
            {selectedMonth ? ` — ${formatMonthYear(selectedMonth + '-01')}` : ' — Todos los meses'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Month */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Mes</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los meses</option>
              {months.map(m => (
                <option key={m} value={m}>{formatMonthYear(m + '-01')}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Categoría</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las categorías</option>
              {allCategories.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tipo</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
        </div>

        {/* Clear filters */}
        {(selectedMonth || selectedCategory || selectedType) && (
          <button
            onClick={() => { setSelectedMonth(''); setSelectedCategory(''); setSelectedType(''); }}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            × Limpiar filtros
          </button>
        )}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide mb-1">Gastos</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Balance</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 dark:text-gray-400">No hay transacciones con esos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Descripción</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categoría</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const cat = getCategoryConfig(t.category, customCategories);
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}
                    >
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white font-medium max-w-[200px] truncate">
                        {t.description}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        }`}>
                          {t.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${
                        t.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total ({filtered.length} transacciones)
                  </td>
                  <td className={`px-5 py-3 text-right font-bold text-base ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {formatCurrency(balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
