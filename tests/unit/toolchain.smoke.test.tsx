import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../../src/App';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/game/render/GameCanvas', () => ({
  GameCanvas: ({ debugMode }: { debugMode: boolean }) => (
    <div data-testid="game-canvas-mock" data-debug-mode={debugMode ? 'true' : 'false'} />
  )
}));

describe('App smoke', () => {
  it('renders start overlay', () => {
    render(<App />);
    expect(screen.getByRole('dialog', { name: 'start-screen' })).toBeTruthy();
  });

  it('toggles pause overlay with Escape while playing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Run' }));
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'pause-screen' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'pause-screen' })).toBeNull();
  });

  it('pauses and switches canvas to debug mode while debug panel is open', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Run' }));
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
