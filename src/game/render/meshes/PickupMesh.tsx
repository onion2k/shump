import { gameSettings } from '../../config/gameSettings';

export function PickupMesh({ kind }: { kind: 'score' | 'health' | 'energy' }) {
  const color =
    kind === 'health'
      ? gameSettings.visuals.pickups.healthColor
      : kind === 'energy'
        ? gameSettings.visuals.pickups.energyColor
        : gameSettings.visuals.pickups.scoreColor;

  return (
    <mesh>
      <icosahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
    </mesh>
  );
}
