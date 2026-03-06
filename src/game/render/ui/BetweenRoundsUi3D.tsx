import { useEffect, useMemo, useState } from 'react';
import { Box, Flex } from './layout/FlexLayout';
import type { CardDefinition } from '../../content/cards';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { PLAYER_WEAPON_ORDER, getPlayerWeaponMaxLevel, type PlayerWeaponMode } from '../../weapons/playerWeapons';
import {
  ACTIVE_LAYOUT_FRACTIONS,
  BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP,
  BETWEEN_ROUNDS_SECTION_RATIO_MOBILE,
  BETWEEN_ROUND_TABS,
  CARD_ASPECT_RATIO,
  CONTENT_LAYOUT_FRACTIONS,
  MOBILE_CARD_HEIGHT_RATIO,
  MOBILE_TEXT_BREAKPOINT_PX,
  SHOP_TAB_ID
} from './between-rounds/constants';
import { type CardRenderModel } from './between-rounds/types';
import {
  ActionButton,
  Backdrop,
  FractionColumn,
  MobileCarouselTrack,
  PageControls,
  PanelFrame,
  SectionBackground,
  TabsRow,
  UiText
} from './between-rounds/uiPrimitives';
import { ActiveCardGrid, CardFrame, CardGrid, InteractiveCard, ShipStatsPanel } from './between-rounds/cardComponents';
import { renderTagSummary, resolveNextRoundDisplay, weaponModeTag, weaponShortLabel } from './between-rounds/utils';
import { useThree } from '@react-three/fiber';

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
