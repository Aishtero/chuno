import React from 'react';
import { BookOpen, Code2, RefreshCw, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { DifficultyLevel, GameMode, LightPersonality } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';
import { APP_VERSION } from '../core/profileManager';
import { WebGuestGateStatus } from '../core/webGuestGate';

interface TitleScreenProps {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  language: Language;
  muted: boolean;
  isTauri: boolean;
  guestStatus: WebGuestGateStatus;
  hasUpdateAvailable?: boolean;
  onCheckUpdates?: () => void;
  onChangeMode: (mode: GameMode) => void;
  onChangeDifficulty: (diff: DifficultyLevel) => void;
  onChangePersonality: (p: LightPersonality) => void;
  onChangeLanguage: (lang: Language) => void;
  onOpenAudioSettings: () => void;
  onStart: () => void;
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
  guestStatus,
  hasUpdateAvailable,
  onCheckUpdates,
  onChangeMode,
  onChangeDifficulty,
  onChangePersonality,
  onChangeLanguage,
  onOpenAudioSettings,
  onStart,
  onOpenRules,
  onOpenLeaderboard,
  onOpenGodot,
}) => {
  const t = getTranslations(language);
  const isSurv = mode === 'survival';
  const isRu = language === 'ru';

  const clickThen = (fn: () => void) => {
    soundManager.playClick();
    fn();
  };

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none flex flex-col justify-between px-4 py-4 sm:px-8 sm:py-7 md:px-14 md:py-10 transition-colors duration-300 ${
        isSurv
          ? 'bg-gradient-to-r from-[#080606]/90 via-[#080606]/48 via-32% to-transparent text-[#eae3d5]'
          : 'bg-gradient-to-r from-[#f4ece0]/86 via-[#f4ece0]/38 via-30% to-transparent text-[#1f2923]'
      }`}
    >
      {/* Top Bar: clean EN | RU + Guest/Desktop badge + Rules & Sound */}
      <header className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="inline-flex items-center gap-2 text-xs tracking-wider" role="group" aria-label="Language">
          <button
            type="button"
            onClick={() => clickThen(() => onChangeLanguage('en'))}
            className={`px-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'en'
                ? isSurv
                  ? 'text-[#f3ece0] font-semibold border-b border-[#8B1E1E]'
                  : 'text-[#1b241e] font-semibold border-b border-[#2e4738]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200'
                  : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            EN
          </button>
          <span className={isSurv ? 'text-stone-700' : 'text-stone-400'} aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={() => clickThen(() => onChangeLanguage('ru'))}
            className={`px-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'ru'
                ? isSurv
                  ? 'text-[#f3ece0] font-semibold border-b border-[#8B1E1E]'
                  : 'text-[#1b241e] font-semibold border-b border-[#2e4738]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200'
                  : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            RU
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
                  : `Guest · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches} matches`}
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
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
            <span>{language === 'ru' ? 'Лидеры и ачивки' : 'Leader Dashboard'}</span>
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
            className={`inline-flex items-center gap-1.5 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSurv
                ? 'text-stone-300 hover:text-[#f5efe6]'
                : 'text-[#313f36] hover:text-[#141c17]'
            }`}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 opacity-80 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 opacity-80" />}
            <span>{muted ? (language === 'ru' ? 'Без звука' : 'Muted') : (language === 'ru' ? 'Звук' : 'Sound')}</span>
          </button>
        </div>
      </header>

      {/* Free-standing atmospheric left column over the 3D scene */}
      <main className="max-w-xs md:max-w-sm pointer-events-auto my-auto">
        <div className="mb-8">
          <h1
            className={`font-display text-6xl md:text-7xl font-bold tracking-tight leading-none select-none ${
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

        {/* Mode Tabs: Friendly first, Survival second */}
        <div
          className={`flex items-center gap-7 border-b mb-7 ${
            isSurv ? 'border-stone-800/80' : 'border-stone-800/15'
          }`}
          role="group"
          aria-label="Game Mode"
        >
          <button
            type="button"
            onClick={() => clickThen(() => onChangeMode('light'))}
            className={`pb-2.5 -mb-px text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'light'
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
            onClick={() => clickThen(() => onChangeMode('survival'))}
            className={`pb-2.5 -mb-px text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'survival'
                ? 'text-[#f3ece0] border-b-2 border-[#8B1E1E]'
                : isSurv
                  ? 'text-stone-500 hover:text-stone-200 border-b-2 border-transparent'
                  : 'text-stone-500 hover:text-stone-900 border-b-2 border-transparent'
            }`}
          >
            {t.modeSurvival}
          </button>
        </div>

        {/* Sub-options: Minimal vertical typographic list with left indicator */}
        {isSurv ? (
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
        ) : (
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
        )}

        {/* Primary CTA */}
        <button
          type="button"
          data-start="true"
          onClick={() => clickThen(onStart)}
          className={`w-full max-w-[260px] py-3.5 px-7 text-sm font-semibold tracking-wide rounded-[2px] border transition-colors duration-200 active:scale-[0.99] whitespace-nowrap cursor-pointer ${
            isSurv
              ? 'bg-[#ede6d8] text-[#110d0c] border-[#ede6d8]/80 hover:bg-[#8B1E1E] hover:text-[#f5efe6] hover:border-[#8B1E1E]'
              : 'bg-[#1e2922] text-[#f6f0e2] border-[#1e2922] hover:bg-[#2d4e3b] hover:border-[#2d4e3b]'
          }`}
        >
          {t.startGame}
        </button>
      </main>

      {/* Bottom row: version / updater badge on left (in Tauri), discreet Godot link in bottom-right corner */}
      <footer className="flex items-center justify-between gap-3 pointer-events-auto">
        {isTauri && onCheckUpdates ? (
          <button
            type="button"
            data-testid="title-check-updates"
            onClick={() => clickThen(onCheckUpdates)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono-num font-semibold transition-colors cursor-pointer ${
              hasUpdateAvailable
                ? 'border-amber-500 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : isSurv
                  ? 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-stone-200'
                  : 'border-stone-400/40 bg-white/70 text-stone-700 hover:text-stone-950'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>
              v{APP_VERSION} ·{' '}
              {hasUpdateAvailable
                ? isRu
                  ? 'Доступно обновление'
                  : 'Update available'
                : isRu
                  ? 'Проверить обновления'
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
    </div>
  );
});
TitleScreen.displayName = 'TitleScreen';
