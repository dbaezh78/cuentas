import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { CATEGORIES, getCategoryConfig } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import type { TransactionFormData, PaymentMethod, TransactionType } from '../../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: TransactionFormData[]) => Promise<void>;
}

interface ParsedRow {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  valid: boolean;
  error?: string;
}

// Map common Spanish strings to our internal values
const TYPE_MAP: Record<string, TransactionType> = {
  'gasto': 'expense', 'gastos': 'expense', 'expense': 'expense', 'egreso': 'expense',
  'ingreso': 'income', 'ingresos': 'income', 'income': 'income',
};
const PAYMENT_MAP: Record<string, PaymentMethod> = {
  'efectivo': 'cash', 'cash': 'cash',
  'tarjeta': 'card', 'card': 'card', 'credito': 'card', 'debito': 'card',
  'transferencia': 'transfer', 'transfer': 'transfer', 'digital': 'transfer',
};
const ALL_CATEGORIES = Object.keys(CATEGORIES);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseDate(raw: string): string {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return raw;
}

function guessCategory(raw: string): string {
  const lower = raw.toLowerCase().trim();
  // Exact match
  if (ALL_CATEGORIES.includes(lower)) return lower;
  // Partial match
  const match = ALL_CATEGORIES.find(k => k.includes(lower) || lower.includes(k));
  if (match) return match;
  return 'otros';
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  
  // Detect header
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/\s+/g, '_'));
  
  const idx = (keys: string[]) => keys.reduce((f, k) => f >= 0 ? f : header.indexOf(k), -1);
  
  const iType    = idx(['tipo', 'type']);
  const iAmount  = idx(['monto', 'amount', 'valor', 'importe']);
  const iDesc    = idx(['descripcion', 'description', 'detalle']);
  const iCat     = idx(['categoria', 'category']);
  const iDate    = idx(['fecha', 'date']);
  const iPay     = idx(['metodo_pago', 'metodo', 'payment', 'forma_pago', 'payment_method']);
  
  return lines.slice(1).map((line, i) => {
    const cols = parseCsvLine(line);
    try {
      const rawType = iType >= 0 ? cols[iType] : 'gasto';
      const rawAmount = iAmount >= 0 ? cols[iAmount] : '';
      const rawDesc = iDesc >= 0 ? cols[iDesc] : '';
      const rawCat = iCat >= 0 ? cols[iCat] : '';
      const rawDate = iDate >= 0 ? cols[iDate] : '';
      const rawPay = iPay >= 0 ? cols[iPay] : 'efectivo';

      const type = TYPE_MAP[rawType.toLowerCase()] || 'expense';
      const amount = parseFloat(rawAmount.replace(/,/g, ''));
      const date = parseDate(rawDate);
      const category = guessCategory(rawCat);
      const paymentMethod = PAYMENT_MAP[rawPay.toLowerCase()] || 'cash';

      if (!rawDesc.trim()) return { type, amount, description: '', category, date, paymentMethod, valid: false, error: `Fila ${i + 2}: descripción vacía` };
      if (isNaN(amount) || amount <= 0) return { type, amount: 0, description: rawDesc, category, date, paymentMethod, valid: false, error: `Fila ${i + 2}: monto inválido "${rawAmount}"` };
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return { type, amount, description: rawDesc, category, date: rawDate, paymentMethod, valid: false, error: `Fila ${i + 2}: fecha inválida "${rawDate}"` };

      return { type, amount, description: rawDesc.trim(), category, date, paymentMethod, valid: true };
    } catch {
      return { type: 'expense', amount: 0, description: '', category: 'otros', date: '', paymentMethod: 'cash', valid: false, error: `Fila ${i + 2}: error al parsear` };
    }
  });
}

export default function ImportModal({ onClose, onImport }: ImportModalProps) {
  const { customCategories, formatCurrency } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentDesc: '' });
  const [done, setDone] = useState<{ ok: number; fail: number } | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setDone(null);
      setProgress({ current: 0, total: 0, currentDesc: '' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (!valid.length) return;
    setImporting(true);
    setProgress({ current: 0, total: valid.length, currentDesc: '' });
    let ok = 0; let fail = 0;
    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      setProgress({ current: i + 1, total: valid.length, currentDesc: row.description });
      try {
        await onImport([{ type: row.type, amount: row.amount, description: row.description, category: row.category, date: row.date, paymentMethod: row.paymentMethod, details: [] }]);
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    setDone({ ok, fail });
  };

  const downloadTemplate = () => {
    const csv = `Tipo,Monto,Descripcion,Categoria,Fecha,MetodoPago\nGasto,1500.00,Gasolina,combustible,2026-10-01,Efectivo\nIngreso,50000.00,Salario,nomina,2026-10-01,Transferencia\nGasto,3200.00,Supermercado,compras,2026-10-01,Tarjeta`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plantilla_importar.csv';
    a.click();
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">📥 Importar CSV</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">¿No tienes el formato? Descarga la plantilla.</p>
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline">
              <Download size={14} /> Plantilla CSV
            </button>
          </div>

          {/* Format reference */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 font-mono leading-relaxed">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1 font-sans">Columnas aceptadas:</p>
            <p>Tipo → <span className="text-blue-600">Gasto</span> o <span className="text-green-600">Ingreso</span></p>
            <p>Categoría → combustible, compras, salud, nomina, etc.</p>
            <p>MetodoPago → <span className="text-purple-600">Efectivo / Tarjeta / Transferencia</span></p>
            <p>Fecha → <span className="text-orange-600">YYYY-MM-DD</span> o <span className="text-orange-600">DD/MM/YYYY</span></p>
          </div>

          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Upload size={32} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">{fileName || 'Clic para seleccionar archivo CSV'}</p>
            <p className="text-xs text-gray-400 mt-1">Formato .csv — codificación UTF-8</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Preview */}
          {rows.length > 0 && !done && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {rows.length} filas detectadas
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                  ✓ {validRows.length} válidas
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                    ✗ {invalidRows.length} con errores
                  </span>
                )}
              </div>

              {/* Valid rows preview table */}
              {validRows.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Tipo</th>
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Descripción</th>
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Categoría</th>
                          <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">Monto</th>
                          <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, 20).map((row, i) => {
                          const cat = getCategoryConfig(row.category, customCategories);
                          return (
                            <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {row.type === 'income' ? 'Ingreso' : 'Gasto'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-200 truncate max-w-[140px]">{row.description}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{cat.icon} {cat.label}</td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(row.amount)}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{row.date}</td>
                            </tr>
                          );
                        })}
                        {validRows.length > 20 && (
                          <tr className="border-t border-gray-100 dark:border-gray-700">
                            <td colSpan={5} className="px-3 py-2 text-center text-gray-400 text-xs">...y {validRows.length - 20} más</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {invalidRows.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Filas con errores (no se importarán):</p>
                  {invalidRows.map((r, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400 pl-4">{r.error}</p>)}
                </div>
              )}

              {/* Progress bar — shown while importing */}
              {importing && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      Importando transacciones...
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  {/* Progress bar track */}
                  <div className="w-full h-3 bg-blue-100 dark:bg-blue-900/60 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  {/* Current item */}
                  <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                    ⏳ {progress.currentDesc || '...'}
                  </p>
                  {/* Percentage */}
                  <p className="text-xs text-center text-blue-500 dark:text-blue-400 font-medium">
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}% completado
                  </p>
                </div>
              )}

              {/* Import button — only shown before importing */}
              {!importing && (
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
                >
                  <Upload size={16} />
                  {`Importar ${validRows.length} transacciones`}
                </button>
              )}
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">¡Importación completada!</p>
              <p className="text-gray-500 dark:text-gray-400">
                <span className="text-green-600 font-semibold">{done.ok} importadas</span>
                {done.fail > 0 && <span className="text-red-600 font-semibold ml-3">{done.fail} fallidas</span>}
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
