import { BoardState } from './boardState';
import { DifficultyLevel, GameMode, LightPersonality } from '../deck/cardData';
import {
  generateLegalMoves,
  generateWildMoves,
  getLegalResurrectSquares,
  getWildEligibleSquares,
  hasAnyLegalMove,
  isCheckmate,
} from './moveGenerator';
import {
  ChessMove,
  Piece,
  PieceColor,
  PieceType,
  oppositeColor,
  sqCol,
  sqRow,
} from './types';

export type AIDifficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'light'
  | 'enthusiast'
  | 'egoist'
  | 'calm'
  | 'unknown';

interface AIProfile {
  maxDepth: number;
  useQuiescence: boolean;
  qMaxDepth: number;
  noise: number;
  timeBudgetMs: number;
  aggressionBonus: number;
  greedMultiplier: number;
  centerBonus: number;
  kingAttackBonus: number;
  planStreaks: boolean;
  topKRandom: number;
  unpredictableBandCp: number;
}

function resolveProfile(difficulty: AIDifficulty, rng: () => number): AIProfile {
  switch (difficulty) {
    // Survival Mode — The Dealer is genuinely strong on ALL difficulties
    case 'easy':
      return {
        maxDepth: 3,
        useQuiescence: true,
        qMaxDepth: 2,
        noise: 0,
        timeBudgetMs: 180,
        aggressionBonus: 10,
        greedMultiplier: 1.05,
        centerBonus: 1.0,
        kingAttackBonus: 8,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 0,
      };
    case 'medium':
      return {
        maxDepth: 4,
        useQuiescence: true,
        qMaxDepth: 3,
        noise: 0,
        timeBudgetMs: 250,
        aggressionBonus: 16,
        greedMultiplier: 1.1,
        centerBonus: 1.3,
        kingAttackBonus: 14,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 0,
      };
    case 'hard':
      return {
        maxDepth: 4,
        useQuiescence: true,
        qMaxDepth: 3,
        noise: 0,
        timeBudgetMs: 420,
        aggressionBonus: 18,
        greedMultiplier: 1.12,
        centerBonus: 1.35,
        kingAttackBonus: 16,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 0,
      };

    // Light Mode — 4 distinct playstyles
    case 'enthusiast':
    case 'light':
      // Beginner-friendly: depth 1, no quiescence, moderate random pick among top-4 moves
      return {
        maxDepth: 1,
        useQuiescence: false,
        qMaxDepth: 0,
        noise: 24,
        timeBudgetMs: 55,
        aggressionBonus: 4,
        greedMultiplier: 1.0,
        centerBonus: 0.85,
        kingAttackBonus: 0,
        planStreaks: false,
        topKRandom: 4,
        unpredictableBandCp: 0,
      };
    case 'egoist':
      // Bold, aggressive, strong, heavy weight on king attacks, checks & captures
      return {
        maxDepth: 3,
        useQuiescence: true,
        qMaxDepth: 2,
        noise: 0,
        timeBudgetMs: 190,
        aggressionBonus: 28,
        greedMultiplier: 1.24,
        centerBonus: 1.1,
        kingAttackBonus: 22,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 0,
      };
    case 'calm':
      // Calm Philosopher: deep positional calculation, careful defense & clean checkmate
      return {
        maxDepth: 4,
        useQuiescence: true,
        qMaxDepth: 3,
        noise: 0,
        timeBudgetMs: 320,
        aggressionBonus: 8,
        greedMultiplier: 1.02,
        centerBonus: 1.35,
        kingAttackBonus: 10,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 0,
      };
    case 'unknown': {
      // Unknown (Incognito): strong & unpredictable — alternates positional & sharp tactical play
      const sharpMode = rng() < 0.5;
      return {
        maxDepth: 3,
        useQuiescence: true,
        qMaxDepth: 2,
        noise: 0,
        timeBudgetMs: 220,
        aggressionBonus: sharpMode ? 26 : 6,
        greedMultiplier: sharpMode ? 1.18 : 1.0,
        centerBonus: sharpMode ? 1.05 : 1.35,
        kingAttackBonus: sharpMode ? 20 : 6,
        planStreaks: true,
        topKRandom: 1,
        unpredictableBandCp: 35,
      };
    }
  }
}

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

const MATE_SCORE = 100000;

// Piece-Square Tables indexed from White's perspective: row 0 = rank 1 (bottom), row 7 = rank 8 (top)
const PAWN_PST = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10,-22,-22, 10, 10,  5],
  [  5, -5,-10,  2,  2,-10, -5,  5],
  [  0,  0,  0, 24, 24,  0,  0,  0],
  [  5,  5, 12, 28, 28, 12,  5,  5],
  [ 14, 14, 22, 34, 34, 22, 14, 14],
  [ 50, 50, 55, 60, 60, 55, 50, 50],
  [  0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-30,  5, 12, 16, 16, 12,  5,-30],
  [-30,  0, 16, 22, 22, 16,  0,-30],
  [-30,  5, 16, 22, 22, 16,  5,-30],
  [-30,  0, 14, 16, 16, 14,  0,-30],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  6,  0,  0,  0,  0,  6,-10],
  [-10, 10, 10, 12, 12, 10, 10,-10],
  [-10,  0, 12, 14, 14, 12,  0,-10],
  [-10,  6,  8, 14, 14,  8,  6,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const ROOK_PST = [
  [  0,  0,  4,  8,  8,  4,  0,  0],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  8, 14, 14, 14, 14, 14, 14,  8],
  [  0,  0,  0,  0,  0,  0,  0,  0],
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-10,  5,  6,  6,  6,  6,  0,-10],
  [  0,  0,  6,  6,  6,  6,  0, -5],
  [ -5,  0,  6,  6,  6,  6,  0, -5],
  [-10,  0,  6,  6,  6,  6,  0,-10],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const KING_MID_PST = [
  [ 22, 32, 12,  0,  0, 12, 34, 24],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
];

const KING_END_PST = [
  [-50,-30,-30,-30,-30,-30,-30,-50],
  [-30,-20, -5,  0,  0, -5,-20,-30],
  [-25,-10, 15, 22, 22, 15,-10,-25],
  [-25,-10, 22, 32, 32, 22,-10,-25],
  [-25,-10, 22, 32, 32, 22,-10,-25],
  [-25,-10, 15, 22, 22, 15,-10,-25],
  [-30,-25,-10,  0,  0,-10,-25,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
];

function pstBonus(type: PieceType, color: PieceColor, sq: number, isEndgame: boolean): number {
  const r = color === 'white' ? sqRow(sq) : 7 - sqRow(sq);
  const c = sqCol(sq);
  switch (type) {
    case 'pawn':
      return PAWN_PST[r][c];
    case 'knight':
      return KNIGHT_PST[r][c];
    case 'bishop':
      return BISHOP_PST[r][c];
    case 'rook':
      return ROOK_PST[r][c];
    case 'queen':
      return QUEEN_PST[r][c];
    case 'king':
      return isEndgame ? KING_END_PST[r][c] : KING_MID_PST[r][c];
  }
}

function manhattan(sqA: number, sqB: number): number {
  return Math.abs(sqRow(sqA) - sqRow(sqB)) + Math.abs(sqCol(sqA) - sqCol(sqB));
}

function centerManhattan(sq: number): number {
  const r = sqRow(sq);
  const c = sqCol(sq);
  const dr = Math.max(3 - r, r - 4);
  const dc = Math.max(3 - c, c - 4);
  return Math.max(0, dr) + Math.max(0, dc);
}

/**
 * Rich static evaluation from `perspective`'s point of view (positive = good for perspective).
 * Includes material, full Piece-Square Tables, check bonus, and endgame Mop-Up checkmate conversion.
 */
export function evaluateBoard(
  board: BoardState,
  perspective: PieceColor,
  greedMultiplier = 1.0,
  aggressionBonus = 0,
  centerBonus = 1.0,
  kingAttackBonus = 0,
): number {
  const enemy = oppositeColor(perspective);
  if (!board.hasKing(enemy)) return MATE_SCORE;
  if (!board.hasKing(perspective)) return -MATE_SCORE;

  let myNonKingMat = 0;
  let enNonKingMat = 0;
  let myHeavyCount = 0;
  let myNonKingCount = 0;
  let enNonKingCount = 0;
  let myKingSq = -1;
  let enKingSq = -1;
  const myAttackers: number[] = [];

  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p) continue;
    if (p.type === 'king') {
      if (p.color === perspective) myKingSq = sq;
      else enKingSq = sq;
      continue;
    }
    const val = PIECE_VALUES[p.type];
    if (p.color === perspective) {
      myNonKingMat += val;
      myNonKingCount++;
      if (p.type === 'queen' || p.type === 'rook') {
        myHeavyCount++;
        myAttackers.push(sq);
      }
    } else {
      enNonKingMat += val;
      enNonKingCount++;
    }
  }

  const isEndgame = myNonKingMat <= 1300 && enNonKingMat <= 1300;
  let score = 0;

  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p) continue;
    const mat = p.type === 'king' ? 0 : PIECE_VALUES[p.type] * (p.color === perspective ? 1 : greedMultiplier);
    const pos = pstBonus(p.type, p.color, sq, isEndgame) * (p.color === perspective ? centerBonus : 1.0);
    let total = mat + pos;
    if (p.color === perspective && p.type !== 'king' && enKingSq !== -1 && kingAttackBonus > 0) {
      const distToKing = manhattan(sq, enKingSq);
      if (distToKing <= 3) {
        total += (4 - distToKing) * (kingAttackBonus * 0.45);
      }
    }
    if (p.color === perspective) score += total;
    else score -= total;
  }

  // Endgame Mop-Up evaluation (crucial for converting material advantage into Checkmate!)
  const matDiff = myNonKingMat - enNonKingMat;
  if (matDiff >= 300 && (enNonKingMat <= 900 || enNonKingCount <= 2) && myKingSq !== -1 && enKingSq !== -1) {
    // Force losing King toward edges/corners
    score += centerManhattan(enKingSq) * 22;
    // Bring winning King closer to box losing King in
    score += (14 - manhattan(myKingSq, enKingSq)) * 12;
    // Keep heavy pieces close to enemy King
    for (const aSq of myAttackers) {
      score += (14 - manhattan(aSq, enKingSq)) * 5;
    }
    // Bonus for having Rook/Queen ready
    score += myHeavyCount * 15;
  } else if (-matDiff >= 300 && (myNonKingMat <= 900 || myNonKingCount <= 2) && myKingSq !== -1 && enKingSq !== -1) {
    score -= centerManhattan(myKingSq) * 22;
    score -= (14 - manhattan(enKingSq, myKingSq)) * 12;
  }

  if (board.isInCheck(enemy)) score += 48 + aggressionBonus;
  if (board.isInCheck(perspective)) score -= 48;

  return score;
}

function scoreMoveOrder(board: BoardState, move: ChessMove): number {
  let s = 0;
  const attacker = board.squares[move.from];
  const victim = board.squares[move.to];
  if (victim) {
    // MVV-LVA: Victim value * 10 - Attacker value
    s += 10000 + PIECE_VALUES[victim.type] * 10 - (attacker ? PIECE_VALUES[attacker.type] : 0);
  } else if (move.isEnPassant) {
    s += 10900;
  }
  if (move.promotion) {
    s += 9000 + PIECE_VALUES[move.promotion];
  }
  if (move.isCastleKingSide || move.isCastleQueenSide) {
    s += 400;
  }
  if (attacker) {
    s += pstBonus(attacker.type, attacker.color, move.to, false) -
      pstBonus(attacker.type, attacker.color, move.from, false);
  }
  return s;
}

function orderMoves(board: BoardState, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => scoreMoveOrder(board, b) - scoreMoveOrder(board, a));
}

interface SearchState {
  deadline: number;
  aborted: boolean;
  nodes: number;
  profile: AIProfile;
  rootColor: PieceColor;
}

function quiescence(
  board: BoardState,
  alpha: number,
  beta: number,
  currentColor: PieceColor,
  qDepth: number,
  state: SearchState,
): number {
  state.nodes++;
  if ((state.nodes & 63) === 0 && performance.now() > state.deadline) {
    state.aborted = true;
    return alpha;
  }

  const standPat =
    evaluateBoard(
      board,
      currentColor,
      currentColor === state.rootColor ? state.profile.greedMultiplier : 1.0,
      currentColor === state.rootColor ? state.profile.aggressionBonus : 0,
      currentColor === state.rootColor ? state.profile.centerBonus : 1.0,
      currentColor === state.rootColor ? state.profile.kingAttackBonus : 0,
    );

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (qDepth >= state.profile.qMaxDepth) return alpha;

  const allMoves = generateLegalMoves(board, currentColor);
  const tactical = orderMoves(
    board,
    allMoves.filter(
      (m) =>
        board.squares[m.to] !== null ||
        m.isEnPassant ||
        m.promotion === 'queen',
    ),
  );

  const enemy = oppositeColor(currentColor);
  for (const move of tactical) {
    const next = board.clone();
    next.applyMove(move);
    const score = -quiescence(next, -beta, -alpha, enemy, qDepth + 1, state);
    if (state.aborted) return alpha;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function negamax(
  board: BoardState,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  currentColor: PieceColor,
  state: SearchState,
): number {
  state.nodes++;
  if ((state.nodes & 63) === 0 && performance.now() > state.deadline) {
    state.aborted = true;
    return alpha;
  }

  const enemy = oppositeColor(currentColor);
  if (!board.hasKing(currentColor)) return -MATE_SCORE + ply;
  if (!board.hasKing(enemy)) return MATE_SCORE - ply;

  const inCheck = board.isInCheck(currentColor);
  if (!hasAnyLegalMove(board, currentColor)) {
    return inCheck ? -MATE_SCORE + ply : 0; // Checkmate prefers fastest mate, Stalemate = 0
  }

  if (depth <= 0) {
    if (state.profile.useQuiescence) {
      return quiescence(board, alpha, beta, currentColor, 0, state);
    }
    return evaluateBoard(
      board,
      currentColor,
      currentColor === state.rootColor ? state.profile.greedMultiplier : 1.0,
      currentColor === state.rootColor ? state.profile.aggressionBonus : 0,
      currentColor === state.rootColor ? state.profile.centerBonus : 1.0,
      currentColor === state.rootColor ? state.profile.kingAttackBonus : 0,
    );
  }

  const moves = orderMoves(
    board,
    generateLegalMoves(board, currentColor).filter((m) => !m.promotion || m.promotion === 'queen'),
  );

  let best = -Infinity;
  for (const move of moves) {
    const next = board.clone();
    next.applyMove(move);
    const val = -negamax(next, depth - 1, ply + 1, -beta, -alpha, enemy, state);
    if (state.aborted) return best === -Infinity ? alpha : best;
    if (val > best) best = val;
    if (val > alpha) alpha = val;
    if (alpha >= beta) break;
  }
  return best;
}

function scoreAfterFriendlyMove(
  boardAfterM1: BoardState,
  aiColor: PieceColor,
  depth: number,
  movesLeftAfterM1: number,
  state: SearchState,
): number {
  const enemy = oppositeColor(aiColor);
  if (isCheckmate(boardAfterM1, enemy)) return MATE_SCORE - 1;
  if (!hasAnyLegalMove(boardAfterM1, enemy)) return 0; // Stalemate

  // If check given or no streak left, turn passes to opponent
  if (movesLeftAfterM1 <= 0 || boardAfterM1.isInCheck(enemy) || !state.profile.planStreaks) {
    return -negamax(boardAfterM1, depth, 1, -Infinity, Infinity, enemy, state);
  }

  // Friendly streak continues! Look ahead 1 more friendly move (top 8 ordered moves)
  const followUps = orderMoves(
    boardAfterM1,
    generateLegalMoves(boardAfterM1, aiColor).filter((m) => !m.promotion || m.promotion === 'queen'),
  ).slice(0, 8);

  if (followUps.length === 0) {
    return -negamax(boardAfterM1, depth, 1, -Infinity, Infinity, enemy, state);
  }

  let bestFollow = -Infinity;
  for (const m2 of followUps) {
    const b2 = boardAfterM1.clone();
    b2.applyMove(m2);
    if (isCheckmate(b2, enemy)) return MATE_SCORE - 2;
    const val = -negamax(b2, Math.max(0, depth - 1), 2, -Infinity, Infinity, enemy, state);
    if (state.aborted) break;
    if (val > bestFollow) bestFollow = val;
  }
  return bestFollow === -Infinity
    ? -negamax(boardAfterM1, depth, 1, -Infinity, Infinity, enemy, state)
    : bestFollow;
}

export function chooseAIMove(
  board: BoardState,
  aiColor: PieceColor,
  difficulty: AIDifficulty,
  rng: () => number = Math.random,
  movesLeft: number = 1,
  recentPositionKeys: string[] = [],
): ChessMove | null {
  const rawMoves = generateLegalMoves(board, aiColor);
  if (rawMoves.length === 0) return null;

  const filtered = rawMoves.filter((m) => !m.promotion || m.promotion === 'queen');
  const candidates = orderMoves(board, filtered.length > 0 ? filtered : rawMoves);
  const enemy = oppositeColor(aiColor);

  // Instant Checkmate in 1 check
  for (const m of candidates) {
    const sim = board.clone();
    sim.applyMove(m);
    if (isCheckmate(sim, enemy)) return m;
  }

  const profile = resolveProfile(difficulty, rng);
  const recentSet = new Set(recentPositionKeys);
  const startTime = performance.now();
  const deadline = startTime + profile.timeBudgetMs;

  let bestMove = candidates[0];
  let scoredCandidates: { move: ChessMove; score: number }[] = candidates.map((m) => ({
    move: m,
    score: 0,
  }));

  // Iterative deepening up to profile.maxDepth within timeBudgetMs
  for (let depth = 1; depth <= profile.maxDepth; depth++) {
    const state: SearchState = {
      deadline,
      aborted: false,
      nodes: 0,
      profile,
      rootColor: aiColor,
    };

    const currentScores: { move: ChessMove; score: number }[] = [];
    // Order by previous iteration's best moves on depth > 1
    const orderedRoot =
      depth === 1
        ? candidates
        : [...scoredCandidates].sort((a, b) => b.score - a.score).map((x) => x.move);

    for (const move of orderedRoot) {
      const next = board.clone();
      next.applyMove(move);

      let score = scoreAfterFriendlyMove(next, aiColor, depth - 1, movesLeft - 1, state);
      if (state.aborted) break;

      // Penalize repeating recent positions unless winning mate
      const nextKey = next.getPositionKey(enemy);
      if (recentSet.has(nextKey) && score < MATE_SCORE - 500) {
        score -= 220;
      }

      currentScores.push({ move, score });
    }

    if (!state.aborted && currentScores.length === orderedRoot.length) {
      scoredCandidates = currentScores;
      let iterBest = currentScores[0];
      for (const item of currentScores) {
        if (item.score > iterBest.score) iterBest = item;
      }
      bestMove = iterBest.move;
      // Early stop if forced mate found
      if (iterBest.score >= MATE_SCORE - 500) break;
    } else {
      break;
    }

    if (performance.now() - startTime > profile.timeBudgetMs * 0.75) {
      break;
    }
  }

  const sortedFinal = [...scoredCandidates].sort((a, b) => b.score - a.score);

  // Beginner-friendly mode (Enthusiast): moderate random selection among top-K moves
  if (profile.topKRandom > 1 && sortedFinal.length > 1) {
    if (sortedFinal[0].score >= MATE_SCORE - 500) {
      return sortedFinal[0].move;
    }
    const poolSize = Math.min(profile.topKRandom, sortedFinal.length);
    const pool = sortedFinal.slice(0, poolSize);
    // Weighted toward better moves in top-4 while still playful and forgiving
    const weights = pool.map((_, idx) => Math.max(1, poolSize - idx));
    const totalW = weights.reduce((acc, w) => acc + w, 0);
    let r = rng() * totalW;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i].move;
    }
    return pool[0].move;
  }

  // Unpredictable strong mode (Unknown): when top candidates are nearly equal, vary between them
  if (profile.unpredictableBandCp > 0 && sortedFinal.length > 1 && sortedFinal[0].score < MATE_SCORE - 500) {
    const topScore = sortedFinal[0].score;
    const nearBest = sortedFinal
      .slice(0, 3)
      .filter((item) => topScore - item.score <= profile.unpredictableBandCp);
    if (nearBest.length > 1) {
      return nearBest[Math.floor(rng() * nearBest.length)].move;
    }
  }

  // Apply controlled variance if noise > 0
  if (profile.noise > 0 && sortedFinal.length > 1) {
    let noisyBest = sortedFinal[0];
    let noisyVal = -Infinity;
    for (const item of sortedFinal) {
      const v =
        item.score >= MATE_SCORE - 500
          ? item.score
          : item.score + (rng() - 0.5) * profile.noise;
      if (v > noisyVal) {
        noisyVal = v;
        noisyBest = item;
      }
    }
    return noisyBest.move;
  }

  return bestMove;
}

export function chooseAIResurrection(
  board: BoardState,
  aiColor: PieceColor,
): { pieceId: number; square: number } | null {
  const grave = board.graveyard[aiColor];
  if (grave.length === 0) return null;

  const enemy = oppositeColor(aiColor);
  const sorted = [...grave].sort((a, b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);
  for (const piece of sorted) {
    const squares = getLegalResurrectSquares(board, aiColor, piece.type);
    if (squares.length > 0) {
      let bestSq = squares[0];
      let bestVal = -Infinity;
      for (const sq of squares) {
        const sim = board.clone();
        sim.squares[sq] = { ...piece, hasMoved: true };
        let val = evaluateBoard(sim, aiColor);
        // Penalize resurrecting onto an unprotected square attacked by enemy
        if (sim.isSquareAttacked(sq, enemy) && !sim.isSquareAttacked(sq, aiColor)) {
          val -= PIECE_VALUES[piece.type] * 0.65;
        }
        if (val > bestVal) {
          bestVal = val;
          bestSq = sq;
        }
      }
      return { pieceId: piece.id, square: bestSq };
    }
  }
  return null;
}

export function chooseAIWildAction(
  board: BoardState,
  aiColor: PieceColor,
  difficulty: AIDifficulty = 'medium',
): { square: number; targetType: Exclude<PieceType, 'king'>; move: ChessMove } | null {
  const eligible = getWildEligibleSquares(board, aiColor);
  if (eligible.length === 0) return null;

  const enemy = oppositeColor(aiColor);
  const profile = resolveProfile(difficulty, Math.random);
  const targetTypes: Exclude<PieceType, 'king'>[] = ['queen', 'knight', 'rook', 'bishop'];

  let bestChoice: { square: number; targetType: Exclude<PieceType, 'king'>; move: ChessMove } | null = null;
  let bestScore = -Infinity;

  const state: SearchState = {
    deadline: performance.now() + 180,
    aborted: false,
    nodes: 0,
    profile,
    rootColor: aiColor,
  };

  for (const sq of eligible) {
    for (const targetType of targetTypes) {
      const moves = generateWildMoves(board, sq, targetType, aiColor);
      for (const move of moves) {
        if (move.promotion && move.promotion !== 'queen') continue;
        const sim = board.clone();
        const orig = sim.squares[sq]!;
        sim.squares[sq] = { ...orig, type: targetType };
        sim.applyMove(move);
        if (sim.squares[move.to] && !move.promotion) {
          sim.squares[move.to]!.type = orig.type;
        }

        if (isCheckmate(sim, enemy)) {
          return { square: sq, targetType, move };
        }

        const evalDepth = profile.maxDepth >= 3 ? 1 : 0;
        const score = -negamax(sim, evalDepth, 1, -Infinity, Infinity, enemy, state);
        if (score > bestScore) {
          bestScore = score;
          bestChoice = { square: sq, targetType, move };
        }
      }
    }
  }

  return bestChoice;
}

export interface DrawOfferContext {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  fullTurns: number;
  aiEvalScore: number;
  isInsufficientMaterial: boolean;
}

export interface DrawOfferDecision {
  accepted: boolean;
  hardRefusal: boolean;
  earlyRefusal: boolean;
  reason: 'accepted' | 'dealer_hard_refusal' | 'dealer_early_refusal' | 'declined';
}

/**
 * Evaluates a manual "Offer Draw" request according to strict mode, difficulty, and personality rules.
 * Automatic deadlocks (King vs King / insufficient material) are always accepted so matches never stall.
 */
export function evaluateDrawOffer(ctx: DrawOfferContext): DrawOfferDecision {
  if (ctx.isInsufficientMaterial) {
    return { accepted: true, hardRefusal: false, earlyRefusal: false, reason: 'accepted' };
  }

  if (ctx.mode === 'survival') {
    // Survival Medium & Hard: The Dealer NEVER bargains for a draw
    if (ctx.difficulty === 'medium' || ctx.difficulty === 'hard') {
      return {
        accepted: false,
        hardRefusal: true,
        earlyRefusal: false,
        reason: 'dealer_hard_refusal',
      };
    }

    // Survival Easy: refuses before 10 full turns; from turn 10+, only if truly equal or losing (<= +50 cp)
    if (ctx.fullTurns < 10) {
      return {
        accepted: false,
        hardRefusal: false,
        earlyRefusal: true,
        reason: 'dealer_early_refusal',
      };
    }
    if (ctx.aiEvalScore <= 50) {
      return { accepted: true, hardRefusal: false, earlyRefusal: false, reason: 'accepted' };
    }
    return { accepted: false, hardRefusal: false, earlyRefusal: false, reason: 'declined' };
  }

  // Light Mode: individual turn thresholds & eval gates by companion personality
  const thresholds: Record<LightPersonality, { minTurns: number; maxEval: number }> = {
    enthusiast: { minTurns: 6, maxEval: 100 },
    unknown: { minTurns: 8, maxEval: 20 },
    calm: { minTurns: 10, maxEval: 40 },
    egoist: { minTurns: 12, maxEval: -50 },
  };
  const rule = thresholds[ctx.personality] ?? thresholds.calm;

  if (ctx.fullTurns < rule.minTurns) {
    return { accepted: false, hardRefusal: false, earlyRefusal: true, reason: 'declined' };
  }
  if (ctx.aiEvalScore <= rule.maxEval) {
    return { accepted: true, hardRefusal: false, earlyRefusal: false, reason: 'accepted' };
  }
  return { accepted: false, hardRefusal: false, earlyRefusal: false, reason: 'declined' };
}
