import { CardType, DECK_PRESETS, DifficultyLevel, GameMode } from './cardData';

export class DeckManager {
  public drawPile: CardType[] = [];
  public discardPile: CardType[] = [];
  private rng: () => number;

  constructor(mode: GameMode, difficulty: DifficultyLevel, rng: () => number = Math.random) {
    this.rng = rng;
    this.buildDeck(mode, difficulty);
  }

  public buildDeck(mode: GameMode, difficulty: DifficultyLevel): void {
    const preset =
      mode === 'light'
        ? DECK_PRESETS.light
        : difficulty === 'hard'
          ? DECK_PRESETS.survival_hard
          : DECK_PRESETS.survival_easy_med;

    const cards: CardType[] = [];
    for (const [type, count] of Object.entries(preset.counts) as [CardType, number][]) {
      for (let i = 0; i < count; i++) {
        cards.push(type);
      }
    }

    this.drawPile = cards;
    this.discardPile = [];
    this.shuffle(this.drawPile);
  }

  public shuffle(arr: CardType[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  public drawCard(halfTurnIndex: number): { card: CardType; reshuffled: boolean } {
    let reshuffled = false;
    if (this.drawPile.length === 0) {
      this.reshuffleDiscard();
      reshuffled = true;
    }

    let card = this.drawPile.pop()!;

    // Bullet is forbidden during the first 3 full turns (first 6 half-turns: indices 0..5)
    if (halfTurnIndex < 6 && card === 'BULLET') {
      // Find first non-bullet card and push Bullet deeper into the deck
      const insertAt = Math.max(0, Math.floor(this.drawPile.length * 0.35));
      this.drawPile.splice(insertAt, 0, 'BULLET');
      // Draw again from top
      if (this.drawPile.length > 0) {
        let safety = 0;
        card = this.drawPile.pop()!;
        while (card === 'BULLET' && safety < 5 && this.drawPile.length > 0) {
          this.drawPile.unshift('BULLET');
          card = this.drawPile.pop()!;
          safety++;
        }
      }
    }

    this.discardPile.push(card);
    return { card, reshuffled };
  }

  public reshuffleDiscard(): void {
    if (this.discardPile.length === 0) return;
    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    this.shuffle(this.drawPile);
  }
}
