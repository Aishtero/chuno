import { Language, getTranslations } from './localization';
import { MatchActor, MatchPhase } from './match/matchEngine';

export const GUIDE_SLIDE_COUNT = 5;
export const GUIDE_AUTOPLAY_MS = 4500;
export const FIRST_MATCH_HINT_CYCLES = 2;

export function clampGuideSlide(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(GUIDE_SLIDE_COUNT - 1, Math.floor(index)));
}

export function nextGuideSlide(current: number): number {
  return clampGuideSlide(current + 1);
}

export function prevGuideSlide(current: number): number {
  return clampGuideSlide(current - 1);
}

export function resolveFirstMatchHint(options: {
  hasSeenFirstMatchHints: boolean;
  completedCycles: number;
  phase: MatchPhase;
  activeActor: MatchActor;
  language: Language;
}): string | null {
  if (options.hasSeenFirstMatchHints) return null;
  if (options.completedCycles >= FIRST_MATCH_HINT_CYCLES) return null;
  if (options.phase === 'MATCH_OVER') return null;

  const t = getTranslations(options.language);

  if (options.phase === 'AWAIT_COIN_CHOICE' && options.activeActor === 'opponent') {
    return t.hintCoinFlip;
  }
  if (options.activeActor !== 'player') return null;

  switch (options.phase) {
    case 'AWAIT_DRAW_CARD':
      return t.hintDrawCard;
    case 'PLAYER_MOVE_LOOP':
      return t.hintMovePiece;
    case 'AWAIT_RESURRECT_PLACEMENT':
      return t.hintResurrect;
    case 'AWAIT_WILD_ACTION':
      return t.hintWild;
    default:
      return null;
  }
}
