import React, { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  AchievementCategory,
  AchievementRarity,
  RARITY_POINTS,
} from '../core/achievements';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import { PlayerProfile, getAchievementProgressSnapshot } from '../core/profileManager';
import { AchievementIcon } from './AchievementIcon';

interface AchievementsPanelProps {
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
}

type FilterKey = 'all' | 'unlocked' | AchievementCategory;

const RARITY_CARD_STYLES: Record<
  AchievementRarity,
  {
    darkBorder: string;
    lightBorder: string;
    badge: string;
    iconUnlocked: string;
    barColor: string;
    label: { en: string; ru: string };
  }
> = {
  common: {
    darkBorder: 'border-stone-600/80',
    lightBorder: 'border-stone-400',
    badge: 'bg-stone-800 text-stone-300',
    iconUnlocked: 'bg-stone-800/90 text-stone-100 border-stone-500',
    barColor: 'bg-stone-400',
    label: { en: 'Common', ru: 'Обычное' },
  },
  rare: {
    darkBorder: 'border-sky-500/75',
    lightBorder: 'border-sky-500',
    badge: 'bg-sky-950 text-sky-300',
    iconUnlocked: 'bg-sky-950 text-sky-300 border-sky-500/75',
    barColor: 'bg-sky-500',
    label: { en: 'Rare', ru: 'Редкое' },
  },
  epic: {
    darkBorder: 'border-rose-500/80',
    lightBorder: 'border-rose-500',
    badge: 'bg-rose-950 text-rose-200',
    iconUnlocked: 'bg-rose-950 text-rose-300 border-rose-500/80',
    barColor: 'bg-rose-500',
    label: { en: 'Epic', ru: 'Эпическое' },
  },
  legendary: {
    darkBorder: 'border-amber-400/90',
    lightBorder: 'border-amber-500',
    badge: 'bg-amber-950 text-amber-200',
    iconUnlocked: 'bg-amber-950 text-amber-300 border-amber-400/90',
    barColor: 'bg-amber-400',
    label: { en: 'Legendary', ru: 'Легендарное' },
  },
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = React.memo(
  ({ profile, language, mode }) => {
    const [filter, setFilter] = useState<FilterKey>('all');
    const isSurv = mode === 'survival';
    const isRu = language === 'ru';

    const progressSnap = useMemo(() => getAchievementProgressSnapshot(profile), [profile]);
    const unlockedCount = useMemo(
      () => ACHIEVEMENTS.filter((a) => Boolean(profile.unlockedAchievements[a.id])).length,
      [profile.unlockedAchievements],
    );
    const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

    const filtered = useMemo(() => {
      return ACHIEVEMENTS.filter((ach) => {
        if (filter === 'all') return true;
        if (filter === 'unlocked') return Boolean(profile.unlockedAchievements[ach.id]);
        return ach.category === filter;
      });
    }, [filter, profile.unlockedAchievements]);

    const filters: { key: FilterKey; label: string }[] = [
      { key: 'all', label: isRu ? 'Все (32)' : 'All (32)' },
      { key: 'unlocked', label: isRu ? `Открытые (${unlockedCount})` : `Unlocked (${unlockedCount})` },
      { key: 'light', label: isRu ? 'Дружеский' : 'Friendly' },
      { key: 'survival', label: isRu ? 'Выживание' : 'Survival' },
      { key: 'tactics', label: isRu ? 'Тактика' : 'Tactics' },
      { key: 'general', label: isRu ? 'Общие' : 'General' },
    ];

    const formatDate = (iso: string): string => {
      try {
        return new Date(iso).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return '';
      }
    };

    return (
      <div className="space-y-4" data-testid="achievements-panel">
        {/* Top Summary & Overall Progress Bar */}
        <div
          className={`p-4 rounded-xl border ${
            isSurv ? 'bg-stone-900/90 border-stone-800' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <div className="text-sm font-bold">
                {isRu
                  ? `Открыто ${unlockedCount} / ${ACHIEVEMENTS.length}`
                  : `Unlocked ${unlockedCount} / ${ACHIEVEMENTS.length}`}
              </div>
              <div className={`text-xs ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {isRu
                  ? 'Каждое достижение навсегда добавляет очки к вашему счёту.'
                  : 'Every achievement permanently adds points to your profile score.'}
              </div>
            </div>
            <div className="font-mono-num text-2xl font-bold text-amber-500">{pct}%</div>
          </div>
          <div
            className={`w-full h-2.5 rounded-full overflow-hidden ${
              isSurv ? 'bg-stone-800' : 'bg-stone-200'
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  active
                    ? isSurv
                      ? 'bg-amber-600 border-amber-500 text-stone-950'
                      : 'bg-stone-900 border-stone-900 text-white'
                    : isSurv
                      ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                      : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <div
            className={`py-10 text-center text-sm rounded-xl border ${
              isSurv
                ? 'bg-stone-900/50 border-stone-800 text-stone-400'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {isRu
              ? 'Пока нет открытых достижений в этой категории — сыграйте партию!'
              : 'No unlocked achievements in this category yet — play a match!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((ach) => {
              const unlockedAt = profile.unlockedAchievements[ach.id];
              const unlocked = Boolean(unlockedAt);
              const style = RARITY_CARD_STYLES[ach.rarity];
              const current = Math.min(ach.target, ach.getCurrent(progressSnap));
              const barPct = ach.target > 0 ? Math.min(100, Math.round((current / ach.target) * 100)) : 0;
              const pts = RARITY_POINTS[ach.rarity];

              return (
                <div
                  key={ach.id}
                  data-achievement-id={ach.id}
                  data-unlocked={unlocked ? 'true' : 'false'}
                  className={`p-3.5 rounded-xl border transition-all flex gap-3 ${
                    unlocked
                      ? isSurv
                        ? `bg-stone-900/95 ${style.darkBorder}`
                        : `bg-white ${style.lightBorder} shadow-sm`
                      : isSurv
                        ? 'bg-stone-950/75 border-stone-800/80 opacity-75'
                        : 'bg-stone-50/85 border-stone-200 opacity-80'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
                      unlocked
                        ? style.iconUnlocked
                        : isSurv
                          ? 'bg-stone-900 text-stone-600 border-stone-800'
                          : 'bg-stone-100 text-stone-400 border-stone-300'
                    }`}
                  >
                    <AchievementIcon icon={ach.icon} className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold leading-tight">{ach.title[language]}</span>
                        <span className="font-mono-num text-[11px] font-bold text-amber-500 shrink-0">
                          +{pts}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-snug ${
                          isSurv ? 'text-stone-400' : 'text-stone-600'
                        }`}
                      >
                        {ach.description[language]}
                      </p>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      {ach.target > 1 && (
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono-num opacity-80 mb-0.5">
                            <span>{isRu ? 'Прогресс' : 'Progress'}</span>
                            <span>
                              {current} / {ach.target}
                            </span>
                          </div>
                          <div
                            className={`w-full h-1.5 rounded-full overflow-hidden ${
                              isSurv ? 'bg-stone-800' : 'bg-stone-200'
                            }`}
                          >
                            <div
                              className={`h-full ${unlocked ? style.barColor : 'bg-stone-500'}`}
                              style={{ width: `${unlocked ? 100 : barPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${style.badge}`}
                        >
                          {style.label[language]}
                        </span>
                        {unlocked && unlockedAt && (
                          <span className="text-[10px] font-mono-num text-emerald-500">
                            ✓ {formatDate(unlockedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
AchievementsPanel.displayName = 'AchievementsPanel';
