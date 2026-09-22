export type CategoryKey = 
  // Gastos
  | 'combustible' 
  | 'compras' 
  | 'apartamento' 
  | 'donaciones' 
  | 'salud' 
  | 'restaurantes' 
  | 'transporte' 
  | 'entretenimiento' 
  | 'servicios'
  | 'otros'
  // Ingresos
  | 'nomina'
  | 'colateral';

export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  category: CategoryKey;
  description: string;
  date: string; // ISO string
  paymentMethod: PaymentMethod;
  type: TransactionType;
}

export type TransactionFormData = Omit<Transaction, 'id'>;

export interface CategoryConfig {
  id: CategoryKey;
  label: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryTotal {
  category: CategoryKey;
  total: number;
  count: number;
  type: TransactionType;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  lastMonthBalance: number;
  transactionCount: number;
  dailyAverageExpense: number;
}

export interface FilterState {
  month: string | null;
  category: CategoryKey | null;
  paymentMethod: PaymentMethod | null;
  type: TransactionType | null;
  search: string;
}
