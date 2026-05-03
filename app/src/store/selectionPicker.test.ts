import { useUIStore, type SelectionTarget } from './useUIStore';

describe('Selection Picker Store Logic', () => {
  beforeEach(() => {
    useUIStore.getState().closeSelectionPicker();
    useUIStore.getState().clearTargeting();
  });

  it('should open the selection picker with correct targets and position', () => {
    const hex = { q: 1, r: 2 };
    const targets: SelectionTarget[] = [
      { kind: 'ship', ship: { id: 'ship1', name: 'Ship 1' } as any, isEnemy: false },
      { kind: 'fighter', fighter: { id: 'fighter1', name: 'Fighter 1' } as any },
    ];
    const position = { x: 100, y: 200 };

    useUIStore.getState().openSelectionPicker(hex, targets, position);

    const state = useUIStore.getState().selectionPicker;
    expect(state).not.toBeNull();
    expect(state?.isOpen).toBe(true);
    expect(state?.hex).toEqual(hex);
    expect(state?.targets).toHaveLength(2);
    expect(state?.position).toEqual(position);
  });

  it('should close the selection picker', () => {
    useUIStore.getState().openSelectionPicker({ q: 0, r: 0 }, [], { x: 0, y: 0 });
    expect(useUIStore.getState().selectionPicker?.isOpen).toBe(true);

    useUIStore.getState().closeSelectionPicker();
    expect(useUIStore.getState().selectionPicker).toBeNull();
  });

  it('should store action and context when opening the picker in targeting mode', () => {
    const action = { shipId: 'playerShip', actionId: 'fire-primary' };
    const context = { weaponId: 'laser' };
    
    useUIStore.getState().openSelectionPicker(
      { q: 0, r: 0 }, 
      [], 
      { x: 0, y: 0 }, 
      action, 
      context
    );

    const state = useUIStore.getState().selectionPicker;
    expect(state?.action).toEqual(action);
    expect(state?.context).toEqual(context);
  });
});
