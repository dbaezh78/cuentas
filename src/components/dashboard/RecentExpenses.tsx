import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORIES, formatCurrency, formatDate } from '../../lib/utils';
import type { Expense } from '../../types';

interface RecentExpensesProps {
  expenses: Expense[];
}

export default function RecentExpenses({ expenses }: RecentExpensesProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Últimos Gastos</h3>
        <Link
          to="/gastos"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver todos <ArrowRight size={16} />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400">
          <p className="text-2xl mb-2">💸</p>
          <p className="text-sm">No hay gastos registrados</p>
          <p className="text-xs mt-1">¡Agrega tu primer gasto!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {expenses.map((expense) => {
            const cat = CATEGORIES[expense.category];
            return (
              <div
                key={expense.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cat.bgColor }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                  <p className="text-xs text-gray-400">
                    {cat.label} · {formatDate(expense.date)}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
