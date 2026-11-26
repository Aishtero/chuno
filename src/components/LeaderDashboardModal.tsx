import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Flame,
  Globe,
  Pencil,
  Skull,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../core/achievements';
import { GameMode } from '../core/deck/cardData';
import {
  LeaderboardCategory,
  LeaderboardEntry,
  leaderboardService,
} from '../core/leaderboardService';
import { Language, getTranslations } from '../core/localization';
import {
  NICKNAME_MAX_LEN,
  PlayerProfile,
  validateNickname,
} from '../core/profileManager';
import { AchievementsPanel } from './AchievementsPanel';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

export type LeaderModalTab = 'leaderboard' | 'achievements';

interface LeaderDashboardModalProps {
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
  initialTab?: LeaderModalTab;
  friendsCount?: number;
  incomingFriendRequestsCount?: number;
  onUpdateDisplayName: (name: string) => void;
  onOpenFriends?: () => void;
  onOpenProfile?: () => void;
  onClose: () => void;
}

export const LeaderDashboardModal: React.FC<LeaderDashboardModalProps> = ({
  profile,
  language,
  mode,
  initialTab = 'leaderboard',
  friendsCount,
  incomingFriendRequestsCount = 0,
  onUpdateDisplayName,
  onOpenFriends,
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

  const displayedFriendsCount = friendsCount ?? (profile.friends ?? []).length;

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

            {onOpenFriends && (
              <button
                type="button"
                data-testid="leader-open-friends"
                onClick={onOpenFriends}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                  isSurv
                    ? 'border-stone-700 text-stone-300 hover:text-amber-300 hover:border-amber-500/50 hover:bg-stone-900'
                    : 'border-stone-300 text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>
                  {t.friendsTab}{' '}
                  <span className="font-mono-num opacity-80">({displayedFriendsCount})</span>
                </span>
                {incomingFriendRequestsCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white font-mono-num text-[10px] font-bold">
                    {incomingFriendRequestsCount}
                  </span>
                )}
              </button>
            )}
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
                <button
                  type="button"
                  disabled={!onOpenFriends}
                  onClick={onOpenFriends}
                  className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isSurv ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'
                  } ${onOpenFriends ? 'cursor-pointer hover:border-amber-500/60' : 'cursor-default'}`}
                >
                  <div className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {isRu ? 'Друзья' : isUz ? 'Do‘stlar' : 'Friends'}
                  </div>
                  <div className="font-mono-num text-base font-bold">{displayedFriendsCount}</div>
                </button>
              </div>
            </div>
          </div>

          {mainTab === 'achievements' ? (
            <AchievementsPanel profile={profile} language={language} mode={mode} />
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
