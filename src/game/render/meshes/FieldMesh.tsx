interface FieldMeshProps {
  visualId?: string;
  radius: number;
  ageMs?: number;
  lifetimeMs?: number;
}

export function FieldMesh({ visualId, radius, ageMs = 0, lifetimeMs = 1 }: FieldMeshProps) {
  const t = ageMs / 1000;
  const life = Math.max(0, Math.min(1, ageMs / Math.max(1, lifetimeMs)));

  if (visualId === 'thermal-napalm-pods') {
    return (
      <group rotation={[0, 0, t * 0.6]}>
        <mesh>
          <ringGeometry args={[radius * 0.45, radius, 26]} />
          <meshBasicMaterial color="#ff794f" transparent opacity={0.5} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[radius * 0.42, 18]} />
          <meshBasicMaterial color="#ffb069" transparent opacity={0.25} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'ion-burst') {
    return (
      <group rotation={[0, 0, -t * 2.2]}>
        <mesh>
          <ringGeometry args={[radius * 0.55, radius * (0.8 + life * 0.3), 24]} />
          <meshBasicMaterial color="#72d1ff" transparent opacity={0.52} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'energy-shield-projector') {
    return (
      <group rotation={[Math.PI * 0.5, 0, t * 1.1]}>
        <mesh>
          <sphereGeometry args={[radius * 0.72, 16, 12, 0, Math.PI]} />
          <meshBasicMaterial color="#69e7ff" transparent opacity={0.42} wireframe toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'reflector-pulse') {
    return (
      <group>
        <mesh rotation={[0, 0, t * 1.4]}>
          <ringGeometry args={[radius * 0.25, radius * (0.72 + life * 0.2), 28]} />
          <meshBasicMaterial color="#c1f8ff" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'time-distortion-pulse') {
    return (
      <group>
        <mesh rotation={[0, 0, -t * 0.9]}>
          <ringGeometry args={[radius * 0.35, radius * 0.9, 28]} />
          <meshBasicMaterial color="#9ba9ff" transparent opacity={0.38} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, t * 0.6]}>
          <ringGeometry args={[radius * 0.62, radius, 28]} />
          <meshBasicMaterial color="#d0d7ff" transparent opacity={0.2} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'polygon-shredder') {
    return (
      <group rotation={[0, 0, t * 2.3]}>
        <mesh>
          <ringGeometry args={[radius * 0.4, radius, 6]} />
          <meshBasicMaterial color="#ff9fd1" transparent opacity={0.46} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'gravity-well') {
    return (
      <group rotation={[0, 0, -t * 1.8]}>
        <mesh>
          <torusGeometry args={[radius * 0.6, radius * 0.18, 10, 22]} />
          <meshBasicMaterial color="#92a2ff" transparent opacity={0.46} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (visualId === 'shrapnel-cloud') {
    return (
      <group rotation={[0, 0, t * 2.2]}>
        <mesh>
          <ringGeometry args={[radius * 0.46, radius, 8]} />
          <meshBasicMaterial color="#ffb480" transparent opacity={0.42} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh>
      <ringGeometry args={[Math.max(0.1, radius * 0.55), Math.max(0.2, radius), 24]} />
      <meshBasicMaterial color="#8ed6ff" transparent opacity={0.45} toneMapped={false} />
    </mesh>
  );
}
