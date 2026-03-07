import type { CardDefinition } from '../../../content/cards';
import type { Dispatch, SetStateAction } from 'react';
import { ACTIVE_LAYOUT_FRACTIONS } from './constants';
import { ActionButton, FractionColumn, MobileCarouselTrack, PageControls, SectionBackground, UiText } from './uiPrimitives';
import { ActiveCardGrid, CardFrame } from './cardComponents';
import { Box } from '../layout/FlexLayout';

interface ActiveCardsSectionProps {
  panelWidth: number;
  activeSectionHeight: number;
  contentWidth: number;
  textScaleBoost: number;
  isMobile: boolean;
  activeCards: CardDefinition[];
  activeCardLimit: number;
  activePage: number;
  activePageCount: number;
  setActivePage: Dispatch<SetStateAction<number>>;
  activeCarouselCardWidth: number;
  activeCarouselCardHeight: number;
  mobileActiveCarouselGap: number;
  activeCardWidth: number;
  activeCardHeight: number;
  contentColumns: number;
  contentRows: number;
  activeGapX: number;
  activeGapY: number;
  onDiscardActiveCard: (cardId: string) => void;
}

export function ActiveCardsSection({
  panelWidth,
  activeSectionHeight,
  contentWidth,
  textScaleBoost,
  isMobile,
  activeCards,
  activeCardLimit,
  activePage,
  activePageCount,
  setActivePage,
  activeCarouselCardWidth,
  activeCarouselCardHeight,
  mobileActiveCarouselGap,
  activeCardWidth,
  activeCardHeight,
  contentColumns,
  contentRows,
  activeGapX,
  activeGapY,
  onDiscardActiveCard
}: ActiveCardsSectionProps) {
  return (
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
  );
}
