import type { WaveDef } from '../systems/waveScript';

export interface RoundDefinition {
  id: string;
  waves: WaveDef[];
}

export interface LevelDefinition {
  id: string;
  name: string;
  rounds: RoundDefinition[];
}

const level1Rounds: RoundDefinition[] = [
  {
    id: 'l1-r1',
    waves: [
      {
        startMs: 500,
        spawns: [
          { offsetMs: 0, x: -4, movementPattern: 'straight', enemyArchetype: 'scout' },
          { offsetMs: 220, x: 0, movementPattern: 'straight', enemyArchetype: 'scout' },
          { offsetMs: 440, x: 4, movementPattern: 'straight', enemyArchetype: 'scout' }
        ]
      },
      {
        startMs: 2100,
        spawns: [
          { offsetMs: 0, x: -5, movementPattern: 'sine', patternAmplitude: 2, patternFrequency: 1.8, enemyArchetype: 'scout' },
          { offsetMs: 180, x: 5, movementPattern: 'sine', patternAmplitude: 2, patternFrequency: 1.8, enemyArchetype: 'scout' }
        ]
      }
    ]
  },
  {
    id: 'l1-r2',
    waves: [
      {
        startMs: 500,
        spawns: [
          { offsetMs: 0, x: -5, movementPattern: 'curve', movementParams: { curveDirection: 1 }, enemyArchetype: 'striker' },
          { offsetMs: 220, x: 5, movementPattern: 'curve', movementParams: { curveDirection: -1 }, enemyArchetype: 'striker' }
        ]
      },
      {
        startMs: 2300,
        spawns: [
          { offsetMs: 0, x: -3, movementPattern: 'zigzag', patternAmplitude: 1.5, patternFrequency: 2.5, enemyArchetype: 'scout' },
          { offsetMs: 180, x: 0, movementPattern: 'zigzag', patternAmplitude: 1.5, patternFrequency: 2.5, enemyArchetype: 'striker' },
          { offsetMs: 360, x: 3, movementPattern: 'zigzag', patternAmplitude: 1.5, patternFrequency: 2.5, enemyArchetype: 'scout' }
        ]
      }
    ]
  },
  {
    id: 'l1-r3',
    waves: [
      {
        startMs: 700,
        spawns: [
          {
            offsetMs: 0,
            x: 5.2,
            movementPattern: 'sweep',
            movementParams: { sweepStartX: 5.2, sweepEndX: -5.2, sweepDepth: 20, periodSeconds: 5 },
            enemyArchetype: 'tank'
          },
          {
            offsetMs: 420,
            x: -5.2,
            movementPattern: 'sweep',
            movementParams: { sweepStartX: -5.2, sweepEndX: 5.2, sweepDepth: 20, periodSeconds: 5 },
            enemyArchetype: 'striker'
          }
        ]
      },
      {
        startMs: 2900,
        spawns: [
          { offsetMs: 0, x: -4, movementPattern: 'spiral', enemyArchetype: 'striker' },
          { offsetMs: 220, x: 4, movementPattern: 'spiral', enemyArchetype: 'striker' },
          { offsetMs: 420, x: 0, movementPattern: 'straight', enemyArchetype: 'tank' }
        ]
      }
    ]
  }
];

export const levelCatalog: LevelDefinition[] = [
  {
    id: 'level-1',
    name: 'Sky Ruins',
    rounds: level1Rounds
  }
];

export const levelCatalogById: Record<string, LevelDefinition> = Object.fromEntries(
  levelCatalog.map((level) => [level.id, level])
);

export function resolveLevel(levelId: string): LevelDefinition | undefined {
  return levelCatalogById[levelId];
}
