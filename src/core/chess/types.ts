export type PieceColor = 'white' | 'black';

export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export type PromotablePieceType = 'queen' | 'rook' | 'bishop' | 'knight';

export interface Piece {
  id: number;
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessMove {
  from: number;
  to: number;
  promotion?: PromotablePieceType;
  isCastleKingSide?: boolean;
  isCastleQueenSide?: boolean;
  isEnPassant?: boolean;
}

export interface AppliedMoveResult {
  captured: Piece | null;
  movedPiece: Piece;
  promotedTo?: PromotablePieceType;
}

export function oppositeColor(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

export function sqRow(sq: number): number {
  return Math.floor(sq / 8);
}

export function sqCol(sq: number): number {
  return sq % 8;
}

export function toSq(row: number, col: number): number {
  return row * 8 + col;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function sqToAlgebraic(sq: number): string {
  const file = String.fromCharCode(97 + sqCol(sq));
  const rank = String(sqRow(sq) + 1);
  return `${file}${rank}`;
}
