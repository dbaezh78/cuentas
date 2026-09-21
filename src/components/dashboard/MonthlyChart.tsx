import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyTotal } from '../../types';

interface MonthlyChartProps {
  data: MonthlyTotal[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Historial Mensual</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Total']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar
            dataKey="total"
            fill="#3B82F6"
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Stats below */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">Máximo: <span className="font-semibold text-gray-900">{formatCurrency(max)}</span></span>
        <span className="text-gray-500">
          Promedio:{' '}
          <span className="font-semibold text-gray-900">
            {formatCurrency(data.reduce((s, d) => s + d.total, 0) / (data.filter((d) => d.total > 0).length || 1))}
          </span>
        </span>
      </div>
    </div>
  );
}
