import { clamp } from '../../../util/math';
import {
  ACTIVE_LAYOUT_FRACTIONS,
  BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP,
  BETWEEN_ROUNDS_SECTION_RATIO_MOBILE,
  BETWEEN_ROUND_TABS,
  CARD_ASPECT_RATIO,
  CONTENT_LAYOUT_FRACTIONS,
  MOBILE_CARD_HEIGHT_RATIO
} from './constants';

export interface BetweenRoundsLayout {
  scale: number;
  textScaleBoost: number;
  panelWidth: number;
  panelHeight: number;
  sidePadding: number;
  contentWidth: number;
  contentColumns: number;
  contentRows: number;
  cardsPerPage: number;
  tabArrowWidth: number;
  tabGap: number;
  tabTrackWidth: number;
  tabButtonWidth: number;
  startButtonWidth: number;
  titleSectionHeight: number;
  tabSectionHeight: number;
  contentSectionHeight: number;
  activeSectionHeight: number;
  startSectionHeight: number;
  contentAreaHeight: number;
  contentFooterHeight: number;
  contentGapX: number;
  contentGapY: number;
  contentCardWidth: number;
  contentCardHeight: number;
  mobileContentCarouselCardHeight: number;
  mobileContentCarouselCardWidth: number;
  mobileContentCarouselGap: number;
  activeGapX: number;
  activeGapY: number;
  activeCardWidth: number;
  activeCardHeight: number;
  mobileActiveCarouselCardHeight: number;
  mobileActiveCarouselCardWidth: number;
  mobileActiveCarouselGap: number;
  activeCarouselCardHeight: number;
  activeCarouselCardWidth: number;
}

export function computeBetweenRoundsLayout(viewportWidth: number, viewportHeight: number, isMobile: boolean): BetweenRoundsLayout {
  const scale = clamp(viewportWidth / 16, 0.65, 1);
  const textScaleBoost = viewportWidth < 8.5 ? 1.15 : viewportWidth < 11 ? 1.1 : 1;
  const panelWidth = isMobile ? viewportWidth * 0.96 : Math.max(6, viewportWidth * 0.78);
  const panelHeight = isMobile ? viewportHeight * 0.94 : Math.max(4.4, viewportHeight * 0.8);
  const sectionRatio = isMobile ? BETWEEN_ROUNDS_SECTION_RATIO_MOBILE : BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP;

  const sidePadding = panelWidth * (isMobile ? 0.07 : 0.06);
  const contentWidth = panelWidth - sidePadding * 2;
  const contentColumns = isMobile ? 2 : 4;
  const contentRows = isMobile ? 2 : 1;
  const cardsPerPage = contentColumns * contentRows;

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

  return {
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
    tabTrackWidth,
    tabButtonWidth,
    startButtonWidth,
    titleSectionHeight,
    tabSectionHeight,
    contentSectionHeight,
    activeSectionHeight,
    startSectionHeight,
    contentAreaHeight,
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
    mobileActiveCarouselCardHeight,
    mobileActiveCarouselCardWidth,
    mobileActiveCarouselGap,
    activeCarouselCardHeight,
    activeCarouselCardWidth
  };
}
