import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  UserCircle,
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Settings,
  X,
  TrendingUp,
  LogOut,
  Database,
  Download,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import InstallModal from '../pwa/InstallModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const navItems = [
  { to: '/cuenta', icon: UserCircle, label: 'Cuenta' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transacciones', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/contabilidad', icon: BookOpen, label: 'Contabilidad' },
  { to: '/datos', icon: Database, label: 'Datos' },
  { to: '/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(isStandalone));
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isIOS =
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Error prompting install:', err);
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-slate-900 dark:bg-[#020617] text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          border-r border-slate-800
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Mis Cuentas</h1>
              <p className="text-slate-400 text-xs">Control financiero</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Botón Instalar app justo debajo de Ajustes */}
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white group text-left"
            title="Instalar app en tu dispositivo"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Download size={18} className="text-blue-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
              <span className="truncate">Instalar app</span>
            </div>
            {isInstalled ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex-shrink-0">
                Instalada
              </span>
            ) : deferredPrompt ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700 animate-pulse flex-shrink-0">
                Instalar
              </span>
            ) : null}
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-slate-700 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Usuario'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Modal de instrucciones / instalación PWA */}
      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        isIOS={isIOS}
        isInstalled={isInstalled}
        hasNativePrompt={Boolean(deferredPrompt)}
        onNativeInstall={async () => {
          setShowInstallModal(false);
          if (deferredPrompt) {
            try {
              await deferredPrompt.prompt();
              const choice = await deferredPrompt.userChoice;
              if (choice.outcome === 'accepted') {
                setIsInstalled(true);
                setDeferredPrompt(null);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }}
      />
    </>
  );
}

