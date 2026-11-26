import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Heart,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Swords,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { copyTextToClipboard } from '../core/clipboard';
import { GameMode } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';
import { OnlineSubMode, isValidDemoRoomCode, normalizeRoomCode } from '../core/menuNavigation';
import {
  OnlineConnectionStatus,
  OnlineMode,
  OnlineRoomView,
  PublicRoomListing,
  RoomErrorCode,
  RoomVisibility,
  STARTING_HP_OPTIONS,
  StartingHp,
  buildRoomInviteUrl,
  fetchPublicRooms,
  formatPublicRoomModeBadge,
} from '../core/onlineClient';
import { PlayerProfile, isFriend } from '../core/profileManager';
import { getPlayerAvatar } from '../data/playerAvatars';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

interface OnlineLobbyModalProps {
  subMode: OnlineSubMode;
  initialRoomCode?: string | null;
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
  roomState: OnlineRoomView | null;
  connectionStatus: OnlineConnectionStatus;
  errorCode: RoomErrorCode | 'CONNECTION_ERROR' | null;
  onCreateRoom: (
    onlineMode: OnlineMode,
    startingHp: StartingHp,
    visibility: RoomVisibility,
  ) => void;
  onQuickMatch: (onlineMode: OnlineMode, startingHp?: StartingHp) => void;
  onJoinRoom: (roomCode: string) => void;
  onSetStartingHp: (hp: StartingHp) => void;
  onSetReady: (ready: boolean) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onAddFriend?: (friendCode: string, nickname: string, avatarId: string) => void;
  onOpenFriends?: () => void;
  onChangeAvatar: () => void;
  onBack: () => void;
  onClose: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  subMode,
  initialRoomCode,
  profile,
  language,
  mode,
  roomState,
  connectionStatus,
  errorCode,
  onCreateRoom,
  onQuickMatch,
  onJoinRoom,
  onSetStartingHp,
  onSetReady,
  onStartMatch,
  onLeaveRoom,
  onAddFriend,
  onOpenFriends,
  onChangeAvatar,
  onBack,
  onClose,
}) => {
  const t = getTranslations(language);
  const effectiveOnlineMode: OnlineMode =
    roomState?.mode ?? (subMode === 'online_survival' ? 'survival' : 'classic');
  const isSurv = effectiveOnlineMode === 'survival' || mode === 'survival';
  const avatar = useMemo(() => getPlayerAvatar(profile.avatarId), [profile.avatarId]);

  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [selectedHp, setSelectedHp] = useState<StartingHp>(3);
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [joinInput, setJoinInput] = useState(initialRoomCode ?? '');
  const [localInputError, setLocalInputError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Open Rooms list (auto-refreshed every 3.5s while on the Join tab)
  const [openRooms, setOpenRooms] = useState<PublicRoomListing[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [quickSearching, setQuickSearching] = useState(false);

  const loadOpenRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const list = await fetchPublicRooms(effectiveOnlineMode);
      setOpenRooms(list);
    } catch {
      setOpenRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [effectiveOnlineMode]);

  useEffect(() => {
    if (roomState || tab !== 'join') return;
    void loadOpenRooms();
    const id = window.setInterval(() => {
      void loadOpenRooms();
    }, 3500);
    return () => window.clearInterval(id);
  }, [roomState, tab, loadOpenRooms]);

  useEffect(() => {
    if (roomState || connectionStatus === 'error') {
      setQuickSearching(false);
    }
  }, [roomState, connectionStatus]);

  const inviteLink = useMemo(
    () => (roomState ? buildRoomInviteUrl(roomState.roomCode) : ''),
    [roomState],
  );

  const handleCopyCode = () => {
    if (!roomState?.roomCode) return;
    soundManager.playClick();
    void copyTextToClipboard(roomState.roomCode).then(() => {
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    soundManager.playClick();
    void copyTextToClipboard(inviteLink).then(() => {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleTryJoin = () => {
    soundManager.playClick();
    const cleaned = normalizeRoomCode(joinInput);
    setJoinInput(cleaned);
    if (!isValidDemoRoomCode(cleaned)) {
      setLocalInputError(t.onlineInvalidCode);
      return;
    }
    setLocalInputError(null);
    onJoinRoom(cleaned);
  };

  const resolvedError = useMemo(() => {
    if (localInputError) return localInputError;
    if (!errorCode) return null;
    if (errorCode === 'ROOM_NOT_FOUND') return t.onlineRoomNotFound;
    if (errorCode === 'ROOM_FULL') return t.onlineRoomFull;
    return t.onlineServerOffline;
  }, [errorCode, localInputError, t]);

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const subBoxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800'
    : 'bg-stone-50 border-stone-200';
  const mutedText = isSurv ? 'text-stone-400' : 'text-stone-600';

  const modeTitle =
    effectiveOnlineMode === 'survival' ? t.onlineSurvivalTitle : t.onlineFriendlyTitle;
  const modeDesc =
    effectiveOnlineMode === 'survival' ? t.onlineSurvivalDesc : t.onlineFriendlyDesc;

  const isHost = roomState?.yourSeat === 'host';
  const hostSlot = roomState?.players.host ?? null;
  const guestSlot = roomState?.players.guest ?? null;
  const mySlot = roomState ? roomState.players[roomState.yourSeat] : null;
  const canStart = Boolean(
    isHost && hostSlot?.connected && guestSlot?.connected && guestSlot?.ready,
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      data-testid="online-lobby-modal"
      data-online-submode={effectiveOnlineMode}
    >
      <div className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl ${panelClass}`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (roomState) onLeaveRoom();
                onBack();
              }}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSurv
                  ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
              aria-label={t.onlineBackToModes}
              title={t.onlineBackToModes}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {effectiveOnlineMode === 'survival' ? (
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <Swords className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <h2 className="font-display text-lg sm:text-xl font-bold truncate">
                  {modeTitle}
                </h2>
              </div>
              <p className={`text-xs truncate ${mutedText}`}>{modeDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenFriends && !roomState && (
              <button
                type="button"
                data-testid="lobby-open-friends"
                onClick={() => {
                  soundManager.playClick();
                  onOpenFriends();
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  isSurv
                    ? 'border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-500/60 hover:text-amber-300'
                    : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>{t.friendsTab}</span>
              </button>
            )}

            <span
              data-testid="online-conn-status"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                connectionStatus === 'connected'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                    : isSurv
                      ? 'border-stone-700 bg-stone-900 text-stone-400'
                      : 'border-stone-300 bg-stone-100 text-stone-600'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="w-3 h-3" />
              ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span>
                {connectionStatus === 'connected'
                  ? t.onlineConnected
                  : connectionStatus === 'reconnecting'
                    ? t.onlineReconnecting
                    : connectionStatus === 'connecting'
                      ? t.onlineConnecting
                      : 'WS'}
              </span>
            </span>

            <button
              type="button"
              aria-label={t.close}
              onClick={() => {
                soundManager.playClick();
                if (roomState) onLeaveRoom();
                onClose();
              }}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSurv
                  ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Player Identity Card */}
          <div className={`p-3.5 rounded-xl border ${subBoxClass} flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <PlayerAvatarPortrait avatarId={avatar.id} size={48} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" data-testid="lobby-player-nickname">
                  {profile.nickname || profile.displayName}
                </div>
                <div className={`text-xs truncate ${mutedText}`}>
                  {avatar.name[language]}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="lobby-change-avatar"
              onClick={() => {
                soundManager.playClick();
                onChangeAvatar();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSurv
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
              }`}
            >
              {t.changeAvatarBtn}
            </button>
          </div>

          {!roomState ? (
            <>
              {/* Create / Join Switcher */}
              <div className="grid grid-cols-2 gap-2" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'create'}
                  data-lobby-tab="create"
                  onClick={() => {
                    soundManager.playClick();
                    setTab('create');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    tab === 'create'
                      ? isSurv
                        ? 'bg-amber-600 border-amber-500 text-stone-950'
                        : 'bg-stone-900 border-stone-900 text-white'
                      : isSurv
                        ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                        : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {t.onlineCreateRoom}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'join'}
                  data-lobby-tab="join"
                  onClick={() => {
                    soundManager.playClick();
                    setTab('join');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    tab === 'join'
                      ? isSurv
                        ? 'bg-amber-600 border-amber-500 text-stone-950'
                        : 'bg-stone-900 border-stone-900 text-white'
                      : isSurv
                        ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                        : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {t.onlineJoinRoom}
                </button>
              </div>

              {tab === 'create' ? (
                <div className={`p-4 rounded-xl border ${subBoxClass} space-y-4`}>
                  {/* Visibility Toggle: Open (public) vs Private (code only) */}
                  <div className="space-y-2">
                    <div className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.onlineVisibilityLabel}
                    </div>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.onlineVisibilityLabel}>
                      <button
                        type="button"
                        data-visibility-select="public"
                        onClick={() => {
                          soundManager.playClick();
                          setVisibility('public');
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          visibility === 'public'
                            ? 'border-emerald-500 bg-emerald-600 text-white'
                            : isSurv
                              ? 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                              : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.onlinePublicLabel}</span>
                      </button>
                      <button
                        type="button"
                        data-visibility-select="private"
                        onClick={() => {
                          soundManager.playClick();
                          setVisibility('private');
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          visibility === 'private'
                            ? isSurv
                              ? 'border-amber-500 bg-amber-600 text-stone-950'
                              : 'border-stone-900 bg-stone-900 text-white'
                            : isSurv
                              ? 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                              : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.onlinePrivateLabel}</span>
                      </button>
                    </div>
                  </div>

                  {effectiveOnlineMode === 'survival' && (
                    <div className="space-y-2">
                      <div className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                        {t.onlineStartingHpLabel}
                      </div>
                      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.onlineStartingHpLabel}>
                        {STARTING_HP_OPTIONS.map((hp) => {
                          const active = selectedHp === hp;
                          return (
                            <button
                              key={hp}
                              type="button"
                              data-hp-select={hp}
                              onClick={() => {
                                soundManager.playClick();
                                setSelectedHp(hp);
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'border-red-500 bg-red-600 text-white'
                                  : isSurv
                                    ? 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                                    : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                              <span>{hp} HP</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    data-testid="lobby-create-submit"
                    disabled={connectionStatus === 'connecting'}
                    onClick={() => {
                      soundManager.playClick();
                      onCreateRoom(effectiveOnlineMode, selectedHp, visibility);
                    }}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      isSurv
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {connectionStatus === 'connecting' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{t.onlineCreateRoom}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* 1. Quick Play / Random Opponent */}
                  <div
                    className={`p-4 rounded-xl border ${
                      isSurv
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-emerald-500/40 bg-emerald-50/70'
                    } space-y-2`}
                  >
                    <button
                      type="button"
                      data-testid="lobby-quick-match"
                      disabled={quickSearching || connectionStatus === 'connecting'}
                      onClick={() => {
                        soundManager.playClick();
                        setQuickSearching(true);
                        onQuickMatch(
                          effectiveOnlineMode,
                          effectiveOnlineMode === 'survival' ? selectedHp : undefined,
                        );
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                        isSurv
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {quickSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>
                        {quickSearching ? t.onlineQuickMatchSearching : t.onlineQuickMatchBtn}
                      </span>
                    </button>
                    <p className={`text-[11px] text-center ${mutedText}`}>
                      {t.onlineQuickMatchDesc}
                    </p>
                  </div>

                  {/* 2. Live Open Rooms List */}
                  <div className={`p-4 rounded-xl border ${subBoxClass} space-y-3`} data-testid="lobby-open-rooms">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {t.onlineOpenRoomsTitle}
                        </span>
                        <span className={`text-[11px] font-mono-num ${mutedText}`}>
                          ({openRooms.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="lobby-refresh-rooms"
                        onClick={() => {
                          soundManager.playClick();
                          void loadOpenRooms();
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                          isSurv
                            ? 'border-stone-700 bg-stone-950 text-stone-300 hover:text-white'
                            : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`} />
                        <span>{t.onlineRefreshBtn}</span>
                      </button>
                    </div>

                    {openRooms.length === 0 ? (
                      <div className={`py-4 text-center text-xs ${mutedText}`}>
                        {t.onlineNoOpenRooms}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                        {openRooms.map((room) => (
                          <div
                            key={room.code}
                            data-open-room={room.code}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
                              isSurv
                                ? 'border-stone-800 bg-stone-950/80'
                                : 'border-stone-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerAvatarPortrait avatarId={room.hostAvatarId} size={36} />
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  {room.hostNickname}
                                </div>
                                <div className={`text-[11px] flex items-center gap-1.5 ${mutedText}`}>
                                  <span>{formatPublicRoomModeBadge(room, language)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono-num opacity-75">{room.code}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              data-open-room-join={room.code}
                              disabled={connectionStatus === 'connecting'}
                              onClick={() => {
                                soundManager.playClick();
                                onJoinRoom(room.code);
                              }}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                isSurv
                                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white'
                              }`}
                            >
                              {t.onlineEnterRoomBtn}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Join Private Room by Code */}
                  <div className={`p-4 rounded-xl border ${subBoxClass} space-y-2.5`}>
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.onlineJoinByCodeTitle}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        data-testid="lobby-join-input"
                        value={joinInput}
                        maxLength={7}
                        placeholder={t.onlineEnterCodePlaceholder}
                        onChange={(e) => {
                          setJoinInput(e.target.value.toUpperCase());
                          setLocalInputError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTryJoin();
                        }}
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg border font-mono-num text-sm font-bold tracking-widest uppercase outline-none ${
                          isSurv
                            ? 'bg-stone-950 border-stone-700 focus:border-amber-500 text-stone-100'
                            : 'bg-white border-stone-300 focus:border-stone-900 text-stone-900'
                        }`}
                      />
                      <button
                        type="button"
                        data-testid="lobby-join-submit"
                        disabled={connectionStatus === 'connecting'}
                        onClick={handleTryJoin}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSurv
                            ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                            : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{t.onlineJoinBtn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Connected Live Room Lobby */
            <div className="space-y-4" data-testid="live-room-lobby">
              {/* Room Code + Invite Link */}
              <div className={`p-4 rounded-xl border ${subBoxClass} space-y-3`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.onlineRoomCodeLabel}
                    </span>
                    <span
                      data-testid="lobby-visibility-badge"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        roomState.visibility === 'private'
                          ? 'border-stone-500/40 bg-stone-500/15 text-stone-400'
                          : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                      }`}
                    >
                      {roomState.visibility === 'private' ? (
                        <Lock className="w-2.5 h-2.5" />
                      ) : (
                        <Globe className="w-2.5 h-2.5" />
                      )}
                      <span>
                        {roomState.visibility === 'private'
                          ? t.onlinePrivateBadge
                          : t.onlinePublicBadge}
                      </span>
                    </span>
                  </div>
                  {roomState.mode === 'survival' && (
                    <span
                      data-testid="lobby-hp-badge"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600/20 border border-red-500/50 text-red-400"
                    >
                      <Heart className="w-3 h-3 fill-current" />
                      <span>
                        {t.onlineSurvivalTitle} · {roomState.startingHp} HP
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div
                    data-testid="lobby-room-code"
                    role="button"
                    tabIndex={0}
                    title={t.onlineCopyCode}
                    onClick={handleCopyCode}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCopyCode();
                      }
                    }}
                    className={`flex-1 select-all cursor-pointer text-center py-2.5 px-4 rounded-lg border font-mono-num text-2xl font-bold tracking-[0.22em] transition-colors ${
                      isSurv
                        ? 'bg-stone-950 border-amber-500/40 hover:border-amber-400 text-amber-400'
                        : 'bg-white border-stone-300 hover:border-stone-500 text-stone-900'
                    }`}
                  >
                    {roomState.roomCode}
                  </div>
                  <button
                    type="button"
                    data-testid="lobby-copy-code"
                    onClick={handleCopyCode}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      copiedCode
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isSurv
                          ? 'bg-stone-950 border-amber-500/50 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                          : 'bg-white border-stone-400 text-stone-900 hover:bg-stone-900 hover:text-white'
                    }`}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? t.onlineCodeCopied : t.onlineCopyCode}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div
                    className={`flex-1 min-w-0 px-3 py-2 rounded-lg border font-mono text-[11px] truncate ${
                      isSurv
                        ? 'bg-stone-950/70 border-stone-800 text-stone-400'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    data-testid="lobby-copy-link"
                    onClick={handleCopyLink}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : isSurv
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? t.onlineLinkCopied : t.onlineCopyLink}</span>
                  </button>
                </div>

                {/* Live HP Selector for Host in Survival Lobby */}
                {isHost && roomState.mode === 'survival' && (
                  <div className="pt-2 border-t border-stone-800/40 flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${mutedText}`}>
                      {t.onlineStartingHpLabel}:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {STARTING_HP_OPTIONS.map((hp) => {
                        const active = roomState.startingHp === hp;
                        return (
                          <button
                            key={hp}
                            type="button"
                            data-live-hp-select={hp}
                            onClick={() => {
                              soundManager.playClick();
                              onSetStartingHp(hp);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-red-600 border-red-500 text-white'
                                : isSurv
                                  ? 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                                  : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'
                            }`}
                          >
                            {hp} HP
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Two Player Slots + 1-click Add Friend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'HOST', seat: 'host' as const, slot: hostSlot },
                  { label: 'GUEST', seat: 'guest' as const, slot: guestSlot },
                ].map(({ label, seat, slot }) => {
                  const isOpponent = Boolean(slot && seat !== roomState.yourSeat);
                  const oppCode = slot?.friendCode ?? null;
                  const alreadyFriend = Boolean(oppCode && isFriend(profile, oppCode));

                  return (
                    <div
                      key={label}
                      data-lobby-slot={label.toLowerCase()}
                      className={`p-3.5 rounded-xl border ${subBoxClass} flex flex-col gap-2.5`}
                    >
                      {slot ? (
                        <>
                          <div className="flex items-center gap-3">
                            <PlayerAvatarPortrait avatarId={slot.avatarId} size={46} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold truncate">{slot.nickname}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                  {label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    slot.ready ? 'text-emerald-500' : mutedText
                                  }`}
                                >
                                  {slot.ready ? `✓ ${t.onlineReady}` : t.onlineNotReady}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isOpponent && oppCode && (
                            <div className="pt-2 border-t border-stone-500/20 flex items-center justify-between gap-2">
                              {alreadyFriend ? (
                                <span
                                  data-testid="lobby-friend-badge"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{t.addedFriendBadge}</span>
                                </span>
                              ) : (
                                onAddFriend && (
                                  <button
                                    type="button"
                                    data-testid="lobby-add-friend"
                                    onClick={() => {
                                      soundManager.playClick();
                                      onAddFriend(oppCode, slot.nickname, slot.avatarId);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                                      isSurv
                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                                        : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-900 hover:text-white'
                                    }`}
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    <span>{t.addFriendBtn}</span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2.5 py-2 text-xs opacity-70">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                          <span>{t.onlineWaitingGuest}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Bar: Host Start Match / Guest Ready Toggle */}
              <div className="flex items-center justify-end gap-2">
                {!isHost && mySlot && (
                  <button
                    type="button"
                    data-testid="lobby-ready-toggle"
                    onClick={() => {
                      soundManager.playClick();
                      onSetReady(!mySlot.ready);
                    }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      mySlot.ready
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : isSurv
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {mySlot.ready ? `✓ ${t.onlineReady}` : t.onlineReady}
                  </button>
                )}

                {isHost && (
                  <button
                    type="button"
                    data-testid="lobby-start-match"
                    disabled={!canStart}
                    onClick={() => {
                      soundManager.playClick();
                      onStartMatch();
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                      canStart
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        : isSurv
                          ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>{t.onlineStartMatch}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {resolvedError && (
            <div
              data-testid="online-lobby-error"
              role="alert"
              className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-xs font-medium text-red-400"
            >
              {resolvedError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
