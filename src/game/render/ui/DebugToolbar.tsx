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

  return (
    <aside className="debug-toolbar" aria-label="debug-toolbar">
      <span>Entities {stats.totalEntities} (peak {peaks.totalEntities})</span>
      <span>Enemies {stats.enemies}</span>
      <span>Bullets {stats.bullets}</span>
      <span>Pickups {stats.pickups}</span>
      <span>Drones {stats.drones}</span>
      <span>Fields {stats.fields}</span>
      <span>Pods {stats.pods}</span>
      <span>Particles {stats.activeParticleVisuals} (peak {peaks.activeParticleVisuals})</span>
      <span>GPU live {stats.gpuParticleLiveCount} (peak {peaks.gpuParticleLiveCount})</span>
      <span>GPU queued {stats.gpuParticlePendingSpawns}</span>
      <span>ECS particles {stats.particleEntities}</span>
      <span>Emitters {stats.particleEmitters} (peak {peaks.particleEmitters})</span>
      <span>Scheduled emitters {stats.scheduledEmitters}</span>
      <span>FPS {stats.estimatedFps.toFixed(1)}</span>
      <span>Frame {stats.averageFrameMs.toFixed(2)}ms</span>
      <span>Density {stats.enemyDensityScale.toFixed(2)}</span>
      <span>Enemy pool free {stats.enemyPoolFree}</span>
      <span>Bullet pool free {stats.bulletPoolFree}</span>
      <span>Pickup pool free {stats.pickupPoolFree}</span>
      <span>Enemy alloc {stats.enemyPoolAllocated}</span>
      <span>Bullet alloc {stats.bulletPoolAllocated}</span>
      <span>Pickup alloc {stats.pickupPoolAllocated}</span>
    </aside>
  );
}
