import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';
import { FIGHTER_CLASSES } from '../../data/fighters';

export default function TargetingPromptOverlay() {
  const targetingMode = useUIStore(s => s.targetingMode);
  const activeTargetingAction = useUIStore(s => s.activeTargetingAction);
  const activeTargetingContext = useUIStore(s => s.activeTargetingContext);
  const clearTargeting = useUIStore(s => s.clearTargeting);

  const promptText = (() => {
    if (!targetingMode) return '';
    const ctx = activeTargetingContext;
    if (targetingMode === 'hex' && ctx?.classId) {
      const fc = FIGHTER_CLASSES[ctx.classId as string];
      return `SELECT DEPLOYMENT HEX FOR ${fc?.name?.toUpperCase() ?? 'FIGHTER'}...`;
    } else if (targetingMode === 'hex') {
      return 'SELECT ADJACENT HEX FOR DEPLOYMENT...';
    } else if (ctx?.phase === 'pickTarget') {
      const beh = ctx?.behavior as string | undefined;
      const isDefensive = beh === 'escort' || beh === 'screen';
      if (isDefensive) return `SELECT FRIENDLY SHIP TO ${beh === 'escort' ? 'ESCORT' : 'SCREEN'}...`;
      return 'SELECT ENEMY ENGAGEMENT TARGET...';
    } else if (activeTargetingAction?.actionId === 'vector-orders') {
      const beh = ctx?.behavior as string | undefined;
      const isDefensive = beh === 'escort' || beh === 'screen';
      if (isDefensive) return `SELECT FRIENDLY SHIP TO ${beh === 'escort' ? 'ESCORT' : 'SCREEN'}...`;
      return 'SELECT ENEMY ENGAGEMENT TARGET...';
    } else if (activeTargetingAction?.actionId === 'target-lock') {
      return 'SELECT ENEMY SHIP TO LOCK ONTO...';
    } else if (activeTargetingAction?.actionId.startsWith('fire-')) {
      return 'SELECT ENEMY TARGET TO FIRE UPON...';
    } else if (activeTargetingAction?.actionId === 'electronic-warfare') {
      return 'SELECT ENEMY TARGET TO JAM...';
    } else if (activeTargetingAction?.actionId === 'sensor-sweep') {
      return 'SELECT ENEMY TARGET TO SCAN...';
    } else if (activeTargetingAction?.actionId === 'boarding-party') {
      return 'SELECT ENEMY SHIP TO BOARD...';
    } else if (targetingMode === 'ship') {
      return 'SELECT TARGET SHIP...';
    }
    return 'AWAITING TARGET COORDINATES...';
  })();

  const isDefensive = promptText.includes('FRIENDLY') || promptText.includes('DEPLOYMENT');
  const icon = isDefensive ? '🛡' : '🎯';
  const color = isDefensive ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)';
  const border = isDefensive ? 'rgba(0, 204, 255, 0.6)' : 'rgba(255, 68, 0, 0.6)';
  const bg = isDefensive ? 'rgba(0, 15, 25, 0.95)' : 'rgba(20, 10, 5, 0.95)';
  const glow = isDefensive ? '0 0 10px rgba(0, 204, 255, 0.3)' : '0 0 10px rgba(255, 68, 0, 0.3)';

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        right: 16,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {targetingMode && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '12px 16px',
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: '8px',
              boxShadow: glow,
              pointerEvents: 'auto',
              backdropFilter: 'blur(8px)',
              width: 'min(300px, calc(100vw - 32px))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.2rem', color: color, lineHeight: 1 }}>{icon}</div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', lineHeight: 1.4, flex: 1, fontWeight: 'bold' }}>
                {promptText}
              </div>
            </div>
            <button 
              className="btn" 
              style={{ padding: '6px 12px', fontSize: '0.75rem', alignSelf: 'flex-end', borderColor: border, color: color }} 
              onClick={clearTargeting}
            >
              CANCEL TARGETING
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
