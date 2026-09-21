import { TrendingUp, TrendingDown, Receipt, Wallet } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface SummaryCardsProps {
  totalThisMonth: number;
  totalLastMonth: number;
  transactionCount: number;
  budget?: number;
}

export default function SummaryCards({
  totalThisMonth,
  totalLastMonth,
  transactionCount,
  budget = 0,
}: SummaryCardsProps) {
  const diff = totalThisMonth - totalLastMonth;
  const diffPct = totalLastMonth > 0 ? (diff / totalLastMonth) * 100 : 0;
  const isUp = diff > 0;
  const remaining = budget > 0 ? budget - totalThisMonth : null;

  const cards = [
    {
      title: 'Total este mes',
      value: formatCurrency(totalThisMonth),
      subtitle:
        totalLastMonth > 0
          ? `${isUp ? '+' : ''}${diffPct.toFixed(1)}% vs mes anterior`
          : 'Sin datos del mes anterior',
      icon: Wallet,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: diff !== 0 ? (isUp ? 'up' : 'down') : null,
    },
    {
      title: 'Mes anterior',
      value: formatCurrency(totalLastMonth),
      subtitle: 'Gasto total registrado',
      icon: TrendingDown,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      trend: null,
    },
    {
      title: 'Transacciones',
      value: transactionCount.toString(),
      subtitle: 'Gastos este mes',
      icon: Receipt,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      trend: null,
    },
    {
      title: remaining !== null ? 'Presupuesto restante' : 'Promedio diario',
      value:
        remaining !== null
          ? formatCurrency(Math.max(0, remaining))
          : formatCurrency(totalThisMonth / (new Date().getDate() || 1)),
      subtitle: remaining !== null
        ? remaining < 0
          ? '⚠️ Presupuesto excedido'
          : `de ${formatCurrency(budget)} presupuestado`
        : 'Por día en este mes',
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
              <card.icon size={20} className={card.iconColor} />
            </div>
            {card.trend && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  card.trend === 'up'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-600'
                }`}
              >
                {card.trend === 'up' ? '↑' : '↓'} {Math.abs(diffPct).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
          <p className="text-sm text-gray-500">{card.title}</p>
          <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
