import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './game/render/GameCanvas';
import { Game } from './game/core/Game';
import { GameState } from './game/core/GameState';
import { createLocalSaveService } from './game/persistence/SaveService';
import type { SaveFile } from './game/persistence/saveSchema';
import { resolveCard } from './game/content/cards';
import { PLAYER_WEAPON_ORDER, isPlayerWeaponMode, type PlayerWeaponMode } from './game/weapons/playerWeapons';
import {
  DEFAULT_EFFECTS_QUALITY,
  isEffectsQuality,
  type EffectsQuality
} from './game/render/effectsQuality';

const EFFECTS_QUALITY_STORAGE_KEY = 'shump.effects-quality';

export function App() {
  const game = useMemo(() => new Game(), []);
  const saveService = useMemo(() => createLocalSaveService(), []);
  const [snapshot, setSnapshot] = useState(() => game.snapshot());
  const [saveFile, setSaveFile] = useState<SaveFile>(() => saveService.load().save);
  const [effectsQuality, setEffectsQuality] = useState<EffectsQuality>(loadEffectsQualitySetting);
  const [titleSettingsOpen, setTitleSettingsOpen] = useState(false);

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
    if (snapshot.state !== GameState.Boot && titleSettingsOpen) {
      setTitleSettingsOpen(false);
    }
  }, [snapshot.state, titleSettingsOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && snapshot.state === GameState.Boot && titleSettingsOpen) {
        setTitleSettingsOpen(false);
        return;
      }

      if (event.key !== 'Escape') {
        if (event.key === 'Enter' && game.snapshot().state === GameState.Boot && !titleSettingsOpen) {
          if (saveFile.activeRun) {
            resumeSavedRun();
          } else {
            startRun();
          }
          return;
        }

        if (event.key === 'z' || event.key === 'Z') {
          game.cyclePods();
        } else if (event.key === 'x' || event.key === 'X') {
          game.togglePodWeaponMode();
        } else if (snapshot.state === GameState.BetweenRounds || snapshot.state === GameState.Shop) {
          if (/^[1-9]$/.test(event.key)) {
            const weaponMode = PLAYER_WEAPON_ORDER[Number(event.key) - 1];
            if (weaponMode) {
              game.selectPrimaryWeaponLoadout(weaponMode);
              persistCurrentRun();
            }
          } else if (event.key === 'q' || event.key === 'Q' || event.key === 'e' || event.key === 'E') {
            const direction = event.key === 'q' || event.key === 'Q' ? -1 : 1;
            const current = game.snapshot().selectedPrimaryWeaponMode;
            const currentMode: PlayerWeaponMode = isPlayerWeaponMode(current) ? current : PLAYER_WEAPON_ORDER[0];
            const currentIndex = Math.max(0, PLAYER_WEAPON_ORDER.indexOf(currentMode));
            const nextMode = PLAYER_WEAPON_ORDER[
              (currentIndex + direction + PLAYER_WEAPON_ORDER.length) % PLAYER_WEAPON_ORDER.length
            ];
            if (nextMode) {
              game.selectPrimaryWeaponLoadout(nextMode);
              persistCurrentRun();
            }
          }
        }
        return;
      }

      game.togglePause();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [game, saveFile.activeRun, snapshot.state, titleSettingsOpen]);

  function persistCurrentRun() {
    const runProgress = game.exportRunProgress();
    if (!runProgress) {
      return setSaveFile(saveService.clearActiveRun());
    }

    return setSaveFile(saveService.saveActiveRun(runProgress));
  }

  function startFreshRun() {
    setTitleSettingsOpen(false);
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function resumeSavedRun() {
    setTitleSettingsOpen(false);
    if (saveFile.activeRun) {
      game.startFromRunProgress(saveFile.activeRun);
      persistCurrentRun();
      return;
    }

    game.startNewRun();
    persistCurrentRun();
  }

  function startRun() {
    setTitleSettingsOpen(false);
    game.startNewRun();
    persistCurrentRun();
  }

  function restartRun() {
    setTitleSettingsOpen(false);
    setSaveFile(saveService.clearActiveRun());
    game.startNewRun();
    persistCurrentRun();
  }

  function openTitleSettings() {
    if (snapshot.state !== GameState.Boot) {
      return;
    }

    setTitleSettingsOpen(true);
  }

  function closeTitleSettings() {
    setTitleSettingsOpen(false);
  }

  function selectEffectsQuality(quality: EffectsQuality) {
    setEffectsQuality(quality);
    persistEffectsQualitySetting(quality);
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

  function selectPrimaryWeaponLoadout(mode: PlayerWeaponMode) {
    if (!game.selectPrimaryWeaponLoadout(mode)) {
      return;
    }

    persistCurrentRun();
  }

  function openShop() {
    game.openShop();
  }

  function closeShop() {
    game.closeShop();
  }

  const foundCardsKey = snapshot.foundCards.join('|');
  const activeCardsKey = snapshot.activeCards.join('|');

  const foundCards = useMemo(
    () =>
      snapshot.foundCards
        .map((cardId) => resolveCard(cardId))
        .filter((card): card is NonNullable<typeof card> => Boolean(card)),
    [foundCardsKey, snapshot.foundCards]
  );
  const activeCards = useMemo(
    () =>
      snapshot.activeCards
        .map((cardId) => resolveCard(cardId))
        .filter((card): card is NonNullable<typeof card> => Boolean(card)),
    [activeCardsKey, snapshot.activeCards]
  );
  const shopCards = useMemo(() => {
    if (snapshot.state !== GameState.Shop && snapshot.state !== GameState.BetweenRounds) {
      return [];
    }
    return game.shopOffers();
  }, [activeCardsKey, foundCardsKey, game, snapshot.roundIndex, snapshot.state]);

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
          onSelectPrimaryWeapon={selectPrimaryWeaponLoadout}
          onContinue={startNextRound}
          onStart={saveFile.activeRun ? resumeSavedRun : startRun}
          onStartFresh={startFreshRun}
          onResume={() => game.resume()}
          onRestart={restartRun}
          hasSavedRun={Boolean(saveFile.activeRun)}
          effectsQuality={effectsQuality}
          titleSettingsOpen={titleSettingsOpen}
          onOpenTitleSettings={openTitleSettings}
          onCloseTitleSettings={closeTitleSettings}
          onSelectEffectsQuality={selectEffectsQuality}
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

function loadEffectsQualitySetting(): EffectsQuality {
  if (typeof window === 'undefined') {
    return DEFAULT_EFFECTS_QUALITY;
  }

  const raw = window.localStorage.getItem(EFFECTS_QUALITY_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_EFFECTS_QUALITY;
  }

  return isEffectsQuality(raw) ? raw : DEFAULT_EFFECTS_QUALITY;
}

function persistEffectsQualitySetting(quality: EffectsQuality): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(EFFECTS_QUALITY_STORAGE_KEY, quality);
}
