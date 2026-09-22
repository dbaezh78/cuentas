import { useState } from 'react';
import { Sun, Moon, Globe, Save, CheckCircle } from 'lucide-react';
import { useSettings, CURRENCIES } from '../contexts/SettingsContext';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [saved, setSaved] = useState(false);
  const [localCurrency, setLocalCurrency] = useState(settings.currencyCode);
  const [localDark, setLocalDark] = useState(settings.darkMode);

  const handleSave = async () => {
    await updateSettings({ currencyCode: localCurrency, darkMode: localDark });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Ajustes</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Personaliza la aplicación según tus preferencias
        </p>
      </div>

      {/* Currency Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Moneda</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona la moneda para mostrar los montos</p>
          </div>
        </div>
        <select
          value={localCurrency}
          onChange={(e) => setLocalCurrency(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} — {c.label} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Dark Mode Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {localDark ? (
                <Moon size={20} className="text-slate-600 dark:text-slate-300" />
              ) : (
                <Sun size={20} className="text-yellow-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Modo Oscuro</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {localDark ? 'Interfaz en modo oscuro' : 'Interfaz en modo claro'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocalDark(!localDark)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              localDark ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                localDark ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saved ? (
          <>
            <CheckCircle size={18} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={18} />
            Guardar Cambios
          </>
        )}
      </button>
    </div>
  );
}
