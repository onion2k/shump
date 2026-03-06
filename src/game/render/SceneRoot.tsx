import { useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { EntityType, Faction } from '../ecs/entityTypes';
import { GameLoop } from '../core/GameLoop';
import { useEffect, useMemo, useRef } from 'react';
import { PlayerMesh } from './meshes/PlayerMesh';
import { EnemyMesh } from './meshes/EnemyMesh';
import { PodMesh } from './meshes/PodMesh';
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
import { ShockWaveEffect } from 'postprocessing';
import { Vector3 } from 'three';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { CardDefinition } from '../content/cards';
import { BetweenRoundsUi3D } from './ui/BetweenRoundsUi3D';
import { StartScreen3D } from './ui/StartScreen3D';
import { PauseScreen3D } from './ui/PauseScreen3D';
import { GameOverScreen3D } from './ui/GameOverScreen3D';
import { gameSettings } from '../config/gameSettings';

interface SceneRootProps {
  game: Game;
  pointer: PointerController;
  snapshot: GameSnapshot;
  foundCards: CardDefinition[];
  activeCards: CardDefinition[];
  shopCards: CardDefinition[];
  onActivateCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onDiscardActiveCard: (cardId: string) => void;
  onOpenShop: () => void;
  onCloseShop: () => void;
  onBuyCard: (cardId: string) => void;
  onContinue: () => void;
  onStart: () => void;
  onStartFresh?: () => void;
  onResume: () => void;
  onRestart: () => void;
  hasSavedRun: boolean;
}

const USE_GPU_PARTICLES = true;
const PARTICLE_MOBILE_BREAKPOINT_PX = 768;
const MOBILE_PARTICLE_SCALE = 0.8;
const SHOCK_WAVE_LAYERS = 3;

export function SceneRoot({
  game,
  pointer,
  snapshot,
  foundCards,
  activeCards,
  shopCards,
  onActivateCard,
  onDiscardCard,
  onDiscardActiveCard,
  onOpenShop,
  onCloseShop,
  onBuyCard,
  onContinue,
  onStart,
  onStartFresh,
  onResume,
  onRestart,
  hasSavedRun
}: SceneRootProps) {
  const loop = useMemo(() => new GameLoop(), []);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const backgroundViewport = viewport.getCurrentViewport(camera, [0, 0, -2]);
  const canUsePostProcessing = Boolean(gl.getContext()?.getContextAttributes());
  const explosionWarp = gameSettings.visuals.explosionWarp;
  const lastExplosionWarpAtMs = useRef(Number.NEGATIVE_INFINITY);
  const shockWaveEffects = useMemo(
    () => Array.from({ length: SHOCK_WAVE_LAYERS }, () => new ShockWaveEffect(camera, new Vector3(0, 0, 0), explosionWarp)),
    [camera, explosionWarp]
  );
  const nextShockWaveIndex = useRef(0);

  useEffect(() => {
    game.setUseGpuParticles(USE_GPU_PARTICLES);
    return () => {
      game.setUseGpuParticles(false);
    };
  }, [game]);

  useEffect(() => {
    game.setAdaptiveDensityEnabled(true);
    return () => {
      game.setAdaptiveDensityEnabled(false);
    };
  }, [game]);

  useEffect(() => {
    return () => {
      for (const effect of shockWaveEffects) {
        effect.dispose();
      }
    };
  }, [shockWaveEffects]);

  useEffect(() => {
    return game.events.on('EntityDestroyed', (event) => {
      if (
        !canUsePostProcessing
        || event.entityType !== EntityType.Enemy
        || event.reason !== 'health'
        || event.enemyArchetype !== 'warp-sphere'
      ) {
        return;
      }

      if (event.atMs - lastExplosionWarpAtMs.current < explosionWarp.minIntervalMs) {
        return;
      }
      lastExplosionWarpAtMs.current = event.atMs;

      const effect = shockWaveEffects[nextShockWaveIndex.current % shockWaveEffects.length];
      nextShockWaveIndex.current += 1;
      effect.position.set(event.positionX ?? 0, event.positionY ?? 0, 0);
      effect.explode();
    });
  }, [canUsePostProcessing, explosionWarp.minIntervalMs, game, shockWaveEffects]);

  useFrame(({ clock }, deltaSeconds) => {
    game.reportFrameDelta(deltaSeconds);

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
  const particleScale = size.width <= PARTICLE_MOBILE_BREAKPOINT_PX ? MOBILE_PARTICLE_SCALE : 1;

  return (
    <>
      <CameraRig game={game} />
      <ambientLight intensity={0.75} />
      <directionalLight intensity={1.1} position={[3, 8, 8]} />
      <Stats showPanel={0} className="fps-stats" />
      <Hud3D snapshot={snapshot} />
      <StartScreen3D state={snapshot.state} hasSavedRun={hasSavedRun} onStart={onStart} onStartFresh={onStartFresh} />
      <PauseScreen3D state={snapshot.state} onResume={onResume} />
      <GameOverScreen3D state={snapshot.state} onRestart={onRestart} />
      <BetweenRoundsUi3D
        state={snapshot.state}
        levelId={snapshot.levelId}
        roundIndex={snapshot.roundIndex}
        totalRounds={snapshot.totalRounds}
        activeCardLimit={snapshot.activeCardLimit}
        money={snapshot.inRunMoney}
        weaponLevels={snapshot.weaponLevels}
        weaponEnergyMax={snapshot.weaponEnergyMax}
        podCount={snapshot.podCount}
        podWeaponMode={snapshot.podWeaponMode}
        foundCards={foundCards}
        activeCards={activeCards}
        shopCards={shopCards}
        onActivateCard={onActivateCard}
        onDiscardCard={onDiscardCard}
        onDiscardActiveCard={onDiscardActiveCard}
        onOpenShop={onOpenShop}
        onCloseShop={onCloseShop}
        onBuyCard={onBuyCard}
        onContinue={onContinue}
      />
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
          const healthRatio = entity.maxHealth > 0 ? entity.health / entity.maxHealth : 1;
          return (
            <group key={entity.id} position={position}>
              <EnemyMesh archetype={entity.enemyArchetype} healthRatio={healthRatio} ageMs={entity.ageMs} />
            </group>
          );
        }

        if (entity.type === EntityType.Pod) {
          return (
            <group key={entity.id} position={position}>
              <PodMesh />
            </group>
          );
        }

        if (entity.type === EntityType.Pickup) {
          return (
            <group key={entity.id} position={position}>
              <PickupMesh kind={entity.pickupKind ?? 'score'} weaponMode={entity.pickupWeaponMode as PlayerWeaponMode | undefined} />
            </group>
          );
        }

        return (
          <group key={entity.id} position={position}>
            <BulletMesh
              enemy={entity.faction === Faction.Enemy}
              projectileKind={entity.projectileKind}
              projectileSpeed={entity.projectileSpeed}
              radius={entity.radius}
              vx={entity.vx}
              vy={entity.vy}
            />
          </group>
        );
      })}
      {USE_GPU_PARTICLES ? (
        <GpuParticleSystem game={game} particleScale={particleScale} />
      ) : (
        <ParticleInstances particles={particles} particleScale={particleScale} />
      )}
      {canUsePostProcessing && (
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.7} luminanceThreshold={0.15} luminanceSmoothing={0.4} />
          <>
            {shockWaveEffects.map((effect, index) => (
              <primitive key={`shock-wave-${index}`} object={effect} />
            ))}
          </>
        </EffectComposer>
      )}
    </>
  );
}
