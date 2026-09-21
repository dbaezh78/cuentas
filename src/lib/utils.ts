import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CategoryKey, CategoryConfig, Expense, MonthlyTotal, CategoryTotal } from '../types';

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  combustible: { label: 'Combustible', icon: '⛽', color: '#F97316', bgColor: '#FFF7ED' },
  compras: { label: 'Compras', icon: '🛒', color: '#3B82F6', bgColor: '#EFF6FF' },
  apartamento: { label: 'Apartamento', icon: '🏠', color: '#8B5CF6', bgColor: '#F5F3FF' },
  donaciones: { label: 'Donaciones', icon: '🤲', color: '#EC4899', bgColor: '#FDF2F8' },
  salud: { label: 'Salud', icon: '💊', color: '#EF4444', bgColor: '#FEF2F2' },
  restaurantes: { label: 'Restaurantes', icon: '🍽️', color: '#EAB308', bgColor: '#FEFCE8' },
  transporte: { label: 'Transporte', icon: '🚗', color: '#06B6D4', bgColor: '#ECFEFF' },
  entretenimiento: { label: 'Entretenimiento', icon: '🎬', color: '#6366F1', bgColor: '#EEF2FF' },
  servicios: { label: 'Servicios', icon: '💡', color: '#22C55E', bgColor: '#F0FDF4' },
  otros: { label: 'Otros', icon: '📦', color: '#6B7280', bgColor: '#F9FAFB' },
};

export const PAYMENT_METHODS = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  tarjeta: { label: 'Tarjeta', icon: '💳' },
  transferencia: { label: 'Transferencia', icon: '📱' },
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(dateStr: string): string {
  try {
    return format(parseISO(dateStr + '-01'), 'MMMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getMonthRange(yearMonth: string): { start: Date; end: Date } {
  const date = parseISO(yearMonth + '-01');
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  return months;
}

export function calculateCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grouped: Partial<Record<CategoryKey, { total: number; count: number }>> = {};

  expenses.forEach((expense) => {
    if (!grouped[expense.category]) {
      grouped[expense.category] = { total: 0, count: 0 };
    }
    grouped[expense.category]!.total += expense.amount;
    grouped[expense.category]!.count += 1;
  });

  return Object.entries(grouped)
    .map(([key, data]) => {
      const cat = CATEGORIES[key as CategoryKey];
      return {
        category: key as CategoryKey,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        total: data!.total,
        count: data!.count,
        percentage: totalAmount > 0 ? (data!.total / totalAmount) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function calculateMonthlyTotals(expenses: Expense[]): MonthlyTotal[] {
  const months = getLast6Months();
  return months.map((month) => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      month,
      label: format(parseISO(month + '-01'), 'MMM yy', { locale: es }),
      total,
    };
  });
}

export function exportToCSV(expenses: Expense[], filename = 'gastos.csv'): void {
  const headers = ['Fecha', 'Descripción', 'Categoría', 'Monto', 'Método de Pago', 'Notas'];
  const rows = expenses.map((e) => [
    e.date,
    e.description,
    CATEGORIES[e.category].label,
    e.amount.toFixed(2),
    PAYMENT_METHODS[e.paymentMethod].label,
    e.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
