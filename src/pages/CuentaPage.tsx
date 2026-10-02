import { useEffect, useState } from 'react';
import { Building2, User, Plus, Pencil, Trash2, Globe, Phone, MapPin, Mail, Hash, FileText, ChevronDown, ChevronUp, Users, Wallet, ShieldAlert } from 'lucide-react';
import { useAccounts } from '../contexts/AccountsContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { setDoc } from 'firebase/firestore';
import { db, collection, getDocs, doc } from '../lib/firebase';
import type { Account } from '../types';

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
  businesses: {
    id: string;
    razonSocial: string;
    rnc: string;
    balance: number;
  }[];
}

function UserBalancesOverview() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();
  const [userOverviews, setUserOverviews] = useState<UserAccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [editingLimitUserId, setEditingLimitUserId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState<number>(2);

  // Strictly check if logged-in user is dbaezh78@gmail.com
  const isAdmin = user?.email?.toLowerCase() === 'dbaezh78@gmail.com';

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
            try {
              const bTxSnap = await getDocs(collection(db, 'users', userId, 'accounts', accDoc.id, 'transactions'));
              bTxSnap.forEach(d => {
                const data = d.data();
                const amt = Number(data.amount) || 0;
                if (data.type === 'income') bBalance += amt;
                else bBalance -= amt;
              });
            } catch {
              // Subcollection restricted
            }
            businesses.push({
              id: accDoc.id,
              razonSocial: accData.razonSocial || 'Empresa sin nombre',
              rnc: accData.rnc || '',
              balance: bBalance,
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

  const handleUpdateLimit = async (targetUserId: string) => {
    try {
      await setDoc(doc(db, 'users', targetUserId), { maxCompanies: limitInput }, { merge: true });
      setEditingLimitUserId(null);
      await loadAllUsersData();
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
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
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
            Para que puedas ver todos los usuarios e incremental el límite de empresas, necesitas actualizar las reglas de Firestore en la consola de Firebase.
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
                  {/* Limit control */}
                  <div className="text-right border-r border-gray-200 dark:border-gray-700 pr-4">
                    <span className="text-xs text-gray-400 block">Límite Empresas</span>
                    {editingLimitUserId === u.userId ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={limitInput}
                          onChange={e => setLimitInput(parseInt(e.target.value) || 1)}
                          className="w-14 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleUpdateLimit(u.userId)}
                          className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700"
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {u.maxCompanies} empresas
                        </span>
                        <button
                          onClick={() => {
                            setEditingLimitUserId(u.userId);
                            setLimitInput(u.maxCompanies);
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          title="Cambiar límite"
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
                      <div className="flex items-center gap-1">
                        <Wallet size={14} className="text-gray-400" />
                        <span className={`text-xs font-semibold ${b.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(b.balance)}
                        </span>
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h2>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map(({ key, label, icon: Icon, type = 'text', placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative">
                <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type}
                  value={form[key]}
                  onChange={set(key)}
                  required={key === 'razonSocial'}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cuentas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Gestiona tus perfiles contables — Personal y hasta {maxCompanies} empresas
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

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Expand/collapse details */}
                  {!isPersonal && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : account.id)}
                      className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Ver detalles"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              )}

              {/* Personal: show user details */}
              {isPersonal && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      {!canAddMore && (
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
