export interface DeterministicRng {
  nextFloat: (stream: string, salt?: number) => number;
  nextInt: (stream: string, maxExclusive: number, salt?: number) => number;
  snapshot: () => Record<string, number>;
  restore: (state: Record<string, number>) => void;
}

function hashString32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mix32(seed: number): number {
  let x = seed >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function toUnitFloat(value: number): number {
  return (value >>> 0) / 4294967296;
}

export function createDeterministicRng(seed: number): DeterministicRng {
  const baseSeed = seed | 0;
  const counters = new Map<string, number>();

  function nextFloat(stream: string, salt = 0): number {
    const counter = counters.get(stream) ?? 0;
    counters.set(stream, counter + 1);
    const streamHash = hashString32(stream);
    const mixed = mix32(baseSeed ^ streamHash ^ (counter * 0x9e3779b9) ^ (salt | 0));
    return toUnitFloat(mixed);
  }

  function nextInt(stream: string, maxExclusive: number, salt = 0): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(nextFloat(stream, salt) * maxExclusive);
  }

  function snapshot(): Record<string, number> {
    return Object.fromEntries(counters.entries());
  }

  function restore(state: Record<string, number>): void {
    counters.clear();
    for (const [stream, value] of Object.entries(state)) {
      if (!Number.isFinite(value) || value < 0) {
        continue;
      }
      counters.set(stream, Math.floor(value));
    }
  }

  return {
    nextFloat,
    nextInt,
    snapshot,
    restore
  };
}
