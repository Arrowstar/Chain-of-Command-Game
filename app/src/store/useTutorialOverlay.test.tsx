/**
 * TutorialOverlay Component Tests
 *
 * Covers:
 * - Renders nothing when tutorial is inactive
 * - Renders the dialogue panel when active
 * - Shows the admiral portrait
 * - Shows dialogue text (first step)
 * - Typewriter effect: click-to-skip fills dialogue immediately
 * - "Next" button is disabled while typewriter is running
 * - "Next" button advances steps
 * - Progress bar updates with steps
 * - Condition-gated steps: "Next" disabled until condition met
 * - Condition hint is shown when condition not met
 * - Skip Tutorial calls endTutorial
 * - Last step shows "Begin Free Play" and calls endTutorial
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { useTutorialStore } from './useTutorialStore';
import { useGameStore } from './useGameStore';
import type { TutorialStep } from './useTutorialStore';

// Mock the heavy game store so PixiJS / canvas modules don't need to load
vi.mock('./useGameStore', () => ({
  useGameStore: vi.fn((selector: any) => {
    // Return sensible defaults for the condition checker
    const state = {
      phase: 'command',
      round: 1,
      players: [],
    };
    return selector ? selector(state) : state;
  }),
}));

// Helper to override what useGameStore returns for a specific test
function mockGameState(state: { phase?: string; round?: number; players?: any[] }) {
  const merged = { phase: 'command', round: 1, players: [], ...state };
  (useGameStore as any).mockImplementation((selector: any) =>
    selector ? selector(merged) : merged
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function resetStores() {
  useTutorialStore.setState({
    isActive: false,
    isHidden: false,
    currentStep: 0,
    isFreePlay: false,
  });
  // Minimal game store state so condition helpers don't throw
  mockGameState({
    phase: 'command',
    round: 1,
    players: [],
  });
}

/** A minimal step with no condition — "Next" always available once typing done */
const INSTANT_STEP: TutorialStep = {
  dialogue: 'Hello, Captain.',
};

/** A step that requires PHASE_EXECUTION before "Next" is clickable */
const GATED_STEP: TutorialStep = {
  dialogue: 'Please execute orders now.',
  waitForCondition: 'PHASE_EXECUTION',
  conditionHint: 'Click Execute Orders to continue.',
};

// ── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  resetStores();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────

describe('TutorialOverlay — visibility', () => {
  it('renders nothing when tutorial is inactive', () => {
    useTutorialStore.setState({ isActive: false });
    const { container } = render(<TutorialOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when isFreePlay is true', () => {
    useTutorialStore.setState({ isActive: true, isFreePlay: true });
    const { container } = render(<TutorialOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the overlay when active and not in free play', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);
    expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('tutorial-dialogue-panel')).toBeInTheDocument();
  });
});

describe('TutorialOverlay — admiral portrait', () => {
  it('renders the admiral portrait placeholder', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);
    expect(screen.getByTestId('tutorial-admiral-portrait')).toBeInTheDocument();
  });

  it('shows the admiral name label', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);
    expect(screen.getByText(/ADM\. REYES/i)).toBeInTheDocument();
  });
});

describe('TutorialOverlay — typewriter effect', () => {
  it('starts with no dialogue and types it character by character', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);

    const textEl = screen.getByTestId('tutorial-dialogue-text');
    // Initially empty (or just starting)
    expect(textEl.textContent?.trim()).toBe('');

    // Advance timers to type a few characters
    act(() => { vi.advanceTimersByTime(50); });
    const partial = textEl.textContent?.length ?? 0;
    expect(partial).toBeGreaterThan(0);
  });

  it('typing finishes after enough time elapses', () => {
    const dialogue = 'Short.';
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [{ dialogue }],
    });
    render(<TutorialOverlay />);

    act(() => { vi.advanceTimersByTime(dialogue.length * 20 + 50); });

    const textEl = screen.getByTestId('tutorial-dialogue-text');
    expect(textEl.textContent).toContain(dialogue);
  });

  it('clicking the dialogue text skips to full text immediately', () => {
    const dialogue = 'Skip me fast.';
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [{ dialogue }],
    });
    render(<TutorialOverlay />);

    const textEl = screen.getByTestId('tutorial-dialogue-text');
    fireEvent.click(textEl);

    expect(textEl.textContent).toContain(dialogue);
  });
});

describe('TutorialOverlay — Next button', () => {
  it('Next button is disabled while typewriter is still running', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);

    const nextBtn = screen.getByTestId('tutorial-next-btn');
    // Typewriter hasn't finished yet
    expect(nextBtn).toBeDisabled();
  });

  it('Next button becomes enabled after typing finishes (no condition)', () => {
    const dialogue = 'Done.';
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [{ dialogue }],
    });
    render(<TutorialOverlay />);

    // Skip typewriter
    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));

    const nextBtn = screen.getByTestId('tutorial-next-btn');
    expect(nextBtn).not.toBeDisabled();
  });

  it('clicking Next advances to the next step', async () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [
        { dialogue: 'Step 1.' },
        { dialogue: 'Step 2.' },
      ],
    });
    render(<TutorialOverlay />);

    // Finish typing step 1
    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));
    // Click Next
    fireEvent.click(screen.getByTestId('tutorial-next-btn'));

    expect(useTutorialStore.getState().currentStep).toBe(1);
  });

  it('last step shows "Begin Free Play" label', () => {
    const dialogue = 'Final step.';
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [{ dialogue }],
    });
    render(<TutorialOverlay />);
    expect(screen.getByTestId('tutorial-next-btn')).toHaveTextContent('Begin Free Play →');
  });

  it('clicking Begin Free Play on last step calls endTutorial', async () => {
    const endTutorial = vi.fn();
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [{ dialogue: 'Last.' }],
      endTutorial,
    } as any);
    render(<TutorialOverlay />);

    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));
    fireEvent.click(screen.getByTestId('tutorial-next-btn'));

    expect(endTutorial).toHaveBeenCalledOnce();
  });
});

describe('TutorialOverlay — condition gating', () => {
  it('Next button hides tutorial when game condition is not met', () => {
    // phase = 'command' but step needs 'execution'
    mockGameState({ phase: 'command' });
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [GATED_STEP, INSTANT_STEP],
    });
    render(<TutorialOverlay />);

    // Fast-forward typewriter
    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));

    const nextBtn = screen.getByTestId('tutorial-next-btn');
    expect(nextBtn).not.toBeDisabled();
    expect(nextBtn).toHaveTextContent('Got It →');
    
    // Clicking it should call hideTutorial
    fireEvent.click(nextBtn);
    expect(useTutorialStore.getState().isHidden).toBe(true);
  });

  it('shows condition hint when condition is not met', () => {
    mockGameState({ phase: 'command' });
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [GATED_STEP],
    });
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));

    expect(screen.getByTestId('tutorial-condition-hint')).toBeInTheDocument();
    expect(screen.getByTestId('tutorial-condition-hint')).toHaveTextContent(GATED_STEP.conditionHint!);
  });

  it('Next button becomes enabled when condition is met', () => {
    mockGameState({ phase: 'execution' });
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [GATED_STEP],
    });
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByTestId('tutorial-dialogue-text'));

    expect(screen.getByTestId('tutorial-next-btn')).not.toBeDisabled();
  });

  it('does not render condition hint when condition is already met', () => {
    mockGameState({ phase: 'execution' });
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [GATED_STEP],
    });
    render(<TutorialOverlay />);

    expect(screen.queryByTestId('tutorial-condition-hint')).not.toBeInTheDocument();
  });
});

describe('TutorialOverlay — Skip Tutorial', () => {
  it('renders a skip button', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
    });
    render(<TutorialOverlay />);
    expect(screen.getByTestId('tutorial-skip-btn')).toBeInTheDocument();
  });

  it('clicking Skip Tutorial calls endTutorial', async () => {
    const endTutorial = vi.fn();
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP],
      endTutorial,
    } as any);
    render(<TutorialOverlay />);

    fireEvent.click(screen.getByTestId('tutorial-skip-btn'));
    expect(endTutorial).toHaveBeenCalledOnce();
  });
});

describe('TutorialOverlay — progress bar', () => {
  it('renders the progress bar', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP, { dialogue: 'Step 2.' }],
    });
    render(<TutorialOverlay />);
    expect(screen.getByTestId('tutorial-progress-bar')).toBeInTheDocument();
  });

  it('progress bar is at 50% on step 1 of 2', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 0,
      steps: [INSTANT_STEP, { dialogue: 'Step 2.' }],
    });
    render(<TutorialOverlay />);
    const bar = screen.getByTestId('tutorial-progress-bar');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('progress bar is at 100% on the last step', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 1,
      steps: [INSTANT_STEP, { dialogue: 'Step 2.' }],
    });
    render(<TutorialOverlay />);
    const bar = screen.getByTestId('tutorial-progress-bar');
    expect(bar).toHaveStyle({ width: '100%' });
  });
});

describe('TutorialOverlay — step counter display', () => {
  it('shows correct step count text', () => {
    useTutorialStore.setState({
      isActive: true,
      isFreePlay: false,
      currentStep: 2,
      steps: [INSTANT_STEP, INSTANT_STEP, INSTANT_STEP, INSTANT_STEP],
    });
    render(<TutorialOverlay />);
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });
});
