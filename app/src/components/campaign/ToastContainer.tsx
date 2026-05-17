import React, { createContext, useContext, useState, useCallback } from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';

// ── Toast types ──────────────────────────────────────────────────────────────

export type ToastType = 'rp-gain' | 'rp-loss' | 'ff-gain' | 'ff-loss' | 'tech' | 'warning' | 'info' | 'system' | 'score-gain' | 'score-loss';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  value?: number;
}

// ── Zustand store — the stable backing for fireToast ─────────────────────────
// Using a store (instead of window.__campaignToast) means fireToast() is always
// callable regardless of whether the React component is mounted, and is immune
// to React StrictMode's effect cleanup / remount cycle.

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

/**
 * Fire a campaign toast from anywhere in the app — no React context or
 * component mount required.  Backed by a Zustand store so it is safe to call
 * during async operations, from utility classes, or from Zustand store actions.
 */
export function fireToast(toast: Omit<Toast, 'id'>) {
  useToastStore.getState().addToast(toast);
}

// ── Legacy Context API (kept for backward compat with ToastProvider) ──────────

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

// ── Standalone Container ──────────────────────────────────────────────────────

interface ToastContainerProps {
  /** When provided (e.g. from ToastProvider), these override the store toasts. */
  toasts?: Toast[];
}

export default function ToastContainer({ toasts: externalToasts }: ToastContainerProps) {
  // Subscribe to the module-level Zustand store for standalone usage
  const storeToasts = useToastStore(s => s.toasts);
  const toasts = externalToasts ?? storeToasts;

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
    case 'rp-gain':    return 'var(--color-alert-amber)';
    case 'rp-loss':    return 'var(--color-hostile-red)';
    case 'ff-gain':    return 'var(--color-holo-green)';
    case 'ff-loss':    return 'var(--color-hostile-red)';
    case 'tech':       return 'var(--color-holo-cyan)';
    case 'warning':    return 'var(--color-alert-amber)';
    case 'system':     return 'var(--color-holo-cyan)';
    case 'score-gain': return '#fbbf24';
    case 'score-loss': return '#f87171';
    case 'info':
    default:           return 'var(--color-border)';
  }
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'rp-gain':    return '⬆';
    case 'rp-loss':    return '⬇';
    case 'ff-gain':    return '★';
    case 'ff-loss':    return '☆';
    case 'tech':       return '🔬';
    case 'warning':    return '⚠';
    case 'system':     return '⚙';
    case 'score-gain': return '⚓';
    case 'score-loss': return '⚓';
    case 'info':
    default:           return 'ℹ';
  }
}

function getLabel(type: ToastType): string {
  switch (type) {
    case 'rp-gain':    return 'RP Gained';
    case 'rp-loss':    return 'RP Spent';
    case 'ff-gain':    return 'Fleet Favor +';
    case 'ff-loss':    return 'Fleet Favor −';
    case 'tech':       return 'Tech Acquired';
    case 'warning':    return 'Warning';
    case 'system':     return 'System';
    case 'score-gain': return 'Commendation +';
    case 'score-loss': return 'Commendation −';
    case 'info':
    default:           return 'Update';
  }
}
