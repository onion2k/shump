import { gameSettings } from '../../config/gameSettings';

export function EnemyMesh() {
  return (
    <mesh>
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color={gameSettings.enemy.color} flatShading />
    </mesh>
  );
}
