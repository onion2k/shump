export function PlayerMesh() {
  return (
    <mesh>
      <coneGeometry args={[0.5, 1.4, 6]} />
      <meshStandardMaterial color="#54f1ff" flatShading />
    </mesh>
  );
}
