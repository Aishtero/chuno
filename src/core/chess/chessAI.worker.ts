import { BoardSnapshot, BoardState } from './boardState';
import {
  AIDifficulty,
  chooseAIMove,
  chooseAIResurrection,
  chooseAIWildAction,
} from './chessAI';
import { ChessMove, PieceColor, PieceType } from './types';

export type AIWorkerRequest =
  | {
      id: number;
      kind: 'move';
      snapshot: BoardSnapshot;
      aiColor: PieceColor;
      difficulty: AIDifficulty;
      movesLeft: number;
      recentPositionKeys: string[];
    }
  | {
      id: number;
      kind: 'resurrect';
      snapshot: BoardSnapshot;
      aiColor: PieceColor;
    }
  | {
      id: number;
      kind: 'wild';
      snapshot: BoardSnapshot;
      aiColor: PieceColor;
      difficulty: AIDifficulty;
    };

export type AIWorkerResponse =
  | { id: number; kind: 'move'; result: ChessMove | null }
  | { id: number; kind: 'resurrect'; result: { pieceId: number; square: number } | null }
  | {
      id: number;
      kind: 'wild';
      result: { square: number; targetType: Exclude<PieceType, 'king'>; move: ChessMove } | null;
    };

export function handleAIWorkerRequest(req: AIWorkerRequest): AIWorkerResponse {
  const board = BoardState.fromSnapshot(req.snapshot);
  if (req.kind === 'move') {
    const result = chooseAIMove(
      board,
      req.aiColor,
      req.difficulty,
      Math.random,
      req.movesLeft,
      req.recentPositionKeys,
    );
    return { id: req.id, kind: 'move', result };
  }
  if (req.kind === 'resurrect') {
    const result = chooseAIResurrection(board, req.aiColor);
    return { id: req.id, kind: 'resurrect', result };
  }
  const result = chooseAIWildAction(board, req.aiColor, req.difficulty);
  return { id: req.id, kind: 'wild', result };
}

const workerScope = typeof self !== 'undefined'
  ? (self as unknown as {
      onmessage: ((e: MessageEvent<AIWorkerRequest>) => void) | null;
      postMessage?: (msg: AIWorkerResponse) => void;
    })
  : null;

if (workerScope && typeof workerScope.postMessage === 'function' && typeof window === 'undefined') {
  workerScope.onmessage = (e: MessageEvent<AIWorkerRequest>) => {
    const res = handleAIWorkerRequest(e.data);
    workerScope.postMessage!(res);
  };
}
