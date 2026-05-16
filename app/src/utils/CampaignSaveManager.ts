import { useCampaignStore } from '../store/useCampaignStore';
import { fireToast } from '../components/campaign/ToastContainer';
import type { CampaignPhase, CampaignDifficulty } from '../types/campaignTypes';

// ══════════════════════════════════════════════════════════════════
// Multi-Slot Campaign Save Manager
// Each slot is stored in its own localStorage key.
// A separate index key stores lightweight metadata for listing.
// ══════════════════════════════════════════════════════════════════

const INDEX_KEY = 'CoC_Save_Index';
const SLOT_PREFIX = 'CoC_Save_';
/** Legacy single-slot key — migrated automatically on first listSaves() call. */
const LEGACY_KEY = 'CoC_Campaign_Save';

export const MAX_SAVE_SLOTS = 25;

// ─── Types ────────────────────────────────────────────────────────

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

// ─── Phase display labels ─────────────────────────────────────────

const PHASE_LABELS: Record<CampaignPhase, string> = {
  story: 'Story',
  sectorMap: 'Sector Map',
  nodeResolution: 'Node Resolution',
  postCombat: 'Post-Combat',
  drydock: 'Drydock',
  gameOver: 'Game Over',
};

// ─── Local helpers ────────────────────────────────────────────────

function readIndex(): SaveSlotMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SaveSlotMeta[];
  } catch {
    return [];
  }
}

function writeIndex(index: SaveSlotMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function slotKey(id: string): string {
  return `${SLOT_PREFIX}${id}`;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Estimates the byte size of a value when JSON-serialized.
 */
function estimatedJsonSize(value: unknown): number {
  return JSON.stringify(value).length;
}

/**
 * Returns a rough estimate of how full localStorage is (0–1).
 * The W3C spec suggests ~5 MB; some browsers allow more.
 */
function localStorageUsageFraction(): number {
  const ESTIMATED_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return total / ESTIMATED_MAX_BYTES;
}

// ══════════════════════════════════════════════════════════════════
// CampaignSaveManager
// ══════════════════════════════════════════════════════════════════

export class CampaignSaveManager {

  // ── Migration ─────────────────────────────────────────────────

  /**
   * If the old single-slot key exists, import it as a named slot and
   * delete the old key.  Called lazily by listSaves().
   */
  static migrateLegacySave(): void {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;

    try {
      const data = JSON.parse(legacy);
      const campaign = data.campaign;
      const meta: SaveSlotMeta = {
        id: generateId(),
        name: 'Migrated Save',
        savedAt: Date.now(),
        sector: campaign?.currentSector ?? 1,
        phase: campaign?.campaignPhase ?? 'sectorMap',
        difficulty: campaign?.difficulty ?? 'normal',
        fleetFavor: campaign?.fleetFavor ?? 0,
        requisitionPoints: campaign?.requisitionPoints ?? 0,
        shipCount: (data.persistedShips as unknown[])?.length ?? 0,
      };
      const slotData: SaveSlotData = { meta, ...data };
      localStorage.setItem(slotKey(meta.id), JSON.stringify(slotData));

      const index = readIndex();
      index.unshift(meta);
      writeIndex(index);

      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // If migration fails just remove the broken legacy key
      localStorage.removeItem(LEGACY_KEY);
    }
  }

  // ── Metadata / Listing ────────────────────────────────────────

  /** Returns all save slot metadata sorted by most recent first. */
  static listSaves(): SaveSlotMeta[] {
    this.migrateLegacySave();
    const index = readIndex();
    return [...index].sort((a, b) => b.savedAt - a.savedAt);
  }

  /** True if at least one save slot exists. */
  static hasSaves(): boolean {
    this.migrateLegacySave();
    return readIndex().length > 0;
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
  static save(name: string): SaveSlotMeta | null {
    const state = useCampaignStore.getState();
    const campaign = state.campaign;
    if (!campaign) {
      fireToast({ type: 'warning', message: 'No active campaign to save' });
      return null;
    }

    const index = readIndex();

    if (index.length >= MAX_SAVE_SLOTS) {
      fireToast({ type: 'warning', message: `Max ${MAX_SAVE_SLOTS} save slots reached – delete a save first` });
      return null;
    }

    // Warn if localStorage is nearing capacity
    const usageFraction = localStorageUsageFraction();
    if (usageFraction > 0.8) {
      console.warn('[CampaignSaveManager] localStorage is over 80% full.');
      fireToast({ type: 'warning', message: 'Storage nearly full – consider exporting and deleting old saves' });
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

    try {
      localStorage.setItem(slotKey(meta.id), JSON.stringify(slotData));

      // Prepend to index (newest first)
      index.unshift(meta);
      writeIndex(index);

      useCampaignStore.getState().setActiveSaveSlotId(meta.id);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign saved',
        outcome: `Saved to slot "${meta.name}".`,
      });
      fireToast({ type: 'tech', message: `Saved: "${meta.name}"` });
      return meta;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to save:', e);
      // Check if storage quota exceeded
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        fireToast({ type: 'warning', message: 'Storage full – export and delete old saves' });
      } else {
        fireToast({ type: 'warning', message: 'Failed to save campaign' });
      }
      return null;
    }
  }

  /**
   * Overwrites an existing save slot with the current campaign state,
   * keeping the same slot ID but updating all other fields.
   * Returns the updated slot metadata, or null if the operation failed.
   */
  static overwrite(slotId: string, name: string): SaveSlotMeta | null {
    const state = useCampaignStore.getState();
    const campaign = state.campaign;
    if (!campaign) {
      fireToast({ type: 'warning', message: 'No active campaign to save' });
      return null;
    }

    const index = readIndex();
    const existingIdx = index.findIndex(m => m.id === slotId);
    if (existingIdx === -1) {
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

    try {
      localStorage.setItem(slotKey(slotId), JSON.stringify(slotData));

      const idx = index.findIndex(s => s.id === slotId);
      if (idx !== -1) {
        index[idx] = meta;
        writeIndex(index);
      }

      useCampaignStore.getState().setActiveSaveSlotId(meta.id);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign overwritten',
        outcome: `Overwrote slot "${meta.name}".`,
      });
      fireToast({ type: 'tech', message: `Saved: "${meta.name}"` });
      return meta;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to overwrite:', e);
      fireToast({ type: 'warning', message: 'Failed to overwrite save' });
      return null;
    }
  }

  // ── Load ──────────────────────────────────────────────────────

  /** Loads a save slot by ID. Returns true on success. */
  static load(slotId: string): boolean {
    try {
      const raw = localStorage.getItem(slotKey(slotId));
      if (!raw) {
        fireToast({ type: 'warning', message: 'Save slot not found' });
        return false;
      }
      const slotData: SaveSlotData = JSON.parse(raw);
      useCampaignStore.getState().loadCampaignState(slotData as any);
      useCampaignStore.getState().setActiveSaveSlotId(slotId);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign loaded',
        outcome: `Loaded from slot "${slotData.meta?.name ?? slotId}".`,
      });
      fireToast({ type: 'tech', message: `Loaded: "${slotData.meta?.name ?? 'Campaign'}"` });
      return true;
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to load slot:', e);
      fireToast({ type: 'warning', message: 'Failed to load save' });
      return false;
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  /** Permanently deletes a save slot and removes it from the index. */
  static deleteSave(slotId: string): void {
    try {
      localStorage.removeItem(slotKey(slotId));
      const index = readIndex();
      const filtered = index.filter(s => s.id !== slotId);
      writeIndex(filtered);

      if (useCampaignStore.getState().activeSaveSlotId === slotId) {
        useCampaignStore.getState().setActiveSaveSlotId(null);
      }
      fireToast({ type: 'tech', message: 'Save deleted' });
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to delete slot:', e);
      fireToast({ type: 'warning', message: 'Failed to delete save' });
    }
  }

  // ── Export / Import ───────────────────────────────────────────

  /**
   * Exports a single save slot to a JSON file on disk.
   * If no slotId is provided, exports from the current campaign state
   * (matching the old exportToDisk() behavior).
   */
  static exportSlot(slotId?: string): void {
    try {
      let dataStr: string;
      let filename: string;

      if (slotId) {
        const raw = localStorage.getItem(slotKey(slotId));
        if (!raw) {
          fireToast({ type: 'warning', message: 'Save slot not found for export' });
          return;
        }
        const slotData: SaveSlotData = JSON.parse(raw);
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

      fireToast({ type: 'tech', message: 'Campaign exported to disk' });
    } catch (e) {
      console.error('[CampaignSaveManager] Failed to export:', e);
      fireToast({ type: 'warning', message: 'Failed to export save' });
    }
  }

  /** @deprecated Use exportSlot() instead. */
  static exportToDisk(): void {
    this.exportSlot();
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
      reader.onload = e => {
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
          localStorage.setItem(slotKey(meta.id), JSON.stringify(slotData));
          const index = readIndex();
          index.unshift(meta);
          writeIndex(index);

          useCampaignStore.getState().setActiveSaveSlotId(meta.id);
          useCampaignStore.getState().pushCampaignLog({
            type: 'system',
            message: 'Campaign imported',
            outcome: `Imported from "${file.name}".`,
          });
          fireToast({ type: 'tech', message: `Imported: "${meta.name}"` });
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
  static quickSave(): boolean {
    const activeId = useCampaignStore.getState().activeSaveSlotId;
    if (activeId && this.listSaves().some(s => s.id === activeId)) {
      const existingName = this.listSaves().find(s => s.id === activeId)?.name || '';
      return !!this.overwrite(activeId, existingName);
    }
    const meta = this.save('');
    return !!meta;
  }

  /** @deprecated use save() and handle slot IDs manually */
  static saveToBrowser(): boolean {
    const meta = this.save('');
    return !!meta;
  }

  /** @deprecated use hasSaves() instead */
  static hasBrowserSave(): boolean {
    return this.hasSaves();
  }

  /**
   * @deprecated Use load() with a slot ID instead.
   * Loads the most-recently-saved slot.
   */
  static loadFromBrowser(): boolean {
    const saves = this.listSaves();
    if (saves.length === 0) return false;
    return this.load(saves[0].id);
  }
}
