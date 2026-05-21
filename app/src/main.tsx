import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SettingsModal from './components/SettingsModal';
import HowToPlayModal from './components/HowToPlayModal';
import SettingsButton from './components/SettingsButton';
import { useSettingsStore } from './store/useSettingsStore';

// ── Orientation lock ──────────────────────────────────────────────────────────
// Attempt to lock the screen to landscape. Works in Chrome/Android and when the
// app is installed as a PWA. Falls back silently on iOS Safari in-browser.
if (screen?.orientation?.lock) {
  screen.orientation.lock('landscape').catch(() => { /* Not supported in-browser on iOS */ });
}
// Prevent native context menu (long-press magnifier on iOS) from interrupting
// our DnD drag gestures globally.
document.addEventListener('contextmenu', (e) => e.preventDefault());
// ─────────────────────────────────────────────────────────────────────────────

const _clickSound = new Audio('/assets/sounds/button-click.wav');
const _hoverSound = new Audio('/assets/sounds/button-hover.wav');

document.addEventListener('click', (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button, [role="button"]')) {
    const sfxVolume = useSettingsStore.getState().sfxVolume;
    _clickSound.volume = sfxVolume * 0.7; // Click is louder relative to hover
    _clickSound.currentTime = 0;
    _clickSound.play().catch(() => { /* swallow autoplay policy errors */ });
  }
}, true); // Use capture phase to bypass e.stopPropagation() from inner elements

let lastHoveredButton: Element | null = null;
document.addEventListener('mouseover', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button, [role="button"]');
  
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
}, true);
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <SettingsButton />
      <SettingsModal />
      <HowToPlayModal />
    </>
  </StrictMode>,
);
