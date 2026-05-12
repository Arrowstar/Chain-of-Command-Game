import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ── Global button sounds ──────────────────────────────────────────────────────
const _clickSound = new Audio('/assets/sounds/button-click.wav');
_clickSound.volume = 0.35;
const _hoverSound = new Audio('/assets/sounds/button-hover.wav');
_hoverSound.volume = 0.15; // Hover sound should be quieter than the click

document.addEventListener('click', (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button')) {
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
    <App />
  </StrictMode>,
);
