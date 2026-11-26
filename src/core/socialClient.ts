import {
  OnlineMode,
  PublicRoomListing,
  StartingHp,
  resolveMpServerUrl,
  wsUrlToHttpBase,
} from './onlineClient';
import { normalizeFriendCode } from './profileManager';

export const INVITE_DURATION_MS = 20_000;

export type PresenceStatus = 'online' | 'in_match' | 'offline';

export type SocialNotifyAction =
  | 'request_sent'
  | 'request_accepted'
  | 'request_declined'
  | 'friend_removed';

export type SocialErrorCode =
  | 'INVALID_CODE'
  | 'SELF_REQUEST'
  | 'ALREADY_FRIENDS'
  | 'ALREADY_REQUESTED'
  | 'REQUEST_NOT_FOUND'
  | 'SERVER_OFFLINE';

export type SocialInviteErrorCode =
  | 'FRIEND_OFFLINE'
  | 'FRIEND_BUSY'
  | 'NOT_FRIENDS'
  | 'INVITE_NOT_FOUND'
  | 'INVALID_ACTION';

export interface SocialFriendItem {
  friendCode: string;
  nickname: string;
  avatarId: string;
  since: number;
  isOnline?: boolean;
  presenceStatus?: PresenceStatus;
  activeRoom?: PublicRoomListing | null;
}

export interface SocialFriendRequestItem {
  fromCode: string;
  fromNickname: string;
  fromAvatarId: string;
  toCode: string;
  toNickname: string;
  toAvatarId: string;
  createdAt: number;
}

export interface SocialStateSnapshot {
  friends: SocialFriendItem[];
  incomingRequests: SocialFriendRequestItem[];
  outgoingRequests: SocialFriendRequestItem[];
}

export interface GameInviteItem {
  inviteId: string;
  roomCode: string;
  fromCode: string;
  fromNickname: string;
  fromAvatarId: string;
  toCode: string;
  toNickname: string;
  toAvatarId: string;
  mode: OnlineMode;
  startingHp: StartingHp;
  createdAt: number;
  expiresAt: number;
}

export interface InviteAcceptedPayload {
  inviteId: string;
  roomCode: string;
  mode: OnlineMode;
  startingHp: StartingHp;
  peerCode: string;
  peerNickname: string;
  peerAvatarId: string;
}

export const EMPTY_SOCIAL_STATE: SocialStateSnapshot = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

export type OpponentRelationStatus = 'friend' | 'incoming' | 'outgoing' | 'none';

export function getInviteRemainingSeconds(expiresAt: number, now: number = Date.now()): number {
  const diff = expiresAt - now;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.ceil(diff / 1000);
}

export function getInviteProgressRatio(
  expiresAt: number,
  now: number = Date.now(),
  durationMs: number = INVITE_DURATION_MS,
): number {
  const diff = expiresAt - now;
  if (!Number.isFinite(diff) || diff <= 0 || durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, diff / durationMs));
}

export function sortFriendsByPresence(friends: SocialFriendItem[]): SocialFriendItem[] {
  const rank = (f: SocialFriendItem): number => {
    if (f.activeRoom) return 0;
    if (f.presenceStatus === 'online') return 1;
    if (f.presenceStatus === 'in_match') return 2;
    return 3;
  };
  return [...friends].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.since - a.since;
  });
}

/**
 * Resolves live relationship status with an opponent (for Lobby, HUD, and EndModal buttons).
 */
export function resolveOpponentRelation(
  opponentFriendCode: string | null | undefined,
  social: SocialStateSnapshot,
  localFriendCodes: readonly string[] = [],
): OpponentRelationStatus {
  const clean = normalizeFriendCode(opponentFriendCode ?? '');
  if (!clean) return 'none';
  if (
    social.friends.some((f) => normalizeFriendCode(f.friendCode) === clean) ||
    localFriendCodes.some((c) => normalizeFriendCode(c) === clean)
  ) {
    return 'friend';
  }
  if (social.incomingRequests.some((r) => normalizeFriendCode(r.fromCode) === clean)) {
    return 'incoming';
  }
  if (social.outgoingRequests.some((r) => normalizeFriendCode(r.toCode) === clean)) {
    return 'outgoing';
  }
  return 'none';
}

export async function syncSocialState(
  params: { friendCode: string; nickname: string; avatarId: string },
  serverUrl: string = resolveMpServerUrl(),
): Promise<SocialStateSnapshot> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  const res = await fetch(`${httpBase}/api/social/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as Partial<SocialStateSnapshot>;
  return {
    friends: Array.isArray(data.friends) ? sortFriendsByPresence(data.friends) : [],
    incomingRequests: Array.isArray(data.incomingRequests) ? data.incomingRequests : [],
    outgoingRequests: Array.isArray(data.outgoingRequests) ? data.outgoingRequests : [],
  };
}

export async function sendFriendRequest(
  params: {
    fromCode: string;
    fromNickname: string;
    fromAvatarId: string;
    toCode: string;
    toNickname?: string;
    toAvatarId?: string;
  },
  serverUrl: string = resolveMpServerUrl(),
): Promise<
  | { ok: true; status: 'sent' | 'auto_accepted'; state: SocialStateSnapshot }
  | { ok: false; error: SocialErrorCode }
> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  try {
    const res = await fetch(`${httpBase}/api/social/requests/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; status: 'sent' | 'auto_accepted'; state: SocialStateSnapshot }
      | { ok: false; error?: SocialErrorCode }
      | null;
    if (res.ok && data && data.ok) {
      return data;
    }
    return { ok: false, error: (data && !data.ok && data.error) || 'INVALID_CODE' };
  } catch {
    return { ok: false, error: 'SERVER_OFFLINE' };
  }
}

export async function respondFriendRequest(
  params: {
    friendCode: string;
    requesterCode: string;
    action: 'accept' | 'decline';
  },
  serverUrl: string = resolveMpServerUrl(),
): Promise<
  | { ok: true; action: 'accept' | 'decline'; state: SocialStateSnapshot }
  | { ok: false; error: SocialErrorCode }
> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  try {
    const res = await fetch(`${httpBase}/api/social/requests/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; action: 'accept' | 'decline'; state: SocialStateSnapshot }
      | { ok: false; error?: SocialErrorCode }
      | null;
    if (res.ok && data && data.ok) {
      return data;
    }
    return { ok: false, error: (data && !data.ok && data.error) || 'REQUEST_NOT_FOUND' };
  } catch {
    return { ok: false, error: 'SERVER_OFFLINE' };
  }
}

export async function cancelFriendRequest(
  params: { friendCode: string; targetCode: string },
  serverUrl: string = resolveMpServerUrl(),
): Promise<{ ok: true; state: SocialStateSnapshot } | { ok: false; error: SocialErrorCode }> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  try {
    const res = await fetch(`${httpBase}/api/social/requests/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; state: SocialStateSnapshot }
      | { ok: false; error?: SocialErrorCode }
      | null;
    if (res.ok && data && data.ok) {
      return { ok: true, state: data.state };
    }
    return { ok: false, error: (data && !data.ok && data.error) || 'INVALID_CODE' };
  } catch {
    return { ok: false, error: 'SERVER_OFFLINE' };
  }
}

export async function removeSocialFriend(
  params: { friendCode: string; targetCode: string },
  serverUrl: string = resolveMpServerUrl(),
): Promise<{ ok: true; state: SocialStateSnapshot } | { ok: false; error: SocialErrorCode }> {
  const httpBase = wsUrlToHttpBase(serverUrl);
  try {
    const res = await fetch(`${httpBase}/api/social/friends/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; state: SocialStateSnapshot }
      | { ok: false; error?: SocialErrorCode }
      | null;
    if (res.ok && data && data.ok) {
      return { ok: true, state: data.state };
    }
    return { ok: false, error: (data && !data.ok && data.error) || 'INVALID_CODE' };
  } catch {
    return { ok: false, error: 'SERVER_OFFLINE' };
  }
}

export interface SocialPresenceCallbacks {
  onSocialState?: (state: SocialStateSnapshot) => void;
  onFriendPresence?: (friendCode: string, isOnline: boolean, presenceStatus: PresenceStatus) => void;
  onInviteSent?: (invite: GameInviteItem) => void;
  onInviteIncoming?: (invite: GameInviteItem) => void;
  onInviteAccepted?: (payload: InviteAcceptedPayload) => void;
  onInviteDeclined?: (payload: { inviteId: string; targetCode: string; targetNickname: string }) => void;
  onInviteExpired?: (payload: { inviteId: string; fromCode: string; toCode: string; reason: 'expired' | 'cancelled' }) => void;
  onInviteError?: (code: SocialInviteErrorCode, message: string) => void;
}

/**
 * Lightweight persistent WebSocket client for `/ws/social/:friendCode`.
 * Handles live online/in_match/offline presence and 20s instant game invites.
 */
export class SocialPresenceClient {
  private ws: WebSocket | null = null;
  private closedManually = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly serverUrl: string;
  private readonly callbacks: SocialPresenceCallbacks;
  private lastParams: {
    friendCode: string;
    nickname: string;
    avatarId: string;
    status: 'online' | 'in_match';
  } | null = null;

  constructor(callbacks: SocialPresenceCallbacks, serverUrl: string = resolveMpServerUrl()) {
    this.callbacks = callbacks;
    this.serverUrl = serverUrl.replace(/\/+$/, '');
  }

  public connect(params: {
    friendCode: string;
    nickname: string;
    avatarId: string;
    status?: 'online' | 'in_match';
  }): void {
    const clean = normalizeFriendCode(params.friendCode);
    if (!clean) return;
    this.closedManually = false;
    this.reconnectAttempts = 0;
    this.lastParams = {
      friendCode: clean,
      nickname: params.nickname,
      avatarId: params.avatarId,
      status: params.status ?? 'online',
    };
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.lastParams || typeof WebSocket === 'undefined') return;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    const wsBase = this.serverUrl.startsWith('http://')
      ? `ws://${this.serverUrl.slice(7)}`
      : this.serverUrl.startsWith('https://')
        ? `wss://${this.serverUrl.slice(8)}`
        : this.serverUrl;
    const url = `${wsBase}/ws/social/${encodeURIComponent(this.lastParams.friendCode)}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempts = 0;
      if (this.lastParams) {
        this.send({
          type: 'hello',
          nickname: this.lastParams.nickname,
          avatarId: this.lastParams.avatarId,
          status: this.lastParams.status,
        });
      }
    };

    socket.onmessage = (ev) => {
      if (this.ws !== socket || typeof ev.data !== 'string') return;
      try {
        const msg = JSON.parse(ev.data) as
          | { type: 'social_state'; state: SocialStateSnapshot }
          | { type: 'friend_presence'; friendCode: string; isOnline: boolean; presenceStatus: PresenceStatus }
          | { type: 'invite_sent'; invite: GameInviteItem }
          | { type: 'invite_incoming'; invite: GameInviteItem }
          | ({ type: 'invite_accepted' } & InviteAcceptedPayload)
          | { type: 'invite_declined'; inviteId: string; targetCode: string; targetNickname: string }
          | { type: 'invite_expired'; inviteId: string; fromCode: string; toCode: string; reason: 'expired' | 'cancelled' }
          | { type: 'invite_error'; code: SocialInviteErrorCode; message: string };

        if (msg.type === 'social_state' && msg.state) {
          this.callbacks.onSocialState?.({
            friends: sortFriendsByPresence(msg.state.friends ?? []),
            incomingRequests: msg.state.incomingRequests ?? [],
            outgoingRequests: msg.state.outgoingRequests ?? [],
          });
        } else if (msg.type === 'friend_presence') {
          this.callbacks.onFriendPresence?.(msg.friendCode, msg.isOnline, msg.presenceStatus);
        } else if (msg.type === 'invite_sent') {
          this.callbacks.onInviteSent?.(msg.invite);
        } else if (msg.type === 'invite_incoming') {
          this.callbacks.onInviteIncoming?.(msg.invite);
        } else if (msg.type === 'invite_accepted') {
          this.callbacks.onInviteAccepted?.({
            inviteId: msg.inviteId,
            roomCode: msg.roomCode,
            mode: msg.mode,
            startingHp: msg.startingHp,
            peerCode: msg.peerCode,
            peerNickname: msg.peerNickname,
            peerAvatarId: msg.peerAvatarId,
          });
        } else if (msg.type === 'invite_declined') {
          this.callbacks.onInviteDeclined?.({
            inviteId: msg.inviteId,
            targetCode: msg.targetCode,
            targetNickname: msg.targetNickname,
          });
        } else if (msg.type === 'invite_expired') {
          this.callbacks.onInviteExpired?.({
            inviteId: msg.inviteId,
            fromCode: msg.fromCode,
            toCode: msg.toCode,
            reason: msg.reason,
          });
        } else if (msg.type === 'invite_error') {
          this.callbacks.onInviteError?.(msg.code, msg.message);
        }
      } catch {
        // ignore malformed message
      }
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      if (this.closedManually) return;
      if (this.reconnectAttempts < 10) {
        this.reconnectAttempts++;
        const delay = Math.min(8000, 1000 * this.reconnectAttempts);
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
      }
    };

    socket.onerror = () => {
      // Handled gracefully on close
    };
  }

  public send(payload: Record<string, unknown>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  public updateHello(nickname: string, avatarId: string, status: 'online' | 'in_match'): void {
    if (this.lastParams) {
      this.lastParams.nickname = nickname;
      this.lastParams.avatarId = avatarId;
      this.lastParams.status = status;
    }
    this.send({ type: 'hello', nickname, avatarId, status });
  }

  public setStatus(status: 'online' | 'in_match'): void {
    if (this.lastParams) {
      this.lastParams.status = status;
    }
    this.send({ type: 'set_status', status });
  }

  public sendInvite(targetCode: string, mode: OnlineMode, startingHp: StartingHp = 3): boolean {
    return this.send({ type: 'invite_send', targetCode, mode, startingHp });
  }

  public respondInvite(inviteId: string, action: 'accept' | 'decline'): boolean {
    return this.send({ type: 'invite_respond', inviteId, action });
  }

  public cancelInvite(inviteId: string): boolean {
    return this.send({ type: 'invite_cancel', inviteId });
  }

  public disconnect(): void {
    this.closedManually = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnected');
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
