import { gameSettings } from '../../config/gameSettings';
import type { PlayerWeaponMode } from '../../weapons/playerWeapons';

const weaponPickupColors: Record<PlayerWeaponMode, string> = {
  'Auto Pulse': '#7be5ff',
  'Continuous Laser': '#7cffaa',
  'Heavy Cannon': '#ffb347',
  'Sine SMG': '#ffd66a'
};

export function PickupMesh({
  kind,
  weaponMode
}: {
  kind: 'score' | 'health' | 'energy' | 'weapon' | 'money' | 'card';
  weaponMode?: PlayerWeaponMode;
}) {
  const color =
    kind === 'health'
      ? gameSettings.visuals.pickups.healthColor
      : kind === 'energy'
        ? gameSettings.visuals.pickups.energyColor
        : kind === 'weapon'
          ? weaponPickupColors[weaponMode ?? 'Auto Pulse']
          : kind === 'money'
            ? '#ffd166'
            : kind === 'card'
              ? '#ffd84d'
          : gameSettings.visuals.pickups.scoreColor;

  const isCard = kind === 'card';
  const isMoney = kind === 'money';

  return (
    <mesh rotation={isMoney ? [Math.PI / 2, 0, 0] : undefined}>
      {isCard ? (
        <boxGeometry args={[0.28, 0.42, 0.04]} />
      ) : isMoney ? (
        <cylinderGeometry args={[0.22, 0.22, 0.06, 24]} />
      ) : (
        <icosahedronGeometry args={[0.35, 0]} />
      )}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
    </mesh>
  );
}
