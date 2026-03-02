import {
  SAVE_SCHEMA_VERSION,
  createDefaultMetaProgression,
  createDefaultSaveFile,
  type SaveActiveRun,
  type SaveFile,
  type SaveFileV1,
  type SaveMetaProgression
} from './saveSchema';

const DEFAULT_SAVE_KEY = 'shump.save.v1';
const DEFAULT_BACKUP_SUFFIX = '.bak';
const DEFAULT_STAGED_SUFFIX = '.tmp';

interface LegacySaveFileV0 {
  version?: 0;
  bankMoney?: number;
  ownedCards?: string[];
  unlockedLevels?: string[];
  lifetimeStats?: Record<string, number>;
  updatedAt?: string;
}

export interface SaveServiceOptions {
  storage?: Storage;
  key?: string;
  now?: () => Date;
}

export interface SaveLoadResult {
  save: SaveFile;
  recoveredFromBackup: boolean;
  hadCorruptPrimary: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      result[key] = entry;
    }
  }

  return result;
}

function sanitizeMeta(value: unknown): SaveMetaProgression {
  if (!isRecord(value)) {
    return createDefaultMetaProgression();
  }

  return {
    bankMoney: typeof value.bankMoney === 'number' && Number.isFinite(value.bankMoney) ? value.bankMoney : 0,
    ownedCards: asStringArray(value.ownedCards),
    unlockedLevels: asStringArray(value.unlockedLevels),
    lifetimeStats: asNumberRecord(value.lifetimeStats)
  };
}

function sanitizeActiveRun(value: unknown): SaveActiveRun | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const playerStateRaw = isRecord(value.playerState) ? value.playerState : {};

  const seed = typeof value.seed === 'number' && Number.isFinite(value.seed) ? value.seed : undefined;
  const levelId = typeof value.levelId === 'string' ? value.levelId : undefined;
  const roundIndex = typeof value.roundIndex === 'number' && Number.isFinite(value.roundIndex) ? value.roundIndex : undefined;

  if (seed === undefined || levelId === undefined || roundIndex === undefined) {
    return undefined;
  }

  return {
    seed,
    levelId,
    roundIndex: Math.max(1, roundIndex),
    inRunMoney: typeof value.inRunMoney === 'number' && Number.isFinite(value.inRunMoney) ? value.inRunMoney : 0,
    foundCards: asStringArray(value.foundCards),
    activeCards: asStringArray(value.activeCards),
    consumedCards: asStringArray(value.consumedCards),
    elapsedMs: typeof value.elapsedMs === 'number' && Number.isFinite(value.elapsedMs) ? value.elapsedMs : 0,
    distanceTraveled:
      typeof value.distanceTraveled === 'number' && Number.isFinite(value.distanceTraveled) ? value.distanceTraveled : 0,
    score: typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : 0,
    playerState: {
      health:
        typeof playerStateRaw.health === 'number' && Number.isFinite(playerStateRaw.health) ? playerStateRaw.health : 0,
      maxHealth:
        typeof playerStateRaw.maxHealth === 'number' && Number.isFinite(playerStateRaw.maxHealth)
          ? playerStateRaw.maxHealth
          : 0,
      weaponLevels: asNumberRecord(playerStateRaw.weaponLevels),
      podCount:
        typeof playerStateRaw.podCount === 'number' && Number.isFinite(playerStateRaw.podCount)
          ? Math.max(0, Math.floor(playerStateRaw.podCount))
          : 0,
      podWeaponMode: playerStateRaw.podWeaponMode === 'Homing Missile' ? 'Homing Missile' : 'Auto Pulse'
    }
  };
}

function sanitizeV1(value: unknown, nowIso: string): SaveFileV1 {
  if (!isRecord(value)) {
    return createDefaultSaveFile(nowIso);
  }

  return {
    version: SAVE_SCHEMA_VERSION,
    meta: sanitizeMeta(value.meta),
    activeRun: sanitizeActiveRun(value.activeRun),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : nowIso
  };
}

function migrateToLatest(value: unknown, nowIso: string): SaveFile {
  if (!isRecord(value)) {
    return createDefaultSaveFile(nowIso);
  }

  const version = value.version;
  if (version === SAVE_SCHEMA_VERSION) {
    return sanitizeV1(value, nowIso);
  }

  const legacy = value as LegacySaveFileV0;
  const migrated: SaveFileV1 = {
    version: SAVE_SCHEMA_VERSION,
    meta: {
      bankMoney: typeof legacy.bankMoney === 'number' && Number.isFinite(legacy.bankMoney) ? legacy.bankMoney : 0,
      ownedCards: asStringArray(legacy.ownedCards),
      unlockedLevels: asStringArray(legacy.unlockedLevels),
      lifetimeStats: asNumberRecord(legacy.lifetimeStats)
    },
    updatedAt: typeof legacy.updatedAt === 'string' ? legacy.updatedAt : nowIso
  };

  if (migrated.meta.unlockedLevels.length === 0) {
    migrated.meta.unlockedLevels = ['level-1'];
  }

  return migrated;
}

export class SaveService {
  private readonly storage?: Storage;
  private readonly key: string;
  private readonly backupKey: string;
  private readonly stagedKey: string;
  private readonly now: () => Date;

  constructor(options: SaveServiceOptions = {}) {
    this.storage = options.storage;
    this.key = options.key ?? DEFAULT_SAVE_KEY;
    this.backupKey = `${this.key}${DEFAULT_BACKUP_SUFFIX}`;
    this.stagedKey = `${this.key}${DEFAULT_STAGED_SUFFIX}`;
    this.now = options.now ?? (() => new Date());
  }

  load(): SaveLoadResult {
    const nowIso = this.now().toISOString();
    if (!this.storage) {
      return {
        save: createDefaultSaveFile(nowIso),
        recoveredFromBackup: false,
        hadCorruptPrimary: false
      };
    }

    const primaryRaw = this.storage.getItem(this.key);
    if (!primaryRaw) {
      return {
        save: createDefaultSaveFile(nowIso),
        recoveredFromBackup: false,
        hadCorruptPrimary: false
      };
    }

    const parsedPrimary = this.tryParse(primaryRaw);
    if (parsedPrimary !== undefined) {
      return {
        save: migrateToLatest(parsedPrimary, nowIso),
        recoveredFromBackup: false,
        hadCorruptPrimary: false
      };
    }

    const backupRaw = this.storage.getItem(this.backupKey);
    const parsedBackup = backupRaw ? this.tryParse(backupRaw) : undefined;
    if (parsedBackup !== undefined) {
      const migrated = migrateToLatest(parsedBackup, nowIso);
      this.persist(migrated);
      return {
        save: migrated,
        recoveredFromBackup: true,
        hadCorruptPrimary: true
      };
    }

    return {
      save: createDefaultSaveFile(nowIso),
      recoveredFromBackup: false,
      hadCorruptPrimary: true
    };
  }

  save(nextSave: SaveFile): SaveFile {
    const stamped: SaveFile = {
      ...nextSave,
      version: SAVE_SCHEMA_VERSION,
      updatedAt: this.now().toISOString()
    };
    this.persist(stamped);
    return stamped;
  }

  saveMeta(meta: SaveMetaProgression): SaveFile {
    const current = this.load().save;
    return this.save({
      ...current,
      meta: {
        bankMoney: Math.max(0, meta.bankMoney),
        ownedCards: [...meta.ownedCards],
        unlockedLevels: meta.unlockedLevels.length > 0 ? [...meta.unlockedLevels] : ['level-1'],
        lifetimeStats: { ...meta.lifetimeStats }
      }
    });
  }

  saveActiveRun(activeRun: SaveActiveRun): SaveFile {
    const current = this.load().save;
    return this.save({
      ...current,
      activeRun
    });
  }

  clearActiveRun(): SaveFile {
    const current = this.load().save;
    const withoutRun = { ...current };
    delete withoutRun.activeRun;
    return this.save(withoutRun);
  }

  clearAll(): void {
    if (!this.storage) {
      return;
    }

    this.storage.removeItem(this.key);
    this.storage.removeItem(this.backupKey);
    this.storage.removeItem(this.stagedKey);
  }

  private tryParse(raw: string): unknown | undefined {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  private persist(save: SaveFile): void {
    if (!this.storage) {
      return;
    }

    const payload = JSON.stringify(save);
    this.storage.setItem(this.stagedKey, payload);

    const staged = this.storage.getItem(this.stagedKey);
    if (staged !== payload) {
      throw new Error('Failed to stage save payload before commit');
    }

    const previous = this.storage.getItem(this.key);
    if (previous) {
      this.storage.setItem(this.backupKey, previous);
    }

    this.storage.setItem(this.key, payload);
    this.storage.removeItem(this.stagedKey);
  }
}

export function createLocalSaveService(options: Omit<SaveServiceOptions, 'storage'> = {}): SaveService {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new SaveService({ ...options, storage: undefined });
  }

  return new SaveService({
    ...options,
    storage: window.localStorage
  });
}
