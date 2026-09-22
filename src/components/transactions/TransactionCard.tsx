import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getCategoryConfig, PAYMENT_METHODS, formatDate } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import type { Transaction } from '../../types';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const { formatCurrency, customCategories } = useSettings();
  const [showDetails, setShowDetails] = useState(false);
  const cat = getCategoryConfig(transaction.category, customCategories);
  const method = PAYMENT_METHODS[transaction.paymentMethod] || transaction.paymentMethod;
  const isIncome = transaction.type === 'income';
  const hasDetails = transaction.details && transaction.details.length > 0;

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${transaction.description}"?`)) {
      onDelete(transaction.id);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 p-4 group">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cat.color}`}>
          {cat.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                <span className="text-xs text-gray-400">{method}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{formatDate(transaction.date)}</span>
              </div>
            </div>
            <span className={`font-bold flex-shrink-0 text-lg ${isIncome ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasDetails && (
            <button onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          <button onClick={() => onEdit(transaction)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Details table */}
      {hasDetails && showDetails && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-3">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500">
                <th className="text-left pb-1 font-medium">Detalle</th>
                <th className="text-right pb-1 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transaction.details!.map((d, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-700/50">
                  <td className="py-1 text-gray-600 dark:text-gray-300">{d.detalle}</td>
                  <td className="py-1 text-right text-gray-700 dark:text-gray-200 font-medium">{formatCurrency(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
