import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SceneRoot } from './SceneRoot';
import { PointerController } from '../input/PointerController';
import { Game } from '../core/Game';
import type { GameSnapshot } from '../core/Game';
import type { CardDefinition } from '../content/cards';
import type { EffectsQuality } from './effectsQuality';

interface GameCanvasProps {
  game: Game;
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
  effectsQuality: EffectsQuality;
  titleSettingsOpen: boolean;
  onOpenTitleSettings: () => void;
  onCloseTitleSettings: () => void;
  onSelectEffectsQuality: (quality: EffectsQuality) => void;
}

export function GameCanvas({
  game,
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
  hasSavedRun,
  effectsQuality,
  titleSettingsOpen,
  onOpenTitleSettings,
  onCloseTitleSettings,
  onSelectEffectsQuality
}: GameCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointer = useMemo(() => new PointerController(), []);
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }

    return pointer.attach(wrapperRef.current);
  }, [pointer]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
      <Canvas
        dpr={isMobile ? [1, 1.4] : [1, 2]}
        gl={{
          antialias: !isMobile,
          powerPreference: isMobile ? 'low-power' : 'high-performance'
        }}
        performance={{ min: 0.5, max: 1, debounce: 300 }}
      >
        <SceneRoot
          game={game}
          pointer={pointer}
          isMobile={isMobile}
          snapshot={snapshot}
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
          onStart={onStart}
          onStartFresh={onStartFresh}
          onResume={onResume}
          onRestart={onRestart}
          hasSavedRun={hasSavedRun}
          effectsQuality={effectsQuality}
          titleSettingsOpen={titleSettingsOpen}
          onOpenTitleSettings={onOpenTitleSettings}
          onCloseTitleSettings={onCloseTitleSettings}
          onSelectEffectsQuality={onSelectEffectsQuality}
        />
      </Canvas>
    </div>
  );
}
