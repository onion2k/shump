export function EnemyMesh() {
  return (
    <mesh>
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color="#ff5a4f" flatShading />
    </mesh>
  );
}
