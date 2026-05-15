import { useState, useEffect } from 'react';
import { useBgm } from './utils/useBgm';
import { useGameStore } from './store/useGameStore';
import { useUIStore } from './store/useUIStore';
import { useTutorialStore } from './store/useTutorialStore';
import GameScreen from './components/console/GameScreen';
import MainMenu from './components/setup/MainMenu';
import ScenarioEditor from './components/setup/ScenarioEditor';
import type { CustomScenarioConfig } from './components/setup/ScenarioEditor';
import FleetBuilder from './components/setup/FleetBuilder';
import GameOverScreen from './components/setup/GameOverScreen';
import ModalOverlay from './components/ModalOverlay';
import CampaignScreen from './components/campaign/CampaignScreen';
import { useCampaignStore } from './store/useCampaignStore';
import ToastContainer from './components/campaign/ToastContainer';
import { buildTutorialGameConfig } from './data/tutorialScenario';
import { useViewport } from './utils/useViewport';

import { ScreenOrientation } from '@capacitor/screen-orientation';

function App() {
  useViewport(); // Run globally to synchronize the 'is-phone' body class
  const phase = useGameStore(s => s.phase);
  const gameOver = useGameStore(s => s.gameOver);
  const fleetFavor = useGameStore(s => s.fleetFavor);
  const isRedAlert = useUIStore(s => s.isRedAlert);
  
  // App-level routing state
  const [appMode, setAppMode] = useState<'menu' | 'editor' | 'skirmish-builder' | 'campaign-builder' | 'skirmish' | 'campaign' | 'campaign-combat' | 'tutorial'>('menu');
  const [scenarioConfig, setScenarioConfig] = useState<CustomScenarioConfig | null>(null);

  useEffect(() => {
    // Lock to portrait only for the main menu.
    // Lock to landscape for all other modes (gameplay, builders, etc.)
    const applyOrientation = async () => {
      try {
        if (appMode === 'menu') {
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
  }, [appMode]);

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
  const endTutorial = useTutorialStore(s => s.endTutorial);

  // We no longer aggressively auto-advance campaign combat.
  // GameOverScreen will render when gameOver is true, and the user clicks the return button to trigger onCombatEnd.

  if (appMode === 'menu') {
    return (
      <MainMenu 
        onStart={() => setAppMode('editor')} 
        onStartCampaign={() => setAppMode('campaign-builder')} 
        onContinueCampaign={() => setAppMode('campaign')}
        onStartTutorial={() => {
          resetGame();
          endTutorial();
          initializeGame(buildTutorialGameConfig());
          startTutorial();
          setAppMode('tutorial');
        }}
      />
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
        <CampaignScreen onStartCombat={() => setAppMode('campaign-combat')} />
        <ToastContainer />
      </>
    );
  }

  if (appMode === 'campaign-combat') {
    if (gameOver) {
      return <GameOverScreen onReturn={() => setAppMode('campaign')} />;
    }
    return (
      <div className={`app-root ${isRedAlert ? 'red-alert' : ''}`}>
        <GameScreen />
        <ModalOverlay />
      </div>
    );
  }

  // ── Skirmish mode ───────────────────────────────────────────────
  if (gameOver) {
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
