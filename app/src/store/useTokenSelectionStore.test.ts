import { useTokenSelectionStore } from './useTokenSelectionStore';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useTokenSelectionStore', () => {
  beforeEach(() => {
    useTokenSelectionStore.getState().clearSelection();
  });

  it('initializes with no selected token', () => {
    expect(useTokenSelectionStore.getState().selectedTokenId).toBeNull();
  });

  it('selects a token correctly', () => {
    useTokenSelectionStore.getState().selectToken('token-123');
    expect(useTokenSelectionStore.getState().selectedTokenId).toBe('token-123');
  });

  it('clears selection correctly', () => {
    useTokenSelectionStore.getState().selectToken('token-456');
    useTokenSelectionStore.getState().clearSelection();
    expect(useTokenSelectionStore.getState().selectedTokenId).toBeNull();
  });
});
