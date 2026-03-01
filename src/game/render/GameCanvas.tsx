import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SceneRoot } from './SceneRoot';
import { PointerController } from '../input/PointerController';
import { Game } from '../core/Game';
import type { GameSnapshot } from '../core/Game';

interface GameCanvasProps {
  game: Game;
  snapshot: GameSnapshot;
  debugMode: boolean;
  showEnemyPatterns: boolean;
}

export function GameCanvas({ game, snapshot, debugMode, showEnemyPatterns }: GameCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointer = useMemo(() => new PointerController(), []);

  useEffect(() => {
    if (!wrapperRef.current || debugMode) {
      return;
    }

    return pointer.attach(wrapperRef.current);
  }, [debugMode, pointer]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
      <Canvas>
        <SceneRoot
          game={game}
          pointer={pointer}
          snapshot={snapshot}
          debugMode={debugMode}
          showEnemyPatterns={showEnemyPatterns}
        />
      </Canvas>
    </div>
  );
}
