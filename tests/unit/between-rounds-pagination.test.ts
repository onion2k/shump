import { describe, expect, it } from 'vitest';
import { computeBetweenRoundsPageCounts, stepCarouselPage } from '../../src/game/render/ui/between-rounds/pagination';

describe('between rounds pagination', () => {
  it('steps by one and clamps at both ends', () => {
    expect(stepCarouselPage(0, -1, 5)).toBe(0);
    expect(stepCarouselPage(0, 1, 5)).toBe(1);
    expect(stepCarouselPage(3, 1, 5)).toBe(4);
    expect(stepCarouselPage(4, 1, 5)).toBe(4);
    expect(stepCarouselPage(4, -1, 5)).toBe(3);
    expect(stepCarouselPage(0, 1, 1)).toBe(0);
  });

  it('computes sliding desktop page counts and per-card mobile counts', () => {
    const desktop = computeBetweenRoundsPageCounts({
      isMobile: false,
      foundCardsCount: 10,
      shopCardsCount: 8,
      activeCardsCount: 6,
      shipCardsCount: 12,
      deckCardsPerPage: 4,
      shopCardsPerPage: 4,
      shipCardsPerPage: 4,
      activeCardsPerPage: 4
    });
    expect(desktop.deckPageCount).toBe(7);
    expect(desktop.shopPageCount).toBe(5);
    expect(desktop.activePageCount).toBe(3);
    expect(desktop.shipPageCount).toBe(9);

    const mobile = computeBetweenRoundsPageCounts({
      isMobile: true,
      foundCardsCount: 10,
      shopCardsCount: 8,
      activeCardsCount: 6,
      shipCardsCount: 12,
      deckCardsPerPage: 4,
      shopCardsPerPage: 4,
      shipCardsPerPage: 4,
      activeCardsPerPage: 4
    });
    expect(mobile.deckPageCount).toBe(10);
    expect(mobile.shopPageCount).toBe(8);
    expect(mobile.activePageCount).toBe(6);
    expect(mobile.shipPageCount).toBe(12);
  });
});
