import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SettingsModal from './components/SettingsModal';
import { useSettingsStore } from './store/useSettingsStore';

// ── Global button sounds ──────────────────────────────────────────────────────
const _clickSound = new Audio('/assets/sounds/button-click.wav');
const _hoverSound = new Audio('/assets/sounds/button-hover.wav');

document.addEventListener('click', (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button')) {
    const sfxVolume = useSettingsStore.getState().sfxVolume;
    _clickSound.volume = sfxVolume * 0.7; // Click is louder relative to hover
    _clickSound.currentTime = 0;
    _clickSound.play().catch(() => { /* swallow autoplay policy errors */ });
  }
});

let lastHoveredButton: Element | null = null;
document.addEventListener('mouseover', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button');
  
  if (button) {
    if (button !== lastHoveredButton) {
      const sfxVolume = useSettingsStore.getState().sfxVolume;
      _hoverSound.volume = sfxVolume * 0.3; // Hover is quieter
      _hoverSound.currentTime = 0;
      _hoverSound.play().catch(() => { /* swallow autoplay policy errors */ });
      lastHoveredButton = button;
    }
  } else {
    lastHoveredButton = null;
  }
});
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <SettingsModal />
    </>
  </StrictMode>,
);
