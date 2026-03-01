import rawSettings from './gameSettings.json';

export const gameSettings = rawSettings;

export function particleColor(kind: string): string {
  return gameSettings.visuals.particles.colors[kind as keyof typeof gameSettings.visuals.particles.colors]
    ?? gameSettings.visuals.particles.defaultColor;
}
