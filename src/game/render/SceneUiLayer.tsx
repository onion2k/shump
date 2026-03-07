import { Stats } from '@react-three/drei';
import { Hud3D } from './Hud3D';
import { StartScreen3D } from './ui/StartScreen3D';
import { TitleSettingsScreen3D } from './ui/TitleSettingsScreen3D';
import { PauseScreen3D } from './ui/PauseScreen3D';
import { GameOverScreen3D } from './ui/GameOverScreen3D';
import { BetweenRoundsUi3D } from './ui/BetweenRoundsUi3D';
import type { GameSnapshot } from '../core/Game';
import type { CardDefinition } from '../content/cards';
import type { EffectsQuality } from './effectsQuality';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';

interface SceneUiLayerProps {
  showStats: boolean;
  snapshot: GameSnapshot;
  hasSavedRun: boolean;
  effectsQuality: EffectsQuality;
  titleSettingsOpen: boolean;
  onStart: () => void;
  onStartFresh?: () => void;
  onOpenTitleSettings: () => void;
  onCloseTitleSettings: () => void;
  onSelectEffectsQuality: (quality: EffectsQuality) => void;
  onResume: () => void;
  onRestart: () => void;
  foundCards: CardDefinition[];
  activeCards: CardDefinition[];
  shopCards: CardDefinition[];
  onActivateCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onDiscardActiveCard: (cardId: string) => void;
  onOpenShop: () => void;
  onCloseShop: () => void;
  onBuyCard: (cardId: string) => void;
  onSelectPrimaryWeapon: (mode: PlayerWeaponMode) => void;
  onContinue: () => void;
}

export function SceneUiLayer({
  showStats,
  snapshot,
  hasSavedRun,
  effectsQuality,
  titleSettingsOpen,
  onStart,
  onStartFresh,
  onOpenTitleSettings,
  onCloseTitleSettings,
  onSelectEffectsQuality,
  onResume,
  onRestart,
  foundCards,
  activeCards,
  shopCards,
  onActivateCard,
  onDiscardCard,
  onDiscardActiveCard,
  onOpenShop,
  onCloseShop,
  onBuyCard,
  onSelectPrimaryWeapon,
  onContinue
}: SceneUiLayerProps) {
  return (
    <>
      {showStats && <Stats showPanel={0} className="fps-stats" />}
      <Hud3D snapshot={snapshot} />
      {!titleSettingsOpen && (
        <StartScreen3D
          state={snapshot.state}
          hasSavedRun={hasSavedRun}
          effectsQuality={effectsQuality}
          onStart={onStart}
          onStartFresh={onStartFresh}
          onOpenSettings={onOpenTitleSettings}
        />
      )}
      <TitleSettingsScreen3D
        state={snapshot.state}
        open={titleSettingsOpen}
        effectsQuality={effectsQuality}
        onSelectEffectsQuality={onSelectEffectsQuality}
        onClose={onCloseTitleSettings}
      />
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
        selectedPrimaryWeapon={snapshot.selectedPrimaryWeaponMode}
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
        onSelectPrimaryWeapon={onSelectPrimaryWeapon}
        onContinue={onContinue}
      />
    </>
  );
}
