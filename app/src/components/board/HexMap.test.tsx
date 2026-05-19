import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import HexMap from './HexMap';
import { useUIStore } from '../../store/useUIStore';

// Mock PIXI.js
vi.mock('pixi.js', () => {
  return {
    Application: class {
      view = document.createElement('canvas');
      stage = {
        addChild: vi.fn(),
      };
      screen = { width: 800, height: 600 };
      ticker = { add: vi.fn() };
      destroy = vi.fn();
    },
    Container: class {
      position = {
        set: vi.fn(),
      };
      scale = {
        set: vi.fn(),
      };
      addChild = vi.fn();
      removeChild = vi.fn();
      removeChildren = vi.fn().mockReturnValue([]);
      getChildByName = vi.fn().mockReturnValue(null);
    },
    Graphics: class {
      position = { set: vi.fn() };
      clear = vi.fn().mockReturnThis();
      lineStyle = vi.fn().mockReturnThis();
      beginFill = vi.fn().mockReturnThis();
      endFill = vi.fn().mockReturnThis();
      drawCircle = vi.fn().mockReturnThis();
      drawRect = vi.fn().mockReturnThis();
      moveTo = vi.fn().mockReturnThis();
      lineTo = vi.fn().mockReturnThis();
      closePath = vi.fn().mockReturnThis();
      removeChildren = vi.fn().mockReturnValue([]);
      addChild = vi.fn();
      destroy = vi.fn();
      getChildByName = vi.fn().mockReturnValue(null);
    },
    TextStyle: class {},
    Text: class {
      width = 50;
      height = 20;
      x = 0;
      y = 0;
      addChild = vi.fn();
    },
    Sprite: {
      from: vi.fn().mockImplementation(() => {
        return {
          name: '',
          anchor: {
            set: vi.fn(),
          },
          width: 0,
          height: 0,
          tint: 0,
        };
      }),
    },
  };
});

// Mock Combat SFX to avoid JSDOM audio element play errors
vi.mock('../../utils/useCombatSfx', () => ({
  playCombatSfx: vi.fn(),
}));

const mockGetBoundingClientRect = () => {
  return {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
};

describe('HexMap Mouse Wheel & Touch Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.getState().setCameraPosition(0, 0, 1);
  });

  it('renders the hex map successfully', () => {
    const { container } = render(<HexMap />);
    expect(container.firstChild).toBeInTheDocument();
  });

  describe('Mouse Scroll Wheel Functionality', () => {
    it('zooms out when scrolling standard mouse wheel down', () => {
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      fireEvent.wheel(mapContainer, {
        deltaY: 100,
        deltaX: 0,
        ctrlKey: false,
        deltaMode: 0,
      });

      expect(zoomSpy).toHaveBeenCalledWith(-0.1);
    });

    it('zooms in when scrolling standard mouse wheel up', () => {
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      fireEvent.wheel(mapContainer, {
        deltaY: -100,
        deltaX: 0,
        ctrlKey: false,
        deltaMode: 0,
      });

      expect(zoomSpy).toHaveBeenCalledWith(0.1);
    });

    it('zooms in/out on Firefox line-mode wheel events', () => {
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      // Firefox line-scrolling (deltaMode = 1, deltaY = 3 or -3)
      fireEvent.wheel(mapContainer, {
        deltaY: 3,
        deltaX: 0,
        ctrlKey: false,
        deltaMode: 1,
      });

      expect(zoomSpy).toHaveBeenCalledWith(-0.1);
    });

    it('pans instead of zooming on trackpad smooth scrolls (horizontal delta)', () => {
      const panSpy = vi.spyOn(useUIStore.getState(), 'panCamera');
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      // Swipe trackpad: horizontal movement present
      fireEvent.wheel(mapContainer, {
        deltaY: 5,
        deltaX: 12,
        ctrlKey: false,
        deltaMode: 0,
      });

      expect(panSpy).toHaveBeenCalledWith(-12, -5);
      expect(zoomSpy).not.toHaveBeenCalled();
    });

    it('pans instead of zooming on trackpad smooth scrolls (fractional deltaY)', () => {
      const panSpy = vi.spyOn(useUIStore.getState(), 'panCamera');
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      // Swipe trackpad: fractional deltaY
      fireEvent.wheel(mapContainer, {
        deltaY: 4.5,
        deltaX: 0,
        ctrlKey: false,
        deltaMode: 0,
      });

      expect(panSpy).toHaveBeenCalledWith(-0, -4.5);
      expect(zoomSpy).not.toHaveBeenCalled();
    });

    it('pans instead of zooming on trackpad smooth scrolls (small deltaY < 40)', () => {
      const panSpy = vi.spyOn(useUIStore.getState(), 'panCamera');
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      // Swipe trackpad: small integer deltaY
      fireEvent.wheel(mapContainer, {
        deltaY: 15,
        deltaX: 0,
        ctrlKey: false,
        deltaMode: 0,
      });

      expect(panSpy).toHaveBeenCalledWith(-0, -15);
      expect(zoomSpy).not.toHaveBeenCalled();
    });

    it('zooms when pinch-to-zoom trackpad gesture is active (ctrlKey: true)', () => {
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      fireEvent.wheel(mapContainer, {
        deltaY: 50,
        deltaX: 0,
        ctrlKey: true,
        deltaMode: 0,
      });

      expect(zoomSpy).toHaveBeenCalledWith(-0.1);
    });
  });

  describe('Touch Screen Pan and Zoom Functionality', () => {
    it('pans the camera on mobile single-touch drag gesture', () => {
      const panSpy = vi.spyOn(useUIStore.getState(), 'panCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      Object.defineProperty(mapContainer, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // 1. Single touch down
      fireEvent.pointerDown(mapContainer, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      // 2. Drag finger to the right (clientX increases, map should pan right)
      fireEvent.pointerMove(mapContainer, {
        clientX: 150,
        clientY: 120,
        pointerId: 1,
        pointerType: 'touch',
      });

      // We expect the map to pan by the distance swiped (50, 20)
      expect(panSpy).toHaveBeenCalledWith(50, 20);

      // 3. Touch release
      fireEvent.pointerUp(mapContainer, {
        clientX: 150,
        clientY: 120,
        pointerId: 1,
        pointerType: 'touch',
      });
    });

    it('zooms the camera on two-finger pinch gesture', () => {
      const zoomSpy = vi.spyOn(useUIStore.getState(), 'zoomCamera');
      const { container } = render(<HexMap />);
      const mapContainer = container.firstChild as HTMLDivElement;

      Object.defineProperty(mapContainer, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // 1. Finger 1 down
      fireEvent.pointerDown(mapContainer, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      // 2. Finger 2 down (Initial distance = 100px)
      fireEvent.pointerDown(mapContainer, {
        clientX: 200,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });

      // 3. Pinch fingers closer (100px -> 60px dist)
      fireEvent.pointerMove(mapContainer, {
        clientX: 120,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });
      fireEvent.pointerMove(mapContainer, {
        clientX: 180,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });

      // Expected zoom delta is negative (zooming out) because pinch distance decreased
      expect(zoomSpy).toHaveBeenCalled();
      const lastCallArg = zoomSpy.mock.calls[zoomSpy.mock.calls.length - 1][0];
      expect(lastCallArg).toBeLessThan(0);

      // 4. Release fingers
      fireEvent.pointerUp(mapContainer, {
        clientX: 180,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });
      fireEvent.pointerUp(mapContainer, {
        clientX: 120,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });
    });
  });
});
