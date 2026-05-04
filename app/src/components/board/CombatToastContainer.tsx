import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type CombatToastType = 
  | 'enemy-destroyed'
  | 'player-destroyed'
  | 'fighter-destroyed'
  | 'critical'
  | 'fumble'
  | 'ff-gain'
  | 'ff-loss'
  | 'phase'
  | 'tactic'
  | 'objective'
  | 'warning';

export interface CombatToast {
  id: string;
  type: CombatToastType;
  message: string;
  duration?: number; // Defaults to 3500ms
}

declare global {
  interface Window {
    __combatToast?: (toast: Omit<CombatToast, 'id'>) => void;
  }
}

export function fireCombatToast(toast: Omit<CombatToast, 'id'>) {
  if (window.__combatToast) {
    window.__combatToast(toast);
  } else {
    console.warn('CombatToastContainer not mounted, ignoring toast:', toast);
  }
}

const TYPE_CONFIGS: Record<CombatToastType, { icon: string; border: string; bg: string; text: string; glow?: string }> = {
  'enemy-destroyed': {
    icon: '☠',
    border: 'rgba(255, 68, 0, 0.6)',
    bg: 'rgba(20, 10, 5, 0.95)',
    text: 'var(--color-hostile-red)',
  },
  'player-destroyed': {
    icon: '☠',
    border: 'rgba(255, 0, 0, 0.9)',
    bg: 'rgba(40, 0, 0, 0.95)',
    text: '#FF3333',
    glow: '0 0 15px rgba(255,0,0,0.5)',
  },
  'fighter-destroyed': {
    icon: '☠',
    border: 'rgba(255, 180, 0, 0.5)',
    bg: 'rgba(20, 15, 0, 0.95)',
    text: 'var(--color-alert-amber)',
  },
  'critical': {
    icon: '★',
    border: 'rgba(255, 215, 0, 0.8)',
    bg: 'rgba(30, 25, 0, 0.95)',
    text: '#FFD700',
    glow: '0 0 10px rgba(255, 215, 0, 0.3)',
  },
  'fumble': {
    icon: '⚡',
    border: 'rgba(255, 150, 0, 0.6)',
    bg: 'rgba(20, 10, 0, 0.95)',
    text: 'var(--color-alert-amber)',
  },
  'ff-gain': {
    icon: '★',
    border: 'rgba(0, 255, 136, 0.6)',
    bg: 'rgba(0, 20, 10, 0.95)',
    text: 'var(--color-success-green)',
  },
  'ff-loss': {
    icon: '☆',
    border: 'rgba(255, 68, 0, 0.6)',
    bg: 'rgba(20, 10, 5, 0.95)',
    text: 'var(--color-hostile-red)',
  },
  'phase': {
    icon: '⊡',
    border: 'rgba(0, 204, 255, 0.6)',
    bg: 'rgba(0, 15, 25, 0.95)',
    text: 'var(--color-holo-cyan)',
  },
  'tactic': {
    icon: '🎯',
    border: 'rgba(255, 150, 0, 0.6)',
    bg: 'rgba(20, 10, 0, 0.95)',
    text: 'var(--color-alert-amber)',
  },
  'objective': {
    icon: '✓',
    border: 'rgba(0, 255, 136, 0.6)',
    bg: 'rgba(0, 20, 10, 0.95)',
    text: 'var(--color-success-green)',
  },
  'warning': {
    icon: '⚠',
    border: 'rgba(255, 150, 0, 0.6)',
    bg: 'rgba(20, 10, 0, 0.95)',
    text: 'var(--color-alert-amber)',
  },
};

export default function CombatToastContainer() {
  const [toasts, setToasts] = useState<CombatToast[]>([]);

  const addToast = useCallback((toastData: Omit<CombatToast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => {
      const next = [...prev, { ...toastData, id }];
      if (next.length > 4) {
        return next.slice(next.length - 4);
      }
      return next;
    });

    const duration = toastData.duration || 3500;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    window.__combatToast = addToast;
    return () => {
      if (window.__combatToast === addToast) {
        delete window.__combatToast;
      }
    };
  }, [addToast]);

  return (
    <div
      style={{
        position: 'fixed',
        left: '68px',
        bottom: '16px',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
        zIndex: 9998,
        pointerEvents: 'none',
        width: 'min(380px, calc(50vw - 80px))',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const config = TYPE_CONFIGS[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: -60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: '8px',
                boxShadow: config.glow || '0 4px 12px rgba(0,0,0,0.5)',
                pointerEvents: 'auto',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  fontSize: '1.2rem',
                  color: config.text,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '24px',
                }}
              >
                {config.icon}
              </div>
              <div
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {toast.message}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
