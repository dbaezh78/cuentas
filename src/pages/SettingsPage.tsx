import { useState } from 'react';
import { Sun, Moon, Globe, Save, CheckCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useSettings, CURRENCIES } from '../contexts/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { refetch } = useTransactions();
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [localCurrency, setLocalCurrency] = useState(settings.currencyCode);
  const [localDark, setLocalDark] = useState(settings.darkMode);

  const handleSave = async () => {
    await updateSettings({ currencyCode: localCurrency, darkMode: localDark });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Apply dark mode immediately when toggled (preview before saving)
  const handleDarkToggle = () => {
    const next = !localDark;
    setLocalDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2500);
  };

  const handleReloadApp = async () => {
    setReloading(true);
    // Clear browser caches (service worker caches if any)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    // Small delay so the user sees the spinner
    setTimeout(() => {
      window.location.reload();
    }, 500);
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

      {/* Currency */}
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

      {/* Dark Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {localDark
                ? <Moon size={20} className="text-slate-600 dark:text-slate-300" />
                : <Sun size={20} className="text-yellow-500" />}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Modo Oscuro</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {localDark ? 'Interfaz en modo oscuro' : 'Interfaz en modo claro'}
              </p>
            </div>
          </div>
          {/* Toggle — applies immediately */}
          <button
            onClick={handleDarkToggle}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              localDark ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              localDark ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          💡 El cambio se aplica de inmediato. Haz clic en <strong>Guardar Cambios</strong> para que persista al recargar.
        </p>
      </div>

      {/* Refresh Data */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
            <RefreshCw size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Actualizar Datos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recarga las transacciones desde Firebase sin borrar datos
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
            refreshed
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
          }`}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando...' : refreshed ? '¡Datos actualizados!' : 'Actualizar desde Firebase'}
        </button>
      </div>

      {/* Reload App (clear cache) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
            <RotateCcw size={20} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Recargar Aplicación</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Limpia la caché del navegador y carga la versión más reciente
            </p>
          </div>
        </div>
        <button
          onClick={handleReloadApp}
          disabled={reloading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 rounded-xl font-medium transition-all"
        >
          <RotateCcw size={16} className={reloading ? 'animate-spin' : ''} />
          {reloading ? 'Recargando...' : 'Recargar y limpiar caché'}
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
          saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saved ? (
          <><CheckCircle size={18} /> ¡Guardado!</>
        ) : (
          <><Save size={18} /> Guardar Cambios</>
        )}
      </button>
    </div>
  );
}
