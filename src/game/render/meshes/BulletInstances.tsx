import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { InstancedMesh } from 'three';
import { AdditiveBlending, BackSide, Object3D } from 'three';
import type { Game } from '../../core/Game';
import { Faction } from '../../ecs/entityTypes';
import { gameSettings } from '../../config/gameSettings';

interface BulletInstancesProps {
  bullets: ReturnType<Game['entitiesForRender']>;
}

type RenderBullet = BulletInstancesProps['bullets'][number];
type Shape = 'sphere' | 'capsule' | 'cone' | 'octahedron' | 'dodecahedron' | 'cylinder' | 'tetrahedron';

interface ProjectileProfile {
  id: string;
  shape: Shape;
  color: string;
  emissive?: string;
  radius: number;
}

const MAX_BULLET_INSTANCES = 12000;
const MAX_BEAM_PARTICLES = 16000;
const STANDARD_BULLET_RADIUS = 0.2;

const PROJECTILE_PROFILES: ProjectileProfile[] = [
  { id: 'auto-pulse', shape: 'capsule', color: '#7be5ff', emissive: '#4bc7ff', radius: 0.17 },
  { id: 'heavy-cannon', shape: 'sphere', color: '#ffb347', emissive: '#ff9231', radius: 0.28 },
  { id: 'sine-smg', shape: 'cone', color: '#ffd66a', emissive: '#ffc94a', radius: 0.15 },
  { id: 'flak-cannon', shape: 'sphere', color: '#ff9b73', emissive: '#ff7f52', radius: 0.25 },
  { id: 'proximity-mines', shape: 'octahedron', color: '#f2dd4d', emissive: '#e0c433', radius: 0.22 },
  { id: 'gravity-bomb', shape: 'sphere', color: '#92a2ff', emissive: '#738bff', radius: 0.27 },
  { id: 'spread-shot', shape: 'sphere', color: '#ffc57d', emissive: '#ffaf5a', radius: 0.16 },
  { id: 'helix-blaster', shape: 'dodecahedron', color: '#c0ff88', emissive: '#9aff4f', radius: 0.15 },
  { id: 'rotary-disc', shape: 'cylinder', color: '#e5b2ff', emissive: '#d48bff', radius: 0.25 },
  { id: 'prism-splitter', shape: 'tetrahedron', color: '#e6fff9', emissive: '#c8fff0', radius: 0.17 },
  { id: 'tesla-arc', shape: 'octahedron', color: '#8ae7ff', emissive: '#63dcff', radius: 0.14 },
  { id: 'chain-laser', shape: 'capsule', color: '#a5ffd4', emissive: '#80ffc2', radius: 0.15 },
  { id: 'attack-drone-shot', shape: 'cone', color: '#8fb7ff', emissive: '#6fa4ff', radius: 0.13 },
  { id: 'interceptor-drone-shot', shape: 'capsule', color: '#9ef7dd', emissive: '#76eecf', radius: 0.12 },
  { id: 'orbital-drone-shot', shape: 'octahedron', color: '#8cc5ff', emissive: '#6fb3ff', radius: 0.14 },
  { id: 'salvage-drone-shot', shape: 'dodecahedron', color: '#ffe38e', emissive: '#ffd66c', radius: 0.12 },
  { id: 'default-player', shape: 'sphere', color: gameSettings.visuals.bullets.playerColor, radius: STANDARD_BULLET_RADIUS }
];

const BEAM_COLOR_BY_VISUAL_ID: Record<string, string> = {
  'continuous-laser': '#7cffaa',
  'vector-beam': '#9cf7ff',
  'tesla-arc': '#8ae7ff',
  'chain-laser': '#a5ffd4'
};

function shapeGeometry(shape: Shape, radius: number) {
  if (shape === 'capsule') {
    return <capsuleGeometry args={[radius * 0.6, radius * 0.8, 4, 8]} />;
  }
  if (shape === 'cone') {
    return <coneGeometry args={[radius * 0.7, radius * 2.1, 6]} />;
  }
  if (shape === 'octahedron') {
    return <octahedronGeometry args={[radius, 0]} />;
  }
  if (shape === 'dodecahedron') {
    return <dodecahedronGeometry args={[radius, 0]} />;
  }
  if (shape === 'cylinder') {
    return <cylinderGeometry args={[radius, radius, Math.max(0.08, radius * 0.24), 10]} />;
  }
  if (shape === 'tetrahedron') {
    return <tetrahedronGeometry args={[radius, 0]} />;
  }
  return <sphereGeometry args={[radius, 10, 10]} />;
}

function ProjectileBatch({
  bullets,
  profile,
  resolveRotation
}: {
  bullets: RenderBullet[];
  profile: ProjectileProfile;
  resolveRotation?: (bullet: RenderBullet) => number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const outlineRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const outline = outlineRef.current;
    if (!mesh || !outline) {
      return;
    }

    let count = 0;
    for (const bullet of bullets) {
      if (count >= MAX_BULLET_INSTANCES) {
        break;
      }

      const radiusScale = Math.max(0.4, (bullet.radius ?? profile.radius) / Math.max(0.01, profile.radius));
      dummy.position.set(bullet.x, bullet.y, 0);
      const rotation = resolveRotation ? resolveRotation(bullet) : Math.atan2(bullet.vx ?? 0, bullet.vy ?? 1);
      dummy.rotation.set(0, 0, rotation);
      dummy.scale.setScalar(radiusScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(count, dummy.matrix);
      dummy.scale.setScalar(radiusScale * 1.2);
      dummy.updateMatrix();
      outline.setMatrixAt(count, dummy.matrix);
      count += 1;
    }

    mesh.count = count;
    outline.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    outline.instanceMatrix.needsUpdate = true;
  }, [bullets, dummy, profile.radius, resolveRotation]);

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        {shapeGeometry(profile.shape, profile.radius)}
        <meshStandardMaterial color={profile.color} emissive={profile.emissive ?? '#000000'} emissiveIntensity={0.18} flatShading />
      </instancedMesh>
      <instancedMesh ref={outlineRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        {shapeGeometry(profile.shape, profile.radius)}
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function BeamBatch({ bullets, color }: { bullets: RenderBullet[]; color: string }) {
  const coreRef = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow) {
      return;
    }

    let count = 0;
    for (const bullet of bullets) {
      if (count >= MAX_BEAM_PARTICLES) {
        break;
      }

      const beamLength = Math.max(0.6, bullet.projectileSpeed ?? 6);
      const vx = bullet.vx ?? 0;
      const vy = bullet.vy ?? 1;
      const magnitude = Math.hypot(vx, vy) || 1;
      const nx = vx / magnitude;
      const ny = vy / magnitude;
      const angle = Math.atan2(vx, vy);
      const segmentStep = 0.12;
      const segmentLength = 0.2;
      const particlesPerBeam = Math.max(10, Math.min(140, Math.ceil(beamLength / segmentStep) + 1));
      const flowOffset = (((bullet.ageMs ?? 0) % 160) / 160) * segmentStep;
      const baseRadius = Math.max(0.028, (bullet.radius ?? 0.12) * 0.22);

      for (let i = 0; i < particlesPerBeam; i += 1) {
        if (count >= MAX_BEAM_PARTICLES) {
          break;
        }
        const dist = i * segmentStep + flowOffset;
        if (dist > beamLength + segmentStep) {
          break;
        }
        const px = bullet.x + nx * dist;
        const py = bullet.y + ny * dist;
        const pulse = 0.9 + Math.sin((bullet.ageMs ?? 0) * 0.025 + i * 0.7) * 0.1;
        dummy.position.set(px, py, 0);
        dummy.rotation.set(0, 0, -angle);
        dummy.scale.set(baseRadius * pulse, segmentLength, baseRadius * pulse);
        dummy.updateMatrix();
        core.setMatrixAt(count, dummy.matrix);
        dummy.scale.set(baseRadius * pulse * 2.1, segmentLength * 1.45, baseRadius * pulse * 2.1);
        dummy.updateMatrix();
        glow.setMatrixAt(count, dummy.matrix);
        count += 1;
      }
    }

    core.count = count;
    glow.count = count;
    core.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
  }, [bullets, dummy]);

  return (
    <>
      <instancedMesh ref={coreRef} args={[undefined, undefined, MAX_BEAM_PARTICLES]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.94} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[undefined, undefined, MAX_BEAM_PARTICLES]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.26} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

export function BulletInstances({ bullets }: BulletInstancesProps) {
  const enemyBullets = bullets.filter((bullet) => bullet.faction === Faction.Enemy && bullet.projectileKind !== 'missile');
  const missileBullets = bullets.filter((bullet) => bullet.projectileKind === 'missile');
  const beamBullets = bullets.filter((bullet) => bullet.projectileKind === 'laser' || bullet.projectileKind === 'vector');
  const playerBullets = bullets.filter(
    (bullet) => bullet.faction !== Faction.Enemy && bullet.projectileKind !== 'laser' && bullet.projectileKind !== 'vector' && bullet.projectileKind !== 'missile'
  );

  const missileHeadingByIdRef = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    const activeIds = new Set(missileBullets.map((bullet) => bullet.id));
    for (const id of missileHeadingByIdRef.current.keys()) {
      if (!activeIds.has(id)) {
        missileHeadingByIdRef.current.delete(id);
      }
    }
  }, [missileBullets]);

  const resolveMissileRotation = useCallback((bullet: RenderBullet): number => {
    const vx = bullet.vx ?? 0;
    const vy = bullet.vy ?? 0;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.001) {
      const angle = Math.atan2(vx, vy);
      missileHeadingByIdRef.current.set(bullet.id, angle);
      return angle;
    }

    return missileHeadingByIdRef.current.get(bullet.id) ?? 0;
  }, []);

  const bulletsByProfile = useMemo(() => {
    const bucket = new Map<string, RenderBullet[]>();
    for (const bullet of playerBullets) {
      const profileId = bullet.projectileVisualId ?? 'default-player';
      const existing = bucket.get(profileId);
      if (existing) {
        existing.push(bullet);
      } else {
        bucket.set(profileId, [bullet]);
      }
    }
    return bucket;
  }, [playerBullets]);

  return (
    <>
      <ProjectileBatch
        bullets={enemyBullets}
        profile={{ id: 'enemy', shape: 'sphere', color: gameSettings.visuals.bullets.enemyColor, radius: STANDARD_BULLET_RADIUS }}
      />
      <ProjectileBatch
        bullets={missileBullets}
        profile={{ id: 'missile', shape: 'cone', color: '#9ec7ff', emissive: '#7eaaff', radius: 0.22 }}
        resolveRotation={resolveMissileRotation}
      />
      {PROJECTILE_PROFILES.map((profile) => (
        <ProjectileBatch key={profile.id} bullets={bulletsByProfile.get(profile.id) ?? []} profile={profile} />
      ))}
      {Object.entries(BEAM_COLOR_BY_VISUAL_ID).map(([id, color]) => (
        <BeamBatch key={`beam-${id}`} bullets={beamBullets.filter((bullet) => (bullet.projectileVisualId ?? 'continuous-laser') === id)} color={color} />
      ))}
    </>
  );
}
