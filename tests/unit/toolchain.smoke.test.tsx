import { render, screen } from '@testing-library/react';
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
});
