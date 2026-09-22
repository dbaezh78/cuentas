import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import TransactionCard from '../transactions/TransactionCard';
import type { Transaction } from '../../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Últimos Movimientos</h2>
        <Link
          to="/transacciones"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver todos
          <ArrowRight size={14} />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">Sin movimientos este mes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
