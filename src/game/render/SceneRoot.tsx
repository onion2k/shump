import { useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { EntityType, Faction } from '../ecs/entityTypes';
import { GameLoop } from '../core/GameLoop';
import { useEffect, useMemo } from 'react';
import { PlayerMesh } from './meshes/PlayerMesh';
import { EnemyMesh } from './meshes/EnemyMesh';
import { BulletMesh } from './meshes/BulletMesh';
import { PickupMesh } from './meshes/PickupMesh';
import { ParticleInstances } from './meshes/ParticleInstances';
import { GpuParticleSystem } from './meshes/GpuParticleSystem';
import { ParallaxBackground } from './ParallaxBackground';
import { CameraRig } from './CameraRig';
import { Game } from '../core/Game';
import type { PointerController } from '../input/PointerController';
import type { GameSnapshot } from '../core/Game';
import { Hud3D } from './Hud3D';
import { centeredBoundsFromSize } from '../core/playfieldBounds';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

interface SceneRootProps {
  game: Game;
  pointer: PointerController;
  snapshot: GameSnapshot;
  debugMode: boolean;
}

const USE_GPU_PARTICLES = true;

export function SceneRoot({ game, pointer, snapshot, debugMode }: SceneRootProps) {
  const loop = useMemo(() => new GameLoop(), []);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.viewport);
  const gl = useThree((state) => state.gl);
  const backgroundViewport = viewport.getCurrentViewport(camera, [0, 0, -2]);
  const canUsePostProcessing = Boolean(gl.getContext()?.getContextAttributes());

  useEffect(() => {
    game.setUseGpuParticles(USE_GPU_PARTICLES);
    return () => {
      game.setUseGpuParticles(false);
    };
  }, [game]);

  useFrame(({ clock }) => {
    if (debugMode) {
      loop.frame(clock.elapsedTime * 1000, (dt) => {
        game.update(
          dt,
          {
            hasPosition: false,
            x: 0,
            y: 0,
            leftButtonDown: false,
            rightButtonDown: false
          },
          { runGameplay: false, runDebug: true }
        );
      });
      return;
    }

    const playViewport = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const bounds = centeredBoundsFromSize(playViewport.width, playViewport.height);
    pointer.setWorldBounds(bounds);
    game.setPlayableBounds(bounds);

    loop.frame(clock.elapsedTime * 1000, (dt) => {
      game.update(dt, pointer.getState());
    });
  });

  const renderEntities = game.entitiesForRender();
  const nonParticleEntities = renderEntities.filter((entity) => entity.type !== EntityType.Particle);
  const particles = renderEntities.filter((entity) => entity.type === EntityType.Particle);
  const playerEntity = renderEntities.find((entity) => entity.type === EntityType.Player);
  const playerX = playerEntity?.x ?? 0;

  return (
    <>
      {debugMode ? (
        <>
          <color attach="background" args={['#020611']} />
          <ambientLight intensity={0.65} />
          <directionalLight intensity={0.9} position={[2.5, 4, 6]} />
          <gridHelper args={[24, 24, '#2b4d7a', '#13233d']} position={[0, 0, -0.02]} />
          <GpuParticleSystem game={game} maxParticles={8000} />
        </>
      ) : (
        <>
          <CameraRig />
          <ambientLight intensity={0.75} />
          <directionalLight intensity={1.1} position={[3, 8, 8]} />
          <Stats showPanel={0} className="fps-stats" />
          <Hud3D snapshot={snapshot} />
          <ParallaxBackground
            width={backgroundViewport.width}
            height={backgroundViewport.height}
            playerX={playerX}
            scrollDistance={snapshot.distanceTraveled}
          />
          {nonParticleEntities.map((entity) => {
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

            if (entity.type === EntityType.Pickup) {
              return (
                <group key={entity.id} position={position}>
                  <PickupMesh kind={entity.pickupKind ?? 'score'} />
                </group>
              );
            }

            return (
              <group key={entity.id} position={position}>
                <BulletMesh enemy={entity.faction === Faction.Enemy} />
              </group>
            );
          })}
          {USE_GPU_PARTICLES ? <GpuParticleSystem game={game} /> : <ParticleInstances particles={particles} />}
          {canUsePostProcessing && (
            <EffectComposer multisampling={4}>
              <Bloom intensity={0.7} luminanceThreshold={0.15} luminanceSmoothing={0.4} />
            </EffectComposer>
          )}
        </>
      )}
    </>
  );
}
