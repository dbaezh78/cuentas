import { useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useExpenses } from '../hooks/useExpenses';
import {
  calculateCategoryTotals,
  calculateMonthlyTotals,
  formatCurrency,
  formatMonthYear,
  exportToCSV,
  getCurrentMonth,
  getLast6Months,
} from '../lib/utils';

export default function ReportsPage() {
  const { expenses, loading } = useExpenses();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const months = getLast6Months();

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const categoryTotals = useMemo(
    () => calculateCategoryTotals(monthlyExpenses),
    [monthlyExpenses]
  );

  const monthlyTotals = useMemo(() => calculateMonthlyTotals(expenses), [expenses]);

  const totalSelected = monthlyExpenses.reduce((s, e) => s + e.amount, 0);

  // Calculate trend vs previous month
  const prevMonth = (() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  })();
  const prevTotal = expenses
    .filter((e) => e.date.startsWith(prevMonth))
    .reduce((s, e) => s + e.amount, 0);
  const trend = totalSelected - prevTotal;
  const trendPct = prevTotal > 0 ? (trend / prevTotal) * 100 : 0;

  const handleExport = () => {
    const filename = `gastos-${selectedMonth}.csv`;
    exportToCSV(monthlyExpenses, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis detallado de tus gastos</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Month selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Seleccionar mes</p>
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                selectedMonth === month
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {formatMonthYear(month)}
            </button>
          ))}
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total del mes</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSelected)}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">{formatMonthYear(selectedMonth)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">vs mes anterior</p>
          <p
            className={`text-2xl font-bold ${
              trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-900'
            }`}
          >
            {trend > 0 ? '+' : ''}{formatCurrency(trend)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {trend > 0 ? (
              <TrendingUp size={12} className="text-red-400" />
            ) : trend < 0 ? (
              <TrendingDown size={12} className="text-green-400" />
            ) : (
              <Minus size={12} className="text-gray-400" />
            )}
            <p className="text-xs text-gray-400">{trendPct.toFixed(1)}% de cambio</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Transacciones</p>
          <p className="text-2xl font-bold text-gray-900">{monthlyExpenses.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            Promedio: {formatCurrency(totalSelected / (monthlyExpenses.length || 1))}
          </p>
        </div>
      </div>

      {/* Category breakdown bar chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Desglose por Categoría</h3>
        {categoryTotals.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <p>Sin gastos en este mes</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={categoryTotals}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: '#4b5563' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Total']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {categoryTotals.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Comparación de los últimos 6 meses</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {monthlyTotals.map((m) => (
            <div
              key={m.month}
              onClick={() => setSelectedMonth(m.month)}
              className={`p-3 rounded-xl cursor-pointer transition-colors text-center ${
                m.month === selectedMonth
                  ? 'bg-blue-50 border-2 border-blue-300'
                  : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
              }`}
            >
              <p className="text-xs text-gray-500 capitalize mb-1">{m.label}</p>
              <p className="font-bold text-gray-900 text-sm">{formatCurrency(m.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
