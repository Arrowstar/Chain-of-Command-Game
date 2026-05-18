import { describe, it, expect, beforeEach } from 'vitest';
import { useFleetBuilderTutorialStore } from '../store/useFleetBuilderTutorialStore';

function resetStore() {
  useFleetBuilderTutorialStore.setState({
    isActive: false,
    isDismissed: false,
    currentStep: 0,
    historyStack: [],
  });
}

describe('useFleetBuilderTutorialStore', () => {
  beforeEach(resetStore);

  it('starts inactive and undiscovered', () => {
    const { isActive, isDismissed, currentStep } = useFleetBuilderTutorialStore.getState();
    expect(isActive).toBe(false);
    expect(isDismissed).toBe(false);
    expect(currentStep).toBe(0);
  });

  it('can start the tutorial', () => {
    useFleetBuilderTutorialStore.getState().startTutorial();
    const { isActive, isDismissed, currentStep } = useFleetBuilderTutorialStore.getState();
    expect(isActive).toBe(true);
    expect(isDismissed).toBe(false);
    expect(currentStep).toBe(0);
  });

  it('can advance through steps and dismiss on last step', () => {
    const store = useFleetBuilderTutorialStore.getState();
    store.startTutorial();
    expect(useFleetBuilderTutorialStore.getState().currentStep).toBe(0);
    
    // Step 1
    useFleetBuilderTutorialStore.getState().nextStep();
    expect(useFleetBuilderTutorialStore.getState().currentStep).toBe(1);
    expect(useFleetBuilderTutorialStore.getState().historyStack).toEqual([0]);
    
    // Step 2
    useFleetBuilderTutorialStore.getState().nextStep();
    expect(useFleetBuilderTutorialStore.getState().currentStep).toBe(2);
    expect(useFleetBuilderTutorialStore.getState().historyStack).toEqual([0, 1]);
    
    // Step 3 -> dismisses
    useFleetBuilderTutorialStore.getState().nextStep();
    expect(useFleetBuilderTutorialStore.getState().isActive).toBe(false);
    expect(useFleetBuilderTutorialStore.getState().isDismissed).toBe(true);
  });

  it('can navigate backwards', () => {
    const store = useFleetBuilderTutorialStore.getState();
    store.startTutorial();
    store.nextStep();
    store.nextStep();
    expect(useFleetBuilderTutorialStore.getState().currentStep).toBe(2);
    
    useFleetBuilderTutorialStore.getState().previousStep();
    expect(useFleetBuilderTutorialStore.getState().currentStep).toBe(1);
    expect(useFleetBuilderTutorialStore.getState().historyStack).toEqual([0]);
  });

  it('can manually dismiss', () => {
    useFleetBuilderTutorialStore.getState().startTutorial();
    useFleetBuilderTutorialStore.getState().dismiss();
    expect(useFleetBuilderTutorialStore.getState().isActive).toBe(false);
    expect(useFleetBuilderTutorialStore.getState().isDismissed).toBe(true);
  });

  it('getStepForPage returns correct step only when active', () => {
    const store = useFleetBuilderTutorialStore.getState();
    
    // Not active
    expect(store.getStepForPage(1)).toBeNull();
    
    store.startTutorial();
    const step = useFleetBuilderTutorialStore.getState().getStepForPage(1);
    expect(step).not.toBeNull();
    expect(step?.fleetBuilderStep).toBe(1);
    
    // Wrong page
    expect(useFleetBuilderTutorialStore.getState().getStepForPage(2)).toBeNull();
  });
});
