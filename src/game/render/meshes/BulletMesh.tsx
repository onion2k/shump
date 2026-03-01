import { BackSide } from 'three';
import { gameSettings } from '../../config/gameSettings';

export function BulletMesh({ enemy }: { enemy: boolean }) {
  const color = enemy ? gameSettings.visuals.bullets.enemyColor : gameSettings.visuals.bullets.playerColor;

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
