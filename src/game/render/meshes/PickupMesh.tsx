import { gameSettings } from '../../config/gameSettings';
import type { PlayerWeaponMode } from '../../weapons/playerWeapons';

const weaponPickupColors: Record<PlayerWeaponMode, string> = {
  'Auto Pulse': '#7be5ff',
  'Continuous Laser': '#7cffaa',
  'Heavy Cannon': '#ffb347',
  'Sine SMG': '#ffd66a'
};

export function PickupMesh({ kind, weaponMode }: { kind: 'score' | 'health' | 'energy' | 'weapon'; weaponMode?: PlayerWeaponMode }) {
  const color =
    kind === 'health'
      ? gameSettings.visuals.pickups.healthColor
      : kind === 'energy'
        ? gameSettings.visuals.pickups.energyColor
        : kind === 'weapon'
          ? weaponPickupColors[weaponMode ?? 'Auto Pulse']
          : gameSettings.visuals.pickups.scoreColor;

  return (
    <mesh>
      <icosahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
    </mesh>
  );
}
