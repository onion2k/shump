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
}): BetweenRoundsPageCounts {
  const {
    isMobile,
    foundCardsCount,
    shopCardsCount,
    activeCardsCount,
    shipCardsCount,
    deckCardsPerPage,
    shopCardsPerPage
  } = args;

  return {
    deckPageCount: isMobile ? Math.max(1, foundCardsCount) : Math.max(1, Math.ceil(foundCardsCount / deckCardsPerPage)),
    shopPageCount: isMobile ? Math.max(1, shopCardsCount) : Math.max(1, Math.ceil(shopCardsCount / shopCardsPerPage)),
    activePageCount: Math.max(1, activeCardsCount),
    shipPageCount: Math.max(1, shipCardsCount)
  };
}
