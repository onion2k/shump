import { BackSide } from 'three';
import type { EnemyArchetypeId } from '../../content/enemyArchetypes';
import { resolveEnemyArchetype } from '../../content/enemyArchetypes';

interface EnemyMeshProps {
  archetype?: EnemyArchetypeId;
  healthRatio?: number;
  ageMs?: number;
}

export function EnemyMesh({ archetype, healthRatio = 1, ageMs = 0 }: EnemyMeshProps) {
  const enemy = resolveEnemyArchetype(archetype);
  const damageGlow = Math.max(0, Math.min(1, 1 - healthRatio));
  const ageSeconds = ageMs / 1000;
  const spinBase =
    enemy.id === 'juggernaut'
      ? 0.45
      : enemy.id === 'bruiser'
        ? 0.62
        : enemy.id === 'tank'
          ? 0.8
          : enemy.id === 'striker'
            ? 1.35
            : 1.9;
  const rotationX = Math.sin(ageSeconds * 0.9) * 0.16;
  const rotationY = ageSeconds * spinBase;
  const rotationZ = Math.cos(ageSeconds * 0.6) * 0.12 + ageSeconds * spinBase * 0.35;

  return (
    <group scale={enemy.meshScale} rotation={[rotationX, rotationY, rotationZ]}>
      <mesh>
        {enemy.id === 'juggernaut' ? (
          <icosahedronGeometry args={[0.86, 0]} />
        ) : enemy.id === 'bruiser' ? (
          <boxGeometry args={[1.28, 1.04, 1.28]} />
        ) : enemy.id === 'tank' ? (
          <boxGeometry args={[1.2, 1.2, 1.2]} />
        ) : enemy.id === 'striker' ? (
          <dodecahedronGeometry args={[0.72, 0]} />
        ) : (
          <octahedronGeometry args={[0.7, 0]} />
        )}
        <meshStandardMaterial
          color={enemy.color}
          emissive={enemy.accentColor}
          emissiveIntensity={0.12 + damageGlow * 0.32}
          flatShading
        />
      </mesh>
      <mesh scale={1.1}>
        {enemy.id === 'juggernaut' ? (
          <icosahedronGeometry args={[0.86, 0]} />
        ) : enemy.id === 'bruiser' ? (
          <boxGeometry args={[1.28, 1.04, 1.28]} />
        ) : enemy.id === 'tank' ? (
          <boxGeometry args={[1.2, 1.2, 1.2]} />
        ) : enemy.id === 'striker' ? (
          <dodecahedronGeometry args={[0.72, 0]} />
        ) : (
          <octahedronGeometry args={[0.7, 0]} />
        )}
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
