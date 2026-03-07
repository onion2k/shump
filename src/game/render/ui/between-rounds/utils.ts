import type { CardDefinition } from '../../../content/cards';
import { resolvePlayerWeaponDefinition, type PlayerWeaponMode } from '../../../weapons/playerWeapons';

const TAG_ICON_BY_NAME: Record<string, string> = {
  weapon: '[W]',
  defense: '[D]',
  economy: '[$]',
  pod: '[P]',
  pulse: '[PU]',
  laser: '[L]',
  cannon: '[C]',
  missile: '[M]',
  sine: '[S]',
  utility: '[U]',
  precision: '[PR]',
  assault: '[AT]',
  hull: '[H]',
  drone: '[DR]',
  core: '[O]'
};

const TAG_PRIORITY = ['weapon', 'defense', 'economy', 'pod', 'laser', 'pulse', 'cannon', 'missile', 'sine'];

export function renderTagSummary(activeCards: CardDefinition[]): string {
  if (activeCards.length === 0) {
    return 'No active tags yet.';
  }

  const counts = new Map<string, number>();
  for (const card of activeCards) {
    for (const tag of card.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return entries.map(([tag, count]) => `${tag} x${count}`).join(', ');
}

export function cardIcon(card: Pick<CardDefinition, 'tags'>): string {
  for (const tag of TAG_PRIORITY) {
    if (card.tags.includes(tag)) {
      return TAG_ICON_BY_NAME[tag] ?? '[*]';
    }
  }

  for (const tag of card.tags) {
    if (TAG_ICON_BY_NAME[tag]) {
      return TAG_ICON_BY_NAME[tag];
    }
  }

  return '[ ]';
}

export function cardColorByRarity(rarity: CardDefinition['rarity']): string {
  if (rarity === 'rare') {
    return '#7349b8';
  }
  if (rarity === 'uncommon') {
    return '#2f8f86';
  }
  return '#2b5f92';
}

export function weaponShortLabel(mode: PlayerWeaponMode): string {
  return resolvePlayerWeaponDefinition(mode).shortLabel;
}

export function weaponModeTag(mode: PlayerWeaponMode): string {
  return resolvePlayerWeaponDefinition(mode).tag;
}

export function resolveNextRoundDisplay(levelId: string, roundIndex: number, totalRounds: number): { level: number | string; round: number } {
  const levelMatch = levelId.match(/(\d+)$/);
  const parsedLevel = levelMatch ? Number(levelMatch[1]) : Number.NaN;
  const hasNumericLevel = Number.isFinite(parsedLevel);
  if (roundIndex >= totalRounds) {
    return {
      level: hasNumericLevel ? parsedLevel + 1 : levelId,
      round: 1
    };
  }
  return {
    level: hasNumericLevel ? parsedLevel : levelId,
    round: roundIndex + 1
  };
}
