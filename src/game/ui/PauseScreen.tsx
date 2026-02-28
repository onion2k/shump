interface PauseScreenProps {
  onResume: () => void;
}

export function PauseScreen({ onResume }: PauseScreenProps) {
  return (
    <div className="overlay" role="dialog" aria-label="pause-screen">
      <h2>Paused</h2>
      <p>Press Escape to resume.</p>
      <button type="button" onClick={onResume}>
        Resume
      </button>
    </div>
  );
}
