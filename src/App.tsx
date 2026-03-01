import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game, type DebugEmitterSettings } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { StartScreen } from './game/ui/StartScreen';
import { GameOverScreen } from './game/ui/GameOverScreen';
import { PauseScreen } from './game/ui/PauseScreen';
import { DebugPanel } from './game/ui/DebugPanel';

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
  const [snapshot, setSnapshot] = useState(() => game.snapshot());
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [debugEmitterEnabled, setDebugEmitterEnabled] = useState(false);
  const [debugEmitterSettings, setDebugEmitterSettings] = useState<DebugEmitterSettings>(INITIAL_DEBUG_EMITTER_SETTINGS);
  const debugForcedPauseRef = useRef(false);

  useEffect(() => game.subscribe(setSnapshot), [game]);
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

  return (
    <main className={`app-shell ${debugPanelOpen ? 'debug-open' : ''}`} data-game-state={snapshot.state}>
      <div className="game-stage">
        <GameCanvas game={game} snapshot={snapshot} debugMode={debugPanelOpen} />
      </div>
      <DebugPanel
        open={debugPanelOpen}
        emitterEnabled={debugEmitterEnabled}
        settings={debugEmitterSettings}
        onToggleOpen={() => setDebugPanelOpen((open) => !open)}
        onSetEmitterEnabled={setDebugEmitterEnabled}
        onPatchSettings={(patch) => setDebugEmitterSettings((current) => ({ ...current, ...patch }))}
      />
      {!debugPanelOpen && snapshot.state === GameState.Boot && <StartScreen onStart={() => game.start()} />}
      {!debugPanelOpen && snapshot.state === GameState.Paused && <PauseScreen onResume={() => game.resume()} />}
      {!debugPanelOpen && snapshot.state === GameState.GameOver && <GameOverScreen onRestart={() => game.restart()} />}
    </main>
  );
}
