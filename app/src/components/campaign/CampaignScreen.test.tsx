import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import CampaignScreen from './CampaignScreen';
import { useCampaignStore } from '../../store/useCampaignStore';
import * as useViewportModule from '../../utils/useViewport';

const useViewportSpy = vi.spyOn(useViewportModule, 'useViewport');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock child components to keep the unit test lightweight and focused on CampaignScreen / DebugMenu
vi.mock('./SectorMapView', () => ({ default: () => <div data-testid="sector-map-view" /> }));
vi.mock('./DrydockView', () => ({ default: () => <div data-testid="drydock-view" /> }));
vi.mock('./NodeResolutionModal', () => ({ default: () => <div data-testid="node-resolution-modal" /> }));
vi.mock('./PostCombatSummary', () => ({ default: () => <div data-testid="post-combat-summary" /> }));
vi.mock('./CampaignLog', () => ({ default: () => <div data-testid="campaign-log" /> }));
vi.mock('./FleetFavorConversionPanel', () => ({ default: () => <div data-testid="fleet-favor-conversion" /> }));
vi.mock('./TechBadge', () => ({ default: () => <div data-testid="tech-badge" /> }));
vi.mock('./CampaignStoryScreen', () => ({ default: () => <div data-testid="campaign-story-screen" /> }));
vi.mock('./ScoreLedgerModal', () => ({ default: () => <div data-testid="score-ledger-modal" /> }));

describe('CampaignScreen', () => {
  beforeEach(() => {
    useViewportSpy.mockReturnValue({ isTablet: false, isPhone: false, isCoarsePointer: false } as any);
    
    // Set up store state
    useCampaignStore.setState({
      campaign: {
        id: 'test-campaign',
        currentSector: 1,
        requisitionPoints: 10,
        fleetFavor: 3,
        difficulty: 'standard',
        campaignPhase: 'sectorMap',
        experimentalTech: [],
        pendingEconomicBuffs: { nextStoreDiscountPercent: 0, freeRepairAtNextStation: false },
        currentScore: 0,
        completedSectors: 0,
        nodes: [],
        currentNodeId: null,
        paths: [],
        playerShips: [],
      } as any,
      persistedPlayers: [],
      persistedShips: [],
    });
  });

  it('renders sector map view by default', () => {
    render(<CampaignScreen onStartCombat={vi.fn()} onLeaveCampaign={vi.fn()} />);
    expect(screen.getByTestId('sector-map-view')).toBeInTheDocument();
  });

  it('opens and closes the campaign dev menu on mobile via 5-finger tap', () => {
    render(<CampaignScreen onStartCombat={vi.fn()} onLeaveCampaign={vi.fn()} />);

    // DEV menu should not be visible initially
    expect(screen.queryByTitle(/toggle debug tools/i)).not.toBeInTheDocument();

    // Trigger a touchstart event with 5 touch points
    act(() => {
      const touchEvent = new Event('touchstart') as any;
      touchEvent.touches = [{}, {}, {}, {}, {}];
      window.dispatchEvent(touchEvent);
    });

    // Dev menu trigger button should now be visible
    expect(screen.getByTitle(/toggle debug tools/i)).toBeInTheDocument();

    // Trigger it again to hide it
    act(() => {
      const touchEvent = new Event('touchstart') as any;
      touchEvent.touches = [{}, {}, {}, {}, {}];
      window.dispatchEvent(touchEvent);
    });

    // Should be hidden again
    expect(screen.queryByTitle(/toggle debug tools/i)).not.toBeInTheDocument();
  });
});
