import { renderHook } from '@testing-library/react';
import { useViewport } from './useViewport';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useViewport', () => {
  let originalMatchMedia: any;
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
    Object.defineProperty(window, 'innerWidth', { writable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: originalInnerHeight });
  });

  it('handles missing window.matchMedia gracefully (e.g., in JSDOM)', () => {
    // Simulate JSDOM environment without matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isCoarsePointer).toBe(false);
  });

  it('detects coarse pointer when matchMedia matches', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isCoarsePointer).toBe(true);
  });

  it('detects tablet layout width <= 1280px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isTablet).toBe(true);
  });

  it('detects non-tablet layout width > 1280px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isTablet).toBe(false);
  });

  it('detects a phone when the shortest edge is < 600px (e.g. S20 landscape: 800x360)', () => {
    Object.defineProperty(window, 'innerWidth',  { writable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 360 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isPhone).toBe(true);
  });

  it('detects a phone when the shortest edge is < 600px (e.g. S20 portrait: 360x800)', () => {
    Object.defineProperty(window, 'innerWidth',  { writable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isPhone).toBe(true);
  });

  it('does not flag a tablet as a phone when the shortest edge is >= 600px (e.g. iPad: 1024x768)', () => {
    Object.defineProperty(window, 'innerWidth',  { writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isPhone).toBe(false);
  });
});
