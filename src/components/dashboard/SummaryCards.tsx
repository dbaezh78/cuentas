import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowDownLeft } from 'lucide-react';
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
  const carryover = currentMonthTotal?.carryover || 0;

  // Total income including carryover from previous month
  const totalIncome = income + carryover;

  const cards = [
    {
      title: 'Balance',
      value: formatCurrency(balance),
      subtitle: 'Balance acumulado',
      icon: Wallet,
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-600 dark:text-orange-400',
      badge: null,
    },
    {
      title: 'Ingresos',
      value: formatCurrency(totalIncome),
      subtitle: carryover > 0 ? `RD$${income.toLocaleString('es-DO')} propios + arrastre` : 'Este mes',
      icon: TrendingUp,
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-gray-900 dark:text-white',
      badge: carryover > 0 ? { label: `+${formatCurrency(carryover)} mes ant.`, color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' } : null,
    },
    {
      title: 'Gastos',
      value: formatCurrency(expense),
      subtitle: 'Este mes',
      icon: TrendingDown,
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-gray-900 dark:text-white',
      badge: null,
    },
    {
      title: 'Transacciones',
      value: transactionCount.toString(),
      subtitle: 'Movimientos del mes',
      icon: Receipt,
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      textColor: 'text-gray-900 dark:text-white',
      badge: null,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Carryover banner — shown when previous month had positive balance */}
      {carryover > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
          <ArrowDownLeft size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">{formatCurrency(carryover)}</span> arrastrado del mes anterior como ingreso disponible
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
              {card.badge && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.badge.color}`}>
                  {card.badge.label}
                </span>
              )}
            </div>
            <p className={`text-2xl font-bold mb-1 ${card.textColor}`}>{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
