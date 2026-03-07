import { BackSide } from 'three';

interface DroneMeshProps {
  visualId?: string;
  ageMs?: number;
}

export function DroneMesh({ visualId, ageMs = 0 }: DroneMeshProps) {
  const t = ageMs / 1000;
  if (visualId === 'interceptor-drone') {
    return (
      <group rotation={[0, 0, t * 1.8]}>
        <mesh>
          <torusGeometry args={[0.23, 0.06, 8, 16]} />
          <meshStandardMaterial color="#9ef7dd" emissive="#6fe8c8" emissiveIntensity={0.28} flatShading />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color="#d6fff4" emissive="#c2ffee" emissiveIntensity={0.3} flatShading />
        </mesh>
      </group>
    );
  }

  if (visualId === 'salvage-drone') {
    return (
      <group rotation={[0, 0, Math.sin(t * 2.1) * 0.14]}>
        <mesh>
          <boxGeometry args={[0.28, 0.18, 0.24]} />
          <meshStandardMaterial color="#ffe38e" emissive="#f0d67c" emissiveIntensity={0.24} flatShading />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <coneGeometry args={[0.08, 0.2, 6]} />
          <meshStandardMaterial color="#fff2b8" emissive="#ffe8a6" emissiveIntensity={0.2} flatShading />
        </mesh>
      </group>
    );
  }

  if (visualId === 'orbital-drone') {
    return (
      <group rotation={[0, 0, t * 2.4]}>
        <mesh>
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#8cc5ff" emissive="#6fb2ff" emissiveIntensity={0.24} flatShading />
        </mesh>
        <mesh scale={1.25}>
          <torusGeometry args={[0.2, 0.03, 8, 14]} />
          <meshBasicMaterial color="#a9d4ff" toneMapped={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0, 0, Math.sin(t * 2.8) * 0.1]}>
      <mesh>
        <coneGeometry args={[0.18, 0.34, 6]} />
        <meshStandardMaterial color="#8fb7ff" emissive="#6a98ff" emissiveIntensity={0.24} flatShading />
      </mesh>
      <mesh scale={1.14}>
        <coneGeometry args={[0.18, 0.34, 6]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
