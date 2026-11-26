import { BoardState } from '../chess/boardState';
import { evaluateDrawOffer } from '../chess/chessAI';
import {
  generateLegalMoves,
  generateWildMoves,
  getLegalResurrectSquares,
  getWildEligibleSquares,
  hasAnyLegalMove,
  isCheckmate,
  isStalemate,
} from '../chess/moveGenerator';
import {
  ChessMove,
  PieceColor,
  PieceType,
  PromotablePieceType,
  oppositeColor,
} from '../chess/types';
import {
  CardType,
  DifficultyLevel,
  GameMode,
  LightPersonality,
  cardMoveCount,
} from '../deck/cardData';
import { DeckManager } from '../deck/deckManager';

export type MatchPhase =
  | 'AWAIT_DRAW_CARD'
  | 'PLAYER_MOVE_LOOP'
  | 'AWAIT_RESURRECT_PLACEMENT'
  | 'AWAIT_WILD_ACTION'
  | 'AWAIT_COIN_CHOICE'
  | 'MATCH_OVER';

export type MatchActor = 'player' | 'opponent';
export type CoinSide = 'heads' | 'tails';

export type MatchEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'revolver_hp_zero'
  | 'insufficient_material'
  | 'repetition'
  | 'fifty_move'
  | 'draw_agreed'
  | 'resignation';

export interface MatchStats {
  turnsPlayed: number;
  movesMade: number;
  coinsSurvived: number;
  shotsFired: number;
  reverseOccurred: boolean;
  maxResurrectedSingleCard: number;
  wonByWildCheckmate: boolean;
}

export type MatchEvent =
  | {
      type: 'CARD_DRAWN';
      actor: MatchActor;
      card: CardType;
      reshuffled: boolean;
      convertedFromResurrect?: boolean;
      redrawReason?: 'check_skip';
      convertedFromCheckSkip?: boolean;
    }
  | { type: 'PIECE_MOVED'; actor: MatchActor; move: ChessMove; isCheck: boolean; captured: boolean; streakInterrupted: boolean }
  | { type: 'SKIP_TURN'; actor: MatchActor }
  | { type: 'BOARD_REVERSED'; actor: MatchActor; newPlayerColor: PieceColor }
  | { type: 'PIECE_RESURRECTED'; actor: MatchActor; pieceId: number; pieceType: PieceType; square: number; remaining: number }
  | { type: 'WILD_MOVED'; actor: MatchActor; targetType: Exclude<PieceType, 'king'>; move: ChessMove; isCheck: boolean; captured: boolean }
  | { type: 'COIN_RESOLVED'; drawer: MatchActor; guesser: MatchActor; guessed: CoinSide; actual: CoinSide; guessedRight: boolean; targetHpAfter: number }
  | { type: 'BOARD_RESET_STALEMATE' }
  | { type: 'MATCH_ENDED'; winner: MatchActor | 'draw'; reason: MatchEndReason };

export interface MatchConfig {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  rng?: () => number;
}

export class MatchEngine {
  public readonly mode: GameMode;
  public readonly difficulty: DifficultyLevel;
  public readonly personality: LightPersonality;
  private rng: () => number;

  public board: BoardState;
  public deck: DeckManager;
  public phase: MatchPhase = 'AWAIT_DRAW_CARD';
  public activeActor: MatchActor = 'player';
  public playerColor: PieceColor = 'white';
  public opponentColor: PieceColor = 'black';

  public playerHp: number;
  public opponentHp: number;
  public maxHp: number;

  public halfTurnIndex: number = 0;
  public currentCard: CardType | null = null;
  public movesLeft: number = 0;
  public resurrectsLeft: number = 0;

  public winner: MatchActor | 'draw' | null = null;
  public endReason: MatchEndReason | null = null;
  public recentPositionKeys: string[] = [];
  public positionCounts = new Map<string, number>();
  public kingVsKingHalfMoves: number = 0;
  public drawOfferCooldownTurns: number = 0;
  public drawOfferLocked: boolean = false;
  private currentCardResurrectedCount: number = 0;
  public stats: MatchStats = {
    turnsPlayed: 0,
    movesMade: 0,
    coinsSurvived: 0,
    shotsFired: 0,
    reverseOccurred: false,
    maxResurrectedSingleCard: 0,
    wonByWildCheckmate: false,
  };

  constructor(config: MatchConfig) {
    this.mode = config.mode;
    this.difficulty = config.difficulty;
    this.personality = config.personality;
    this.rng = config.rng ?? Math.random;

    this.maxHp =
      config.mode === 'light'
        ? 0
        : config.difficulty === 'easy'
          ? 3
          : config.difficulty === 'medium'
            ? 2
            : 1;
    this.playerHp = this.maxHp;
    this.opponentHp = this.maxHp;

    this.board = BoardState.createInitial();
    this.deck = new DeckManager(config.mode, config.difficulty, this.rng);
    this.checkTurnStartConditions();
  }

  public getPhase(): MatchPhase {
    return this.phase;
  }

  public getActiveActor(): MatchActor {
    return this.activeActor;
  }

  public getState(): {
    phase: MatchPhase;
    activeActor: MatchActor;
    movesLeft: number;
    resurrectsLeft: number;
    winner: MatchActor | 'draw' | null;
    isKingVsKing: boolean;
    isInsufficientMaterial: boolean;
    drawOfferCooldownTurns: number;
    drawOfferLocked: boolean;
    fullTurns: number;
  } {
    const insuf = this.board.getInsufficientMaterialState();
    return {
      phase: this.phase,
      activeActor: this.activeActor,
      movesLeft: this.movesLeft,
      resurrectsLeft: this.resurrectsLeft,
      winner: this.winner,
      isKingVsKing: insuf === 'king_vs_king',
      isInsufficientMaterial: insuf !== 'none',
      drawOfferCooldownTurns: this.drawOfferCooldownTurns,
      drawOfferLocked: this.drawOfferLocked,
      fullTurns: Math.floor(this.halfTurnIndex / 2),
    };
  }

  private deckHasCard(card: CardType): boolean {
    return this.deck.drawPile.includes(card) || this.deck.discardPile.includes(card);
  }

  private endAsDraw(reason: 'insufficient_material' | 'repetition' | 'fifty_move' | 'draw_agreed'): MatchEvent {
    this.phase = 'MATCH_OVER';
    this.winner = 'draw';
    this.endReason = reason;
    this.movesLeft = 0;
    this.resurrectsLeft = 0;
    return { type: 'MATCH_ENDED', winner: 'draw', reason };
  }

  private checkDrawConditions(): MatchEvent | null {
    if (this.phase === 'MATCH_OVER') return null;

    const insuf = this.board.getInsufficientMaterialState();
    if (insuf !== 'king_vs_king') {
      this.kingVsKingHalfMoves = 0;
    }

    if (insuf !== 'none') {
      const hasGravePieces =
        this.board.graveyard.white.length > 0 || this.board.graveyard.black.length > 0;
      const canResurrect =
        hasGravePieces && (this.deckHasCard('PLUS_2') || this.deckHasCard('PLUS_4'));
      const hasBullet = this.mode === 'survival' && this.deckHasCard('BULLET');

      // Case A: Absolute deadlock (cannot checkmate, cannot resurrect, no bullet)
      if (!canResurrect && !hasBullet) {
        return this.endAsDraw('insufficient_material');
      }

      // Case B: Prolonged King vs King in ChUno (3 full moves = 6 half-moves without resurrection/bullet kill)
      if (insuf === 'king_vs_king' && this.kingVsKingHalfMoves >= 6) {
        return this.endAsDraw('insufficient_material');
      }
    }

    // Threefold repetition check
    const lastKey = this.recentPositionKeys[this.recentPositionKeys.length - 1];
    if (lastKey && (this.positionCounts.get(lastKey) ?? 0) >= 3) {
      return this.endAsDraw('repetition');
    }

    // 50-move rule (100 half-moves without pawn push, capture, or resurrection)
    if (this.board.halfMoveClock >= 100) {
      return this.endAsDraw('fifty_move');
    }

    return null;
  }

  /**
   * Player offers a draw. Evaluated strictly via evaluateDrawOffer():
   * - Insufficient material / King vs King always accepted.
   * - Survival Medium & Hard: Dealer NEVER agrees and locks the draw button for the rest of the match.
   * - Survival Easy: refuses before 10 full turns; accepts >= 10 only if aiEval <= 50.
   * - Light Mode: per-personality turn threshold (6/8/10/12) & eval threshold.
   * - Any non-locked refusal puts Offer Draw on a 4-full-turn cooldown.
   */
  public offerDraw(aiEvalScore: number): {
    accepted: boolean;
    reason: 'accepted' | 'dealer_hard_refusal' | 'dealer_early_refusal' | 'declined' | 'cooldown' | 'locked' | 'match_over';
    events: MatchEvent[];
  } {
    if (this.phase === 'MATCH_OVER') {
      return { accepted: false, reason: 'match_over', events: [] };
    }
    const insuf = this.board.getInsufficientMaterialState();
    const isInsufficientMaterial = insuf !== 'none';

    // Always allow agreeing to draw during King vs King / insufficient material deadlock
    if (isInsufficientMaterial) {
      const evt = this.endAsDraw('draw_agreed');
      return { accepted: true, reason: 'accepted', events: [evt] };
    }

    if (this.drawOfferLocked) {
      return { accepted: false, reason: 'locked', events: [] };
    }

    if (this.drawOfferCooldownTurns > 0) {
      return { accepted: false, reason: 'cooldown', events: [] };
    }

    const decision = evaluateDrawOffer({
      mode: this.mode,
      difficulty: this.difficulty,
      personality: this.personality,
      fullTurns: Math.floor(this.halfTurnIndex / 2),
      aiEvalScore,
      isInsufficientMaterial,
    });

    if (decision.accepted) {
      const evt = this.endAsDraw('draw_agreed');
      return { accepted: true, reason: 'accepted', events: [evt] };
    }

    if (decision.hardRefusal) {
      this.drawOfferLocked = true;
      return { accepted: false, reason: 'dealer_hard_refusal', events: [] };
    }

    this.drawOfferCooldownTurns = 4;
    return {
      accepted: false,
      reason: decision.reason === 'dealer_early_refusal' ? 'dealer_early_refusal' : 'declined',
      events: [],
    };
  }

  /**
   * Resign the match immediately for the given actor (defaults to player).
   */
  public resign(actor: MatchActor = 'player'): MatchEvent[] {
    if (this.phase === 'MATCH_OVER') return [];
    this.phase = 'MATCH_OVER';
    this.winner = this.getEnemyActor(actor);
    this.endReason = 'resignation';
    this.movesLeft = 0;
    this.resurrectsLeft = 0;
    return [{ type: 'MATCH_ENDED', winner: this.winner, reason: 'resignation' }];
  }

  /**
   * Emergency deadlock recovery: ends the active actor's turn cleanly when no legal action
   * can be performed (e.g. exhausted streak, empty options, or AI worker watchdog recovery).
   */
  public forceEndActiveTurn(): MatchEvent[] {
    if (this.phase === 'MATCH_OVER') return [];
    const failsafe = this.enforceMissingKingFailsafe();
    if (failsafe) return [failsafe];

    const activeColor = this.getActiveColor();
    const inCheck = this.board.isInCheck(activeColor);
    const hasLegal = hasAnyLegalMove(this.board, activeColor);
    this.movesLeft = 0;
    this.resurrectsLeft = 0;

    if (inCheck && !hasLegal) {
      this.phase = 'MATCH_OVER';
      this.winner = this.getEnemyActor(this.activeActor);
      this.endReason = 'checkmate';
      return [{ type: 'MATCH_ENDED', winner: this.winner, reason: 'checkmate' }];
    }

    if (!inCheck && !hasLegal) {
      if (this.mode === 'survival') {
        this.board.setupInitial();
        this.recentPositionKeys = [];
        return [{ type: 'BOARD_RESET_STALEMATE' }, ...this.advanceTurn()];
      }
      this.phase = 'MATCH_OVER';
      this.winner = 'draw';
      this.endReason = 'stalemate';
      return [{ type: 'MATCH_ENDED', winner: 'draw', reason: 'stalemate' }];
    }

    return this.advanceTurn();
  }

  public getActiveColor(): PieceColor {
    return this.activeActor === 'player' ? this.playerColor : this.opponentColor;
  }

  public getEnemyActor(actor: MatchActor): MatchActor {
    return actor === 'player' ? 'opponent' : 'player';
  }

  public getLegalMovesForActive(): ChessMove[] {
    return generateLegalMoves(this.board, this.getActiveColor());
  }

  public getResurrectOptionsForActive(): { pieceId: number; type: PieceType; legalSquares: number[] }[] {
    const color = this.getActiveColor();
    return this.board.graveyard[color]
      .map((p) => ({
        pieceId: p.id,
        type: p.type,
        legalSquares: getLegalResurrectSquares(this.board, color, p.type),
      }))
      .filter((opt) => opt.legalSquares.length > 0);
  }

  private enforceMissingKingFailsafe(): MatchEvent | null {
    const playerHasKing = this.board.hasKing(this.playerColor);
    const opponentHasKing = this.board.hasKing(this.opponentColor);
    if (!playerHasKing || !opponentHasKing) {
      this.phase = 'MATCH_OVER';
      this.movesLeft = 0;
      this.resurrectsLeft = 0;
      if (!playerHasKing && !opponentHasKing) {
        this.winner = 'draw';
        this.endReason = 'stalemate';
      } else if (!playerHasKing) {
        this.winner = 'opponent';
        this.endReason = 'checkmate';
      } else {
        this.winner = 'player';
        this.endReason = 'checkmate';
      }
      return { type: 'MATCH_ENDED', winner: this.winner, reason: this.endReason };
    }
    return null;
  }

  private recordPositionKey(): void {
    const key = this.board.getPositionKey(this.getActiveColor());
    this.recentPositionKeys.push(key);
    if (this.recentPositionKeys.length > 8) {
      this.recentPositionKeys.shift();
    }
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
  }

  public checkTurnStartConditions(): MatchEvent[] {
    const events: MatchEvent[] = [];
    const failsafe = this.enforceMissingKingFailsafe();
    if (failsafe) {
      events.push(failsafe);
      return events;
    }

    const drawEvt = this.checkDrawConditions();
    if (drawEvt) {
      events.push(drawEvt);
      return events;
    }

    const activeColor = this.getActiveColor();
    const inCheck = this.board.isInCheck(activeColor);
    const hasLegal = hasAnyLegalMove(this.board, activeColor);

    if (inCheck && !hasLegal) {
      this.phase = 'MATCH_OVER';
      this.winner = this.getEnemyActor(this.activeActor);
      this.endReason = 'checkmate';
      events.push({ type: 'MATCH_ENDED', winner: this.winner, reason: 'checkmate' });
      return events;
    }

    if (!inCheck && !hasLegal) {
      if (this.mode === 'survival') {
        // Stalemate in Survival Mode resets board for a fresh round without HP loss
        this.board.setupInitial();
        this.recentPositionKeys = [];
        this.positionCounts.clear();
        this.kingVsKingHalfMoves = 0;
        events.push({ type: 'BOARD_RESET_STALEMATE' });
      } else {
        this.phase = 'MATCH_OVER';
        this.winner = 'draw';
        this.endReason = 'stalemate';
        events.push({ type: 'MATCH_ENDED', winner: 'draw', reason: 'stalemate' });
        return events;
      }
    }

    this.phase = 'AWAIT_DRAW_CARD';
    return events;
  }

  public drawCard(): MatchEvent[] {
    if (this.phase !== 'AWAIT_DRAW_CARD') {
      throw new Error(`Cannot draw card in phase ${this.phase}`);
    }

    const events: MatchEvent[] = [];
    const { card, reshuffled } = this.deck.drawCard(this.halfTurnIndex);
    this.currentCard = card;
    this.stats.turnsPlayed++;

    if (card === 'NUM_1' || card === 'NUM_2' || card === 'NUM_3' || card === 'NUM_4' || card === 'NUM_5') {
      this.movesLeft = cardMoveCount(card);
      this.phase = 'PLAYER_MOVE_LOOP';
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      return events;
    }

    if (card === 'SKIP') {
      const activeColor = this.getActiveColor();
      if (this.board.isInCheck(activeColor)) {
        // Under Check, Skip is cancelled and discarded so the active side draws again to defend their King.
        // Infinite-loop safeguard: if no non-SKIP card exists in drawPile/discardPile, convert to 1 regular move.
        const hasNonSkipCard =
          this.deck.drawPile.some((c) => c !== 'SKIP') ||
          this.deck.discardPile.some((c) => c !== 'SKIP');
        if (!hasNonSkipCard) {
          this.movesLeft = 1;
          this.phase = 'PLAYER_MOVE_LOOP';
          events.push({
            type: 'CARD_DRAWN',
            actor: this.activeActor,
            card,
            reshuffled,
            convertedFromCheckSkip: true,
          });
          return events;
        }
        let reshuffledNow = reshuffled;
        if (this.deck.drawPile.length === 0) {
          this.deck.reshuffleDiscard();
          reshuffledNow = true;
        }
        this.phase = 'AWAIT_DRAW_CARD';
        events.push({
          type: 'CARD_DRAWN',
          actor: this.activeActor,
          card,
          reshuffled: reshuffledNow,
          redrawReason: 'check_skip',
        });
        return events;
      }
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      events.push({ type: 'SKIP_TURN', actor: this.activeActor });
      events.push(...this.advanceTurn());
      return events;
    }

    if (card === 'REVERSE') {
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      const oldPlayer = this.playerColor;
      this.playerColor = this.opponentColor;
      this.opponentColor = oldPlayer;
      this.stats.reverseOccurred = true;
      events.push({ type: 'BOARD_REVERSED', actor: this.activeActor, newPlayerColor: this.playerColor });
      events.push(...this.advanceTurn());
      return events;
    }

    if (card === 'PLUS_2' || card === 'PLUS_4') {
      const targetCount = card === 'PLUS_2' ? 2 : 4;
      const options = this.getResurrectOptionsForActive();
      if (options.length === 0) {
        // Fallback: automatically convert to 1 regular chess move so player doesn't waste turn
        this.movesLeft = 1;
        this.phase = 'PLAYER_MOVE_LOOP';
        events.push({
          type: 'CARD_DRAWN',
          actor: this.activeActor,
          card,
          reshuffled,
          convertedFromResurrect: true,
        });
        return events;
      }
      this.currentCardResurrectedCount = 0;
      this.resurrectsLeft = Math.min(targetCount, options.length);
      this.phase = 'AWAIT_RESURRECT_PLACEMENT';
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      return events;
    }

    if (card === 'WILD') {
      const eligible = getWildEligibleSquares(this.board, this.getActiveColor());
      if (eligible.length === 0) {
        // Fallback to normal move loop (which will check/mate properly)
        this.movesLeft = 1;
        this.phase = 'PLAYER_MOVE_LOOP';
      } else {
        this.phase = 'AWAIT_WILD_ACTION';
      }
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      return events;
    }

    if (card === 'BULLET') {
      this.phase = 'AWAIT_COIN_CHOICE';
      events.push({ type: 'CARD_DRAWN', actor: this.activeActor, card, reshuffled });
      return events;
    }

    return events;
  }

  public executeMove(move: ChessMove): MatchEvent[] {
    if (this.phase !== 'PLAYER_MOVE_LOOP') {
      throw new Error(`Cannot execute chess move in phase ${this.phase}`);
    }

    const activeColor = this.getActiveColor();
    const legal = generateLegalMoves(this.board, activeColor);
    const matched = legal.find(
      (m) =>
        m.from === move.from &&
        m.to === move.to &&
        (m.promotion ?? undefined) === (move.promotion ?? undefined),
    );
    if (!matched) {
      throw new Error(`Illegal move from ${move.from} to ${move.to}`);
    }

    const events: MatchEvent[] = [];
    const result = this.board.applyMove(matched);
    this.stats.movesMade++;
    this.movesLeft--;
    this.recordPositionKey();

    const failsafe = this.enforceMissingKingFailsafe();
    if (failsafe) {
      events.push({
        type: 'PIECE_MOVED',
        actor: this.activeActor,
        move: matched,
        isCheck: false,
        captured: result.captured !== null,
        streakInterrupted: false,
      });
      events.push(failsafe);
      return events;
    }

    const enemyColor = oppositeColor(activeColor);
    const enemyInCheck = this.board.isInCheck(enemyColor);
    const enemyHasLegal = hasAnyLegalMove(this.board, enemyColor);
    const enemyCheckmated = enemyInCheck && !enemyHasLegal;
    const enemyStalemated = !enemyInCheck && !enemyHasLegal;

    // 1. Atomic checkmate termination
    if (enemyCheckmated) {
      const hadRemaining = this.movesLeft > 0;
      this.movesLeft = 0;
      events.push({
        type: 'PIECE_MOVED',
        actor: this.activeActor,
        move: matched,
        isCheck: true,
        captured: result.captured !== null,
        streakInterrupted: hadRemaining,
      });
      this.phase = 'MATCH_OVER';
      this.winner = this.activeActor;
      this.endReason = 'checkmate';
      events.push({ type: 'MATCH_ENDED', winner: this.activeActor, reason: 'checkmate' });
      return events;
    }

    // 2. Atomic stalemate termination / survival board reset
    if (enemyStalemated) {
      const hadRemaining = this.movesLeft > 0;
      this.movesLeft = 0;
      events.push({
        type: 'PIECE_MOVED',
        actor: this.activeActor,
        move: matched,
        isCheck: false,
        captured: result.captured !== null,
        streakInterrupted: hadRemaining,
      });
      if (this.mode === 'survival') {
        this.board.setupInitial();
        this.recentPositionKeys = [];
        events.push({ type: 'BOARD_RESET_STALEMATE' });
        events.push(...this.advanceTurn());
        return events;
      }
      this.phase = 'MATCH_OVER';
      this.winner = 'draw';
      this.endReason = 'stalemate';
      events.push({ type: 'MATCH_ENDED', winner: 'draw', reason: 'stalemate' });
      return events;
    }

    // 3. Atomic streak interruption on Check -> immediately end active player's turn
    if (enemyInCheck) {
      const streakInterrupted = this.movesLeft > 0;
      this.movesLeft = 0;
      events.push({
        type: 'PIECE_MOVED',
        actor: this.activeActor,
        move: matched,
        isCheck: true,
        captured: result.captured !== null,
        streakInterrupted,
      });
      events.push(...this.advanceTurn());
      return events;
    }

    // 4. Check immediate draw conditions (insufficient material deadlock, repetition, 50-move)
    const drawAfterMove = this.checkDrawConditions();
    if (drawAfterMove) {
      const hadRemaining = this.movesLeft > 0;
      this.movesLeft = 0;
      events.push({
        type: 'PIECE_MOVED',
        actor: this.activeActor,
        move: matched,
        isCheck: false,
        captured: result.captured !== null,
        streakInterrupted: hadRemaining,
      });
      events.push(drawAfterMove);
      return events;
    }

    // 5. If streak would continue (movesLeft > 0), verify active player actually has legal moves left
    let streakInterrupted = false;
    if (this.movesLeft > 0 && !hasAnyLegalMove(this.board, activeColor)) {
      this.movesLeft = 0;
      streakInterrupted = true;
    }

    events.push({
      type: 'PIECE_MOVED',
      actor: this.activeActor,
      move: matched,
      isCheck: false,
      captured: result.captured !== null,
      streakInterrupted,
    });

    if (this.movesLeft <= 0) {
      events.push(...this.advanceTurn());
    }
    return events;
  }

  public executeResurrect(pieceId: number, square: number): MatchEvent[] {
    if (this.phase !== 'AWAIT_RESURRECT_PLACEMENT') {
      throw new Error(`Cannot resurrect in phase ${this.phase}`);
    }

    const activeColor = this.getActiveColor();
    const piece = this.board.graveyard[activeColor].find((p) => p.id === pieceId);
    if (!piece) {
      throw new Error(`Piece ${pieceId} not in graveyard`);
    }

    const legalSquares = getLegalResurrectSquares(this.board, activeColor, piece.type);
    if (!legalSquares.includes(square)) {
      throw new Error(`Illegal resurrection square ${square}`);
    }

    const events: MatchEvent[] = [];
    const restored = this.board.resurrectPiece(pieceId, activeColor, square);
    this.kingVsKingHalfMoves = 0;
    this.positionCounts.clear();
    this.resurrectsLeft--;
    if (this.activeActor === 'player') {
      this.currentCardResurrectedCount++;
      if (this.currentCardResurrectedCount > this.stats.maxResurrectedSingleCard) {
        this.stats.maxResurrectedSingleCard = this.currentCardResurrectedCount;
      }
    }

    const remainingOptions = this.getResurrectOptionsForActive();
    const shouldStop = this.resurrectsLeft <= 0 || remainingOptions.length === 0;

    events.push({
      type: 'PIECE_RESURRECTED',
      actor: this.activeActor,
      pieceId: restored.id,
      pieceType: restored.type,
      square,
      remaining: shouldStop ? 0 : this.resurrectsLeft,
    });

    if (shouldStop) {
      this.resurrectsLeft = 0;
      events.push(...this.advanceTurn());
    }
    return events;
  }

  public executeWildMove(
    sourceSq: number,
    targetType: Exclude<PieceType, 'king'>,
    toSq: number,
    promotion?: PromotablePieceType,
  ): MatchEvent[] {
    if (this.phase !== 'AWAIT_WILD_ACTION') {
      throw new Error(`Cannot execute Wild in phase ${this.phase}`);
    }

    const activeColor = this.getActiveColor();
    const origPiece = this.board.squares[sourceSq];
    if (!origPiece || origPiece.color !== activeColor || origPiece.type === 'king') {
      throw new Error('Invalid Wild source piece');
    }

    const legalWild = generateWildMoves(this.board, sourceSq, targetType, activeColor);
    const matched = legalWild.find(
      (m) => m.to === toSq && (m.promotion ?? undefined) === (promotion ?? undefined),
    );
    if (!matched) {
      throw new Error('Illegal Wild move');
    }

    const originalType = origPiece.type;
    // Temporarily transform
    this.board.squares[sourceSq] = { ...origPiece, type: targetType };
    const result = this.board.applyMove(matched);

    // Revert back to original type after the move (unless a Pawn reached promotion rank and promoted!)
    const landed = this.board.squares[matched.to];
    if (landed) {
      if (originalType === 'pawn' && matched.promotion) {
        landed.type = matched.promotion;
      } else {
        landed.type = originalType;
      }
    }

    this.stats.movesMade++;
    this.recordPositionKey();

    const failsafe = this.enforceMissingKingFailsafe();
    if (failsafe) {
      return [
        {
          type: 'WILD_MOVED',
          actor: this.activeActor,
          targetType,
          move: matched,
          isCheck: false,
          captured: result.captured !== null,
        },
        failsafe,
      ];
    }

    const enemyColor = oppositeColor(activeColor);
    const enemyInCheck = this.board.isInCheck(enemyColor);
    const enemyHasLegal = hasAnyLegalMove(this.board, enemyColor);
    const enemyCheckmated = enemyInCheck && !enemyHasLegal;
    const enemyStalemated = !enemyInCheck && !enemyHasLegal;

    const events: MatchEvent[] = [
      {
        type: 'WILD_MOVED',
        actor: this.activeActor,
        targetType,
        move: matched,
        isCheck: enemyInCheck,
        captured: result.captured !== null,
      },
    ];

    if (enemyCheckmated) {
      this.phase = 'MATCH_OVER';
      this.winner = this.activeActor;
      this.endReason = 'checkmate';
      if (this.activeActor === 'player') {
        this.stats.wonByWildCheckmate = true;
      }
      events.push({ type: 'MATCH_ENDED', winner: this.activeActor, reason: 'checkmate' });
      return events;
    }

    if (enemyStalemated) {
      if (this.mode === 'survival') {
        this.board.setupInitial();
        this.recentPositionKeys = [];
        events.push({ type: 'BOARD_RESET_STALEMATE' });
        events.push(...this.advanceTurn());
        return events;
      } else {
        this.phase = 'MATCH_OVER';
        this.winner = 'draw';
        this.endReason = 'stalemate';
        events.push({ type: 'MATCH_ENDED', winner: 'draw', reason: 'stalemate' });
        return events;
      }
    }

    events.push(...this.advanceTurn());
    return events;
  }

  /**
   * Resolves the 50/50 Bullet Coin Flip.
   * When player drew Bullet: AI guesses (`guessedSide` is AI's guess). If wrong, AI takes 1 HP damage.
   * When opponent drew Bullet: Player guesses (`guessedSide` is Player's guess). If wrong, Player takes 1 HP damage.
   */
  public resolveCoinFlip(guessedSide: CoinSide): MatchEvent[] {
    if (this.phase !== 'AWAIT_COIN_CHOICE') {
      throw new Error(`Cannot resolve coin flip in phase ${this.phase}`);
    }

    const drawer = this.activeActor;
    const guesser = this.getEnemyActor(drawer);
    const actual: CoinSide = this.rng() < 0.5 ? 'heads' : 'tails';
    const guessedRight = guessedSide === actual;

    let targetHpAfter = guesser === 'player' ? this.playerHp : this.opponentHp;
    if (!guessedRight) {
      this.stats.shotsFired++;
      if (guesser === 'player') {
        this.playerHp = Math.max(0, this.playerHp - 1);
        targetHpAfter = this.playerHp;
      } else {
        this.opponentHp = Math.max(0, this.opponentHp - 1);
        targetHpAfter = this.opponentHp;
      }
    } else if (guesser === 'player') {
      this.stats.coinsSurvived++;
    }

    const events: MatchEvent[] = [
      {
        type: 'COIN_RESOLVED',
        drawer,
        guesser,
        guessed: guessedSide,
        actual,
        guessedRight,
        targetHpAfter,
      },
    ];

    if (targetHpAfter === 0) {
      this.phase = 'MATCH_OVER';
      this.winner = drawer;
      this.endReason = 'revolver_hp_zero';
      events.push({ type: 'MATCH_ENDED', winner: drawer, reason: 'revolver_hp_zero' });
      return events;
    }

    events.push(...this.advanceTurn());
    return events;
  }

  private advanceTurn(): MatchEvent[] {
    if (this.board.getInsufficientMaterialState() === 'king_vs_king') {
      this.kingVsKingHalfMoves++;
    } else {
      this.kingVsKingHalfMoves = 0;
    }
    this.activeActor = this.getEnemyActor(this.activeActor);
    if (this.activeActor === 'player' && this.drawOfferCooldownTurns > 0) {
      this.drawOfferCooldownTurns--;
    }
    this.halfTurnIndex++;
    this.currentCard = null;
    this.movesLeft = 0;
    this.resurrectsLeft = 0;
    return this.checkTurnStartConditions();
  }
}
