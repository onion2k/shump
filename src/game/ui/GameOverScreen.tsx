interface GameOverScreenProps {
  onRestart: () => void;
}

export function GameOverScreen({ onRestart }: GameOverScreenProps) {
  return (
    <div className="overlay" role="dialog" aria-label="game-over-screen">
      <h2>Game Over</h2>
      <button type="button" onClick={onRestart}>
        Restart
      </button>
    </div>
  );
}
