import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { useCampaignStore } from '../store/useCampaignStore';
import { fireToast } from '../components/campaign/ToastContainer';
import type { CampaignPhase, CampaignDifficulty } from '../types/campaignTypes';

// ══════════════════════════════════════════════════════════════════
// Multi-Slot Campaign Save Manager — IndexedDB backend
//
// Stores each save slot as a record in the `saves` object store of
// "ChainOfCommandDB".  The keyPath is `meta.id`, so every record is
// self-indexing.  A secondary index (`by-date`) on `meta.savedAt`
// lets us sort by recency cheaply.
//
// On first open we run a one-time migration that imports any
// existing CoC_Save_* localStorage slots (including the old index
// and the legacy single-slot key) into IndexedDB, then removes
// them from localStorage.
// ══════════════════════════════════════════════════════════════════

const DB_NAME = 'ChainOfCommandDB';
const DB_VERSION = 2;
const STORE_NAME = 'saves' as const;

/** localStorage keys used by the previous implementation — migrated once. */
const LS_INDEX_KEY = 'CoC_Save_Index';
const LS_SLOT_PREFIX = 'CoC_Save_';
const LS_LEGACY_KEY = 'CoC_Campaign_Save';

export const MAX_SAVE_SLOTS = 25;

// ─── DB Schema ────────────────────────────────────────────────────

export interface SaveSlotMeta {
  id: string;
  name: string;
  savedAt: number;
  sector: number;
  phase: CampaignPhase;
  difficulty: CampaignDifficulty;
  fleetFavor: number;
  requisitionPoints: number;
  shipCount: number;
}

interface SaveSlotData {
  meta: SaveSlotMeta;
  campaign: unknown;
  campaignLog: unknown;
  persistedPlayers: unknown;
  persistedShips: unknown;
  officerDataMap: unknown;
  sectorMap: unknown;
}

interface CoCSchema extends DBSchema {
  saves: {
    key: string;
    value: SaveSlotData;
    indexes: { 'by-date': number };
  };
}

// ─── Phase display labels ─────────────────────────────────────────

const PHASE_LABELS: Record<CampaignPhase, string> = {
  story: 'Story',
  sectorMap: 'Sector Map',
  nodeResolution: 'Node Resolution',
  postCombat: 'Post-Combat',
  eliteReward: 'Elite Assets',
  drydock: 'Drydock',
  gameOver: 'Game Over',
};

// ─── DB singleton ─────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

export function getDB(): Promise<IDBPDatabase<any>> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' });
          store.createIndex('by-date', 'meta.savedAt');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('high_scores')) {
          const hsStore = db.createObjectStore('high_scores', { keyPath: 'id' });
          hsStore.createIndex('by-score', 'finalScore');
        }
      },
    }).then(async db => {
      // One-time migration from localStorage → IndexedDB
      await migrateFromLocalStorage(db);
      return db;
    }).catch(err => {
      // Reset the singleton so future calls can try again rather than
      // permanently returning the same rejected promise.
      console.error('[CampaignSaveManager] Failed to open IndexedDB:', err);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// ─── One-time localStorage → IndexedDB migration ─────────────────

/**
 * Reads any save slots previously stored in localStorage and writes them
 * into IndexedDB, then removes all CoC_Save_* and index keys from
 * localStorage.  Safe to call multiple times — it no-ops if nothing remains
 * to migrate.
 */
async function migrateFromLocalStorage(db: IDBPDatabase<any>): Promise<void> {
  try {
    // 1. Migrate the old single-slot legacy key first
    const legacy = localStorage.getItem(LS_LEGACY_KEY);
    if (legacy) {
      try {
        const raw = JSON.parse(legacy);
        const campaign = raw.campaign;
        const meta: SaveSlotMeta = {
          id: generateId(),
          name: 'Migrated Save',
          savedAt: Date.now(),
          sector: campaign?.currentSector ?? 1,
          phase: campaign?.campaignPhase ?? 'sectorMap',
          difficulty: campaign?.difficulty ?? 'normal',
          fleetFavor: campaign?.fleetFavor ?? 0,
          requisitionPoints: campaign?.requisitionPoints ?? 0,
          shipCount: (raw.persistedShips as unknown[])?.length ?? 0,
        };
        const slotData: SaveSlotData = { meta, ...raw };
        await db.put(STORE_NAME, slotData);
      } catch {
        // Corrupted legacy key — silently discard
      }
      localStorage.removeItem(LS_LEGACY_KEY);
    }

    // 2. Migrate the multi-slot index
    const rawIndex = localStorage.getItem(LS_INDEX_KEY);
    if (!rawIndex) return;

    const index: SaveSlotMeta[] = JSON.parse(rawIndex);
    for (const meta of index) {
      const rawSlot = localStorage.getItem(`${LS_SLOT_PREFIX}${meta.id}`);
      if (!rawSlot) continue;
      try {
        const slotData: SaveSlotData = JSON.parse(rawSlot);
        // Only write if not already present (idempotent)
        const existing = await db.get(STORE_NAME, meta.id);
        if (!existing) {
          await db.put(STORE_NAME, slotData);
        }
      } catch {
        // Skip corrupted slots
      }
      localStorage.removeItem(`${LS_SLOT_PREFIX}${meta.id}`);
    }
    localStorage.removeItem(LS_INDEX_KEY);
  } catch (e) {
    console.warn('[CampaignSaveManager] localStorage migration encountered an error:', e);
  }
}

// ─── Local helpers ────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════════════════
// CampaignSaveManager
// ══════════════════════════════════════════════════════════════════

export class CampaignSaveManager {

  // ── Metadata / Listing ────────────────────────────────────────

  /** Returns all save slot metadata sorted by most recent first. */
  static async listSaves(): Promise<SaveSlotMeta[]> {
    const db = await getDB();
    const allSlots = await db.getAll(STORE_NAME);
    return allSlots
      .map(s => s.meta)
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  /** True if at least one save slot exists. */
  static async hasSaves(): Promise<boolean> {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    return count > 0;
  }

  // ── Auto-name Generation ──────────────────────────────────────

  /**
   * Builds a reasonable default save name from the current campaign state.
   * e.g. "Sector 2 – Hard – Sector Map"
   */
  static generateSaveName(): string {
    const state = useCampaignStore.getState();
    const campaign = state.campaign;
    if (!campaign) return `Campaign Save – ${new Date().toLocaleDateString()}`;

    const diff = campaign.difficulty ?? 'normal';
    const difficulty = diff.charAt(0).toUpperCase() + diff.slice(1);
    const phaseLabel = PHASE_LABELS[campaign.campaignPhase] ?? campaign.campaignPhase ?? 'Unknown';
    return `Sector ${campaign.currentSector ?? 1} – ${difficulty} – ${phaseLabel}`;
  }

  // ── Save ──────────────────────────────────────────────────────

  /**
   * Saves current campaign state as a new slot with the given name.
   * Returns the new slot metadata, or null if the save failed.
   */
  static async save(name: string): Promise<SaveSlotMeta | null> {
    try {
      const state = useCampaignStore.getState();
      const campaign = state.campaign;
      if (!campaign) {
        fireToast({ type: 'warning', message: 'No active campaign to save' });
        return null;
      }

      const db = await getDB();
      const slotCount = await db.count(STORE_NAME);

      if (slotCount >= MAX_SAVE_SLOTS) {
        fireToast({ type: 'warning', message: `Max ${MAX_SAVE_SLOTS} save slots reached – delete a save first` });
        return null;
      }

      const meta: SaveSlotMeta = {
        id: generateId(),
        name: name.trim() || this.generateSaveName(),
        savedAt: Date.now(),
        sector: campaign.currentSector,
        phase: campaign.campaignPhase,
        difficulty: campaign.difficulty,
        fleetFavor: campaign.fleetFavor,
        requisitionPoints: campaign.requisitionPoints,
        shipCount: state.persistedShips.length,
      };

      const slotData: SaveSlotData = {
        meta,
        campaign: state.campaign,
        campaignLog: state.campaignLog,
        persistedPlayers: state.persistedPlayers,
        persistedShips: state.persistedShips,
        officerDataMap: state.officerDataMap,
        sectorMap: state.sectorMap,
      };

      await db.put(STORE_NAME, slotData);

      useCampaignStore.getState().setActiveSaveSlotId(meta.id);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign saved',
        outcome: `Saved to slot "${meta.name}".`,
      });
      fireToast({ type: 'system', message: `Saved: "${meta.name}"` });
      return meta;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to save:', e);
      fireToast({ type: 'warning', message: 'Failed to save campaign' });
      return null;
    }
  }

  /**
   * Overwrites an existing save slot with the current campaign state,
   * keeping the same slot ID but updating all other fields.
   * Returns the updated slot metadata, or null if the operation failed.
   */
  static async overwrite(slotId: string, name: string): Promise<SaveSlotMeta | null> {
    try {
      const state = useCampaignStore.getState();
      const campaign = state.campaign;
      if (!campaign) {
        fireToast({ type: 'warning', message: 'No active campaign to save' });
        return null;
      }

      const db = await getDB();
      const existing = await db.get(STORE_NAME, slotId);
      if (!existing) {
        fireToast({ type: 'warning', message: 'Save slot not found' });
        return null;
      }

      const meta: SaveSlotMeta = {
        id: slotId,
        name: name.trim() || this.generateSaveName(),
        savedAt: Date.now(),
        sector: campaign.currentSector,
        phase: campaign.campaignPhase,
        difficulty: campaign.difficulty,
        fleetFavor: campaign.fleetFavor,
        requisitionPoints: campaign.requisitionPoints,
        shipCount: state.persistedShips.length,
      };

      const slotData: SaveSlotData = {
        meta,
        campaign: state.campaign,
        campaignLog: state.campaignLog,
        persistedPlayers: state.persistedPlayers,
        persistedShips: state.persistedShips,
        officerDataMap: state.officerDataMap,
        sectorMap: state.sectorMap,
      };

      await db.put(STORE_NAME, slotData);

      useCampaignStore.getState().setActiveSaveSlotId(meta.id);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign overwritten',
        outcome: `Overwrote slot "${meta.name}".`,
      });
      fireToast({ type: 'system', message: `Saved: "${meta.name}"` });
      return meta;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to overwrite:', e);
      fireToast({ type: 'warning', message: 'Failed to overwrite campaign' });
      return null;
    }
  }

  // ── Load ──────────────────────────────────────────────────────

  /** Loads a save slot by ID. Returns true on success. */
  static async load(slotId: string): Promise<boolean> {
    try {
      const db = await getDB();
      const slotData = await db.get(STORE_NAME, slotId);
      if (!slotData) {
        fireToast({ type: 'warning', message: 'Save slot not found' });
        return false;
      }
      useCampaignStore.getState().loadCampaignState(slotData as any);
      useCampaignStore.getState().setActiveSaveSlotId(slotId);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign loaded',
        outcome: `Loaded from slot "${slotData.meta?.name ?? slotId}".`,
      });
      fireToast({ type: 'system', message: `Loaded: "${slotData.meta?.name ?? 'Campaign'}"` });
      return true;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to load slot:', e);
      fireToast({ type: 'warning', message: 'Failed to load save' });
      return false;
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  /** Permanently deletes a save slot. */
  static async deleteSave(slotId: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, slotId);

      if (useCampaignStore.getState().activeSaveSlotId === slotId) {
        useCampaignStore.getState().setActiveSaveSlotId(null);
      }
      fireToast({ type: 'system', message: 'Save deleted' });
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to delete slot:', e);
      fireToast({ type: 'warning', message: 'Failed to delete save' });
    }
  }

  // ── Export / Import ───────────────────────────────────────────

  /**
   * Exports a single save slot to a JSON file on disk.
   * If no slotId is provided, exports from the current campaign state.
   */
  static async exportSlot(slotId?: string): Promise<void> {
    try {
      let dataStr: string;
      let filename: string;

      if (slotId) {
        const db = await getDB();
        const slotData = await db.get(STORE_NAME, slotId);
        if (!slotData) {
          fireToast({ type: 'warning', message: 'Save slot not found for export' });
          return;
        }
        dataStr = JSON.stringify(slotData, null, 2);
        const safeName = (slotData.meta?.name ?? slotId).replace(/[^a-zA-Z0-9\-_ ]/g, '').trim();
        filename = `coc_save_${safeName || slotId}_${new Date().toISOString().slice(0, 10)}.json`;
      } else {
        // Legacy path: export current in-memory state
        const state = useCampaignStore.getState();
        const data = {
          campaign: state.campaign,
          campaignLog: state.campaignLog,
          persistedPlayers: state.persistedPlayers,
          persistedShips: state.persistedShips,
          officerDataMap: state.officerDataMap,
          sectorMap: state.sectorMap,
        };
        dataStr = JSON.stringify(data, null, 2);
        filename = `coc_campaign_save_${new Date().toISOString().slice(0, 10)}.json`;
      }

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      fireToast({ type: 'system', message: 'Campaign exported to disk' });
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to export:', e);
      fireToast({ type: 'warning', message: 'Failed to export save' });
    }
  }

  /** @deprecated Use exportSlot() instead. */
  static async exportToDisk(): Promise<void> {
    return this.exportSlot();
  }

  /**
   * Imports a campaign save JSON file from disk.
   * Accepts both the new multi-slot format (has `meta` field) and the
   * legacy single-slot format.  Creates a new save slot from the file.
   * Returns true on success.
   */
  static async importFromDisk(file: File): Promise<boolean> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const raw = JSON.parse(e.target?.result as string);

          // Determine format
          let data: Omit<SaveSlotData, 'meta'>;
          let importedName = `Imported – ${file.name.replace(/\.json$/i, '')}`;

          if (raw.meta && raw.campaign) {
            // New multi-slot format
            data = raw;
            importedName = raw.meta.name ? `${raw.meta.name} (imported)` : importedName;
          } else if (raw.campaign) {
            // Legacy single-slot format
            data = raw;
          } else {
            throw new Error('Unrecognized save file format');
          }

          // Load into store immediately
          useCampaignStore.getState().loadCampaignState(data as any);

          // Also persist as a new slot
          const campaign = (data as any).campaign;
          const meta: SaveSlotMeta = {
            id: generateId(),
            name: importedName,
            savedAt: Date.now(),
            sector: campaign?.currentSector ?? 1,
            phase: campaign?.campaignPhase ?? 'sectorMap',
            difficulty: campaign?.difficulty ?? 'normal',
            fleetFavor: campaign?.fleetFavor ?? 0,
            requisitionPoints: campaign?.requisitionPoints ?? 0,
            shipCount: ((data as any).persistedShips as unknown[])?.length ?? 0,
          };
          const slotData: SaveSlotData = { meta, ...(data as any) };

          const db = await getDB();
          await db.put(STORE_NAME, slotData);

          useCampaignStore.getState().setActiveSaveSlotId(meta.id);
          useCampaignStore.getState().pushCampaignLog({
            type: 'system',
            message: 'Campaign imported',
            outcome: `Imported from "${file.name}".`,
          });
          fireToast({ type: 'system', message: `Imported: "${meta.name}"` });
          resolve(true);
        } catch (err) {
          console.error('[CampaignSaveManager] Failed to parse import:', err);
          fireToast({ type: 'warning', message: 'Invalid save file' });
          resolve(false);
        }
      };
      reader.onerror = () => {
        console.error('[CampaignSaveManager] Failed to read file');
        fireToast({ type: 'warning', message: 'Failed to read file' });
        resolve(false);
      };
      reader.readAsText(file);
    });
  }

  // ── Legacy compat shims ───────────────────────────────────────

  /**
   * Overwrites the active save slot if one exists, otherwise creates a new slot.
   */
  static async quickSave(): Promise<boolean> {
    const activeId = useCampaignStore.getState().activeSaveSlotId;
    if (activeId) {
      const saves = await this.listSaves();
      const existing = saves.find(s => s.id === activeId);
      if (existing) {
        return !!(await this.overwrite(activeId, existing.name));
      }
    }
    const meta = await this.save('');
    return !!meta;
  }

  /** @deprecated use save() and handle slot IDs manually */
  static async saveToBrowser(): Promise<boolean> {
    const meta = await this.save('');
    return !!meta;
  }

  /** @deprecated use hasSaves() instead */
  static async hasBrowserSave(): Promise<boolean> {
    return this.hasSaves();
  }

  /**
   * @deprecated Use load() with a slot ID instead.
   * Loads the most-recently-saved slot.
   */
  static async loadFromBrowser(): Promise<boolean> {
    const saves = await this.listSaves();
    if (saves.length === 0) return false;
    return this.load(saves[0].id);
  }

  /**
   * @deprecated — retained only for the legacy single-slot migration flow.
   * All migration is now handled inside getDB() → migrateFromLocalStorage().
   */
  static migrateLegacySave(): void {
    // No-op: migration is performed automatically when the DB is first opened.
  }
}
