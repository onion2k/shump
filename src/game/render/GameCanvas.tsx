import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SceneRoot } from './SceneRoot';
import { PointerController } from '../input/PointerController';
import { Game } from '../core/Game';
import type { GameSnapshot } from '../core/Game';
import type { CardDefinition } from '../content/cards';

interface GameCanvasProps {
  game: Game;
  snapshot: GameSnapshot;
  debugMode: boolean;
  showEnemyPatterns: boolean;
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
}

export function GameCanvas({
  game,
  snapshot,
  debugMode,
  showEnemyPatterns,
  foundCards,
  activeCards,
  shopCards,
  onActivateCard,
  onDiscardCard,
  onDiscardActiveCard,
  onOpenShop,
  onCloseShop,
  onBuyCard,
  onContinue
}: GameCanvasProps) {
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
      </Canvas>
    </div>
  );
}
