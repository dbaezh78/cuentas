export type CategoryKey = 
  | 'combustible' | 'compras' | 'apartamento' | 'donaciones' | 'salud' 
  | 'restaurantes' | 'transporte' | 'entretenimiento' | 'servicios' | 'otros'
  | 'nomina' | 'colateral';

export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type TransactionType = 'income' | 'expense';

export interface TransactionDetail {
  detalle: string;
  valor: number;
}

export interface CustomCategory {
  id: string;
  label: string;
  icon: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string; // string allows both CategoryKey and custom category ids
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  type: TransactionType;
  details?: TransactionDetail[];
  _sourceCollection?: 'expenses' | 'transactions'; // in-memory only, never saved to Firestore
}

export type TransactionFormData = Omit<Transaction, 'id' | '_sourceCollection'>;

export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
  balance: number; // cumulative (carries over from previous month)
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  type: TransactionType;
}

export interface FilterState {
  month: string | null;
  category: string | null;
  paymentMethod: PaymentMethod | null;
  type: TransactionType | null;
  search: string;
}
