import { gameSettings } from '../../config/gameSettings';

export function PlayerMesh() {
  return (
    <mesh>
      <coneGeometry args={[0.5, 1.4, 6]} />
      <meshStandardMaterial color={gameSettings.player.color} flatShading />
    </mesh>
  );
}
