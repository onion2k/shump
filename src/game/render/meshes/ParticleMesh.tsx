interface ParticleMeshProps {
  kind: string;
}

function particleColor(kind: string): string {
  if (kind === 'thruster') {
    return '#7be5ff';
  }

  return '#ffffff';
}

export function ParticleMesh({ kind }: ParticleMeshProps) {
  const color = particleColor(kind);

  return (
    <mesh>
      <sphereGeometry args={[0.09, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
    </mesh>
  );
}
