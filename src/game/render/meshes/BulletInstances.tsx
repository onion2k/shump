import { useLayoutEffect, useMemo, useRef } from 'react';
import type { InstancedMesh } from 'three';
import { BackSide, Object3D } from 'three';
import type { Game } from '../../core/Game';
import { Faction } from '../../ecs/entityTypes';
import { gameSettings } from '../../config/gameSettings';

interface BulletInstancesProps {
  bullets: ReturnType<Game['entitiesForRender']>;
}

const MAX_BULLET_INSTANCES = 12000;
const STANDARD_BULLET_RADIUS = 0.2;

export function BulletInstances({ bullets }: BulletInstancesProps) {
  const playerBulletRef = useRef<InstancedMesh>(null);
  const playerBulletOutlineRef = useRef<InstancedMesh>(null);
  const enemyBulletRef = useRef<InstancedMesh>(null);
  const enemyBulletOutlineRef = useRef<InstancedMesh>(null);
  const missileRef = useRef<InstancedMesh>(null);
  const missileOutlineRef = useRef<InstancedMesh>(null);
  const laserRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const playerMesh = playerBulletRef.current;
    const playerOutlineMesh = playerBulletOutlineRef.current;
    const enemyMesh = enemyBulletRef.current;
    const enemyOutlineMesh = enemyBulletOutlineRef.current;
    const missileMesh = missileRef.current;
    const missileOutlineMesh = missileOutlineRef.current;
    const laserMesh = laserRef.current;
    if (
      !playerMesh
      || !playerOutlineMesh
      || !enemyMesh
      || !enemyOutlineMesh
      || !missileMesh
      || !missileOutlineMesh
      || !laserMesh
    ) {
      return;
    }

    let playerCount = 0;
    let enemyCount = 0;
    let missileCount = 0;
    let laserCount = 0;

    for (const bullet of bullets) {
      if (bullet.projectileKind === 'laser' || bullet.projectileKind === 'vector') {
        if (laserCount >= MAX_BULLET_INSTANCES) {
          continue;
        }

        const beamLength = Math.max(8, bullet.projectileSpeed ?? 24);
        const beamWidth = Math.max(0.07, (bullet.radius ?? 0.3) * 0.325);
        dummy.position.set(bullet.x, bullet.y + beamLength * 0.5, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(beamWidth, beamLength, 1);
        dummy.updateMatrix();
        laserMesh.setMatrixAt(laserCount, dummy.matrix);
        laserCount += 1;
        continue;
      }

      if (bullet.projectileKind === 'missile') {
        if (missileCount >= MAX_BULLET_INSTANCES) {
          continue;
        }

        const scale = Math.max(0.35, (bullet.radius ?? 0.22) / 0.22);
        dummy.position.set(bullet.x, bullet.y, 0);
        dummy.rotation.set(0, 0, Math.atan2(bullet.vx ?? 0, bullet.vy ?? 1));
        dummy.scale.set(scale, scale, 0.35);
        dummy.updateMatrix();
        missileMesh.setMatrixAt(missileCount, dummy.matrix);
        dummy.scale.set(scale * 1.14, scale * 1.14, 0.35 * 1.14);
        dummy.updateMatrix();
        missileOutlineMesh.setMatrixAt(missileCount, dummy.matrix);
        missileCount += 1;
        continue;
      }

      const scale = Math.max(0.45, (bullet.radius ?? STANDARD_BULLET_RADIUS) / STANDARD_BULLET_RADIUS);
      dummy.position.set(bullet.x, bullet.y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      if (bullet.faction === Faction.Enemy) {
        if (enemyCount >= MAX_BULLET_INSTANCES) {
          continue;
        }
        enemyMesh.setMatrixAt(enemyCount, dummy.matrix);
        dummy.scale.setScalar(scale * 1.25);
        dummy.updateMatrix();
        enemyOutlineMesh.setMatrixAt(enemyCount, dummy.matrix);
        enemyCount += 1;
        continue;
      }

      if (playerCount >= MAX_BULLET_INSTANCES) {
        continue;
      }
      playerMesh.setMatrixAt(playerCount, dummy.matrix);
      dummy.scale.setScalar(scale * 1.25);
      dummy.updateMatrix();
      playerOutlineMesh.setMatrixAt(playerCount, dummy.matrix);
      playerCount += 1;
    }

    playerMesh.count = playerCount;
    playerOutlineMesh.count = playerCount;
    enemyMesh.count = enemyCount;
    enemyOutlineMesh.count = enemyCount;
    missileMesh.count = missileCount;
    missileOutlineMesh.count = missileCount;
    laserMesh.count = laserCount;
    playerMesh.instanceMatrix.needsUpdate = true;
    playerOutlineMesh.instanceMatrix.needsUpdate = true;
    enemyMesh.instanceMatrix.needsUpdate = true;
    enemyOutlineMesh.instanceMatrix.needsUpdate = true;
    missileMesh.instanceMatrix.needsUpdate = true;
    missileOutlineMesh.instanceMatrix.needsUpdate = true;
    laserMesh.instanceMatrix.needsUpdate = true;
  }, [bullets, dummy]);

  return (
    <>
      <instancedMesh ref={playerBulletRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[STANDARD_BULLET_RADIUS, 8, 8]} />
        <meshStandardMaterial color={gameSettings.visuals.bullets.playerColor} flatShading />
      </instancedMesh>
      <instancedMesh ref={playerBulletOutlineRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[STANDARD_BULLET_RADIUS, 8, 8]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={enemyBulletRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[STANDARD_BULLET_RADIUS, 8, 8]} />
        <meshStandardMaterial color={gameSettings.visuals.bullets.enemyColor} flatShading />
      </instancedMesh>
      <instancedMesh ref={enemyBulletOutlineRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[STANDARD_BULLET_RADIUS, 8, 8]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={missileRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <coneGeometry args={[0.18, 0.56, 6]} />
        <meshStandardMaterial color="#9ec7ff" emissive="#7eaaff" emissiveIntensity={0.18} flatShading />
      </instancedMesh>
      <instancedMesh ref={missileOutlineRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <coneGeometry args={[0.18, 0.56, 6]} />
        <meshBasicMaterial color="#000000" side={BackSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={laserRef} args={[undefined, undefined, MAX_BULLET_INSTANCES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 0.06]} />
        <meshBasicMaterial color="#7cffaa" toneMapped={false} />
      </instancedMesh>
    </>
  );
}
