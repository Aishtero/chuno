import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Code2,
  Globe,
  HelpCircle,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { ACHIEVEMENTS } from '../core/achievements';
import { DifficultyLevel, GameMode, LightPersonality } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';
import { MainMenuTab, OnlineSubMode } from '../core/menuNavigation';
import { ActiveOnlineSession } from '../core/onlineClient';
import { APP_VERSION, PlayerProfile } from '../core/profileManager';
import { WebGuestGateStatus } from '../core/webGuestGate';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

interface TitleScreenProps {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  language: Language;
  muted: boolean;
  isTauri: boolean;
  onlineEnabled: boolean;
  incomingFriendRequestsCount: number;
  profile: PlayerProfile;
  guestStatus: WebGuestGateStatus;
  reconnectSession?: ActiveOnlineSession | null;
  reconnectingMatch?: boolean;
  onReconnectMatch?: (session: ActiveOnlineSession) => void;
  onDismissReconnectSession?: () => void;
  hasUpdateAvailable?: boolean;
  availableUpdateVersion?: string | null;
  showUpdateToast?: boolean;
  onDismissUpdateToast?: () => void;
  onCheckUpdates?: () => void;
  onChangeMode: (mode: GameMode) => void;
  onChangeDifficulty: (diff: DifficultyLevel) => void;
  onChangePersonality: (p: LightPersonality) => void;
  onChangeLanguage: (lang: Language) => void;
  onOpenAudioSettings: () => void;
  onStart: () => void;
  onOpenProfile: () => void;
  onOpenFriends: () => void;
  onBlockedOnlineAttempt: () => void;
  onOpenOnlineLobby: (subMode: OnlineSubMode) => void;
  onOpenGuide: () => void;
  onOpenRules: () => void;
  onOpenLeaderboard: () => void;
  onOpenGodot: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = React.memo(({
  mode,
  difficulty,
  personality,
  language,
  muted,
  isTauri,
  onlineEnabled,
  incomingFriendRequestsCount,
  profile,
  guestStatus,
  reconnectSession,
  reconnectingMatch,
  onReconnectMatch,
  onDismissReconnectSession,
  hasUpdateAvailable,
  availableUpdateVersion,
  showUpdateToast,
  onDismissUpdateToast,
  onCheckUpdates,
  onChangeMode,
  onChangeDifficulty,
  onChangePersonality,
  onChangeLanguage,
  onOpenAudioSettings,
  onStart,
  onOpenProfile,
  onOpenFriends,
  onBlockedOnlineAttempt,
  onOpenOnlineLobby,
  onOpenGuide,
  onOpenRules,
  onOpenLeaderboard,
  onOpenGodot,
}) => {
  const t = getTranslations(language);
  const isSurv = mode === 'survival';
  const isRu = language === 'ru';
  const isUz = language === 'uz';

  const [onlineTabActive, setOnlineTabActive] = useState(false);

  const activeMenuTab: MainMenuTab = onlineTabActive
    ? 'online'
    : mode === 'survival'
      ? 'survival'
      : 'campaign';

  const unlockedCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => Boolean(profile.unlockedAchievements[a.id])).length,
    [profile.unlockedAchievements],
  );

  const clickThen = (fn: () => void) => {
    soundManager.playClick();
    fn();
  };

  const desktopOnlyBadgeText = isRu
    ? 'Только на ПК'
    : isUz
      ? 'Faqat PK ilovasida'
      : 'Desktop App Only';

  const handleSelectMenuTab = (tab: MainMenuTab) => {
    soundManager.playClick();
    if (tab === 'online') {
      setOnlineTabActive(true);
      if (!onlineEnabled) {
        onBlockedOnlineAttempt();
      }
      return;
    }
    setOnlineTabActive(false);
    onChangeMode(tab === 'survival' ? 'survival' : 'light');
  };

  const langBtnClass = (target: Language) =>
    `px-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      language === target
        ? isSurv
          ? 'text-[#f3ece0] font-semibold border-b border-[#8B1E1E]'
          : 'text-[#1b241e] font-semibold border-b border-[#2e4738]'
        : isSurv
          ? 'text-stone-500 hover:text-stone-200'
          : 'text-stone-500 hover:text-stone-900'
    }`;

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none flex flex-col justify-between px-4 py-4 sm:px-8 sm:py-7 md:px-14 md:py-10 transition-colors duration-300 ${
        isSurv
          ? 'bg-gradient-to-r from-[#080606]/90 via-[#080606]/48 via-32% to-transparent text-[#eae3d5]'
          : 'bg-gradient-to-r from-[#f4ece0]/86 via-[#f4ece0]/38 via-30% to-transparent text-[#1f2923]'
      }`}
    >
      {/* Top Bar: EN | RU | UZ + Guest badge | Profile + Leaderboard + Guide + Rules + Sound */}
      <header className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="inline-flex items-center gap-1.5 text-xs tracking-wider" role="group" aria-label="Language">
          <button
            type="button"
            data-lang-btn="en"
            onClick={() => clickThen(() => onChangeLanguage('en'))}
            className={langBtnClass('en')}
          >
            EN
          </button>
          <span className={isSurv ? 'text-stone-700' : 'text-stone-400'} aria-hidden="true">
            |
          </span>
          <button
            type="button"
            data-lang-btn="ru"
            onClick={() => clickThen(() => onChangeLanguage('ru'))}
            className={langBtnClass('ru')}
          >
            RU
          </button>
          <span className={isSurv ? 'text-stone-700' : 'text-stone-400'} aria-hidden="true">
            |
          </span>
          <button
            type="button"
            data-lang-btn="uz"
            onClick={() => clickThen(() => onChangeLanguage('uz'))}
            className={langBtnClass('uz')}
          >
            UZ
          </button>

          {!isTauri && guestStatus.isGuestMode && (
            <span
              data-testid="web-guest-badge"
              className={`ml-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono-num text-[11px] font-semibold ${
                isSurv
                  ? 'border-amber-500/35 bg-stone-950/75 text-amber-300'
                  : 'border-[#2e4738]/25 bg-white/75 text-[#1f3327]'
              }`}
            >
              <Sparkles className="w-3 h-3 opacity-80" />
              <span>
                {isRu
                  ? `Гость · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches} партий`
                  : isUz
                    ? `Mehmon · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches}`
                    : `Guest · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches} matches`}
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-5">
          {/* Player Profile Button (person icon + mini avatar + nickname) */}
          <button
            type="button"
            data-testid="open-player-profile"
            onClick={() => clickThen(onOpenProfile)}
            className={`inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'border-amber-500/40 bg-stone-950/80 text-stone-100 hover:border-amber-400 hover:bg-stone-900'
                : 'border-[#2e4738]/30 bg-white/85 text-[#1b241e] hover:border-[#2e4738]/60 hover:bg-white'
            }`}
            title={t.profileModalTitle}
          >
            <PlayerAvatarPortrait avatarId={profile.avatarId} size={22} />
            <User className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
            <span className="max-w-[110px] truncate" data-testid="title-player-nickname">
              {profile.nickname || profile.displayName}
            </span>
          </button>

          {/* Prominent Friends Button with red incoming requests badge (or lock icon in Web prod) */}
          <button
            type="button"
            data-testid="open-friends-btn"
            onClick={() => clickThen(onlineEnabled ? onOpenFriends : onBlockedOnlineAttempt)}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'border-stone-700/90 bg-stone-950/80 text-stone-100 hover:border-amber-400 hover:text-amber-200'
                : 'border-[#2e4738]/30 bg-white/85 text-[#1b241e] hover:border-[#2e4738]/70 hover:bg-white'
            }`}
            title={onlineEnabled ? t.friendsTab : desktopOnlyBadgeText}
          >
            <Users className="w-3.5 h-3.5 opacity-85" aria-hidden="true" />
            <span>{t.friendsTab}</span>
            {!onlineEnabled ? (
              <Lock className="w-3 h-3 opacity-70" aria-hidden="true" />
            ) : (
              incomingFriendRequestsCount > 0 && (
                <span
                  data-testid="friends-incoming-badge"
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white font-mono-num text-[10px] font-bold shadow-sm"
                >
                  {incomingFriendRequestsCount}
                </span>
              )
            )}
          </button>

          {/* Single merged Leaderboard (+ Achievements) button */}
          <button
            type="button"
            data-testid="open-leaderboard"
            onClick={() => clickThen(onOpenLeaderboard)}
            className={`inline-flex items-center gap-1.5 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'text-amber-300/90 hover:text-amber-200'
                : 'text-[#2b4235] hover:text-[#141c17]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 opacity-85" />
            <span>{t.leaderboardBtn}</span>
            <span
              className={`font-mono-num text-[10px] px-1.5 py-0.5 rounded-full ${
                isSurv
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-[#2e4738]/12 text-[#22382b]'
              }`}
            >
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>
          </button>

          <button
            type="button"
            data-testid="title-how-to-play"
            onClick={() => clickThen(onOpenGuide)}
            className={`inline-flex items-center gap-1.5 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'text-amber-300/90 hover:text-amber-200'
                : 'text-[#2b4235] hover:text-[#141c17]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 opacity-85" />
            <span>{t.howToPlayBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => clickThen(onOpenRules)}
            className={`inline-flex items-center gap-1.5 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'text-stone-300 hover:text-[#f5efe6]'
                : 'text-[#313f36] hover:text-[#141c17]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 opacity-80" />
            <span>{t.rulesAndStats}</span>
          </button>

          <button
            type="button"
            data-testid="open-audio-settings"
            onClick={() => clickThen(onOpenAudioSettings)}
            aria-label={t.audioSettingsTitle}
            className={`relative inline-flex items-center gap-1.5 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'text-stone-300 hover:text-[#f5efe6]'
                : 'text-[#313f36] hover:text-[#141c17]'
            }`}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 opacity-80 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 opacity-80" />
            )}
            <span>
              {muted
                ? isRu
                  ? 'Без звука'
                  : isUz
                    ? 'Ovoz o‘chirilgan'
                    : 'Muted'
                : isRu
                  ? 'Звук'
                  : isUz
                    ? 'Ovoz'
                    : 'Sound'}
            </span>
            {isTauri && hasUpdateAvailable && (
              <span
                data-testid="title-settings-update-dot"
                className="relative flex h-2 w-2 shrink-0"
                aria-hidden="true"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Reconnect Banner for unfinished online match (< 2 min) */}
      {onlineEnabled && reconnectSession && onReconnectMatch && (
        <div
          data-testid="title-reconnect-banner"
          className={`pointer-events-auto mx-auto mt-2 w-full max-w-xl rounded-xl border px-3.5 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2.5 ${
            isSurv
              ? 'border-amber-500/60 bg-stone-950/92 text-stone-100'
              : 'border-emerald-600/50 bg-white/95 text-stone-900'
          }`}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">
                {t.onlineReconnectBannerTitle} ·{' '}
                <span className="font-mono-num text-amber-500">{reconnectSession.roomCode}</span>
              </div>
              <div className={`text-[11px] truncate ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                vs {reconnectSession.opponentNickname}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="title-reconnect-btn"
              disabled={Boolean(reconnectingMatch)}
              onClick={() => clickThen(() => onReconnectMatch(reconnectSession))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isSurv
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconnectingMatch ? 'animate-spin' : ''}`} />
              <span>
                {t.onlineReconnectBannerBtn} ({reconnectSession.roomCode})
              </span>
            </button>
            {onDismissReconnectSession && (
              <button
                type="button"
                data-testid="title-reconnect-dismiss"
                onClick={() => clickThen(onDismissReconnectSession)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isSurv
                    ? 'border-stone-700 text-stone-300 hover:bg-stone-900'
                    : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {t.onlineReconnectDismissBtn}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free-standing atmospheric left column over the 3D scene */}
      <main className="max-w-sm md:max-w-md pointer-events-auto my-auto">
        <div className="mb-7">
          <h1
            data-testid="title-brand-logo"
            className={`font-display text-6xl md:text-7xl font-bold tracking-tight leading-none select-none pointer-events-none ${
              isSurv ? 'text-[#ede6d8]' : 'text-[#1c2620]'
            }`}
          >
            {t.gameTitle}
          </h1>
          <div
            className={`mt-4 w-20 h-px ${isSurv ? 'bg-[#8B1E1E]/80' : 'bg-[#2c4a38]/35'}`}
            aria-hidden="true"
          />
        </div>

        {/* 3 Main Modes: Campaign | Survival | Online */}
        <div
          className={`flex items-center gap-5 sm:gap-6 border-b mb-6 ${
            isSurv ? 'border-stone-800/80' : 'border-stone-800/15'
          }`}
          role="tablist"
          aria-label="Game Mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMenuTab === 'campaign'}
            data-menu-tab="campaign"
            onClick={() => handleSelectMenuTab('campaign')}
            className={`pb-2.5 -mb-px text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenuTab === 'campaign'
                ? 'text-[#18231c] border-b-2 border-[#2d4e3b]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200 border-b-2 border-transparent'
                  : 'text-stone-500 hover:text-stone-900 border-b-2 border-transparent'
            }`}
          >
            {t.modeLight}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMenuTab === 'survival'}
            data-menu-tab="survival"
            onClick={() => handleSelectMenuTab('survival')}
            className={`pb-2.5 -mb-px text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenuTab === 'survival'
                ? 'text-[#f3ece0] border-b-2 border-[#8B1E1E]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200 border-b-2 border-transparent'
                  : 'text-stone-500 hover:text-stone-900 border-b-2 border-transparent'
            }`}
          >
            {t.modeSurvival}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMenuTab === 'online'}
            data-menu-tab="online"
            onClick={() => handleSelectMenuTab('online')}
            className={`inline-flex items-center gap-1.5 pb-2.5 -mb-px text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenuTab === 'online'
                ? isSurv
                  ? 'text-amber-300 border-b-2 border-amber-400'
                  : 'text-[#18231c] border-b-2 border-[#2d4e3b]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200 border-b-2 border-transparent'
                  : 'text-stone-500 hover:text-stone-900 border-b-2 border-transparent'
            }`}
          >
            <Globe className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
            <span>{t.modeOnline}</span>
            {!onlineEnabled && (
              <span
                data-testid="online-tab-lock-badge"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSurv
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                <span className="hidden sm:inline">{desktopOnlyBadgeText}</span>
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeMenuTab === 'online' ? (
          <div className="space-y-3 mb-6" data-testid="online-submode-menu">
            <p className={`text-xs leading-relaxed ${isSurv ? 'text-stone-300' : 'text-[#394940]'}`}>
              {t.onlineSubtitle}
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                data-online-card="online_friendly"
                onClick={() =>
                  clickThen(() =>
                    onlineEnabled
                      ? onOpenOnlineLobby('online_friendly')
                      : onBlockedOnlineAttempt(),
                  )
                }
                className={`group text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSurv
                    ? 'border-stone-700/90 bg-stone-950/80 hover:border-emerald-500/70 hover:bg-stone-900'
                    : 'border-[#2e4738]/25 bg-white/85 hover:border-[#2e4738] hover:bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Swords className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold truncate">{t.onlineFriendlyTitle}</span>
                  </div>
                  {!onlineEnabled && (
                    <span
                      data-testid="online-card-lock-badge"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isSurv
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>{desktopOnlyBadgeText}</span>
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs leading-snug ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                  {t.onlineFriendlyDesc}
                </p>
              </button>

              <button
                type="button"
                data-online-card="online_survival"
                onClick={() =>
                  clickThen(() =>
                    onlineEnabled
                      ? onOpenOnlineLobby('online_survival')
                      : onBlockedOnlineAttempt(),
                  )
                }
                className={`group text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSurv
                    ? 'border-stone-700/90 bg-stone-950/80 hover:border-red-500/70 hover:bg-stone-900'
                    : 'border-[#8B1E1E]/25 bg-white/85 hover:border-[#8B1E1E] hover:bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-sm font-bold truncate">{t.onlineSurvivalTitle}</span>
                  </div>
                  {!onlineEnabled && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isSurv
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>{desktopOnlyBadgeText}</span>
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs leading-snug ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                  {t.onlineSurvivalDesc}
                </p>
              </button>
            </div>
          </div>
        ) : activeMenuTab === 'survival' ? (
          <>
            <div className="flex flex-col gap-1 mb-9" role="group" aria-label="Difficulty">
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((d) => {
                const label =
                  d === 'easy'
                    ? t.difficultyEasy
                    : d === 'medium'
                      ? t.difficultyMedium
                      : t.difficultyHard;
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => clickThen(() => onChangeDifficulty(d))}
                    className={`group flex items-center gap-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      active ? 'text-[#f5efe6] font-semibold' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span
                      className={`inline-block w-[2px] h-4 transition-all ${
                        active ? 'bg-[#8B1E1E] opacity-100' : 'bg-stone-600 opacity-0 group-hover:opacity-45'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              data-start="true"
              onClick={() => clickThen(onStart)}
              className="w-full max-w-[260px] py-3.5 px-7 text-sm font-semibold tracking-wide rounded-[2px] border transition-colors duration-200 active:scale-[0.99] whitespace-nowrap cursor-pointer bg-[#ede6d8] text-[#110d0c] border-[#ede6d8]/80 hover:bg-[#8B1E1E] hover:text-[#f5efe6] hover:border-[#8B1E1E]"
            >
              {t.startGame}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-9" role="group" aria-label="Companion Personality">
              {(
                [
                  ['enthusiast', t.personalityEnthusiast],
                  ['egoist', t.personalityEgoist],
                  ['calm', t.personalityCalm],
                  ['unknown', t.personalityUnknown],
                ] as [LightPersonality, string][]
              ).map(([key, label]) => {
                const active = personality === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => clickThen(() => onChangePersonality(key))}
                    className={`group flex items-center gap-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      active ? 'text-[#16201a] font-semibold' : 'text-[#556159] hover:text-[#1f2923]'
                    }`}
                  >
                    <span
                      className={`inline-block w-[2px] h-4 transition-all ${
                        active ? 'bg-[#2d4e3b] opacity-100' : 'bg-stone-500 opacity-0 group-hover:opacity-40'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              data-start="true"
              onClick={() => clickThen(onStart)}
              className="w-full max-w-[260px] py-3.5 px-7 text-sm font-semibold tracking-wide rounded-[2px] border transition-colors duration-200 active:scale-[0.99] whitespace-nowrap cursor-pointer bg-[#1e2922] text-[#f6f0e2] border-[#1e2922] hover:bg-[#2d4e3b] hover:border-[#2d4e3b]"
            >
              {t.startGame}
            </button>
          </>
        )}
      </main>

      {/* Bottom row: version / updater badge on left (in Tauri), discreet Godot link in bottom-right corner */}
      <footer className="flex items-center justify-between gap-3 pointer-events-auto">
        {isTauri && onCheckUpdates ? (
          <button
            type="button"
            data-testid="title-check-updates"
            onClick={() => clickThen(onCheckUpdates)}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono-num font-semibold transition-colors cursor-pointer ${
              hasUpdateAvailable
                ? 'border-red-500/70 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : isSurv
                  ? 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-stone-200'
                  : 'border-stone-400/40 bg-white/70 text-stone-700 hover:text-stone-950'
            }`}
          >
            {hasUpdateAvailable && (
              <span
                data-testid="title-version-update-dot"
                className="relative flex h-2 w-2 shrink-0"
                aria-hidden="true"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            <RefreshCw className="w-3 h-3" />
            <span>
              v{APP_VERSION} ·{' '}
              {hasUpdateAvailable
                ? `${t.updateAvailableTitle}${availableUpdateVersion ? ` v${availableUpdateVersion}` : ''}`
                : isRu
                  ? 'Проверить обновления'
                  : isUz
                    ? 'Yangilanishni tekshirish'
                    : 'Check updates'}
            </span>
          </button>
        ) : (
          <span
            className={`text-[11px] font-mono-num opacity-45 ${
              isSurv ? 'text-stone-400' : 'text-stone-700'
            }`}
          >
            v{APP_VERSION}
          </span>
        )}

        <button
          type="button"
          onClick={() => clickThen(onOpenGodot)}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wide transition-opacity opacity-35 hover:opacity-85 cursor-pointer ${
            isSurv ? 'text-stone-400' : 'text-stone-700'
          }`}
        >
          <Code2 className="w-3 h-3" />
          <span>{t.godotSource}</span>
        </button>
      </footer>

      {/* Desktop-only corner Update Toast (dismissing via Later keeps red dots active) */}
      {isTauri && showUpdateToast && availableUpdateVersion && onCheckUpdates && (
        <div
          data-testid="title-update-toast"
          className={`fixed bottom-12 right-4 sm:right-8 z-30 pointer-events-auto max-w-xs rounded-xl border p-3.5 shadow-2xl ${
            isSurv
              ? 'bg-stone-950/95 border-red-500/50 text-stone-100'
              : 'bg-white/96 border-red-500/40 text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span>
              {t.updateAvailableTitle} v{availableUpdateVersion}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              data-testid="update-toast-now"
              onClick={() => clickThen(onCheckUpdates)}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer"
            >
              {t.updateNowBtn}
            </button>
            {onDismissUpdateToast && (
              <button
                type="button"
                data-testid="update-toast-later"
                onClick={() => clickThen(onDismissUpdateToast)}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold border cursor-pointer ${
                  isSurv
                    ? 'border-stone-700 text-stone-300 hover:bg-stone-900'
                    : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {t.updateLaterBtn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
TitleScreen.displayName = 'TitleScreen';
