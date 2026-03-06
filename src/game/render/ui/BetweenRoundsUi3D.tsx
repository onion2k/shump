import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
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
  height?: number;
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

interface MobileCarouselTrackProps<T> {
  items: T[];
  selectedIndex: number;
  cardWidth: number;
  cardHeight: number;
  trackWidth: number;
  gap: number;
  y?: number;
  renderItem: (item: T, index: number) => ReactNode;
}

interface FractionColumnSlot {
  id: string;
  fraction: number;
  content: ReactNode;
}

interface FractionColumnProps {
  width: number;
  height: number;
  slots: FractionColumnSlot[];
  z?: number;
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
const MOBILE_CARD_HEIGHT_RATIO = 1;
const BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP = {
  title: 0.1,
  tabs: 0.1,
  content: 0.35,
  active: 0.35,
  action: 0.1
} as const;

const BETWEEN_ROUNDS_SECTION_RATIO_MOBILE = {
  title: 0.05,
  tabs: 0.06,
  content: 0.395,
  active: 0.395,
  action: 0.1
} as const;
const CONTENT_LAYOUT_FRACTIONS = {
  header: 0.14,
  notice: 0.1,
  cards: 0.58,
  footer: 0.18
} as const;
const ACTIVE_LAYOUT_FRACTIONS = {
  header: 0.18,
  cards: 0.62,
  footer: 0.2
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
  const sectionRatio = isMobile ? BETWEEN_ROUNDS_SECTION_RATIO_MOBILE : BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP;

  const sidePadding = panelWidth * (isMobile ? 0.07 : 0.06);
  const contentWidth = panelWidth - sidePadding * 2;
  const contentColumns = isMobile ? 2 : 4;
  const contentRows = isMobile ? 2 : 1;
  const cardsPerPage = contentColumns * contentRows;
  const deckCardsPerPage = cardsPerPage;
  const shopCardsPerPage = cardsPerPage;

  const tabArrowWidth = clamp(panelWidth * 0.1, 0.62, 0.92);
  const tabGap = clamp(contentWidth * 0.016, 0.1, 0.18);
  const tabTrackWidth = contentWidth - tabArrowWidth * 2 - tabGap * 2;
  const tabButtonWidth = Math.max(0.7, (tabTrackWidth - tabGap * Math.max(0, BETWEEN_ROUND_TABS.length - 1)) / Math.max(1, BETWEEN_ROUND_TABS.length));
  const startButtonWidth = Math.min(contentWidth, 7);
  const titleSectionHeight = panelHeight * sectionRatio.title;
  const tabSectionHeight = panelHeight * sectionRatio.tabs;
  const contentSectionHeight = panelHeight * sectionRatio.content;
  const activeSectionHeight = panelHeight * sectionRatio.active;
  const startSectionHeight = panelHeight * sectionRatio.action;

  const contentAreaHeight = contentSectionHeight * CONTENT_LAYOUT_FRACTIONS.cards;
  const contentFooterHeight = contentSectionHeight * CONTENT_LAYOUT_FRACTIONS.footer;
  const contentGapX = contentColumns > 1 ? contentWidth * (isMobile ? 0.045 : 0.028) : 0;
  const contentGapY = contentRows > 1 ? contentAreaHeight * 0.075 : 0;
  const contentCardWidthFromWidth = (contentWidth - contentGapX * (contentColumns - 1)) / contentColumns;
  const contentCardHeightFromHeight = (contentAreaHeight - contentGapY * (contentRows - 1)) / contentRows;
  const contentCardHeight = Math.min(contentCardWidthFromWidth * CARD_ASPECT_RATIO, contentCardHeightFromHeight);
  const contentCardWidth = contentCardHeight / CARD_ASPECT_RATIO;
  const mobileContentCarouselCardHeight = Math.min(contentAreaHeight * MOBILE_CARD_HEIGHT_RATIO, contentWidth * CARD_ASPECT_RATIO);
  const mobileContentCarouselCardWidth = mobileContentCarouselCardHeight / CARD_ASPECT_RATIO;
  const mobileContentCarouselGap = mobileContentCarouselCardWidth * 0.1;

  const activeAreaHeight = activeSectionHeight * ACTIVE_LAYOUT_FRACTIONS.cards;
  const activeGapX = contentColumns > 1 ? contentWidth * (isMobile ? 0.05 : 0.03) : 0;
  const activeGapY = contentRows > 1 ? activeAreaHeight * 0.1 : 0;
  const activeCardWidthFromWidth = (contentWidth - activeGapX * (contentColumns - 1)) / contentColumns;
  const activeCardHeightFromHeight = (activeAreaHeight - activeGapY * (contentRows - 1)) / contentRows;
  const activeCardHeight = Math.min(activeCardWidthFromWidth * CARD_ASPECT_RATIO, activeCardHeightFromHeight);
  const activeCardWidth = activeCardHeight / CARD_ASPECT_RATIO;
  const mobileActiveCarouselCardHeight = Math.min(activeAreaHeight * MOBILE_CARD_HEIGHT_RATIO, contentWidth * CARD_ASPECT_RATIO);
  const mobileActiveCarouselCardWidth = mobileActiveCarouselCardHeight / CARD_ASPECT_RATIO;
  const mobileActiveCarouselGap = mobileActiveCarouselCardWidth * 0.1;
  const activeCarouselCardHeight = isMobile ? mobileActiveCarouselCardHeight : activeCardHeight;
  const activeCarouselCardWidth = isMobile ? mobileActiveCarouselCardWidth : activeCardWidth;

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

  const deckPageCount = isMobile ? Math.max(1, foundCards.length) : Math.max(1, Math.ceil(foundCards.length / deckCardsPerPage));
  const shopPageCount = isMobile ? Math.max(1, shopCards.length) : Math.max(1, Math.ceil(shopCards.length / shopCardsPerPage));
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

  const visibleDeckCards = isMobile
    ? foundCards
    : foundCards.slice(deckPage * deckCardsPerPage, deckPage * deckCardsPerPage + deckCardsPerPage);
  const visibleShopCards = isMobile
    ? shopCards
    : shopCards.slice(shopPage * shopCardsPerPage, shopPage * shopCardsPerPage + shopCardsPerPage);
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
            {activeTab.screen === 'shop' && (
              <FractionColumn
                width={contentWidth}
                height={contentSectionHeight}
                slots={[
                  {
                    id: 'shop-header',
                    fraction: CONTENT_LAYOUT_FRACTIONS.header,
                    content: (
                      <UiText position={[0, 0, 0.04]} fontSize={0.2 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                        Buy cards for the next round
                      </UiText>
                    )
                  },
                  {
                    id: 'shop-notice',
                    fraction: CONTENT_LAYOUT_FRACTIONS.notice,
                    content: foundDeckFull ? (
                      <UiText position={[0, 0, 0.04]} fontSize={0.17 * textScaleBoost} color="#ffbe9a" anchorX="center" anchorY="middle">
                        Deck is full. Discard cards before buying.
                      </UiText>
                    ) : null
                  },
                  {
                    id: 'shop-cards',
                    fraction: CONTENT_LAYOUT_FRACTIONS.cards,
                    content:
                      visibleShopCards.length === 0 ? (
                        <UiText position={[0, 0, 0.04]} fontSize={0.24 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                          No shop offers.
                        </UiText>
                      ) : isMobile ? (
                        <MobileCarouselTrack
                          items={visibleShopCards}
                          selectedIndex={shopPage}
                          cardWidth={mobileContentCarouselCardWidth}
                          cardHeight={mobileContentCarouselCardHeight}
                          trackWidth={contentWidth}
                          gap={mobileContentCarouselGap}
                          renderItem={(card) => (
                            <InteractiveCard
                              card={card}
                              width={mobileContentCarouselCardWidth}
                              height={mobileContentCarouselCardHeight}
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
                          )}
                        />
                      ) : (
                        <CardGrid
                          cards={visibleShopCards}
                          columns={contentColumns}
                          rows={contentRows}
                          cardWidth={contentCardWidth}
                          cardHeight={contentCardHeight}
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
                      )
                  },
                  {
                    id: 'shop-footer',
                    fraction: CONTENT_LAYOUT_FRACTIONS.footer,
                    content:
                      isMobile || shopPageCount > 1 ? (
                        <PageControls
                          page={shopPage}
                          pageCount={shopPageCount}
                          width={Math.min(contentWidth * 0.46, 3.2)}
                          y={0}
                          textScale={textScaleBoost}
                          onPrev={() => setShopPage((value) => (value - 1 + shopPageCount) % shopPageCount)}
                          onNext={() => setShopPage((value) => (value + 1) % shopPageCount)}
                        />
                      ) : null
                  }
                ]}
              />
            )}

            {activeTab.screen === 'deck' && (
              <FractionColumn
                width={contentWidth}
                height={contentSectionHeight}
                slots={[
                  {
                    id: 'deck-header',
                    fraction: CONTENT_LAYOUT_FRACTIONS.header,
                    content: (
                      <UiText position={[0, 0, 0.04]} fontSize={0.18 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                        Manage found cards: activate, use, or discard
                      </UiText>
                    )
                  },
                  {
                    id: 'deck-notice',
                    fraction: CONTENT_LAYOUT_FRACTIONS.notice,
                    content: null
                  },
                  {
                    id: 'deck-cards',
                    fraction: CONTENT_LAYOUT_FRACTIONS.cards,
                    content:
                      visibleDeckCards.length === 0 ? (
                        <UiText position={[0, 0, 0.04]} fontSize={0.24 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                          No cards found this round.
                        </UiText>
                      ) : isMobile ? (
                        <MobileCarouselTrack
                          items={visibleDeckCards}
                          selectedIndex={deckPage}
                          cardWidth={mobileContentCarouselCardWidth}
                          cardHeight={mobileContentCarouselCardHeight}
                          trackWidth={contentWidth}
                          gap={mobileContentCarouselGap}
                          renderItem={(card) => (
                            <InteractiveCard
                              card={card}
                              width={mobileContentCarouselCardWidth}
                              height={mobileContentCarouselCardHeight}
                              money={money}
                              activeCards={activeCards}
                              activeCardLimit={activeCardLimit}
                              shopMode={false}
                              textScale={textScaleBoost}
                              onActivateCard={onActivateCard}
                              onDiscardCard={onDiscardCard}
                              onBuyCard={onBuyCard}
                            />
                          )}
                        />
                      ) : (
                        <CardGrid
                          cards={visibleDeckCards}
                          columns={contentColumns}
                          rows={contentRows}
                          cardWidth={contentCardWidth}
                          cardHeight={contentCardHeight}
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
                      )
                  },
                  {
                    id: 'deck-footer',
                    fraction: CONTENT_LAYOUT_FRACTIONS.footer,
                    content: (
                      <FractionColumn
                        width={contentWidth}
                        height={contentFooterHeight}
                        slots={[
                          {
                            id: 'deck-footer-controls',
                            fraction: isMobile || deckPageCount > 1 ? 0.62 : 0,
                            content:
                              isMobile || deckPageCount > 1 ? (
                                <PageControls
                                  page={deckPage}
                                  pageCount={deckPageCount}
                                  width={Math.min(contentWidth * 0.46, 3.2)}
                                  y={0}
                                  textScale={textScaleBoost}
                                  onPrev={() => setDeckPage((value) => (value - 1 + deckPageCount) % deckPageCount)}
                                  onNext={() => setDeckPage((value) => (value + 1) % deckPageCount)}
                                />
                              ) : null
                          },
                          {
                            id: 'deck-footer-synergy',
                            fraction: !isMobile ? 0.38 : 0,
                            content: !isMobile ? (
                              <UiText
                                position={[0, 0, 0.04]}
                                fontSize={0.14 * textScaleBoost}
                                lineHeight={1.25}
                                color="#9ec9ff"
                                anchorX="center"
                                anchorY="middle"
                                maxWidth={contentWidth}
                              >
                                {`Synergies: ${renderTagSummary(activeCards)}`}
                              </UiText>
                            ) : null
                          }
                        ]}
                      />
                    )
                  }
                ]}
              />
            )}

            {activeTab.screen === 'ship' && (
              <FractionColumn
                width={contentWidth}
                height={contentSectionHeight}
                slots={[
                  {
                    id: 'ship-header',
                    fraction: CONTENT_LAYOUT_FRACTIONS.header,
                    content: (
                      <UiText position={[0, 0, 0.04]} fontSize={0.18 * textScaleBoost} color="#b8d9ff" anchorX="center" anchorY="middle">
                        Ship and weapon systems
                      </UiText>
                    )
                  },
                  {
                    id: 'ship-notice',
                    fraction: CONTENT_LAYOUT_FRACTIONS.notice,
                    content: null
                  },
                  {
                    id: 'ship-cards',
                    fraction: CONTENT_LAYOUT_FRACTIONS.cards,
                    content: isMobile ? (
                      <MobileCarouselTrack
                        items={shipCards}
                        selectedIndex={shipPage}
                        cardWidth={mobileContentCarouselCardWidth}
                        cardHeight={mobileContentCarouselCardHeight}
                        trackWidth={contentWidth}
                        gap={mobileContentCarouselGap}
                        renderItem={(card) => (
                          <CardFrame card={card} width={mobileContentCarouselCardWidth} height={mobileContentCarouselCardHeight} textScale={textScaleBoost} />
                        )}
                      />
                    ) : (
                      <ShipStatsPanel
                        cardWidth={contentCardWidth}
                        cardHeight={contentCardHeight}
                        columns={contentColumns}
                        rows={contentRows}
                        gapX={contentGapX}
                        gapY={contentGapY}
                        weaponLevels={weaponLevels}
                        textScale={textScaleBoost}
                      />
                    )
                  },
                  {
                    id: 'ship-footer',
                    fraction: CONTENT_LAYOUT_FRACTIONS.footer,
                    content: (
                      <FractionColumn
                        width={contentWidth}
                        height={contentFooterHeight}
                        slots={[
                          {
                            id: 'ship-footer-summary',
                            fraction: 0.56,
                            content: (
                              <UiText
                                position={[0, 0, 0.04]}
                                fontSize={0.14 * textScaleBoost}
                                lineHeight={1.24}
                                color="#9ec9ff"
                                anchorX="center"
                                anchorY="middle"
                                maxWidth={contentWidth}
                              >
                                {`Max Energy ${Math.round(weaponEnergyMax)}  •  Pods ${podCount}  •  Pod Weapon ${podWeaponMode}`}
                              </UiText>
                            )
                          },
                          {
                            id: 'ship-footer-controls',
                            fraction: isMobile || shipPageCount > 1 ? 0.44 : 0,
                            content:
                              isMobile || shipPageCount > 1 ? (
                                <PageControls
                                  page={shipPage}
                                  pageCount={shipPageCount}
                                  width={Math.min(contentWidth * 0.46, 3.2)}
                                  y={0}
                                  textScale={textScaleBoost}
                                  onPrev={() => setShipPage((value) => (value - 1 + shipPageCount) % shipPageCount)}
                                  onNext={() => setShipPage((value) => (value + 1) % shipPageCount)}
                                />
                              ) : null
                          }
                        ]}
                      />
                    )
                  }
                ]}
              />
            )}
            {activeTab.screen !== 'shop' && activeTab.screen !== 'deck' && activeTab.screen !== 'ship' && (
              <UiText position={[0, 0, 0.04]} fontSize={0.22 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                {`${activeTab.label} screen is not configured yet.`}
              </UiText>
            )}
          </group>
        </Box>

        <Box width={panelWidth} height={activeSectionHeight} centerAnchor>
          <SectionBackground width={panelWidth} height={activeSectionHeight} color="#c2255c" />
          <FractionColumn
            width={contentWidth}
            height={activeSectionHeight}
            slots={[
              {
                id: 'active-header',
                fraction: ACTIVE_LAYOUT_FRACTIONS.header,
                content: (
                  <UiText position={[0, 0, 0.03]} fontSize={0.18 * textScaleBoost} color="#9ec9ff" anchorX="center" anchorY="middle">
                    {`Active Cards ${activeCards.length}/${activeCardLimit}`}
                  </UiText>
                )
              },
              {
                id: 'active-cards',
                fraction: ACTIVE_LAYOUT_FRACTIONS.cards,
                content: isMobile ? (
                  activeCards.length > 0 ? (
                    <MobileCarouselTrack
                      items={activeCards}
                      selectedIndex={activePage}
                      cardWidth={activeCarouselCardWidth}
                      cardHeight={activeCarouselCardHeight}
                      trackWidth={contentWidth}
                      gap={mobileActiveCarouselGap}
                      renderItem={(card) => (
                        <>
                          <CardFrame card={card} width={activeCarouselCardWidth} height={activeCarouselCardHeight} textScale={textScaleBoost} />
                          <ActionButton
                            label="Discard"
                            width={activeCarouselCardWidth * 0.48}
                            y={-activeCarouselCardHeight * 0.4}
                            onClick={() => onDiscardActiveCard(card.id)}
                            color="#7d3f48"
                            textScale={textScaleBoost}
                          />
                        </>
                      )}
                    />
                  ) : (
                    <UiText position={[0, 0, 0.04]} fontSize={0.2 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
                      No active cards.
                    </UiText>
                  )
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
                )
              },
              {
                id: 'active-footer',
                fraction: ACTIVE_LAYOUT_FRACTIONS.footer,
                content:
                  isMobile || activePageCount > 1 ? (
                    <PageControls
                      page={activePage}
                      pageCount={activePageCount}
                      width={Math.min(contentWidth * 0.44, 2.8)}
                      y={0}
                      textScale={textScaleBoost}
                      onPrev={() => setActivePage((value) => (value - 1 + activePageCount) % activePageCount)}
                      onNext={() => setActivePage((value) => (value + 1) % activePageCount)}
                    />
                  ) : null
              }
            ]}
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

function SectionBackground({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <mesh position={[0, 0, -0.01]} renderOrder={1410}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
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

function FractionColumn({ width, height, slots, z = 0 }: FractionColumnProps) {
  const visibleSlots = slots.filter((slot) => slot.fraction > 0);
  const totalFraction = visibleSlots.reduce((sum, slot) => sum + slot.fraction, 0) || 1;

  return (
    <Flex size={[width, height, 0]} position={[-width / 2, height / 2, z]} flexDirection="column">
      {visibleSlots.map((slot) => (
        <Box key={slot.id} width={width} height={(height * slot.fraction) / totalFraction} centerAnchor>
          {slot.content}
        </Box>
      ))}
    </Flex>
  );
}

function PageControls({ page, pageCount, width, y, textScale, onPrev, onNext }: PageControlsProps) {
  const gap = 0.18;
  const buttonSize = clamp(width * 0.34, 0.4, 0.56);
  const rowWidth = buttonSize * 2 + gap;
  const hasMultiplePages = pageCount > 1;

  return (
    <group position={[0, y, 0.04]}>
      <Flex size={[rowWidth, buttonSize, 0]} position={[-rowWidth / 2, buttonSize / 2, 0]} flexDirection="row" alignItems="center">
        <Box width={buttonSize} height={buttonSize} mr={gap} centerAnchor>
          <ActionButton
            label="<"
            width={buttonSize}
            height={buttonSize}
            onClick={onPrev}
            color="#244866"
            textScale={textScale}
            disabled={!hasMultiplePages}
          />
        </Box>
        <Box width={buttonSize} height={buttonSize} centerAnchor>
          <ActionButton
            label=">"
            width={buttonSize}
            height={buttonSize}
            onClick={onNext}
            color="#244866"
            textScale={textScale}
            disabled={!hasMultiplePages}
          />
        </Box>
      </Flex>
      <UiText position={[0, -buttonSize * 0.95, 0.02]} fontSize={0.12 * textScale} color="#9ec9ff" anchorX="center" anchorY="middle">
        {`Page ${page + 1}/${pageCount}`}
      </UiText>
    </group>
  );
}

function MobileCarouselTrack<T>({
  items,
  selectedIndex,
  cardWidth,
  cardHeight,
  trackWidth,
  gap,
  y = 0,
  renderItem
}: MobileCarouselTrackProps<T>) {
  const trackRef = useRef<Group>(null);
  const animatedOffsetRef = useRef(0);
  const step = cardWidth + gap;
  const startX = -((Math.max(0, items.length - 1) * step) / 2);
  const clampedIndex = clamp(selectedIndex, 0, Math.max(0, items.length - 1));
  const targetOffset = items.length > 0 ? -(startX + clampedIndex * step) : 0;

  useFrame(() => {
    if (!trackRef.current) {
      return;
    }
    animatedOffsetRef.current += (targetOffset - animatedOffsetRef.current) * 0.18;
    trackRef.current.position.x = animatedOffsetRef.current;
  });

  return (
    <group position={[0, y, 0.03]}>
      <group ref={trackRef}>
        {items.map((item, index) => (
          <group key={`carousel-item-${index}`} position={[startX + index * step, 0, 0.03]}>
            {renderItem(item, index)}
          </group>
        ))}
      </group>
      <CarouselEdgeFade width={trackWidth} height={cardHeight} />
    </group>
  );
}

function CarouselEdgeFade({ width, height }: { width: number; height: number }) {
  const stripCount = 6;
  const stripWidth = width * 0.035;
  const edgeInset = stripWidth * 0.5;

  return (
    <group position={[0, 0, 0.22]}>
      {Array.from({ length: stripCount }).map((_, index) => {
        const t = (index + 1) / stripCount;
        const opacity = 0.04 + t * 0.12;
        const leftX = -width / 2 + edgeInset + index * stripWidth;
        const rightX = width / 2 - edgeInset - index * stripWidth;
        return (
          <group key={`fade-${index}`}>
            <mesh position={[leftX, 0, 0]} renderOrder={1700}>
              <planeGeometry args={[stripWidth, height]} />
              <meshBasicMaterial color="#061425" transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[rightX, 0, 0]} renderOrder={1700}>
              <planeGeometry args={[stripWidth, height]} />
              <meshBasicMaterial color="#061425" transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function computeActionButtonHeight(width: number, textScale = 1): number {
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  return clamp(labelSize * 2.2, 0.34, 0.5);
}

function ActionButton({ label, width, height, disabled = false, onClick, color = '#355f89', x = 0, y = 0, textScale = 1 }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  const buttonHeight = height ?? computeActionButtonHeight(width, textScale);

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
  textScale
}: {
  cardWidth: number;
  cardHeight: number;
  columns: number;
  rows: number;
  gapX: number;
  gapY: number;
  weaponLevels: Record<PlayerWeaponMode, number>;
  textScale: number;
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
              <CardFrame card={card} width={cardWidth} height={cardHeight} textScale={textScale} />
            </Box>
          );
        })}
      </Flex>
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
