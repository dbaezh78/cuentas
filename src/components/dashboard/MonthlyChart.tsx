import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MonthlyTotal } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';

interface MonthlyChartProps {
  data: MonthlyTotal[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const { formatCurrency } = useSettings();

  const chartData = data.map(item => ({
    ...item,
    name: format(parseISO(item.month + '-01'), 'MMM', { locale: es }),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Últimos 6 Meses</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barGap={4}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `${v}`} width={50} />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'income' ? 'Ingresos' : 'Gastos'
            ]}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Legend formatter={(value) => value === 'income' ? 'Ingresos' : 'Gastos'} />
          <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
