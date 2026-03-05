import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Box, Flex } from 'react-three-flex';
import type { Group, Mesh } from 'three';
import { isConsumableUpgradeCard, type CardDefinition } from '../../content/cards';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { PLAYER_WEAPON_ORDER, getPlayerWeaponMaxLevel, type PlayerWeaponMode } from '../../weapons/playerWeapons';

interface BetweenRoundsUi3DProps {
  state: GameState;
  levelId: string;
  roundIndex: number;
  totalRounds: number;
  activeCardLimit: number;
  money: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
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
  onContinue: () => void;
}

interface ActionButtonProps {
  label: string;
  width: number;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
  x?: number;
  y?: number;
  textScale?: number;
}

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

interface PageControlsProps {
  page: number;
  pageCount: number;
  width: number;
  y: number;
  textScale: number;
  onPrev: () => void;
  onNext: () => void;
}

interface TabsRowProps {
  tabs: BetweenRoundsTab[];
  contentWidth: number;
  tabArrowWidth: number;
  tabButtonWidth: number;
  tabGap: number;
  activeTabId: string;
  textScale: number;
  onCycleTab: (direction: -1 | 1) => void;
  onSelectTab: (tabId: string) => void;
}

type CardRenderModel = Pick<CardDefinition, 'id' | 'name' | 'description' | 'rarity' | 'tags'>;

interface BetweenRoundsTab {
  id: string;
  label: string;
  screen: string;
}

const BETWEEN_ROUND_TABS: BetweenRoundsTab[] = [
  { id: 'shop', label: 'Shop', screen: 'shop' },
  { id: 'deck', label: 'Deck', screen: 'deck' },
  { id: 'ship', label: 'Ship', screen: 'ship' }
];

const SHOP_TAB_ID = 'shop';
const DECK_TAB_ID = 'deck';
const FOUND_DECK_LIMIT = 12;
const MIN_MOBILE_TEXT_PX = 16;
const MOBILE_TEXT_BREAKPOINT_PX = 900;
const CARD_ASPECT_RATIO = 1.45;
const ACTIVE_CARD_ASPECT_RATIO = 1.35;
const DESKTOP_CARD_COLUMNS = 4;
const BETWEEN_ROUNDS_SECTION_RATIO = {
  title: 0.1,
  tabs: 0.1,
  content: 0.5,
  active: 0.2,
  action: 0.1
} as const;

const TAG_ICON_BY_NAME: Record<string, string> = {
  weapon: '[W]',
  defense: '[D]',
  economy: '[$]',
  pod: '[P]',
  pulse: '[PU]',
  laser: '[L]',
  cannon: '[C]',
  missile: '[M]',
  sine: '[S]',
  utility: '[U]',
  precision: '[PR]',
  assault: '[AT]',
  hull: '[H]',
  drone: '[DR]',
  core: '[O]'
};

const TAG_PRIORITY = ['weapon', 'defense', 'economy', 'pod', 'laser', 'pulse', 'cannon', 'missile', 'sine'];

type UiTextProps = ComponentProps<typeof Text> & { disableMobileMin?: boolean };

function UiText(props: UiTextProps) {
  const { disableMobileMin = false, ...textProps } = props;
  const camera = useThree((state) => state.camera);
  const viewportApi = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const viewportAtUi = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);
  const worldUnitsPerPixel = viewportAtUi.width / Math.max(1, size.width);
  const mobileMinFontSize = MIN_MOBILE_TEXT_PX * worldUnitsPerPixel;
  const requested = typeof textProps.fontSize === 'number' ? textProps.fontSize : undefined;
  const fontSize =
    requested && !disableMobileMin && size.width <= MOBILE_TEXT_BREAKPOINT_PX
      ? Math.max(requested, mobileMinFontSize)
      : textProps.fontSize;

  return (
    <Text
      renderOrder={1600}
      material-depthTest={false}
      material-depthWrite={false}
      material-toneMapped={false}
      {...textProps}
      fontSize={fontSize}
    />
  );
}

export function BetweenRoundsUi3D({
  state,
  levelId,
  roundIndex,
  totalRounds,
  activeCardLimit,
  money,
  weaponLevels,
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
  onContinue
}: BetweenRoundsUi3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const size = useThree((instance) => instance.size);
  const isVisible = state === GameState.BetweenRounds || state === GameState.Shop;
  const isMobile = size.width <= MOBILE_TEXT_BREAKPOINT_PX;
  const uiZ = 1.75;
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, uiZ]);
  const scale = clamp(viewport.width / 16, 0.65, 1);
  const textScaleBoost = viewport.width < 8.5 ? 1.15 : viewport.width < 11 ? 1.1 : 1;
  const panelWidth = isMobile ? viewport.width * 0.96 : Math.max(6, viewport.width * 0.78);
  const panelHeight = isMobile ? viewport.height * 0.94 : Math.max(4.4, viewport.height * 0.8);

  const sidePadding = panelWidth * (isMobile ? 0.07 : 0.06);
  const contentWidth = panelWidth - sidePadding * 2;
  const contentColumns = isMobile ? 2 : 4;
  const contentRows = isMobile ? 2 : 1;
  const cardsPerPage = contentColumns * contentRows;
  const deckCardsPerPage = isMobile ? 1 : cardsPerPage;
  const shopCardsPerPage = isMobile ? 1 : cardsPerPage;

  const tabArrowWidth = clamp(panelWidth * 0.07, 0.62, 0.92);
  const tabGap = clamp(contentWidth * 0.016, 0.1, 0.18);
  const tabTrackWidth = contentWidth - tabArrowWidth * 2 - tabGap * 2;
  const tabButtonWidth = Math.max(0.7, (tabTrackWidth - tabGap * Math.max(0, BETWEEN_ROUND_TABS.length - 1)) / Math.max(1, BETWEEN_ROUND_TABS.length));
  const startButtonWidth = Math.min(contentWidth * 0.52, 3.6);
  const titleSectionHeight = panelHeight * BETWEEN_ROUNDS_SECTION_RATIO.title;
  const tabSectionHeight = panelHeight * BETWEEN_ROUNDS_SECTION_RATIO.tabs;
  const contentSectionHeight = panelHeight * BETWEEN_ROUNDS_SECTION_RATIO.content;
  const activeSectionHeight = panelHeight * BETWEEN_ROUNDS_SECTION_RATIO.active;
  const startSectionHeight = panelHeight * BETWEEN_ROUNDS_SECTION_RATIO.action;

  const contentAreaHeight = contentSectionHeight * (isMobile ? 0.8 : 0.78);
  const contentGapX = contentColumns > 1 ? contentWidth * (isMobile ? 0.045 : 0.028) : 0;
  const contentGapY = contentRows > 1 ? contentAreaHeight * 0.075 : 0;
  const contentCardWidthFromWidth = (contentWidth - contentGapX * (contentColumns - 1)) / contentColumns;
  const contentCardHeightFromHeight = (contentAreaHeight - contentGapY * (contentRows - 1)) / contentRows;
  const contentCardHeight = Math.min(contentCardWidthFromWidth * CARD_ASPECT_RATIO, contentCardHeightFromHeight);
  const contentCardWidth = contentCardHeight / CARD_ASPECT_RATIO;
  const desktopReferenceGapX = contentWidth * 0.028;
  const desktopReferenceWidthFromWidth = (contentWidth - desktopReferenceGapX * (DESKTOP_CARD_COLUMNS - 1)) / DESKTOP_CARD_COLUMNS;
  const desktopReferenceHeightFromHeight = panelHeight * 0.24;
  const desktopReferenceCardHeight = Math.min(desktopReferenceWidthFromWidth * CARD_ASPECT_RATIO, desktopReferenceHeightFromHeight);
  const desktopReferenceCardWidth = desktopReferenceCardHeight / CARD_ASPECT_RATIO;

  const activeAreaHeight = activeSectionHeight * (isMobile ? 0.8 : 0.78);
  const activeGapX = contentColumns > 1 ? contentWidth * (isMobile ? 0.05 : 0.03) : 0;
  const activeGapY = contentRows > 1 ? activeAreaHeight * 0.1 : 0;
  const activeCardWidthFromWidth = (contentWidth - activeGapX * (contentColumns - 1)) / contentColumns;
  const activeCardHeightFromHeight = (activeAreaHeight - activeGapY * (contentRows - 1)) / contentRows;
  const activeCardHeight = Math.min(activeCardWidthFromWidth * ACTIVE_CARD_ASPECT_RATIO, activeCardHeightFromHeight);
  const activeCardWidth = activeCardHeight / ACTIVE_CARD_ASPECT_RATIO;
  const activeCarouselCardHeight = isMobile ? desktopReferenceCardHeight : activeCardHeight;
  const activeCarouselCardWidth = isMobile ? desktopReferenceCardWidth : activeCardWidth;

  const foundDeckFull = foundCards.length >= FOUND_DECK_LIMIT;

  const [activeTabId, setActiveTabId] = useState(() => (state === GameState.Shop ? SHOP_TAB_ID : DECK_TAB_ID));
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

  const deckPageCount = Math.max(1, Math.ceil(foundCards.length / deckCardsPerPage));
  const shopPageCount = Math.max(1, Math.ceil(shopCards.length / shopCardsPerPage));
  const activePageCount = Math.max(1, activeCards.length);
  const shipCards: CardRenderModel[] = useMemo(
    () =>
      PLAYER_WEAPON_ORDER.map((mode) => ({
        id: `ship-${mode}`,
        name: weaponShortLabel(mode),
        description: `Level ${weaponLevels[mode] ?? 1}/${getPlayerWeaponMaxLevel(mode)}`,
        rarity: 'common',
        tags: [weaponModeTag(mode), 'weapon']
      })),
    [weaponLevels]
  );
  const shipPageCount = Math.max(1, shipCards.length);

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

  const visibleDeckCards = foundCards.slice(deckPage * deckCardsPerPage, deckPage * deckCardsPerPage + deckCardsPerPage);
  const visibleShopCards = shopCards.slice(shopPage * shopCardsPerPage, shopPage * shopCardsPerPage + shopCardsPerPage);
  const activeCarouselCard = activeCards[activePage];
  const shipCarouselCard = shipCards[shipPage];

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
          <group>
            {activeTab.screen === 'shop' && (
              <>
                <UiText position={[0, contentAreaHeight * 0.43, 0.04]} fontSize={0.18 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                  Buy cards for the next round
                </UiText>
                {foundDeckFull && (
                  <UiText position={[0, contentAreaHeight * 0.34, 0.04]} fontSize={0.15 * textScaleBoost} color="#ffbe9a" anchorX="center" anchorY="middle">
                    Deck is full. Discard cards before buying.
                  </UiText>
                )}
                {visibleShopCards.length === 0 ? (
                  <UiText position={[0, 0, 0.04]} fontSize={0.24 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                    No shop offers.
                  </UiText>
                ) : (
                  <group position={[0, isMobile ? contentAreaHeight * 0.08 : 0, 0]}>
                    <CardGrid
                      cards={visibleShopCards}
                      columns={isMobile ? 1 : contentColumns}
                      rows={isMobile ? 1 : contentRows}
                      cardWidth={isMobile ? desktopReferenceCardWidth : contentCardWidth}
                      cardHeight={isMobile ? desktopReferenceCardHeight : contentCardHeight}
                      gapX={contentGapX}
                      gapY={contentGapY}
                      money={money}
                      activeCards={activeCards}
                      activeCardLimit={activeCardLimit}
                      shopMode
                      shopBlocked={foundDeckFull}
                      textScale={textScaleBoost}
                      onActivateCard={onActivateCard}
                      onDiscardCard={onDiscardCard}
                      onBuyCard={onBuyCard}
                    />
                  </group>
                )}
                {(isMobile || shopPageCount > 1) && (
                  <PageControls
                    page={shopPage}
                    pageCount={shopPageCount}
                    width={Math.min(contentWidth * 0.46, 3.2)}
                    y={isMobile ? -contentAreaHeight * 0.46 : -contentAreaHeight * 0.66}
                    textScale={textScaleBoost}
                    onPrev={() => setShopPage((value) => (value - 1 + shopPageCount) % shopPageCount)}
                    onNext={() => setShopPage((value) => (value + 1) % shopPageCount)}
                  />
                )}
              </>
            )}

            {activeTab.screen === 'deck' && (
              <>
                <UiText position={[0, contentAreaHeight * 0.43, 0.04]} fontSize={0.18 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                  Manage found cards: activate, use, or discard
                </UiText>
                {visibleDeckCards.length === 0 ? (
                  <UiText position={[0, 0, 0.04]} fontSize={0.24 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                    No cards found this round.
                  </UiText>
                ) : (
                  <group position={[0, isMobile ? contentAreaHeight * 0.16 : 0, 0]}>
                    <CardGrid
                      cards={visibleDeckCards}
                      columns={isMobile ? 1 : contentColumns}
                      rows={isMobile ? 1 : contentRows}
                      cardWidth={isMobile ? desktopReferenceCardWidth : contentCardWidth}
                      cardHeight={isMobile ? desktopReferenceCardHeight : contentCardHeight}
                      gapX={contentGapX}
                      gapY={contentGapY}
                      money={money}
                      activeCards={activeCards}
                      activeCardLimit={activeCardLimit}
                      shopMode={false}
                      textScale={textScaleBoost}
                      onActivateCard={onActivateCard}
                      onDiscardCard={onDiscardCard}
                      onBuyCard={onBuyCard}
                    />
                  </group>
                )}
                {(isMobile || deckPageCount > 1) && (
                  <PageControls
                    page={deckPage}
                    pageCount={deckPageCount}
                    width={Math.min(contentWidth * 0.46, 3.2)}
                    y={isMobile ? -contentAreaHeight * 0.46 : -contentAreaHeight * 0.66}
                    textScale={textScaleBoost}
                    onPrev={() => setDeckPage((value) => (value - 1 + deckPageCount) % deckPageCount)}
                    onNext={() => setDeckPage((value) => (value + 1) % deckPageCount)}
                  />
                )}
                {!isMobile && (
                  <UiText
                    position={[0, -contentAreaHeight * 0.52, 0.04]}
                    fontSize={0.14 * textScaleBoost}
                    lineHeight={1.25}
                    color="#9ec9ff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={contentWidth}
                  >
                    {`Synergies: ${renderTagSummary(activeCards)}`}
                  </UiText>
                )}
              </>
            )}

            {activeTab.screen === 'ship' && (
              isMobile ? (
                <>
                  <UiText position={[0, contentAreaHeight * 0.43, 0.04]} fontSize={0.18 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                    Ship and weapon systems
                  </UiText>
                  {shipCarouselCard && (
                    <group position={[0, contentAreaHeight * 0.18, 0.03]}>
                      <CardFrame card={shipCarouselCard} width={desktopReferenceCardWidth} height={desktopReferenceCardHeight} textScale={textScaleBoost} />
                    </group>
                  )}
                  <UiText
                    position={[0, -contentAreaHeight * 0.38, 0.04]}
                    fontSize={0.14 * textScaleBoost}
                    lineHeight={1.24}
                    color="#9ec9ff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={contentWidth}
                  >
                    {`Max Energy ${Math.round(weaponEnergyMax)}  •  Pods ${podCount}  •  Pod Weapon ${podWeaponMode}`}
                  </UiText>
                  {(isMobile || shipPageCount > 1) && (
                    <PageControls
                      page={shipPage}
                      pageCount={shipPageCount}
                      width={Math.min(contentWidth * 0.46, 3.2)}
                      y={-contentAreaHeight * 0.52}
                      textScale={textScaleBoost}
                      onPrev={() => setShipPage((value) => (value - 1 + shipPageCount) % shipPageCount)}
                      onNext={() => setShipPage((value) => (value + 1) % shipPageCount)}
                    />
                  )}
                </>
              ) : (
                <ShipStatsPanel
                  cardWidth={contentCardWidth}
                  cardHeight={contentCardHeight}
                  columns={contentColumns}
                  rows={contentRows}
                  gapX={contentGapX}
                  gapY={contentGapY}
                  weaponLevels={weaponLevels}
                  weaponEnergyMax={weaponEnergyMax}
                  podCount={podCount}
                  podWeaponMode={podWeaponMode}
                  textScale={textScaleBoost}
                  contentWidth={contentWidth}
                  contentAreaHeight={contentAreaHeight}
                />
              )
            )}
            {activeTab.screen !== 'shop' && activeTab.screen !== 'deck' && activeTab.screen !== 'ship' && (
              <UiText position={[0, 0, 0.04]} fontSize={0.22 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                {`${activeTab.label} screen is not configured yet.`}
              </UiText>
            )}
          </group>
        </Box>

        <Box width={panelWidth} height={activeSectionHeight} centerAnchor>
          <group>
            <UiText
              position={[0, isMobile ? activeAreaHeight * 0.42 : activeAreaHeight * 0.66, 0.03]}
              fontSize={0.18 * textScaleBoost}
              color="#9ec9ff"
              anchorX="center"
              anchorY="middle"
            >
              {`Active Cards ${activeCards.length}/${activeCardLimit}`}
            </UiText>
            {isMobile ? (
              <>
                {activeCarouselCard ? (
                  <group position={[0, activeAreaHeight * 0.08, 0.03]}>
                    <CardFrame card={activeCarouselCard} width={activeCarouselCardWidth} height={activeCarouselCardHeight} textScale={textScaleBoost} />
                    <ActionButton
                      label="Discard"
                      width={activeCarouselCardWidth * 0.48}
                      y={-activeCarouselCardHeight * 0.4}
                      onClick={() => onDiscardActiveCard(activeCarouselCard.id)}
                      color="#7d3f48"
                      textScale={textScaleBoost}
                    />
                  </group>
                ) : (
                  <UiText position={[0, 0, 0.04]} fontSize={0.2 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                    No active cards.
                  </UiText>
                )}
                {(isMobile || activePageCount > 1) && (
                  <PageControls
                    page={activePage}
                    pageCount={activePageCount}
                    width={Math.min(contentWidth * 0.44, 2.8)}
                    y={-activeAreaHeight * 0.34}
                    textScale={textScaleBoost}
                    onPrev={() => setActivePage((value) => (value - 1 + activePageCount) % activePageCount)}
                    onNext={() => setActivePage((value) => (value + 1) % activePageCount)}
                  />
                )}
              </>
            ) : (
              <ActiveCardGrid
                cards={activeCards}
                cardWidth={activeCardWidth}
                cardHeight={activeCardHeight}
                columns={contentColumns}
                rows={contentRows}
                gapX={activeGapX}
                gapY={activeGapY}
                textScale={textScaleBoost}
                onDiscardActiveCard={onDiscardActiveCard}
                activeCardLimit={activeCardLimit}
              />
            )}
          </group>
        </Box>

        <Box width={panelWidth} height={startSectionHeight} centerAnchor>
          <ActionButton label="Start Round" width={startButtonWidth} onClick={onContinue} color="#2b8c56" textScale={textScaleBoost} />
        </Box>
      </Flex>
    </group>
  );
}

function Backdrop({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, 0, -0.1]} renderOrder={1400}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#020714" transparent opacity={0.7} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function PanelFrame({ width, height }: { width: number; height: number }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.008;
    groupRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} renderOrder={1401}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#061425" transparent opacity={0.92} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]} renderOrder={1402}>
        <planeGeometry args={[width * 0.99, height * 0.985]} />
        <meshBasicMaterial color="#0b2340" transparent opacity={0.45} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]} renderOrder={1403}>
        <planeGeometry args={[width * 0.995, height * 0.995]} />
        <meshBasicMaterial color="#80beff" transparent opacity={0.08} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CardGrid({
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

function InteractiveCard({
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

function CardFrame({
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
  const mobileCardTextScale = size.width <= MOBILE_TEXT_BREAKPOINT_PX ? 0.5 : 1;
  const iconSize = Math.max(0.16, height * 0.055 * textScale * mobileCardTextScale);
  const titleSize = Math.max(0.19, height * 0.06 * textScale * mobileCardTextScale);
  const bodySize = Math.max(0.145, height * 0.043 * textScale * mobileCardTextScale);

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

function ActiveCardGrid({
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

function TabsRow({
  tabs,
  contentWidth,
  tabArrowWidth,
  tabButtonWidth,
  tabGap,
  activeTabId,
  textScale,
  onCycleTab,
  onSelectTab
}: TabsRowProps) {
  const rowHeight = Math.max(computeActionButtonHeight(tabArrowWidth), computeActionButtonHeight(tabButtonWidth, textScale));

  return (
    <group>
      <Flex size={[contentWidth, rowHeight, 0]} position={[-contentWidth / 2, rowHeight / 2, 0]} flexDirection="row" alignItems="center" justifyContent="center">
        <Box width={tabArrowWidth} height={rowHeight} mr={tabGap} centerAnchor>
          <ActionButton label="<" width={tabArrowWidth} onClick={() => onCycleTab(-1)} color="#2d587f" textScale={textScale} />
        </Box>
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <Box key={tab.id} width={tabButtonWidth} height={rowHeight} mr={tabGap} centerAnchor>
              <ActionButton
                label={tab.label}
                width={tabButtonWidth}
                onClick={() => onSelectTab(tab.id)}
                color={active ? '#3b8fcb' : '#1f3e5a'}
                textScale={textScale}
              />
            </Box>
          );
        })}
        <Box width={tabArrowWidth} height={rowHeight} centerAnchor>
          <ActionButton label=">" width={tabArrowWidth} onClick={() => onCycleTab(1)} color="#2d587f" textScale={textScale} />
        </Box>
      </Flex>
    </group>
  );
}

function PageControls({ page, pageCount, width, y, textScale, onPrev, onNext }: PageControlsProps) {
  const gap = 0.18;
  const buttonWidth = width * 0.38;
  const buttonHeight = computeActionButtonHeight(buttonWidth, textScale);
  const rowWidth = buttonWidth * 2 + gap;
  const hasMultiplePages = pageCount > 1;

  return (
    <group position={[0, y, 0.04]}>
      <Flex size={[rowWidth, buttonHeight, 0]} position={[-rowWidth / 2, buttonHeight / 2, 0]} flexDirection="row" alignItems="center">
        <Box width={buttonWidth} height={buttonHeight} mr={gap} centerAnchor>
          <ActionButton label="<" width={buttonWidth} onClick={onPrev} color="#244866" textScale={textScale} disabled={!hasMultiplePages} />
        </Box>
        <Box width={buttonWidth} height={buttonHeight} centerAnchor>
          <ActionButton label=">" width={buttonWidth} onClick={onNext} color="#244866" textScale={textScale} disabled={!hasMultiplePages} />
        </Box>
      </Flex>
      <UiText position={[0, -buttonHeight * 0.95, 0.02]} fontSize={0.12 * textScale} color="#9ec9ff" anchorX="center" anchorY="middle">
        {`Page ${page + 1}/${pageCount}`}
      </UiText>
    </group>
  );
}

function computeActionButtonHeight(width: number, textScale = 1): number {
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  return clamp(labelSize * 2.2, 0.34, 0.5);
}

function ActionButton({ label, width, disabled = false, onClick, color = '#355f89', x = 0, y = 0, textScale = 1 }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  const buttonHeight = computeActionButtonHeight(width, textScale);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const targetScale = hovered && !disabled ? 1.06 : 1;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.2;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.2;
  });

  return (
    <group position={[x, y, 0]}>
      <mesh
        ref={meshRef}
        renderOrder={1500}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (!disabled) {
            onClick();
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      >
        <planeGeometry args={[width, buttonHeight]} />
        <meshBasicMaterial
          color={disabled ? '#2c3642' : color}
          transparent
          opacity={disabled ? 0.58 : 0.9}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <UiText position={[0, 0, 0.02]} fontSize={labelSize} color={disabled ? '#8fa2b3' : '#e7f4ff'} anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
        {label}
      </UiText>
    </group>
  );
}

function ShipStatsPanel({
  cardWidth,
  cardHeight,
  columns,
  rows,
  gapX,
  gapY,
  weaponLevels,
  weaponEnergyMax,
  podCount,
  podWeaponMode,
  textScale,
  contentWidth,
  contentAreaHeight
}: {
  cardWidth: number;
  cardHeight: number;
  columns: number;
  rows: number;
  gapX: number;
  gapY: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  weaponEnergyMax: number;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
  textScale: number;
  contentWidth: number;
  contentAreaHeight: number;
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
      <UiText position={[0, contentAreaHeight * 0.43, 0.04]} fontSize={0.18 * textScale} color="#b8d9ff" anchorX="center" anchorY="middle">
        Ship and weapon systems
      </UiText>
      <Flex size={[gridWidth, gridHeight, 0]} position={[-gridWidth / 2, gridHeight / 2, 0.03]} flexDirection="row" flexWrap="wrap">
        {cards.map((card, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const rightGap = col < columns - 1 ? gapX : 0;
          const bottomGap = row < rows - 1 ? gapY : 0;
          return (
            <Box key={card.id} width={cardWidth} height={cardHeight} mr={rightGap} mb={bottomGap} centerAnchor>
              <CardFrame card={card} width={cardWidth} height={cardHeight} textScale={textScale} />
            </Box>
          );
        })}
      </Flex>
      <UiText
        position={[0, -contentAreaHeight * 0.4, 0.04]}
        fontSize={0.14 * textScale}
        lineHeight={1.24}
        color="#9ec9ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={contentWidth}
      >
        {`Max Energy ${Math.round(weaponEnergyMax)}  •  Pods ${podCount}  •  Pod Weapon ${podWeaponMode}`}
      </UiText>
    </group>
  );
}

function renderTagSummary(activeCards: CardDefinition[]): string {
  if (activeCards.length === 0) {
    return 'No active tags yet.';
  }

  const counts = new Map<string, number>();
  for (const card of activeCards) {
    for (const tag of card.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return entries.map(([tag, count]) => `${tag} x${count}`).join(', ');
}

function cardIcon(card: Pick<CardDefinition, 'tags'>): string {
  for (const tag of TAG_PRIORITY) {
    if (card.tags.includes(tag)) {
      return TAG_ICON_BY_NAME[tag] ?? '[*]';
    }
  }

  for (const tag of card.tags) {
    if (TAG_ICON_BY_NAME[tag]) {
      return TAG_ICON_BY_NAME[tag];
    }
  }

  return '[ ]';
}

function cardColorByRarity(rarity: CardDefinition['rarity']): string {
  if (rarity === 'rare') {
    return '#7349b8';
  }
  if (rarity === 'uncommon') {
    return '#2f8f86';
  }
  return '#2b5f92';
}

function weaponShortLabel(mode: PlayerWeaponMode): string {
  if (mode === 'Auto Pulse') {
    return 'Pulse';
  }
  if (mode === 'Continuous Laser') {
    return 'Laser';
  }
  if (mode === 'Heavy Cannon') {
    return 'Cannon';
  }
  return 'Sine';
}

function weaponModeTag(mode: PlayerWeaponMode): string {
  if (mode === 'Auto Pulse') {
    return 'pulse';
  }
  if (mode === 'Continuous Laser') {
    return 'laser';
  }
  if (mode === 'Heavy Cannon') {
    return 'cannon';
  }
  return 'sine';
}

function resolveNextRoundDisplay(levelId: string, roundIndex: number, totalRounds: number): { level: number | string; round: number } {
  const levelMatch = levelId.match(/(\d+)$/);
  const parsedLevel = levelMatch ? Number(levelMatch[1]) : Number.NaN;
  const hasNumericLevel = Number.isFinite(parsedLevel);
  if (roundIndex >= totalRounds) {
    return {
      level: hasNumericLevel ? parsedLevel + 1 : levelId,
      round: 1
    };
  }
  return {
    level: hasNumericLevel ? parsedLevel : levelId,
    round: roundIndex + 1
  };
}
