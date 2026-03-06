import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { createLocalSaveService } from './game/persistence/SaveService';
import type { SaveFile } from './game/persistence/saveSchema';
import { resolveCard } from './game/content/cards';

export function App() {
  const game = useMemo(() => new Game(), []);
  const saveService = useMemo(() => createLocalSaveService(), []);
  const [snapshot, setSnapshot] = useState(() => game.snapshot());
  const [saveFile, setSaveFile] = useState<SaveFile>(() => saveService.load().save);

  useEffect(() => game.subscribe(setSnapshot), [game]);
  useEffect(() => {
    setSaveFile(saveService.load().save);
  }, [saveService]);
  useEffect(() => {
    if (snapshot.state === GameState.GameOver) {
      setSaveFile(saveService.clearActiveRun());
      game.clearRunProgress();
    }
  }, [game, saveService, snapshot.state]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        if (event.key === 'Enter' && game.snapshot().state === GameState.Boot) {
          if (saveFile.activeRun) {
            resumeSavedRun();
          } else {
            startRun();
          }
          return;
        }

        if (/^[1-4]$/.test(event.key)) {
          game.selectWeaponBySlot(Number(event.key));
        } else if (event.key === '5') {
          game.cyclePods();
        } else if (event.key === '6') {
          game.togglePodWeaponMode();
        }
        return;
      }

      game.togglePause();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [game, saveFile.activeRun]);

  function persistCurrentRun() {
    const runProgress = game.exportRunProgress();
    if (!runProgress) {
      return setSaveFile(saveService.clearActiveRun());
    }

    return setSaveFile(saveService.saveActiveRun(runProgress));
  }

  function startFreshRun() {
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function resumeSavedRun() {
    if (saveFile.activeRun) {
      game.startFromRunProgress(saveFile.activeRun);
      persistCurrentRun();
      return;
    }

    game.startNewRun();
    persistCurrentRun();
  }

  function startRun() {
    game.startNewRun();
    persistCurrentRun();
  }

  function restartRun() {
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function activateCard(cardId: string) {
    if (!game.activateFoundCard(cardId)) {
      return;
    }

    persistCurrentRun();
  }

  function discardCard(cardId: string) {
    if (!game.discardFoundCard(cardId)) {
      return;
    }

    persistCurrentRun();
  }

  function discardActiveCard(cardId: string) {
    if (!game.discardActiveCard(cardId)) {
      return;
    }

    persistCurrentRun();
  }

  function buyCard(cardId: string) {
    if (!game.buyCard(cardId)) {
      return;
    }

    persistCurrentRun();
  }

  function startNextRound() {
    game.startNextRound();
    persistCurrentRun();
  }

  function openShop() {
    game.openShop();
  }

  function closeShop() {
    game.closeShop();
  }

  const foundCards = snapshot.foundCards
    .map((cardId) => resolveCard(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const activeCards = snapshot.activeCards
    .map((cardId) => resolveCard(cardId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const shopCards = game.shopOffers();

  return (
    <main className="app-shell" data-game-state={snapshot.state}>
      <div className="game-stage">
        <GameCanvas
          game={game}
          snapshot={snapshot}
          foundCards={foundCards}
          activeCards={activeCards}
          shopCards={shopCards}
          onActivateCard={activateCard}
          onDiscardCard={discardCard}
          onDiscardActiveCard={discardActiveCard}
          onOpenShop={openShop}
          onCloseShop={closeShop}
          onBuyCard={buyCard}
          onContinue={startNextRound}
          onStart={saveFile.activeRun ? resumeSavedRun : startRun}
          onStartFresh={startFreshRun}
          onResume={() => game.resume()}
          onRestart={restartRun}
          hasSavedRun={Boolean(saveFile.activeRun)}
        />
        {snapshot.state === GameState.Paused && (
          <div
            role="dialog"
            aria-label="pause-screen"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
    </main>
  );
}
