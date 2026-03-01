interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="overlay" role="dialog" aria-label="start-screen">
      <h1>Shump Prototype</h1>
      <p>Drag or touch to move. Auto-fire is enabled.</p>
      <p>Press ` or F1 for debug controls.</p>
      <button type="button" onClick={onStart}>
        Start Run
      </button>
    </div>
  );
}
