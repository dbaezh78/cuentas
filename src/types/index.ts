export type CategoryKey =
  | 'combustible'
  | 'compras'
  | 'apartamento'
  | 'donaciones'
  | 'salud'
  | 'restaurantes'
  | 'transporte'
  | 'entretenimiento'
  | 'servicios'
  | 'otros';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Expense {
  id: string;
  amount: number;
  category: CategoryKey;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ExpenseFormData {
  amount: string;
  category: CategoryKey;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CategoryConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface MonthlyTotal {
  month: string; // 'YYYY-MM'
  label: string; // 'Sep 2026'
  total: number;
}

export interface CategoryTotal {
  category: CategoryKey;
  label: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  totalThisMonth: number;
  totalLastMonth: number;
  transactionCount: number;
  topCategory: CategoryTotal | null;
  categoryTotals: CategoryTotal[];
  monthlyTotals: MonthlyTotal[];
  recentExpenses: Expense[];
}

export interface FilterState {
  month: string; // 'YYYY-MM'
  category: CategoryKey | 'todas';
  search: string;
  paymentMethod: PaymentMethod | 'todos';
}
