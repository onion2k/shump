import { describe, expect, it } from 'vitest';
import { canAcquireCard, countCardCopies, drawDropCard, drawShopOffers } from '../../src/game/content/cards';

describe('card content model', () => {
  it('counts copies across found, active, and consumed piles', () => {
    const copies = countCardCopies(
      'reinforced-hull',
      ['reinforced-hull'],
      ['reinforced-hull', 'pulse-overclock'],
      ['reinforced-hull']
    );
    expect(copies).toBe(3);
  });

  it('respects max stack constraints', () => {
    expect(canAcquireCard('reinforced-hull', ['reinforced-hull'], [], ['reinforced-hull'])).toBe(false);
    expect(canAcquireCard('pulse-overclock', ['pulse-overclock'], ['pulse-overclock'])).toBe(false);
  });

  it('draws deterministic weighted shop offers and drops for same context', () => {
    const context = {
      seed: 12345,
      roundIndex: 3,
      foundCards: [] as string[],
      activeCards: [] as string[]
    };
    const firstOffers = drawShopOffers(context, 3).map((card) => card.id);
    const secondOffers = drawShopOffers(context, 3).map((card) => card.id);
    expect(firstOffers).toEqual(secondOffers);

    const firstDrop = drawDropCard(context, 7)?.id;
    const secondDrop = drawDropCard(context, 7)?.id;
    expect(firstDrop).toBe(secondDrop);
  });
});
