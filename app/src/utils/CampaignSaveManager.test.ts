import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CampaignSaveManager, MAX_SAVE_SLOTS } from './CampaignSaveManager';
import { useCampaignStore } from '../store/useCampaignStore';

// Mock Toast
vi.mock('../components/campaign/ToastContainer', () => ({
  fireToast: vi.fn(),
}));

// ─── Shared test state ────────────────────────────────────────────

const MOCK_CAMPAIGN = {
  currentSector: 1,
  difficulty: 'normal',
  campaignPhase: 'sectorMap',
  fleetFavor: 2,
  requisitionPoints: 30,
} as any;

function setupStore(overrides: Partial<typeof MOCK_CAMPAIGN> = {}) {
  useCampaignStore.setState({
    campaign: { ...MOCK_CAMPAIGN, ...overrides } as any,
    campaignLog: [],
    persistedPlayers: [{ id: 'p1', name: 'Commander' }] as any,
    persistedShips: [{ id: 's1', name: 'Resolute' }, { id: 's2', name: 'Defiant' }] as any,
    officerDataMap: {},
    sectorMap: { nodes: [], paths: [] } as any,
  });
}

describe('CampaignSaveManager – Multi-Slot System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setupStore();
  });

  // ── Auto-name generation ──────────────────────────────────────

  describe('generateSaveName()', () => {
    it('returns a human-readable name from campaign state', () => {
      const name = CampaignSaveManager.generateSaveName();
      expect(name).toMatch(/Sector 1/);
      expect(name).toMatch(/Normal/);
      expect(name).toMatch(/Sector Map/);
    });

    it('includes sector number in the name', () => {
      setupStore({ currentSector: 3 });
      const name = CampaignSaveManager.generateSaveName();
      expect(name).toMatch(/Sector 3/);
    });

    it('falls back gracefully when no campaign is active', () => {
      useCampaignStore.setState({ campaign: null } as any);
      const name = CampaignSaveManager.generateSaveName();
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
    });
  });

  // ── hasSaves / listSaves ──────────────────────────────────────

  describe('hasSaves() / listSaves()', () => {
    it('returns false when no saves exist', () => {
      expect(CampaignSaveManager.hasSaves()).toBe(false);
    });

    it('returns true after at least one save', () => {
      CampaignSaveManager.save('Test Save');
      expect(CampaignSaveManager.hasSaves()).toBe(true);
    });

    it('lists saves sorted newest first', () => {
      CampaignSaveManager.save('First Save');
      CampaignSaveManager.save('Second Save');
      CampaignSaveManager.save('Third Save');

      const saves = CampaignSaveManager.listSaves();
      expect(saves).toHaveLength(3);
      expect(saves[0].name).toBe('Third Save');
      expect(saves[2].name).toBe('First Save');
    });

    it('includes all expected metadata fields', () => {
      CampaignSaveManager.save('Meta Test');
      const saves = CampaignSaveManager.listSaves();
      const meta = saves[0];

      expect(meta.id).toBeTruthy();
      expect(meta.name).toBe('Meta Test');
      expect(typeof meta.savedAt).toBe('number');
      expect(meta.sector).toBe(1);
      expect(meta.phase).toBe('sectorMap');
      expect(meta.difficulty).toBe('normal');
      expect(meta.fleetFavor).toBe(2);
      expect(meta.requisitionPoints).toBe(30);
      expect(meta.shipCount).toBe(2);
    });
  });

  // ── save() ────────────────────────────────────────────────────

  describe('save()', () => {
    it('creates a new save slot and returns metadata', () => {
      const meta = CampaignSaveManager.save('My Campaign');
      expect(meta).not.toBeNull();
      expect(meta!.name).toBe('My Campaign');
      expect(meta!.id).toBeTruthy();
    });

    it('persists the slot data to localStorage', () => {
      const meta = CampaignSaveManager.save('Persistence Test');
      const raw = localStorage.getItem(`CoC_Save_${meta!.id}`);
      expect(raw).not.toBeNull();
      const data = JSON.parse(raw!);
      expect(data.campaign.currentSector).toBe(1);
      expect(data.persistedShips).toHaveLength(2);
    });

    it('updates the index after saving', () => {
      CampaignSaveManager.save('Slot A');
      CampaignSaveManager.save('Slot B');
      const index = JSON.parse(localStorage.getItem('CoC_Save_Index')!);
      expect(index).toHaveLength(2);
    });

    it('uses auto-name when an empty name is provided', () => {
      const meta = CampaignSaveManager.save('');
      expect(meta!.name).toMatch(/Sector/);
    });

    it('returns null when no campaign is active', () => {
      useCampaignStore.setState({ campaign: null } as any);
      const meta = CampaignSaveManager.save('Should Fail');
      expect(meta).toBeNull();
    });

    it('rejects saving when at the 25-slot limit', () => {
      // Fill up all slots
      for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        CampaignSaveManager.save(`Slot ${i}`);
      }
      expect(CampaignSaveManager.listSaves()).toHaveLength(MAX_SAVE_SLOTS);

      const extra = CampaignSaveManager.save('One Too Many');
      expect(extra).toBeNull();
      expect(CampaignSaveManager.listSaves()).toHaveLength(MAX_SAVE_SLOTS);
    });
  });

  // ── overwrite() ───────────────────────────────────────────────

  describe('overwrite()', () => {
    it('updates an existing slot with current state', () => {
      const original = CampaignSaveManager.save('Original Name');
      expect(original).not.toBeNull();
      const slotId = original!.id;

      // Change store state
      setupStore({ currentSector: 2, requisitionPoints: 75 });

      const updated = CampaignSaveManager.overwrite(slotId, 'Updated Name');
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.sector).toBe(2);
      expect(updated!.requisitionPoints).toBe(75);
    });

    it('preserves the same slot ID after overwrite', () => {
      const original = CampaignSaveManager.save('Keep ID');
      const updated = CampaignSaveManager.overwrite(original!.id, 'New Name');
      expect(updated!.id).toBe(original!.id);
    });

    it('keeps slot count the same after overwrite', () => {
      const meta = CampaignSaveManager.save('Before');
      CampaignSaveManager.overwrite(meta!.id, 'After');
      expect(CampaignSaveManager.listSaves()).toHaveLength(1);
    });

    it('returns null when slot ID does not exist', () => {
      const result = CampaignSaveManager.overwrite('nonexistent-id', 'Ghost');
      expect(result).toBeNull();
    });
  });

  // ── load() ────────────────────────────────────────────────────

  describe('load()', () => {
    it('restores campaign state from a slot', () => {
      const meta = CampaignSaveManager.save('Load Test');

      // Wipe store
      useCampaignStore.setState({
        campaign: null,
        persistedPlayers: [],
        persistedShips: [],
      } as any);

      const success = CampaignSaveManager.load(meta!.id);
      expect(success).toBe(true);

      const state = useCampaignStore.getState();
      expect(state.campaign?.currentSector).toBe(1);
      expect(state.persistedShips).toHaveLength(2);
    });

    it('returns false when slot ID does not exist', () => {
      const success = CampaignSaveManager.load('ghost-id');
      expect(success).toBe(false);
    });

    it('returns false when slot data is corrupted', () => {
      // Manually write bad data
      localStorage.setItem('CoC_Save_bad-id', 'not-json-{');
      const success = CampaignSaveManager.load('bad-id');
      expect(success).toBe(false);
    });
  });

  // ── deleteSave() ──────────────────────────────────────────────

  describe('deleteSave()', () => {
    it('removes the slot from localStorage and the index', () => {
      const meta = CampaignSaveManager.save('To Delete');
      CampaignSaveManager.deleteSave(meta!.id);

      expect(localStorage.getItem(`CoC_Save_${meta!.id}`)).toBeNull();
      expect(CampaignSaveManager.listSaves()).toHaveLength(0);
    });

    it('only removes the targeted slot when multiple exist', () => {
      CampaignSaveManager.save('Keep Me');
      const toDelete = CampaignSaveManager.save('Delete Me');
      CampaignSaveManager.save('Keep Me Too');

      CampaignSaveManager.deleteSave(toDelete!.id);
      const remaining = CampaignSaveManager.listSaves();
      expect(remaining).toHaveLength(2);
      expect(remaining.find(s => s.id === toDelete!.id)).toBeUndefined();
    });
  });

  // ── Legacy migration ──────────────────────────────────────────

  describe('Legacy save migration', () => {
    it('migrates the old CoC_Campaign_Save key to a new slot', () => {
      const legacyData = {
        campaign: { currentSector: 2, difficulty: 'hard', campaignPhase: 'drydock', fleetFavor: 1, requisitionPoints: 50 },
        campaignLog: [],
        persistedPlayers: [],
        persistedShips: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
        officerDataMap: {},
        sectorMap: null,
      };
      localStorage.setItem('CoC_Campaign_Save', JSON.stringify(legacyData));

      const saves = CampaignSaveManager.listSaves();
      expect(saves).toHaveLength(1);
      expect(saves[0].name).toBe('Migrated Save');
      expect(saves[0].sector).toBe(2);
      expect(saves[0].difficulty).toBe('hard');
      expect(saves[0].shipCount).toBe(3);

      // Old key should be gone
      expect(localStorage.getItem('CoC_Campaign_Save')).toBeNull();
    });

    it('does not create duplicate migrations if called multiple times', () => {
      const legacyData = {
        campaign: { currentSector: 1, difficulty: 'normal', campaignPhase: 'sectorMap', fleetFavor: 0, requisitionPoints: 0 },
        persistedShips: [],
      };
      localStorage.setItem('CoC_Campaign_Save', JSON.stringify(legacyData));

      CampaignSaveManager.listSaves();
      CampaignSaveManager.listSaves();
      CampaignSaveManager.listSaves();

      expect(CampaignSaveManager.listSaves()).toHaveLength(1);
    });

    it('silently removes a corrupted legacy key without crashing', () => {
      localStorage.setItem('CoC_Campaign_Save', 'broken-json');
      expect(() => CampaignSaveManager.listSaves()).not.toThrow();
      expect(localStorage.getItem('CoC_Campaign_Save')).toBeNull();
    });
  });

  // ── Legacy compat shims ───────────────────────────────────────

  describe('Legacy compat shims', () => {
    it('hasBrowserSave() delegates to hasSaves()', () => {
      expect(CampaignSaveManager.hasBrowserSave()).toBe(false);
      CampaignSaveManager.save('Compat Test');
      expect(CampaignSaveManager.hasBrowserSave()).toBe(true);
    });

    it('loadFromBrowser() loads the most recent save', () => {
      CampaignSaveManager.save('Older');
      CampaignSaveManager.save('Newer');

      // Wipe store
      useCampaignStore.setState({ campaign: null } as any);

      const success = CampaignSaveManager.loadFromBrowser();
      expect(success).toBe(true);
      expect(useCampaignStore.getState().campaign?.currentSector).toBe(1);
    });

    it('loadFromBrowser() returns false when no saves exist', () => {
      expect(CampaignSaveManager.loadFromBrowser()).toBe(false);
    });

    it('saveToBrowser() creates a new slot with an auto-generated name', () => {
      CampaignSaveManager.saveToBrowser();
      const saves = CampaignSaveManager.listSaves();
      expect(saves).toHaveLength(1);
      expect(saves[0].name).toMatch(/Sector/);
    });
  });

  // ── Disk export/import ────────────────────────────────────────

  describe('exportSlot()', () => {
    it('triggers a file download for a specific slot', () => {
      const mockUrl = 'blob:http://localhost/mock';
      globalThis.URL.createObjectURL = vi.fn(() => mockUrl);
      globalThis.URL.revokeObjectURL = vi.fn();

      const link = { click: vi.fn(), href: '', download: '', style: {} };
      vi.spyOn(document, 'createElement').mockReturnValue(link as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => undefined as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => undefined as any);

      const meta = CampaignSaveManager.save('Export Me');
      CampaignSaveManager.exportSlot(meta!.id);

      expect(link.click).toHaveBeenCalled();
      expect(link.download).toMatch(/\.json$/);
      expect(link.href).toBe(mockUrl);
    });
  });

  describe('importFromDisk()', () => {
    it('imports a new-format slot file and creates a save entry', async () => {
      const slotData = {
        meta: {
          id: 'imported-id',
          name: 'Imported Campaign',
          savedAt: Date.now(),
          sector: 3,
          phase: 'drydock',
          difficulty: 'hard',
          fleetFavor: 4,
          requisitionPoints: 100,
          shipCount: 2,
        },
        campaign: { currentSector: 3, difficulty: 'hard', campaignPhase: 'drydock', fleetFavor: 4, requisitionPoints: 100 },
        campaignLog: [],
        persistedPlayers: [],
        persistedShips: [{ id: 's1' }, { id: 's2' }],
        officerDataMap: {},
        sectorMap: null,
      };

      const file = new File([JSON.stringify(slotData)], 'test.json', { type: 'application/json' });
      const success = await CampaignSaveManager.importFromDisk(file);

      expect(success).toBe(true);
      expect(useCampaignStore.getState().campaign?.currentSector).toBe(3);

      const saves = CampaignSaveManager.listSaves();
      expect(saves.length).toBeGreaterThan(0);
      expect(saves[0].name).toMatch(/imported/i);
    });

    it('imports a legacy-format file and loads state', async () => {
      const legacyData = {
        campaign: { currentSector: 2, difficulty: 'easy', campaignPhase: 'sectorMap', fleetFavor: 0, requisitionPoints: 10 },
        campaignLog: [],
        persistedPlayers: [],
        persistedShips: [],
        officerDataMap: {},
        sectorMap: null,
      };

      const file = new File([JSON.stringify(legacyData)], 'legacy.json', { type: 'application/json' });
      const success = await CampaignSaveManager.importFromDisk(file);

      expect(success).toBe(true);
      expect(useCampaignStore.getState().campaign?.currentSector).toBe(2);
    });

    it('rejects invalid/corrupted JSON files', async () => {
      const file = new File(['not json at all'], 'bad.json', { type: 'application/json' });
      const success = await CampaignSaveManager.importFromDisk(file);
      expect(success).toBe(false);
    });
  });
});
