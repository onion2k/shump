export type EffectsQuality = 'high' | 'balanced' | 'battery';

export interface EffectsQualityProfile {
  maxGpuParticles: number;
  particleScale: number;
  composerMultisampling: number;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  shockWaveLayers: number;
  shockWaveMinIntervalMs: number;
}

export const DEFAULT_EFFECTS_QUALITY: EffectsQuality = 'balanced';

export function isEffectsQuality(value: string): value is EffectsQuality {
  return value === 'high' || value === 'balanced' || value === 'battery';
}

export function effectsQualityLabel(quality: EffectsQuality): string {
  if (quality === 'high') {
    return 'High';
  }

  if (quality === 'battery') {
    return 'Battery';
  }

  return 'Balanced';
}

export function resolveEffectsQualityProfile(
  quality: EffectsQuality,
  isMobile: boolean,
  baseShockWaveMinIntervalMs: number
): EffectsQualityProfile {
  const base = resolveBaseProfile(quality, isMobile);
  return {
    ...base,
    shockWaveMinIntervalMs: Math.max(baseShockWaveMinIntervalMs, base.shockWaveMinIntervalMs)
  };
}

function resolveBaseProfile(quality: EffectsQuality, isMobile: boolean): EffectsQualityProfile {
  if (isMobile) {
    if (quality === 'high') {
      return {
        maxGpuParticles: 12000,
        particleScale: 0.62,
        composerMultisampling: 1,
        bloomIntensity: 0.64,
        bloomThreshold: 0.18,
        bloomSmoothing: 0.36,
        shockWaveLayers: 2,
        shockWaveMinIntervalMs: 90
      };
    }

    if (quality === 'battery') {
      return {
        maxGpuParticles: 5000,
        particleScale: 0.48,
        composerMultisampling: 0,
        bloomIntensity: 0.42,
        bloomThreshold: 0.3,
        bloomSmoothing: 0.28,
        shockWaveLayers: 1,
        shockWaveMinIntervalMs: 180
      };
    }

    return {
      maxGpuParticles: 9000,
      particleScale: 0.55,
      composerMultisampling: 0,
      bloomIntensity: 0.56,
      bloomThreshold: 0.24,
      bloomSmoothing: 0.32,
      shockWaveLayers: 1,
      shockWaveMinIntervalMs: 120
    };
  }

  if (quality === 'high') {
    return {
      maxGpuParticles: 24000,
      particleScale: 1,
      composerMultisampling: 2,
      bloomIntensity: 0.72,
      bloomThreshold: 0.14,
      bloomSmoothing: 0.4,
      shockWaveLayers: 3,
      shockWaveMinIntervalMs: 60
    };
  }

  if (quality === 'battery') {
    return {
      maxGpuParticles: 9000,
      particleScale: 0.8,
      composerMultisampling: 0,
      bloomIntensity: 0.48,
      bloomThreshold: 0.26,
      bloomSmoothing: 0.3,
      shockWaveLayers: 1,
      shockWaveMinIntervalMs: 140
    };
  }

  return {
    maxGpuParticles: 18000,
    particleScale: 0.92,
    composerMultisampling: 1,
    bloomIntensity: 0.62,
    bloomThreshold: 0.2,
    bloomSmoothing: 0.34,
    shockWaveLayers: 2,
    shockWaveMinIntervalMs: 80
  };
}
