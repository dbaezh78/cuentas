import { TrendingUp, TrendingDown, Receipt, Wallet } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyTotal } from '../../types';

interface SummaryCardsProps {
  currentMonthTotal: MonthlyTotal | undefined;
  transactionCount: number;
}

export default function SummaryCards({
  currentMonthTotal,
  transactionCount,
}: SummaryCardsProps) {
  const income = currentMonthTotal?.income || 0;
  const expense = currentMonthTotal?.expense || 0;
  const balance = currentMonthTotal?.balance || 0;

  const cards = [
    { title: 'Balance', value: formatCurrency(balance), subtitle: 'Residuo disponible', icon: Wallet, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { title: 'Total Ingresos', value: formatCurrency(income), subtitle: 'Este mes', icon: TrendingUp, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { title: 'Total Gastos', value: formatCurrency(expense), subtitle: 'Este mes', icon: TrendingDown, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { title: 'Transacciones', value: transactionCount.toString(), subtitle: 'Movimientos', icon: Receipt, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${card.iconBg}`}><card.icon size={20} className={card.iconColor} /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
          <p className="text-sm text-gray-500">{card.title}</p>
          <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
