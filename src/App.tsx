import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { StartScreen } from './game/ui/StartScreen';
import { GameOverScreen } from './game/ui/GameOverScreen';

export function App() {
  const game = useMemo(() => new Game(), []);
  const [snapshot, setSnapshot] = useState(() => game.snapshot());

  useEffect(() => game.subscribe(setSnapshot), [game]);

  return (
    <main className="app-shell" data-game-state={snapshot.state}>
      <GameCanvas game={game} snapshot={snapshot} />
      {snapshot.state === GameState.Boot && <StartScreen onStart={() => game.start()} />}
      {snapshot.state === GameState.GameOver && <GameOverScreen onRestart={() => game.restart()} />}
    </main>
  );
}
