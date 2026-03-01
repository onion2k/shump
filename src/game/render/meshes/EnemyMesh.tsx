import { BackSide } from 'three';
import type { EnemyArchetypeId } from '../../content/enemyArchetypes';
import { resolveEnemyArchetype } from '../../content/enemyArchetypes';

interface EnemyMeshProps {
  archetype?: EnemyArchetypeId;
  healthRatio?: number;
}

export function EnemyMesh({ archetype, healthRatio = 1 }: EnemyMeshProps) {
  const enemy = resolveEnemyArchetype(archetype);
  const damageGlow = Math.max(0, Math.min(1, 1 - healthRatio));

  return (
    <group scale={enemy.meshScale}>
      <mesh>
        {enemy.id === 'tank' ? (
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
        {enemy.id === 'tank' ? (
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
