import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import ShipInfoPanel, { type MapHoverTarget } from './ShipInfoPanel';

vi.mock('../../data/shipChassis', () => ({
  getChassisById: vi.fn(() => ({ className: 'Test-Class Cruiser' })),
}));

vi.mock('../../data/adversaries', () => ({
  getAdversaryById: vi.fn(() => ({ 
    name: 'Hegemony Hunter-Killer (Frigate)',
    volleyPool: ['d6', 'd6'],
    weaponRangeMin: 1,
    weaponRangeMax: 4,
    shieldsPerSector: 3,
  })),
}));

describe('ShipInfoPanel', () => {
  const position = { x: 20, y: 30 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no target is provided', () => {
    const { container } = render(<ShipInfoPanel target={null} position={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders player ship info with vessel name and class', () => {
    const target: MapHoverTarget = {
      kind: 'ship',
      isEnemy: false,
      ship: {
        id: 'ship-1', chassisId: 'c1', ownerId: 'p1', name: 'ISS Resolute', position: { q: 0, r: 0 }, facing: 0,
        currentSpeed: 2, currentHull: 8, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2, equippedWeapons: [], equippedSubsystems: [], criticalDamage: [], scars: [
          { id: 'scar-1', name: 'Damaged Bridge', effect: 'CT generation permanently reduced by 1 until repaired.', fromCriticalId: 'bridge-hit' },
        ],
        armorDie: 'd4', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false,
      } as any,
    };

    render(<ShipInfoPanel target={target} position={position} />);

    expect(screen.getByText('ISS Resolute')).toBeInTheDocument();
    expect(screen.getByText('Test-Class Cruiser')).toBeInTheDocument();
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
    expect(screen.getByText('Persistent Scars')).toBeInTheDocument();
    expect(screen.getByText('Damaged Bridge')).toBeInTheDocument();
    expect(screen.getByText('-1 CT/round')).toBeInTheDocument();
  });

  it('renders enemy vessel name and adversary class', () => {
    const target: MapHoverTarget = {
      kind: 'ship',
      isEnemy: true,
      ship: {
        id: 'enemy-1', adversaryId: 'hunter-killer', ownerId: 'ai', position: { q: 0, r: 0 }, facing: 0,
        name: 'Hegemony Hunter-Killer (Frigate) <Final Proclamation> (Flagship)',
        currentSpeed: 3, currentHull: 16, maxHull: 16,
        shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
        maxShieldsPerSector: 3, equippedWeapons: [], equippedSubsystems: [], criticalDamage: [],
        armorDie: 'd6', baseEvasion: 4, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false,
      } as any,
    };

    render(<ShipInfoPanel target={target} position={position} />);

    expect(screen.getByText('HEG Final Proclamation')).toBeInTheDocument();
    expect(screen.getByText('Flagship')).toBeInTheDocument();
    expect(screen.getByText('Hegemony Hunter-Killer (Frigate)')).toBeInTheDocument();
    expect(screen.getByText('16 / 16')).toBeInTheDocument();
    expect(screen.queryByText('Persistent Scars')).not.toBeInTheDocument();
  });

  it('extracts enemy ship names from class-prefixed guillemet labels', () => {
    const target: MapHoverTarget = {
      kind: 'ship',
      isEnemy: true,
      ship: {
        id: 'enemy-2', adversaryId: 'hegemony-corvette', ownerId: 'ai', position: { q: 0, r: 0 }, facing: 0,
        name: 'Hegemony Corvette (Fast Flanker) «Dread Herald»',
        currentSpeed: 4, currentHull: 8, maxHull: 8,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2, equippedWeapons: [], equippedSubsystems: [], criticalDamage: [],
        armorDie: 'd6', baseEvasion: 4, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false,
      } as any,
    };

    render(<ShipInfoPanel target={target} position={position} />);

    expect(screen.getByText('HEG Dread Herald')).toBeInTheDocument();
    expect(screen.queryByText(/Hegemony Corvette \(Fast Flanker\) «Dread Herald»/)).not.toBeInTheDocument();
  });

  it('renders terrain details for hazardous hexes', () => {
    const target: MapHoverTarget = {
      kind: 'terrain',
      terrainType: 'asteroids',
      coord: { q: 2, r: -1 },
    };

    render(<ShipInfoPanel target={target} position={position} />);

    expect(screen.getByText('Asteroid Field')).toBeInTheDocument();
    expect(screen.getByText('Hex 2, -1')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText(/Entering requires a D6 roll/)).toBeInTheDocument();
  });

  it('clamps the tooltip within its parent container bounds', () => {
    const target: MapHoverTarget = {
      kind: 'ship',
      isEnemy: false,
      ship: {
        id: 'ship-2', chassisId: 'c1', ownerId: 'p1', name: 'ISS Bulwark', position: { q: 0, r: 0 }, facing: 0,
        currentSpeed: 2, currentHull: 8, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2, equippedWeapons: [], equippedSubsystems: [], criticalDamage: [],
        scars: new Array(8).fill(null).map((_, index) => ({
          id: `scar-${index}`,
          name: `Scar ${index}`,
          effect: 'Test scar effect.',
          fromCriticalId: 'bridge-hit',
        })),
        armorDie: 'd4', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false,
      } as any,
    };

    const offsetWidthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
    const offsetHeightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
    const clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    const clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);

    const { getByTestId } = render(
      <div style={{ position: 'relative', width: '400px', height: '300px' }}>
        <ShipInfoPanel target={target} position={{ x: 340, y: 280 }} />
      </div>,
    );

    const panel = getByTestId('ship-info-panel');

    expect(panel).toHaveStyle({ left: '68px', top: '68px', maxHeight: 'calc(100% - 24px)' });

    offsetWidthSpy.mockRestore();
    offsetHeightSpy.mockRestore();
    clientWidthSpy.mockRestore();
    clientHeightSpy.mockRestore();
  });

  it('renders station schematic with shield arcs', () => {
    const target: MapHoverTarget = {
      kind: 'station',
      station: {
        id: 'station-1',
        stationId: 'mining-outpost',
        name: 'Mining Outpost',
        position: { q: 5, r: 5 },
        facing: 0,
        currentHull: 50,
        maxHull: 50,
        shields: { fore: 10, foreStarboard: 10, aftStarboard: 10, aft: 10, aftPort: 10, forePort: 10 },
        maxShieldsPerSector: 10,
        armorDie: 'd8',
        baseEvasion: 1,
        isDestroyed: false,
        remainingFighters: 0,
      } as any,
    };

    const { container } = render(<ShipInfoPanel target={target} position={position} />);

    // Check for station name
    expect(screen.getByText('Mining Outpost')).toBeInTheDocument();
    
    // Check for shield arc values in the SVG
    // There should be 6 arcs, each showing "10"
    const shieldTexts = container.querySelectorAll('svg text');
    let tenCount = 0;
    shieldTexts.forEach(t => {
      if (t.textContent === '10') tenCount++;
    });
    expect(tenCount).toBe(6);

    // Check for the station abbreviation (STN for mining outpost)
    expect(screen.getByText('STN')).toBeInTheDocument();
  });

  describe('Locking Behavior', () => {
    const target: MapHoverTarget = {
      kind: 'ship',
      isEnemy: false,
      ship: {
        id: 'ship-1', chassisId: 'c1', ownerId: 'p1', name: 'ISS Resolute', position: { q: 0, r: 0 }, facing: 0,
        currentSpeed: 2, currentHull: 8, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2, equippedWeapons: [], equippedSubsystems: [], criticalDamage: [], scars: [],
        armorDie: 'd4', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false,
      } as any,
    };

    it('starts with pointer-events: none and transitions to auto after 1 second', () => {
      const { getByTestId } = render(<ShipInfoPanel target={target} position={position} />);
      const panel = getByTestId('ship-info-panel');

      expect(panel).toHaveStyle({ pointerEvents: 'none' });

      // Advance time by 1.1 seconds to be safe
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(panel).toHaveStyle({ pointerEvents: 'auto' });
    });

    it('calls onClose when mouse leaves after locking', () => {
      const onClose = vi.fn();
      const { getByTestId } = render(<ShipInfoPanel target={target} position={position} onClose={onClose} />);
      const panel = getByTestId('ship-info-panel');

      // Move mouse out before locking
      act(() => {
        fireEvent.pointerLeave(panel);
      });
      expect(onClose).not.toHaveBeenCalled();

      // Lock the panel
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Move mouse out after locking
      act(() => {
        fireEvent.pointerLeave(panel);
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('resets progress when target changes', () => {
      const { getByTestId, rerender } = render(<ShipInfoPanel target={target} position={position} />);
      const panel = getByTestId('ship-info-panel');

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(panel).toHaveStyle({ pointerEvents: 'none' });

      const newTarget = { ...target, ship: { ...target.ship, id: 'ship-2' } };
      // Simulate remount via key change in parent (HexMap)
      act(() => {
        rerender(<ShipInfoPanel key="ship-2" target={newTarget} position={position} />);
      });
      
      const newPanel = getByTestId('ship-info-panel');
      act(() => {
        vi.advanceTimersByTime(500);
      });
      // If it hadn't reset, it would have locked by now (500 + 500 = 1000)
      expect(newPanel).toHaveStyle({ pointerEvents: 'none' });

      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(newPanel).toHaveStyle({ pointerEvents: 'auto' });
    });

    it('freezes position when locked', () => {
      const offsetWidthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
      const offsetHeightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
      const clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
      const clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);

      const { getByTestId, rerender } = render(<ShipInfoPanel target={target} position={{ x: 100, y: 100 }} />);
      const panel = getByTestId('ship-info-panel');

      // Initially moves
      rerender(<ShipInfoPanel target={target} position={{ x: 120, y: 120 }} />);
      expect(panel).toHaveStyle({ left: '120px', top: '120px' });

      // Lock it
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(panel).toHaveStyle({ pointerEvents: 'auto' });

      // Try to move it
      rerender(<ShipInfoPanel target={target} position={{ x: 200, y: 200 }} />);
      // Should still be at 120, 120
      expect(panel).toHaveStyle({ left: '120px', top: '120px' });

      offsetWidthSpy.mockRestore();
      offsetHeightSpy.mockRestore();
      clientWidthSpy.mockRestore();
      clientHeightSpy.mockRestore();
    });

    it('does not reset progress when target object identity changes but ID is same', () => {
      const { getByTestId, rerender } = render(<ShipInfoPanel target={target} position={position} />);
      
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Pass a new object literal with same content
      const targetClone = { ...target, ship: { ...target.ship } };
      rerender(<ShipInfoPanel target={targetClone} position={position} />);
      
      // Advance remaining 500ms
      act(() => {
        vi.advanceTimersByTime(550);
      });

      const panel = getByTestId('ship-info-panel');
      expect(panel).toHaveStyle({ pointerEvents: 'auto' });
    });
  });
});
