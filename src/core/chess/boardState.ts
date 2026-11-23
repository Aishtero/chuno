import {
  AppliedMoveResult,
  CastlingRights,
  ChessMove,
  Piece,
  PieceColor,
  PieceType,
  inBounds,
  oppositeColor,
  sqCol,
  sqRow,
  toSq,
} from './types';

export type InsufficientMaterialState = 'none' | 'king_vs_king' | 'insufficient_minor';

export interface BoardSnapshot {
  squares: (Piece | null)[];
  enPassantTarget: number | null;
  castlingRights: CastlingRights;
  graveyard: { white: Piece[]; black: Piece[] };
  nextPieceId: number;
  halfMoveClock?: number;
}

export class BoardState {
  public squares: (Piece | null)[];
  public enPassantTarget: number | null;
  public castlingRights: CastlingRights;
  public graveyard: { white: Piece[]; black: Piece[] };
  public nextPieceId: number;
  public halfMoveClock: number;

  constructor() {
    this.squares = new Array<Piece | null>(64).fill(null);
    this.enPassantTarget = null;
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.graveyard = { white: [], black: [] };
    this.nextPieceId = 1;
    this.halfMoveClock = 0;
  }

  public static createInitial(): BoardState {
    const board = new BoardState();
    board.setupInitial();
    return board;
  }

  public static fromSnapshot(snap: BoardSnapshot): BoardState {
    const board = new BoardState();
    board.squares = snap.squares.map((p) => (p ? { ...p } : null));
    board.enPassantTarget = snap.enPassantTarget;
    board.castlingRights = { ...snap.castlingRights };
    board.graveyard = {
      white: snap.graveyard.white.map((p) => ({ ...p })),
      black: snap.graveyard.black.map((p) => ({ ...p })),
    };
    board.nextPieceId = snap.nextPieceId;
    board.halfMoveClock = snap.halfMoveClock ?? 0;
    return board;
  }

  public toSnapshot(): BoardSnapshot {
    return {
      squares: this.squares.map((p) => (p ? { ...p } : null)),
      enPassantTarget: this.enPassantTarget,
      castlingRights: { ...this.castlingRights },
      graveyard: {
        white: this.graveyard.white.map((p) => ({ ...p })),
        black: this.graveyard.black.map((p) => ({ ...p })),
      },
      nextPieceId: this.nextPieceId,
      halfMoveClock: this.halfMoveClock,
    };
  }

  public setupInitial(): void {
    this.squares.fill(null);
    this.enPassantTarget = null;
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.graveyard = { white: [], black: [] };
    this.nextPieceId = 1;
    this.halfMoveClock = 0;

    const backRank: PieceType[] = [
      'rook',
      'knight',
      'bishop',
      'queen',
      'king',
      'bishop',
      'knight',
      'rook',
    ];

    for (let col = 0; col < 8; col++) {
      this.squares[toSq(0, col)] = this.makePiece(backRank[col], 'white');
      this.squares[toSq(1, col)] = this.makePiece('pawn', 'white');
      this.squares[toSq(6, col)] = this.makePiece('pawn', 'black');
      this.squares[toSq(7, col)] = this.makePiece(backRank[col], 'black');
    }
  }

  public makePiece(type: PieceType, color: PieceColor): Piece {
    return {
      id: this.nextPieceId++,
      type,
      color,
      hasMoved: false,
    };
  }

  public clone(): BoardState {
    return BoardState.fromSnapshot(this.toSnapshot());
  }

  public findKing(color: PieceColor): number {
    for (let i = 0; i < 64; i++) {
      const p = this.squares[i];
      if (p && p.color === color && p.type === 'king') {
        return i;
      }
    }
    return -1;
  }

  public hasKing(color: PieceColor): boolean {
    return this.findKing(color) !== -1;
  }

  /**
   * Detects positions where checkmate is impossible with the pieces currently on the board:
   * - 'king_vs_king': only the two Kings remain
   * - 'insufficient_minor': King + single Bishop or Knight vs King
   * - 'none': sufficient mating material remains
   */
  public getInsufficientMaterialState(): InsufficientMaterialState {
    const nonKings: Piece[] = [];
    for (let i = 0; i < 64; i++) {
      const p = this.squares[i];
      if (!p || p.type === 'king') continue;
      nonKings.push(p);
      if (nonKings.length > 1) return 'none';
    }
    if (nonKings.length === 0) return 'king_vs_king';
    const only = nonKings[0];
    if (only.type === 'bishop' || only.type === 'knight') {
      return 'insufficient_minor';
    }
    return 'none';
  }

  public getPositionKey(turnColor: PieceColor): string {
    let s = turnColor === 'white' ? 'w:' : 'b:';
    for (let i = 0; i < 64; i++) {
      const p = this.squares[i];
      if (!p) {
        s += '.';
      } else {
        const ch =
          p.type === 'knight'
            ? 'n'
            : p.type[0];
        s += p.color === 'white' ? ch.toUpperCase() : ch;
      }
    }
    return s;
  }

  public isInCheck(color: PieceColor): boolean {
    const kingSq = this.findKing(color);
    if (kingSq === -1) return false;
    return this.isSquareAttacked(kingSq, oppositeColor(color));
  }

  public isSquareAttacked(sq: number, byColor: PieceColor): boolean {
    const r = sqRow(sq);
    const c = sqCol(sq);

    // Pawn attacks
    const pawnDir = byColor === 'white' ? -1 : 1; // white pawns attack upward (so attacker is at r - 1)
    for (const dc of [-1, 1]) {
      const pr = r + pawnDir;
      const pc = c + dc;
      if (inBounds(pr, pc)) {
        const p = this.squares[toSq(pr, pc)];
        if (p && p.color === byColor && p.type === 'pawn') return true;
      }
    }

    // Knight attacks
    const knightOffsets = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = this.squares[toSq(nr, nc)];
        if (p && p.color === byColor && p.type === 'knight') return true;
      }
    }

    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const kr = r + dr;
        const kc = c + dc;
        if (inBounds(kr, kc)) {
          const p = this.squares[toSq(kr, kc)];
          if (p && p.color === byColor && p.type === 'king') return true;
        }
      }
    }

    // Rook / Queen orthogonal rays
    const orthoDirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dr, dc] of orthoDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = this.squares[toSq(nr, nc)];
        if (p) {
          if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // Bishop / Queen diagonal rays
    const diagDirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dr, dc] of diagDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = this.squares[toSq(nr, nc)];
        if (p) {
          if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  public applyMove(move: ChessMove): AppliedMoveResult {
    const piece = this.squares[move.from];
    if (!piece) {
      throw new Error(`No piece at square ${move.from}`);
    }

    let captured: Piece | null = this.squares[move.to];
    let enPassantCaptureSq: number | null = null;

    if (move.isEnPassant) {
      const dir = piece.color === 'white' ? 1 : -1;
      enPassantCaptureSq = move.to - dir * 8;
      captured = this.squares[enPassantCaptureSq];
      this.squares[enPassantCaptureSq] = null;
    }

    if (captured && captured.type === 'king') {
      throw new Error(`Illegal king capture attempted from ${move.from} to ${move.to}`);
    }

    if (captured) {
      this.graveyard[captured.color].push({ ...captured });
    }

    // Update castling rights if king or rook moves or rook is captured
    if (piece.type === 'king') {
      if (piece.color === 'white') {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (piece.type === 'rook') {
      if (move.from === toSq(0, 0)) this.castlingRights.wQ = false;
      if (move.from === toSq(0, 7)) this.castlingRights.wK = false;
      if (move.from === toSq(7, 0)) this.castlingRights.bQ = false;
      if (move.from === toSq(7, 7)) this.castlingRights.bK = false;
    }
    if (captured && captured.type === 'rook') {
      if (move.to === toSq(0, 0)) this.castlingRights.wQ = false;
      if (move.to === toSq(0, 7)) this.castlingRights.wK = false;
      if (move.to === toSq(7, 0)) this.castlingRights.bQ = false;
      if (move.to === toSq(7, 7)) this.castlingRights.bK = false;
    }

    // Move piece
    this.squares[move.from] = null;
    const movedPiece: Piece = {
      ...piece,
      type: move.promotion ?? piece.type,
      hasMoved: true,
    };
    this.squares[move.to] = movedPiece;

    // Handle castling rook move
    if (move.isCastleKingSide) {
      const row = sqRow(move.from);
      const rookFrom = toSq(row, 7);
      const rookTo = toSq(row, 5);
      const rook = this.squares[rookFrom];
      if (rook) {
        this.squares[rookFrom] = null;
        this.squares[rookTo] = { ...rook, hasMoved: true };
      }
    } else if (move.isCastleQueenSide) {
      const row = sqRow(move.from);
      const rookFrom = toSq(row, 0);
      const rookTo = toSq(row, 3);
      const rook = this.squares[rookFrom];
      if (rook) {
        this.squares[rookFrom] = null;
        this.squares[rookTo] = { ...rook, hasMoved: true };
      }
    }

    // En passant resets after EVERY individual half-move unless double pawn push
    this.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(sqRow(move.to) - sqRow(move.from)) === 2) {
      const midRow = (sqRow(move.from) + sqRow(move.to)) / 2;
      this.enPassantTarget = toSq(midRow, sqCol(move.from));
    }

    // Update 50-move half-move clock (resets on pawn move or capture)
    if (piece.type === 'pawn' || captured !== null) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    return {
      captured,
      movedPiece,
      promotedTo: move.promotion,
    };
  }

  public resurrectPiece(pieceId: number, color: PieceColor, toSquare: number): Piece {
    const list = this.graveyard[color];
    const idx = list.findIndex((p) => p.id === pieceId);
    if (idx === -1) {
      throw new Error(`Piece ${pieceId} not found in ${color} graveyard`);
    }
    const [piece] = list.splice(idx, 1);
    const restored: Piece = { ...piece, hasMoved: true };
    this.squares[toSquare] = restored;
    // Placing a resurrected piece consumes any transient en passant window and resets 50-move clock
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    return restored;
  }
}
