import { useState, useEffect } from 'react';
import { useBgm } from './utils/useBgm';
import { useGameStore } from './store/useGameStore';
import { useUIStore } from './store/useUIStore';
import { useTutorialStore } from './store/useTutorialStore';
import { useSettingsStore } from './store/useSettingsStore';
import GameScreen from './components/console/GameScreen';
import MainMenu from './components/setup/MainMenu';
import ScenarioEditor from './components/setup/ScenarioEditor';
import type { CustomScenarioConfig } from './components/setup/ScenarioEditor';
import FleetBuilder from './components/setup/FleetBuilder';
import ModalOverlay from './components/ModalOverlay';
import GameOverScreen from './components/setup/GameOverScreen';
import CampaignScreen from './components/campaign/CampaignScreen';
import { useCampaignStore } from './store/useCampaignStore';
import ToastContainer from './components/campaign/ToastContainer';
import { buildTutorialGameConfig } from './data/tutorialScenario';
import { useViewport } from './utils/useViewport';
import RecoveryBanner from './components/setup/RecoveryBanner';
import { CombatRecoveryManager } from './utils/CombatRecoveryManager';
import type { AppMode } from './utils/CombatRecoveryManager';
import { useFleetBuilderTutorialStore } from './store/useFleetBuilderTutorialStore';

import { ScreenOrientation } from '@capacitor/screen-orientation';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function App() {
  useViewport(); // Run globally to synchronize the 'is-phone' body class
  const phase = useGameStore(s => s.phase);
  const gameOver = useGameStore(s => s.gameOver);
  const fleetFavor = useGameStore(s => s.fleetFavor);
  const isRedAlert = useUIStore(s => s.isRedAlert);
  const isHowToPlayOpen = useUIStore(s => s.isHowToPlayOpen);
  const setReturnToMenuCallback = useSettingsStore(s => s.setReturnToMenuCallback);
  const isSettingsOpen = useSettingsStore(s => s.isSettingsOpen);
  const endTutorial = useTutorialStore(s => s.endTutorial);
  const campaignPhase = useCampaignStore(s => s.campaign?.campaignPhase);
  
  // App-level routing state
  const [appMode, setAppMode] = useState<AppMode>('menu');
  const [scenarioConfig, setScenarioConfig] = useState<CustomScenarioConfig | null>(null);

  // ── Combat Recovery ───────────────────────────────────────────────
  // On mount, check whether a background-killed battle was cached.
  const [recoveryMeta, setRecoveryMeta] = useState<ReturnType<typeof CombatRecoveryManager.getSnapshotMeta>>(null);

  useEffect(() => {
    setRecoveryMeta(CombatRecoveryManager.getSnapshotMeta());
  }, []);

  // Register the "return to main menu" navigation callback in the global
  // settings store so SettingsModal can trigger it without prop drilling.
  // We only set it when we are NOT on the main menu so that it naturally hides.
  useEffect(() => {
    if (appMode === 'menu') {
      setReturnToMenuCallback(null);
    } else {
      setReturnToMenuCallback(() => {
        // Deliberate exit — clear recovery cache so no stale prompt appears
        CombatRecoveryManager.clearRecovery();
        endTutorial();
        setAppMode('menu');
      });
    }
  }, [appMode, setReturnToMenuCallback, endTutorial]);

  // Safeguard: Ensure the combat tutorial is automatically disarmed/reset
  // whenever the player is in any other game mode (skirmish, campaign, builder, menu).
  useEffect(() => {
    if (appMode !== 'tutorial') {
      endTutorial();
    }
  }, [appMode, endTutorial]);

  // Register the Capacitor hardware back-button listener.
  useEffect(() => {
    let handle: any = null;
    const initListener = async () => {
      try {
        handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            CapacitorApp.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (e) {
        // Fallback for environments where the plugin isn't available
      }
    };
    initListener();
    return () => { handle?.remove(); };
  }, []);

  // ── Background Recovery Save ──────────────────────────────────────
  // When the app is sent to the background during an active battle,
  // write the current combat state to the recovery cache so it can be
  // restored if Android kills the process to free RAM.
  useEffect(() => {
    let handle: ReturnType<typeof CapacitorApp.addListener> | null = null;
    const registerListener = async () => {
      try {
        handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            // App going to background — save combat state
            CombatRecoveryManager.saveRecovery(appMode);
          }
        });
      } catch (e) {
        // Not running in a Capacitor context (web/dev) — ignore
      }
    };
    registerListener();
    return () => { handle?.then(l => l.remove()); };
  }, [appMode]);

  useEffect(() => {
    // Lock to portrait for the main menu, fleet builders, and campaign map.
    // Also force portrait while the settings modal is open.
    // Lock to landscape for all gameplay modes (skirmish, combat, etc.)
    const applyOrientation = async () => {
      try {
        // eliteReward is a full-screen overlay that needs landscape for 3-column layout
        const isCampaignMap = appMode === 'campaign' && campaignPhase !== 'drydock' && campaignPhase !== 'eliteReward';
        // Rules Reference always forces landscape regardless of current app mode
        if (isHowToPlayOpen) {
          await ScreenOrientation.lock({ orientation: 'landscape' });
        } else if (gameOver || isSettingsOpen || appMode === 'menu' || appMode === 'skirmish-builder' || appMode === 'campaign-builder' || isCampaignMap) {
          await ScreenOrientation.lock({ orientation: 'portrait' });
        } else {
          await ScreenOrientation.lock({ orientation: 'landscape' });
        }
      } catch (err) {
        // Will safely fail in non-Capacitor web environments
        console.warn('ScreenOrientation lock failed:', err);
      }
    };
    applyOrientation();
  }, [appMode, isSettingsOpen, gameOver, campaignPhase, isHowToPlayOpen]);

  const menuModes = ['menu', 'editor', 'skirmish-builder', 'campaign-builder'];
  const isMenuMode = menuModes.includes(appMode);

  // Play lobby music during all pre-game screens; hook unmounts/remounts
  // automatically to stop when switching away.
  useBgm(isMenuMode ? '/assets/music/Below_The_Permafrost.mp3' : '', 0.15);

  const startCampaign = useCampaignStore(s => s.startNewCampaign);
  const onCombatEnd = useCampaignStore(s => s.onCombatEnd);
  const resetGame = useGameStore(s => s.resetGame);
  const initializeGame = useGameStore(s => s.initializeGame);
  const startTutorial = useTutorialStore(s => s.startTutorial);

  // We no longer aggressively auto-advance campaign combat.
  // GameOverScreen will render when gameOver is true, and the user clicks the return button to trigger onCombatEnd.

  if (appMode === 'menu') {
    const handleRecoveryResume = () => {
      const restoredMode = CombatRecoveryManager.loadRecovery();
      setRecoveryMeta(null);
      if (restoredMode) {
        setAppMode(restoredMode);
      }
    };

    const handleRecoveryDiscard = () => {
      CombatRecoveryManager.clearRecovery();
      setRecoveryMeta(null);
    };

    return (
      <>
      <MainMenu
        recoveryBanner={
          recoveryMeta ? (
            <RecoveryBanner
              round={recoveryMeta.round}
              savedAt={recoveryMeta.savedAt}
              onResume={handleRecoveryResume}
              onDiscard={handleRecoveryDiscard}
            />
          ) : null
        }
        onStart={() => setAppMode('editor')}
        onStartCampaign={() => {
          useFleetBuilderTutorialStore.getState().resetForNewCampaign();
          setAppMode('campaign-builder');
        }}
        onContinueCampaign={() => setAppMode('campaign')}
        onStartTutorial={() => {
          resetGame();
          endTutorial();
          startTutorial();
          initializeGame(buildTutorialGameConfig());
          setAppMode('tutorial');
        }}
      />
      </>
    );
  }

  if (appMode === 'editor') {
    return (
      <ScenarioEditor 
        onCancel={() => setAppMode('menu')} 
        onConfirm={(config) => {
          setScenarioConfig(config);
          setAppMode('skirmish-builder');
        }} 
      />
    );
  }

  if (appMode === 'skirmish-builder') {
    return (
      <FleetBuilder 
        scenarioConfig={scenarioConfig} 
        onCancel={() => setAppMode('menu')} 
        onSkirmishStart={() => setAppMode('skirmish')}
      />
    );
  }

  if (appMode === 'campaign-builder') {
    return (
      <FleetBuilder 
        isCampaignSetup={true}
        onCancel={() => setAppMode('menu')} 
        onCampaignStart={(fleetAdmiralPlayerId, players, ships, difficulty, dpBudget) => {
          const officerDataMap = {};
          startCampaign({ fleetAdmiralPlayerId, players, ships, officerDataMap, difficulty, dpBudget });
          setAppMode('campaign');
        }}
      />
    );
  }

  if (appMode === 'tutorial') {
    if (gameOver) {
      // Battle ended — clear recovery cache (nothing left to recover)
      CombatRecoveryManager.clearRecovery();
      return <GameOverScreen onReturn={() => { endTutorial(); setAppMode('menu'); }} />;
    }
    return (
      <div className={`app-root ${isRedAlert ? 'red-alert' : ''}`}>
        <GameScreen />
        <ModalOverlay />
      </div>
    );
  }

  if (appMode === 'campaign') {
    if (gameOver) {
      return <GameOverScreen onReturn={() => setAppMode('menu')} />;
    }
    return (
      <>
        <CampaignScreen 
          onStartCombat={() => setAppMode('campaign-combat')} 
          onLeaveCampaign={() => {
            useCampaignStore.getState().clearCampaign();
            setAppMode('menu');
          }}
        />
        <ToastContainer />
      </>
    );
  }

  if (appMode === 'campaign-combat') {
    if (gameOver) {
      CombatRecoveryManager.clearRecovery();
      return <GameOverScreen onReturn={() => setAppMode('campaign')} />;
    }
    return (
      <>
        <div className={`app-root ${isRedAlert ? 'red-alert' : ''}`}>
          <GameScreen />
          <ModalOverlay />
        </div>
        <ToastContainer />
      </>
    );
  }

  // ── Skirmish mode ───────────────────────────────────────────────
  if (gameOver) {
    CombatRecoveryManager.clearRecovery();
    return <GameOverScreen onReturn={() => setAppMode('menu')} />;
  }

  return (
    <div className={`app-root ${isRedAlert ? 'red-alert' : ''}`}>
      <GameScreen />
      <ModalOverlay />
    </div>
  );
}

export default App;
