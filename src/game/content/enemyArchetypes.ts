export type EnemyArchetypeId = 'scout' | 'striker' | 'tank';

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
  }
};

export function resolveEnemyArchetype(id: EnemyArchetypeId | undefined): EnemyArchetypeDef {
  if (!id) {
    return ENEMY_ARCHETYPES.scout;
  }

  return ENEMY_ARCHETYPES[id] ?? ENEMY_ARCHETYPES.scout;
}

export const enemyArchetypes = ENEMY_ARCHETYPES;
