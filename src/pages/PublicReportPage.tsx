import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, CheckCircle2, AlertCircle, Building2, TrendingUp, TrendingDown, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import type { Account, Transaction, AccountViewer } from '../types';

export default function PublicReportPage() {
  const { userId, accountId } = useParams<{ userId: string; accountId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password verification state
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    async function loadPublicData() {
      if (!userId || !accountId) {
        setError('Enlace de reporte inválido.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch account metadata
        const accDocRef = doc(db, 'users', userId, 'accounts', accountId);
        const accSnap = await getDoc(accDocRef);

        if (!accSnap.exists()) {
          setError('La empresa solicitada no existe o ha sido eliminada.');
          setLoading(false);
          return;
        }

        const data = accSnap.data();
        const accData: Account = {
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
          viewers: Array.isArray(data.viewers) ? data.viewers : [],
        };

        if (!accData.isPublic) {
          setError('El propietario de esta cuenta no ha habilitado el acceso público al reporte.');
          setLoading(false);
          return;
        }

        setAccount(accData);

        // If no password is set, automatically unlock
        if (!accData.sharePassword) {
          setIsUnlocked(true);
        }

        // Fetch transactions for this business account
        const txSnap = await getDocs(collection(db, 'users', userId, 'accounts', accountId, 'transactions'));
        const txList: Transaction[] = txSnap.docs.map(d => {
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

        setTransactions(txList);

        // Record viewer if user is logged in
        if (user && user.email) {
          const viewerRecord: AccountViewer = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            viewedAt: new Date().toLocaleDateString('es-DO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
          };

          try {
            await updateDoc(accDocRef, {
              viewers: arrayUnion(viewerRecord),
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
      }
    }

    loadPublicData();
  }, [userId, accountId, user]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (account?.sharePassword && passwordInput === account.sharePassword) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      totalCount: transactions.length,
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Cargando reporte de cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-red-900/40 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">Acceso No Disponible</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{error || 'No se pudo acceder al reporte.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-950 text-indigo-400 border border-indigo-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold">{account.razonSocial}</h2>
            <p className="text-slate-400 text-sm">Este reporte está protegido por contraseña.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Ingresa la contraseña del reporte
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
              <p className="text-xs text-slate-400">
                ¿Eres miembro o usuario registrado?{' '}
                <button onClick={() => navigate('/login')} className="text-indigo-400 font-semibold hover:underline">
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

  // Unlocked Public Report Dashboard View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{account.razonSocial}</h1>
                <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Reporte Público
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {account.rnc ? `RNC: ${account.rnc} · ` : ''}
                {account.correo || account.telefono || 'Estado de Cuenta Compartido'}
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs text-slate-300">
              <Eye size={16} className="text-indigo-400" />
              <span>Viendo como <strong className="text-white">{user.email}</strong></span>
            </div>
          )}
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Ingresos</span>
              <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400">
              ${stats.income.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Entradas de capital registradas</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gastos</span>
              <div className="p-2 bg-rose-950 text-rose-400 rounded-xl">
                <TrendingDown size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-400">
              ${stats.expense.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Salidas y costos operativos</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Balance Netos</span>
              <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <p className={`text-2xl font-black ${stats.balance >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
              ${stats.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Resultado del periodo</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Detalle de Transacciones</h3>
              <p className="text-slate-400 text-xs mt-0.5">Mostrando {transactions.length} registros</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">No hay transacciones registradas para este reporte.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={13} /> {t.date}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-100">{t.description}</td>
                      <td className="py-3 px-4 capitalize text-slate-400">{t.category}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                          t.type === 'income' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        }`}>
                          {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-sm whitespace-nowrap ${
                        t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-slate-500">
          <p>Powered by Mis Cuentas · Reporte Financiero Seguro</p>
        </div>

      </div>
    </div>
  );
}
