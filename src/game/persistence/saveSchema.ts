import type { RunProgress } from '../core/RunProgress';

export const SAVE_SCHEMA_VERSION = 1 as const;

export interface SaveMetaProgression {
  bankMoney: number;
  ownedCards: string[];
  unlockedLevels: string[];
  lifetimeStats: Record<string, number>;
}

export type SaveActiveRun = RunProgress;

export interface SaveFileV1 {
  version: typeof SAVE_SCHEMA_VERSION;
  meta: SaveMetaProgression;
  activeRun?: SaveActiveRun;
  updatedAt: string;
}

export type SaveFile = SaveFileV1;

export function createDefaultMetaProgression(): SaveMetaProgression {
  return {
    bankMoney: 0,
    ownedCards: [],
    unlockedLevels: ['level-1'],
    lifetimeStats: {}
  };
}

export function createDefaultSaveFile(nowIso: string): SaveFileV1 {
  return {
    version: SAVE_SCHEMA_VERSION,
    meta: createDefaultMetaProgression(),
    updatedAt: nowIso
  };
}
