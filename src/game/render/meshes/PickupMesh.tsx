export function PickupMesh({ kind }: { kind: 'score' | 'health' | 'energy' }) {
  const color = kind === 'health' ? '#7dff7a' : kind === 'energy' ? '#72ddff' : '#ffe074';

  return (
    <mesh>
      <icosahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
    </mesh>
  );
}
