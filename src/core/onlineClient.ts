import type { BoardSnapshot } from './chess/boardState';
import type { ChessMove, PieceColor, PieceType, PromotablePieceType } from './chess/types';
import type { CardType } from './deck/cardData';
import type { CoinSide } from './match/matchEngine';

export type OnlineMode = 'classic' | 'survival';
export type RoomVisibility = 'public' | 'private';
export type StartingHp = 1 | 2 | 3;
export type SeatRole = 'host' | 'guest';

export interface PublicRoomListing {
  code: string;
  mode: OnlineMode;
  startingHp: StartingHp;
  hostNickname: string;
  hostAvatarId: string;
  hostFriendCode?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type OnlineMatchPhase =
  | 'LOBBY'
  | 'AWAIT_DRAW_CARD'
  | 'PLAYER_MOVE_LOOP'
  | 'AWAIT_RESURRECT_PLACEMENT'
  | 'AWAIT_WILD_ACTION'
  | 'AWAIT_COIN_CHOICE'
  | 'MATCH_OVER';

export type OnlineMatchEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'revolver_hp_zero'
  | 'insufficient_material'
  | 'repetition'
  | 'fifty_move'
  | 'draw_agreed'
  | 'resignation'
  | 'disconnect_forfeit'
  | 'disconnect_timeout';

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'SEAT_RESERVED'
  | 'NOT_YOUR_TURN'
  | 'INVALID_PHASE'
  | 'INVALID_ACTION'
  | 'HOST_ONLY';

export interface OnlinePlayerSlot {
  seat: SeatRole;
  nickname: string;
  avatarId: string;
  friendCode?: string | null;
  connected: boolean;
  disconnected?: boolean;
  ready: boolean;
  rematchRequested: boolean;
  color: PieceColor;
  hp: number;
  thinkTimeMs: number;
  turnsCount: number;
  disconnectedAt: number | null;
  reconnectDeadline?: number | null;
}

export interface OnlineResurrectOption {
  pieceId: number;
  type: PieceType;
  legalSquares: number[];
}

export interface OnlineMatchEvent {
  type:
    | 'CARD_DRAWN'
    | 'PIECE_MOVED'
    | 'SKIP_TURN'
    | 'BOARD_REVERSED'
    | 'PIECE_RESURRECTED'
    | 'WILD_MOVED'
    | 'COIN_RESOLVED'
    | 'BOARD_RESET_STALEMATE'
    | 'MATCH_ENDED';
  actor?: SeatRole;
  card?: CardType;
  reshuffled?: boolean;
  convertedFromResurrect?: boolean;
  redrawReason?: 'check_skip';
  convertedFromCheckSkip?: boolean;
  move?: ChessMove;
  isCheck?: boolean;
  captured?: boolean;
  streakInterrupted?: boolean;
  pieceId?: number;
  pieceType?: PieceType;
  square?: number;
  targetType?: Exclude<PieceType, 'king'>;
  drawer?: SeatRole;
  guesser?: SeatRole;
  guessed?: CoinSide;
  actual?: CoinSide;
  guessedRight?: boolean;
  targetHpAfter?: number;
  winner?: SeatRole | 'draw';
  reason?: OnlineMatchEndReason;
}

export interface OnlineEndPlayerSummary {
  seat: SeatRole;
  nickname: string;
  avatarId: string;
  friendCode?: string | null;
  thinkTimeMs: number;
  turnsCount: number;
  avgTurnMs: number;
}

export interface OnlineMatchEndSummary {
  winner: SeatRole | 'draw';
  reason: OnlineMatchEndReason;
  mode: OnlineMode;
  startingHp: StartingHp;
  players: {
    host: OnlineEndPlayerSummary;
    guest: OnlineEndPlayerSummary;
  };
}

export interface OnlineRoomView {
  roomCode: string;
  mode: OnlineMode;
  visibility?: RoomVisibility;
  startingHp: StartingHp;
  maxHp: number;
  phase: OnlineMatchPhase;
  yourSeat: SeatRole;
  activeSeat: SeatRole;
  actingSeat: SeatRole;
  turnStartedAt: number | null;
  timerPaused: boolean;
  serverNow: number;
  players: {
    host: OnlinePlayerSlot | null;
    guest: OnlinePlayerSlot | null;
  };
  yourHand: CardType[];
  opponentHandCount: number;
  deckCount: number;
  currentCard: CardType | null;
  movesLeft: number;
  resurrectsLeft: number;
  isInCheck: boolean;
  isKingVsKing: boolean;
  board: BoardSnapshot | null;
  resurrectOptions: OnlineResurrectOption[];
  drawOfferFrom: SeatRole | null;
  winner: SeatRole | 'draw' | null;
  endReason: OnlineMatchEndReason | null;
  endSummary: OnlineMatchEndSummary | null;
  canClaimDisconnectWin: boolean;
}

export type OnlineConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export const STARTING_HP_OPTIONS: readonly StartingHp[] = [3, 2, 1] as const;

export const PROD_MP_SERVER_URL = 'wss://chuno-mp-server.kizaru0260.workers.dev';
export const DEV_MP_SERVER_URL = 'ws://127.0.0.1:8787';

export function resolveMpServerUrl(): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {};
    const configured = typeof env.VITE_MP_SERVER_URL === 'string' ? env.VITE_MP_SERVER_URL.trim() : '';
    if (configured) return configured.replace(/\/+$/, '');
    if (env.DEV === false || env.PROD === true) {
      return PROD_MP_SERVER_URL;
    }
  } catch {
    // Node/test environment
  }
  return DEV_MP_SERVER_URL;
}

export function wsUrlToHttpBase(wsUrl: string): string {
  const trimmed = wsUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice(6)}`;
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice(5)}`;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;
  return `http://${trimmed}`;
}

export function formatThinkTimeMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseRoomCodeFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('room');
    if (!raw) return null;
    const cleaned = raw.trim().toUpperCase();
    return /^CH-[A-Z0-9]{4}$/.test(cleaned) ? cleaned : null;
  } catch {
    return null;
  }
}

export function buildRoomInviteUrl(roomCode: string): string {
  const clean = roomCode.trim().toUpperCase();
  if (typeof window !== 'undefined' && window.location) {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?room=${encodeURIComponent(clean)}`;
  }
  return `?room=${encodeURIComponent(clean)}`;
}

const SESSION_TOKEN_KEY = 'chuno_mp_player_token';
export const ACTIVE_ONLINE_SESSION_KEY = 'chuno_active_online_session';
export const ACTIVE_ONLINE_SESSION_MAX_AGE_MS = 120_000;

export interface ActiveOnlineSession {
  roomCode: string;
  playerToken: string;
  mode: OnlineMode;
  opponentNickname: string;
  updatedAt: number;
}

export function saveActiveOnlineSession(
  session: Omit<ActiveOnlineSession, 'updatedAt'> & { updatedAt?: number },
  storage?: Pick<Storage, 'setItem'>,
): ActiveOnlineSession {
  const payload: ActiveOnlineSession = {
    roomCode: session.roomCode.trim().toUpperCase(),
    playerToken: session.playerToken.trim(),
    mode: session.mode === 'survival' ? 'survival' : 'classic',
    opponentNickname: session.opponentNickname.trim() || 'Opponent',
    updatedAt: session.updatedAt ?? Date.now(),
  };
  try {
    const target =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    target?.setItem(ACTIVE_ONLINE_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
  return payload;
}

export function clearActiveOnlineSession(storage?: Pick<Storage, 'removeItem'>): void {
  try {
    const target =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    target?.removeItem(ACTIVE_ONLINE_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function loadActiveOnlineSession(opts?: {
  storage?: Pick<Storage, 'getItem' | 'removeItem'>;
  now?: number;
}): ActiveOnlineSession | null {
  try {
    const target =
      opts?.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const raw = target?.getItem(ACTIVE_ONLINE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveOnlineSession>;
    const roomCode = typeof parsed.roomCode === 'string' ? parsed.roomCode.trim().toUpperCase() : '';
    const playerToken = typeof parsed.playerToken === 'string' ? parsed.playerToken.trim() : '';
    const updatedAt = typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0;
    const nowTs = opts?.now ?? Date.now();
    if (!/^CH-[A-Z0-9]{4}$/.test(roomCode) || playerToken.length < 4 || updatedAt <= 0) {
      target?.removeItem(ACTIVE_ONLINE_SESSION_KEY);
      return null;
    }
    if (nowTs - updatedAt > ACTIVE_ONLINE_SESSION_MAX_AGE_MS) {
      target?.removeItem(ACTIVE_ONLINE_SESSION_KEY);
      return null;
    }
    return {
      roomCode,
      playerToken,
      mode: parsed.mode === 'survival' ? 'survival' : 'classic',
      opponentNickname:
        typeof parsed.opponentNickname === 'string' && parsed.opponentNickname.trim().length > 0
          ? parsed.opponentNickname.trim()
          : 'Opponent',
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function computeReconnectBackoffMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(4000, 1000 * 2 ** (safeAttempt - 1));
}

export function getReconnectRemainingSeconds(
  deadlineMs: number | null | undefined,
  serverClockOffsetMs = 0,
  nowMs: number = Date.now(),
): number {
  if (typeof deadlineMs !== 'number' || !Number.isFinite(deadlineMs)) return 0;
  const serverNow = nowMs + serverClockOffsetMs;
  return Math.max(0, Math.ceil((deadlineMs - serverNow) / 1000));
}

export function getOrCreatePlayerToken(): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const existing = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (existing && existing.length >= 8) return existing;
      const fresh = `PT-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, fresh);
      return fresh;
    }
  } catch {
    // ignore
  }
  return `PT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export function formatPublicRoomModeBadge(
  room: Pick<PublicRoomListing, 'mode' | 'startingHp'>,
  language: 'en' | 'ru' | 'uz',
): string {
  if (room.mode === 'survival') {
    const label =
      language === 'ru' ? 'Выживание' : language === 'uz' ? 'Omon qolish' : 'Survival';
    return `${label} · ${room.startingHp} HP`;
  }
  return language === 'ru' ? 'Классический' : language === 'uz' ? 'Klassik' : 'Classic';
}

export async function createOnlineRoom(
  mode: OnlineMode,
  startingHp: StartingHp,
  opts?: {
    visibility?: RoomVisibility;
    hostNickname?: string;
    hostAvatarId?: string;
    hostFriendCode?: string;
  },
  serverUrl: string = resolveMpServerUrl(),
): Promise<{
  roomCode: string;
  mode: OnlineMode;
  startingHp: StartingHp;
  visibility: RoomVisibility;
}> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  const res = await fetch(`${httpBase}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      startingHp,
      visibility: opts?.visibility ?? 'public',
      hostNickname: opts?.hostNickname,
      hostAvatarId: opts?.hostAvatarId,
      hostFriendCode: opts?.hostFriendCode,
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as {
    roomCode: string;
    mode: OnlineMode;
    startingHp: StartingHp;
    visibility: RoomVisibility;
  };
}

export async function fetchPublicRooms(
  mode?: OnlineMode,
  serverUrl: string = resolveMpServerUrl(),
): Promise<PublicRoomListing[]> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  const q = mode ? `?mode=${encodeURIComponent(mode)}` : '';
  const res = await fetch(`${httpBase}/api/rooms/public${q}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { rooms?: PublicRoomListing[] };
  return Array.isArray(data.rooms) ? data.rooms : [];
}

export async function requestQuickMatch(
  params: {
    mode: OnlineMode;
    startingHp?: StartingHp;
    nickname: string;
    avatarId: string;
    friendCode?: string;
  },
  serverUrl: string = resolveMpServerUrl(),
): Promise<{
  roomCode: string;
  mode: OnlineMode;
  startingHp: StartingHp;
  visibility: RoomVisibility;
  created: boolean;
}> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  const res = await fetch(`${httpBase}/api/matchmaking/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as {
    roomCode: string;
    mode: OnlineMode;
    startingHp: StartingHp;
    visibility: RoomVisibility;
    created: boolean;
  };
}

export async function fetchFriendsOnlineRooms(
  friendCodes: string[],
  serverUrl: string = resolveMpServerUrl(),
): Promise<Record<string, PublicRoomListing>> {
  if (friendCodes.length === 0) return {};
  const httpBase = wsUrlToHttpBase(serverUrl);
  const res = await fetch(`${httpBase}/api/friends/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendCodes }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { rooms?: Record<string, PublicRoomListing> };
  return data.rooms && typeof data.rooms === 'object' ? data.rooms : {};
}

export interface OnlineEmoteEvent {
  type: 'emote_event';
  senderRole: SeatRole;
  emoteId: string;
  sentAt: number;
}

export type OnlineSocialNotifyAction =
  | 'request_sent'
  | 'request_accepted'
  | 'request_declined'
  | 'friend_removed';

export interface OnlineSocialUpdateEvent {
  type: 'social_update';
  fromCode: string;
  action: OnlineSocialNotifyAction;
  sentAt: number;
}

export interface OnlineOpponentDisconnectedEvent {
  type: 'opponent_disconnected';
  disconnectedRole: SeatRole;
  reconnectDeadline: number;
  roomCode: string;
}

export interface OnlineOpponentReconnectedEvent {
  type: 'opponent_reconnected';
  reconnectedRole: SeatRole;
  roomCode: string;
}

export interface OnlineClientCallbacks {
  onStatus?: (status: OnlineConnectionStatus) => void;
  onState?: (state: OnlineRoomView, events?: OnlineMatchEvent[]) => void;
  onMatchEnded?: (summary: OnlineMatchEndSummary, state: OnlineRoomView) => void;
  onOpponentDisconnected?: (event: OnlineOpponentDisconnectedEvent) => void;
  onOpponentReconnected?: (event: OnlineOpponentReconnectedEvent) => void;
  onEmote?: (event: OnlineEmoteEvent) => void;
  onSocialUpdate?: (event: OnlineSocialUpdateEvent) => void;
  onError?: (code: RoomErrorCode | 'CONNECTION_ERROR', message: string) => void;
}

export class OnlineRoomClient {
  private ws: WebSocket | null = null;
  private closedManually = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly serverUrl: string;
  private readonly callbacks: OnlineClientCallbacks;
  private lastJoinPayload: {
    roomCode: string;
    nickname: string;
    avatarId: string;
    friendCode?: string;
    playerToken: string;
    mode?: OnlineMode;
    startingHp?: StartingHp;
    visibility?: RoomVisibility;
    createIfMissing?: boolean;
  } | null = null;

  constructor(callbacks: OnlineClientCallbacks, serverUrl: string = resolveMpServerUrl()) {
    this.callbacks = callbacks;
    this.serverUrl = serverUrl.replace(/\/+$/, '');
  }

  public getCurrentPlayerToken(): string {
    return this.lastJoinPayload?.playerToken ?? getOrCreatePlayerToken();
  }

  public connect(params: {
    roomCode: string;
    nickname: string;
    avatarId: string;
    friendCode?: string;
    playerToken?: string;
    mode?: OnlineMode;
    startingHp?: StartingHp;
    visibility?: RoomVisibility;
    createIfMissing?: boolean;
  }): void {
    this.closedManually = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.lastJoinPayload = {
      ...params,
      roomCode: params.roomCode.trim().toUpperCase(),
      playerToken: params.playerToken ?? getOrCreatePlayerToken(),
    };
    this.openSocket(false);
  }

  private openSocket(isReconnect: boolean): void {
    if (!this.lastJoinPayload) return;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.callbacks.onStatus?.(isReconnect ? 'reconnecting' : 'connecting');
    const wsBase = this.serverUrl.startsWith('http://')
      ? `ws://${this.serverUrl.slice(7)}`
      : this.serverUrl.startsWith('https://')
        ? `wss://${this.serverUrl.slice(8)}`
        : this.serverUrl;
    const url = `${wsBase}/ws/room/${encodeURIComponent(this.lastJoinPayload.roomCode)}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.callbacks.onStatus?.('error');
      this.callbacks.onError?.('CONNECTION_ERROR', 'Unable to open WebSocket connection');
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempts = 0;
      this.callbacks.onStatus?.('connected');
      if (this.lastJoinPayload) {
        this.send({
          type: 'join',
          nickname: this.lastJoinPayload.nickname,
          avatarId: this.lastJoinPayload.avatarId,
          friendCode: this.lastJoinPayload.friendCode,
          playerToken: this.lastJoinPayload.playerToken,
          mode: this.lastJoinPayload.mode,
          startingHp: this.lastJoinPayload.startingHp,
          visibility: this.lastJoinPayload.visibility,
          createIfMissing: this.lastJoinPayload.createIfMissing,
        });
      }
    };

    socket.onmessage = (ev) => {
      if (this.ws !== socket || typeof ev.data !== 'string') return;
      try {
        const msg = JSON.parse(ev.data) as
          | { type: 'joined'; state: OnlineRoomView }
          | { type: 'room_state'; state: OnlineRoomView; events?: OnlineMatchEvent[] }
          | { type: 'match_ended'; summary: OnlineMatchEndSummary; state: OnlineRoomView }
          | OnlineOpponentDisconnectedEvent
          | OnlineOpponentReconnectedEvent
          | OnlineEmoteEvent
          | OnlineSocialUpdateEvent
          | { type: 'error'; code: RoomErrorCode; message: string };

        if (msg.type === 'joined') {
          this.callbacks.onState?.(msg.state);
        } else if (msg.type === 'room_state') {
          this.callbacks.onState?.(msg.state, msg.events);
        } else if (msg.type === 'match_ended') {
          this.callbacks.onMatchEnded?.(msg.summary, msg.state);
        } else if (msg.type === 'opponent_disconnected') {
          this.callbacks.onOpponentDisconnected?.(msg);
        } else if (msg.type === 'opponent_reconnected') {
          this.callbacks.onOpponentReconnected?.(msg);
        } else if (msg.type === 'emote_event') {
          this.callbacks.onEmote?.(msg);
        } else if (msg.type === 'social_update') {
          this.callbacks.onSocialUpdate?.(msg);
        } else if (msg.type === 'error') {
          if (
            msg.code === 'ROOM_NOT_FOUND' ||
            msg.code === 'ROOM_FULL' ||
            msg.code === 'ROOM_IN_PROGRESS' ||
            msg.code === 'SEAT_RESERVED'
          ) {
            this.closedManually = true;
          }
          this.callbacks.onError?.(msg.code, msg.message);
        }
      } catch {
        // ignore malformed frame
      }
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      if (this.closedManually) {
        this.callbacks.onStatus?.('idle');
        return;
      }
      if (this.reconnectAttempts < 10) {
        this.reconnectAttempts++;
        this.callbacks.onStatus?.('reconnecting');
        const delay = computeReconnectBackoffMs(this.reconnectAttempts);
        this.reconnectTimer = window.setTimeout(() => this.openSocket(true), delay);
      } else {
        this.callbacks.onStatus?.('error');
        this.callbacks.onError?.('CONNECTION_ERROR', 'Lost connection to multiplayer server');
      }
    };

    socket.onerror = () => {
      // onclose will handle retry/error state cleanly
    };
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public updateProfile(nickname: string, avatarId: string, friendCode?: string): void {
    if (this.lastJoinPayload) {
      this.lastJoinPayload.nickname = nickname;
      this.lastJoinPayload.avatarId = avatarId;
      if (friendCode) this.lastJoinPayload.friendCode = friendCode;
    }
    this.send({ type: 'update_profile', nickname, avatarId, friendCode });
  }

  public setStartingHp(startingHp: StartingHp): void {
    this.send({ type: 'set_starting_hp', startingHp });
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'set_ready', ready });
  }

  public startMatch(): void {
    this.send({ type: 'start_match' });
  }

  public drawCard(): void {
    this.send({ type: 'draw_card' });
  }

  public movePiece(from: number, to: number, promotion?: PromotablePieceType): void {
    this.send({ type: 'move_piece', from, to, promotion });
  }

  public resurrectPiece(pieceId: number, square: number): void {
    this.send({ type: 'resurrect_piece', pieceId, square });
  }

  public wildMove(
    sourceSq: number,
    targetType: Exclude<PieceType, 'king'>,
    toSq: number,
    promotion?: PromotablePieceType,
  ): void {
    this.send({ type: 'wild_move', sourceSq, targetType, toSq, promotion });
  }

  public coinChoice(side: CoinSide): void {
    this.send({ type: 'coin_choice', side });
  }

  public offerDraw(): void {
    this.send({ type: 'offer_draw' });
  }

  public acceptDraw(): void {
    this.send({ type: 'accept_draw' });
  }

  public resign(): void {
    this.send({ type: 'resign' });
  }

  public claimDisconnectWin(): void {
    this.send({ type: 'claim_disconnect_win' });
  }

  public requestRematch(): void {
    this.send({ type: 'request_rematch' });
  }

  public sendEmote(emoteId: string): void {
    this.send({ type: 'send_emote', emoteId });
  }

  public notifySocial(action: OnlineSocialNotifyAction): void {
    this.send({ type: 'social_notify', action });
  }

  public disconnect(): void {
    this.closedManually = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closed');
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.callbacks.onStatus?.('idle');
  }
}
