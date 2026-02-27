export function BulletMesh({ enemy }: { enemy: boolean }) {
  return (
    <mesh>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshStandardMaterial color={enemy ? '#ffcc4f' : '#9eff7a'} flatShading />
    </mesh>
  );
}
