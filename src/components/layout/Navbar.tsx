import { Menu, Bell, Building2, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts } from '../../contexts/AccountsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();
  const { accounts, activeAccount, activeAccountId, setActiveAccountId } = useAccounts();
  const { settings, updateSettings } = useSettings();
  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Account Selector Dropdown */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
          {activeAccount.type === 'personal' ? (
            <User size={16} className="text-blue-500" />
          ) : (
            <Building2 size={16} className="text-purple-500" />
          )}
          <select
            value={activeAccountId}
            onChange={(e) => setActiveAccountId(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-800 dark:text-white focus:outline-none cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                {acc.razonSocial || (acc.type === 'personal' ? 'Personal' : 'Empresa')}
              </option>
            ))}
          </select>
        </div>

        {/* Waning Crescent Moon Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-indigo-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all border border-gray-200 dark:border-slate-700 flex items-center justify-center"
          title={settings.darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {settings.darkMode ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-indigo-600" />
          )}
        </button>

        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Bell size={20} />
        </button>
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || ''}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
