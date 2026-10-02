import { useState } from 'react';
import { Terminal, Trash2, X, RefreshCw } from 'lucide-react';
import { useLogger, LogEntry } from '../../contexts/LoggerContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ActivityLogDrawer() {
  const { user } = useAuth();
  const { logs, clearLogs } = useLogger();
  const [isOpen, setIsOpen] = useState(false);

  // Strictly check if logged-in user is admin
  if (user?.email?.toLowerCase() !== 'dbaezh78@gmail.com') {
    return null;
  }

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'FIREBASE_READ':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'FIREBASE_WRITE':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'REALTIME':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case 'AUTH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2 text-xs font-mono border border-slate-700"
        title="Ver Logs del Sistema en tiempo real"
      >
        <Terminal size={16} className="text-emerald-400" />
        <span className="hidden sm:inline font-semibold">Logs ({logs.length})</span>
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-slate-950 text-slate-100 shadow-2xl flex flex-col h-full border-l border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <h3 className="font-mono font-bold text-sm text-white">Registro de Actividad (Logs)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearLogs}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                  title="Limpiar logs"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Subtitle */}
            <div className="px-4 py-2 bg-slate-900/30 text-[11px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-900">
              <span>Monitoreo de Firebase & Eventos de la App</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <RefreshCw size={10} className="animate-spin" /> En vivo
              </span>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No hay eventos registrados aún.</p>
                </div>
              ) : (
                logs.map((log: LogEntry) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-1 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getBadgeClass(log.type)}`}>
                        {log.type}
                      </span>
                      <span className="text-slate-500">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-200 font-medium text-xs break-words">{log.action}</p>
                    {log.details && (
                      <p className="text-slate-400 text-[11px] bg-slate-950/60 p-1.5 rounded border border-slate-900 break-all leading-relaxed">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
