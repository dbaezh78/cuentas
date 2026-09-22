import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CategoryConfig, CategoryKey, CustomCategory, Transaction, MonthlyTotal, CategoryTotal, PaymentMethod } from '../types';

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  // --- GASTOS ---
  combustible:    { id: 'combustible',    label: 'Combustible',    icon: '⛽', color: 'bg-orange-100 text-orange-600', type: 'expense' },
  compras:        { id: 'compras',        label: 'Compras',        icon: '🛒', color: 'bg-blue-100 text-blue-600',   type: 'expense' },
  apartamento:    { id: 'apartamento',    label: 'Apartamento',    icon: '🏠', color: 'bg-teal-100 text-teal-600',   type: 'expense' },
  donaciones:     { id: 'donaciones',     label: 'Donaciones',     icon: '🤲', color: 'bg-rose-100 text-rose-600',   type: 'expense' },
  salud:          { id: 'salud',          label: 'Salud',          icon: '💊', color: 'bg-red-100 text-red-600',     type: 'expense' },
  restaurantes:   { id: 'restaurantes',   label: 'Restaurantes',   icon: '🍽️', color: 'bg-yellow-100 text-yellow-600', type: 'expense' },
  transporte:     { id: 'transporte',     label: 'Transporte',     icon: '🚗', color: 'bg-indigo-100 text-indigo-600', type: 'expense' },
  entretenimiento:{ id: 'entretenimiento',label: 'Entretenimiento',icon: '🎬', color: 'bg-purple-100 text-purple-600', type: 'expense' },
  servicios:      { id: 'servicios',      label: 'Servicios',      icon: '💡', color: 'bg-cyan-100 text-cyan-600',   type: 'expense' },
  otros:          { id: 'otros',          label: 'Otros',          icon: '📦', color: 'bg-gray-100 text-gray-600',   type: 'expense' },
  // --- INGRESOS ---
  nomina:         { id: 'nomina',         label: 'Nómina',         icon: '💼', color: 'bg-emerald-100 text-emerald-600', type: 'income' },
  colateral:      { id: 'colateral',      label: 'Ingreso Colateral', icon: '📈', color: 'bg-green-100 text-green-600', type: 'income' },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

/** Looks up a category config from built-in or custom categories */
export function getCategoryConfig(categoryId: string, customCategories: CustomCategory[] = []): CategoryConfig {
  if (CATEGORIES[categoryId as CategoryKey]) {
    return CATEGORIES[categoryId as CategoryKey];
  }
  const custom = customCategories.find(c => c.id === categoryId);
  if (custom) {
    return {
      id: custom.id,
      label: custom.label,
      icon: custom.icon,
      color: custom.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
      type: custom.type,
    };
  }
  return { id: categoryId, label: categoryId, icon: '📦', color: 'bg-gray-100 text-gray-600', type: 'expense' };
}

export function formatCurrency(amount: number, locale = 'es-DO', currency = 'DOP'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "d 'de' MMMM, yyyy", { locale: es });
}

export function formatMonthYear(dateString: string): string {
  return format(parseISO(dateString), 'MMMM yyyy', { locale: es });
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getLast6Months(): string[] {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  return months;
}

export function calculateCategoryTotals(transactions: Transaction[]): CategoryTotal[] {
  const totals = transactions.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = { category: curr.category, total: 0, count: 0, type: curr.type };
    }
    acc[curr.category].total += curr.amount;
    acc[curr.category].count += 1;
    return acc;
  }, {} as Record<string, CategoryTotal>);
  return Object.values(totals).sort((a, b) => b.total - a.total);
}

/**
 * Calculates monthly totals with cumulative balance carry-over.
 * balance[month] = income[month] + balance[month-1] - expense[month]
 */
export function calculateMonthlyTotals(transactions: Transaction[], months: string[]): MonthlyTotal[] {
  let runningBalance = 0;
  return months.map(month => {
    const monthTx = transactions.filter(t => t.date.startsWith(month));
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income + runningBalance - expense;
    runningBalance = balance;
    return { month, income, expense, balance };
  });
}

export function exportToCSV(transactions: Transaction[], customCategories: CustomCategory[] = []) {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Método de Pago', 'Monto'];
  const rows = transactions.map(t => {
    const cat = getCategoryConfig(t.category, customCategories);
    return [
      format(parseISO(t.date), 'dd/MM/yyyy'),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      cat.label,
      `"${t.description.replace(/"/g, '""')}"`,
      PAYMENT_METHODS[t.paymentMethod] || t.paymentMethod,
      t.amount.toString(),
    ];
  });
  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `transacciones_${format(new Date(), 'yyyy-MM')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
