import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SceneRoot } from './SceneRoot';
import { PointerController } from '../input/PointerController';
import { Game } from '../core/Game';

interface GameCanvasProps {
  game: Game;
}

export function GameCanvas({ game }: GameCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointer = useMemo(() => new PointerController(), []);

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }

    return pointer.attach(wrapperRef.current);
  }, [pointer]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <SceneRoot game={game} pointer={pointer} />
      </Canvas>
    </div>
  );
}
