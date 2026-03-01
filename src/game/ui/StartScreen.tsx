interface StartScreenProps {
  onStart: () => void;
  hasSavedRun?: boolean;
  onStartFresh?: () => void;
}

export function StartScreen({ onStart, hasSavedRun = false, onStartFresh }: StartScreenProps) {
  return (
    <div className="overlay" role="dialog" aria-label="start-screen">
      <h1>Shump Prototype</h1>
      <p>Drag or touch to move. Auto-fire is enabled.</p>
      <p>Press ` or F1 for debug controls.</p>
      {hasSavedRun ? (
        <>
          <p>A saved run is available.</p>
          <button type="button" onClick={onStart}>
            Resume Run
          </button>
          <button type="button" onClick={onStartFresh ?? onStart}>
            New Run
          </button>
        </>
      ) : (
        <button type="button" onClick={onStart}>
          Start Run
        </button>
      )}
    </div>
  );
}
