import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Heart,
  Inbox,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  Swords,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { copyTextToClipboard } from '../core/clipboard';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import {
  OnlineMode,
  STARTING_HP_OPTIONS,
  StartingHp,
  formatPublicRoomModeBadge,
} from '../core/onlineClient';
import { PlayerProfile, normalizeFriendCode } from '../core/profileManager';
import {
  GameInviteItem,
  SocialErrorCode,
  SocialStateSnapshot,
  getInviteRemainingSeconds,
} from '../core/socialClient';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

export type FriendsModalTab = 'friends' | 'requests' | 'add';

interface FriendsModalProps {
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
  socialState: SocialStateSnapshot;
  loading?: boolean;
  initialTab?: FriendsModalTab;
  outgoingInvite?: GameInviteItem | null;
  inviteNotice?: { tone: 'info' | 'err'; text: string } | null;
  onRefresh: () => void;
  onSendRequest: (
    toCode: string,
  ) => Promise<{ ok: true; status: 'sent' | 'auto_accepted' } | { ok: false; error: SocialErrorCode }>;
  onRespondRequest: (requesterCode: string, action: 'accept' | 'decline') => Promise<void>;
  onCancelRequest: (targetCode: string) => Promise<void>;
  onRemoveFriend: (targetCode: string) => Promise<void>;
  onSendGameInvite: (targetCode: string, onlineMode: OnlineMode, startingHp: StartingHp) => void;
  onCancelGameInvite: (inviteId: string) => void;
  onJoinFriendRoom: (roomCode: string) => void;
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  profile,
  language,
  mode,
  socialState,
  loading = false,
  initialTab,
  outgoingInvite = null,
  inviteNotice = null,
  onRefresh,
  onSendRequest,
  onRespondRequest,
  onCancelRequest,
  onRemoveFriend,
  onSendGameInvite,
  onCancelGameInvite,
  onJoinFriendRoom,
  onClose,
}) => {
  const isSurv = mode === 'survival';
  const isRu = language === 'ru';
  const isUz = language === 'uz';

  const defaultTab: FriendsModalTab =
    initialTab ?? (socialState.incomingRequests.length > 0 ? 'requests' : 'friends');
  const [tab, setTab] = useState<FriendsModalTab>(defaultTab);
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [copiedMyCode, setCopiedMyCode] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [invitePickerCode, setInvitePickerCode] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<OnlineMode>(mode === 'survival' ? 'survival' : 'classic');
  const [inviteHp, setInviteHp] = useState<StartingHp>(3);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!outgoingInvite) return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [outgoingInvite]);

  const copy = useMemo(() => {
    if (isRu) {
      return {
        title: 'Друзья',
        tabFriends: 'Мои друзья',
        tabRequests: 'Заявки',
        tabAdd: 'Добавить друга',
        emptyFriendsTitle: 'Список друзей пока пуст',
        emptyFriendsDesc:
          'Отправь заявку по коду друга (CHUNO-XXXX-XXXX), чтобы видеть открытые комнаты друзей и приглашать их в 1 клик.',
        goAddBtn: 'Добавить по коду',
        matchesLabel: 'Совместных матчей',
        waitingRoom: 'Ждёт в комнате',
        joinFriendBtn: 'Войти к другу',
        inviteBtn: 'Пригласить в комнату',
        inviteCopied: 'Ссылка скопирована!',
        removeBtn: 'Удалить',
        incomingHeading: 'Входящие заявки',
        outgoingHeading: 'Исходящие заявки',
        noIncoming: 'Нет входящих заявок.',
        noOutgoing: 'Нет исходящих заявок.',
        acceptBtn: 'Принять',
        declineBtn: 'Отклонить',
        waitingAnswer: 'Ожидание ответа',
        cancelBtn: 'Отменить',
        yourCodeHeading: 'Твой код друга',
        yourCodeHint: 'Поделись этим кодом с другом — аккаунты и пароли не нужны.',
        copyBtn: 'Скопировать',
        copiedBtn: 'Скопировано!',
        addHeading: 'Отправить заявку в друзья',
        codePlaceholder: 'CHUNO-XXXX-XXXX',
        sendBtn: 'Отправить заявку',
        msgSent: 'Заявка отправлена!',
        msgAutoAccepted: 'Встречная заявка — вы теперь друзья!',
        errInvalid: 'Неверный формат кода (пример: CHUNO-AB12-CD34).',
        errSelf: 'Нельзя отправить заявку самому себе.',
        errAlreadyFriends: 'Этот игрок уже у тебя в друзьях.',
        errAlreadyReq: 'Заявка этому игроку уже отправлена.',
        errOffline: 'Сервер мультиплеера недоступен. Попробуй позже.',
      };
    }
    if (isUz) {
      return {
        title: 'Do‘stlar',
        tabFriends: 'Do‘stlarim',
        tabRequests: 'So‘rovlar',
        tabAdd: 'Do‘st qo‘shish',
        emptyFriendsTitle: 'Do‘stlar ro‘yxati hozircha bo‘sh',
        emptyFriendsDesc:
          'Do‘stingiz kodiga (CHUNO-XXXX-XXXX) so‘rov yuboring — ularning ochiq xonalarini ko‘ring va bir bosishda taklif qiling.',
        goAddBtn: 'Kod orqali qo‘shish',
        matchesLabel: 'Birgalikdagi partiyalar',
        waitingRoom: 'Xonada kutmoqda',
        joinFriendBtn: 'Do‘st xonasiga kirish',
        inviteBtn: 'Xonaga taklif qilish',
        inviteCopied: 'Havola nusxalandi!',
        removeBtn: 'O‘chirish',
        incomingHeading: 'Kiruvchi so‘rovlar',
        outgoingHeading: 'Chiquvchi so‘rovlar',
        noIncoming: 'Kiruvchi so‘rovlar yo‘q.',
        noOutgoing: 'Chiquvchi so‘rovlar yo‘q.',
        acceptBtn: 'Qabul qilish',
        declineBtn: 'Rad etish',
        waitingAnswer: 'Javob kutilmoqda',
        cancelBtn: 'Bekor qilish',
        yourCodeHeading: 'Sizning do‘st kodingiz',
        yourCodeHint: 'Ushbu kodni do‘stingizga yuboring — akkaunt va parol shart emas.',
        copyBtn: 'Nusxalash',
        copiedBtn: 'Nusxalandi!',
        addHeading: 'Do‘stlik so‘rovi yuborish',
        codePlaceholder: 'CHUNO-XXXX-XXXX',
        sendBtn: 'So‘rov yuborish',
        msgSent: 'So‘rov yuborildi!',
        msgAutoAccepted: 'O‘zaro so‘rov — endi do‘stsizlar!',
        errInvalid: 'Kod formati noto‘g‘ri (namuna: CHUNO-AB12-CD34).',
        errSelf: 'O‘zingizga so‘rov yubora olmaysiz.',
        errAlreadyFriends: 'Bu o‘yinchi allaqachon do‘stlaringiz safida.',
        errAlreadyReq: 'Bu o‘yinchiga so‘rov allaqachon yuborilgan.',
        errOffline: 'Multiplayer serveri bilan aloqa yo‘q.',
      };
    }
    return {
      title: 'Friends',
      tabFriends: 'My Friends',
      tabRequests: 'Requests',
      tabAdd: 'Add Friend',
      emptyFriendsTitle: 'No confirmed friends yet',
      emptyFriendsDesc:
        'Send a request using a Friend Code (CHUNO-XXXX-XXXX) to see friends waiting in open rooms and invite them in one click.',
      goAddBtn: 'Add by Friend Code',
      matchesLabel: 'Matches together',
      waitingRoom: 'Waiting in room',
      joinFriendBtn: 'Join Friend',
      inviteBtn: 'Invite to Room',
      inviteCopied: 'Invite link copied!',
      removeBtn: 'Remove',
      incomingHeading: 'Incoming Requests',
      outgoingHeading: 'Outgoing Requests',
      noIncoming: 'No incoming requests.',
      noOutgoing: 'No outgoing requests.',
      acceptBtn: 'Accept',
      declineBtn: 'Decline',
      waitingAnswer: 'Waiting for response',
      cancelBtn: 'Cancel',
      yourCodeHeading: 'Your Friend Code',
      yourCodeHint: 'Share this code with friends — zero accounts or passwords required.',
      copyBtn: 'Copy',
      copiedBtn: 'Copied!',
      addHeading: 'Send a Friend Request',
      codePlaceholder: 'CHUNO-XXXX-XXXX',
      sendBtn: 'Send Request',
      msgSent: 'Friend request sent!',
      msgAutoAccepted: 'Mutual request — you are now friends!',
      errInvalid: 'Invalid code format (example: CHUNO-AB12-CD34).',
      errSelf: 'You cannot add yourself.',
      errAlreadyFriends: 'Already in your friends list.',
      errAlreadyReq: 'Request already sent to this player.',
      errOffline: 'Multiplayer server is unreachable right now.',
    };
  }, [isRu, isUz]);

  // Match-together counter lookup from local profile history
  const localMatchesByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of profile.friends ?? []) {
      const clean = normalizeFriendCode(f.friendCode);
      if (clean) map.set(clean, f.matchesTogether ?? 0);
    }
    return map;
  }, [profile.friends]);

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const boxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800'
    : 'bg-stone-50 border-stone-200';
  const mutedText = isSurv ? 'text-stone-400' : 'text-stone-600';

  const handleCopyMyCode = () => {
    soundManager.playClick();
    void copyTextToClipboard(profile.playerId).then(() => {
      setCopiedMyCode(true);
      window.setTimeout(() => setCopiedMyCode(false), 2000);
    });
  };

  const handleSubmitSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeFriendCode(codeInput);
    if (!cleaned) {
      setFeedback({ tone: 'err', text: copy.errInvalid });
      return;
    }
    if (cleaned === normalizeFriendCode(profile.playerId)) {
      setFeedback({ tone: 'err', text: copy.errSelf });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const res = await onSendRequest(cleaned);
    setSubmitting(false);
    if (!res.ok) {
      const errMap: Record<SocialErrorCode, string> = {
        INVALID_CODE: copy.errInvalid,
        SELF_REQUEST: copy.errSelf,
        ALREADY_FRIENDS: copy.errAlreadyFriends,
        ALREADY_REQUESTED: copy.errAlreadyReq,
        REQUEST_NOT_FOUND: copy.errInvalid,
        SERVER_OFFLINE: copy.errOffline,
      };
      setFeedback({ tone: 'err', text: errMap[res.error] ?? copy.errInvalid });
      return;
    }
    setCodeInput('');
    setFeedback({
      tone: 'ok',
      text: res.status === 'auto_accepted' ? copy.msgAutoAccepted : copy.msgSent,
    });
  };

  const totalRequests =
    socialState.incomingRequests.length + socialState.outgoingRequests.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="friends-modal"
      className="fixed inset-0 z-45 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl ${panelClass}`}>
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-2xl font-bold leading-none">{copy.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="friends-refresh-btn"
              onClick={() => {
                soundManager.playClick();
                onRefresh();
              }}
              aria-label="Refresh"
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isSurv
                  ? 'border-stone-800 text-stone-300 hover:bg-stone-900'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              data-testid="friends-modal-close"
              onClick={onClose}
              aria-label="Close"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isSurv
                  ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Clear Tabs: My Friends (N) | Requests (N) | Add Friend */}
        <div
          role="tablist"
          className={`flex items-center gap-1.5 px-5 py-3 border-b overflow-x-auto ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'friends'}
            data-testid="friends-tab-list"
            onClick={() => {
              soundManager.playClick();
              setTab('friends');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              tab === 'friends'
                ? isSurv
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 text-white'
                : isSurv
                  ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {copy.tabFriends} ({socialState.friends.length})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'requests'}
            data-testid="friends-tab-requests"
            onClick={() => {
              soundManager.playClick();
              setTab('requests');
            }}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              tab === 'requests'
                ? isSurv
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 text-white'
                : isSurv
                  ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>
              {copy.tabRequests} ({totalRequests})
            </span>
            {socialState.incomingRequests.length > 0 && (
              <span
                data-testid="friends-tab-incoming-badge"
                className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white font-mono-num text-[10px] font-bold"
              >
                {socialState.incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'add'}
            data-testid="friends-tab-add"
            onClick={() => {
              soundManager.playClick();
              setTab('add');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              tab === 'add'
                ? isSurv
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 text-white'
                : isSurv
                  ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{copy.tabAdd}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: My Friends */}
          {tab === 'friends' && (
            <div data-testid="friends-list-panel" className="space-y-3">
              {inviteNotice && (
                <div
                  role="status"
                  data-testid="friends-invite-notice"
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    inviteNotice.tone === 'err'
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  }`}
                >
                  {inviteNotice.text}
                </div>
              )}

              {socialState.friends.length === 0 ? (
                <div className={`p-6 rounded-xl border text-center space-y-3 ${boxClass}`}>
                  <Users className="w-8 h-8 mx-auto opacity-45" />
                  <div className="text-sm font-bold">{copy.emptyFriendsTitle}</div>
                  <p className={`text-xs max-w-sm mx-auto leading-relaxed ${mutedText}`}>
                    {copy.emptyFriendsDesc}
                  </p>
                  <button
                    type="button"
                    data-testid="friends-empty-go-add"
                    onClick={() => setTab('add')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{copy.goAddBtn}</span>
                  </button>
                </div>
              ) : (
                socialState.friends.map((friend) => {
                  const matches = localMatchesByCode.get(friend.friendCode) ?? 0;
                  const liveRoom = friend.activeRoom ?? null;
                  const status = friend.presenceStatus ?? (liveRoom ? 'online' : 'offline');
                  const isFriendOnline = status === 'online';
                  const isFriendInMatch = status === 'in_match';
                  const isWaitingThisFriend =
                    outgoingInvite !== null && outgoingInvite.toCode === friend.friendCode;
                  const inviteSecsLeft = isWaitingThisFriend
                    ? getInviteRemainingSeconds(outgoingInvite.expiresAt, nowTick)
                    : 0;
                  const pickerOpen = invitePickerCode === friend.friendCode && !isWaitingThisFriend;

                  const presenceLabel = isFriendOnline
                    ? isRu
                      ? 'В сети'
                      : isUz
                        ? 'Onlayn'
                        : 'Online'
                    : isFriendInMatch
                      ? isRu
                        ? 'В игре'
                        : isUz
                          ? 'O‘yinda'
                          : 'In Match'
                      : isRu
                        ? 'Не в сети'
                        : isUz
                          ? 'Oflayn'
                          : 'Offline';

                  const invitePlayLabel = isRu
                    ? 'Пригласить играть'
                    : isUz
                      ? 'O‘yinga taklif qilish'
                      : 'Invite to Play';
                  const sendInviteBtnLabel = isRu
                    ? 'Отправить приглашение'
                    : isUz
                      ? 'Taklif yuborish'
                      : 'Send Invite';
                  const classicLabel = isRu ? 'Классический' : isUz ? 'Klassik' : 'Classic';
                  const survivalLabel = isRu ? 'Выживание' : isUz ? 'Omon qolish' : 'Survival';

                  return (
                    <div
                      key={friend.friendCode}
                      data-testid={`friend-row-${friend.friendCode}`}
                      data-presence={status}
                      className={`p-3.5 rounded-xl border space-y-3 ${boxClass}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <PlayerAvatarPortrait avatarId={friend.avatarId} size={44} />
                            <span
                              data-testid={`friend-presence-dot-${friend.friendCode}`}
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                                isSurv ? 'border-stone-900' : 'border-white'
                              } ${
                                isFriendOnline
                                  ? 'bg-emerald-500'
                                  : isFriendInMatch
                                    ? 'bg-amber-400'
                                    : 'bg-stone-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold truncate">{friend.nickname}</span>
                              <span
                                data-testid={`friend-presence-badge-${friend.friendCode}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isFriendOnline
                                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                                    : isFriendInMatch
                                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                                      : isSurv
                                        ? 'bg-stone-800 text-stone-400 border-stone-700'
                                        : 'bg-stone-200/80 text-stone-600 border-stone-300'
                                }`}
                              >
                                {presenceLabel}
                              </span>
                              {liveRoom && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {copy.waitingRoom} · {formatPublicRoomModeBadge(liveRoom, language)}
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-mono-num mt-0.5 ${mutedText}`}>
                              {friend.friendCode} · {copy.matchesLabel}: {matches}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {liveRoom && (
                            <button
                              type="button"
                              data-testid={`friend-join-${friend.friendCode}`}
                              onClick={() => {
                                soundManager.playClick();
                                onJoinFriendRoom(liveRoom.code);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>{copy.joinFriendBtn}</span>
                            </button>
                          )}

                          {isWaitingThisFriend ? (
                            <div className="inline-flex items-center gap-2">
                              <span
                                data-testid={`friend-invite-waiting-${friend.friendCode}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono-num"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{inviteSecsLeft}s</span>
                              </span>
                              <button
                                type="button"
                                data-testid="friend-invite-cancel-btn"
                                onClick={() => {
                                  soundManager.playClick();
                                  onCancelGameInvite(outgoingInvite.inviteId);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                                  isSurv
                                    ? 'border-stone-700 text-stone-300 hover:border-red-500/60 hover:text-red-400'
                                    : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                {copy.cancelBtn}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-testid={`friend-invite-open-${friend.friendCode}`}
                              disabled={!isFriendOnline}
                              title={isFriendOnline ? invitePlayLabel : presenceLabel}
                              onClick={() => {
                                soundManager.playClick();
                                setInvitePickerCode((cur) =>
                                  cur === friend.friendCode ? null : friend.friendCode,
                                );
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                !isFriendOnline
                                  ? isSurv
                                    ? 'border-stone-800 bg-stone-950/60 text-stone-500 cursor-not-allowed opacity-60'
                                    : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed opacity-70'
                                  : pickerOpen
                                    ? 'bg-amber-500 border-amber-400 text-stone-950 cursor-pointer'
                                    : isSurv
                                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-stone-950 cursor-pointer'
                                      : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-900 hover:text-white cursor-pointer'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{invitePlayLabel}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`friend-remove-${friend.friendCode}`}
                            disabled={busyCode === friend.friendCode}
                            title={copy.removeBtn}
                            aria-label={copy.removeBtn}
                            onClick={async () => {
                              soundManager.playClick();
                              setBusyCode(friend.friendCode);
                              await onRemoveFriend(friend.friendCode);
                              setBusyCode(null);
                            }}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                              isSurv
                                ? 'border-stone-800 text-stone-400 hover:border-red-500/60 hover:text-red-400'
                                : 'border-stone-200 text-stone-500 hover:border-red-300 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline compact mode + HP selector for instant game invite */}
                      {pickerOpen && isFriendOnline && (
                        <div
                          data-testid={`friend-invite-picker-${friend.friendCode}`}
                          className={`pt-3 border-t space-y-2.5 ${
                            isSurv ? 'border-stone-800' : 'border-stone-200'
                          }`}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              data-invite-mode="classic"
                              onClick={() => {
                                soundManager.playClick();
                                setInviteMode('classic');
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                                inviteMode === 'classic'
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : isSurv
                                    ? 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                                    : 'bg-white border-stone-300 text-stone-800 hover:border-stone-500'
                              }`}
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>{classicLabel}</span>
                            </button>
                            <button
                              type="button"
                              data-invite-mode="survival"
                              onClick={() => {
                                soundManager.playClick();
                                setInviteMode('survival');
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                                inviteMode === 'survival'
                                  ? 'bg-red-600 border-red-500 text-white'
                                  : isSurv
                                    ? 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                                    : 'bg-white border-stone-300 text-stone-800 hover:border-stone-500'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{survivalLabel}</span>
                            </button>
                          </div>

                          {inviteMode === 'survival' && (
                            <div className="grid grid-cols-3 gap-2">
                              {STARTING_HP_OPTIONS.map((hp) => (
                                <button
                                  key={hp}
                                  type="button"
                                  data-invite-hp={hp}
                                  onClick={() => {
                                    soundManager.playClick();
                                    setInviteHp(hp);
                                  }}
                                  className={`inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                                    inviteHp === hp
                                      ? 'bg-red-600 border-red-500 text-white'
                                      : isSurv
                                        ? 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                                        : 'bg-white border-stone-300 text-stone-800 hover:border-stone-500'
                                  }`}
                                >
                                  <Heart className="w-3 h-3 fill-current" />
                                  <span>{hp} HP</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setInvitePickerCode(null)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                                isSurv
                                  ? 'border-stone-700 text-stone-400 hover:text-stone-200'
                                  : 'border-stone-300 text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              {copy.cancelBtn}
                            </button>
                            <button
                              type="button"
                              data-testid="friend-invite-send-btn"
                              onClick={() => {
                                soundManager.playClick();
                                onSendGameInvite(friend.friendCode, inviteMode, inviteHp);
                                setInvitePickerCode(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{sendInviteBtnLabel}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Incoming & Outgoing Requests */}
          {tab === 'requests' && (
            <div data-testid="friends-requests-panel" className="space-y-5">
              {/* Incoming */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {copy.incomingHeading} ({socialState.incomingRequests.length})
                </h3>
                {socialState.incomingRequests.length === 0 ? (
                  <div className={`p-4 rounded-xl border text-xs ${boxClass} ${mutedText}`}>
                    {copy.noIncoming}
                  </div>
                ) : (
                  socialState.incomingRequests.map((req) => (
                    <div
                      key={req.fromCode}
                      data-testid={`incoming-req-${req.fromCode}`}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${boxClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatarPortrait avatarId={req.fromAvatarId} size={42} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{req.fromNickname}</div>
                          <div className={`text-[11px] font-mono-num ${mutedText}`}>
                            {req.fromCode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          data-testid={`accept-req-${req.fromCode}`}
                          disabled={busyCode === req.fromCode}
                          onClick={async () => {
                            soundManager.playClick();
                            setBusyCode(req.fromCode);
                            await onRespondRequest(req.fromCode, 'accept');
                            setBusyCode(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{copy.acceptBtn}</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`decline-req-${req.fromCode}`}
                          disabled={busyCode === req.fromCode}
                          onClick={async () => {
                            soundManager.playClick();
                            setBusyCode(req.fromCode);
                            await onRespondRequest(req.fromCode, 'decline');
                            setBusyCode(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            isSurv
                              ? 'border-stone-700 text-stone-300 hover:border-red-500/60 hover:text-red-400'
                              : 'border-stone-300 text-stone-700 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{copy.declineBtn}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Outgoing */}
              <div className="space-y-2.5">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                  {copy.outgoingHeading} ({socialState.outgoingRequests.length})
                </h3>
                {socialState.outgoingRequests.length === 0 ? (
                  <div className={`p-4 rounded-xl border text-xs ${boxClass} ${mutedText}`}>
                    {copy.noOutgoing}
                  </div>
                ) : (
                  socialState.outgoingRequests.map((req) => (
                    <div
                      key={req.toCode}
                      data-testid={`outgoing-req-${req.toCode}`}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${boxClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatarPortrait avatarId={req.toAvatarId} size={40} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{req.toNickname}</div>
                          <div className={`text-[11px] font-mono-num flex items-center gap-1.5 ${mutedText}`}>
                            <span>{req.toCode}</span>
                            <span>·</span>
                            <Clock className="w-3 h-3" />
                            <span>{copy.waitingAnswer}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid={`cancel-req-${req.toCode}`}
                        disabled={busyCode === req.toCode}
                        onClick={async () => {
                          soundManager.playClick();
                          setBusyCode(req.toCode);
                          await onCancelRequest(req.toCode);
                          setBusyCode(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                          isSurv
                            ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                            : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {copy.cancelBtn}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Add Friend + Big Friend Code Card */}
          {tab === 'add' && (
            <div data-testid="friends-add-panel" className="space-y-4">
              {/* Your Friend Code Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isSurv ? 'bg-amber-500/10 border-amber-500/35' : 'bg-amber-50/80 border-amber-300'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {copy.yourCodeHeading}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <code
                    data-testid="friends-my-code"
                    className="font-mono-num text-lg sm:text-xl font-extrabold tracking-wider"
                  >
                    {profile.playerId}
                  </code>
                  <button
                    type="button"
                    data-testid="friends-copy-my-code"
                    onClick={handleCopyMyCode}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      copiedMyCode
                        ? 'bg-emerald-600 text-white'
                        : isSurv
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {copiedMyCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMyCode ? copy.copiedBtn : copy.copyBtn}</span>
                  </button>
                </div>
                <p className={`text-xs ${mutedText}`}>{copy.yourCodeHint}</p>
              </div>

              {/* Send Request Form */}
              <form onSubmit={(e) => void handleSubmitSend(e)} className={`p-4 rounded-xl border space-y-3 ${boxClass}`}>
                <label htmlFor="chuno-add-friend-input" className="block text-sm font-bold">
                  {copy.addHeading}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="chuno-add-friend-input"
                    data-testid="friends-code-input"
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value.toUpperCase());
                      if (feedback) setFeedback(null);
                    }}
                    placeholder={copy.codePlaceholder}
                    maxLength={18}
                    className={`flex-1 px-3.5 py-2.5 rounded-lg border font-mono-num text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isSurv
                        ? 'bg-stone-950 border-stone-700 text-stone-100 placeholder:text-stone-600'
                        : 'bg-white border-stone-300 text-stone-900 placeholder:text-stone-400'
                    }`}
                  />
                  <button
                    type="submit"
                    data-testid="friends-send-request-btn"
                    disabled={submitting || codeInput.trim().length < 4}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                      submitting || codeInput.trim().length < 4
                        ? 'opacity-50 cursor-not-allowed bg-stone-600 text-stone-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{copy.sendBtn}</span>
                  </button>
                </div>

                {feedback && (
                  <div
                    role="status"
                    data-testid="friends-send-feedback"
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                      feedback.tone === 'ok'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-red-500/15 border-red-500/40 text-red-400'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
