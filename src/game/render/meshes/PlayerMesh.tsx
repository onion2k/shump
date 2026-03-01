import { BackSide } from 'three';
import { gameSettings } from '../../config/gameSettings';

export function PlayerMesh() {
  return (
    <group>
      <mesh>
        <coneGeometry args={[0.5, 1.4, 6]} />
        <meshStandardMaterial color={gameSettings.player.color} flatShading />
      </mesh>
      <mesh scale={1.12}>
        <coneGeometry args={[0.5, 1.4, 6]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
