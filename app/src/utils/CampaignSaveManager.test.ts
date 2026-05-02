import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CampaignSaveManager } from './CampaignSaveManager';
import { useCampaignStore } from '../store/useCampaignStore';

// Mock Toast
vi.mock('../components/campaign/ToastContainer', () => ({
  fireToast: vi.fn(),
}));

describe('CampaignSaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset store to a known state
    useCampaignStore.setState({
      campaign: { currentSector: 1, difficulty: 'normal' } as any,
      campaignLog: [],
      persistedPlayers: [{ id: 'p1', name: 'Commander' }] as any,
      persistedShips: [{ id: 's1', name: 'Resolute' }] as any,
      officerDataMap: {},
      sectorMap: { nodes: [], paths: [] } as any,
    });
  });

  describe('Browser Storage (Local Storage)', () => {
    it('successfully saves the campaign state to localStorage', () => {
      CampaignSaveManager.saveToBrowser();
      
      const savedDataStr = localStorage.getItem('CoC_Campaign_Save');
      expect(savedDataStr).not.toBeNull();
      
      const savedData = JSON.parse(savedDataStr!);
      expect(savedData.campaign.currentSector).toBe(1);
      expect(savedData.persistedPlayers[0].name).toBe('Commander');
      expect(savedData.persistedShips[0].name).toBe('Resolute');
    });

    it('correctly identifies if a save exists', () => {
      expect(CampaignSaveManager.hasBrowserSave()).toBe(false);
      
      localStorage.setItem('CoC_Campaign_Save', '{}');
      expect(CampaignSaveManager.hasBrowserSave()).toBe(true);
    });

    it('successfully loads the campaign state from localStorage', () => {
      const mockData = {
        campaign: { currentSector: 5, difficulty: 'hard' },
        campaignLog: [{ message: 'Saved at sector 5' }],
        persistedPlayers: [{ id: 'p2', name: 'Elite' }],
        persistedShips: [{ id: 's2', name: 'Defiant' }],
        officerDataMap: { 'off-1': { stress: 0 } },
        sectorMap: { nodes: [{ id: 'node-1' }], paths: [] },
      };
      
      localStorage.setItem('CoC_Campaign_Save', JSON.stringify(mockData));
      
      const success = CampaignSaveManager.loadFromBrowser();
      expect(success).toBe(true);
      
      const state = useCampaignStore.getState();
      expect(state.campaign?.currentSector).toBe(5);
      expect(state.campaign?.difficulty).toBe('hard');
      expect(state.persistedPlayers[0].name).toBe('Elite');
      expect(state.persistedShips[0].name).toBe('Defiant');
      expect(state.campaignLog[0].message).toBe('Saved at sector 5');
    });

    it('returns false and does not crash when loading a non-existent save', () => {
      const success = CampaignSaveManager.loadFromBrowser();
      expect(success).toBe(false);
    });

    it('handles corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem('CoC_Campaign_Save', 'invalid-json-{');
      const success = CampaignSaveManager.loadFromBrowser();
      expect(success).toBe(false);
    });
  });

  describe('Disk Operations (Export/Import)', () => {
    it('triggers a file download during export', () => {
      // Mocking Blob and URL
      const mockUrl = 'blob:http://localhost:3000/mock-uuid';
      global.URL.createObjectURL = vi.fn(() => mockUrl);
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock link element behavior
      const link = { 
        click: vi.fn(), 
        href: '', 
        download: '', 
        style: {},
      };
      vi.spyOn(document, 'createElement').mockReturnValue(link as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => undefined as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => undefined as any);

      CampaignSaveManager.exportToDisk();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(link.href).toBe(mockUrl);
      expect(link.download).toMatch(/^coc_campaign_save_\d{4}-\d{2}-\d{2}\.json$/);
      expect(link.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('successfully imports a valid save file from disk', async () => {
      const importData = {
        campaign: { currentSector: 3, difficulty: 'normal' },
        campaignLog: [],
        persistedPlayers: [],
        persistedShips: [],
        officerDataMap: {},
        sectorMap: null,
      };
      
      const mockFile = new File(
        [JSON.stringify(importData)], 
        'campaign_save.json', 
        { type: 'application/json' }
      );

      const successPromise = CampaignSaveManager.importFromDisk(mockFile);
      
      const success = await successPromise;
      expect(success).toBe(true);
      
      const state = useCampaignStore.getState();
      expect(state.campaign?.currentSector).toBe(3);
    });

    it('rejects invalid or corrupted files during import', async () => {
      const mockFile = new File(
        ['this is not json'], 
        'bad_save.json', 
        { type: 'application/json' }
      );

      const success = await CampaignSaveManager.importFromDisk(mockFile);
      expect(success).toBe(false);
      
      // State should remain unchanged from beforeEach
      expect(useCampaignStore.getState().campaign?.currentSector).toBe(1);
    });
  });
});
