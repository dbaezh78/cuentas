import { Pencil, Trash2 } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS, formatDate } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import type { Transaction } from '../../types';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const { formatCurrency } = useSettings();
  const cat = CATEGORIES[transaction.category];
  const method = PAYMENT_METHODS[transaction.paymentMethod];
  const isIncome = transaction.type === 'income';

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${transaction.description}"?`)) {
      onDelete(transaction.id);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cat.color}`}>
        {cat.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                {cat.label}
              </span>
              <span className="text-xs text-gray-400">{method}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{formatDate(transaction.date)}</span>
            </div>
          </div>
          <span className={`font-bold flex-shrink-0 text-lg ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(transaction)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Pencil size={15} />
        </button>
        <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
