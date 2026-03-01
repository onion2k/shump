import { BackSide } from 'three';
import { gameSettings } from '../../config/gameSettings';

export function EnemyMesh() {
  return (
    <group>
      <mesh>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={gameSettings.enemy.color} flatShading />
      </mesh>
      <mesh scale={1.1}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
