import { BoardState } from './boardState';
import {
  AIDifficulty,
  chooseAIMove,
  chooseAIResurrection,
  chooseAIWildAction,
} from './chessAI';
import type { AIWorkerRequest, AIWorkerResponse } from './chessAI.worker';
import { ChessMove, PieceColor, PieceType } from './types';

interface PendingJob<T> {
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  generation: number;
}

class ChessAIWorkerClient {
  private worker: Worker | null = null;
  private workerFailed = false;
  private nextId = 1;
  private generation = 0;
  private pending = new Map<number, PendingJob<unknown>>();

  private getWorker(): Worker | null {
    if (this.workerFailed || typeof Worker === 'undefined') return null;
    if (this.worker) return this.worker;
    try {
      const w = new Worker(new URL('./chessAI.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<AIWorkerResponse>) => {
        const job = this.pending.get(e.data.id);
        if (!job) return;
        this.pending.delete(e.data.id);
        if (job.generation !== this.generation) {
          job.reject(new Error('AI_CANCELLED'));
          return;
        }
        job.resolve(e.data.result);
      };
      w.onerror = () => {
        this.workerFailed = true;
        this.worker?.terminate();
        this.worker = null;
        for (const [id, job] of this.pending.entries()) {
          this.pending.delete(id);
          job.reject(new Error('AI_WORKER_ERROR'));
        }
      };
      this.worker = w;
      return w;
    } catch {
      this.workerFailed = true;
      return null;
    }
  }

  public cancelPending(): void {
    this.generation++;
    for (const [id, job] of this.pending.entries()) {
      this.pending.delete(id);
      job.reject(new Error('AI_CANCELLED'));
    }
  }

  public getGeneration(): number {
    return this.generation;
  }

  private dispatch<T>(reqBuilder: (id: number) => AIWorkerRequest, fallback: () => T): Promise<T> {
    const gen = this.generation;
    const worker = this.getWorker();
    if (!worker) {
      return Promise.resolve().then(() => {
        if (gen !== this.generation) throw new Error('AI_CANCELLED');
        return fallback();
      });
    }

    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        generation: gen,
      });
      worker.postMessage(reqBuilder(id));
    }).catch((err: unknown) => {
      if (err instanceof Error && err.message === 'AI_CANCELLED') {
        throw err;
      }
      if (gen !== this.generation) {
        throw new Error('AI_CANCELLED');
      }
      return fallback();
    });
  }

  public chooseMoveAsync(
    board: BoardState,
    aiColor: PieceColor,
    difficulty: AIDifficulty,
    movesLeft: number,
    recentPositionKeys: string[],
  ): Promise<ChessMove | null> {
    const snapshot = board.toSnapshot();
    const recentCopy = [...recentPositionKeys];
    return this.dispatch(
      (id) => ({
        id,
        kind: 'move',
        snapshot,
        aiColor,
        difficulty,
        movesLeft,
        recentPositionKeys: recentCopy,
      }),
      () => chooseAIMove(board, aiColor, difficulty, Math.random, movesLeft, recentCopy),
    );
  }

  public chooseResurrectionAsync(
    board: BoardState,
    aiColor: PieceColor,
  ): Promise<{ pieceId: number; square: number } | null> {
    const snapshot = board.toSnapshot();
    return this.dispatch(
      (id) => ({
        id,
        kind: 'resurrect',
        snapshot,
        aiColor,
      }),
      () => chooseAIResurrection(board, aiColor),
    );
  }

  public chooseWildActionAsync(
    board: BoardState,
    aiColor: PieceColor,
    difficulty: AIDifficulty,
  ): Promise<{ square: number; targetType: Exclude<PieceType, 'king'>; move: ChessMove } | null> {
    const snapshot = board.toSnapshot();
    return this.dispatch(
      (id) => ({
        id,
        kind: 'wild',
        snapshot,
        aiColor,
        difficulty,
      }),
      () => chooseAIWildAction(board, aiColor, difficulty),
    );
  }
}

export const aiWorkerClient = new ChessAIWorkerClient();
