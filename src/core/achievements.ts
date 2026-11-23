import { DifficultyLevel, GameMode, LightPersonality } from './deck/cardData';
import { MatchEndReason } from './match/matchEngine';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'general' | 'survival' | 'light' | 'tactics';

export type AchievementIconId =
  | 'card_chair'
  | 'deck_stack'
  | 'hourglass'
  | 'laurel_crown'
  | 'pawn_star'
  | 'trophy_king'
  | 'obsidian_crown'
  | 'heart_pulse'
  | 'red_eyes'
  | 'skull_crown'
  | 'cracked_skull'
  | 'twin_revolver'
  | 'iron_mask'
  | 'flame_skull'
  | 'bullet_skull'
  | 'cylinder_six'
  | 'coin_wings'
  | 'coin_glow'
  | 'clean_king'
  | 'sun_pawn'
  | 'shades_crack'
  | 'glasses_owl'
  | 'book_queen'
  | 'fedora_mask'
  | 'compass_four'
  | 'flame_card'
  | 'blazing_crown'
  | 'lightning_king'
  | 'plus_four'
  | 'reverse_arrows'
  | 'wild_prism'
  | 'stopwatch_bolt';

export interface AchievementProgressSnapshot {
  totalMatches: number;
  totalWins: number;
  survivalWins: {
    easy: number;
    medium: number;
    hard: number;
  };
  survivalWinByRevolver: number;
  maxCoinsSurvivedInMatch: number;
  totalCoinsSurvived: number;
  bloodlessSurvivalWins: number;
  lightWins: {
    enthusiast: number;
    egoist: number;
    calm: number;
    unknown: number;
  };
  bestWinStreak: number;
  maxResurrectedSingleCard: number;
  winsAfterReverse: number;
  wildCheckmates: number;
  fastestWinSec: number | null;
}

export interface AchievementDefinition {
  id: string;
  icon: AchievementIconId;
  rarity: AchievementRarity;
  category: AchievementCategory;
  title: { en: string; ru: string };
  description: { en: string; ru: string };
  target: number;
  getCurrent: (s: AchievementProgressSnapshot) => number;
  isUnlocked: (s: AchievementProgressSnapshot) => boolean;
}

export const RARITY_POINTS: Record<AchievementRarity, number> = {
  common: 50,
  rare: 150,
  epic: 300,
  legendary: 600,
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // 1-7: General Milestones
  {
    id: 'first_seat',
    icon: 'card_chair',
    rarity: 'common',
    category: 'general',
    title: { en: 'First Seat', ru: 'Первый за стол' },
    description: {
      en: 'Finish your first match in any mode.',
      ru: 'Завершить первую партию в любом режиме.',
    },
    target: 1,
    getCurrent: (s) => s.totalMatches,
    isUnlocked: (s) => s.totalMatches >= 1,
  },
  {
    id: 'regular_10',
    icon: 'deck_stack',
    rarity: 'common',
    category: 'general',
    title: { en: 'Table Regular', ru: 'Завсегдатай' },
    description: {
      en: 'Play 10 matches.',
      ru: 'Сыграть 10 партий.',
    },
    target: 10,
    getCurrent: (s) => s.totalMatches,
    isUnlocked: (s) => s.totalMatches >= 10,
  },
  {
    id: 'veteran_50',
    icon: 'hourglass',
    rarity: 'rare',
    category: 'general',
    title: { en: 'Fifty Deals', ru: 'Полсотни раздач' },
    description: {
      en: 'Play 50 matches.',
      ru: 'Сыграть 50 партий.',
    },
    target: 50,
    getCurrent: (s) => s.totalMatches,
    isUnlocked: (s) => s.totalMatches >= 50,
  },
  {
    id: 'centurion_100',
    icon: 'laurel_crown',
    rarity: 'epic',
    category: 'general',
    title: { en: 'Centurion of the Table', ru: 'Сотня за столом' },
    description: {
      en: 'Play 100 matches in ChUno.',
      ru: 'Провести 100 партий в ChUno.',
    },
    target: 100,
    getCurrent: (s) => s.totalMatches,
    isUnlocked: (s) => s.totalMatches >= 100,
  },
  {
    id: 'wins_10',
    icon: 'pawn_star',
    rarity: 'common',
    category: 'general',
    title: { en: 'First Blood on the Board', ru: 'Десять побед' },
    description: {
      en: 'Win 10 matches in any mode.',
      ru: 'Одержать 10 побед в любом режиме.',
    },
    target: 10,
    getCurrent: (s) => s.totalWins,
    isUnlocked: (s) => s.totalWins >= 10,
  },
  {
    id: 'wins_50',
    icon: 'trophy_king',
    rarity: 'epic',
    category: 'general',
    title: { en: 'Table Veteran', ru: 'Ветеран доски' },
    description: {
      en: 'Win 50 matches in any mode.',
      ru: 'Одержать 50 побед в любом режиме.',
    },
    target: 50,
    getCurrent: (s) => s.totalWins,
    isUnlocked: (s) => s.totalWins >= 50,
  },
  {
    id: 'wins_100',
    icon: 'obsidian_crown',
    rarity: 'legendary',
    category: 'general',
    title: { en: 'Sovereign of ChUno', ru: 'Властелин ChUno' },
    description: {
      en: 'Win 100 matches in any mode.',
      ru: 'Одержать 100 побед в любом режиме.',
    },
    target: 100,
    getCurrent: (s) => s.totalWins,
    isUnlocked: (s) => s.totalWins >= 100,
  },

  // 8-19: Survival Mode & Revolver / Coin Mastery
  {
    id: 'survive_easy',
    icon: 'heart_pulse',
    rarity: 'common',
    category: 'survival',
    title: { en: 'Out of the Basement', ru: 'Живым из подвала' },
    description: {
      en: 'Defeat the Dealer on Survival Easy.',
      ru: 'Победить Дилера в Survival Easy.',
    },
    target: 1,
    getCurrent: (s) => s.survivalWins.easy,
    isUnlocked: (s) => s.survivalWins.easy >= 1,
  },
  {
    id: 'survive_medium',
    icon: 'red_eyes',
    rarity: 'rare',
    category: 'survival',
    title: { en: 'Stare into the Red', ru: 'Взгляд в багровое' },
    description: {
      en: 'Defeat the Dealer on Survival Medium.',
      ru: 'Победить Дилера в Survival Medium.',
    },
    target: 1,
    getCurrent: (s) => s.survivalWins.medium,
    isUnlocked: (s) => s.survivalWins.medium >= 1,
  },
  {
    id: 'survive_hard',
    icon: 'skull_crown',
    rarity: 'epic',
    category: 'survival',
    title: { en: 'One Heart, Zero Mercy', ru: 'Одно сердце, без пощады' },
    description: {
      en: 'Defeat the Dealer on Survival Hard.',
      ru: 'Победить Дилера в Survival Hard.',
    },
    target: 1,
    getCurrent: (s) => s.survivalWins.hard,
    isUnlocked: (s) => s.survivalWins.hard >= 1,
  },
  {
    id: 'hard_5',
    icon: 'cracked_skull',
    rarity: 'epic',
    category: 'survival',
    title: { en: "Dealer's Nightmare", ru: 'Кошмар Дилера' },
    description: {
      en: 'Defeat the Dealer on Hard 5 times.',
      ru: 'Победить Дилера на Hard 5 раз.',
    },
    target: 5,
    getCurrent: (s) => s.survivalWins.hard,
    isUnlocked: (s) => s.survivalWins.hard >= 5,
  },
  {
    id: 'hard_10',
    icon: 'twin_revolver',
    rarity: 'epic',
    category: 'survival',
    title: { en: 'Reaper of the Table', ru: 'Жнец стола' },
    description: {
      en: 'Defeat the Dealer on Hard 10 times.',
      ru: 'Победить Дилера на Hard 10 раз.',
    },
    target: 10,
    getCurrent: (s) => s.survivalWins.hard,
    isUnlocked: (s) => s.survivalWins.hard >= 10,
  },
  {
    id: 'hard_25',
    icon: 'iron_mask',
    rarity: 'legendary',
    category: 'survival',
    title: { en: 'Untouchable', ru: 'Неприкасаемый' },
    description: {
      en: 'Defeat the Dealer on Hard 25 times.',
      ru: 'Победить Дилера на Hard 25 раз.',
    },
    target: 25,
    getCurrent: (s) => s.survivalWins.hard,
    isUnlocked: (s) => s.survivalWins.hard >= 25,
  },
  {
    id: 'hard_50',
    icon: 'flame_skull',
    rarity: 'legendary',
    category: 'survival',
    title: { en: 'Broken House', ru: 'Сломать казино' },
    description: {
      en: 'Defeat the Dealer on Hard 50 times.',
      ru: 'Победить Дилера на Hard 50 раз.',
    },
    target: 50,
    getCurrent: (s) => s.survivalWins.hard,
    isUnlocked: (s) => s.survivalWins.hard >= 50,
  },
  {
    id: 'own_bullet',
    icon: 'bullet_skull',
    rarity: 'rare',
    category: 'survival',
    title: { en: 'Taste of His Own Lead', ru: 'Своя же пуля' },
    description: {
      en: 'Finish off the Dealer with the revolver.',
      ru: 'Добить Дилера выстрелом из его же револьвера.',
    },
    target: 1,
    getCurrent: (s) => s.survivalWinByRevolver,
    isUnlocked: (s) => s.survivalWinByRevolver >= 1,
  },
  {
    id: 'gunslinger_10',
    icon: 'cylinder_six',
    rarity: 'epic',
    category: 'survival',
    title: { en: 'Six-Chamber Judge', ru: 'Судья шести камор' },
    description: {
      en: 'Eliminate the Dealer with the revolver 10 times.',
      ru: 'Убить Дилера из револьвера 10 раз.',
    },
    target: 10,
    getCurrent: (s) => s.survivalWinByRevolver,
    isUnlocked: (s) => s.survivalWinByRevolver >= 10,
  },
  {
    id: 'charmed_3',
    icon: 'coin_wings',
    rarity: 'epic',
    category: 'survival',
    title: { en: 'Charmed Life', ru: 'Заговорённый' },
    description: {
      en: 'Survive 3 coin flips in a single match.',
      ru: 'Угадать монетку и выжить 3 раза за одну партию.',
    },
    target: 3,
    getCurrent: (s) => s.maxCoinsSurvivedInMatch,
    isUnlocked: (s) => s.maxCoinsSurvivedInMatch >= 3,
  },
  {
    id: 'coin_25',
    icon: 'coin_glow',
    rarity: 'rare',
    category: 'survival',
    title: { en: 'Fate Whisperer', ru: 'Шепчущий судьбе' },
    description: {
      en: 'Survive 25 coin flips across all matches.',
      ru: 'Пережить 25 бросков монеты за всё время.',
    },
    target: 25,
    getCurrent: (s) => s.totalCoinsSurvived,
    isUnlocked: (s) => s.totalCoinsSurvived >= 25,
  },
  {
    id: 'bloodless_win',
    icon: 'clean_king',
    rarity: 'rare',
    category: 'survival',
    title: { en: 'Bloodless Checkmate', ru: 'Бескровный мат' },
    description: {
      en: 'Checkmate the Dealer without firing a single shot.',
      ru: 'Поставить Дилеру мат в Survival, не сделав ни одного выстрела.',
    },
    target: 1,
    getCurrent: (s) => s.bloodlessSurvivalWins,
    isUnlocked: (s) => s.bloodlessSurvivalWins >= 1,
  },

  // 20-25: Friendly Mode Rivals
  {
    id: 'beat_enthusiast',
    icon: 'sun_pawn',
    rarity: 'common',
    category: 'light',
    title: { en: 'Sunny Warm-Up', ru: 'Солнечная разминка' },
    description: {
      en: 'Defeat the Enthusiast in Friendly Mode.',
      ru: 'Победить Энтузиаста в Дружеском режиме.',
    },
    target: 1,
    getCurrent: (s) => s.lightWins.enthusiast,
    isUnlocked: (s) => s.lightWins.enthusiast >= 1,
  },
  {
    id: 'beat_egoist',
    icon: 'shades_crack',
    rarity: 'common',
    category: 'light',
    title: { en: 'Humbled Pride', ru: 'Сбил спесь' },
    description: {
      en: 'Defeat the Egoist in Friendly Mode.',
      ru: 'Победить Эгоиста в Дружеском режиме.',
    },
    target: 1,
    getCurrent: (s) => s.lightWins.egoist,
    isUnlocked: (s) => s.lightWins.egoist >= 1,
  },
  {
    id: 'beat_philosopher',
    icon: 'glasses_owl',
    rarity: 'rare',
    category: 'light',
    title: { en: 'Outthought the Sage', ru: 'Переспорить мудреца' },
    description: {
      en: 'Defeat the Calm Philosopher in Friendly Mode.',
      ru: 'Победить Спокойного философа.',
    },
    target: 1,
    getCurrent: (s) => s.lightWins.calm,
    isUnlocked: (s) => s.lightWins.calm >= 1,
  },
  {
    id: 'philosopher_10',
    icon: 'book_queen',
    rarity: 'epic',
    category: 'light',
    title: { en: 'Master of Quiet', ru: 'Гроссмейстер тишины' },
    description: {
      en: 'Defeat the Calm Philosopher 10 times.',
      ru: 'Победить Спокойного философа 10 раз.',
    },
    target: 10,
    getCurrent: (s) => s.lightWins.calm,
    isUnlocked: (s) => s.lightWins.calm >= 10,
  },
  {
    id: 'beat_unknown',
    icon: 'fedora_mask',
    rarity: 'rare',
    category: 'light',
    title: { en: 'Unmasked', ru: 'Сорвать маску' },
    description: {
      en: 'Defeat Unknown in Friendly Mode.',
      ru: 'Победить Неизвестного (Unknown).',
    },
    target: 1,
    getCurrent: (s) => s.lightWins.unknown,
    isUnlocked: (s) => s.lightWins.unknown >= 1,
  },
  {
    id: 'full_circle',
    icon: 'compass_four',
    rarity: 'rare',
    category: 'light',
    title: { en: 'Meadow Champion', ru: 'Чемпион луга' },
    description: {
      en: 'Defeat all 4 rivals in Friendly Mode.',
      ru: 'Победить всех 4 соперников в Дружеском режиме.',
    },
    target: 4,
    getCurrent: (s) =>
      (s.lightWins.enthusiast >= 1 ? 1 : 0) +
      (s.lightWins.egoist >= 1 ? 1 : 0) +
      (s.lightWins.calm >= 1 ? 1 : 0) +
      (s.lightWins.unknown >= 1 ? 1 : 0),
    isUnlocked: (s) =>
      s.lightWins.enthusiast >= 1 &&
      s.lightWins.egoist >= 1 &&
      s.lightWins.calm >= 1 &&
      s.lightWins.unknown >= 1,
  },

  // 26-32: Streaks & Special Tactical Feats
  {
    id: 'streak_3',
    icon: 'flame_card',
    rarity: 'common',
    category: 'tactics',
    title: { en: 'Hot Hand', ru: 'Горячая рука' },
    description: {
      en: 'Win 3 matches in a row.',
      ru: 'Выиграть 3 партии подряд.',
    },
    target: 3,
    getCurrent: (s) => s.bestWinStreak,
    isUnlocked: (s) => s.bestWinStreak >= 3,
  },
  {
    id: 'streak_5',
    icon: 'blazing_crown',
    rarity: 'rare',
    category: 'tactics',
    title: { en: 'Unstoppable', ru: 'Неостановимый' },
    description: {
      en: 'Win 5 matches in a row.',
      ru: 'Выиграть 5 партий подряд.',
    },
    target: 5,
    getCurrent: (s) => s.bestWinStreak,
    isUnlocked: (s) => s.bestWinStreak >= 5,
  },
  {
    id: 'streak_10',
    icon: 'lightning_king',
    rarity: 'legendary',
    category: 'tactics',
    title: { en: 'Lord of Chaos', ru: 'Повелитель хаоса' },
    description: {
      en: 'Win 10 matches in a row.',
      ru: 'Выиграть 10 партий подряд.',
    },
    target: 10,
    getCurrent: (s) => s.bestWinStreak,
    isUnlocked: (s) => s.bestWinStreak >= 10,
  },
  {
    id: 'necromancer_4',
    icon: 'plus_four',
    rarity: 'rare',
    category: 'tactics',
    title: { en: 'Grand Necromancer', ru: 'Великий некромант' },
    description: {
      en: 'Resurrect 4 pieces at once with a single +4 card.',
      ru: 'Воскресить сразу 4 фигуры одной картой +4.',
    },
    target: 4,
    getCurrent: (s) => s.maxResurrectedSingleCard,
    isUnlocked: (s) => s.maxResurrectedSingleCard >= 4,
  },
  {
    id: 'traitor_crown',
    icon: 'reverse_arrows',
    rarity: 'rare',
    category: 'tactics',
    title: { en: "Traitor's Crown", ru: 'Корона предателя' },
    description: {
      en: 'Win a match after the board was flipped by Reverse.',
      ru: 'Победить в партии, где сработал переворот доски Reverse.',
    },
    target: 1,
    getCurrent: (s) => s.winsAfterReverse,
    isUnlocked: (s) => s.winsAfterReverse >= 1,
  },
  {
    id: 'wild_mate',
    icon: 'wild_prism',
    rarity: 'epic',
    category: 'tactics',
    title: { en: 'Shape of Doom', ru: 'Облик рока' },
    description: {
      en: 'Deliver checkmate using a Wild card move.',
      ru: 'Поставить мат ходом по карте Wild.',
    },
    target: 1,
    getCurrent: (s) => s.wildCheckmates,
    isUnlocked: (s) => s.wildCheckmates >= 1,
  },
  {
    id: 'blitz_win',
    icon: 'stopwatch_bolt',
    rarity: 'rare',
    category: 'tactics',
    title: { en: 'Blitz Execution', ru: 'Блиц-расправа' },
    description: {
      en: 'Win a match in under 2 minutes (3+ turns).',
      ru: 'Победить быстрее чем за 2 минуты (от 3 ходов).',
    },
    target: 1,
    getCurrent: (s) => (s.fastestWinSec !== null && s.fastestWinSec <= 120 ? 1 : 0),
    isUnlocked: (s) => s.fastestWinSec !== null && s.fastestWinSec <= 120,
  },
];

export function getStreakMultiplier(winStreak: number): number {
  if (winStreak >= 10) return 2.5;
  if (winStreak >= 8) return 2.0;
  if (winStreak >= 5) return 1.5;
  if (winStreak >= 3) return 1.25;
  return 1.0;
}

export interface ScoreBonusLine {
  key: 'bloodless' | 'coins' | 'last_heart' | 'blitz';
  label: { en: string; ru: string };
  points: number;
}

export interface MatchScoreBreakdown {
  baseWinPoints: number;
  streakMultiplier: number;
  multipliedBase: number;
  styleBonuses: ScoreBonusLine[];
  achievementPoints: number;
  totalAwarded: number;
}

export interface MatchScoreInput {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  outcome: 'win' | 'loss' | 'draw';
  endReason: MatchEndReason | null;
  newWinStreak: number;
  coinsSurvived: number;
  shotsFired: number;
  playerHpRemaining: number;
  elapsedSeconds: number;
  turnsPlayed: number;
  newlyUnlocked: AchievementDefinition[];
}

export function calculateMatchScore(input: MatchScoreInput): MatchScoreBreakdown {
  let baseWinPoints = 0;
  const styleBonuses: ScoreBonusLine[] = [];

  if (input.outcome === 'win') {
    if (input.mode === 'light') {
      baseWinPoints =
        input.personality === 'enthusiast'
          ? 60
          : input.personality === 'egoist'
            ? 120
            : input.personality === 'unknown'
              ? 150
              : 220;
    } else {
      baseWinPoints =
        input.difficulty === 'easy' ? 250 : input.difficulty === 'medium' ? 450 : 900;
    }

    // Style bonuses
    if (input.mode === 'survival' && input.endReason === 'checkmate' && input.shotsFired === 0) {
      styleBonuses.push({
        key: 'bloodless',
        label: { en: 'Bloodless Checkmate', ru: 'Бескровный мат' },
        points: 150,
      });
    }
    if (input.mode === 'survival' && input.coinsSurvived > 0) {
      styleBonuses.push({
        key: 'coins',
        label: {
          en: `Coins Survived (×${input.coinsSurvived})`,
          ru: `Пережитые монеты (×${input.coinsSurvived})`,
        },
        points: input.coinsSurvived * 100,
      });
    }
    if (
      input.mode === 'survival' &&
      (input.difficulty === 'easy' || input.difficulty === 'medium') &&
      input.playerHpRemaining === 1
    ) {
      styleBonuses.push({
        key: 'last_heart',
        label: { en: 'Last Heart Standing', ru: 'На последнем сердце' },
        points: 200,
      });
    }
    if (input.elapsedSeconds < 120 && input.turnsPlayed >= 3) {
      styleBonuses.push({
        key: 'blitz',
        label: { en: 'Blitz Victory (< 2m)', ru: 'Блиц-победа (< 2 мин)' },
        points: 120,
      });
    }
  }

  const streakMultiplier = input.outcome === 'win' ? getStreakMultiplier(input.newWinStreak) : 1.0;
  const multipliedBase = Math.round(baseWinPoints * streakMultiplier);
  const styleTotal = styleBonuses.reduce((acc, b) => acc + b.points, 0);
  const achievementPoints = input.newlyUnlocked.reduce(
    (acc, ach) => acc + RARITY_POINTS[ach.rarity],
    0,
  );

  return {
    baseWinPoints,
    streakMultiplier,
    multipliedBase,
    styleBonuses,
    achievementPoints,
    totalAwarded: multipliedBase + styleTotal + achievementPoints,
  };
}

export function evaluateNewAchievements(
  snapshot: AchievementProgressSnapshot,
  alreadyUnlocked: Record<string, string>,
): AchievementDefinition[] {
  const newly: AchievementDefinition[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked[ach.id]) continue;
    if (ach.isUnlocked(snapshot)) {
      newly.push(ach);
    }
  }
  return newly;
}
