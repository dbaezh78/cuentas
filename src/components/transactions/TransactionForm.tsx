import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS, getCurrentDate, getCategoryConfig } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import type { Transaction, TransactionFormData, PaymentMethod, TransactionType, TransactionDetail } from '../../types';

interface DetailRow {
  detalle: string;
  valor: string;
}

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

const emptyDetail = (): DetailRow => ({ detalle: '', valor: '' });

export default function TransactionForm({ onSubmit, onClose, editTransaction }: TransactionFormProps) {
  const { customCategories } = useSettings();
  const [loading, setLoading] = useState(false);
  const [transType, setTransType] = useState<TransactionType>('expense');
  const [form, setForm] = useState<Omit<TransactionFormData, 'details'>>({
    amount: 0,
    category: 'compras',
    description: '',
    date: getCurrentDate(),
    paymentMethod: 'cash',
    type: 'expense',
  });
  const [amountInput, setAmountInput] = useState<string>('');
  const [details, setDetails] = useState<DetailRow[]>([emptyDetail()]);

  useEffect(() => {
    if (editTransaction) {
      setTransType(editTransaction.type);
      setForm({
        amount: editTransaction.amount,
        category: editTransaction.category,
        description: editTransaction.description,
        date: editTransaction.date,
        paymentMethod: editTransaction.paymentMethod,
        type: editTransaction.type,
      });
      setAmountInput(editTransaction.amount.toString());
      if (editTransaction.details && editTransaction.details.length > 0) {
        setDetails([
          ...editTransaction.details.map(d => ({ detalle: d.detalle, valor: d.valor.toString() })),
          emptyDetail(),
        ]);
      } else {
        setDetails([emptyDetail()]);
      }
    }
  }, [editTransaction]);

  const handleTypeChange = (type: TransactionType) => {
    setTransType(type);
    const allCats = [
      ...Object.values(CATEGORIES),
      ...customCategories.map(c => getCategoryConfig(c.id, customCategories)),
    ];
    const defaultCat = allCats.find(c => c.type === type);
    setForm(prev => ({ ...prev, type, category: defaultCat?.id || (type === 'income' ? 'nomina' : 'compras') }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDetailChange = (index: number, field: keyof DetailRow, value: string) => {
    setDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const hasContent = updated[index].detalle.trim() || updated[index].valor;
      if (index === updated.length - 1 && hasContent) {
        updated.push(emptyDetail());
      }
      return updated;
    });
  };

  const removeDetail = (index: number) => {
    setDetails(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) return [emptyDetail()];
      const last = updated[updated.length - 1];
      if (last.detalle.trim() || last.valor) updated.push(emptyDetail());
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (!parsedAmount || parsedAmount <= 0) return;
    const parsedDetails: TransactionDetail[] = details
      .filter(d => d.detalle.trim())
      .map(d => ({ detalle: d.detalle.trim(), valor: parseFloat(d.valor) || 0 }));
    try {
      setLoading(true);
      await onSubmit({ ...form, amount: parsedAmount, type: transType, details: parsedDetails });
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build available categories: built-in + custom, filtered by type
  const builtInForType = Object.entries(CATEGORIES)
    .filter(([, cat]) => cat.type === transType);
  const customForType = customCategories
    .filter(c => c.type === transType)
    .map(c => [c.id, getCategoryConfig(c.id, customCategories)] as [string, ReturnType<typeof getCategoryConfig>]);
  const availableCategories = [...builtInForType, ...customForType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
            {editTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  transType === t ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}>
                {t === 'expense' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Monto *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 font-medium">$</span>
              <input type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)}
                placeholder="0.00" step="0.01" min="0.01" required
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción *</label>
            <input type="text" name="description" value={form.description} onChange={handleChange}
              placeholder="Ej. Gasolina, Salario..." required maxLength={200}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoría *</label>
            <select
              name="category"
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableCategories.map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Método de Pago *</label>
            <div className="flex gap-2">
              {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setForm(prev => ({ ...prev, paymentMethod: key }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${
                    form.paymentMethod === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Details table */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detalles <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300 w-full">Detalle</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Valor</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, index) => (
                    <tr key={index} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={row.detalle}
                          onChange={e => handleDetailChange(index, 'detalle', e.target.value)}
                          placeholder="Descripción..."
                          className="w-full px-2 py-1.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 rounded"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          value={row.valor}
                          onChange={e => handleDetailChange(index, 'valor', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          className="w-24 px-2 py-1.5 text-right bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 rounded"
                        />
                      </td>
                      <td className="px-2 py-1">
                        {(row.detalle || row.valor) && (
                          <button type="button" onClick={() => removeDetail(index)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Rellena la última fila para agregar un detalle nuevo automáticamente
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
              <Save size={16} />
              {loading ? 'Guardando...' : editTransaction ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
