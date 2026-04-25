import { useCampaignStore } from '../store/useCampaignStore';
import { fireToast } from '../components/campaign/ToastContainer';

const SAVE_KEY = 'CoC_Campaign_Save';

export class CampaignSaveManager {
  static saveToBrowser() {
    const state = useCampaignStore.getState();
    const dataToSave = {
      campaign: state.campaign,
      campaignLog: state.campaignLog,
      persistedPlayers: state.persistedPlayers,
      persistedShips: state.persistedShips,
      officerDataMap: state.officerDataMap,
      sectorMap: state.sectorMap,
    };
    
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Quick save requested',
        outcome: 'Campaign state saved to browser storage.',
      });
      fireToast({ type: 'tech', message: 'Campaign Quick Saved' });
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      fireToast({ type: 'warning', message: 'Failed to Quick Save' });
    }
  }

  static hasBrowserSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  static loadFromBrowser(): boolean {
    try {
      const dataStr = localStorage.getItem(SAVE_KEY);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      useCampaignStore.getState().loadCampaignState(data);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Campaign resumed',
        outcome: 'Quick save loaded from browser storage.',
      });
      fireToast({ type: 'tech', message: 'Campaign Loaded from Quick Save' });
      return true;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      fireToast({ type: 'warning', message: 'Failed to load Quick Save' });
      return false;
    }
  }

  static exportToDisk() {
    const state = useCampaignStore.getState();
    const dataToSave = {
      campaign: state.campaign,
      campaignLog: state.campaignLog,
      persistedPlayers: state.persistedPlayers,
      persistedShips: state.persistedShips,
      officerDataMap: state.officerDataMap,
      sectorMap: state.sectorMap,
    };

    try {
      const dataStr = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `coc_campaign_save_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      useCampaignStore.getState().pushCampaignLog({
        type: 'system',
        message: 'Exported campaign save',
        outcome: `Save package written to ${a.download}.`,
      });
      
      fireToast({ type: 'tech', message: 'Campaign Exported to Disk' });
    } catch (e) {
      console.error('Failed to export to disk:', e);
      fireToast({ type: 'warning', message: 'Failed to Export Campaign' });
    }
  }

  static async importFromDisk(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          useCampaignStore.getState().loadCampaignState(data);
          useCampaignStore.getState().pushCampaignLog({
            type: 'system',
            message: 'Imported campaign save',
            outcome: `Campaign state restored from ${file.name}.`,
          });
          fireToast({ type: 'tech', message: 'Campaign Imported from Disk' });
          resolve(true);
        } catch (err) {
          console.error('Failed to parse campaign save file:', err);
          fireToast({ type: 'warning', message: 'Invalid Save File' });
          resolve(false);
        }
      };
      reader.onerror = () => {
        console.error('Failed to read campaign save file');
        fireToast({ type: 'warning', message: 'Failed to read file' });
        resolve(false);
      };
      reader.readAsText(file);
    });
  }
}
