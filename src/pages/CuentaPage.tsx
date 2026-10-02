import { useEffect, useState } from 'react';
import { Building2, User, Plus, Pencil, Trash2, Globe, Phone, MapPin, Mail, Hash, FileText, Users, ShieldAlert, Download, AlertTriangle, Share2 } from 'lucide-react';
import { useAccounts } from '../contexts/AccountsContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { setDoc, deleteDoc } from 'firebase/firestore';
import { db, collection, getDocs, doc, getAccountTransactionsRef } from '../lib/firebase';
import { exportToCSV } from '../lib/utils';
import type { Account, Transaction, AccountViewer } from '../types';

type AccountFormData = Omit<Account, 'id' | 'type'>;

const emptyForm: AccountFormData = {
  rnc: '', razonSocial: '', telefono: '', direccion: '', correo: '', direccionWeb: '',
};

interface UserAccountOverview {
  userId: string;
  userEmail: string;
  userName: string;
  personalBalance: number;
  maxCompanies: number;
  deadlineDate: string;
  businesses: {
    id: string;
    razonSocial: string;
    rnc: string;
    balance: number;
    lastMovement: string | null;
    transactionCount: number;
  }[];
}

async function handleDownloadAccountCSV(userId: string, accountId: string, accountName: string, customCategories: any[]) {
  try {
    const ref = getAccountTransactionsRef(userId, accountId);
    const snap = await getDocs(ref);
    const txs: Transaction[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        amount: Number(data.amount) || 0,
        category: String(data.category || ''),
        description: String(data.description || ''),
        date: String(data.date || ''),
        paymentMethod: (data.paymentMethod as any) || 'cash',
        type: (data.type as any) || 'expense',
        details: Array.isArray(data.details) ? data.details : [],
      };
    });
    if (txs.length === 0) {
      alert(`La empresa "${accountName}" no tiene transacciones registradas.`);
      return;
    }
    exportToCSV(txs, customCategories);
  } catch (err) {
    console.error('Error downloading account CSV:', err);
    alert('Error al descargar las transacciones.');
  }
}

function UserBalancesOverview() {
  const { user } = useAuth();
  const { refetch } = useAccounts();
  const { formatCurrency, customCategories } = useSettings();
  const [userOverviews, setUserOverviews] = useState<UserAccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [editingLimitUserId, setEditingLimitUserId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState<number>(2);

  // Strictly check if logged-in user is dbaezh78@gmail.com
  const isAdmin = user?.email?.toLowerCase() === 'dbaezh78@gmail.com';

  const handleDeleteAccountAsAdmin = async (targetUserId: string, accountId: string, accountName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta/empresa "${accountName}"? Esta acción eliminará permanentemente la empresa y todas sus transacciones.`)) {
      return;
    }

    try {
      // 1. Delete all transactions of the account
      const txRef = collection(db, 'users', targetUserId, 'accounts', accountId, 'transactions');
      const txSnap = await getDocs(txRef);
      await Promise.all(txSnap.docs.map(d => deleteDoc(doc(db, 'users', targetUserId, 'accounts', accountId, 'transactions', d.id))));

      // 2. Delete the account document
      await deleteDoc(doc(db, 'users', targetUserId, 'accounts', accountId));

      alert(`La empresa "${accountName}" ha sido eliminada exitosamente.`);
      await loadAllUsersData();
      if (targetUserId === user?.uid) {
        refetch();
      }
    } catch (err) {
      console.error('Error deleting account as admin:', err);
      alert('Error al eliminar la cuenta. Verifica los permisos de Firestore.');
    }
  };

  const loadAllUsersData = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setPermissionDenied(false);
      const usersSnap = await getDocs(collection(db, 'users'));
      const overviews: UserAccountOverview[] = [];

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Compute Personal Account Balance (Root expenses + root transactions)
        let personalBalance = 0;
        try {
          const expensesSnap = await getDocs(collection(db, 'users', userId, 'expenses'));
          expensesSnap.forEach(d => {
            const data = d.data();
            const amt = Number(data.amount) || 0;
            if (data.type === 'income') personalBalance += amt;
            else personalBalance -= amt;
          });
          const transSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
          transSnap.forEach(d => {
            const data = d.data();
            const amt = Number(data.amount) || 0;
            if (data.type === 'income') personalBalance += amt;
            else personalBalance -= amt;
          });
        } catch {
          // Restricted by rules until admin rules deployed
        }

        // Fetch Business Accounts
        const businesses: UserAccountOverview['businesses'] = [];
        try {
          const accountsSnap = await getDocs(collection(db, 'users', userId, 'accounts'));
          for (const accDoc of accountsSnap.docs) {
            const accData = accDoc.data();
            let bBalance = 0;
            let latestDate: string | null = null;
            let count = 0;

            try {
              const bTxSnap = await getDocs(collection(db, 'users', userId, 'accounts', accDoc.id, 'transactions'));
              count = bTxSnap.size;
              bTxSnap.forEach(d => {
                const data = d.data();
                const amt = Number(data.amount) || 0;
                if (data.type === 'income') bBalance += amt;
                else bBalance -= amt;

                const txDate = String(data.date || '');
                if (txDate && (!latestDate || txDate > latestDate)) {
                  latestDate = txDate;
                }
              });
            } catch {
              // Subcollection restricted
            }
            businesses.push({
              id: accDoc.id,
              razonSocial: accData.razonSocial || 'Empresa sin nombre',
              rnc: accData.rnc || '',
              balance: bBalance,
              lastMovement: latestDate,
              transactionCount: count,
            });
          }
        } catch {
          // Accounts collection restricted
        }

        overviews.push({
          userId,
          userEmail: userData.email || userData.correo || userDoc.id,
          userName: userData.displayName || userData.nombre || (userData.email ? userData.email.split('@')[0] : 'Usuario'),
          personalBalance,
          maxCompanies: Number(userData.maxCompanies) || 2,
          deadlineDate: userData.deadlineDate ? String(userData.deadlineDate) : '',
          businesses,
        });
      }
      setUserOverviews(overviews);
    } catch (err: unknown) {
      console.error('Error fetching overview of users:', err);
      const isPermError = err instanceof Error && err.message.toLowerCase().includes('permission');
      if (isPermError || String(err).includes('permission-denied')) {
        setPermissionDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsersData();
  }, [user]);

  if (!isAdmin) return null;

  const [deadlineInput, setDeadlineInput] = useState<string>('');

  const handleUpdateLimit = async (targetUserId: string) => {
    try {
      await setDoc(doc(db, 'users', targetUserId), {
        maxCompanies: limitInput,
        deadlineDate: deadlineInput || null,
      }, { merge: true });
      setEditingLimitUserId(null);
      await loadAllUsersData();
      if (targetUserId === user?.uid) {
        refetch();
      }
    } catch (err) {
      console.error('Error updating maxCompanies limit:', err);
      alert('Error al actualizar el límite. Verifica las reglas de Firestore.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Usuarios Activos y Balances por Empresa</h2>
        </div>
        <button
          onClick={loadAllUsersData}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          Actualizar datos
        </button>
      </div>

      {permissionDenied && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-xl text-amber-800 dark:text-amber-300 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert size={18} />
            <span>Permisos de Firestore Requeridos</span>
          </div>
          <p>
            Para que puedas ver todos los usuarios e incrementar el límite de empresas, necesitas actualizar las reglas de Firestore en la consola de Firebase.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Cargando usuarios y empresas...</p>
      ) : userOverviews.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
          {permissionDenied ? 'Para visualizar a todos los usuarios, actualiza las reglas de Firestore.' : 'No hay datos de usuarios registrados.'}
        </p>
      ) : (
        <div className="space-y-4">
          {userOverviews.map(u => (
            <div key={u.userId} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-750">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-blue-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{u.userName}</p>
                      {u.userId === user?.uid && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                          Tú (Admin)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.userEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Limit & Deadline control */}
                  <div className="text-right border-r border-gray-200 dark:border-gray-700 pr-4">
                    <span className="text-xs text-gray-400 block">Límite & Plazo Regulación</span>
                    {editingLimitUserId === u.userId ? (
                      <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">Límite:</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={limitInput}
                            onChange={e => setLimitInput(parseInt(e.target.value) || 1)}
                            className="w-12 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">Plazo:</span>
                          <input
                            type="date"
                            value={deadlineInput}
                            onChange={e => setDeadlineInput(e.target.value)}
                            className="px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateLimit(u.userId)}
                          className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 font-medium"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingLimitUserId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                            {u.maxCompanies} empresas
                          </span>
                          {u.deadlineDate && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                              Plazo: {u.deadlineDate}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingLimitUserId(u.userId);
                            setLimitInput(u.maxCompanies);
                            setDeadlineInput(u.deadlineDate || '');
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium p-1"
                          title="Cambiar límite y plazo"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Balance Personal</span>
                    <span className={`text-sm font-bold ${u.personalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {formatCurrency(u.personalBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nested Business Accounts */}
              <div className="pl-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Empresas Creadas ({u.businesses.length} / {u.maxCompanies})
                </p>
                {u.businesses.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin empresas registradas.</p>
                ) : (
                  u.businesses.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-purple-500" />
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">{b.razonSocial}</p>
                          {b.rnc && <p className="text-[10px] text-gray-400">RNC: {b.rnc}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`text-xs font-semibold block ${b.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(b.balance)}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {b.lastMovement ? `Último mov: ${b.lastMovement}` : 'Sin movimientos'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadAccountCSV(u.userId, b.id, b.razonSocial, customCategories)}
                          className="flex items-center gap-1 text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 px-2 py-1 rounded font-medium transition-colors"
                          title="Descargar transacciones de esta empresa a Excel/CSV"
                        >
                          <Download size={12} />
                          Descargar CSV
                        </button>
                        <button
                          onClick={() => handleDeleteAccountAsAdmin(u.userId, b.id, b.razonSocial)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title={`Eliminar empresa "${b.razonSocial}" como administrador`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Lock, Eye, Copy } from 'lucide-react';

interface AccountFormProps {
  initial?: AccountFormData;
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
  title: string;
}

function AccountForm({ initial = emptyForm, onSubmit, onCancel, title }: AccountFormProps) {
  const [form, setForm] = useState<AccountFormData>(initial);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AccountFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  const fields: { key: keyof AccountFormData; label: string; icon: React.ElementType; type?: string; placeholder: string }[] = [
    { key: 'rnc', label: 'RNC / Cédula', icon: Hash, placeholder: '001-1234567-8' },
    { key: 'razonSocial', label: 'Razón Social / Nombre', icon: FileText, placeholder: 'Nombre de la empresa o persona' },
    { key: 'telefono', label: 'Teléfono', icon: Phone, type: 'tel', placeholder: '(809) 555-0000' },
    { key: 'direccion', label: 'Dirección', icon: MapPin, placeholder: 'Calle, ciudad, provincia' },
    { key: 'correo', label: 'Correo', icon: Mail, type: 'email', placeholder: 'correo@empresa.com' },
    { key: 'direccionWeb', label: 'Dirección Web', icon: Globe, placeholder: 'https://empresa.com' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h2>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {fields.map(({ key, label, icon: Icon, type = 'text', placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative">
                <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type}
                  value={form[key] as string || ''}
                  onChange={set(key)}
                  required={key === 'razonSocial'}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}

          {/* Share Public Report Options */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.isPublic)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setForm(prev => ({
                    ...prev,
                    isPublic: isChecked,
                    publicShareExpiresAt: isChecked ? (prev.publicShareExpiresAt || '') : '',
                  }));
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Share2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                Permitir compartir Reporte de Cuenta públicamente
              </span>
            </label>

            {form.isPublic && (
              <div className="pl-6 space-y-3">
                {/* Password Protection Checkbox */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.sharePassword)}
                      onChange={e => {
                        if (!e.target.checked) {
                          setForm(prev => ({ ...prev, sharePassword: '' }));
                        } else if (!form.sharePassword) {
                          setForm(prev => ({ ...prev, sharePassword: '123' }));
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Lock size={14} className="text-amber-500" />
                      Proteger con contraseña de acceso
                    </span>
                  </label>

                  {Boolean(form.sharePassword !== undefined && form.sharePassword !== '') ? (
                    <div className="relative pl-6">
                      <Lock size={16} className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.sharePassword || ''}
                        onChange={e => setForm(prev => ({ ...prev, sharePassword: e.target.value }))}
                        placeholder="Escribe la contraseña para ver el reporte"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-6">
                      Sin contraseña (Acceso libre a cualquier persona con el enlace).
                    </p>
                  )}
                </div>

                {/* Expiration Date Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Vigilancia de Plazo del Enlace:
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <input
                        type="checkbox"
                        checked={!form.publicShareExpiresAt}
                        onChange={e => {
                          if (e.target.checked) {
                            setForm(prev => ({ ...prev, publicShareExpiresAt: '' }));
                          } else {
                            const exp = new Date();
                            exp.setDate(exp.getDate() + 30);
                            setForm(prev => ({ ...prev, publicShareExpiresAt: exp.toISOString().split('T')[0] }));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span>Sin límite de tiempo</span>
                    </label>
                  </div>
                  {form.publicShareExpiresAt ? (
                    <input
                      type="date"
                      value={form.publicShareExpiresAt}
                      onChange={e => setForm(prev => ({ ...prev, publicShareExpiresAt: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="px-3 py-2 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span>Acceso permanente sin fecha de vencimiento.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const exp = new Date();
                          exp.setDate(exp.getDate() + 30);
                          setForm(prev => ({ ...prev, publicShareExpiresAt: exp.toISOString().split('T')[0] }));
                        }}
                        className="text-[11px] underline text-indigo-600 dark:text-indigo-400 font-semibold"
                      >
                        Establecer plazo
                      </button>
                    </div>
                  )}
                  {form.publicShareExpiresAt && (
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Selecciona libremente la fecha límite en la que el enlace dejará de estar disponible.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CuentaPage() {
  const { user } = useAuth();
  const { accounts, activeAccountId, setActiveAccountId, addAccount, updateAccount, deleteAccount, canAddMore, maxCompanies } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAdd = async (data: AccountFormData) => {
    await addAccount(data);
    setShowForm(false);
  };

  const handleEdit = async (data: AccountFormData) => {
    if (editAccount) await updateAccount(editAccount.id, data);
    setEditAccount(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta cuenta? Se perderán todas sus transacciones.')) {
      await deleteAccount(id);
    }
  };

  const { customCategories } = useSettings();
  const { deadlineDate } = useAccounts();
  const businessCount = accounts.filter(a => a.type === 'business').length;
  const isOverLimit = businessCount > maxCompanies;

  // Calculate days remaining if deadlineDate is set
  const daysRemaining = (() => {
    if (!deadlineDate) return null;
    const target = new Date(deadlineDate + 'T23:59:59');
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })();

  return (
    <div className="space-y-6">
      {/* Over limit / Grace period warning banner */}
      {isOverLimit && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-800/50 rounded-xl">
              <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                Aviso de Regulación de Plazas de Empresa
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                Tu cuenta tiene actualmente <span className="font-bold">{businessCount} empresas</span> registradas, pero tu límite permitido es de <span className="font-bold">{maxCompanies} plaza(s)</span>.
                {daysRemaining !== null ? (
                  daysRemaining >= 0 ? (
                    <> Favor elimina {businessCount - maxCompanies} empresa(s) antes de los próximos <span className="font-bold underline">{daysRemaining} día(s)</span> (Fecha límite: {deadlineDate}).</>
                  ) : (
                    <> El plazo concedido ({deadlineDate}) ha vencido. Por favor ponte al día eliminando las empresas excedentes.</>
                  )
                ) : (
                  <> Por favor exporta los datos de las empresas excedentes y elimínalas para estar en regla.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cuentas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {maxCompanies >= 9999
              ? 'Gestiona tus perfiles contables — Personal y empresas (Sin límite para Administrador)'
              : `Gestiona tus perfiles contables — Personal y hasta ${maxCompanies} empresas`}
          </p>
        </div>
        {canAddMore && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nueva Empresa</span>
          </button>
        )}
      </div>

      {/* Accounts list */}
      <div className="space-y-4">
        {accounts.map(account => {
          const isActive = account.id === activeAccountId;
          const isExpanded = expanded === account.id;
          const isPersonal = account.type === 'personal';

          return (
            <div
              key={account.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-sm transition-all ${
                isActive
                  ? 'border-indigo-400 dark:border-indigo-500 shadow-indigo-100 dark:shadow-indigo-900/20'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 p-5">
                {/* Clickable Icon and Name area to expand/collapse details */}
                <div
                  onClick={() => !isPersonal && setExpanded(isExpanded ? null : account.id)}
                  className={`flex items-center gap-4 flex-1 min-w-0 ${!isPersonal ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  title={!isPersonal ? (isExpanded ? 'Ocultar detalles' : 'Ver detalles completos') : undefined}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isPersonal ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-purple-100 dark:bg-purple-900/40'
                  }`}>
                    {isPersonal
                      ? <User size={22} className="text-blue-600 dark:text-blue-400" />
                      : <Building2 size={22} className="text-purple-600 dark:text-purple-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {account.razonSocial || (isPersonal ? 'Personal' : 'Sin nombre')}
                      </p>
                      {isActive && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          Activa
                        </span>
                      )}
                      {isPersonal && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                          Personal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {isPersonal ? user?.email : (account.correo || account.rnc || 'Sin datos')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Copy Public Link Icon Button (or open config if not created) */}
                  <button
                    onClick={() => {
                      if (account.isPublic) {
                        const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');
                        const publicUrl = `${baseUrl}/#/reporte-publico/${user?.uid}/${account.id}`;
                        navigator.clipboard.writeText(publicUrl);
                        alert(`¡Enlace copiado al portapapeles!\n\n${publicUrl}`);
                      } else {
                        setEditAccount(account);
                      }
                    }}
                    className={`p-2 rounded-lg border transition-colors ${
                      account.isPublic
                        ? 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100'
                        : 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={account.isPublic ? 'Copiar enlace público del reporte' : 'Configurar y habilitar reporte público'}
                  >
                    <Share2 size={16} />
                  </button>

                  {/* Download CSV button for business accounts */}
                  {!isPersonal && (
                    <button
                      onClick={() => handleDownloadAccountCSV(user?.uid || '', account.id, account.razonSocial, customCategories)}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg flex items-center gap-1 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                      title="Descargar transacciones de esta empresa en CSV/Excel"
                    >
                      <Download size={15} />
                      <span className="hidden md:inline">Descargar Excel/CSV</span>
                    </button>
                  )}
                  {/* Edit button for personal account as well */}
                  {isPersonal && (
                    <button
                      onClick={() => setEditAccount(account)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                      title="Configurar reporte compartido personal"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {!isPersonal && (
                    <>
                      <button
                        onClick={() => setEditAccount(account)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveAccountId(account.id)}
                    disabled={isActive}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white cursor-default'
                        : 'border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    }`}
                  >
                    {isActive ? 'Seleccionada' : 'Seleccionar'}
                  </button>
                </div>
              </div>

              {/* Expanded details (business accounts) */}
              {isExpanded && !isPersonal && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: Hash, label: 'RNC / Cédula', value: account.rnc },
                      { icon: Phone, label: 'Teléfono', value: account.telefono },
                      { icon: MapPin, label: 'Dirección', value: account.direccion },
                      { icon: Mail, label: 'Correo', value: account.correo },
                      { icon: Globe, label: 'Web', value: account.direccionWeb },
                    ].map(({ icon: Icon, label, value }) => value ? (
                      <div key={label} className="flex items-start gap-2">
                        <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-200">{value}</p>
                        </div>
                      </div>
                    ) : null)}
                  </div>

                  {/* Public Link & Viewer Log Section */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Share2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          Reporte Compartido: {account.isPublic ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                        {account.isPublic && account.sharePassword && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock size={10} /> Protegido con clave
                          </span>
                        )}
                      </div>

                      {account.isPublic && (
                        <button
                          onClick={() => {
                            const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');
                            const publicUrl = `${baseUrl}/#/reporte-publico/${user?.uid}/${account.id}`;
                            navigator.clipboard.writeText(publicUrl);
                            alert(`¡Enlace copiado al portapapeles!\n\n${publicUrl}`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                        >
                          <Copy size={13} /> Copiar Enlace Público
                        </button>
                      )}
                    </div>

                    {/* Viewers log list */}
                    {account.isPublic && (() => {
                      const uniqueViewers = (account.viewers || []).reduce((acc: AccountViewer[], v) => {
                        const existingIdx = acc.findIndex(item => item.email.toLowerCase() === v.email.toLowerCase());
                        if (existingIdx >= 0) {
                          acc[existingIdx] = v;
                        } else {
                          acc.push(v);
                        }
                        return acc;
                      }, []);

                      return (
                        <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl space-y-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <Eye size={14} className="text-indigo-500" />
                            <span>Personas que han visto este reporte ({uniqueViewers.length})</span>
                          </div>
                          {uniqueViewers.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nadie ha visto este reporte aún (se registran usuarios con sesión iniciada).</p>
                          ) : (
                            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                              {uniqueViewers.map((v, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{v.name}</p>
                                    <p className="text-[10px] text-gray-400">{v.email}</p>
                                  </div>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{v.viewedAt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Personal: show user details & share options */}
              {isPersonal && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <User size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Nombre</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{user?.displayName || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Correo</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{user?.email || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Public Link & Viewer Log Section for Personal Account */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Share2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          Reporte Compartido Personal: {account.isPublic ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                        {account.isPublic && account.sharePassword && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock size={10} /> Protegido con clave
                          </span>
                        )}
                      </div>

                      {account.isPublic ? (
                        <button
                          onClick={() => {
                            const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');
                            const publicUrl = `${baseUrl}/#/reporte-publico/${user?.uid}/personal`;
                            navigator.clipboard.writeText(publicUrl);
                            alert(`¡Enlace copiado al portapapeles!\n\n${publicUrl}`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                        >
                          <Copy size={13} /> Copiar Enlace Público
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditAccount(account)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          Habilitar compartición
                        </button>
                      )}
                    </div>

                    {/* Viewers log list */}
                    {account.isPublic && (() => {
                      const uniqueViewers = (account.viewers || []).reduce((acc: AccountViewer[], v) => {
                        const existingIdx = acc.findIndex(item => item.email.toLowerCase() === v.email.toLowerCase());
                        if (existingIdx >= 0) {
                          acc[existingIdx] = v;
                        } else {
                          acc.push(v);
                        }
                        return acc;
                      }, []);

                      return (
                        <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl space-y-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <Eye size={14} className="text-indigo-500" />
                            <span>Personas que han visto tu reporte personal ({uniqueViewers.length})</span>
                          </div>
                          {uniqueViewers.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nadie ha visto este reporte aún (se registran usuarios con sesión iniciada).</p>
                          ) : (
                            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                              {uniqueViewers.map((v, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{v.name}</p>
                                    <p className="text-[10px] text-gray-400">{v.email}</p>
                                  </div>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{v.viewedAt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for businesses */}
      {accounts.length === 1 && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No tienes empresas registradas</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">Puedes agregar hasta {maxCompanies} empresas</p>
          {canAddMore && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl"
            >
              <Plus size={16} /> Agregar Empresa
            </button>
          )}
        </div>
      )}

      {/* Users and Accounts Overview (Nested breakdown) */}
      <UserBalancesOverview />

      {/* Limit message */}
      {!canAddMore && !isOverLimit && (
        <p className="text-sm text-center text-gray-400 dark:text-gray-500">
          Has alcanzado el límite de {maxCompanies} empresas. Elimina una para agregar otra.
        </p>
      )}

      {/* Add form modal */}
      {showForm && (
        <AccountForm
          title="Nueva Empresa"
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form modal */}
      {editAccount && (
        <AccountForm
          title={`Editar: ${editAccount.razonSocial}`}
          initial={{ rnc: editAccount.rnc, razonSocial: editAccount.razonSocial, telefono: editAccount.telefono, direccion: editAccount.direccion, correo: editAccount.correo, direccionWeb: editAccount.direccionWeb }}
          onSubmit={handleEdit}
          onCancel={() => setEditAccount(null)}
        />
      )}
    </div>
  );
}
