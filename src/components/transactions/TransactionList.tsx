import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import TransactionCard from './TransactionCard';
import { getCategoryConfig, CATEGORIES } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import type { Transaction, PaymentMethod, TransactionType } from '../../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const { customCategories } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | ''>('');

  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (selectedMonth && !t.date.startsWith(selectedMonth)) return false;
      if (selectedType && t.type !== selectedType) return false;
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (selectedPayment && t.paymentMethod !== selectedPayment) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, selectedMonth, selectedType, selectedCategory, selectedPayment, search]);

  const allCategories = [
    ...Object.entries(CATEGORIES),
    ...customCategories.map(c => [c.id, getCategoryConfig(c.id, customCategories)] as const),
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        {/* Search with X button */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Todos los meses</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select value={selectedType} onChange={e => setSelectedType(e.target.value as TransactionType | '')}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Tipo</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>

          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Categoría</option>
            {allCategories.map(([k, cat]) => (
              <option key={k} value={k}>{cat.icon} {cat.label}</option>
            ))}
          </select>

          <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value as PaymentMethod | '')}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Método</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {transactions.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
          Mostrando {filtered.length} de {transactions.length} transacciones
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Sin transacciones</p>
          <p className="text-sm mt-1">Agrega tu primer ingreso o gasto</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <TransactionCard key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
