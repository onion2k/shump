import { gameSettings } from '../../config/gameSettings';

export function BulletMesh({ enemy }: { enemy: boolean }) {
  const color = enemy ? gameSettings.visuals.bullets.enemyColor : gameSettings.visuals.bullets.playerColor;

  return (
    <mesh>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}
