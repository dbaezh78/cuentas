import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import type { MonthlyTotal } from '../../types';

interface SummaryCardsProps {
  currentMonthTotal: MonthlyTotal | undefined;
  transactionCount: number;
}

export default function SummaryCards({ currentMonthTotal, transactionCount }: SummaryCardsProps) {
  const { formatCurrency } = useSettings();
  const income = currentMonthTotal?.income || 0;
  const expense = currentMonthTotal?.expense || 0;
  const balance = currentMonthTotal?.balance || 0;

  const cards = [
    { title: 'Balance', value: formatCurrency(balance), subtitle: 'Balance acumulado', icon: Wallet, iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', textColor: balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-600 dark:text-orange-400' },
    { title: 'Ingresos', value: formatCurrency(income), subtitle: 'Este mes', icon: TrendingUp, iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400', textColor: 'text-gray-900 dark:text-white' },
    { title: 'Gastos', value: formatCurrency(expense), subtitle: 'Este mes', icon: TrendingDown, iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400', textColor: 'text-gray-900 dark:text-white' },
    { title: 'Transacciones', value: transactionCount.toString(), subtitle: 'Movimientos del mes', icon: Receipt, iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400', textColor: 'text-gray-900 dark:text-white' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
              <card.icon size={20} className={card.iconColor} />
            </div>
          </div>
          <p className={`text-2xl font-bold mb-1 ${card.textColor}`}>{card.value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
