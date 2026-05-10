import { useState, useEffect } from 'react';

export interface ViewportState {
  width: number;
  height: number;
  /** True when viewport width is ≤ 1280px (tablet landscape threshold). */
  isTablet: boolean;
  /** True when the primary input is coarse (touch). */
  isCoarsePointer: boolean;
}

function getState(): ViewportState {
  const isCoarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
  return {
    width,
    height,
    isTablet: width <= 1280,
    isCoarsePointer,
  };
}

/**
 * Returns live information about the current viewport and input type.
 * Uses `window.matchMedia('(pointer: coarse)')` to detect touch screens.
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(getState);

  useEffect(() => {
    const update = () => setState(getState());

    window.addEventListener('resize', update);
    
    const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    const mql = hasMatchMedia ? window.matchMedia('(pointer: coarse)') : null;
    
    if (mql) {
      mql.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (mql) {
        mql.removeEventListener('change', update);
      }
    };
  }, []);

  return state;
}
