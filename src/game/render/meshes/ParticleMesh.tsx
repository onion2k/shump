import { particleColor } from '../../config/gameSettings';

interface ParticleMeshProps {
  kind: string;
  ageMs?: number;
  lifetimeMs?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ParticleMesh({ kind, ageMs = 0, lifetimeMs = 1 }: ParticleMeshProps) {
  const color = particleColor(kind);
  const totalLifetime = Math.max(1, ageMs + Math.max(0, lifetimeMs));
  const lifeProgress = clamp(ageMs / totalLifetime, 0, 1);
  const scale = 1 - lifeProgress * 0.8;
  const opacity = 1 - lifeProgress;

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[0.09, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.55}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}
