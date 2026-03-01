import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => game.subscribe(setSnapshot), [game]);
  useEffect(() => {
    game.setDebugEmitterEnabled(debugEmitterEnabled);
  }, [debugEmitterEnabled, game]);
  useEffect(() => {
    game.setDebugEmitterSettings(debugEmitterSettings);
  }, [debugEmitterSettings, game]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '`' || event.key === 'F1') {
        event.preventDefault();
        setDebugPanelOpen((open) => !open);
        return;
      }

      if (event.key !== 'Escape') {
        return;
      }

      game.togglePause();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [game]);

  return (
    <main className="app-shell" data-game-state={snapshot.state}>
      <GameCanvas game={game} snapshot={snapshot} />
      <DebugPanel
        open={debugPanelOpen}
        emitterEnabled={debugEmitterEnabled}
        settings={debugEmitterSettings}
        onToggleOpen={() => setDebugPanelOpen((open) => !open)}
        onSetEmitterEnabled={setDebugEmitterEnabled}
        onPatchSettings={(patch) => setDebugEmitterSettings((current) => ({ ...current, ...patch }))}
      />
      {snapshot.state === GameState.Boot && <StartScreen onStart={() => game.start()} />}
      {snapshot.state === GameState.Paused && <PauseScreen onResume={() => game.resume()} />}
      {snapshot.state === GameState.GameOver && <GameOverScreen onRestart={() => game.restart()} />}
    </main>
  );
}
