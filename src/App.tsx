import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { StartScreen } from './game/ui/StartScreen';
import { GameOverScreen } from './game/ui/GameOverScreen';
import { PauseScreen } from './game/ui/PauseScreen';

export function App() {
  const game = useMemo(() => new Game(), []);
  const [snapshot, setSnapshot] = useState(() => game.snapshot());

  useEffect(() => game.subscribe(setSnapshot), [game]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
      {snapshot.state === GameState.Boot && <StartScreen onStart={() => game.start()} />}
      {snapshot.state === GameState.Paused && <PauseScreen onResume={() => game.resume()} />}
      {snapshot.state === GameState.GameOver && <GameOverScreen onRestart={() => game.restart()} />}
    </main>
  );
}
