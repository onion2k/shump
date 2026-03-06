import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../../src/App';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/game/render/GameCanvas', () => ({
  GameCanvas: ({
    snapshot,
    hasSavedRun,
    onStart,
    onStartFresh
  }: {
    snapshot: { state: string };
    hasSavedRun: boolean;
    onStart: () => void;
    onStartFresh?: () => void;
  }) => (
    <div data-testid="game-canvas-mock" data-state={snapshot.state}>
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
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-state')).toBe('playing');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-state')).toBe('paused');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('game-canvas-mock').getAttribute('data-state')).toBe('playing');
  });
});
