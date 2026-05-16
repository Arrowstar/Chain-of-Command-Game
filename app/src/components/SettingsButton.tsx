import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

export default function SettingsButton() {
  const openSettings = useSettingsStore(s => s.openSettings);

  return (
    <button
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
      title="Menu"
      aria-label="Open Menu"
      data-testid="settings-btn"
    >
      ☰
    </button>
  );
}
