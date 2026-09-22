import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS, getCurrentDate } from '../../lib/utils';
import type { Transaction, TransactionFormData, CategoryKey, PaymentMethod, TransactionType } from '../../types';

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export default function TransactionForm({ onSubmit, onClose, editTransaction }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TransactionFormData>({
    amount: 0,
    category: 'compras',
    description: '',
    date: getCurrentDate(),
    paymentMethod: 'cash',
    type: 'expense'
  });
  const [amountInput, setAmountInput] = useState<string>('');

  useEffect(() => {
    if (editTransaction) {
      setForm({
        amount: editTransaction.amount,
        category: editTransaction.category,
        description: editTransaction.description,
        date: editTransaction.date,
        paymentMethod: editTransaction.paymentMethod,
        type: editTransaction.type,
      });
      setAmountInput(editTransaction.amount.toString());
    } else {
      const defaultCat = Object.keys(CATEGORIES).find(k => CATEGORIES[k as CategoryKey].type === form.type) as CategoryKey;
      setForm(prev => ({ ...prev, category: defaultCat }));
    }
  }, [editTransaction]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTypeChange = (type: TransactionType) => {
    const defaultCat = Object.keys(CATEGORIES).find(k => CATEGORIES[k as CategoryKey].type === type) as CategoryKey;
    setForm(prev => ({ ...prev, type, category: defaultCat }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (!parsedAmount || parsedAmount <= 0) return;
    try {
      setLoading(true);
      await onSubmit({ ...form, amount: parsedAmount });
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = Object.entries(CATEGORIES).filter(([, cat]) => cat.type === form.type) as [CategoryKey, typeof CATEGORIES[CategoryKey]][];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">
            {editTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                form.type === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                form.type === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 font-medium">$</span>
              <input type="number" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" step="0.01" min="0.01" required className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción *</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} placeholder="Ej. Gasolina, Salario..." required maxLength={200} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría *</label>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map(([key, cat]) => (
                <button key={key} type="button" onClick={() => setForm((prev) => ({ ...prev, category: key as CategoryKey }))} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${form.category === key ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de Pago *</label>
            <div className="flex gap-2">
              {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setForm((prev) => ({ ...prev, paymentMethod: key as PaymentMethod }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${form.paymentMethod === key ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
              <Save size={16} />
              {loading ? 'Guardando...' : editTransaction ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
