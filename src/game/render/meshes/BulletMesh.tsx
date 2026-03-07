import { BackSide } from 'three';
import { gameSettings } from '../../config/gameSettings';

interface BulletMeshProps {
  enemy: boolean;
  projectileKind?: 'standard' | 'missile' | 'laser' | 'vector';
  projectileSpeed?: number;
  radius?: number;
  vx?: number;
  vy?: number;
}

export function BulletMesh({ enemy, projectileKind, projectileSpeed, radius, vx, vy }: BulletMeshProps) {
  if (projectileKind === 'laser' || projectileKind === 'vector') {
    const beamLength = Math.max(8, projectileSpeed ?? 24);
    const beamWidth = Math.max(0.07, (radius ?? 0.3) * 0.325);
    return (
      <group position={[0, beamLength * 0.5, 0]}>
        <mesh>
          <boxGeometry args={[beamWidth, beamLength, 0.06]} />
          <meshBasicMaterial color={projectileKind === 'vector' ? '#9cf7ff' : '#7cffaa'} toneMapped={false} />
        </mesh>
        <mesh scale={[1.4, 1, 1]}>
          <boxGeometry args={[beamWidth, beamLength, 0.06]} />
          <meshBasicMaterial
            color={projectileKind === 'vector' ? '#dffcff' : '#b8ffcf'}
            transparent
            opacity={0.45}
            toneMapped={false}
          />
        </mesh>
      </group>
    );
  }

  if (projectileKind === 'missile') {
    const directionX = vx ?? 0;
    const directionY = vy ?? 1;
    const rotationZ = Math.atan2(directionX, directionY);
    return (
      <group rotation={[0, 0, rotationZ]} scale={[1, 1, 0.35]}>
        <mesh>
          <coneGeometry args={[0.18, 0.56, 6]} />
          <meshStandardMaterial color="#9ec7ff" emissive="#7eaaff" emissiveIntensity={0.18} flatShading />
        </mesh>
        <mesh scale={1.14}>
          <coneGeometry args={[0.18, 0.56, 6]} />
          <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  const color = enemy ? gameSettings.visuals.bullets.enemyColor : gameSettings.visuals.bullets.playerColor;

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
