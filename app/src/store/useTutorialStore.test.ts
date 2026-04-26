/**
 * Tutorial Store Unit Tests
 *
 * Covers:
 * - Initial state
 * - startTutorial / nextStep / endTutorial lifecycle
 * - Advancing through the full script
 * - Free-play release on last step
 * - Condition helpers (TutorialCondition)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTutorialStore } from '../store/useTutorialStore';

// Reset the Zustand store before each test
function resetStore() {
  useTutorialStore.setState({
    isActive: false,
    currentStep: 0,
    isFreePlay: false,
  });
}

describe('useTutorialStore — initial state', () => {
  beforeEach(resetStore);

  it('starts inactive', () => {
    const { isActive } = useTutorialStore.getState();
    expect(isActive).toBe(false);
  });

  it('starts at step 0', () => {
    const { currentStep } = useTutorialStore.getState();
    expect(currentStep).toBe(0);
  });

  it('is not in free-play mode initially', () => {
    const { isFreePlay } = useTutorialStore.getState();
    expect(isFreePlay).toBe(false);
  });

  it('has a non-empty steps array', () => {
    const { steps } = useTutorialStore.getState();
    expect(steps.length).toBeGreaterThan(0);
  });
});

describe('useTutorialStore — startTutorial', () => {
  beforeEach(resetStore);

  it('sets isActive to true', () => {
    useTutorialStore.getState().startTutorial();
    expect(useTutorialStore.getState().isActive).toBe(true);
  });

  it('resets currentStep to 0', () => {
    // Simulate mid-tutorial state
    useTutorialStore.setState({ currentStep: 5 });
    useTutorialStore.getState().startTutorial();
    expect(useTutorialStore.getState().currentStep).toBe(0);
  });

  it('clears isFreePlay', () => {
    useTutorialStore.setState({ isFreePlay: true });
    useTutorialStore.getState().startTutorial();
    expect(useTutorialStore.getState().isFreePlay).toBe(false);
  });
});

describe('useTutorialStore — nextStep', () => {
  beforeEach(resetStore);

  it('increments currentStep', () => {
    useTutorialStore.getState().startTutorial();
    useTutorialStore.getState().nextStep();
    expect(useTutorialStore.getState().currentStep).toBe(1);
  });

  it('increments step multiple times correctly', () => {
    useTutorialStore.getState().startTutorial();
    useTutorialStore.getState().nextStep();
    useTutorialStore.getState().nextStep();
    useTutorialStore.getState().nextStep();
    expect(useTutorialStore.getState().currentStep).toBe(3);
  });

  it('sets isFreePlay when advancing past the last step', () => {
    const { steps } = useTutorialStore.getState();
    useTutorialStore.setState({ currentStep: steps.length - 1, isActive: true, isFreePlay: false });
    useTutorialStore.getState().nextStep();
    expect(useTutorialStore.getState().isFreePlay).toBe(true);
  });

  it('does not exceed bounds — currentStep equals steps.length after last advance', () => {
    const { steps } = useTutorialStore.getState();
    useTutorialStore.setState({ currentStep: steps.length - 1, isActive: true });
    useTutorialStore.getState().nextStep();
    // currentStep is set to steps.length (one past end), isFreePlay flips
    expect(useTutorialStore.getState().currentStep).toBe(steps.length);
  });
});

describe('useTutorialStore — endTutorial', () => {
  beforeEach(resetStore);

  it('sets isActive to false', () => {
    useTutorialStore.getState().startTutorial();
    useTutorialStore.getState().endTutorial();
    expect(useTutorialStore.getState().isActive).toBe(false);
  });

  it('resets currentStep to 0', () => {
    useTutorialStore.setState({ currentStep: 8, isActive: true });
    useTutorialStore.getState().endTutorial();
    expect(useTutorialStore.getState().currentStep).toBe(0);
  });

  it('resets isFreePlay to false', () => {
    useTutorialStore.setState({ isFreePlay: true, isActive: true });
    useTutorialStore.getState().endTutorial();
    expect(useTutorialStore.getState().isFreePlay).toBe(false);
  });
});

describe('useTutorialStore — releaseFreePlay', () => {
  beforeEach(resetStore);

  it('sets isFreePlay to true without ending tutorial', () => {
    useTutorialStore.getState().startTutorial();
    useTutorialStore.getState().releaseFreePlay();
    expect(useTutorialStore.getState().isFreePlay).toBe(true);
    expect(useTutorialStore.getState().isActive).toBe(true);
  });
});

describe('useTutorialStore — script coverage', () => {
  beforeEach(resetStore);

  it('every step has a non-empty dialogue string', () => {
    const { steps } = useTutorialStore.getState();
    steps.forEach((step, i) => {
      expect(step.dialogue.length, `Step ${i} has empty dialogue`).toBeGreaterThan(0);
    });
  });

  it('every step with a waitForCondition also has a conditionHint', () => {
    const { steps } = useTutorialStore.getState();
    steps.forEach((step, i) => {
      if (step.waitForCondition && step.waitForCondition !== 'NONE') {
        expect(
          step.conditionHint,
          `Step ${i} has condition '${step.waitForCondition}' but no conditionHint`
        ).toBeTruthy();
      }
    });
  });

  it('has at least one step that highlights a UI element', () => {
    const { steps } = useTutorialStore.getState();
    const hasHighlight = steps.some(s => s.highlightId && s.highlightId.length > 0);
    expect(hasHighlight).toBe(true);
  });

  it('has at least one step that waits for a game condition', () => {
    const { steps } = useTutorialStore.getState();
    const hasCondition = steps.some(s => s.waitForCondition && s.waitForCondition !== 'NONE');
    expect(hasCondition).toBe(true);
  });

  it('covers key gameplay phases in waitForCondition values', () => {
    const { steps } = useTutorialStore.getState();
    const conditions = steps.map(s => s.waitForCondition).filter(Boolean);
    expect(conditions).toContain('PHASE_COMMAND');
    expect(conditions).toContain('PHASE_EXECUTION');
    expect(conditions).toContain('TOKEN_ASSIGNED');
    expect(conditions).toContain('ROUND_2');
  });

  it('has an admiral dialogue reference in the final step', () => {
    const { steps } = useTutorialStore.getState();
    const lastStep = steps[steps.length - 1];
    expect(lastStep.dialogue).toContain('Admiral Reyes');
  });

  it('all highlightIds reference known UI element IDs', () => {
    const knownIds = new Set([
      'hex-map-container',
      'captain-hand',
      'fleet-assets-panel',
      'execution-panel',
      'officer-station-helm',
      'officer-station-tactical',
      'officer-station-engineering',
      'officer-station-sensors',
      'execute-button',
      'briefing-overlay',
    ]);
    const { steps } = useTutorialStore.getState();
    steps.forEach((step, i) => {
      if (step.highlightId) {
        expect(
          knownIds.has(step.highlightId),
          `Step ${i} references unknown highlightId '${step.highlightId}'`
        ).toBe(true);
      }
    });
  });
});

describe('useTutorialStore — full run simulation', () => {
  beforeEach(resetStore);

  it('can advance through every step without errors', () => {
    const { startTutorial, nextStep, steps } = useTutorialStore.getState();
    startTutorial();

    for (let i = 0; i < steps.length - 1; i++) {
      expect(useTutorialStore.getState().currentStep).toBe(i);
      nextStep();
    }

    // After last nextStep, should flip to isFreePlay
    nextStep();
    expect(useTutorialStore.getState().isFreePlay).toBe(true);
  });

  it('remains active (isActive=true) until endTutorial is called, even during free play', () => {
    const { startTutorial, releaseFreePlay } = useTutorialStore.getState();
    startTutorial();
    releaseFreePlay();
    expect(useTutorialStore.getState().isActive).toBe(true);
    useTutorialStore.getState().endTutorial();
    expect(useTutorialStore.getState().isActive).toBe(false);
  });
});
