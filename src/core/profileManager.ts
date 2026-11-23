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

export const APP_VERSION = '0.2.2';
export const CURRENT_PROFILE_SCHEMA_VERSION = 2;
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

export interface FriendEntry {
  id: string;
  displayName: string;
  addedAt: string;
}

export interface PlayerProfile {
  schemaVersion?: number;
  updatedAt?: string;
  playerId: string;
  displayName: string;
  score: number;
  language: Language;
  muted: boolean;
  settings: PlayerSettings;
  unlockedAchievements: Record<string, string>;
  stats: PlayerStats;
  friends?: FriendEntry[];
  /** Preserves any forward-compatible fields added in future releases without stripping them */
  [extraKey: string]: unknown;
}

const STORAGE_KEY = 'chuno_profile_v1';

export function isTauriRuntime(win: unknown = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!win || typeof win !== 'object') return false;
  return '__TAURI_INTERNALS__' in win || '__TAURI__' in win;
}

async function invokeTauriCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch {
    return null;
  }
}

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
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date(0).toISOString(),
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
    friends: [],
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

function nonNegInt(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

export function normalizeAndMigrateProfile(
  rawInput: unknown,
): { profile: PlayerProfile; needsSave: boolean } {
  const def = createDefaultProfile();
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { profile: def, needsSave: false };
  }

  const parsed = rawInput as Partial<PlayerProfile>;
  const rawSettings: Partial<PlayerSettings> =
    parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
  const rawLegacy = parsed as Partial<PlayerProfile & PlayerSettings>;
  const rawStats: Partial<PlayerStats> =
    parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {};

  const clampVol = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;

  const rawMusicVol = rawSettings.musicVolume ?? rawLegacy.musicVolume;
  const savedAudioVer =
    typeof rawSettings.audioDefaultsVersion === 'number' &&
    Number.isFinite(rawSettings.audioDefaultsVersion)
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

  const quality: GraphicsQuality =
    rawSettings.graphicsQuality === 'low' ||
    rawSettings.graphicsQuality === 'medium' ||
    rawSettings.graphicsQuality === 'high'
      ? rawSettings.graphicsQuality
      : def.settings.graphicsQuality;

  const rawLightByPers: Partial<PlayerStats['lightByPersonality']> =
    rawStats.lightByPersonality && typeof rawStats.lightByPersonality === 'object'
      ? rawStats.lightByPersonality
      : {};

  const mergedStats: PlayerStats = {
    ...def.stats,
    ...rawStats,
    totalMatches: nonNegInt(rawStats.totalMatches),
    lightWins: nonNegInt(rawStats.lightWins),
    lightLosses: nonNegInt(rawStats.lightLosses),
    lightDraws: nonNegInt(rawStats.lightDraws),
    lightByPersonality: {
      enthusiast: nonNegInt(rawLightByPers.enthusiast),
      egoist: nonNegInt(rawLightByPers.egoist),
      calm: nonNegInt(rawLightByPers.calm),
      unknown: nonNegInt(rawLightByPers.unknown),
    },
    survivalEasyWins: nonNegInt(rawStats.survivalEasyWins),
    survivalEasyLosses: nonNegInt(rawStats.survivalEasyLosses),
    survivalEasyDraws: nonNegInt(rawStats.survivalEasyDraws),
    survivalMedWins: nonNegInt(rawStats.survivalMedWins),
    survivalMedLosses: nonNegInt(rawStats.survivalMedLosses),
    survivalMedDraws: nonNegInt(rawStats.survivalMedDraws),
    survivalHardWins: nonNegInt(rawStats.survivalHardWins),
    survivalHardLosses: nonNegInt(rawStats.survivalHardLosses),
    survivalHardDraws: nonNegInt(rawStats.survivalHardDraws),
    survivalWinByRevolver: nonNegInt(rawStats.survivalWinByRevolver),
    bloodlessSurvivalWins: nonNegInt(rawStats.bloodlessSurvivalWins),
    currentStreak: nonNegInt(rawStats.currentStreak),
    bestStreak: nonNegInt(rawStats.bestStreak),
    coinsSurvivedTotal: nonNegInt(rawStats.coinsSurvivedTotal),
    maxCoinsSurvivedInMatch: nonNegInt(rawStats.maxCoinsSurvivedInMatch),
    shotsFiredTotal: nonNegInt(rawStats.shotsFiredTotal),
    maxResurrectedSingleCard: nonNegInt(rawStats.maxResurrectedSingleCard),
    winsAfterReverse: nonNegInt(rawStats.winsAfterReverse),
    wildCheckmates: nonNegInt(rawStats.wildCheckmates),
    fastestWinSec:
      typeof rawStats.fastestWinSec === 'number' &&
      Number.isFinite(rawStats.fastestWinSec) &&
      rawStats.fastestWinSec >= 0
        ? Math.floor(rawStats.fastestWinSec)
        : null,
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
  if (mergedStats.bestStreak < mergedStats.currentStreak) {
    mergedStats.bestStreak = mergedStats.currentStreak;
  }

  const cleanAchievements: Record<string, string> = {};
  if (parsed.unlockedAchievements && typeof parsed.unlockedAchievements === 'object') {
    for (const [k, v] of Object.entries(parsed.unlockedAchievements)) {
      if (typeof v === 'string' && v.length > 0) {
        cleanAchievements[k] = v;
      }
    }
  }

  const cleanFriends: FriendEntry[] = Array.isArray(parsed.friends)
    ? parsed.friends.filter(
        (f): f is FriendEntry =>
          Boolean(f) &&
          typeof f === 'object' &&
          typeof (f as FriendEntry).id === 'string' &&
          typeof (f as FriendEntry).displayName === 'string',
      )
    : [];

  const merged: PlayerProfile = {
    ...def,
    ...parsed,
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt:
      typeof parsed.updatedAt === 'string' && parsed.updatedAt.length > 0
        ? parsed.updatedAt
        : def.updatedAt,
    playerId:
      typeof parsed.playerId === 'string' && parsed.playerId.trim().length > 0
        ? parsed.playerId.trim()
        : def.playerId,
    displayName:
      typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0
        ? parsed.displayName.trim().slice(0, 20)
        : def.displayName,
    score: nonNegInt(parsed.score),
    language: parsed.language === 'ru' ? 'ru' : 'en',
    muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
    unlockedAchievements: cleanAchievements,
    friends: cleanFriends,
    settings: {
      ...def.settings,
      ...rawSettings,
      graphicsQuality: quality,
      showFps: typeof rawSettings.showFps === 'boolean' ? rawSettings.showFps : false,
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

  return { profile: merged, needsSave: needsAudioDefaultsMigration };
}

function computeProfileRichness(p: PlayerProfile): number {
  const achCount = Object.keys(p.unlockedAchievements ?? {}).length;
  return (p.score || 0) + (p.stats?.totalMatches || 0) * 250 + achCount * 500;
}

/**
 * Lossless merge of two profiles (e.g., localStorage vs Tauri disk backup, or imported save).
 * - Never loses any unlocked achievement (union of both sets, preserving earliest timestamp).
 * - Takes Math.max across all monotonic career stats & score, and Math.min for fastestWinSec.
 * - Prefers settings/identity from `preferred` (or whichever profile has higher richness / newer updatedAt).
 */
export function mergeProfiles(
  base: PlayerProfile,
  incoming: PlayerProfile,
  preferIncomingIdentity = false,
): PlayerProfile {
  const a = normalizeAndMigrateProfile(base).profile;
  const b = normalizeAndMigrateProfile(incoming).profile;

  const richnessA = computeProfileRichness(a);
  const richnessB = computeProfileRichness(b);
  const timeA = a.updatedAt ? Date.parse(a.updatedAt) || 0 : 0;
  const timeB = b.updatedAt ? Date.parse(b.updatedAt) || 0 : 0;

  const bWinsIdentity =
    preferIncomingIdentity ||
    richnessB > richnessA ||
    (richnessB === richnessA && timeB >= timeA);

  const primary = bWinsIdentity ? b : a;
  const secondary = bWinsIdentity ? a : b;

  // Union of achievements (keep earliest timestamp)
  const mergedAchievements: Record<string, string> = { ...secondary.unlockedAchievements };
  for (const [id, ts] of Object.entries(primary.unlockedAchievements)) {
    const existing = mergedAchievements[id];
    if (!existing || ts < existing) {
      mergedAchievements[id] = ts;
    }
  }

  // Union of friends by id
  const friendMap = new Map<string, FriendEntry>();
  for (const f of [...(secondary.friends ?? []), ...(primary.friends ?? [])]) {
    if (f && typeof f.id === 'string') {
      friendMap.set(f.id, f);
    }
  }

  const sa = a.stats;
  const sb = b.stats;
  const fastestWinSec =
    sa.fastestWinSec !== null && sb.fastestWinSec !== null
      ? Math.min(sa.fastestWinSec, sb.fastestWinSec)
      : (sa.fastestWinSec ?? sb.fastestWinSec ?? null);

  const mergedStats: PlayerStats = {
    totalMatches: Math.max(sa.totalMatches, sb.totalMatches),
    lightWins: Math.max(sa.lightWins, sb.lightWins),
    lightLosses: Math.max(sa.lightLosses, sb.lightLosses),
    lightDraws: Math.max(sa.lightDraws, sb.lightDraws),
    lightByPersonality: {
      enthusiast: Math.max(sa.lightByPersonality.enthusiast, sb.lightByPersonality.enthusiast),
      egoist: Math.max(sa.lightByPersonality.egoist, sb.lightByPersonality.egoist),
      calm: Math.max(sa.lightByPersonality.calm, sb.lightByPersonality.calm),
      unknown: Math.max(sa.lightByPersonality.unknown, sb.lightByPersonality.unknown),
    },
    survivalEasyWins: Math.max(sa.survivalEasyWins, sb.survivalEasyWins),
    survivalEasyLosses: Math.max(sa.survivalEasyLosses, sb.survivalEasyLosses),
    survivalEasyDraws: Math.max(sa.survivalEasyDraws, sb.survivalEasyDraws),
    survivalMedWins: Math.max(sa.survivalMedWins, sb.survivalMedWins),
    survivalMedLosses: Math.max(sa.survivalMedLosses, sb.survivalMedLosses),
    survivalMedDraws: Math.max(sa.survivalMedDraws, sb.survivalMedDraws),
    survivalHardWins: Math.max(sa.survivalHardWins, sb.survivalHardWins),
    survivalHardLosses: Math.max(sa.survivalHardLosses, sb.survivalHardLosses),
    survivalHardDraws: Math.max(sa.survivalHardDraws, sb.survivalHardDraws),
    survivalWinByRevolver: Math.max(sa.survivalWinByRevolver, sb.survivalWinByRevolver),
    bloodlessSurvivalWins: Math.max(sa.bloodlessSurvivalWins, sb.bloodlessSurvivalWins),
    currentStreak: primary.stats.currentStreak,
    bestStreak: Math.max(sa.bestStreak, sb.bestStreak, primary.stats.currentStreak),
    coinsSurvivedTotal: Math.max(sa.coinsSurvivedTotal, sb.coinsSurvivedTotal),
    maxCoinsSurvivedInMatch: Math.max(sa.maxCoinsSurvivedInMatch, sb.maxCoinsSurvivedInMatch),
    shotsFiredTotal: Math.max(sa.shotsFiredTotal, sb.shotsFiredTotal),
    maxResurrectedSingleCard: Math.max(sa.maxResurrectedSingleCard, sb.maxResurrectedSingleCard),
    winsAfterReverse: Math.max(sa.winsAfterReverse, sb.winsAfterReverse),
    wildCheckmates: Math.max(sa.wildCheckmates, sb.wildCheckmates),
    fastestWinSec,
  };

  const displayName =
    primary.displayName !== 'Player'
      ? primary.displayName
      : secondary.displayName !== 'Player'
        ? secondary.displayName
        : 'Player';

  const merged: PlayerProfile = {
    ...secondary,
    ...primary,
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date(Math.max(timeA, timeB, Date.now())).toISOString(),
    playerId:
      richnessA === 0 && richnessB > 0
        ? b.playerId
        : richnessB === 0 && richnessA > 0
          ? a.playerId
          : primary.playerId,
    displayName,
    score: Math.max(a.score, b.score),
    language: primary.language,
    muted: primary.muted,
    settings: { ...primary.settings },
    unlockedAchievements: mergedAchievements,
    stats: mergedStats,
    friends: Array.from(friendMap.values()),
  };

  // Re-evaluate achievements in case merged stats crossed any new threshold
  const snap = getAchievementProgressSnapshot(merged);
  const newlyUnlocked = evaluateNewAchievements(snap, merged.unlockedAchievements);
  const nowIso = new Date().toISOString();
  for (const ach of newlyUnlocked) {
    merged.unlockedAchievements[ach.id] = nowIso;
  }

  return merged;
}

export function loadProfile(): PlayerProfile {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultProfile();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as unknown;
    const { profile, needsSave } = normalizeAndMigrateProfile(parsed);
    if (needsSave) {
      saveProfile(profile);
    }
    return profile;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  const stamped: PlayerProfile = {
    ...profile,
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(stamped);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota errors
  }
  if (isTauriRuntime()) {
    void invokeTauriCommand('save_profile_backup', { json: serialized });
  }
}

/**
 * Explicitly flushes the current profile to Tauri's atomic disk save (`save.json` + `save.bak.json`)
 * and `localStorage` before app restart or update installation.
 */
export async function flushProfileBackupSync(profile: PlayerProfile): Promise<void> {
  const stamped: PlayerProfile = {
    ...profile,
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(stamped);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore
  }
  if (isTauriRuntime()) {
    await invokeTauriCommand('save_profile_backup', { json: serialized });
  }
}

/**
 * On Tauri desktop startup: loads `save.json` (or `save.bak.json`) from `app_data_dir()`
 * and performs a lossless merge with `localStorage`. If `localStorage` was cleared or corrupted,
 * restores 100% of progress from disk; if both exist, merges achievements & stats without loss.
 */
export async function hydrateProfileFromTauriDisk(
  currentLocalProfile: PlayerProfile,
): Promise<PlayerProfile> {
  if (!isTauriRuntime()) return currentLocalProfile;
  const rawBackup = await invokeTauriCommand<string | null>('load_profile_backup');
  if (!rawBackup || typeof rawBackup !== 'string') {
    await flushProfileBackupSync(currentLocalProfile);
    return currentLocalProfile;
  }
  try {
    const parsedDisk = JSON.parse(rawBackup) as unknown;
    const diskProfile = normalizeAndMigrateProfile(parsedDisk).profile;
    const merged = mergeProfiles(currentLocalProfile, diskProfile);
    await flushProfileBackupSync(merged);
    return merged;
  } catch {
    await flushProfileBackupSync(currentLocalProfile);
    return currentLocalProfile;
  }
}

/**
 * Serializes a player profile into a clean, human-readable JSON file for portable backup/transfer.
 */
export function exportProfileToJson(profile: PlayerProfile): string {
  const normalized = normalizeAndMigrateProfile(profile).profile;
  const payload = {
    ...normalized,
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and imports a JSON save string, merging it losslessly with any existing local progress.
 */
export function parseAndValidateImportedProfile(
  rawJson: string,
  existingProfile?: PlayerProfile,
): { ok: true; profile: PlayerProfile } | { ok: false; error: string } {
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    return { ok: false, error: 'Empty save file' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Save root must be a JSON object' };
  }
  const obj = parsed as Record<string, unknown>;
  const hasRecognizedSignature =
    typeof obj.playerId === 'string' ||
    (obj.stats !== null && typeof obj.stats === 'object') ||
    (obj.settings !== null && typeof obj.settings === 'object') ||
    (obj.unlockedAchievements !== null && typeof obj.unlockedAchievements === 'object');

  if (!hasRecognizedSignature) {
    return { ok: false, error: 'Unrecognized ChUno save structure' };
  }

  if (obj.score !== undefined && (typeof obj.score !== 'number' || !Number.isFinite(obj.score) || obj.score < 0)) {
    return { ok: false, error: 'Invalid score field in save file' };
  }

  const imported = normalizeAndMigrateProfile(obj).profile;
  const finalProfile = existingProfile
    ? mergeProfiles(existingProfile, imported, true)
    : imported;

  return { ok: true, profile: finalProfile };
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
