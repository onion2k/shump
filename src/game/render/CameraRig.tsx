import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { EntityType } from '../ecs/entityTypes';
import type { Game } from '../core/Game';
import { gameSettings } from '../config/gameSettings';

interface CameraRigProps {
  game: Game;
}

const BASE_CAMERA_Z = 22;
const SHAKE_DURATION_MS = 140;
const SHAKE_OFFSET_X = 0.24;
const SHAKE_OFFSET_Y = 0.18;

export function CameraRig({ game }: CameraRigProps) {
  const { camera } = useThree();
  const shakeRemainingMs = useRef(0);

  useEffect(() => {
    camera.position.set(0, 0, BASE_CAMERA_Z);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    return game.events.on('EntityDestroyed', (event) => {
      if (event.entityType !== EntityType.Enemy || event.reason !== 'health' || event.enemyArchetype !== 'warp-sphere') {
        return;
      }
      if (Math.random() >= gameSettings.visuals.explosionWarp.cameraShakeChance) {
        return;
      }
      shakeRemainingMs.current = SHAKE_DURATION_MS;
    });
  }, [game]);

  useFrame((_, deltaSeconds) => {
    const remainingMs = shakeRemainingMs.current;
    if (remainingMs <= 0) {
      camera.position.set(0, 0, BASE_CAMERA_Z);
      camera.lookAt(0, 0, 0);
      return;
    }

    const nextRemainingMs = Math.max(0, remainingMs - deltaSeconds * 1000);
    shakeRemainingMs.current = nextRemainingMs;
    const shakeStrength = nextRemainingMs / SHAKE_DURATION_MS;
    const offsetX = (Math.random() * 2 - 1) * SHAKE_OFFSET_X * shakeStrength;
    const offsetY = (Math.random() * 2 - 1) * SHAKE_OFFSET_Y * shakeStrength;
    camera.position.set(offsetX, offsetY, BASE_CAMERA_Z);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
