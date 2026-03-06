import type { BetweenRoundsTab } from './types';

export const BETWEEN_ROUND_TABS: BetweenRoundsTab[] = [
  { id: 'shop', label: 'Shop', screen: 'shop' },
  { id: 'deck', label: 'Deck', screen: 'deck' },
  { id: 'ship', label: 'Ship', screen: 'ship' }
];

export const SHOP_TAB_ID = 'shop';
export const DECK_TAB_ID = 'deck';
export const FOUND_DECK_LIMIT = 12;
export const MIN_MOBILE_TEXT_PX = 16;
export const MOBILE_TEXT_BREAKPOINT_PX = 900;
export const CARD_ASPECT_RATIO = 1.45;
export const MOBILE_CARD_HEIGHT_RATIO = 1;

export const BETWEEN_ROUNDS_SECTION_RATIO_DESKTOP = {
  title: 0.1,
  tabs: 0.1,
  content: 0.35,
  active: 0.35,
  action: 0.1
} as const;

export const BETWEEN_ROUNDS_SECTION_RATIO_MOBILE = {
  title: 0.05,
  tabs: 0.06,
  content: 0.395,
  active: 0.395,
  action: 0.1
} as const;

export const CONTENT_LAYOUT_FRACTIONS = {
  header: 0.14,
  notice: 0.1,
  cards: 0.58,
  footer: 0.18
} as const;

export const ACTIVE_LAYOUT_FRACTIONS = {
  header: 0.18,
  cards: 0.62,
  footer: 0.2
} as const;
