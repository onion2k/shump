import { useEffect, useState } from 'react';
import type { GameDebugStats } from '../../core/Game';

interface DebugToolbarProps {
  stats: GameDebugStats;
}

interface PeakStats {
  totalEntities: number;
  activeParticleVisuals: number;
  gpuParticleLiveCount: number;
  particleEmitters: number;
}

export function DebugToolbar({ stats }: DebugToolbarProps) {
  const [peaks, setPeaks] = useState<PeakStats>({
    totalEntities: stats.totalEntities,
    activeParticleVisuals: stats.activeParticleVisuals,
    gpuParticleLiveCount: stats.gpuParticleLiveCount,
    particleEmitters: stats.particleEmitters
  });

  useEffect(() => {
    setPeaks((previous) => ({
      totalEntities: Math.max(previous.totalEntities, stats.totalEntities),
      activeParticleVisuals: Math.max(previous.activeParticleVisuals, stats.activeParticleVisuals),
      gpuParticleLiveCount: Math.max(previous.gpuParticleLiveCount, stats.gpuParticleLiveCount),
      particleEmitters: Math.max(previous.particleEmitters, stats.particleEmitters)
    }));
  }, [stats]);

  const items: Array<{ label: string; value: string; wide?: boolean }> = [
    { label: 'Entities', value: `${stats.totalEntities} (peak ${peaks.totalEntities})`, wide: true },
    { label: 'Enemies', value: `${stats.enemies}` },
    { label: 'Bullets', value: `${stats.bullets}` },
    { label: 'Pickups', value: `${stats.pickups}` },
    { label: 'Drones', value: `${stats.drones}` },
    { label: 'Fields', value: `${stats.fields}` },
    { label: 'Pods', value: `${stats.pods}` },
    { label: 'Particles', value: `${stats.activeParticleVisuals} (peak ${peaks.activeParticleVisuals})`, wide: true },
    { label: 'GPU live', value: `${stats.gpuParticleLiveCount} (peak ${peaks.gpuParticleLiveCount})`, wide: true },
    { label: 'GPU queued', value: `${stats.gpuParticlePendingSpawns}` },
    { label: 'ECS particles', value: `${stats.particleEntities}` },
    { label: 'Emitters', value: `${stats.particleEmitters} (peak ${peaks.particleEmitters})`, wide: true },
    { label: 'Scheduled emitters', value: `${stats.scheduledEmitters}` },
    { label: 'FPS', value: `${stats.estimatedFps.toFixed(1)}` },
    { label: 'Frame', value: `${stats.averageFrameMs.toFixed(2)}ms` },
    { label: 'Density', value: `${stats.enemyDensityScale.toFixed(2)}` },
    { label: 'Enemy pool free', value: `${stats.enemyPoolFree}` },
    { label: 'Bullet pool free', value: `${stats.bulletPoolFree}` },
    { label: 'Pickup pool free', value: `${stats.pickupPoolFree}` },
    { label: 'Enemy alloc', value: `${stats.enemyPoolAllocated}` },
    { label: 'Bullet alloc', value: `${stats.bulletPoolAllocated}` },
    { label: 'Pickup alloc', value: `${stats.pickupPoolAllocated}` }
  ];

  return (
    <aside className="debug-toolbar" aria-label="debug-toolbar">
      {items.map((item) => (
        <span
          key={item.label}
          className={`debug-toolbar__item${item.wide ? ' debug-toolbar__item--wide' : ''}`}
        >
          <span className="debug-toolbar__label">{item.label}</span>
          <span className="debug-toolbar__value">{item.value}</span>
        </span>
      ))}
    </aside>
  );
}
