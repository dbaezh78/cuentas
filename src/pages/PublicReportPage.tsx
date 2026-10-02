import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, CheckCircle2, AlertCircle, Building2, TrendingUp, TrendingDown, DollarSign, Calendar, ShieldCheck, RefreshCw, User, Moon, Sun, Printer, ChevronDown, ChevronRight, Home } from 'lucide-react';
import type { Account, Transaction, AccountViewer, CustomCategory } from '../types';
import { getCategoryConfig } from '../lib/utils';

export default function PublicReportPage() {
  const { userId, accountId } = useParams<{ userId: string; accountId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded nested details state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Theme mode (Light by default, user can toggle to Dark)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Password verification state
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const isPersonal = accountId === 'personal';

  const loadPublicData = useCallback(async (isManualRefresh = false) => {
    if (!userId || !accountId) {
      setError('Enlace de reporte inválido.');
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      let accData: Account;

      if (isPersonal) {
        // Fetch personal account metadata from user document
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          setError('El usuario propietario de este reporte no existe.');
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const uData = userSnap.data();
        accData = {
          id: 'personal',
          type: 'personal',
          rnc: '',
          razonSocial: uData.displayName || uData.nombre || 'Cuenta Personal',
          telefono: '',
          direccion: '',
          correo: uData.email || uData.correo || '',
          direccionWeb: '',
          isPublic: Boolean(uData.isPersonalPublic),
          sharePassword: uData.personalSharePassword || '',
          publicShareExpiresAt: uData.personalPublicShareExpiresAt || '',
          viewers: Array.isArray(uData.personalViewers) ? uData.personalViewers : [],
        };
      } else {
        // Fetch business account metadata
        const accDocRef = doc(db, 'users', userId, 'accounts', accountId);
        const accSnap = await getDoc(accDocRef);

        if (!accSnap.exists()) {
          setError('La empresa solicitada no existe o ha sido eliminada.');
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const data = accSnap.data();
        accData = {
          id: accSnap.id,
          type: 'business',
          rnc: data.rnc || '',
          razonSocial: data.razonSocial || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
          correo: data.correo || '',
          direccionWeb: data.direccionWeb || '',
          isPublic: Boolean(data.isPublic),
          sharePassword: data.sharePassword || '',
          publicShareExpiresAt: data.publicShareExpiresAt || '',
          viewers: Array.isArray(data.viewers) ? data.viewers : [],
        };
      }

      if (!accData.isPublic) {
        setError('El propietario de esta cuenta no ha habilitado el acceso público al reporte.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check expiration date
      if (accData.publicShareExpiresAt) {
        const expires = new Date(accData.publicShareExpiresAt + 'T23:59:59');
        if (new Date() > expires) {
          setError('Este enlace de reporte público ha alcanzado su fecha límite de expiración y ya no está disponible.');
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      setAccount(accData);

      // If no password is set, automatically unlock
      if (!accData.sharePassword) {
        setIsUnlocked(true);
      }

      // Fetch custom categories of the account owner
      try {
        const catSnap = await getDocs(collection(db, 'users', userId, 'categories'));
        const customCats: CustomCategory[] = catSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<CustomCategory, 'id'>),
        }));
        setCustomCategories(customCats);
      } catch (e) {
        console.error('Error fetching custom categories for public report:', e);
      }

      // Fetch transactions
      let txList: Transaction[] = [];
      if (isPersonal) {
        // Read root expenses + transactions
        const [expensesSnap, transSnap] = await Promise.all([
          getDocs(collection(db, 'users', userId, 'expenses')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'users', userId, 'transactions')).catch(() => ({ docs: [] })),
        ]);

        const oldTx: Transaction[] = expensesSnap.docs.map(d => {
          const t = d.data();
          return {
            id: d.id,
            amount: Number(t.amount) || 0,
            category: String(t.category || ''),
            description: String(t.description || ''),
            date: String(t.date || ''),
            paymentMethod: t.paymentMethod || 'cash',
            type: t.type || 'expense',
            details: Array.isArray(t.details) ? t.details : [],
          };
        });

        const newTx: Transaction[] = transSnap.docs.map(d => {
          const t = d.data();
          return {
            id: d.id,
            amount: Number(t.amount) || 0,
            category: String(t.category || ''),
            description: String(t.description || ''),
            date: String(t.date || ''),
            paymentMethod: t.paymentMethod || 'cash',
            type: t.type || 'expense',
            details: Array.isArray(t.details) ? t.details : [],
          };
        });

        const allMap = new Map<string, Transaction>();
        [...oldTx, ...newTx].forEach(t => allMap.set(t.id, t));
        txList = Array.from(allMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      } else {
        // Business transactions
        const txSnap = await getDocs(collection(db, 'users', userId, 'accounts', accountId, 'transactions'));
        txList = txSnap.docs.map(d => {
          const t = d.data();
          return {
            id: d.id,
            amount: Number(t.amount) || 0,
            category: String(t.category || ''),
            description: String(t.description || ''),
            date: String(t.date || ''),
            paymentMethod: t.paymentMethod || 'cash',
            type: t.type || 'expense',
            details: Array.isArray(t.details) ? t.details : [],
          };
        }).sort((a, b) => b.date.localeCompare(a.date));
      }

      setTransactions(txList);

      // Auto expand rows with nested details by default
      const initialExpanded: Record<string, boolean> = {};
      txList.forEach(t => {
        if (t.details && t.details.length > 0) {
          initialExpanded[t.id] = true;
        }
      });
      setExpandedRows(initialExpanded);

      // Record viewer if user is logged in
      if (!isManualRefresh && user && user.email) {
        const nowFormatted = new Date().toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const viewerRecord: AccountViewer = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          viewedAt: nowFormatted,
        };

        try {
          const targetDoc = isPersonal ? doc(db, 'users', userId) : doc(db, 'users', userId, 'accounts', accountId);
          const fieldKey = isPersonal ? 'personalViewers' : 'viewers';
          
          // Filter existing viewers to keep only unique emails, replacing existing email record with latest visit
          const currentViewers: AccountViewer[] = Array.isArray(accData.viewers) ? accData.viewers : [];
          const updatedViewers = [
            ...currentViewers.filter(v => v.email.toLowerCase() !== user.email!.toLowerCase()),
            viewerRecord,
          ];

          await updateDoc(targetDoc, {
            [fieldKey]: updatedViewers,
          });
        } catch (e) {
          console.error('Error logging viewer:', e);
        }
      }

    } catch (err) {
      console.error('Error loading public report:', err);
      setError('Ocurrió un error al cargar el reporte público.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, accountId, user, isPersonal]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (account?.sharePassword && passwordInput === account.sharePassword) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Month selector state: 'all' or 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Compute unique months from transactions (YYYY-MM)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Set default selected month to latest available month when transactions load
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === 'all') {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // Filtered transactions by month
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Calculations on filtered transactions
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      totalCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Cargando reporte de cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md w-full border rounded-2xl p-8 text-center space-y-4 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="w-12 h-12 bg-red-900/40 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">Acceso No Disponible</h2>
          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{error || 'No se pudo acceder al reporte.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Password Protection Screen
  if (account.sharePassword && !isUnlocked) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors relative ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center gap-2 text-xs font-semibold ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Cambiar entre Modo Claro y Modo Oscuro"
          >
            {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>

        <div className={`max-w-md w-full border rounded-2xl p-8 shadow-2xl space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{account.razonSocial}</h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Este reporte está protegido por contraseña.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Ingresa la contraseña del reporte
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              {passwordError && (
                <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Contraseña incorrecta. Intenta nuevamente.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
            >
              <ShieldCheck size={18} />
              Desbloquear Reporte
            </button>
          </form>

          {!user && (
            <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-gray-100 border-gray-200'}`}>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                ¿Eres miembro o usuario registrado?{' '}
                <button onClick={() => navigate('/login')} className="text-indigo-500 font-semibold hover:underline">
                  Inicia sesión
                </button>{' '}
                para quedar registrado en el historial de visitas.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Unlocked Public Report Dashboard View
  return (
    <div className={`min-h-screen p-4 sm:p-8 transition-colors ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <style>{`
        @media print {
          @page {
            margin: 10mm;
            size: auto;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            space-y: 1rem !important;
          }
          .print-card {
            border: 1px solid #cbd5e1 !important;
            background: white !important;
            box-shadow: none !important;
            padding: 1rem !important;
            border-radius: 0.75rem !important;
            margin-bottom: 1rem !important;
          }
          .print-icon-bg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #4f46e5 !important;
            color: white !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8 print-container">

        {/* Top Header Card */}
        <div className={`border rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors print-card ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 print-icon-bg">
              {isPersonal ? <User size={32} /> : <Building2 size={32} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{account.razonSocial}</h1>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 no-print">
                  <CheckCircle2 size={12} /> Reporte Público
                </span>
              </div>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {account.rnc ? `RNC: ${account.rnc} · ` : ''}
                {account.correo || account.telefono || (isPersonal ? 'Cuenta Personal' : 'Estado de Cuenta Compartido')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap no-print">
            {/* Month Filter Selector */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Filtrar Mes:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className={`border px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="all">Todos los meses</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Go to Home Button */}
            <button
              onClick={() => navigate('/')}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2 text-xs font-semibold ${
                isDarkMode
                  ? 'bg-indigo-900/40 border-indigo-700 text-indigo-200 hover:bg-indigo-800/50'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
              title="Ir al inicio / Dashboard"
            >
              <Home size={15} className="text-indigo-500" />
              <span>Inicio</span>
            </button>

            {/* Print Icon Button */}
            <button
              onClick={handlePrint}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2 text-xs font-semibold ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
              title="Imprimir Reporte"
            >
              <Printer size={15} className="text-indigo-500" />
              <span>Imprimir</span>
            </button>

            {/* Dark/Light Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2 text-xs font-semibold ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
              title="Cambiar entre Modo Claro y Modo Oscuro"
            >
              {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-700" />}
              <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>

            <button
              onClick={() => loadPublicData(true)}
              disabled={refreshing}
              className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
              }`}
              title="Actualizar datos e incorporar nuevas transacciones"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-500' : ''} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar Reporte'}</span>
            </button>

            {user && (
              <div className={`border px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <Eye size={14} className="text-indigo-500" />
                <span>Viendo como <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{user.email}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`border rounded-2xl p-5 shadow-lg print-card ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Ingresos</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-500">
              ${stats.income.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {selectedMonth === 'all' ? 'Total acumulado' : `Mes: ${selectedMonth}`}
            </p>
          </div>

          <div className={`border rounded-2xl p-5 shadow-lg print-card ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Gastos</span>
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                <TrendingDown size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-500">
              ${stats.expense.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {selectedMonth === 'all' ? 'Total acumulado' : `Mes: ${selectedMonth}`}
            </p>
          </div>

          <div className={`border rounded-2xl p-5 shadow-lg print-card ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Balance Neto</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <p className={`text-2xl font-black ${stats.balance >= 0 ? 'text-indigo-500' : 'text-amber-500'}`}>
              ${stats.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {selectedMonth === 'all' ? 'Resultado total' : `Mes: ${selectedMonth}`}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className={`border rounded-3xl p-6 shadow-2xl space-y-4 print-card ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between pb-4 border-b flex-wrap gap-2 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
            <div>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Detalle de Transacciones</h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Mostrando {filteredTransactions.length} registros {selectedMonth !== 'all' ? `(Mes: ${selectedMonth})` : 'totales'}
              </p>
            </div>
            <button
              onClick={() => loadPublicData(true)}
              className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-medium no-print"
            >
              <RefreshCw size={12} /> Refrescar lista
            </button>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              <p className="text-sm">No hay transacciones registradas para este periodo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                <thead className={`uppercase tracking-wider font-semibold border-b ${
                  isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  <tr>
                    <th className="py-3 px-2 w-8"></th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isDarkMode ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
                  {filteredTransactions.map(t => {
                    const hasDetails = Array.isArray(t.details) && t.details.length > 0;
                    const isExpanded = expandedRows[t.id];

                    return (
                      <React.Fragment key={t.id}>
                        <tr
                          onClick={() => hasDetails && toggleRowExpanded(t.id)}
                          className={`transition-colors ${hasDetails ? 'cursor-pointer' : ''} ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}
                        >
                          <td className="py-3 px-2 text-center">
                            {hasDetails && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRowExpanded(t.id); }}
                                className={`p-1 rounded transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> {t.date}</span>
                          </td>
                          <td className={`py-3 px-4 font-sans font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{t.description}</td>
                          <td className={`py-3 px-4 capitalize ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {(() => {
                              const catCfg = getCategoryConfig(t.category, customCategories);
                              return `${catCfg.icon} ${catCfg.label}`;
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                              t.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                            }`}>
                              {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold text-sm whitespace-nowrap ${
                            t.type === 'income' ? 'text-emerald-500' : (isDarkMode ? 'text-slate-200' : 'text-gray-900')
                          }`}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Sub-table / Nested details view */}
                        {hasDetails && isExpanded && (
                          <tr className={isDarkMode ? 'bg-slate-950/80' : 'bg-gray-50/80'}>
                            <td></td>
                            <td colSpan={5} className="py-3 px-4">
                              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 font-sans ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  Desglose de registro ({t.details?.length} sub-ítems)
                                </p>
                                <div className="space-y-1.5">
                                  {t.details?.map((sub, idx) => (
                                    <div key={idx} className={`flex items-center justify-between text-xs font-sans pb-1.5 border-b last:border-b-0 ${isDarkMode ? 'border-slate-800 text-slate-300' : 'border-gray-100 text-gray-700'}`}>
                                      <span className="font-medium">• {sub.detalle}</span>
                                      <span className="font-mono font-semibold">${Number(sub.valor).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center py-6 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
          <p>Powered by Mis Cuentas · Reporte Financiero Seguro</p>
        </div>

      </div>
    </div>
  );
}
