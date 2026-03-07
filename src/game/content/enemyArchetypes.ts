export type EnemyArchetypeId =
  | 'scout'
  | 'striker'
  | 'tank'
  | 'bruiser'
  | 'juggernaut'
  | 'warp-sphere'
  | 'raider'
  | 'sentinel';

export interface EnemyArchetypeDef {
  id: EnemyArchetypeId;
  health: number;
  radius: number;
  speedYMultiplier: number;
  scoreValue: number;
  fireIntervalMultiplier: number;
  color: string;
  accentColor: string;
  meshScale: number;
}

const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetypeDef> = {
  scout: {
    id: 'scout',
    health: 1,
    radius: 0.58,
    speedYMultiplier: 1.18,
    scoreValue: 70,
    fireIntervalMultiplier: 1.25,
    color: '#ff856c',
    accentColor: '#ffc0a8',
    meshScale: 0.86
  },
  striker: {
    id: 'striker',
    health: 2,
    radius: 0.72,
    speedYMultiplier: 1,
    scoreValue: 110,
    fireIntervalMultiplier: 1,
    color: '#ff4f52',
    accentColor: '#ffd77d',
    meshScale: 1
  },
  tank: {
    id: 'tank',
    health: 4,
    radius: 0.96,
    speedYMultiplier: 0.68,
    scoreValue: 180,
    fireIntervalMultiplier: 0.78,
    color: '#b447ff',
    accentColor: '#6df0ff',
    meshScale: 1.2
  },
  bruiser: {
    id: 'bruiser',
    health: 6,
    radius: 1.02,
    speedYMultiplier: 0.62,
    scoreValue: 260,
    fireIntervalMultiplier: 0.72,
    color: '#4f7dff',
    accentColor: '#9bd2ff',
    meshScale: 1.3
  },
  juggernaut: {
    id: 'juggernaut',
    health: 10,
    radius: 1.16,
    speedYMultiplier: 0.52,
    scoreValue: 420,
    fireIntervalMultiplier: 0.66,
    color: '#2edb88',
    accentColor: '#d4ffd8',
    meshScale: 1.46
  },
  'warp-sphere': {
    id: 'warp-sphere',
    health: 7,
    radius: 0.92,
    speedYMultiplier: 0.82,
    scoreValue: 520,
    fireIntervalMultiplier: 0.74,
    color: '#8d46ff',
    accentColor: '#e9b3ff',
    meshScale: 1.12
  },
  raider: {
    id: 'raider',
    health: 3,
    radius: 0.66,
    speedYMultiplier: 1.28,
    scoreValue: 165,
    fireIntervalMultiplier: 0.84,
    color: '#ff9d39',
    accentColor: '#ffe6b3',
    meshScale: 0.96
  },
  sentinel: {
    id: 'sentinel',
    health: 8,
    radius: 1.08,
    speedYMultiplier: 0.56,
    scoreValue: 360,
    fireIntervalMultiplier: 0.7,
    color: '#39c8ff',
    accentColor: '#d3f3ff',
    meshScale: 1.36
  }
};

export function resolveEnemyArchetype(id: EnemyArchetypeId | undefined): EnemyArchetypeDef {
  if (!id) {
    return ENEMY_ARCHETYPES.scout;
  }

  return ENEMY_ARCHETYPES[id] ?? ENEMY_ARCHETYPES.scout;
}

export const enemyArchetypes = ENEMY_ARCHETYPES;
