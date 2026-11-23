import React from 'react';
import { AchievementDefinition, AchievementRarity, RARITY_POINTS } from '../core/achievements';
import { Language } from '../core/localization';
import { AchievementIcon } from './AchievementIcon';

interface AchievementToastProps {
  items: AchievementDefinition[];
  language: Language;
  onDismiss: (id: string) => void;
}

const RARITY_STYLES: Record<
  AchievementRarity,
  { border: string; badge: string; iconBg: string; label: { en: string; ru: string } }
> = {
  common: {
    border: 'border-stone-500/70',
    badge: 'text-stone-300 bg-stone-800',
    iconBg: 'bg-stone-800 text-stone-200 border-stone-600',
    label: { en: 'Common', ru: 'Обычное' },
  },
  rare: {
    border: 'border-sky-500/70',
    badge: 'text-sky-300 bg-sky-950',
    iconBg: 'bg-sky-950/90 text-sky-300 border-sky-500/60',
    label: { en: 'Rare', ru: 'Редкое' },
  },
  epic: {
    border: 'border-rose-500/75',
    badge: 'text-rose-200 bg-rose-950',
    iconBg: 'bg-rose-950/90 text-rose-300 border-rose-500/70',
    label: { en: 'Epic', ru: 'Эпическое' },
  },
  legendary: {
    border: 'border-amber-400/85',
    badge: 'text-amber-200 bg-amber-950',
    iconBg: 'bg-amber-950/90 text-amber-300 border-amber-400/80',
    label: { en: 'Legendary', ru: 'Легендарное' },
  },
};

export const AchievementToast: React.FC<AchievementToastProps> = React.memo(
  ({ items, language, onDismiss }) => {
    if (items.length === 0) return null;

    return (
      <div
        data-testid="achievement-toast-stack"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none"
      >
        {items.map((ach) => {
          const st = RARITY_STYLES[ach.rarity];
          const pts = RARITY_POINTS[ach.rarity];
          return (
            <div
              key={ach.id}
              onClick={() => onDismiss(ach.id)}
              role="status"
              className={`pointer-events-auto cursor-pointer flex items-center gap-3.5 px-4 py-3 rounded-xl border bg-stone-950/95 text-stone-100 shadow-2xl backdrop-blur-sm animate-[fadeIn_220ms_ease-out] ${st.border}`}
            >
              <div
                className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${st.iconBg}`}
              >
                <AchievementIcon icon={ach.icon} className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {language === 'ru' ? 'Достижение открыто' : 'Achievement Unlocked'}
                  </span>
                  <span className="font-mono-num text-[11px] font-bold text-emerald-400 shrink-0">
                    +{pts}
                  </span>
                </div>
                <div className="text-sm font-bold leading-snug truncate">{ach.title[language]}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${st.badge}`}>
                    {st.label[language]}
                  </span>
                  <span className="text-[11px] text-stone-400 truncate">
                    {ach.description[language]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
AchievementToast.displayName = 'AchievementToast';
