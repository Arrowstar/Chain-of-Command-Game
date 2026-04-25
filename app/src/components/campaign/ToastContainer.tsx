import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Toast types ──────────────────────────────────────────────────────────────

export type ToastType = 'rp-gain' | 'rp-loss' | 'ff-gain' | 'ff-loss' | 'tech' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  value?: number;
}

// ── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider + Container ─────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

// ── Standalone Container (used by App.tsx when not using provider) ────────────

interface ToastContainerProps {
  toasts?: Toast[];
}

export default function ToastContainer({ toasts: externalToasts }: ToastContainerProps) {
  // When used standalone (not via provider), we listen to campaign store mutations
  const [internalToasts, setInternalToasts] = useState<Toast[]>([]);

  const addInternal = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setInternalToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setInternalToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Expose globally so CampaignStore can dispatch toasts
  useEffect(() => {
    (window as any).__campaignToast = addInternal;
    return () => { delete (window as any).__campaignToast; };
  }, [addInternal]);

  const toasts = externalToasts ?? internalToasts;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--space-lg)',
      right: 'var(--space-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: '6px',
              border: `1px solid ${getBorderColor(toast.type)}`,
              background: 'var(--color-bg-panel)',
              boxShadow: `0 0 20px ${getBorderColor(toast.type)}40`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              minWidth: '220px',
              maxWidth: '320px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{getIcon(toast.type)}</span>
            <div>
              <div style={{ color: getBorderColor(toast.type), fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {getLabel(toast.type)}
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                {toast.message}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getBorderColor(type: ToastType): string {
  switch (type) {
    case 'rp-gain':  return 'var(--color-alert-amber)';
    case 'rp-loss':  return 'var(--color-hostile-red)';
    case 'ff-gain':  return 'var(--color-holo-green)';
    case 'ff-loss':  return 'var(--color-hostile-red)';
    case 'tech':     return 'var(--color-holo-cyan)';
    case 'warning':  return 'var(--color-alert-amber)';
    case 'info':
    default:         return 'var(--color-border)';
  }
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'rp-gain':  return '⬆';
    case 'rp-loss':  return '⬇';
    case 'ff-gain':  return '★';
    case 'ff-loss':  return '☆';
    case 'tech':     return '🔬';
    case 'warning':  return '⚠';
    case 'info':
    default:         return 'ℹ';
  }
}

function getLabel(type: ToastType): string {
  switch (type) {
    case 'rp-gain':  return 'RP Gained';
    case 'rp-loss':  return 'RP Spent';
    case 'ff-gain':  return 'Fleet Favor +';
    case 'ff-loss':  return 'Fleet Favor −';
    case 'tech':     return 'Tech Acquired';
    case 'warning':  return 'Warning';
    case 'info':
    default:         return 'Update';
  }
}

/** Utility: fire a toast from anywhere in the app (no React context needed) */
export function fireToast(toast: Omit<Toast, 'id'>) {
  const fn = (window as any).__campaignToast;
  if (fn) fn(toast);
}
