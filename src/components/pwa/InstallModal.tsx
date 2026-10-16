import { X, Share, PlusSquare, Monitor, CheckCircle2 } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isInstalled: boolean;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export default function InstallModal({
  isOpen,
  onClose,
  isIOS,
  isInstalled,
  onNativeInstall,
  hasNativePrompt,
}: InstallModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-gray-800 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* App Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="./icon-192.png"
            alt="Mis Cuentas"
            className="w-12 h-12 rounded-xl shadow-md border border-blue-500/20"
          />
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
              Instalar Mis Cuentas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accede rápido desde tu pantalla
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
              ¡La aplicación ya está instalada!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Puedes abrirla directamente desde el menú de aplicaciones o la pantalla de inicio de tu dispositivo.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : hasNativePrompt ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Instala la aplicación para acceder a tus finanzas de forma instantánea, en pantalla completa y con mejor rendimiento.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onNativeInstall) onNativeInstall();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
              >
                Instalar ahora
              </button>
            </div>
          </div>
        ) : isIOS ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Para instalar en tu iPhone o iPad usando Safari:
            </p>
            <div className="space-y-2.5 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  Toca el botón <span className="font-semibold text-gray-900 dark:text-white">Compartir</span>{' '}
                  <Share size={13} className="inline mx-0.5 text-blue-500" /> en la barra inferior de Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  Desplázate hacia abajo y elige{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">Agregar a la pantalla de inicio</span>{' '}
                  <PlusSquare size={13} className="inline mx-0.5 text-blue-500" />.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  Confirma tocando <span className="font-semibold text-gray-900 dark:text-white">Agregar</span> en la esquina superior derecha.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Para instalar la app desde tu navegador actual:
            </p>
            <div className="space-y-2.5 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  <Monitor size={12} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">En computadora (Chrome / Edge):</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Haz clic en el icono de instalación 💻 en la barra de direcciones o abre el menú ⋮ y selecciona &quot;Instalar Mis Cuentas&quot;.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-1 border-t border-gray-200 dark:border-slate-700/60">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  📱
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">En Android (Chrome / Brave / Firefox):</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Toca el menú de tres puntos ⋮ arriba a la derecha y pulsa &quot;Instalar aplicación&quot; o &quot;Agregar a la pantalla principal&quot;.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
