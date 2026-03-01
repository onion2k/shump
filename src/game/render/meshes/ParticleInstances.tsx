import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ColorRepresentation, InstancedMesh } from 'three';
import { Color, Object3D } from 'three';
import { particleColor } from '../../config/gameSettings';

export interface RenderParticle {
  x: number;
  y: number;
  ageMs?: number;
  lifetimeMs?: number;
  particleType?: string;
}

interface ParticleInstancesProps {
  particles: RenderParticle[];
  particleScale?: number;
}

const MAX_PARTICLE_INSTANCES = 12000;

function particleBaseColor(kind: string): ColorRepresentation {
  return particleColor(kind);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ParticleInstances({ particles, particleScale = 1 }: ParticleInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const baseColor = useMemo(() => new Color(), []);
  const instanceCount = Math.min(particles.length, MAX_PARTICLE_INSTANCES);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    for (let i = 0; i < instanceCount; i += 1) {
      const particle = particles[i];
      const ageMs = particle.ageMs ?? 0;
      const remainingMs = Math.max(0, particle.lifetimeMs ?? 1);
      const totalLifetime = Math.max(1, ageMs + remainingMs);
      const lifeProgress = clamp(ageMs / totalLifetime, 0, 1);
      const lifeRemaining = 1 - lifeProgress;
      const scale = (1 - lifeProgress * 0.8) * particleScale;

      dummy.position.set(particle.x, particle.y, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      baseColor.set(particleBaseColor(particle.particleType ?? 'default'));
      tempColor.copy(baseColor).multiplyScalar(0.2 + lifeRemaining * 0.8);
      mesh.setColorAt(i, tempColor);
    }

    mesh.count = instanceCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [baseColor, dummy, instanceCount, particleScale, particles, tempColor]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLE_INSTANCES]} frustumCulled={false}>
      <sphereGeometry args={[0.09, 6, 6]} />
      <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.95} />
    </instancedMesh>
  );
}
