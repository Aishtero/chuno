import { Language } from './localization';
import { APP_VERSION, isTauriRuntime } from './profileManager';

export const MAX_WEB_GUEST_MATCHES = 3;
export const CHUNO_DOWNLOAD_BASE_URL = 'https://buro-ecosystem-web.pages.dev';

export type WebGuestPromptKind = 'none' | 'after_first' | 'after_second' | 'locked';

export interface WebGuestStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WebGuestGateStatus {
  isGuestMode: boolean;
  appVersion: string;
  storageKey: string;
  matchesPlayed: number;
  maxMatches: number;
  remainingMatches: number;
  isLocked: boolean;
  promptKind: WebGuestPromptKind;
}

export function getWebGuestStorageKey(appVersion: string = APP_VERSION): string {
  return `chuno_web_guest_v${appVersion}`;
}

export function getChunoDownloadUrl(lang?: Language): string {
  if (lang === 'ru') return `${CHUNO_DOWNLOAD_BASE_URL}/ru/chuno`;
  if (lang === 'en') return `${CHUNO_DOWNLOAD_BASE_URL}/en/chuno`;
  return `${CHUNO_DOWNLOAD_BASE_URL}/chuno`;
}

function getDefaultStorage(): WebGuestStorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

function resolvePromptKind(matchesPlayed: number, maxMatches: number): WebGuestPromptKind {
  if (matchesPlayed >= maxMatches) return 'locked';
  if (matchesPlayed === 2) return 'after_second';
  if (matchesPlayed === 1) return 'after_first';
  return 'none';
}

/**
 * Evaluates current web guest match allowance.
 * Strictly active ONLY in web browsers; in Tauri desktop (`isTauri === true`),
 * returns `isGuestMode: false` and `isLocked: false` with unlimited play.
 */
export function getWebGuestStatus(options?: {
  appVersion?: string;
  storage?: WebGuestStorageLike | null;
  isTauri?: boolean;
}): WebGuestGateStatus {
  const appVersion = options?.appVersion ?? APP_VERSION;
  const storageKey = getWebGuestStorageKey(appVersion);
  const inTauri = options?.isTauri ?? isTauriRuntime();

  if (inTauri) {
    return {
      isGuestMode: false,
      appVersion,
      storageKey,
      matchesPlayed: 0,
      maxMatches: MAX_WEB_GUEST_MATCHES,
      remainingMatches: Number.POSITIVE_INFINITY,
      isLocked: false,
      promptKind: 'none',
    };
  }

  const storage = options?.storage !== undefined ? options.storage : getDefaultStorage();
  let matchesPlayed = 0;
  try {
    const raw = storage?.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { matchesPlayed?: unknown } | number;
      const val =
        typeof parsed === 'number'
          ? parsed
          : parsed && typeof parsed === 'object' && typeof parsed.matchesPlayed === 'number'
            ? parsed.matchesPlayed
            : 0;
      if (Number.isFinite(val) && val >= 0) {
        matchesPlayed = Math.min(MAX_WEB_GUEST_MATCHES, Math.floor(val));
      }
    }
  } catch {
    matchesPlayed = 0;
  }

  const remainingMatches = Math.max(0, MAX_WEB_GUEST_MATCHES - matchesPlayed);
  const isLocked = matchesPlayed >= MAX_WEB_GUEST_MATCHES;

  return {
    isGuestMode: true,
    appVersion,
    storageKey,
    matchesPlayed,
    maxMatches: MAX_WEB_GUEST_MATCHES,
    remainingMatches,
    isLocked,
    promptKind: resolvePromptKind(matchesPlayed, MAX_WEB_GUEST_MATCHES),
  };
}

/**
 * Increments completed guest match count in the browser after a match ends.
 * No-op in Tauri desktop runtime.
 */
export function recordWebGuestMatchCompleted(options?: {
  appVersion?: string;
  storage?: WebGuestStorageLike | null;
  isTauri?: boolean;
}): WebGuestGateStatus {
  const current = getWebGuestStatus(options);
  if (!current.isGuestMode) {
    return current;
  }

  const nextPlayed = Math.min(current.maxMatches, current.matchesPlayed + 1);
  const storage = options?.storage !== undefined ? options.storage : getDefaultStorage();
  try {
    storage?.setItem(
      current.storageKey,
      JSON.stringify({
        version: current.appVersion,
        matchesPlayed: nextPlayed,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore storage quota errors
  }

  const remainingMatches = Math.max(0, current.maxMatches - nextPlayed);
  const isLocked = nextPlayed >= current.maxMatches;

  return {
    ...current,
    matchesPlayed: nextPlayed,
    remainingMatches,
    isLocked,
    promptKind: resolvePromptKind(nextPlayed, current.maxMatches),
  };
}
