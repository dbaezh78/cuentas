import { Pencil, Trash2 } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS, formatCurrency, formatDate } from '../../lib/utils';
import type { Expense } from '../../types';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const cat = CATEGORIES[expense.category];
  const method = PAYMENT_METHODS[expense.paymentMethod];

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${expense.description}"?`)) {
      onDelete(expense.id);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow group">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: cat.bgColor }}
      >
        {cat.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{expense.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: cat.bgColor, color: cat.color }}
              >
                {cat.label}
              </span>
              <span className="text-xs text-gray-400">{method.icon} {method.label}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
            </div>
            {expense.notes && (
              <p className="text-xs text-gray-400 mt-1 truncate">{expense.notes}</p>
            )}
          </div>
          <span className="font-bold text-gray-900 flex-shrink-0 text-lg">
            {formatCurrency(expense.amount)}
          </span>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(expense)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
