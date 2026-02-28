import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../../src/App';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/game/render/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas-mock" />
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
});
