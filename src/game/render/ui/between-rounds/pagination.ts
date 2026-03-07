export interface BetweenRoundsPageCounts {
  deckPageCount: number;
  shopPageCount: number;
  activePageCount: number;
  shipPageCount: number;
}

export function stepCarouselPage(current: number, direction: -1 | 1, pageCount: number): number {
  if (pageCount <= 1) {
    return 0;
  }
  const next = current + direction;
  if (next < 0) {
    return 0;
  }
  if (next > pageCount - 1) {
    return pageCount - 1;
  }
  return next;
}

export function computeBetweenRoundsPageCounts(args: {
  isMobile: boolean;
  foundCardsCount: number;
  shopCardsCount: number;
  activeCardsCount: number;
  shipCardsCount: number;
  deckCardsPerPage: number;
  shopCardsPerPage: number;
  shipCardsPerPage: number;
  activeCardsPerPage: number;
}): BetweenRoundsPageCounts {
  const {
    isMobile,
    foundCardsCount,
    shopCardsCount,
    activeCardsCount,
    shipCardsCount,
    deckCardsPerPage,
    shopCardsPerPage,
    shipCardsPerPage,
    activeCardsPerPage
  } = args;

  const slidingPageCount = (count: number, perPage: number) => Math.max(1, count - Math.max(1, perPage) + 1);

  return {
    deckPageCount: isMobile ? Math.max(1, foundCardsCount) : slidingPageCount(foundCardsCount, deckCardsPerPage),
    shopPageCount: isMobile ? Math.max(1, shopCardsCount) : slidingPageCount(shopCardsCount, shopCardsPerPage),
    activePageCount: isMobile ? Math.max(1, activeCardsCount) : slidingPageCount(activeCardsCount, activeCardsPerPage),
    shipPageCount: isMobile ? Math.max(1, shipCardsCount) : slidingPageCount(shipCardsCount, shipCardsPerPage)
  };
}
