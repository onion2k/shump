import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../../src/App';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/game/render/GameCanvas', () => ({
  GameCanvas: ({
    debugMode,
    snapshot,
    hasSavedRun,
    onStart,
    onStartFresh
  }: {
    debugMode: boolean;
    snapshot: { state: string };
    hasSavedRun: boolean;
    onStart: () => void;
    onStartFresh?: () => void;
  }) => (
    <div data-testid="game-canvas-mock" data-debug-mode={debugMode ? 'true' : 'false'}>
      {snapshot.state === 'boot' && (
        <div>
          {hasSavedRun ? (
            <>
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
      )}
    </div>
  )
}));

describe('App smoke', () => {
  function clickBootStartAction() {
    const startButton = screen.queryByRole('button', { name: 'Start Run' }) ?? screen.getByRole('button', { name: 'Resume Run' });
    fireEvent.click(startButton);
  }

  it('renders start controls in the 3d canvas flow', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Start Run' }) ?? screen.getByRole('button', { name: 'Resume Run' })).toBeTruthy();
  });

  it('toggles pause overlay with Escape while playing', () => {
    render(<App />);

    clickBootStartAction();
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'pause-screen' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();
  });

  it('pauses and switches canvas to debug mode while debug panel is open', () => {
    render(<App />);

    clickBootStartAction();
    expect(screen.getByTestId('game-canvas-mock')).toBeTruthy();
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-debug-mode')).toBe('false');

    fireEvent.keyDown(window, { key: 'F1' });
    expect(screen.getByRole('button', { name: 'Hide Debug' })).toBeTruthy();
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-debug-mode')).toBe('true');
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();

    fireEvent.keyDown(window, { key: 'F1' });
    expect(screen.getByRole('button', { name: 'Show Debug' })).toBeTruthy();
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-debug-mode')).toBe('false');
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();
  });
});
