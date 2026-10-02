import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'FIREBASE_READ' | 'FIREBASE_WRITE' | 'APP_ACTION' | 'AUTH' | 'REALTIME';
  action: string;
  details?: string;
}

interface LoggerContextType {
  logs: LogEntry[];
  addLog: (type: LogEntry['type'], action: string, details?: string) => void;
  clearLogs: () => void;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: LogEntry['type'], action: string, details?: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('es-DO', { hour12: true }),
      type,
      action,
      details,
    };
    console.log(`[${type}] ${action}`, details || '');
    setLogs((prev) => [entry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    addLog('APP_ACTION', 'Sistema de logs inicializado');
  }, []);

  return (
    <LoggerContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger() {
  const ctx = useContext(LoggerContext);
  if (!ctx) {
    // Return dummy fallback if consumed outside provider
    return {
      logs: [],
      addLog: (type: LogEntry['type'], action: string, details?: string) => {
        console.log(`[${type}] ${action}`, details || '');
      },
      clearLogs: () => {},
    };
  }
  return ctx;
}
