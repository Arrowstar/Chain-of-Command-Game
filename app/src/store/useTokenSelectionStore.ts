import { create } from 'zustand';

/**
 * Tiny store for the tap-to-assign CT interaction model.
 *
 * Flow:
 *   1. Player taps a CommandToken → selectToken(id) is called.
 *   2. Token glows to indicate selection.
 *   3. Player taps an ActionSlot → the slot checks selectedTokenId and calls
 *      assignToken via its onTapAssign callback, then clears the selection.
 *   4. Tapping the same token again, or tapping empty space, clears selection.
 *
 * This runs alongside the existing @dnd-kit drag-and-drop flow — they don't
 * interfere because drag activation requires a minimum movement distance.
 */
interface TokenSelectionState {
  /** The CT token ID currently picked up by a tap, or null. */
  selectedTokenId: string | null;
  /** Mark a token as selected (picked up). */
  selectToken: (id: string) => void;
  /** Clear the current tap selection. */
  clearSelection: () => void;
}

export const useTokenSelectionStore = create<TokenSelectionState>((set) => ({
  selectedTokenId: null,
  selectToken: (id) => set({ selectedTokenId: id }),
  clearSelection: () => set({ selectedTokenId: null }),
}));
