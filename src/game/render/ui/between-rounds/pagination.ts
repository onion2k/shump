export interface BetweenRoundsPageCounts {
  deckPageCount: number;
  shopPageCount: number;
  activePageCount: number;
  shipPageCount: number;
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
