import { useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { EntityType } from '../ecs/entityTypes';
import { GameLoop } from '../core/GameLoop';
import { useMemo } from 'react';
import { PlayerMesh } from './meshes/PlayerMesh';
import { EnemyMesh } from './meshes/EnemyMesh';
import { BulletMesh } from './meshes/BulletMesh';
import { CameraRig } from './CameraRig';
import { Game } from '../core/Game';
import type { PointerController } from '../input/PointerController';

interface SceneRootProps {
  game: Game;
  pointer: PointerController;
}

export function SceneRoot({ game, pointer }: SceneRootProps) {
  const loop = useMemo(() => new GameLoop(), []);

  useFrame(({ clock }) => {
    loop.frame(clock.elapsedTime * 1000, (dt) => {
      game.update(dt, pointer.getState());
    });
  });

  const renderEntities = game.entitiesForRender();

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.75} />
      <directionalLight intensity={1.1} position={[3, 8, 8]} />
      <Stats showPanel={0} className="fps-stats" />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[25, 45]} />
        <meshStandardMaterial color="#101c36" />
      </mesh>
      {renderEntities.map((entity) => {
        const position: [number, number, number] = [entity.x, entity.y, 0];

        if (entity.type === EntityType.Player) {
          return (
            <group key={entity.id} position={position}>
              <PlayerMesh />
            </group>
          );
        }

        if (entity.type === EntityType.Enemy) {
          return (
            <group key={entity.id} position={position}>
              <EnemyMesh />
            </group>
          );
        }

        return (
          <group key={entity.id} position={position}>
            <BulletMesh enemy={entity.y < 0} />
          </group>
        );
      })}
    </>
  );
}
