import { describe, it, expect, beforeEach } from 'vitest';
import { useSectorMapTutorialStore } from '../store/useSectorMapTutorialStore';

function resetStore() {
  useSectorMapTutorialStore.setState({
    isActive: false,
    hasSeenSectorMap: false,
    currentStep: 0,
    historyStack: [],
  });
}

describe('useSectorMapTutorialStore', () => {
  beforeEach(resetStore);

  it('starts inactive and unseen', () => {
    const { isActive, hasSeenSectorMap, currentStep } = useSectorMapTutorialStore.getState();
    expect(isActive).toBe(false);
    expect(hasSeenSectorMap).toBe(false);
    expect(currentStep).toBe(0);
  });

  it('tryActivate makes it active if not seen', () => {
    useSectorMapTutorialStore.getState().tryActivate();
    expect(useSectorMapTutorialStore.getState().isActive).toBe(true);
    expect(useSectorMapTutorialStore.getState().hasSeenSectorMap).toBe(false);
  });

  it('tryActivate does nothing if already seen', () => {
    useSectorMapTutorialStore.setState({ hasSeenSectorMap: true });
    useSectorMapTutorialStore.getState().tryActivate();
    expect(useSectorMapTutorialStore.getState().isActive).toBe(false);
  });

  it('can advance through steps and dismiss on last step', () => {
    useSectorMapTutorialStore.getState().tryActivate();
    expect(useSectorMapTutorialStore.getState().currentStep).toBe(0);
    
    // Step 1
    useSectorMapTutorialStore.getState().nextStep();
    expect(useSectorMapTutorialStore.getState().currentStep).toBe(1);
    expect(useSectorMapTutorialStore.getState().historyStack).toEqual([0]);
    
    // Step 2 -> dismisses
    useSectorMapTutorialStore.getState().nextStep();
    expect(useSectorMapTutorialStore.getState().isActive).toBe(false);
    expect(useSectorMapTutorialStore.getState().hasSeenSectorMap).toBe(true);
  });

  it('can manually dismiss', () => {
    useSectorMapTutorialStore.getState().tryActivate();
    useSectorMapTutorialStore.getState().dismiss();
    expect(useSectorMapTutorialStore.getState().isActive).toBe(false);
    expect(useSectorMapTutorialStore.getState().hasSeenSectorMap).toBe(true);
  });
});
