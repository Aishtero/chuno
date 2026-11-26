import type { OnlineMatchEvent, OnlineMatchPhase, SeatRole } from './onlineClient';
import type { CameraPreset } from '../presentation/chunoScene';

export interface OnlineCameraTransition {
  immediatePreset: CameraPreset | null;
  delayedPreset?: CameraPreset;
  delayMs?: number;
}

const BOARD_INTERACTION_PHASES: ReadonlySet<OnlineMatchPhase> = new Set([
  'PLAYER_MOVE_LOOP',
  'AWAIT_WILD_ACTION',
  'AWAIT_RESURRECT_PLACEMENT',
]);

/**
 * Pure camera state resolver mirroring solo ChUno camera transitions for 1v1 online matches:
 * - On your card draw: briefly shows CAM_CARD_DRAW, then smoothly lifts to CAM_BOARD_TACTICAL
 *   whenever the drawn card requires board interaction (move loop, wild, resurrect).
 * - Whenever your turn enters a board-interaction phase: switches to CAM_BOARD_TACTICAL.
 * - On Bullet coin/revolver events: switches to CAM_COIN_FLIP -> CAM_REVOLVER (if shot) -> CAM_IDLE.
 * - When turn passes to opponent or returns to AWAIT_DRAW_CARD: returns to CAM_IDLE so the
 *   player sees the table and the opponent's 3D avatar.
 */
export function resolveOnlineAutoCamera(input: {
  prevPhase: OnlineMatchPhase | null;
  prevActiveSeat: SeatRole | null;
  nextPhase: OnlineMatchPhase;
  nextActiveSeat: SeatRole;
  yourSeat: SeatRole;
  events?: OnlineMatchEvent[];
}): OnlineCameraTransition {
  const { prevPhase, prevActiveSeat, nextPhase, nextActiveSeat, yourSeat, events } = input;
  const isMyTurn = nextActiveSeat === yourSeat;
  const phaseChanged = prevPhase !== nextPhase || prevActiveSeat !== nextActiveSeat;

  // 1. Coin flip / Revolver takes top priority in Survival 1v1
  const coinEvent = events?.find((e) => e.type === 'COIN_RESOLVED');
  if (coinEvent) {
    const shotFired = !coinEvent.guessedRight;
    return {
      immediatePreset: 'CAM_COIN_FLIP',
      delayedPreset: nextPhase === 'MATCH_OVER' ? undefined : 'CAM_IDLE',
      delayMs: shotFired ? 7400 : 4950,
    };
  }

  // 2. Active player just drew a card
  const drawEvent = events?.find((e) => e.type === 'CARD_DRAWN');
  if (drawEvent && drawEvent.actor === yourSeat) {
    if (BOARD_INTERACTION_PHASES.has(nextPhase) && isMyTurn) {
      return {
        immediatePreset: 'CAM_CARD_DRAW',
        delayedPreset: 'CAM_BOARD_TACTICAL',
        delayMs: 850,
      };
    }
    return {
      immediatePreset: 'CAM_CARD_DRAW',
      delayedPreset: 'CAM_IDLE',
      delayMs: 1000,
    };
  }

  // 3. No phase/turn change -> keep user's current manual or automatic camera untouched
  if (!phaseChanged) {
    return { immediatePreset: null };
  }

  // 4. Entering a board interaction phase on your turn (e.g. reconnect or direct transition)
  if (isMyTurn && BOARD_INTERACTION_PHASES.has(nextPhase)) {
    return { immediatePreset: 'CAM_BOARD_TACTICAL' };
  }

  // 5. Coin choice awaiting or opponent turn or awaiting next draw -> return to standard table view
  if (
    nextPhase === 'AWAIT_COIN_CHOICE' ||
    nextPhase === 'AWAIT_DRAW_CARD' ||
    !isMyTurn
  ) {
    return { immediatePreset: 'CAM_IDLE' };
  }

  return { immediatePreset: null };
}
