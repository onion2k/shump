import { useEffect, useMemo, useState } from 'react';
import { Box, Flex } from './layout/FlexLayout';
import type { CardDefinition } from '../../content/cards';
import { GameState } from '../../core/GameState';
import { PLAYER_WEAPON_ORDER, getPlayerWeaponMaxLevel, getPlayerWeaponMinimumLevel, type PlayerWeaponMode } from '../../weapons/playerWeapons';
import {
  BETWEEN_ROUND_TABS,
  MOBILE_TEXT_BREAKPOINT_PX,
  SHOP_TAB_ID
} from './between-rounds/constants';
import { type CardRenderModel } from './between-rounds/types';
import {
  ActionButton,
  Backdrop,
  PanelFrame,
  SectionBackground,
  TabsRow,
  UiText
} from './between-rounds/uiPrimitives';
import { resolveNextRoundDisplay, weaponModeTag, weaponShortLabel } from './between-rounds/utils';
import { useThree } from '@react-three/fiber';
import { computeBetweenRoundsLayout } from './between-rounds/layout';
import { computeBetweenRoundsPageCounts } from './between-rounds/pagination';
import { BetweenRoundsTabContent } from './between-rounds/TabContent';
import { ActiveCardsSection } from './between-rounds/ActiveCardsSection';

interface BetweenRoundsUi3DProps {
  state: GameState;
  levelId: string;
  roundIndex: number;
  totalRounds: number;
  activeCardLimit: number;
  money: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  selectedPrimaryWeapon: PlayerWeaponMode;
  weaponEnergyMax: number;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
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

export function BetweenRoundsUi3D({
  state,
  levelId,
  roundIndex,
  totalRounds,
  activeCardLimit,
  money,
  weaponLevels,
  selectedPrimaryWeapon,
  weaponEnergyMax,
  podCount,
  podWeaponMode,
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
}: BetweenRoundsUi3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const size = useThree((instance) => instance.size);
  const isVisible = state === GameState.BetweenRounds || state === GameState.Shop;
  const isMobile = size.width <= MOBILE_TEXT_BREAKPOINT_PX;
  const uiZ = 1.75;
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, uiZ]);
  const layout = computeBetweenRoundsLayout(viewport.width, viewport.height, isMobile);
  const {
    scale,
    textScaleBoost,
    panelWidth,
    panelHeight,
    sidePadding,
    contentWidth,
    contentColumns,
    contentRows,
    cardsPerPage,
    tabArrowWidth,
    tabGap,
    tabButtonWidth,
    startButtonWidth,
    titleSectionHeight,
    tabSectionHeight,
    contentSectionHeight,
    activeSectionHeight,
    startSectionHeight,
    contentFooterHeight,
    contentGapX,
    contentGapY,
    contentCardWidth,
    contentCardHeight,
    mobileContentCarouselCardHeight,
    mobileContentCarouselCardWidth,
    mobileContentCarouselGap,
    activeGapX,
    activeGapY,
    activeCardWidth,
    activeCardHeight,
    mobileActiveCarouselGap,
    activeCarouselCardHeight,
    activeCarouselCardWidth
  } = layout;
  const deckCardsPerPage = cardsPerPage;
  const shopCardsPerPage = cardsPerPage;
  const shipCardsPerPage = cardsPerPage;
  const activeCardsPerPage = cardsPerPage;

  const foundDeckFull = foundCards.length >= 12;

  const [activeTabId, setActiveTabId] = useState(() => (state === GameState.Shop ? SHOP_TAB_ID : 'deck'));
  const [deckPage, setDeckPage] = useState(0);
  const [shopPage, setShopPage] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [shipPage, setShipPage] = useState(0);

  useEffect(() => {
    if (state === GameState.Shop) {
      setActiveTabId(SHOP_TAB_ID);
    }
  }, [state]);

  useEffect(() => {
    const hasActiveTab = BETWEEN_ROUND_TABS.some((tab) => tab.id === activeTabId);
    if (!hasActiveTab && BETWEEN_ROUND_TABS.length > 0) {
      setActiveTabId(BETWEEN_ROUND_TABS[0].id);
    }
  }, [activeTabId]);

  const activeTabIndex = Math.max(
    0,
    BETWEEN_ROUND_TABS.findIndex((tab) => tab.id === activeTabId)
  );
  const activeTab = BETWEEN_ROUND_TABS[activeTabIndex] ?? BETWEEN_ROUND_TABS[0];

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    if (activeTab.screen === 'shop' && !foundDeckFull && state !== GameState.Shop) {
      onOpenShop();
      return;
    }

    if (activeTab.screen !== 'shop' && state === GameState.Shop) {
      onCloseShop();
    }
  }, [activeTab, foundDeckFull, onCloseShop, onOpenShop, state]);

  const shipCards: CardRenderModel[] = useMemo(
    () =>
      PLAYER_WEAPON_ORDER.map((mode) => ({
        id: `ship-${mode}`,
        name: weaponShortLabel(mode),
        description: `Level ${weaponLevels[mode] ?? getPlayerWeaponMinimumLevel(mode)}/${getPlayerWeaponMaxLevel(mode)}`,
        rarity: 'common',
        tags: [weaponModeTag(mode), 'weapon']
      })),
    [weaponLevels]
  );
  const {
    deckPageCount,
    shopPageCount,
    activePageCount,
    shipPageCount
  } = computeBetweenRoundsPageCounts({
    isMobile,
    foundCardsCount: foundCards.length,
    shopCardsCount: shopCards.length,
    activeCardsCount: activeCards.length,
    shipCardsCount: shipCards.length,
    deckCardsPerPage,
    shopCardsPerPage,
    shipCardsPerPage,
    activeCardsPerPage
  });

  useEffect(() => {
    setDeckPage((value) => Math.min(value, deckPageCount - 1));
  }, [deckPageCount]);

  useEffect(() => {
    setShopPage((value) => Math.min(value, shopPageCount - 1));
  }, [shopPageCount]);
  useEffect(() => {
    setActivePage((value) => Math.min(value, activePageCount - 1));
  }, [activePageCount]);
  useEffect(() => {
    setShipPage((value) => Math.min(value, shipPageCount - 1));
  }, [shipPageCount]);

  const visibleDeckCards = isMobile
    ? foundCards
    : foundCards.slice(deckPage, deckPage + deckCardsPerPage);
  const visibleShopCards = isMobile
    ? shopCards
    : shopCards.slice(shopPage, shopPage + shopCardsPerPage);
  const visibleShipCards = isMobile
    ? shipCards
    : shipCards.slice(shipPage, shipPage + shipCardsPerPage);
  const nextRoundInfo = resolveNextRoundDisplay(levelId, roundIndex, totalRounds);

  const cycleTab = (direction: -1 | 1) => {
    if (BETWEEN_ROUND_TABS.length === 0) {
      return;
    }

    const nextIndex = (activeTabIndex + direction + BETWEEN_ROUND_TABS.length) % BETWEEN_ROUND_TABS.length;
    setActiveTabId(BETWEEN_ROUND_TABS[nextIndex].id);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <group position={[0, 0, uiZ]}>
      <Backdrop width={viewport.width * 1.2} height={viewport.height * 1.2} />
      <PanelFrame width={panelWidth} height={panelHeight} />
      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleSectionHeight} centerAnchor>
          <SectionBackground width={panelWidth} height={titleSectionHeight} color="#3b5bdb" />
          <group>
            <UiText position={[0, 0, 0.03]} fontSize={0.36 * scale * textScaleBoost} color="#eaf5ff" anchorX="center" anchorY="middle">
              {`Next: Level ${nextRoundInfo.level} • Round ${nextRoundInfo.round}`}
            </UiText>
            <UiText
              position={[panelWidth / 2 - sidePadding, 0, 0.03]}
              fontSize={0.22 * scale * textScaleBoost}
              color="#ffe18d"
              anchorX="right"
              anchorY="middle"
            >
              {`$${money}`}
            </UiText>
          </group>
        </Box>

        <Box width={panelWidth} height={tabSectionHeight} centerAnchor>
          <SectionBackground width={panelWidth} height={tabSectionHeight} color="#0ca678" />
          <TabsRow
            tabs={BETWEEN_ROUND_TABS}
            contentWidth={contentWidth}
            tabArrowWidth={tabArrowWidth}
            tabButtonWidth={tabButtonWidth}
            tabGap={tabGap}
            activeTabId={activeTab.id}
            textScale={textScaleBoost}
            onCycleTab={cycleTab}
            onSelectTab={setActiveTabId}
          />
        </Box>

        <Box width={panelWidth} height={contentSectionHeight} centerAnchor>
          <SectionBackground width={panelWidth} height={contentSectionHeight} color="#e67700" />
          <group>
            <BetweenRoundsTabContent
              activeTab={activeTab}
              contentWidth={contentWidth}
              contentSectionHeight={contentSectionHeight}
              contentFooterHeight={contentFooterHeight}
              contentColumns={contentColumns}
              contentRows={contentRows}
              contentCardWidth={contentCardWidth}
              contentCardHeight={contentCardHeight}
              contentGapX={contentGapX}
              contentGapY={contentGapY}
              mobileContentCarouselCardWidth={mobileContentCarouselCardWidth}
              mobileContentCarouselCardHeight={mobileContentCarouselCardHeight}
              mobileContentCarouselGap={mobileContentCarouselGap}
              isMobile={isMobile}
              textScaleBoost={textScaleBoost}
              foundDeckFull={foundDeckFull}
              money={money}
              foundCardsCount={foundCards.length}
              shopCardsCount={shopCards.length}
              shipCardsCount={shipCards.length}
              activeCards={activeCards}
              activeCardLimit={activeCardLimit}
              visibleShopCards={visibleShopCards}
              visibleDeckCards={visibleDeckCards}
              shipCards={visibleShipCards}
              weaponLevels={weaponLevels}
              weaponEnergyMax={weaponEnergyMax}
              podCount={podCount}
              podWeaponMode={podWeaponMode}
              selectedPrimaryWeapon={selectedPrimaryWeapon}
              shopPage={shopPage}
              shopPageCount={shopPageCount}
              setShopPage={setShopPage}
              deckPage={deckPage}
              deckPageCount={deckPageCount}
              setDeckPage={setDeckPage}
              shipPage={shipPage}
              shipPageCount={shipPageCount}
              setShipPage={setShipPage}
              onSelectPrimaryWeapon={onSelectPrimaryWeapon}
              onActivateCard={onActivateCard}
              onDiscardCard={onDiscardCard}
              onBuyCard={onBuyCard}
            />
          </group>
        </Box>

        <Box width={panelWidth} height={activeSectionHeight} centerAnchor>
          <ActiveCardsSection
            panelWidth={panelWidth}
            activeSectionHeight={activeSectionHeight}
            contentWidth={contentWidth}
            textScaleBoost={textScaleBoost}
            isMobile={isMobile}
            activeCards={activeCards}
            activeCardLimit={activeCardLimit}
            activeCardsCount={activeCards.length}
            activePage={activePage}
            activePageCount={activePageCount}
            setActivePage={setActivePage}
            activeCarouselCardWidth={activeCarouselCardWidth}
            activeCarouselCardHeight={activeCarouselCardHeight}
            mobileActiveCarouselGap={mobileActiveCarouselGap}
            activeCardWidth={activeCardWidth}
            activeCardHeight={activeCardHeight}
            contentColumns={contentColumns}
            contentRows={contentRows}
            activeGapX={activeGapX}
            activeGapY={activeGapY}
            onDiscardActiveCard={onDiscardActiveCard}
          />
        </Box>

        <Box width={panelWidth} height={startSectionHeight} centerAnchor>
          <SectionBackground width={panelWidth} height={startSectionHeight} color="#1971c2" />
          <ActionButton label="Start Round" width={startButtonWidth} onClick={onContinue} color="#2b8c56" textScale={textScaleBoost} />
        </Box>
      </Flex>
    </group>
  );
}
