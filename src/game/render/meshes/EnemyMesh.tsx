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
      : enemy.id === 'sentinel'
        ? 0.54
      : enemy.id === 'bruiser'
        ? 0.62
      : enemy.id === 'tank'
        ? 0.8
      : enemy.id === 'warp-sphere'
        ? 1.05
        : enemy.id === 'raider'
          ? 1.75
          : enemy.id === 'lancer'
            ? 2.05
            : enemy.id === 'sniper'
              ? 0.92
              : enemy.id === 'bastion'
                ? 0.42
            : enemy.id === 'striker'
              ? 1.35
              : 1.9;
  const rotationX = Math.sin(ageSeconds * 0.9) * 0.16;
  const rotationY = ageSeconds * spinBase;
  const rotationZ = Math.cos(ageSeconds * 0.6) * 0.12 + ageSeconds * spinBase * 0.35;

  return (
    <group scale={enemy.meshScale} rotation={[rotationX, rotationY, rotationZ]}>
      <mesh>
        {enemyGeometry(enemy.id)}
        <meshStandardMaterial
          color={enemy.color}
          emissive={enemy.accentColor}
          emissiveIntensity={(enemy.id === 'warp-sphere' || enemy.id === 'sniper' ? 0.22 : 0.12) + damageGlow * 0.32}
          flatShading
        />
      </mesh>
      <mesh scale={1.1}>
        {enemyGeometry(enemy.id)}
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function enemyGeometry(archetypeId: EnemyArchetypeId) {
  if (archetypeId === 'juggernaut') {
    return <icosahedronGeometry args={[0.86, 0]} />;
  }

  if (archetypeId === 'sentinel') {
    return <cylinderGeometry args={[0.64, 0.8, 1.2, 6]} />;
  }

  if (archetypeId === 'warp-sphere') {
    return <sphereGeometry args={[0.66, 20, 20]} />;
  }

  if (archetypeId === 'raider') {
    return <tetrahedronGeometry args={[0.74, 0]} />;
  }

  if (archetypeId === 'lancer') {
    return <coneGeometry args={[0.62, 1.35, 5]} />;
  }

  if (archetypeId === 'sniper') {
    return <torusKnotGeometry args={[0.5, 0.16, 64, 10, 2, 3]} />;
  }

  if (archetypeId === 'bastion') {
    return <cylinderGeometry args={[0.88, 0.88, 1.36, 8]} />;
  }

  if (archetypeId === 'bruiser') {
    return <boxGeometry args={[1.28, 1.04, 1.28]} />;
  }

  if (archetypeId === 'tank') {
    return <boxGeometry args={[1.2, 1.2, 1.2]} />;
  }

  if (archetypeId === 'striker') {
    return <dodecahedronGeometry args={[0.72, 0]} />;
  }

  return <octahedronGeometry args={[0.7, 0]} />;
}
