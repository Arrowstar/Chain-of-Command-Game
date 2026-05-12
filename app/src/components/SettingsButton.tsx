import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

export default function SettingsButton() {
  const openSettings = useSettingsStore(s => s.openSettings);

  return (
    <button
      className="btn btn--secondary"
      style={{ padding: '6px 12px', fontSize: '1rem', minWidth: '40px' }}
      onClick={openSettings}
      title="System Settings"
      aria-label="Open System Settings"
      data-testid="settings-btn"
    >
      ⚙
    </button>
  );
}
