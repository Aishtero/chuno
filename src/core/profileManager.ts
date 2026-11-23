import {
  AchievementDefinition,
  AchievementProgressSnapshot,
  MatchScoreBreakdown,
  calculateMatchScore,
  evaluateNewAchievements,
} from './achievements';
import {
  DialogueAudioMode,
  DifficultyLevel,
  GameMode,
  GraphicsQuality,
  LightPersonality,
} from './deck/cardData';
import { Language } from './localization';
import { MatchEndReason } from './match/matchEngine';

export const CURRENT_AUDIO_DEFAULTS_VERSION = 4;

export interface PlayerSettings {
  graphicsQuality: GraphicsQuality;
  showFps: boolean;
  menuMusicEnabled: boolean;
  gameMusicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  dialogueAudioMode: DialogueAudioMode;
  audioDefaultsVersion?: number;
}

export interface PlayerStats {
  totalMatches: number;
  lightWins: number;
  lightLosses: number;
  lightDraws: number;
  lightByPersonality: {
    enthusiast: number;
    egoist: number;
    calm: number;
    unknown: number;
  };
  survivalEasyWins: number;
  survivalEasyLosses: number;
  survivalEasyDraws: number;
  survivalMedWins: number;
  survivalMedLosses: number;
  survivalMedDraws: number;
  survivalHardWins: number;
  survivalHardLosses: number;
  survivalHardDraws: number;
  survivalWinByRevolver: number;
  bloodlessSurvivalWins: number;
  currentStreak: number;
  bestStreak: number;
  coinsSurvivedTotal: number;
  maxCoinsSurvivedInMatch: number;
  shotsFiredTotal: number;
  maxResurrectedSingleCard: number;
  winsAfterReverse: number;
  wildCheckmates: number;
  fastestWinSec: number | null;
}

export interface PlayerProfile {
  playerId: string;
  displayName: string;
  score: number;
  language: Language;
  muted: boolean;
  settings: PlayerSettings;
  unlockedAchievements: Record<string, string>;
  stats: PlayerStats;
}

const STORAGE_KEY = 'chuno_profile_v1';

function generatePlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (len: number) => {
    let out = '';
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };
  return `CHUNO-${seg(4)}-${seg(4)}`;
}

export function createDefaultProfile(): PlayerProfile {
  return {
    playerId: generatePlayerId(),
    displayName: 'Player',
    score: 0,
    language: 'en',
    muted: false,
    settings: {
      graphicsQuality: 'high',
      showFps: false,
      menuMusicEnabled: true,
      gameMusicEnabled: true,
      musicVolume: 0.3,
      sfxVolume: 0.35,
      voiceVolume: 0.6,
      dialogueAudioMode: 'tts',
      audioDefaultsVersion: CURRENT_AUDIO_DEFAULTS_VERSION,
    },
    unlockedAchievements: {},
    stats: {
      totalMatches: 0,
      lightWins: 0,
      lightLosses: 0,
      lightDraws: 0,
      lightByPersonality: {
        enthusiast: 0,
        egoist: 0,
        calm: 0,
        unknown: 0,
      },
      survivalEasyWins: 0,
      survivalEasyLosses: 0,
      survivalEasyDraws: 0,
      survivalMedWins: 0,
      survivalMedLosses: 0,
      survivalMedDraws: 0,
      survivalHardWins: 0,
      survivalHardLosses: 0,
      survivalHardDraws: 0,
      survivalWinByRevolver: 0,
      bloodlessSurvivalWins: 0,
      currentStreak: 0,
      bestStreak: 0,
      coinsSurvivedTotal: 0,
      maxCoinsSurvivedInMatch: 0,
      shotsFiredTotal: 0,
      maxResurrectedSingleCard: 0,
      winsAfterReverse: 0,
      wildCheckmates: 0,
      fastestWinSec: null,
    },
  };
}

export function getAchievementProgressSnapshot(profile: PlayerProfile): AchievementProgressSnapshot {
  const s = profile.stats;
  const totalWins = s.lightWins + s.survivalEasyWins + s.survivalMedWins + s.survivalHardWins;
  const computedTotalMatches = Math.max(
    s.totalMatches,
    totalWins +
      s.lightLosses +
      s.lightDraws +
      s.survivalEasyLosses +
      s.survivalEasyDraws +
      s.survivalMedLosses +
      s.survivalMedDraws +
      s.survivalHardLosses +
      s.survivalHardDraws,
  );
  return {
    totalMatches: computedTotalMatches,
    totalWins,
    survivalWins: {
      easy: s.survivalEasyWins,
      medium: s.survivalMedWins,
      hard: s.survivalHardWins,
    },
    survivalWinByRevolver: s.survivalWinByRevolver,
    maxCoinsSurvivedInMatch: s.maxCoinsSurvivedInMatch,
    totalCoinsSurvived: s.coinsSurvivedTotal,
    bloodlessSurvivalWins: s.bloodlessSurvivalWins,
    lightWins: { ...s.lightByPersonality },
    bestWinStreak: s.bestStreak,
    maxResurrectedSingleCard: s.maxResurrectedSingleCard,
    winsAfterReverse: s.winsAfterReverse,
    wildCheckmates: s.wildCheckmates,
    fastestWinSec: s.fastestWinSec,
  };
}

export function loadProfile(): PlayerProfile {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultProfile();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const def = createDefaultProfile();
    const rawSettings: Partial<PlayerSettings> = parsed.settings ?? {};
    const rawLegacy = parsed as Partial<PlayerProfile & PlayerSettings>;
    const rawStats: Partial<PlayerStats> = parsed.stats ?? {};
    const clampVol = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    const rawMusicVol = rawSettings.musicVolume ?? rawLegacy.musicVolume;
    const savedAudioVer =
      typeof rawSettings.audioDefaultsVersion === 'number' && Number.isFinite(rawSettings.audioDefaultsVersion)
        ? rawSettings.audioDefaultsVersion
        : 0;
    const needsAudioDefaultsMigration = savedAudioVer < CURRENT_AUDIO_DEFAULTS_VERSION;
    const musicVol = needsAudioDefaultsMigration ? 0.3 : clampVol(rawMusicVol, 0.3);
    const sfxVol = needsAudioDefaultsMigration ? 0.35 : clampVol(rawSettings.sfxVolume, 0.35);
    const voiceVol = clampVol(rawSettings.voiceVolume, 0.6);
    const mergedMenuMusicEnabled =
      typeof rawSettings.menuMusicEnabled === 'boolean'
        ? rawSettings.menuMusicEnabled
        : typeof rawLegacy.menuMusicEnabled === 'boolean'
          ? rawLegacy.menuMusicEnabled
          : (rawSettings.menuMusicEnabled ?? true);
    const mergedGameMusicEnabled =
      typeof rawSettings.gameMusicEnabled === 'boolean'
        ? rawSettings.gameMusicEnabled
        : typeof rawLegacy.gameMusicEnabled === 'boolean'
          ? rawLegacy.gameMusicEnabled
          : (rawSettings.gameMusicEnabled ?? true);
    const dialMode: DialogueAudioMode =
      rawSettings.dialogueAudioMode === 'tts' ||
      rawSettings.dialogueAudioMode === 'sfx' ||
      rawSettings.dialogueAudioMode === 'off'
        ? rawSettings.dialogueAudioMode
        : def.settings.dialogueAudioMode;

    const mergedStats: PlayerStats = {
      ...def.stats,
      ...rawStats,
      lightByPersonality: {
        ...def.stats.lightByPersonality,
        ...(rawStats.lightByPersonality ?? {}),
      },
    };
    const inferredMatches =
      mergedStats.lightWins +
      mergedStats.lightLosses +
      mergedStats.lightDraws +
      mergedStats.survivalEasyWins +
      mergedStats.survivalEasyLosses +
      mergedStats.survivalEasyDraws +
      mergedStats.survivalMedWins +
      mergedStats.survivalMedLosses +
      mergedStats.survivalMedDraws +
      mergedStats.survivalHardWins +
      mergedStats.survivalHardLosses +
      mergedStats.survivalHardDraws;
    if (mergedStats.totalMatches < inferredMatches) {
      mergedStats.totalMatches = inferredMatches;
    }

    const merged: PlayerProfile = {
      ...def,
      ...parsed,
      playerId:
        typeof parsed.playerId === 'string' && parsed.playerId.trim().length > 0
          ? parsed.playerId
          : def.playerId,
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0
          ? parsed.displayName.trim().slice(0, 20)
          : def.displayName,
      score:
        typeof parsed.score === 'number' && Number.isFinite(parsed.score) && parsed.score >= 0
          ? Math.floor(parsed.score)
          : 0,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
      unlockedAchievements:
        parsed.unlockedAchievements && typeof parsed.unlockedAchievements === 'object'
          ? { ...parsed.unlockedAchievements }
          : {},
      settings: {
        ...def.settings,
        ...rawSettings,
        menuMusicEnabled: mergedMenuMusicEnabled,
        gameMusicEnabled: mergedGameMusicEnabled,
        musicVolume: musicVol,
        sfxVolume: sfxVol,
        voiceVolume: voiceVol,
        dialogueAudioMode: dialMode,
        audioDefaultsVersion: CURRENT_AUDIO_DEFAULTS_VERSION,
      },
      stats: mergedStats,
    };
    if (needsAudioDefaultsMigration) {
      saveProfile(merged);
    }
    return merged;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export interface MatchOutcomeInput {
  mode: GameMode;
  difficulty: DifficultyLevel;
  personality: LightPersonality;
  outcome: 'win' | 'loss' | 'draw';
  endReason: MatchEndReason | null;
  coinsSurvived: number;
  shotsFired: number;
  playerHpRemaining: number;
  elapsedSeconds: number;
  turnsPlayed: number;
  reverseOccurred: boolean;
  maxResurrectedSingleCard: number;
  wonByWildCheckmate: boolean;
}

export interface MatchOutcomeResult {
  profile: PlayerProfile;
  scoreBreakdown: MatchScoreBreakdown;
  newlyUnlocked: AchievementDefinition[];
}

export function recordMatchOutcomeDetailed(
  profile: PlayerProfile,
  input: MatchOutcomeInput,
): MatchOutcomeResult {
  const next: PlayerProfile = {
    ...profile,
    unlockedAchievements: { ...profile.unlockedAchievements },
    stats: {
      ...profile.stats,
      lightByPersonality: { ...profile.stats.lightByPersonality },
    },
  };

  next.stats.totalMatches++;
  next.stats.coinsSurvivedTotal += input.coinsSurvived;
  if (input.coinsSurvived > next.stats.maxCoinsSurvivedInMatch) {
    next.stats.maxCoinsSurvivedInMatch = input.coinsSurvived;
  }
  next.stats.shotsFiredTotal += input.shotsFired;
  if (input.maxResurrectedSingleCard > next.stats.maxResurrectedSingleCard) {
    next.stats.maxResurrectedSingleCard = input.maxResurrectedSingleCard;
  }

  if (input.mode === 'light') {
    if (input.outcome === 'win') {
      next.stats.lightWins++;
      next.stats.lightByPersonality[input.personality] =
        (next.stats.lightByPersonality[input.personality] ?? 0) + 1;
    } else if (input.outcome === 'loss') {
      next.stats.lightLosses++;
    } else {
      next.stats.lightDraws++;
    }
  } else {
    if (input.difficulty === 'easy') {
      if (input.outcome === 'win') next.stats.survivalEasyWins++;
      else if (input.outcome === 'loss') next.stats.survivalEasyLosses++;
      else next.stats.survivalEasyDraws++;
    } else if (input.difficulty === 'medium') {
      if (input.outcome === 'win') next.stats.survivalMedWins++;
      else if (input.outcome === 'loss') next.stats.survivalMedLosses++;
      else next.stats.survivalMedDraws++;
    } else {
      if (input.outcome === 'win') next.stats.survivalHardWins++;
      else if (input.outcome === 'loss') next.stats.survivalHardLosses++;
      else next.stats.survivalHardDraws++;
    }

    if (input.outcome === 'win') {
      if (input.endReason === 'revolver_hp_zero') {
        next.stats.survivalWinByRevolver++;
      }
      if (input.endReason === 'checkmate' && input.shotsFired === 0) {
        next.stats.bloodlessSurvivalWins++;
      }
    }
  }

  if (input.outcome === 'win') {
    next.stats.currentStreak++;
    if (next.stats.currentStreak > next.stats.bestStreak) {
      next.stats.bestStreak = next.stats.currentStreak;
    }
    if (input.reverseOccurred) {
      next.stats.winsAfterReverse++;
    }
    if (input.wonByWildCheckmate) {
      next.stats.wildCheckmates++;
    }
    if (input.turnsPlayed >= 3) {
      if (next.stats.fastestWinSec === null || input.elapsedSeconds < next.stats.fastestWinSec) {
        next.stats.fastestWinSec = Math.max(0, Math.floor(input.elapsedSeconds));
      }
    }
  } else if (input.outcome === 'loss') {
    next.stats.currentStreak = 0;
  }

  const snap = getAchievementProgressSnapshot(next);
  const newlyUnlocked = evaluateNewAchievements(snap, next.unlockedAchievements);
  const nowIso = new Date().toISOString();
  for (const ach of newlyUnlocked) {
    next.unlockedAchievements[ach.id] = nowIso;
  }

  const scoreBreakdown = calculateMatchScore({
    mode: input.mode,
    difficulty: input.difficulty,
    personality: input.personality,
    outcome: input.outcome,
    endReason: input.endReason,
    newWinStreak: next.stats.currentStreak,
    coinsSurvived: input.coinsSurvived,
    shotsFired: input.shotsFired,
    playerHpRemaining: input.playerHpRemaining,
    elapsedSeconds: input.elapsedSeconds,
    turnsPlayed: input.turnsPlayed,
    newlyUnlocked,
  });

  // Score is strictly monotonic (never subtracted)
  next.score = Math.max(0, next.score + scoreBreakdown.totalAwarded);
  saveProfile(next);

  return { profile: next, scoreBreakdown, newlyUnlocked };
}

export function recordMatchOutcome(
  profile: PlayerProfile,
  mode: GameMode,
  difficulty: DifficultyLevel,
  outcome: 'win' | 'loss' | 'draw',
  coinsSurvived: number,
  shotsFired: number,
): PlayerProfile {
  return recordMatchOutcomeDetailed(profile, {
    mode,
    difficulty,
    personality: 'calm',
    outcome,
    endReason: outcome === 'win' ? 'checkmate' : outcome === 'draw' ? 'draw_agreed' : 'checkmate',
    coinsSurvived,
    shotsFired,
    playerHpRemaining: 1,
    elapsedSeconds: 180,
    turnsPlayed: 5,
    reverseOccurred: false,
    maxResurrectedSingleCard: 0,
    wonByWildCheckmate: false,
  }).profile;
}
