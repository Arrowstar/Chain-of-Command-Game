import { useState, useEffect } from 'react';

export interface ViewportState {
  width: number;
  height: number;
  /** True when viewport width is ≤ 1280px (tablet landscape threshold). */
  isTablet: boolean;
  /**
   * True when the device is a phone.
   *
   * Detected by checking the shortest edge of the viewport.
   * Phones universally have a shortest edge (portrait width) < 600px
   * (e.g., iPhone 14 Pro Max is 430px, Galaxy S20 is 360px).
   * Tablets universally have a shortest edge >= 600px (e.g., iPad is 768px).
   */
  isPhone: boolean;
  /** True when the primary input is coarse (touch). */
  isCoarsePointer: boolean;
}

function getState(): ViewportState {
  const isCoarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  const width  = typeof window !== 'undefined' ? window.innerWidth  : 1920;
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Find the smallest dimension, regardless of orientation
  const shortestEdge = Math.min(width, height);

  // Phones have a shortest edge under 600px. Tablets/Desktops are larger.
  const isPhone = shortestEdge < 600 && isCoarsePointer;
  const isTablet = shortestEdge >= 600 && width <= 1280;

  return { width, height, isTablet, isPhone, isCoarsePointer };
}

/**
 * Hook that returns the current viewport state and updates on resize/orientation change.
 */
export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>(getState);

  useEffect(() => {
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setViewport(getState()), 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Sync the is-phone class to the body for CSS scoping
  useEffect(() => {
    if (viewport.isPhone) {
      document.body.classList.add('is-phone');
    } else {
      document.body.classList.remove('is-phone');
    }
  }, [viewport.isPhone]);

  return viewport;
}
