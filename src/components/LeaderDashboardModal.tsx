import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Flame,
  Globe,
  Pencil,
  Play,
  Send,
  Skull,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../core/achievements';
import { copyTextToClipboard } from '../core/clipboard';
import { GameMode } from '../core/deck/cardData';
import {
  LeaderboardCategory,
  LeaderboardEntry,
  leaderboardService,
} from '../core/leaderboardService';
import { Language, getTranslations } from '../core/localization';
import {
  PublicRoomListing,
  fetchFriendsOnlineRooms,
  formatPublicRoomModeBadge,
} from '../core/onlineClient';
import {
  NICKNAME_MAX_LEN,
  PlayerProfile,
  normalizeFriendCode,
  validateNickname,
} from '../core/profileManager';
import { AchievementsPanel } from './AchievementsPanel';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

export type LeaderModalTab = 'leaderboard' | 'achievements' | 'friends';

interface LeaderDashboardModalProps {
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
  initialTab?: LeaderModalTab;
  onUpdateDisplayName: (name: string) => void;
  onAddFriend?: (
    friendCode: string,
    nickname?: string,
    avatarId?: string,
  ) => { ok: true; alreadyExists: boolean } | { ok: false; error: 'invalid_code' | 'self' };
  onRemoveFriend?: (friendCode: string) => void;
  onInviteFriend?: (friendCode: string) => Promise<boolean> | void;
  onJoinFriendRoom?: (roomCode: string) => void;
  onOpenProfile?: () => void;
  onClose: () => void;
}

export const LeaderDashboardModal: React.FC<LeaderDashboardModalProps> = ({
  profile,
  language,
  mode,
  initialTab = 'leaderboard',
  onUpdateDisplayName,
  onAddFriend,
  onRemoveFriend,
  onInviteFriend,
  onJoinFriendRoom,
  onOpenProfile,
  onClose,
}) => {
  const t = getTranslations(language);
  const isRu = language === 'ru';
  const isUz = language === 'uz';
  const isSurv = mode === 'survival';

  const [mainTab, setMainTab] = useState<LeaderModalTab>(initialTab);
  const [category, setCategory] = useState<Exclude<LeaderboardCategory, 'coop_wins'>>('score');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.nickname || profile.displayName);
  const [copiedId, setCopiedId] = useState(false);

  // Friends tab state
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendNameInput, setFriendNameInput] = useState('');
  const [friendFormError, setFriendFormError] = useState<string | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [invitedFriendCode, setInvitedFriendCode] = useState<string | null>(null);
  const [friendRooms, setFriendRooms] = useState<Record<string, PublicRoomListing>>({});

  const friendsList = profile.friends ?? [];

  const unlockedCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => Boolean(profile.unlockedAchievements[a.id])).length,
    [profile.unlockedAchievements],
  );

  useEffect(() => {
    setDraftName(profile.nickname || profile.displayName);
  }, [profile.nickname, profile.displayName]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await leaderboardService.submitPlayerSnapshot(profile);
      const board = await leaderboardService.getBoard(category);
      if (active) setEntries(board);
    })();
    return () => {
      active = false;
    };
  }, [profile, category]);

  // Poll server for any friends currently waiting in open public rooms
  const refreshFriendStatuses = useCallback(async () => {
    if (friendsList.length === 0) {
      setFriendRooms({});
      return;
    }
    try {
      const rooms = await fetchFriendsOnlineRooms(friendsList.map((f) => f.friendCode));
      setFriendRooms(rooms);
    } catch {
      // Server offline — graceful offline Friends list
    }
  }, [friendsList]);

  useEffect(() => {
    if (mainTab !== 'friends') return;
    void refreshFriendStatuses();
    const id = window.setInterval(() => {
      void refreshFriendStatuses();
    }, 5000);
    return () => window.clearInterval(id);
  }, [mainTab, refreshFriendStatuses]);

  const playerRank = useMemo(() => {
    const idx = entries.findIndex((e) => e.isLocalPlayer);
    return idx >= 0 ? idx + 1 : entries.length + 1;
  }, [entries]);

  const saveName = () => {
    const res = validateNickname(draftName);
    if (res.valid && res.normalized !== (profile.nickname || profile.displayName)) {
      onUpdateDisplayName(res.normalized);
    } else {
      setDraftName(profile.nickname || profile.displayName);
    }
    setEditingName(false);
  };

  const copyPlayerId = () => {
    void copyTextToClipboard(profile.playerId).then(() => {
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleSubmitAddFriend = async () => {
    if (!onAddFriend) return;
    const cleaned = normalizeFriendCode(friendCodeInput);
    if (!cleaned) {
      setFriendFormError(t.friendErrInvalidCode);
      return;
    }
    if (cleaned === normalizeFriendCode(profile.playerId)) {
      setFriendFormError(t.friendErrSelf);
      return;
    }
    setAddingFriend(true);
    setFriendFormError(null);
    let resolvedNick = friendNameInput.trim() || undefined;
    let resolvedAvatar: string | undefined;

    // If friend is currently online in an open room on the server, auto-pull live nickname & skin
    try {
      const statusMap = await fetchFriendsOnlineRooms([cleaned]);
      const liveRoom = statusMap[cleaned];
      if (liveRoom) {
        resolvedNick = liveRoom.hostNickname;
        resolvedAvatar = liveRoom.hostAvatarId;
        setFriendRooms((prev) => ({ ...prev, [cleaned]: liveRoom }));
      }
    } catch {
      // Server offline; proceed with manual/default entry
    }

    const res = onAddFriend(cleaned, resolvedNick, resolvedAvatar);
    setAddingFriend(false);
    if (!res.ok) {
      setFriendFormError(res.error === 'self' ? t.friendErrSelf : t.friendErrInvalidCode);
      return;
    }
    if (res.alreadyExists) {
      setFriendFormError(t.friendErrDuplicate);
      return;
    }
    setFriendCodeInput('');
    setFriendNameInput('');
    setFriendFormError(null);
  };

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const subBoxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800'
    : 'bg-stone-50 border-stone-200';
  const mutedText = isSurv ? 'text-stone-400' : 'text-stone-600';

  const categories: {
    key: Exclude<LeaderboardCategory, 'coop_wins'>;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'score',
      label: isRu ? 'Общий счёт' : isUz ? 'Umumiy ball' : 'Score',
      icon: <Trophy className="w-3.5 h-3.5" />,
    },
    { key: 'hard_wins', label: 'Survival Hard', icon: <Skull className="w-3.5 h-3.5" /> },
    {
      key: 'win_streak',
      label: isRu ? 'Серия побед' : isUz ? 'G‘alabalar seriyasi' : 'Win Streak',
      icon: <Flame className="w-3.5 h-3.5" />,
    },
  ];

  const getMetricValue = (entry: LeaderboardEntry): number => {
    switch (category) {
      case 'score':
        return entry.score;
      case 'hard_wins':
        return entry.hardWins;
      case 'win_streak':
        return entry.bestStreak;
    }
  };

  const metricLabel =
    category === 'score'
      ? isRu
        ? 'Очки'
        : isUz
          ? 'Ball'
          : 'Score'
      : category === 'hard_wins'
        ? isRu
          ? 'Победы Hard'
          : isUz
            ? 'Hard g‘alabalar'
            : 'Hard Wins'
        : isRu
          ? 'Лучшая серия'
          : isUz
            ? 'Eng uzun seriya'
            : 'Best Streak';

  const top3 = entries.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumRanks = top3.length >= 3 ? [2, 1, 3] : top3.map((_, i) => i + 1);

  const localizeEntryName = (entry: LeaderboardEntry): string => {
    if (!isRu || entry.tag !== 'HOUSE') return entry.displayName;
    switch (entry.playerId) {
      case 'HOUSE-DEALER':
        return 'Дилер';
      case 'HOUSE-CALM':
        return 'Спокойный философ';
      case 'HOUSE-UNKNOWN':
        return 'Неизвестный';
      case 'HOUSE-EGOIST':
        return 'Эгоист';
      case 'HOUSE-ENTHUSIAST':
        return 'Энтузиаст';
      default:
        return entry.displayName;
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
      data-testid="leader-dashboard-modal"
    >
      <div className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl ${panelClass}`}>
        {/* Modal Header with Top-Level Tabs: Leaderboard | Achievements | Friends */}
        <div
          className={`flex items-center justify-between gap-3 px-6 py-4 border-b ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              data-tab="leaderboard"
              onClick={() => setMainTab('leaderboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                mainTab === 'leaderboard'
                  ? isSurv
                    ? 'bg-amber-600 text-stone-950'
                    : 'bg-stone-900 text-white'
                  : isSurv
                    ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>{t.leaderboardTab}</span>
            </button>

            <button
              type="button"
              data-tab="achievements"
              onClick={() => setMainTab('achievements')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                mainTab === 'achievements'
                  ? isSurv
                    ? 'bg-amber-600 text-stone-950'
                    : 'bg-stone-900 text-white'
                  : isSurv
                    ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>
                {t.achievementsTab}{' '}
                <span className="font-mono-num opacity-80">
                  ({unlockedCount}/{ACHIEVEMENTS.length})
                </span>
              </span>
            </button>

            <button
              type="button"
              data-tab="friends"
              onClick={() => setMainTab('friends')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                mainTab === 'friends'
                  ? isSurv
                    ? 'bg-amber-600 text-stone-950'
                    : 'bg-stone-900 text-white'
                  : isSurv
                    ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>
                {t.friendsTab}{' '}
                <span className="font-mono-num opacity-80">({friendsList.length})</span>
              </span>
            </button>
          </div>

          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              isSurv
                ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Player Identity Summary Card */}
          <div className={`p-4 rounded-xl border ${subBoxClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  disabled={!onOpenProfile}
                  title={t.changeAvatarBtn}
                  className={`shrink-0 rounded-full transition-transform ${
                    onOpenProfile ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                  }`}
                >
                  <PlayerAvatarPortrait avatarId={profile.avatarId} size={50} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {editingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={draftName}
                          maxLength={NICKNAME_MAX_LEN}
                          autoFocus
                          aria-label={t.nicknameLabel}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName();
                            if (e.key === 'Escape') {
                              setDraftName(profile.nickname || profile.displayName);
                              setEditingName(false);
                            }
                          }}
                          className={`px-2 py-1 text-sm font-bold rounded border outline-none w-40 ${
                            isSurv
                              ? 'bg-stone-950 border-amber-500 text-stone-100'
                              : 'bg-white border-stone-900 text-stone-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={saveName}
                          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          aria-label={t.saveNickname}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-lg font-bold truncate" data-testid="player-display-name">
                          {profile.nickname || profile.displayName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingName(true)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isSurv
                              ? 'text-stone-400 hover:text-amber-400 hover:bg-stone-800'
                              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'
                          }`}
                          title={isRu ? 'Изменить никнейм' : isUz ? 'Ismni o‘zgartirish' : 'Edit nickname'}
                          aria-label={isRu ? 'Изменить никнейм' : isUz ? 'Ismni o‘zgartirish' : 'Edit nickname'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-mono-num font-semibold ${mutedText}`}>
                      <Globe className="w-3 h-3 text-emerald-500" />
                      {profile.playerId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                <div className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <div className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {isRu ? 'Место' : isUz ? 'O‘rin' : 'Rank'}
                  </div>
                  <div className="font-mono-num text-base font-bold text-amber-500">#{playerRank}</div>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg border ${isSurv ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
                  <div className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {isRu ? 'Счёт' : isUz ? 'Ball' : 'Score'}
                  </div>
                  <div className="font-mono-num text-base font-bold">{profile.score}</div>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg border ${isSurv ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
                  <div className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {isRu ? 'Серия' : isUz ? 'Seriya' : 'Streak'}
                  </div>
                  <div className="font-mono-num text-base font-bold">{profile.stats.currentStreak}</div>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg border ${isSurv ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
                  <div className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {isRu ? 'Друзья' : isUz ? 'Do‘stlar' : 'Friends'}
                  </div>
                  <div className="font-mono-num text-base font-bold">{friendsList.length}</div>
                </div>
              </div>
            </div>
          </div>

          {mainTab === 'achievements' ? (
            <AchievementsPanel profile={profile} language={language} mode={mode} />
          ) : mainTab === 'friends' ? (
            /* Full Interactive Friends List Panel */
            <div className="space-y-4" data-testid="friends-panel">
              {/* Your Friend Code Card */}
              <div className={`p-4 rounded-xl border ${subBoxClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div>
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                    {t.yourFriendCodeLabel}
                  </div>
                  <div
                    data-testid="player-id"
                    onClick={copyPlayerId}
                    className="font-mono-num text-lg font-bold tracking-wider text-amber-500 select-all cursor-pointer mt-0.5"
                  >
                    {profile.playerId}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="copy-my-friend-code"
                  onClick={copyPlayerId}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    copiedId
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : isSurv
                        ? 'bg-stone-950 border-amber-500/50 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                        : 'bg-white border-stone-400 text-stone-900 hover:bg-stone-900 hover:text-white'
                  }`}
                >
                  {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? t.onlineCodeCopied : t.onlineCopyCode}</span>
                </button>
              </div>

              {/* Add Friend by Code Form */}
              <div className={`p-4 rounded-xl border ${subBoxClass} space-y-3`}>
                <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.addFriendByCodeTitle}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    data-testid="add-friend-code-input"
                    value={friendCodeInput}
                    maxLength={15}
                    placeholder={t.friendCodePlaceholder}
                    onChange={(e) => {
                      setFriendCodeInput(e.target.value.toUpperCase());
                      setFriendFormError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSubmitAddFriend();
                    }}
                    className={`px-3 py-2 rounded-lg border font-mono-num text-xs font-bold tracking-wider uppercase outline-none ${
                      isSurv
                        ? 'bg-stone-950 border-stone-700 focus:border-amber-500 text-stone-100'
                        : 'bg-white border-stone-300 focus:border-stone-900 text-stone-900'
                    }`}
                  />
                  <input
                    type="text"
                    data-testid="add-friend-name-input"
                    value={friendNameInput}
                    maxLength={NICKNAME_MAX_LEN}
                    placeholder={t.friendNameOptionalPlaceholder}
                    onChange={(e) => setFriendNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSubmitAddFriend();
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium outline-none ${
                      isSurv
                        ? 'bg-stone-950 border-stone-700 focus:border-amber-500 text-stone-100'
                        : 'bg-white border-stone-300 focus:border-stone-900 text-stone-900'
                    }`}
                  />
                  <button
                    type="button"
                    data-testid="add-friend-submit"
                    disabled={addingFriend}
                    onClick={() => void handleSubmitAddFriend()}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      isSurv
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t.addFriendSubmitBtn}</span>
                  </button>
                </div>
                {friendFormError && (
                  <div className="text-xs text-red-400 font-medium" role="alert">
                    {friendFormError}
                  </div>
                )}
              </div>

              {/* Added Friends List */}
              {friendsList.length === 0 ? (
                <div className={`p-6 rounded-xl border text-center text-xs ${subBoxClass} ${mutedText}`}>
                  {t.friendsEmptyHint}
                </div>
              ) : (
                <div className="space-y-2.5" data-testid="friends-list">
                  {friendsList.map((friend) => {
                    const liveRoom = friendRooms[friend.friendCode];
                    const shownNick = liveRoom?.hostNickname || friend.nickname;
                    const shownAvatar = liveRoom?.hostAvatarId || friend.avatarId;
                    const isInvited = invitedFriendCode === friend.friendCode;

                    return (
                      <div
                        key={friend.friendCode}
                        data-friend-row={friend.friendCode}
                        className={`p-3.5 rounded-xl border ${subBoxClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatarPortrait avatarId={shownAvatar} size={44} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold truncate">{shownNick}</span>
                              {liveRoom && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>
                                    {t.friendOnlineNow} · {formatPublicRoomModeBadge(liveRoom, language)}
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] flex items-center gap-2 flex-wrap mt-0.5 ${mutedText}`}>
                              <span className="font-mono-num">{friend.friendCode}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {t.friendMatchesTogether}: <strong className="font-mono-num">{friend.matchesTogether}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {liveRoom && onJoinFriendRoom && (
                            <button
                              type="button"
                              data-friend-join={friend.friendCode}
                              onClick={() => onJoinFriendRoom(liveRoom.code)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>{t.friendJoinOpenRoomBtn}</span>
                            </button>
                          )}

                          {onInviteFriend && (
                            <button
                              type="button"
                              data-friend-invite={friend.friendCode}
                              onClick={() => {
                                void Promise.resolve(onInviteFriend(friend.friendCode)).then(() => {
                                  setInvitedFriendCode(friend.friendCode);
                                  window.setTimeout(() => setInvitedFriendCode(null), 2200);
                                });
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                isInvited
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : isSurv
                                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                                    : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-900 hover:text-white'
                              }`}
                            >
                              {isInvited ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>{isInvited ? t.friendInviteCopied : t.friendInviteBtn}</span>
                            </button>
                          )}

                          {onRemoveFriend && (
                            <button
                              type="button"
                              data-friend-remove={friend.friendCode}
                              title={t.friendRemoveBtn}
                              aria-label={t.friendRemoveBtn}
                              onClick={() => onRemoveFriend(friend.friendCode)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isSurv
                                  ? 'border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/30'
                                  : 'border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leaderboard Category Tabs */}
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                {categories.map((c) => {
                  const active = category === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-board-category={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                        active
                          ? isSurv
                            ? 'bg-amber-600 border-amber-500 text-stone-950'
                            : 'bg-stone-900 border-stone-900 text-white'
                          : isSurv
                            ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                            : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {c.icon}
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Top-3 Podium */}
              {podiumOrder.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 items-end">
                  {podiumOrder.map((entry, idx) => {
                    const rank = podiumRanks[idx];
                    const medalStyle =
                      rank === 1
                        ? 'border-amber-400/80 bg-amber-500/10'
                        : rank === 2
                          ? 'border-stone-400/70 bg-stone-500/10'
                          : 'border-amber-700/70 bg-amber-900/10';
                    const rankBadge =
                      rank === 1
                        ? 'bg-amber-400 text-stone-950'
                        : rank === 2
                          ? 'bg-stone-300 text-stone-950'
                          : 'bg-amber-700 text-amber-100';
                    return (
                      <div
                        key={entry.playerId}
                        className={`p-3 rounded-xl border text-center transition-all ${medalStyle} ${
                          rank === 1 ? 'sm:py-4' : ''
                        }`}
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${rankBadge}`}
                        >
                          #{rank}
                        </span>
                        <div className="text-sm font-bold truncate">{localizeEntryName(entry)}</div>
                        <div className="font-mono-num text-xl font-bold mt-1 text-amber-500">
                          {getMetricValue(entry)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                          {entry.tag} · {entry.achievementsCount}/{ACHIEVEMENTS.length}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full Ranked Table */}
              <div
                className={`rounded-xl border overflow-hidden ${
                  isSurv ? 'border-stone-800' : 'border-stone-200'
                }`}
              >
                <table className="w-full text-left text-xs">
                  <thead
                    className={
                      isSurv
                        ? 'bg-stone-900 text-stone-400 border-b border-stone-800'
                        : 'bg-stone-100 text-stone-600 border-b border-stone-200'
                    }
                  >
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-12">#</th>
                      <th className="py-2.5 px-3 font-semibold">{isRu ? 'Игрок' : isUz ? 'O‘yinchi' : 'Player'}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{metricLabel}</th>
                      <th className="py-2.5 px-3 font-semibold text-right hidden sm:table-cell">
                        {isRu ? 'Победы' : isUz ? 'G‘alabalar' : 'Wins'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right hidden sm:table-cell">
                        {isRu ? 'Ачивки' : isUz ? 'Yutuqlar' : 'Badges'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={isSurv ? 'divide-y divide-stone-800/70' : 'divide-y divide-stone-200'}>
                    {entries.map((entry, idx) => {
                      const tagClass =
                        entry.tag === 'YOU'
                          ? isSurv
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : entry.tag === 'HOUSE'
                            ? isSurv
                              ? 'bg-red-900/35 text-red-200 border-red-700/50'
                              : 'bg-[#fee2e2] text-[#7f1d1d] border-[#fca5a5]'
                            : isSurv
                              ? 'bg-sky-900/30 text-sky-300 border-sky-700/40'
                              : 'bg-sky-100 text-sky-900 border-sky-400';
                      return (
                        <tr
                          key={entry.playerId}
                          data-local-player={entry.isLocalPlayer ? 'true' : 'false'}
                          className={
                            entry.isLocalPlayer
                              ? isSurv
                                ? 'bg-amber-600/15 font-semibold'
                                : 'bg-amber-100/80 font-semibold'
                              : isSurv
                                ? 'hover:bg-stone-900/60'
                                : 'hover:bg-stone-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-mono-num font-bold opacity-80">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {entry.isLocalPlayer && (
                                <PlayerAvatarPortrait
                                  avatarId={entry.avatarId ?? profile.avatarId}
                                  size={22}
                                />
                              )}
                              <span className="truncate max-w-[160px] sm:max-w-xs">
                                {localizeEntryName(entry)}
                              </span>
                              <span
                                data-leaderboard-tag={entry.tag}
                                className={`text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider ${tagClass}`}
                              >
                                {entry.tag}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-500">
                            {getMetricValue(entry)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num hidden sm:table-cell opacity-80">
                            {entry.totalWins}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num hidden sm:table-cell opacity-80">
                            {entry.achievementsCount}/{ACHIEVEMENTS.length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
