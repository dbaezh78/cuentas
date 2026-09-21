import { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import ExpenseCard from './ExpenseCard';
import { CATEGORIES, getCurrentMonth } from '../../lib/utils';
import type { Expense, CategoryKey, PaymentMethod } from '../../types';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'todas'>('todas');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchMonth = selectedMonth === '' || e.date.startsWith(selectedMonth);
      const matchCat = selectedCategory === 'todas' || e.category === selectedCategory;
      const matchSearch =
        search === '' ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.notes?.toLowerCase().includes(search.toLowerCase());
      const matchPayment = selectedPayment === 'todos' || e.paymentMethod === selectedPayment;
      return matchMonth && matchCat && matchSearch && matchPayment;
    });
  }, [expenses, search, selectedCategory, selectedMonth, selectedPayment]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('todas');
    setSelectedMonth(getCurrentMonth());
    setSelectedPayment('todos');
  };

  const hasActiveFilters =
    selectedCategory !== 'todas' || selectedPayment !== 'todos' || search !== '';

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar gastos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Filter size={16} />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('todas')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === 'todas'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(
                ([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === key
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={
                      selectedCategory === key
                        ? { backgroundColor: cat.color }
                        : undefined
                    }
                  >
                    {cat.icon} {cat.label}
                  </button>
                )
              )}
            </div>

            {/* Payment methods */}
            <div className="flex gap-2">
              {(['todos', 'efectivo', 'tarjeta', 'transferencia'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPayment(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                    selectedPayment === p
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p === 'todos' ? 'Todos los métodos' : p}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
              >
                <X size={12} /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          {filtered.length} gasto{filtered.length !== 1 ? 's' : ''}
        </p>
        <p className="text-sm font-semibold text-gray-900">
          Total: ${total.toFixed(2)}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">No se encontraron gastos</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
