import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export const CURRENCIES = [
  { code: 'DOP', label: 'Peso Dominicano', symbol: 'RD$', locale: 'es-DO' },
  { code: 'USD', label: 'Dólar Americano', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', label: 'Libra Esterlina', symbol: '£', locale: 'en-GB' },
  { code: 'CAD', label: 'Dólar Canadiense', symbol: 'CA$', locale: 'en-CA' },
  { code: 'MXN', label: 'Peso Mexicano', symbol: 'MX$', locale: 'es-MX' },
  { code: 'COP', label: 'Peso Colombiano', symbol: 'COL$', locale: 'es-CO' },
  { code: 'VES', label: 'Bolívar Venezolano', symbol: 'Bs.', locale: 'es-VE' },
  { code: 'BRL', label: 'Real Brasileño', symbol: 'R$', locale: 'pt-BR' },
  { code: 'ARS', label: 'Peso Argentino', symbol: 'AR$', locale: 'es-AR' },
  { code: 'CLP', label: 'Peso Chileno', symbol: 'CL$', locale: 'es-CL' },
  { code: 'PEN', label: 'Sol Peruano', symbol: 'S/.', locale: 'es-PE' },
  { code: 'GTQ', label: 'Quetzal Guatemalteco', symbol: 'Q', locale: 'es-GT' },
  { code: 'HNL', label: 'Lempira Hondureño', symbol: 'L', locale: 'es-HN' },
  { code: 'CRC', label: 'Colón Costarricense', symbol: '₡', locale: 'es-CR' },
  { code: 'PAB', label: 'Balboa Panameño', symbol: 'B/.', locale: 'es-PA' },
  { code: 'JPY', label: 'Yen Japonés', symbol: '¥', locale: 'ja-JP' },
  { code: 'CNY', label: 'Yuan Chino', symbol: '¥', locale: 'zh-CN' },
  { code: 'CHF', label: 'Franco Suizo', symbol: 'Fr.', locale: 'de-CH' },
  { code: 'AUD', label: 'Dólar Australiano', symbol: 'A$', locale: 'en-AU' },
];

export interface UserSettings {
  currencyCode: string;
  darkMode: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  currencyCode: 'DOP',
  darkMode: false,
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  formatCurrency: (amount: number) => string;
  currentCurrency: typeof CURRENCIES[0];
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  // Apply dark mode to <html>
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);

    if (user) {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, updated, { merge: true });
    }
  }, [settings, user]);

  const currentCurrency = CURRENCIES.find(c => c.code === settings.currencyCode) || CURRENCIES[0];

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat(currentCurrency.locale, {
      style: 'currency',
      currency: currentCurrency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currentCurrency]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, formatCurrency, currentCurrency, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
