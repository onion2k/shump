import { resolveLevel, type RoundDefinition } from '../content/levels';

export class LevelDirector {
  private levelId = 'level-1';
  private roundIndex = 1;
  private roundCount = 1;

  configure(levelId: string, requestedRoundIndex = 1) {
    const level = resolveLevel(levelId) ?? resolveLevel('level-1');
    if (!level) {
      throw new Error('No levels configured');
    }

    this.levelId = level.id;
    this.roundCount = Math.max(1, level.rounds.length);
    this.roundIndex = clampRoundIndex(requestedRoundIndex, this.roundCount);
  }

  currentRound(): RoundDefinition {
    const level = resolveLevel(this.levelId) ?? resolveLevel('level-1');
    if (!level) {
      throw new Error('No levels configured');
    }

    return level.rounds[this.roundIndex - 1];
  }

  currentLevelId(): string {
    return this.levelId;
  }

  currentRoundIndex(): number {
    return this.roundIndex;
  }

  totalRounds(): number {
    return this.roundCount;
  }

  advanceRound(): number {
    this.roundIndex += 1;
    if (this.roundIndex > this.roundCount) {
      this.roundIndex = 1;
    }
    return this.roundIndex;
  }
}

function clampRoundIndex(roundIndex: number, roundCount: number): number {
  if (!Number.isFinite(roundIndex) || roundIndex < 1) {
    return 1;
  }

  if (roundIndex > roundCount) {
    return roundCount;
  }

  return Math.floor(roundIndex);
}
