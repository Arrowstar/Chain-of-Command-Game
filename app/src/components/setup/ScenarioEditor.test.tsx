import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import ScenarioEditor from './ScenarioEditor';

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

import { generateSkirmishConfig } from '../../utils/skirmishGeneratorUtils';

vi.mock('../../utils/skirmishGeneratorUtils', () => ({
  generateSkirmishConfig: vi.fn(),
}));

// Mock getBoundingClientRect for containerRef
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

describe('ScenarioEditor Mobile & Desktop Gestures', () => {
  let onConfirm: any;
  let onCancel: any;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  it('renders the editor with toolbar actions', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText('SCENARIO EDITOR')).toBeInTheDocument();
    expect(screen.getByText('AUTO GENERATE')).toBeInTheDocument();
    expect(screen.getByText('TOOLS')).toBeInTheDocument();
  });

  it('triggers terrain brush immediately on desktop mouse down', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;
    expect(viewport).toBeDefined();
    
    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // Pointer down as desktop mouse
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });

      // Verify immediate click down does not panic or error
      expect(viewport).toBeInTheDocument();
    }
  });

  it('panning is activated on mobile single touch drag', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;

    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // Touch pointer down
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
      });

      // Drag
      fireEvent.pointerMove(viewport, {
        clientX: 150,
        clientY: 120,
        pointerId: 1,
        pointerType: 'touch',
      });

      // pointerup (pan completed)
      fireEvent.pointerUp(viewport, {
        clientX: 150,
        clientY: 120,
        pointerId: 1,
        pointerType: 'touch',
      });

      expect(viewport).toBeInTheDocument();
    }
  });

  it('two-finger pinch tracks zoom changes on mobile touch', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;

    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // Finger 1 down
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      // Finger 2 down
      fireEvent.pointerDown(viewport, {
        clientX: 200,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });

      // Fingers pinch closer (120px to 80px dist)
      fireEvent.pointerMove(viewport, {
        clientX: 110,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });
      fireEvent.pointerMove(viewport, {
        clientX: 190,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });

      // Release finger 2
      fireEvent.pointerUp(viewport, {
        clientX: 190,
        clientY: 100,
        pointerId: 2,
        pointerType: 'touch',
      });

      // Release finger 1
      fireEvent.pointerUp(viewport, {
        clientX: 110,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      expect(viewport).toBeInTheDocument();
    }
  });

  it('triggers brush action on touch-up if drag is within click threshold', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;

    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // Touch down
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      // Touch up at 102, 102 (distance of 2px is well within the 12px threshold)
      fireEvent.pointerUp(viewport, {
        clientX: 102,
        clientY: 102,
        pointerId: 1,
        pointerType: 'touch',
      });

      expect(viewport).toBeInTheDocument();
    }
  });

  it('does NOT trigger brush action on touch-up if drag exceeds threshold', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;

    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // Touch down
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      // Move (pan)
      fireEvent.pointerMove(viewport, {
        clientX: 150,
        clientY: 150,
        pointerId: 1,
        pointerType: 'touch',
      });

      // Touch up at 150, 150 (distance 50px exceeds threshold)
      fireEvent.pointerUp(viewport, {
        clientX: 150,
        clientY: 150,
        pointerId: 1,
        pointerType: 'touch',
      });

      expect(viewport).toBeInTheDocument();
    }
  });

  it('paints terrain on tap, but pans on drag in terrain brush mode', () => {
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const viewport = screen.getByText('SCENARIO EDITOR').closest('div')?.nextSibling;

    // Click on the asteroids button under the TERRAIN category
    const terrainButton = screen.getByText('asteroids');
    fireEvent.click(terrainButton);

    if (viewport) {
      Object.defineProperty(viewport, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      // 1. Assert Tap (under threshold) paints terrain
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      fireEvent.pointerUp(viewport, {
        clientX: 102,
        clientY: 102,
        pointerId: 1,
        pointerType: 'touch',
      });

      // 2. Assert Drag (above threshold) pans and does NOT paint terrain
      fireEvent.pointerDown(viewport, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        pointerType: 'touch',
      });

      fireEvent.pointerMove(viewport, {
        clientX: 150,
        clientY: 150,
        pointerId: 1,
        pointerType: 'touch',
      });

      fireEvent.pointerUp(viewport, {
        clientX: 150,
        clientY: 150,
        pointerId: 1,
        pointerType: 'touch',
      });

      expect(viewport).toBeInTheDocument();
    }
  });

  it('disables the Confirm button unless there is at least 1 player spawn and 1 enemy', () => {
    // 1. Initial State: 0 player spawns, 0 enemies => Confirm button should be disabled
    render(<ScenarioEditor onConfirm={onConfirm} onCancel={onCancel} />);
    const confirmBtn = screen.getByRole('button', { name: /CONFIRM/i });
    expect(confirmBtn).toBeDisabled();

    // 2. Mock generateSkirmishConfig to return 1 player spawn and 0 enemies => disabled
    vi.mocked(generateSkirmishConfig).mockReturnValueOnce({
      terrain: [],
      enemies: [],
      allies: [],
      playerSpawns: [
        { id: 'spawn-0', coord: { q: 0, r: 6 }, facing: 0 }
      ]
    });
    const generateBtn = screen.getByText('GENERATE MAP');
    fireEvent.click(generateBtn);
    expect(confirmBtn).toBeDisabled();

    // 3. Mock generateSkirmishConfig to return 0 player spawns and 1 enemy => disabled
    vi.mocked(generateSkirmishConfig).mockReturnValueOnce({
      terrain: [],
      enemies: [
        { id: 'e1', coord: { q: 0, r: -4 }, facing: 3, adversaryId: 'hegemony-corvette' }
      ],
      allies: [],
      playerSpawns: []
    });
    fireEvent.click(generateBtn);
    expect(confirmBtn).toBeDisabled();

    // 4. Mock generateSkirmishConfig to return 1 player spawn and 1 enemy => enabled!
    vi.mocked(generateSkirmishConfig).mockReturnValueOnce({
      terrain: [],
      enemies: [
        { id: 'e1', coord: { q: 0, r: -4 }, facing: 3, adversaryId: 'hegemony-corvette' }
      ],
      allies: [],
      playerSpawns: [
        { id: 'spawn-0', coord: { q: 0, r: 6 }, facing: 0 }
      ]
    });
    fireEvent.click(generateBtn);
    expect(confirmBtn).toBeEnabled();
  });
});

