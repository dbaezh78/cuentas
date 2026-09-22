import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getCategoryConfig } from '../../lib/utils';
import type { CategoryTotal } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

interface CategoryChartProps {
  data: CategoryTotal[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const { formatCurrency, customCategories } = useSettings();
  const top5 = data.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex items-center justify-center h-64">
        <p className="text-gray-400 dark:text-gray-500 text-sm">Sin datos este mes</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Gastos por Categoría</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={top5}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {top5.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {top5.map((item, index) => {
          const cat = getCategoryConfig(item.category, customCategories);
          return (
            <div key={item.category} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="flex-1 text-gray-600 dark:text-gray-300 truncate">
                {cat?.icon} {cat?.label}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
