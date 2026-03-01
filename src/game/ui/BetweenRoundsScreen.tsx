import type { CardDefinition } from '../content/cards';

interface BetweenRoundsScreenProps {
  levelId: string;
  roundIndex: number;
  totalRounds: number;
  activeCardLimit: number;
  money: number;
  foundCards: CardDefinition[];
  activeCards: CardDefinition[];
  shopCards: CardDefinition[];
  onActivateCard: (cardId: string, replaceCardId?: string) => void;
  onOpenShop: () => void;
  onCloseShop: () => void;
  onBuyCard: (cardId: string) => void;
  onContinue: () => void;
  shopOpen: boolean;
}

export function BetweenRoundsScreen({
  levelId,
  roundIndex,
  totalRounds,
  activeCardLimit,
  money,
  foundCards,
  activeCards,
  shopCards,
  onActivateCard,
  onOpenShop,
  onCloseShop,
  onBuyCard,
  onContinue,
  shopOpen
}: BetweenRoundsScreenProps) {
  return (
    <div className="overlay" role="dialog" aria-label="between-rounds-screen">
      <h2>{shopOpen ? 'Card Shop' : 'Between Rounds'}</h2>
      <p>{`Level ${levelId} • Round ${roundIndex}/${totalRounds}`}</p>
      <p>{`Money: ${money}`}</p>

      {shopOpen ? (
        <>
          <div className="overlay-grid">
            {shopCards.map((card) => (
              <div key={card.id} className="overlay-card">
                <h3>{card.name}</h3>
                <p>{card.description}</p>
                <p>{`Cost: ${card.cost}`}</p>
                <button type="button" disabled={money < card.cost} onClick={() => onBuyCard(card.id)}>
                  Buy
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={onCloseShop}>
            Back
          </button>
        </>
      ) : (
        <>
          <h3>Found Cards</h3>
          {foundCards.length === 0 ? (
            <p>No cards found this round.</p>
          ) : (
            <div className="overlay-grid">
              {foundCards.map((card) => (
                <div key={card.id} className="overlay-card">
                  <h3>{card.name}</h3>
                  <p>{card.description}</p>
                  <p>{`Rarity: ${card.rarity}`}</p>
                  {activeCards.length < activeCardLimit ? (
                    <button type="button" onClick={() => onActivateCard(card.id)}>
                      Activate
                    </button>
                  ) : (
                    <div className="overlay-inline-actions">
                      {activeCards.map((activeCard, index) => (
                        <button
                          key={`${card.id}-replace-${activeCard.id}-${index}`}
                          type="button"
                          onClick={() => onActivateCard(card.id, activeCard.id)}
                        >
                          {`Replace ${activeCard.name}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <h3>Active Cards</h3>
          <p>{`${activeCards.length}/${activeCardLimit} active slots`}</p>
          <p>{activeCards.length === 0 ? 'No active cards.' : activeCards.map((card) => card.name).join(', ')}</p>
          <h3>Synergies</h3>
          <p>{renderTagSummary(activeCards)}</p>
          <div className="overlay-actions">
            <button type="button" onClick={onOpenShop}>
              Open Shop
            </button>
            <button type="button" onClick={onContinue}>
              Start Next Round
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function renderTagSummary(activeCards: CardDefinition[]): string {
  if (activeCards.length === 0) {
    return 'No active tags yet.';
  }

  const counts = new Map<string, number>();
  for (const card of activeCards) {
    for (const tag of card.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return entries.map(([tag, count]) => `${tag} x${count}`).join(', ');
}
