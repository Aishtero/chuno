import { BoardState } from './boardState';
import {
  ChessMove,
  Piece,
  PieceColor,
  PieceType,
  PromotablePieceType,
  inBounds,
  oppositeColor,
  sqCol,
  sqRow,
  toSq,
} from './types';

const PROMOTIONS: PromotablePieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export function generatePseudoMovesForSquare(board: BoardState, sq: number): ChessMove[] {
  const piece = board.squares[sq];
  if (!piece) return [];

  const moves: ChessMove[] = [];
  const r = sqRow(sq);
  const c = sqCol(sq);
  const enemy = oppositeColor(piece.color);

  if (piece.type === 'pawn') {
    const dir = piece.color === 'white' ? 1 : -1;
    const startRow = piece.color === 'white' ? 1 : 6;
    const promoRow = piece.color === 'white' ? 7 : 0;

    // 1 step forward
    const r1 = r + dir;
    if (inBounds(r1, c) && !board.squares[toSq(r1, c)]) {
      const targetSq = toSq(r1, c);
      if (r1 === promoRow) {
        for (const promo of PROMOTIONS) {
          moves.push({ from: sq, to: targetSq, promotion: promo });
        }
      } else {
        moves.push({ from: sq, to: targetSq });
        // 2 steps forward from start row
        if (r === startRow) {
          const r2 = r + 2 * dir;
          if (inBounds(r2, c) && !board.squares[toSq(r2, c)]) {
            moves.push({ from: sq, to: toSq(r2, c) });
          }
        }
      }
    }

    // Diagonal captures + en passant
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (!inBounds(r1, nc)) continue;
      const targetSq = toSq(r1, nc);
      const targetPiece = board.squares[targetSq];
      if (targetPiece && targetPiece.color === enemy && targetPiece.type !== 'king') {
        if (r1 === promoRow) {
          for (const promo of PROMOTIONS) {
            moves.push({ from: sq, to: targetSq, promotion: promo });
          }
        } else {
          moves.push({ from: sq, to: targetSq });
        }
      } else if (board.enPassantTarget === targetSq) {
        const epVictimSq = toSq(r, nc);
        const epVictim = board.squares[epVictimSq];
        if (epVictim && epVictim.color === enemy && epVictim.type === 'pawn') {
          moves.push({ from: sq, to: targetSq, isEnPassant: true });
        }
      }
    }
    return moves;
  }

  if (piece.type === 'knight') {
    const offsets = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const targetSq = toSq(nr, nc);
      const occ = board.squares[targetSq];
      if (!occ || (occ.color === enemy && occ.type !== 'king')) {
        moves.push({ from: sq, to: targetSq });
      }
    }
    return moves;
  }

  if (piece.type === 'king') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const targetSq = toSq(nr, nc);
        const occ = board.squares[targetSq];
        if (!occ || (occ.color === enemy && occ.type !== 'king')) {
          moves.push({ from: sq, to: targetSq });
        }
      }
    }

    // Castling
    if (!piece.hasMoved && !board.isInCheck(piece.color)) {
      const row = piece.color === 'white' ? 0 : 7;
      if (r === row && c === 4) {
        const canKS = piece.color === 'white' ? board.castlingRights.wK : board.castlingRights.bK;
        const canQS = piece.color === 'white' ? board.castlingRights.wQ : board.castlingRights.bQ;

        if (canKS) {
          const rook = board.squares[toSq(row, 7)];
          if (
            rook &&
            rook.color === piece.color &&
            rook.type === 'rook' &&
            !rook.hasMoved &&
            !board.squares[toSq(row, 5)] &&
            !board.squares[toSq(row, 6)] &&
            !board.isSquareAttacked(toSq(row, 5), enemy) &&
            !board.isSquareAttacked(toSq(row, 6), enemy)
          ) {
            moves.push({ from: sq, to: toSq(row, 6), isCastleKingSide: true });
          }
        }

        if (canQS) {
          const rook = board.squares[toSq(row, 0)];
          if (
            rook &&
            rook.color === piece.color &&
            rook.type === 'rook' &&
            !rook.hasMoved &&
            !board.squares[toSq(row, 1)] &&
            !board.squares[toSq(row, 2)] &&
            !board.squares[toSq(row, 3)] &&
            !board.isSquareAttacked(toSq(row, 3), enemy) &&
            !board.isSquareAttacked(toSq(row, 2), enemy)
          ) {
            moves.push({ from: sq, to: toSq(row, 2), isCastleQueenSide: true });
          }
        }
      }
    }
    return moves;
  }

  // Sliding pieces
  const dirs: [number, number][] = [];
  if (piece.type === 'rook' || piece.type === 'queen') {
    dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  }
  if (piece.type === 'bishop' || piece.type === 'queen') {
    dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  }

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const targetSq = toSq(nr, nc);
      const occ = board.squares[targetSq];
      if (!occ) {
        moves.push({ from: sq, to: targetSq });
      } else {
        if (occ.color === enemy && occ.type !== 'king') {
          moves.push({ from: sq, to: targetSq });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return moves;
}

/**
 * Zero-allocation in-place legality test: temporarily applies move on `board.squares`,
 * verifies own King is not attacked, and restores squares cleanly.
 */
function isMoveSafeInPlace(board: BoardState, move: ChessMove, color: PieceColor): boolean {
  const fromPiece = board.squares[move.from];
  if (!fromPiece) return false;
  const toPiece = board.squares[move.to];
  if (toPiece && toPiece.type === 'king') return false;

  let epVictimSq = -1;
  let epVictim: Piece | null = null;
  if (move.isEnPassant) {
    const dir = color === 'white' ? 1 : -1;
    epVictimSq = move.to - dir * 8;
    epVictim = board.squares[epVictimSq];
    if (epVictim && epVictim.type === 'king') return false;
    board.squares[epVictimSq] = null;
  }

  let rookFrom = -1;
  let rookTo = -1;
  let rookPiece: Piece | null = null;
  if (move.isCastleKingSide) {
    const row = sqRow(move.from);
    rookFrom = toSq(row, 7);
    rookTo = toSq(row, 5);
    rookPiece = board.squares[rookFrom];
    board.squares[rookFrom] = null;
    board.squares[rookTo] = rookPiece;
  } else if (move.isCastleQueenSide) {
    const row = sqRow(move.from);
    rookFrom = toSq(row, 0);
    rookTo = toSq(row, 3);
    rookPiece = board.squares[rookFrom];
    board.squares[rookFrom] = null;
    board.squares[rookTo] = rookPiece;
  }

  board.squares[move.from] = null;
  board.squares[move.to] = fromPiece;

  const safe = !board.isInCheck(color);

  board.squares[move.from] = fromPiece;
  board.squares[move.to] = toPiece;
  if (epVictimSq !== -1) {
    board.squares[epVictimSq] = epVictim;
  }
  if (rookFrom !== -1) {
    board.squares[rookFrom] = rookPiece;
    board.squares[rookTo] = null;
  }

  return safe;
}

export function generateLegalMoves(board: BoardState, color: PieceColor): ChessMove[] {
  const legal: ChessMove[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p || p.color !== color) continue;
    const pseudo = generatePseudoMovesForSquare(board, sq);
    for (const move of pseudo) {
      if (isMoveSafeInPlace(board, move, color)) {
        legal.push(move);
      }
    }
  }
  return legal;
}

export function hasAnyLegalMove(board: BoardState, color: PieceColor): boolean {
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p || p.color !== color) continue;
    const pseudo = generatePseudoMovesForSquare(board, sq);
    for (const move of pseudo) {
      if (isMoveSafeInPlace(board, move, color)) {
        return true;
      }
    }
  }
  return false;
}

export function generateLegalMovesForSquare(
  board: BoardState,
  sq: number,
  color: PieceColor,
): ChessMove[] {
  const p = board.squares[sq];
  if (!p || p.color !== color) return [];
  const pseudo = generatePseudoMovesForSquare(board, sq);
  const legal: ChessMove[] = [];
  for (const move of pseudo) {
    if (isMoveSafeInPlace(board, move, color)) {
      legal.push(move);
    }
  }
  return legal;
}

export function isCheckmate(board: BoardState, color: PieceColor): boolean {
  return board.isInCheck(color) && !hasAnyLegalMove(board, color);
}

export function isStalemate(board: BoardState, color: PieceColor): boolean {
  return !board.isInCheck(color) && !hasAnyLegalMove(board, color);
}

/**
 * Returns valid squares where a resurrected piece of `pieceType` can be placed.
 * Rules:
 * - Must be on the player's own half: rows 0..3 for white, rows 4..7 for black.
 * - Must be empty.
 * - Pawns cannot be placed on rank 1 (row 0) or rank 8 (row 7).
 * - If player's King is currently in check, the placement MUST resolve the check (block/interpose).
 * - Placement cannot directly deliver instant checkmate to the opponent without a move.
 */
export function getLegalResurrectSquares(
  board: BoardState,
  color: PieceColor,
  pieceType: PieceType,
): number[] {
  const minRow = color === 'white' ? 0 : 4;
  const maxRow = color === 'white' ? 3 : 7;
  const enemy = oppositeColor(color);
  const result: number[] = [];

  for (let r = minRow; r <= maxRow; r++) {
    if (pieceType === 'pawn' && (r === 0 || r === 7)) continue;
    for (let c = 0; c < 8; c++) {
      const sq = toSq(r, c);
      if (board.squares[sq] !== null) continue;

      const sim = board.clone();
      sim.squares[sq] = { id: 9999, type: pieceType, color, hasMoved: true };
      // Cannot leave own king in check (and if under check, must block it!)
      if (sim.isInCheck(color)) continue;
      // Cannot directly check or checkmate enemy king just by placing
      if (sim.isInCheck(enemy) || isCheckmate(sim, enemy)) continue;

      result.push(sq);
    }
  }
  return result;
}

/**
 * Generates legal moves if the piece at `sq` is temporarily transformed via Wild into `targetType`.
 * Cannot transform a King, targetType cannot be King, and cannot capture enemy King.
 */
export function generateWildMoves(
  board: BoardState,
  sq: number,
  targetType: Exclude<PieceType, 'king'>,
  color: PieceColor,
): ChessMove[] {
  const orig = board.squares[sq];
  if (!orig || orig.color !== color || orig.type === 'king') return [];

  const sim = board.clone();
  const transformed: Piece = { ...orig, type: targetType };
  sim.squares[sq] = transformed;

  const pseudo = generatePseudoMovesForSquare(sim, sq);
  const legal: ChessMove[] = [];
  for (const move of pseudo) {
    if (isMoveSafeInPlace(sim, move, color)) {
      legal.push(move);
    }
  }
  return legal;
}

export function getWildEligibleSquares(board: BoardState, color: PieceColor): number[] {
  const wildTargets: Exclude<PieceType, 'king'>[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];
  const eligible: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (!p || p.color !== color || p.type === 'king') continue;
    const hasAnyMove = wildTargets.some((t) => generateWildMoves(board, sq, t, color).length > 0);
    if (hasAnyMove) eligible.push(sq);
  }
  return eligible;
}
