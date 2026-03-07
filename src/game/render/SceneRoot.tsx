import { useFrame, useThree } from '@react-three/fiber';
import { EntityType } from '../ecs/entityTypes';
import { GameLoop } from '../core/GameLoop';
import { useEffect, useMemo, useRef } from 'react';
import { ParticleInstances } from './meshes/ParticleInstances';
import { GpuParticleSystem } from './meshes/GpuParticleSystem';
import { ParallaxBackground } from './ParallaxBackground';
import { CameraRig } from './CameraRig';
import { Game } from '../core/Game';
import type { PointerController } from '../input/PointerController';
import type { GameSnapshot } from '../core/Game';
import { centeredBoundsFromSize } from '../core/playfieldBounds';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { ShockWaveEffect } from 'postprocessing';
import { Vector3 } from 'three';
import type { CardDefinition } from '../content/cards';
import { gameSettings } from '../config/gameSettings';
import {
  resolveEffectsQualityProfile,
  type EffectsQuality
} from './effectsQuality';
import { SceneEntityLayer } from './SceneEntityLayer';
import { SceneUiLayer } from './SceneUiLayer';

interface SceneRootProps {
  game: Game;
  pointer: PointerController;
  isMobile: boolean;
  effectsQuality: EffectsQuality;
  titleSettingsOpen: boolean;
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
  onOpenTitleSettings: () => void;
  onCloseTitleSettings: () => void;
  onSelectEffectsQuality: (quality: EffectsQuality) => void;
  onResume: () => void;
  onRestart: () => void;
  hasSavedRun: boolean;
}

const USE_GPU_PARTICLES = true;
const PARTICLE_MOBILE_BREAKPOINT_PX = 768;

export function SceneRoot({
  game,
  pointer,
  isMobile,
  effectsQuality,
  titleSettingsOpen,
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
  onOpenTitleSettings,
  onCloseTitleSettings,
  onSelectEffectsQuality,
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
  const qualityProfile = useMemo(
    () => resolveEffectsQualityProfile(effectsQuality, isMobile, explosionWarp.minIntervalMs),
    [effectsQuality, explosionWarp.minIntervalMs, isMobile]
  );
  const lastExplosionWarpAtMs = useRef(Number.NEGATIVE_INFINITY);
  const shockWaveEffects = useMemo(() => {
    if (!canUsePostProcessing) {
      return [];
    }

    return Array.from({ length: qualityProfile.shockWaveLayers }, () => new ShockWaveEffect(camera, new Vector3(0, 0, 0), explosionWarp));
  }, [camera, canUsePostProcessing, explosionWarp, qualityProfile.shockWaveLayers]);
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

      if (event.atMs - lastExplosionWarpAtMs.current < qualityProfile.shockWaveMinIntervalMs) {
        return;
      }
      lastExplosionWarpAtMs.current = event.atMs;

      const effect = shockWaveEffects[nextShockWaveIndex.current % shockWaveEffects.length];
      nextShockWaveIndex.current += 1;
      effect.position.set(event.positionX ?? 0, event.positionY ?? 0, 0);
      effect.explode();
    });
  }, [canUsePostProcessing, game, qualityProfile.shockWaveMinIntervalMs, shockWaveEffects]);

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
  const nonParticleEntities: typeof renderEntities = [];
  const particles: typeof renderEntities = [];
  let playerEntity: (typeof renderEntities)[number] | undefined;
  for (const entity of renderEntities) {
    if (entity.type === EntityType.Particle) {
      particles.push(entity);
      continue;
    }

    nonParticleEntities.push(entity);
    if (!playerEntity && entity.type === EntityType.Player) {
      playerEntity = entity;
    }
  }
  const playerX = playerEntity?.x ?? 0;
  const particleScale = size.width <= PARTICLE_MOBILE_BREAKPOINT_PX
    ? qualityProfile.particleScale * 0.94
    : qualityProfile.particleScale;
  const gpuParticleCap = qualityProfile.maxGpuParticles;
  const showStats =
    !isMobile
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('stats');

  return (
    <>
      <CameraRig game={game} />
      <ambientLight intensity={0.75} />
      <directionalLight intensity={1.1} position={[3, 8, 8]} />
      <SceneUiLayer
        showStats={showStats}
        snapshot={snapshot}
        hasSavedRun={hasSavedRun}
        effectsQuality={effectsQuality}
        titleSettingsOpen={titleSettingsOpen}
        onStart={onStart}
        onStartFresh={onStartFresh}
        onOpenTitleSettings={onOpenTitleSettings}
        onCloseTitleSettings={onCloseTitleSettings}
        onSelectEffectsQuality={onSelectEffectsQuality}
        onResume={onResume}
        onRestart={onRestart}
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
      <SceneEntityLayer entities={nonParticleEntities} />
      {USE_GPU_PARTICLES ? (
        <GpuParticleSystem game={game} particleScale={particleScale} maxParticles={gpuParticleCap} />
      ) : (
        <ParticleInstances particles={particles} particleScale={particleScale} />
      )}
      {canUsePostProcessing && (
        <EffectComposer multisampling={qualityProfile.composerMultisampling}>
          <Bloom
            intensity={qualityProfile.bloomIntensity}
            luminanceThreshold={qualityProfile.bloomThreshold}
            luminanceSmoothing={qualityProfile.bloomSmoothing}
          />
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
