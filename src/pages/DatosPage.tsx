import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { CATEGORIES } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import type { TransactionType } from '../types';

const EMOJI_LIST = [
  // Finanzas
  '💰','💵','💶','💷','💴','💳','🏧','📈','📉','💹','💱','💲','🪙','💸',
  // Comida y bebida
  '🍽️','🍔','🍕','🌮','🌯','🍜','🥗','🍣','🍰','☕','🍺','🥤','🧃','🛒',
  // Transporte
  '🚗','🚕','🚌','✈️','🚂','🛵','🚲','⛽','🚙','🏎️','🛳️','🚁',
  // Salud y bienestar
  '💊','🏥','🩺','💉','🧘','🏋️','🏃','🦷','👓','🩹',
  // Hogar
  '🏠','🏡','🛋️','🔧','💡','🛁','🪴','🏗️','🔑','🚿','🛏️',
  // Entretenimiento
  '🎬','🎮','🎵','🎲','🎭','📚','🎨','🎸','🎤','🎧','🎯','⚽','🏊',
  // Trabajo y negocios
  '💼','📊','💻','🖥️','📝','📋','✏️','🏢','📞','🖨️','🗂️',
  // Familia y personas
  '👨‍👩‍👧','🧸','🎒','📚','🎠','🐶','🐱','🐾',
  // Varios
  '📦','🎁','🤲','💝','🌐','⚡','📌','🔔','🌟','❤️','🔐','🏆','🗺','🕟',
  //Lugares
  '🏛','','🗽','💈','🎢','🌉','🏖️','☂',
  //Religion
  '⛪','🕌',
];

export default function DatosPage() {
  const { customCategories, addCustomCategory, deleteCustomCategory } = useSettings();
  const [icon, setIcon] = useState('📦');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const builtIn = Object.values(CATEGORIES);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    await addCustomCategory({ label: label.trim(), icon, type });
    setLabel('');
    setIcon('📦');
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🗂️ Datos — Categorías</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Gestiona las categorías disponibles en tus transacciones
        </p>
      </div>

      {/* Add custom category form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">➕ Nueva Categoría</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icono</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowPicker(!showPicker)}
                className="w-14 h-14 text-3xl bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-2 border-transparent hover:border-blue-400">
                {icon}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {showPicker ? 'Clic en un emoji para seleccionarlo' : 'Clic para elegir un icono'}
              </span>
            </div>

            {showPicker && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex flex-wrap gap-2">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setIcon(emoji); setShowPicker(false); }}
                      className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 transition-colors ${
                        icon === emoji ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de Categoría *</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Ej. Mascotas, Ropa, Seguros..." required maxLength={40}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as TransactionType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    type === t
                      ? t === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                       : 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}>
                  {t === 'income' ? '📈 Ingreso' : '💸 Gasto'}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving || !label.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <Plus size={18} />
            {saving ? 'Guardando...' : 'Agregar Categoría'}
          </button>
        </form>
      </div>

      {/* Built-in categories */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Tag size={18} /> Categorías del Sistema
          <span className="text-xs font-normal text-gray-400">(no se pueden eliminar)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {builtIn.map(cat => (
            <div key={cat.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${cat.color} bg-opacity-60`}>
              <span className="text-lg">{cat.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{cat.label}</p>
                <p className="text-xs opacity-70">{cat.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom categories */}
      {customCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">⭐ Mis Categorías</h2>
          <div className="space-y-2">
            {customCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{cat.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la categoría "${cat.label}"?`)) {
                        deleteCustomCategory(cat.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
