// ─── Hex & Spatial ───────────────────────────────────────────────

/** Axial hex coordinate (flat-top orientation) */
export interface HexCoord {
  q: number;
  r: number;
}

export interface DeploymentBounds {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
  hexes?: HexCoord[];
  label?: string;
}

/**
 * The six hex faces / directions for a flat-top hex.
 * Facing index maps to clockwise rotation from "nose up-right".
 * 0 = Fore (top-right edge), proceeding clockwise.
 */
export const HexFacing = {
  Fore: 0,
  ForeStarboard: 1,
  AftStarboard: 2,
  Aft: 3,
  AftPort: 4,
  ForePort: 5,
} as const;
export type HexFacing = (typeof HexFacing)[keyof typeof HexFacing];

/** Named weapon/shield arcs, matching the 6 hex faces */
export type ShipArc =
  | 'fore'
  | 'foreStarboard'
  | 'aftStarboard'
  | 'aft'
  | 'aftPort'
  | 'forePort';

export const FACING_TO_ARC: Record<HexFacing, ShipArc> = {
  [HexFacing.Fore]: 'fore',
  [HexFacing.ForeStarboard]: 'foreStarboard',
  [HexFacing.AftStarboard]: 'aftStarboard',
  [HexFacing.Aft]: 'aft',
  [HexFacing.AftPort]: 'aftPort',
  [HexFacing.ForePort]: 'forePort',
};

/** Range bands for weapon & targeting rules */
export const RangeBand = {
  Short: 'short',     // 1-2 hexes
  Medium: 'medium',   // 3-4 hexes
  Long: 'long',       // 5+ hexes
} as const;
export type RangeBand = (typeof RangeBand)[keyof typeof RangeBand];

// ─── Dice ────────────────────────────────────────────────────────

/** Polyhedral die types used in the game */
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/** Map die type to its max face value */
export const DIE_MAX: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

/** Result of rolling a single die (potentially exploding) */
export interface DieResult {
  dieType: DieType;
  source?: string;       // e.g. 'weapon', 'officer', 'tactic', 'basic'
  rolls: number[];       // all rolls (original + explosions)
  total: number;         // sum of all rolls
  isHit: boolean;        // total >= TN
  isCritical: boolean;   // at least one max-face roll
  isConverted?: boolean; // true if upgraded from standard by an ability
}

export type VolleyDieInput = DieType | { type: DieType; source: string };

/** Full volley result */
export interface VolleyResult {
  dice: DieResult[];
  targetNumber: number;
  totalHits: number;
  totalCrits: number;
  totalStandardHits: number;
  totalCriticalHits: number;
}

// ─── Ship Size & Initiative ──────────────────────────────────────

export const ShipSize = {
  Fighter: 'fighter',
  Small: 'small',
  Medium: 'medium',
  Large: 'large',
} as const;
export type ShipSize = (typeof ShipSize)[keyof typeof ShipSize];

export function isSmallCraftSize(size: ShipSize | undefined): boolean {
  return size === ShipSize.Fighter;
}

export function isCapitalShipSize(size: ShipSize | undefined): boolean {
  return size === ShipSize.Medium || size === ShipSize.Large;
}

// ─── Terrain ─────────────────────────────────────────────────────

export const TerrainType = {
  Open: 'open',
  Asteroids: 'asteroids',
  IonNebula: 'ionNebula',
  DebrisField: 'debrisField',
  GravityWell: 'gravityWell',
} as const;
export type TerrainType = (typeof TerrainType)[keyof typeof TerrainType];

export interface TerrainData {
  type: TerrainType;
  blocksLoS: boolean;
  tnModifier: number;        // added to TN for targets in this terrain
  movementEffect: string;    // human-readable description
  special: string;           // human-readable special rule
}

// ─── Weapon Modules ──────────────────────────────────────────────

export interface WeaponModule {
  id: string;
  name: string;
  arcs: ShipArc[];                 // which arcs can fire this weapon
  rangeMin: number;                // minimum hex range
  rangeMax: number;                // maximum hex range (Infinity for board-wide)
  volleyPool: DieType[];           // dice in the volley (NOT including officer skill die)
  rpCost: number;
  dpCost: number;                  // Deployment Point cost for campaign budget
  effect: string;                  // special rule text
  tags: WeaponTag[];
  availability?: 'standard' | 'event';
  imagePath?: string;              // optional path to weapon icon
}

export type WeaponTag =
  | 'standard'
  | 'armorPiercing'
  | 'broadside'
  | 'torpedo'
  | 'pointDefense'
  | 'shieldBreaker'
  | 'areaOfEffect'
  | 'ordnance';

// ─── Internal Subsystems ─────────────────────────────────────────

export type OfficerStation = 'helm' | 'tactical' | 'engineering' | 'sensors';

export interface Subsystem {
  id: string;
  name: string;
  station: OfficerStation;
  ctCost: number;
  stressCost: number;
  rpCost: number;
  dpCost: number;                  // Deployment Point cost for campaign budget
  actionName: string;
  effect: string;
  isPassive?: boolean;
  requiresTarget?: boolean;
  requiresHexTarget?: boolean;
  rangeMax?: number;
  availability?: 'standard' | 'event';
  imagePath?: string;              // optional path to subsystem icon
}

// ─── Ship Chassis ────────────────────────────────────────────────

export interface ShipChassis {
  id: string;
  name: string;
  className: string;              // e.g. "Vanguard-Class Light Cruiser"
  size: ShipSize;
  baseHull: number;
  shieldsPerSector: number;
  armorDie: DieType;
  ctGeneration: number;           // base CT produced per Briefing Phase
  baseEvasion: number;
  maxSpeed: number;
  rpCost: number;
  dpCost: number;                  // Deployment Point cost for campaign budget
  weaponSlots: number;
  internalSlots: number;
  uniqueTraitName: string;
  uniqueTraitEffect: string;
  flavorText: string;
  image?: string;                 // optional chassis image
}

// ─── Bridge Officers ─────────────────────────────────────────────

export type SkillDieTier = 'rookie' | 'veteran' | 'elite' | 'legendary';

export const SKILL_DIE_MAP: Record<SkillDieTier, DieType> = {
  rookie: 'd4',
  veteran: 'd6',
  elite: 'd8',
  legendary: 'd10',
};

export interface OfficerData {
  id: string;
  name: string;
  station: OfficerStation;
  traitName: string;
  traitEffect: string;
  stressLimit: number | null;      // null = immune (Sparky)
  defaultTier: SkillDieTier;
  avatar: string;
  traitTier: 1 | 2 | 3;           // Tier 1 = Utility, Tier 2 = Specialist, Tier 3 = Game Changer
  dpCost: number;                  // Deployment Point cost for campaign budget
  bio?: string;                    // optional one-liner lore blurb for deployment screen tooltip
}

// ─── Officer Runtime State ───────────────────────────────────────

export interface OfficerState {
  officerId: string;               // references OfficerData.id
  station: OfficerStation;
  currentStress: number;
  currentTier: SkillDieTier;
  isLocked: boolean;               // station locked by fumble
  lockDuration: number;            // rounds remaining for lock
  traumas: TraumaEffect[];         // campaign persistent
  hasFumbledThisRound: boolean;
  actionsPerformedThisRound: number;
  usedMethodicalThisRound?: boolean;
  usedSurgicalStrikeThisRound?: boolean;
  usedMiracleWorker?: boolean;
  hasNerveCollapse?: boolean;
}

export interface TraumaEffect {
  id: string;
  name: string;
  effect: string;
}

// ─── Ship Runtime State ──────────────────────────────────────────

export interface ShieldState {
  fore: number;
  foreStarboard: number;
  aftStarboard: number;
  aft: number;
  aftPort: number;
  forePort: number;
}

export interface ShipState {
  id: string;
  name: string;
  chassisId: string;               // references ShipChassis.id
  ownerId: string;                 // player or 'ai'
  position: HexCoord;
  /** Position recorded at the start of the current round. Used for RoE checks. */
  positionAtStartOfRound?: HexCoord;
  facing: HexFacing;
  currentSpeed: number;
  currentHull: number;
  maxHull: number;
  shields: ShieldState;
  maxShieldsPerSector: number;
  equippedWeapons: (string | null)[];    // weapon IDs in weapon slots
  equippedSubsystems: (string | null)[]; // subsystem IDs in internal slots
  criticalDamage: CriticalDamageCard[];
  scars: ScarEffect[];                   // campaign persistent
  armorDie: DieType;
  baseEvasion: number;
  evasionModifiers: number;              // temporary modifiers this round
  evasiveManeuvers?: number;             // legacy alias used by combat TN breakdown/UI
  isDestroyed: boolean;
  hasDroppedBelow50: boolean;            // tracks first-time 50% trigger
  hasDrifted: boolean;
  firedWeaponThisRound?: boolean;        // for Cloaking Field
  firedWeaponPreviousRound?: boolean;    // for Cloaking Field
  firedWeaponIndicesThisRound?: number[]; // which slots have fired
  targetLocks: number[];                 // TN modifiers from Target Locks, lasting until round cleanup
  targetLocksRerolls?: number;           // rerolls granted by Target Lock, lasting until round cleanup
  targetLockArmorPiercingShots?: number; // one-use armor-piercing volleys granted by Target Lock
  pdcDisabled?: boolean;                 // fumble flag
  armorDisabled?: boolean;               // fumble flag
  disabledWeaponIndices?: number[];      // fumble flag
  ordnanceJammed?: boolean;              // fumble flag
  navLockout?: boolean;                  // fumble flag
  navLockoutDuration?: number;           // fumble flag
  /**
   * Tracks load state for [Ordnance] weapons, keyed by weapon slot index.
   * `false` = expended / needs reload. `true` or `undefined` = primed and ready.
   */
  ordnanceLoadedStatus?: Record<number, boolean>;
  /** Tracks which weapon slots were loaded THIS round to enforce firing rules. */
  ordnanceLoadedIndicesThisRound?: number[];
  isJammed?: boolean;
  /** Breakout objective: ship has successfully jumped to warp and left the engagement zone. */
  warpedOut?: boolean;
  predictiveVolleyActive?: boolean;
  spoofedFireControlActive?: boolean;
  /**
   * Tracks number of fighters launched from each internal slot this battle.
   * Key is the internal slot index. Only relevant for 'fighter-hangar' subsystems.
   */
  fighterLaunchCounts?: Record<number, number>;
}

export interface CriticalDamageCard {
  id: string;
  name: string;
  effect: string;
  isRepaired: boolean;
}

export interface ScarEffect {
  id: string;
  name: string;
  effect: string;
  fromCriticalId: string;
}

// ─── Player State ────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  shipId: string;                    // references ShipState.id
  officers: OfficerState[];          // exactly 4 (helm, tactical, engineering, sensors)
  commandTokens: number;             // available CT this round
  maxCommandTokens: number;          // base generation (may be reduced by crits)
  pendingCommandTokenBonus?: number; // CT to add at the next Briefing refresh
  briefingCommandTokenBonus?: number; // CT added during the current round's Briefing refresh
  assignedActions: QueuedAction[];   // actions queued during Command Phase
  usedVersatileThisRound?: boolean;
  commsBlackout?: boolean;           // fumble flag
}

export interface QueuedAction {
  id: string;
  station: OfficerStation;
  actionId: string;                  // which action slot
  targetShipId?: string;             // optional targeting
  targetHex?: HexCoord;             // optional hex targeting (flak)
  weaponSlotIndex?: number;         // which weapon to fire
  ctCost: number;
  stressCost: number;
  context?: Record<string, any>;    // arbitrary context like delta for speed
  resolved?: boolean;
  subsystemSlotIndex?: number;
}

// ─── Game Phase & Round ──────────────────────────────────────────

export const GamePhase = {
  Setup: 'setup',
  Briefing: 'briefing',
  Command: 'command',
  Execution: 'execution',
  Cleanup: 'cleanup',
  GameOver: 'gameOver',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const ExecutionStep = {
  SmallAllied: 'smallAllied',
  SmallEnemy: 'smallEnemy',
  MediumAllied: 'mediumAllied',
  MediumEnemy: 'mediumEnemy',
  LargeAllied: 'largeAllied',
  LargeEnemy: 'largeEnemy',
} as const;
export type ExecutionStep = (typeof ExecutionStep)[keyof typeof ExecutionStep];

// ─── Card Types ──────────────────────────────────────────────────

/** The four thematic doctrines in the Admiral's RoE Deck */
export type RoEDoctrine = 'maximumAggression' | 'resourceStarvation' | 'cruelCalculus' | 'totalControl';

/**
 * A Rules of Engagement card drawn once at game setup.
 * Its effects persist for the entire mission unless Overridden.
 */
export interface RoECard {
  id: string;
  name: string;
  doctrine: RoEDoctrine;
  flavorText: string;
  rule: string;
  mechanicalEffect: RoEMechanicalEffect;
}

export interface RoEMechanicalEffect {
  // Maximum Aggression
  /** Stress applied to Helm officer if ship ends stationary or further from enemies */
  stressOnRetreatOrStationary?: number;
  /** Dice used for ramming damage in place of the default 1D4 */
  rammingDamageDice?: DieType[];
  /** Whether ramming damage bypasses armor/shields */
  rammingUnblockable?: boolean;
  /** Bonus hull damage added to AoE (areaOfEffect) and armorPiercing weapon attacks */
  aoePiercingBonusDamage?: number;
  /** When an attack scores zero hits, the nearest allied unit in LoS is struck instead */
  missedShotFriendlyFire?: boolean;
  // Resource Starvation
  /** Stress applied to Tactical Officer when a volley scores zero hits */
  stressOnWhiff?: number;
  /** Flat modifier to base CT generation each round (negative = reduction) */
  ctGenerationMod?: number;
  /** CT cost override for the 'damage-control' action */
  damageControlCostOverride?: number;
  // Cruel Calculus
  /**
   * When a player capital ship is destroyed, apply this FF change instead of the default -3.
   * Positive = gain, negative = lose.
   */
  destroyedShipFFOverride?: number;
  /** Number of rounds from game start during which shields cannot be targeted */
  shieldTargetBanRounds?: number;
  /** Bonus CT added to each player's generation each round */
  bonusCTPerRound?: number;
  /** Any hull damage (even 1 point) forces an immediate Critical Damage Card draw */
  hullDamageTriggersCrit?: boolean;
  // Total Control
  /** Players are forbidden from communicating during the Command Phase */
  commsBlackoutDuringCommand?: boolean;
  /** Stress applied to the Sensors officer when a Radio Silence violation is reported */
  commsViolationStress?: number;
  /** Restrict all player firing to the Forward 180° arc only */
  forwardArcOnly?: boolean;
}

export interface TacticCard {
  id: string;
  name: string;
  effect: string;
  mechanicalEffect: TacticMechanicalEffect;
}

export interface TacticMechanicalEffect {
  extraMovement?: number;
  extraDice?: DieType[];
  shieldRestore?: number;
  critThresholdOverride?: number;
  targetingOverride?: string;
  disablePlayerStation?: OfficerStation;
  smallCraftExtraMovement?: number;
  extraMovementVsDamagedTargets?: number;
  criticalStressBonus?: number;
  longRangeExtraDice?: DieType[];
  longRangeMin?: number;
  flankRearExtraDice?: DieType[];
  reserveSquadronLaunch?: boolean;
  minefieldCount?: number;
  minefieldRadius?: number;
  mineDamage?: number;
}

export interface TacticHazardState {
  id: string;
  name: string;
  position: HexCoord;
  damage: number;
  expiresAfterRound: number;
}

export interface FumbleCard {
  id: string;
  name: string;
  category: 'general' | OfficerStation;
  flavorText: string;
  effect: string;
  mechanicalEffect: FumbleMechanicalEffect;
}

export interface FumbleMechanicalEffect {
  actionCanceled: boolean;
  ctRefunded: boolean;
  stationLocked: boolean;
  lockDuration: number;              // rounds
  fleetFavorChange?: number;
  stressToOthers?: number;
  skillDieStepDown?: boolean;
  evasionChange?: number;
  ctLost?: number;
  randomDrift?: boolean;
  panicFire?: boolean;
  weaponDamaged?: boolean;
  pdcDisabled?: boolean;
  shieldSectorStripped?: boolean;
  hullDamage?: number;
  armorDisabled?: boolean;
  enemyEvasionBoost?: number;
  commsBlackout?: boolean;
  navLockout?: boolean;
  navLockoutDuration?: number;
  enemyTnReduction?: number;
  ordnanceJammed?: boolean;
  priorityTarget?: boolean;
}

// ─── Adversary (Enemy) ──────────────────────────────────────────

export type AIBehaviorTag = 'aggressive' | 'artillery' | 'hunter' | 'swarm' | 'support';

export interface AdversaryData {
  id: string;
  name: string;
  size: ShipSize;
  hull: number;
  shieldsPerSector: number;
  shieldsAllSectors: boolean;     // true = all sectors, false = specific sectors only
  shieldSectors?: ShipArc[];      // if not all sectors, which ones
  armorDie: DieType;
  speed: number;
  baseEvasion: number;
  volleyPool: DieType[];
  weaponRangeMin: number;
  weaponRangeMax: number;
  aiTag: AIBehaviorTag;
  special?: string;
}

export interface EnemyShipState {
  id: string;
  name: string;
  adversaryId: string;             // references AdversaryData.id
  position: HexCoord;
  facing: HexFacing;
  currentSpeed: number;
  currentHull: number;
  maxHull: number;
  shields: ShieldState;
  maxShieldsPerSector: number;
  criticalDamage: CriticalDamageCard[];
  isDestroyed: boolean;
  hasDroppedBelow50: boolean;
  hasDrifted: boolean;
  targetLocks: number[];
  targetLocksRerolls?: number;
  targetLockArmorPiercingShots?: number;
  baseEvasion: number;
  armorDie: DieType;
  evasionModifiers?: number;       // temporary modifiers this round
  isAllied?: boolean;              // true if this AI ship fights for the players
  isJammed?: boolean;              // true if affected by ECM Active Jamming this round
  predictiveVolleyActive?: boolean;
  spoofedFireControlActive?: boolean;
  firedWeaponIndicesThisRound?: number[];
}

// ─── Fighter / Small Craft Tokens ────────────────────────────────

export type FighterBehavior = 'attack' | 'escort' | 'flanking' | 'hit_and_run' | 'screen' | 'harass';

export interface FighterClassData {
  id: string;
  name: string;
  role: string;
  hull: number;
  speed: number;
  baseEvasion: number;
  weaponRangeMax: number;
  volleyPool: DieType[];
  behavior: FighterBehavior;
  specialRules?: string;
  /** Key into ASSET_MAP for this class's artwork. Omit to show a placeholder. */
  imageKey?: string;
}

/**
 * Represents a Strike Fighter or small craft token on the hex board.
 * Fighters have no shields, subsystems, or officers.
 * Up to 3 fighters may share a hex; they co-exist with capital ships.
 */
export interface FighterToken {
  id: string;
  name: string;
  classId: string;          // references FighterClassData.id
  allegiance: 'allied' | 'enemy';
  /** Which capital ship launched / spawned this fighter. */
  sourceShipId: string;
  position: HexCoord;
  facing: HexFacing;
  currentHull: number;
  maxHull: number;
  speed: number;            // hexes moved per activation
  baseEvasion: number;      
  volleyPool: DieType[];    
  weaponRangeMax: number;   
  behavior: FighterBehavior;
  hitAndRunPhase?: 'engage' | 'retreat';
  isDestroyed: boolean;
  hasDrifted: boolean;      // reset each briefing phase
  hasActed: boolean;        // reset each briefing phase
  /** Allied only — ID of the enemy capital ship to attack. null = drifts but does not attack. */
  assignedTargetId: string | null;
}

/**
 * Represents a Seeker Torpedo heading towards its target.
 * Torpedoes do not participate in dogfights but can be targeted by PDC.
 */
export interface TorpedoToken {
  id: string;
  name: string;
  allegiance: 'allied' | 'enemy';
  /** Which capital ship fired this torpedo */
  sourceShipId: string;
  /** Which ship this torpedo is homing on */
  targetShipId: string;
  position: HexCoord;
  facing: HexFacing;
  currentHull: number;
  maxHull: number;
  speed: number;            // 4 hexes per round
  baseEvasion: number;      // Same as fighter? Let's use 5
  isDestroyed: boolean;
  hasMoved: boolean;        // reset each briefing phase
}

// ─── Fleet Assets ────────────────────────────────────────────────

export interface FleetAsset {
  id: string;
  name: string;
  ffCost: number;
  effect: string;
}

export type FleetAssetId =
  | 'tactical-override'
  | 'emergency-reinforcement'
  | 'targeting-package'
  | 'damage-control-authorization'
  | 'intel-feed'
  | 'morale-discipline'
  | 'escort-support-call'
  | 'extraction-window';

export type TargetingPackageMode = 'tn' | 'reroll' | 'bonusHit';

export interface FleetAssetDefinition {
  id: FleetAssetId;
  name: string;
  ffCost: number;
  timing: string;
  effect: string;
  limitations: string;
}

export interface PendingTargetingPackage {
  attackerShipId: string;
  targetShipId: string;
  mode: TargetingPackageMode;
}

// ─── Stations & Defense Turrets ──────────────────────────────────

export interface StationData {
  id: string;
  name: string;
  type: 'station' | 'turret';
  size: ShipSize;
  hull: number;
  shieldsPerSector: number;
  armorDie: DieType;
  baseEvasion: number;
  /** Primary weapons fire in all arcs */
  volleyPool: DieType[];
  weaponRangeMin: number;
  weaponRangeMax: number;
  /** Heavy weapons only fire in forward arcs (fore, foreStarboard, forePort) */
  heavyVolleyPool?: DieType[];
  heavyWeaponRangeMin?: number;
  heavyWeaponRangeMax?: number;
  fighterHangar?: {
    totalFighters: number;
    fightersPerLaunch: number;
    fighterAllegiance: 'enemy';
  };
  special?: string;
  imageKey?: string;
}

export interface StationState {
  id: string;
  name: string;
  stationId: string; // references StationData.id
  position: HexCoord;
  facing: HexFacing;
  currentHull: number;
  maxHull: number;
  shields: ShieldState;
  maxShieldsPerSector: number;
  armorDie: DieType;
  baseEvasion: number;
  isDestroyed: boolean;
  hasDroppedBelow50: boolean;
  /** Whether this station has fired this round */
  hasActed: boolean;
  /** Remaining fighters in hangar (starts at totalFighters) */
  remainingFighters: number;
  criticalDamage: CriticalDamageCard[];
  isJammed?: boolean;
  predictiveVolleyActive?: boolean;
  spoofedFireControlActive?: boolean;
  /** TN modifiers from Target Locks applied to attacks against this station */
  targetLocks?: number[];
  targetLocksRerolls?: number;
  targetLockArmorPiercingShots?: number;
}

// ─── Combat Targeting ─────────────────────────────────────────────

export type CombatTarget =
  | { kind: 'enemy'; state: EnemyShipState }
  | { kind: 'station'; state: StationState }
  | { kind: 'player'; state: ShipState };

// ─── Objective Markers ────────────────────────────────────────────

/** A destructible / collectable token placed on the hex map as a mission objective. */
export interface ObjectiveMarkerState {
  name: string;
  position: HexCoord;
  hull: number;
  maxHull: number;
  shieldsPerSector: number;
  /** True once this marker has taken enough damage to reach 0 hull (e.g. Comms Array destroyed). */
  isDestroyed?: boolean;
  /** True once a player ship has collected this token (e.g. Supply Crate picked up, Relay siphoned). */
  isCollected?: boolean;
}

// ─── Scenario ────────────────────────────────────────────────────

export interface ScenarioData {
  id: string;
  name: string;
  narrative: string;
  playerCount: { min: number; max: number };
  mapWidth: number;
  mapHeight: number;
  terrain: { coord: HexCoord; type: TerrainType }[];
  playerDeployZone: HexCoord[];
  enemySpawns: { adversaryId: string; position: HexCoord; spawnRound?: number }[];
  stationSpawns?: { stationId: string; position: HexCoord; facing?: HexFacing; name?: string }[];
  objectiveMarkers?: ObjectiveMarkerState[];
  victoryCondition: string;
  defeatCondition: string;
  maxRounds?: number;
  victoryRewardFF: number;
}

// ─── Standard Actions (Worker Placement Nodes) ──────────────────

export interface ActionDefinition {
  id: string;
  station: OfficerStation;
  name: string;
  ctCost: number;
  stressCost: number;
  effect: string;
  requiresTarget?: boolean;
  requiresWeaponSlot?: boolean;
  requiresShieldSector?: boolean;
  /** True when the action needs the player to pick a donor arc AND a receiver arc (e.g. Rotate Shields). */
  requiresTwoShieldSectors?: boolean;
  requiresHexTarget?: boolean;
  /** Optional: Only show this action if the current objective type matches this string. */
  hideUnlessObjective?: string;
  /** Optional: Hide this action if the ship has no weapons with the 'ordnance' tag. */
  hideIfNoOrdnance?: boolean;
  subsystemSlotIndex?: number;
}

// ─── Game Log ────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  round: number;
  phase: GamePhase;
  timestamp: number;
  type: 'movement' | 'combat' | 'damage' | 'critical' | 'fumble' | 'roe' | 'tactic' | 'repair' | 'system' | 'stress' | 'phase';
  message: string;
  details?: Record<string, unknown>;
}

// ─── Weapon Fire Animation Events ────────────────────────────────

/**
 * A one-shot visual event emitted by useGameStore whenever an attack resolves.
 * Consumed by HexMap's PixiJS animation layer — carries no game state.
 */
export interface WeaponFireEvent {
  /** Unique ID for tracking in-flight animations */
  id: string;
  /** Hex position of the attacker */
  attackerPos: HexCoord;
  /** Hex position of the primary target */
  targetPos: HexCoord;
  /** Weapon tags drive the visual style (use [] for generic AI weapons) */
  weaponTags: WeaponTag[];
  /** true = attacker is enemy/station; false = player-allied */
  isEnemy: boolean;
}
