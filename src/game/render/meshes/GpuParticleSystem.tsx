import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  type ColorRepresentation
} from 'three';
import type { Game } from '../../core/Game';
import { particleColor } from '../../config/gameSettings';

interface GpuParticleSystemProps {
  game: Game;
  maxParticles?: number;
  particleScale?: number;
}

function particleBaseColor(kind: string): ColorRepresentation {
  return particleColor(kind);
}

const VERTEX_SHADER = `
attribute vec2 aVelocity;
attribute float aSpawnTime;
attribute float aLifetime;
attribute float aSize;
attribute vec3 aColor;
uniform float uTime;
uniform float uSizeScale;
varying vec4 vColor;
void main() {
  float age = max(0.0, uTime - aSpawnTime);
  float lifeProgress = clamp(age / max(aLifetime, 0.0001), 0.0, 1.0);
  float alive = step(age, aLifetime);
  float fade = (1.0 - lifeProgress) * alive;
  vec3 world = vec3(position.xy + aVelocity * age, 0.0);
  vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = max(1.0, aSize * (1.0 - lifeProgress * 0.8) * uSizeScale / max(0.0001, -mvPosition.z));
  vColor = vec4(aColor, fade);
}
`;

const FRAGMENT_SHADER = `
varying vec4 vColor;
void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  float alpha = smoothstep(0.5, 0.0, dist) * vColor.a;
  if (alpha <= 0.01) {
    discard;
  }
  gl_FragColor = vec4(vColor.rgb, alpha);
}
`;

export function GpuParticleSystem({ game, maxParticles = 24000, particleScale = 1 }: GpuParticleSystemProps) {
  const pointsRef = useRef<Points>(null);
  const { gl } = useThree();
  const liveCountRef = useRef(0);
  const tempColor = useMemo(() => new Color(), []);

  const { geometry, material, attributes } = useMemo(() => {
    const positions = new Float32Array(maxParticles * 3);
    const velocities = new Float32Array(maxParticles * 2);
    const spawnTimes = new Float32Array(maxParticles);
    const lifetimes = new Float32Array(maxParticles);
    const sizes = new Float32Array(maxParticles);
    const colors = new Float32Array(maxParticles * 3);

    const geometryLocal = new BufferGeometry();
    const positionAttr = new BufferAttribute(positions, 3);
    const velocityAttr = new BufferAttribute(velocities, 2);
    const spawnTimeAttr = new BufferAttribute(spawnTimes, 1);
    const lifetimeAttr = new BufferAttribute(lifetimes, 1);
    const sizeAttr = new BufferAttribute(sizes, 1);
    const colorAttr = new BufferAttribute(colors, 3);

    geometryLocal.setAttribute('position', positionAttr);
    geometryLocal.setAttribute('aVelocity', velocityAttr);
    geometryLocal.setAttribute('aSpawnTime', spawnTimeAttr);
    geometryLocal.setAttribute('aLifetime', lifetimeAttr);
    geometryLocal.setAttribute('aSize', sizeAttr);
    geometryLocal.setAttribute('aColor', colorAttr);
    geometryLocal.setDrawRange(0, 0);

    const materialLocal = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSizeScale: { value: 140 * gl.getPixelRatio() }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending
    });

    return {
      geometry: geometryLocal,
      material: materialLocal,
      attributes: {
        positionAttr,
        velocityAttr,
        spawnTimeAttr,
        lifetimeAttr,
        sizeAttr,
        colorAttr
      }
    };
  }, [gl, maxParticles]);

  function copyParticle(fromIdx: number, toIdx: number) {
    const from3 = fromIdx * 3;
    const to3 = toIdx * 3;
    const from2 = fromIdx * 2;
    const to2 = toIdx * 2;

    attributes.positionAttr.array[to3] = attributes.positionAttr.array[from3];
    attributes.positionAttr.array[to3 + 1] = attributes.positionAttr.array[from3 + 1];
    attributes.positionAttr.array[to3 + 2] = attributes.positionAttr.array[from3 + 2];

    attributes.velocityAttr.array[to2] = attributes.velocityAttr.array[from2];
    attributes.velocityAttr.array[to2 + 1] = attributes.velocityAttr.array[from2 + 1];

    attributes.spawnTimeAttr.array[toIdx] = attributes.spawnTimeAttr.array[fromIdx];
    attributes.lifetimeAttr.array[toIdx] = attributes.lifetimeAttr.array[fromIdx];
    attributes.sizeAttr.array[toIdx] = attributes.sizeAttr.array[fromIdx];

    attributes.colorAttr.array[to3] = attributes.colorAttr.array[from3];
    attributes.colorAttr.array[to3 + 1] = attributes.colorAttr.array[from3 + 1];
    attributes.colorAttr.array[to3 + 2] = attributes.colorAttr.array[from3 + 2];
  }

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uSizeScale.value = 140 * gl.getPixelRatio();

    // Keep particle data densely packed so draw calls only process currently alive particles.
    let activeCount = liveCountRef.current;
    let writeIndex = 0;
    let compacted = false;
    for (let readIndex = 0; readIndex < activeCount; readIndex += 1) {
      const spawnTime = attributes.spawnTimeAttr.array[readIndex];
      const lifetime = attributes.lifetimeAttr.array[readIndex];
      if (clock.elapsedTime - spawnTime > lifetime) {
        compacted = true;
        continue;
      }

      if (writeIndex !== readIndex) {
        copyParticle(readIndex, writeIndex);
        compacted = true;
      }
      writeIndex += 1;
    }
    activeCount = writeIndex;

    const spawns = game.consumeGpuParticleSpawns();
    let spawned = false;
    for (const spawn of spawns) {
      if (activeCount >= maxParticles) {
        break;
      }
      const idx = activeCount;
      const p3 = idx * 3;
      const p2 = idx * 2;

      attributes.positionAttr.array[p3] = spawn.x;
      attributes.positionAttr.array[p3 + 1] = spawn.y;
      attributes.positionAttr.array[p3 + 2] = 0;

      attributes.velocityAttr.array[p2] = spawn.vx;
      attributes.velocityAttr.array[p2 + 1] = spawn.vy;

      attributes.spawnTimeAttr.array[idx] = clock.elapsedTime;
      attributes.lifetimeAttr.array[idx] = Math.max(0.001, spawn.lifetimeMs / 1000);
      attributes.sizeAttr.array[idx] = Math.max(1, spawn.radius * 180 * particleScale);

      tempColor.set(particleBaseColor(spawn.particleType));
      attributes.colorAttr.array[p3] = tempColor.r;
      attributes.colorAttr.array[p3 + 1] = tempColor.g;
      attributes.colorAttr.array[p3 + 2] = tempColor.b;

      activeCount += 1;
      spawned = true;
    }

    if (!compacted && !spawned && activeCount === liveCountRef.current) {
      return;
    }

    liveCountRef.current = activeCount;
    geometry.setDrawRange(0, activeCount);
    attributes.positionAttr.needsUpdate = compacted || spawned;
    attributes.velocityAttr.needsUpdate = compacted || spawned;
    attributes.spawnTimeAttr.needsUpdate = compacted || spawned;
    attributes.lifetimeAttr.needsUpdate = compacted || spawned;
    attributes.sizeAttr.needsUpdate = compacted || spawned;
    attributes.colorAttr.needsUpdate = compacted || spawned;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
