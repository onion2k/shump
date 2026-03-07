import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { gameSettings } from '../../config/gameSettings';
import { resolvePlayerWeaponDefinition, type PlayerWeaponMode } from '../../weapons/playerWeapons';

export function PickupMesh({
  kind,
  weaponMode
}: {
  kind: 'score' | 'health' | 'energy' | 'weapon' | 'money' | 'card' | 'prism';
  weaponMode?: PlayerWeaponMode;
}) {
  const meshRef = useRef<Mesh>(null);

  const color =
    kind === 'health'
      ? gameSettings.visuals.pickups.healthColor
      : kind === 'energy'
        ? gameSettings.visuals.pickups.energyColor
        : kind === 'weapon'
          ? resolvePlayerWeaponDefinition(weaponMode ?? 'Auto Pulse').pickupColor
          : kind === 'money'
            ? '#ffd166'
            : kind === 'card'
              ? '#ffd84d'
              : kind === 'prism'
                ? '#d8f5ff'
          : gameSettings.visuals.pickups.scoreColor;

  const isCard = kind === 'card';
  const isMoney = kind === 'money';
  const shouldDualAxisSpin = isCard || isMoney;

  useFrame(({ clock }) => {
    if (!meshRef.current || !shouldDualAxisSpin) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    meshRef.current.rotation.x = (isMoney ? Math.PI / 2 : 0) + elapsed * 1.7;
    meshRef.current.rotation.y = elapsed * 1.3;
  });

  return (
    <mesh ref={meshRef} rotation={isMoney ? [Math.PI / 2, 0, 0] : undefined}>
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
