import type { Dispatch, SetStateAction } from 'react';
import type { CardDefinition } from '../../../content/cards';
import type { CardRenderModel } from './types';
import { CONTENT_LAYOUT_FRACTIONS } from './constants';
import {
  FractionColumn,
  MobileCarouselTrack,
  PageControls,
  UiText
} from './uiPrimitives';
import {
  CardGrid,
  InteractiveCard,
  ShipLoadoutCard,
  ShipStatsPanel
} from './cardComponents';
import { renderTagSummary } from './utils';
import { getPlayerWeaponMinimumLevel, type PlayerWeaponMode } from '../../../weapons/playerWeapons';

interface BetweenRoundsTabContentProps {
  activeTab: { screen: string; label: string };
  contentWidth: number;
  contentSectionHeight: number;
  contentFooterHeight: number;
  contentColumns: number;
  contentRows: number;
  contentCardWidth: number;
  contentCardHeight: number;
  contentGapX: number;
  contentGapY: number;
  mobileContentCarouselCardWidth: number;
  mobileContentCarouselCardHeight: number;
  mobileContentCarouselGap: number;
  isMobile: boolean;
  textScaleBoost: number;
  foundDeckFull: boolean;
  money: number;
  activeCards: CardDefinition[];
  activeCardLimit: number;
  visibleShopCards: CardDefinition[];
  visibleDeckCards: CardDefinition[];
  shipCards: CardRenderModel[];
  weaponLevels: Record<PlayerWeaponMode, number>;
  weaponEnergyMax: number;
  podCount: number;
  podWeaponMode: 'Auto Pulse' | 'Homing Missile';
  selectedPrimaryWeapon: PlayerWeaponMode;
  shopPage: number;
  shopPageCount: number;
  setShopPage: Dispatch<SetStateAction<number>>;
  deckPage: number;
  deckPageCount: number;
  setDeckPage: Dispatch<SetStateAction<number>>;
  shipPage: number;
  shipPageCount: number;
  setShipPage: Dispatch<SetStateAction<number>>;
  onSelectPrimaryWeapon: (mode: PlayerWeaponMode) => void;
  onActivateCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onBuyCard: (cardId: string) => void;
}

export function BetweenRoundsTabContent({
  activeTab,
  contentWidth,
  contentSectionHeight,
  contentFooterHeight,
  contentColumns,
  contentRows,
  contentCardWidth,
  contentCardHeight,
  contentGapX,
  contentGapY,
  mobileContentCarouselCardWidth,
  mobileContentCarouselCardHeight,
  mobileContentCarouselGap,
  isMobile,
  textScaleBoost,
  foundDeckFull,
  money,
  activeCards,
  activeCardLimit,
  visibleShopCards,
  visibleDeckCards,
  shipCards,
  weaponLevels,
  weaponEnergyMax,
  podCount,
  podWeaponMode,
  selectedPrimaryWeapon,
  shopPage,
  shopPageCount,
  setShopPage,
  deckPage,
  deckPageCount,
  setDeckPage,
  shipPage,
  shipPageCount,
  setShipPage,
  onSelectPrimaryWeapon,
  onActivateCard,
  onDiscardCard,
  onBuyCard
}: BetweenRoundsTabContentProps) {
  if (activeTab.screen === 'shop') {
    return (
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
    );
  }

  if (activeTab.screen === 'deck') {
    return (
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
    );
  }

  if (activeTab.screen === 'ship') {
    return (
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
                renderItem={(card) => {
                  const mode = card.id.replace('ship-', '') as PlayerWeaponMode;
                  const level = weaponLevels[mode] ?? getPlayerWeaponMinimumLevel(mode);
                  return (
                  <ShipLoadoutCard
                    card={card}
                    weaponMode={mode}
                    width={mobileContentCarouselCardWidth}
                    height={mobileContentCarouselCardHeight}
                    textScale={textScaleBoost}
                    selected={selectedPrimaryWeapon === mode}
                    selectable={level >= 1}
                    onSelect={onSelectPrimaryWeapon}
                  />
                  );
                }}
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
                selectedPrimaryWeapon={selectedPrimaryWeapon}
                onSelectPrimaryWeapon={onSelectPrimaryWeapon}
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
                        {`Primary ${selectedPrimaryWeapon}  •  Max Energy ${Math.round(weaponEnergyMax)}  •  Pods ${podCount}  •  Pod Weapon ${podWeaponMode}`}
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
    );
  }

  return (
    <UiText position={[0, 0, 0.04]} fontSize={0.22 * textScaleBoost} color="#d8ebff" anchorX="center" anchorY="middle">
      {`${activeTab.label} screen is not configured yet.`}
    </UiText>
  );
}
