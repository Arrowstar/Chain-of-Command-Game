import { create } from 'zustand';
import type { HexCoord, WeaponFireEvent, ShipState, EnemyShipState, StationState, ObjectiveMarkerState, FighterToken, TorpedoToken, TacticHazardState } from '../types/game';

// ═══════════════════════════════════════════════════════════════════
// UI Store — Visual/interaction state only (no game logic)
// ═══════════════════════════════════════════════════════════════════

interface UIStore {
  // Selection
  selectedShipId: string | null;
  hoveredHex: HexCoord | null;
  hoveredShipId: string | null;

  // Selection Picker
  selectionPicker: {
    isOpen: boolean;
    hex: HexCoord | null;
    targets: SelectionTarget[];
    position: { x: number; y: number } | null;
    action: { shipId: string; actionId: string } | null;
    context: Record<string, any> | null;
  } | null;

  // Drag and drop
  isDraggingToken: boolean;
  dragSourceStation: string | null;

  // Camera
  cameraX: number;
  cameraY: number;
  cameraZoom: number;

  // Panels
  shipInfoPanelOpen: boolean;
  combatLogOpen: boolean;
  tooltipContent: string | null;
  tooltipPosition: { x: number; y: number } | null;

  // Game Log (slide-out panel)
  gameLogOpen: boolean;
  unreadLogCount: number;

  // Modal overlays
  activeModal: 'fumble' | 'critical' | 'tactic' | 'roe' | 'dice' | 'volley' | 'skill-proc' | null;
  modalData: Record<string, any> | null;
  modalQueue: { type: UIStore['activeModal'], data: Record<string, any> }[];

  // Red Alert
  isRedAlert: boolean;

  // Weapon Fire Animations
  pendingFireAnimations: WeaponFireEvent[];

  // Targeting Mode
  targetingMode: 'ship' | 'hex' | 'weapon' | null;
  activeTargetingAction: { shipId: string; actionId: string } | null;
  activeTargetingContext: Record<string, any> | null;

  // Actions
  selectShip: (id: string | null) => void;
  hoverHex: (hex: HexCoord | null) => void;
  hoverShip: (id: string | null) => void;

  // Selection Picker Actions
  openSelectionPicker: (hex: HexCoord, targets: SelectionTarget[], position: { x: number; y: number }, action?: { shipId: string; actionId: string } | null, context?: Record<string, any> | null) => void;
  closeSelectionPicker: () => void;
  setDragging: (dragging: boolean, station?: string | null) => void;
  panCamera: (dx: number, dy: number) => void;
  zoomCamera: (delta: number) => void;
  setCameraPosition: (x: number, y: number, zoom: number) => void;
  toggleShipInfoPanel: () => void;
  toggleCombatLog: () => void;
  showTooltip: (content: string, x: number, y: number) => void;
  hideTooltip: () => void;
  showModal: (type: UIStore['activeModal'], data?: Record<string, unknown>) => void;
  queueModal: (type: UIStore['activeModal'], data?: Record<string, unknown>) => void;
  hideModal: () => void;
  setRedAlert: (alert: boolean) => void;

  // Game Log
  toggleGameLog: () => void;
  incrementUnread: () => void;
  resetUnreadCount: () => void;
  
  // Targeting
  startTargeting: (mode: 'ship' | 'hex' | 'weapon', action: { shipId: string; actionId: string }, context?: Record<string, any>) => void;
  updateTargetingContext: (context: Record<string, any>) => void;
  clearTargeting: () => void;

  // Fire Animations
  queueFireAnimation: (event: WeaponFireEvent) => void;
  consumeFireAnimation: (id: string) => void;
  cancelAllFireAnimations: () => void;

  // Reset
  resetUI: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedShipId: null,
  hoveredHex: null,
  hoveredShipId: null,
  isDraggingToken: false,
  dragSourceStation: null,
  cameraX: 0,
  cameraY: 0,
  cameraZoom: 1,
  shipInfoPanelOpen: false,
  combatLogOpen: false,
  tooltipContent: null,
  tooltipPosition: null,
  activeModal: null,
  modalData: null,
  modalQueue: [],
  isRedAlert: false,
  gameLogOpen: false,
  unreadLogCount: 0,
  pendingFireAnimations: [],
  targetingMode: null,
  activeTargetingAction: null,
  activeTargetingContext: null,
  selectionPicker: null,

  selectShip: (id) => set({ selectedShipId: id, shipInfoPanelOpen: id !== null }),
  hoverHex: (hex) => set({ hoveredHex: hex }),
  hoverShip: (id) => set({ hoveredShipId: id }),
  setDragging: (dragging, station = null) => set({ isDraggingToken: dragging, dragSourceStation: station }),
  panCamera: (dx, dy) => set(s => ({ cameraX: s.cameraX + dx, cameraY: s.cameraY + dy })),
  zoomCamera: (delta) => set(s => ({ cameraZoom: Math.max(0.3, Math.min(3, s.cameraZoom + delta)) })),
  setCameraPosition: (x, y, zoom) => set({ cameraX: x, cameraY: y, cameraZoom: zoom }),
  toggleShipInfoPanel: () => set(s => ({ shipInfoPanelOpen: !s.shipInfoPanelOpen })),
  toggleCombatLog: () => set(s => ({ combatLogOpen: !s.combatLogOpen })),
  showTooltip: (content, x, y) => set({ tooltipContent: content, tooltipPosition: { x, y } }),
  hideTooltip: () => set({ tooltipContent: null, tooltipPosition: null }),
  showModal: (type, data = {}) => set({ activeModal: type, modalData: data ?? {} }),
  queueModal: (type, data = {}) => set(s => {
    if (!s.activeModal) return { activeModal: type, modalData: data };
    return { modalQueue: [...s.modalQueue, { type, data }] };
  }),
  hideModal: () => set(s => {
    if (s.modalQueue.length > 0) {
      const [next, ...rest] = s.modalQueue;
      return { activeModal: next.type, modalData: next.data, modalQueue: rest };
    }
    return { activeModal: null, modalData: null };
  }),
  setRedAlert: (alert) => set({ isRedAlert: alert }),
  toggleGameLog: () => set(s => ({
    gameLogOpen: !s.gameLogOpen,
    unreadLogCount: !s.gameLogOpen ? 0 : s.unreadLogCount  // clear immediately when opening
  })),
  incrementUnread: () => set(s => ({ unreadLogCount: s.gameLogOpen ? 0 : s.unreadLogCount + 1 })),
  resetUnreadCount: () => set({ unreadLogCount: 0 }),
  startTargeting: (mode, action, context = {}) => set({ targetingMode: mode, activeTargetingAction: action, activeTargetingContext: context }),
  updateTargetingContext: (context) => set(s => ({ activeTargetingContext: { ...s.activeTargetingContext, ...context } })),
  clearTargeting: () => set({ targetingMode: null, activeTargetingAction: null, activeTargetingContext: null }),

  openSelectionPicker: (hex, targets, position, action = null, context = null) => set({
    selectionPicker: { isOpen: true, hex, targets, position, action, context }
  }),
  closeSelectionPicker: () => set({ selectionPicker: null }),

  queueFireAnimation: (event) => set(s => ({ pendingFireAnimations: [...s.pendingFireAnimations, event] })),
  consumeFireAnimation: (id) => set(s => ({ pendingFireAnimations: s.pendingFireAnimations.filter(e => e.id !== id) })),
  cancelAllFireAnimations: () => set({ pendingFireAnimations: [] }),

  resetUI: () => set({
    selectedShipId: null,
    hoveredHex: null,
    hoveredShipId: null,
    isDraggingToken: false,
    dragSourceStation: null,
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    shipInfoPanelOpen: false,
    combatLogOpen: false,
    tooltipContent: null,
    tooltipPosition: null,
    activeModal: null,
    modalData: null,
    modalQueue: [],
    isRedAlert: false,
    gameLogOpen: false,
    unreadLogCount: 0,
    pendingFireAnimations: [],
    targetingMode: null,
    activeTargetingAction: null,
    activeTargetingContext: null,
    selectionPicker: null,
  }),
}));

export type SelectionTarget =
  | { kind: 'ship'; ship: ShipState | EnemyShipState; isEnemy: boolean }
  | { kind: 'station'; station: StationState }
  | { kind: 'objective'; marker: ObjectiveMarkerState }
  | { kind: 'fighter'; fighter: FighterToken; stackCount?: number }
  | { kind: 'torpedo'; torpedo: TorpedoToken }
  | { kind: 'hazard'; hazard: TacticHazardState };
