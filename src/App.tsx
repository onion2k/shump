import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game, type DebugEmitterSettings } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { StartScreen } from './game/ui/StartScreen';
import { GameOverScreen } from './game/ui/GameOverScreen';
import { PauseScreen } from './game/ui/PauseScreen';
import { DebugPanel } from './game/ui/DebugPanel';
import { createLocalSaveService } from './game/persistence/SaveService';
import type { SaveFile } from './game/persistence/saveSchema';
import { BetweenRoundsScreen } from './game/ui/BetweenRoundsScreen';
import { resolveCard } from './game/content/cards';

const INITIAL_DEBUG_EMITTER_SETTINGS: DebugEmitterSettings = {
  positionX: 0,
  positionY: 0,
  directionDegrees: 90,
  spreadDegrees: 35,
  emitterLifetimeMs: 60_000,
  particleType: 'debug',
  emissionRatePerSecond: 50,
  particleLifetimeMs: 500,
  particleSpeed: 3.5,
  directionRandomness: 0,
  velocityRandomness: 0,
  lifetimeRandomness: 0,
  particleRadius: 0.12,
  velocityX: 0,
  velocityY: 0
};

export function App() {
  const game = useMemo(() => new Game(), []);
  const saveService = useMemo(() => createLocalSaveService(), []);
  const [snapshot, setSnapshot] = useState(() => game.snapshot());
  const [saveFile, setSaveFile] = useState<SaveFile>(() => saveService.load().save);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [debugEmitterEnabled, setDebugEmitterEnabled] = useState(false);
  const [debugEnemyPatternsEnabled, setDebugEnemyPatternsEnabled] = useState(false);
  const [debugEmitterSettings, setDebugEmitterSettings] = useState<DebugEmitterSettings>(INITIAL_DEBUG_EMITTER_SETTINGS);
  const debugForcedPauseRef = useRef(false);

  useEffect(() => game.subscribe(setSnapshot), [game]);
  useEffect(() => {
    setSaveFile(saveService.load().save);
  }, [saveService]);
  useEffect(() => {
    game.setDebugEmitterEnabled(debugEmitterEnabled);
  }, [debugEmitterEnabled, game]);
  useEffect(() => {
    game.setDebugEmitterSettings(debugEmitterSettings);
  }, [debugEmitterSettings, game]);
  useEffect(() => {
    game.setDebugModeActive(debugPanelOpen);
  }, [debugPanelOpen, game]);
  useEffect(() => {
    if (debugPanelOpen) {
      if (game.snapshot().state === GameState.Playing) {
        debugForcedPauseRef.current = true;
        game.pause();
      } else {
        debugForcedPauseRef.current = false;
      }
      return;
    }

    if (debugForcedPauseRef.current && game.snapshot().state === GameState.Paused) {
      game.resume();
    }

    debugForcedPauseRef.current = false;
  }, [debugPanelOpen, game]);
  useEffect(() => {
    if (snapshot.state === GameState.GameOver) {
      setSaveFile(saveService.clearActiveRun());
      game.clearRunProgress();
    }
  }, [game, saveService, snapshot.state]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '`' || event.key === 'F1') {
        event.preventDefault();
        setDebugPanelOpen((open) => !open);
        return;
      }

      if (event.key !== 'Escape') {
        if (!debugPanelOpen) {
          if (/^[1-4]$/.test(event.key)) {
            game.selectWeaponBySlot(Number(event.key));
          } else if (event.key === '5') {
            game.cyclePods();
          } else if (event.key === '6') {
            game.togglePodWeaponMode();
          }
        }
        return;
      }

      if (debugPanelOpen) {
        return;
      }

      game.togglePause();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [debugPanelOpen, game]);

  function persistCurrentRun() {
    const runProgress = game.exportRunProgress();
    if (!runProgress) {
      return setSaveFile(saveService.clearActiveRun());
    }

    return setSaveFile(saveService.saveActiveRun(runProgress));
  }

  function startFreshRun() {
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function resumeSavedRun() {
    if (saveFile.activeRun) {
      game.startFromRunProgress(saveFile.activeRun);
      persistCurrentRun();
      return;
    }

    game.startNewRun();
    persistCurrentRun();
  }

  function startRun() {
    game.startNewRun();
    persistCurrentRun();
  }

  function restartRun() {
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function activateCard(cardId: string, replaceCardId?: string) {
    if (!game.activateFoundCard(cardId, replaceCardId)) {
      return;
    }

    persistCurrentRun();
  }

  function buyCard(cardId: string) {
    if (!game.buyCard(cardId)) {
      return;
    }

    persistCurrentRun();
  }

  function startNextRound() {
    game.startNextRound();
    persistCurrentRun();
  }

  function openShop() {
    game.openShop();
  }

  function closeShop() {
    game.closeShop();
  }

  const foundCards = snapshot.foundCards
    .map((cardId) => resolveCard(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const activeCards = snapshot.activeCards
    .map((cardId) => resolveCard(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const shopCards = game.shopOffers();

  return (
    <main className={`app-shell ${debugPanelOpen ? 'debug-open' : ''}`} data-game-state={snapshot.state}>
      <div className="game-stage">
        <GameCanvas
          game={game}
          snapshot={snapshot}
          debugMode={debugPanelOpen}
          showEnemyPatterns={debugEnemyPatternsEnabled}
        />
      </div>
      <DebugPanel
        open={debugPanelOpen}
        emitterEnabled={debugEmitterEnabled}
        enemyPatternsEnabled={debugEnemyPatternsEnabled}
        settings={debugEmitterSettings}
        onToggleOpen={() => setDebugPanelOpen((open) => !open)}
        onSetEmitterEnabled={setDebugEmitterEnabled}
        onSetEnemyPatternsEnabled={setDebugEnemyPatternsEnabled}
        onPatchSettings={(patch) => setDebugEmitterSettings((current) => ({ ...current, ...patch }))}
      />
      {!debugPanelOpen && snapshot.state === GameState.Boot && (
        <StartScreen onStart={saveFile.activeRun ? resumeSavedRun : startRun} hasSavedRun={Boolean(saveFile.activeRun)} onStartFresh={startFreshRun} />
      )}
      {!debugPanelOpen && snapshot.state === GameState.Paused && <PauseScreen onResume={() => game.resume()} />}
      {!debugPanelOpen && (snapshot.state === GameState.BetweenRounds || snapshot.state === GameState.Shop) && (
        <BetweenRoundsScreen
          levelId={snapshot.levelId}
          roundIndex={snapshot.roundIndex}
          totalRounds={snapshot.totalRounds}
          activeCardLimit={snapshot.activeCardLimit}
          money={snapshot.inRunMoney}
          foundCards={foundCards}
          activeCards={activeCards}
          shopCards={shopCards}
          onActivateCard={activateCard}
          onOpenShop={openShop}
          onCloseShop={closeShop}
          onBuyCard={buyCard}
          onContinue={startNextRound}
          shopOpen={snapshot.state === GameState.Shop}
        />
      )}
      {!debugPanelOpen && snapshot.state === GameState.GameOver && <GameOverScreen onRestart={restartRun} />}
    </main>
  );
}
