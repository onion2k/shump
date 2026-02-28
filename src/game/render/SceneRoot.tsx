import { useFrame, useThree } from '@react-three/fiber';
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
import type { GameSnapshot } from '../core/Game';
import { Hud3D } from './Hud3D';

interface SceneRootProps {
  game: Game;
  pointer: PointerController;
  snapshot: GameSnapshot;
}

export function SceneRoot({ game, pointer, snapshot }: SceneRootProps) {
  const loop = useMemo(() => new GameLoop(), []);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.viewport);
  const backgroundViewport = viewport.getCurrentViewport(camera, [0, 0, -2]);

  useFrame(({ clock }) => {
    const playViewport = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const bounds = {
      left: -playViewport.width / 2,
      right: playViewport.width / 2,
      bottom: -playViewport.height / 2,
      top: playViewport.height / 2
    };
    pointer.setWorldBounds(bounds);
    game.setPlayableBounds(bounds);

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
      <Hud3D snapshot={snapshot} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[backgroundViewport.width, backgroundViewport.height]} />
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
