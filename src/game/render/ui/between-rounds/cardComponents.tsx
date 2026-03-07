import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Box, Flex } from '../layout/FlexLayout';
import type { Group } from 'three';
import { isConsumableUpgradeCard, type CardDefinition } from '../../../content/cards';
import { PLAYER_WEAPON_ORDER, getPlayerWeaponMaxLevel, type PlayerWeaponMode } from '../../../weapons/playerWeapons';
import { MOBILE_TEXT_BREAKPOINT_PX } from './constants';
import type { CardRenderModel } from './types';
import { cardColorByRarity, cardIcon, weaponModeTag, weaponShortLabel } from './utils';
import { ActionButton, UiText } from './uiPrimitives';

interface InteractiveCardProps {
  card: CardDefinition;
  width: number;
  height: number;
  money: number;
  activeCards: CardDefinition[];
  activeCardLimit: number;
  shopMode: boolean;
  shopBlocked?: boolean;
  textScale: number;
  onActivateCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
}

interface CardGridProps {
  cards: CardDefinition[];
  columns: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  gapX: number;
  gapY: number;
  money: number;
  activeCards: CardDefinition[];
  activeCardLimit: number;
  shopMode: boolean;
  shopBlocked?: boolean;
  textScale: number;
  onActivateCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
}

export function CardGrid({
  cards,
  columns,
  rows,
  cardWidth,
  cardHeight,
  gapX,
  gapY,
  money,
  activeCards,
  activeCardLimit,
  shopMode,
  shopBlocked = false,
  textScale,
  onActivateCard,
  onDiscardCard,
  onBuyCard
}: CardGridProps) {
  const maxSlots = columns * rows;
  const visibleCards = cards.slice(0, maxSlots);
  const gridWidth = columns * cardWidth + Math.max(0, columns - 1) * gapX;
  const gridHeight = rows * cardHeight + Math.max(0, rows - 1) * gapY;

  return (
    <group position={[0, 0, 0.03]}>
      <Flex size={[gridWidth, gridHeight, 0]} position={[-gridWidth / 2, gridHeight / 2, 0.02]} flexDirection="row" flexWrap="wrap">
        {visibleCards.map((card, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const rightGap = col < columns - 1 ? gapX : 0;
          const bottomGap = row < rows - 1 ? gapY : 0;

          return (
            <Box key={`${card.id}-${index}`} width={cardWidth} height={cardHeight} mr={rightGap} mb={bottomGap} centerAnchor>
              <InteractiveCard
                card={card}
                width={cardWidth}
                height={cardHeight}
                money={money}
                activeCards={activeCards}
                activeCardLimit={activeCardLimit}
                shopMode={shopMode}
                shopBlocked={shopBlocked}
                textScale={textScale}
                onActivateCard={onActivateCard}
                onDiscardCard={onDiscardCard}
                onBuyCard={onBuyCard}
              />
            </Box>
          );
        })}
      </Flex>
    </group>
  );
}

export function InteractiveCard({
  card,
  width,
  height,
  money,
  activeCards,
  activeCardLimit,
  shopMode,
  shopBlocked = false,
  textScale,
  onActivateCard,
  onDiscardCard,
  onBuyCard
}: InteractiveCardProps) {
  const action = useMemo(() => {
    if (shopMode) {
      if (shopBlocked) {
        return {
          label: 'Deck Full',
          disabled: true,
          onClick: () => {}
        };
      }

      return {
        label: money >= card.cost ? `Buy ${card.cost}` : `Need ${card.cost}`,
        disabled: money < card.cost,
        onClick: () => onBuyCard(card.id)
      };
    }

    if (isConsumableUpgradeCard(card)) {
      return {
        label: 'Use',
        disabled: false,
        onClick: () => onActivateCard(card.id)
      };
    }

    if (activeCards.length >= activeCardLimit) {
      return {
        label: 'No Slots',
        disabled: true,
        onClick: () => {}
      };
    }

    return {
      label: 'Activate',
      disabled: false,
      onClick: () => onActivateCard(card.id)
    };
  }, [activeCardLimit, activeCards.length, card, money, onActivateCard, onBuyCard, shopBlocked, shopMode]);

  return (
    <group>
      <CardFrame card={card} width={width} height={height} interactive textScale={textScale} />

      <group position={[0, -height * 0.23, 0.03]}>
        <ActionButton
          label={action.label}
          width={width * 0.62}
          disabled={action.disabled}
          onClick={action.onClick}
          color={shopMode ? '#2b6f92' : '#2f8257'}
          textScale={textScale}
        />
      </group>

      {!shopMode && (
        <group position={[0, -height * 0.4, 0.03]}>
          <ActionButton label="Discard" width={width * 0.5} onClick={() => onDiscardCard(card.id)} color="#7d3f48" textScale={textScale} />
        </group>
      )}
    </group>
  );
}

export function CardFrame({
  card,
  width,
  height,
  interactive = false,
  muted = false,
  textScale = 1
}: {
  card: CardRenderModel;
  width: number;
  height: number;
  interactive?: boolean;
  muted?: boolean;
  textScale?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group>(null);
  const size = useThree((state) => state.size);
  const isMobile = size.width <= MOBILE_TEXT_BREAKPOINT_PX;
  const mobileIconScale = isMobile ? 0.62 : 1;
  const mobileTitleBodyScale = isMobile ? 0.72 : 1;
  const iconSize = Math.max(isMobile ? 0.18 : 0.16, height * 0.055 * textScale * mobileIconScale);
  const titleSize = Math.max(isMobile ? 0.26 : 0.19, height * 0.06 * textScale * mobileTitleBodyScale);
  const bodySize = Math.max(isMobile ? 0.19 : 0.145, height * 0.043 * textScale * mobileTitleBodyScale);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const floatOffset = Math.sin(clock.elapsedTime * 1.4 + width) * 0.013;
    const targetScale = hovered && interactive ? 1.03 : 1;
    groupRef.current.position.z += (floatOffset - groupRef.current.position.z) * 0.16;
    groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * 0.2;
    groupRef.current.scale.y += (targetScale - groupRef.current.scale.y) * 0.2;
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(event) => {
        if (!interactive) {
          return;
        }
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(event) => {
        if (!interactive) {
          return;
        }
        event.stopPropagation();
        setHovered(false);
      }}
    >
      <mesh renderOrder={1450}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={muted ? '#314458' : cardColorByRarity(card.rarity)}
          transparent
          opacity={muted ? 0.62 : 0.94}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]} renderOrder={1451}>
        <planeGeometry args={[width * 0.96, height * 0.96]} />
        <meshBasicMaterial color="#061122" transparent opacity={0.72} depthTest={false} toneMapped={false} />
      </mesh>

      <UiText
        position={[-width * 0.43, height * 0.41, 0.03]}
        fontSize={iconSize}
        color="#c5e3ff"
        anchorX="left"
        anchorY="middle"
        maxWidth={width * 0.86}
        disableMobileMin
      >
        {cardIcon(card)}
      </UiText>
      <UiText
        position={[-width * 0.43, height * 0.25, 0.03]}
        fontSize={titleSize}
        color="#f4f8ff"
        anchorX="left"
        anchorY="middle"
        maxWidth={width * 0.86}
        disableMobileMin
      >
        {card.name}
      </UiText>
      <UiText
        position={[-width * 0.43, height * 0.03, 0.03]}
        fontSize={bodySize}
        lineHeight={1.22}
        color="#9bc7f4"
        anchorX="left"
        anchorY="top"
        maxWidth={width * 0.86}
        disableMobileMin
      >
        {card.description}
      </UiText>
    </group>
  );
}

export function ActiveCardGrid({
  cards,
  cardWidth,
  cardHeight,
  columns,
  rows,
  gapX,
  gapY,
  textScale,
  onDiscardActiveCard,
  activeCardLimit
}: {
  cards: CardDefinition[];
  cardWidth: number;
  cardHeight: number;
  columns: number;
  rows: number;
  gapX: number;
  gapY: number;
  textScale: number;
  onDiscardActiveCard: (cardId: string) => void;
  activeCardLimit: number;
}) {
  const placeholderCards: CardRenderModel[] = Array.from({ length: activeCardLimit }, (_, index) => ({
    id: `empty-slot-${index + 1}`,
    name: 'Empty Slot',
    description: 'Activate a card to fill this loadout slot.',
    rarity: 'common',
    tags: []
  }));

  const displayCards = Array.from({ length: activeCardLimit }, (_, index) => cards[index] ?? placeholderCards[index]);
  const maxSlots = Math.max(columns * rows, activeCardLimit);
  const gridWidth = columns * cardWidth + Math.max(0, columns - 1) * gapX;
  const gridHeight = rows * cardHeight + Math.max(0, rows - 1) * gapY;

  return (
    <group>
      <Flex size={[gridWidth, gridHeight, 0]} position={[-gridWidth / 2, gridHeight / 2, 0.03]} flexDirection="row" flexWrap="wrap">
        {displayCards.slice(0, maxSlots).map((card, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const rightGap = col < columns - 1 ? gapX : 0;
          const bottomGap = row < rows - 1 ? gapY : 0;
          const isPlaceholder = index >= cards.length;

          return (
            <Box key={`active-slot-${index}`} width={cardWidth} height={cardHeight} mr={rightGap} mb={bottomGap} centerAnchor>
              <CardFrame card={card} width={cardWidth} height={cardHeight} muted={isPlaceholder} textScale={textScale} />
              {!isPlaceholder && (
                <ActionButton
                  label="Discard"
                  width={cardWidth * 0.48}
                  y={-cardHeight * 0.4}
                  onClick={() => onDiscardActiveCard(card.id)}
                  color="#7d3f48"
                  textScale={textScale}
                />
              )}
            </Box>
          );
        })}
      </Flex>
    </group>
  );
}

export function ShipStatsPanel({
  cardWidth,
  cardHeight,
  columns,
  rows,
  gapX,
  gapY,
  weaponLevels,
  textScale,
  selectedPrimaryWeapon,
  onSelectPrimaryWeapon
}: {
  cardWidth: number;
  cardHeight: number;
  columns: number;
  rows: number;
  gapX: number;
  gapY: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  textScale: number;
  selectedPrimaryWeapon: PlayerWeaponMode;
  onSelectPrimaryWeapon: (mode: PlayerWeaponMode) => void;
}) {
  const cards: CardRenderModel[] = PLAYER_WEAPON_ORDER.map((mode) => ({
    id: `ship-${mode}`,
    name: weaponShortLabel(mode),
    description: `Level ${weaponLevels[mode] ?? 1}/${getPlayerWeaponMaxLevel(mode)}`,
    rarity: 'common',
    tags: [weaponModeTag(mode), 'weapon']
  }));

  const gridWidth = columns * cardWidth + Math.max(0, columns - 1) * gapX;
  const gridHeight = rows * cardHeight + Math.max(0, rows - 1) * gapY;

  return (
    <group>
      <Flex size={[gridWidth, gridHeight, 0]} position={[-gridWidth / 2, gridHeight / 2, 0.03]} flexDirection="row" flexWrap="wrap">
        {cards.map((card, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const rightGap = col < columns - 1 ? gapX : 0;
          const bottomGap = row < rows - 1 ? gapY : 0;
          return (
            <Box key={card.id} width={cardWidth} height={cardHeight} mr={rightGap} mb={bottomGap} centerAnchor>
              <ShipLoadoutCard
                card={card}
                weaponMode={PLAYER_WEAPON_ORDER[index] ?? 'Auto Pulse'}
                width={cardWidth}
                height={cardHeight}
                textScale={textScale}
                selected={selectedPrimaryWeapon === (PLAYER_WEAPON_ORDER[index] ?? 'Auto Pulse')}
                onSelect={onSelectPrimaryWeapon}
              />
            </Box>
          );
        })}
      </Flex>
    </group>
  );
}

export function ShipLoadoutCard({
  card,
  weaponMode,
  width,
  height,
  textScale,
  selected,
  onSelect
}: {
  card: CardRenderModel;
  weaponMode: PlayerWeaponMode;
  width: number;
  height: number;
  textScale: number;
  selected: boolean;
  onSelect: (mode: PlayerWeaponMode) => void;
}) {
  return (
    <group>
      <CardFrame card={card} width={width} height={height} textScale={textScale} />
      <ActionButton
        label={selected ? 'Selected' : 'Set Primary'}
        width={width * 0.62}
        y={-height * 0.39}
        onClick={() => onSelect(weaponMode)}
        disabled={selected}
        color={selected ? '#1f6f4a' : '#2b6f92'}
        textScale={textScale}
      />
    </group>
  );
}
