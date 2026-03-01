import { BackSide } from 'three';

export function PodMesh() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#8fd0ff" emissive="#5aaaff" emissiveIntensity={0.2} flatShading />
      </mesh>
      <mesh scale={1.18}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
