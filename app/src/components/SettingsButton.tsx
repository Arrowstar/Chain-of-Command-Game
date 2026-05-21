import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { SmartTooltip } from './TouchTooltipPortal';

export default function SettingsButton() {
  const openSettings = useSettingsStore(s => s.openSettings);

  return (
    <SmartTooltip 
      content="Menu" 
      as="button"
      className="btn btn--secondary"
      style={{
        position: 'fixed',
        top: '8px',
        left: '8px',
        zIndex: 200,
        padding: '6px 12px',
        fontSize: '1.1rem',
        minWidth: '40px',
        lineHeight: 1,
      }}
      onClick={openSettings}
      aria-label="Open Menu"
      data-testid="settings-btn"
    >
      ☰
    </SmartTooltip>
  );
}
