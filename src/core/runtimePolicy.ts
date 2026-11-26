import type { Language } from './localization';
import { isTauriRuntime } from './profileManager';

export interface OnlinePolicyContext {
  isTauri: boolean;
  isDev: boolean;
  search?: string;
}

export function isDevOnlineQueryActive(search?: string): boolean {
  const raw =
    typeof search === 'string'
      ? search
      : typeof window !== 'undefined' && window.location
        ? window.location.search
        : '';
  if (!raw) return false;
  try {
    const params = new URLSearchParams(raw);
    const val = params.get('devOnline');
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

/**
 * Pure policy evaluator:
 * - Tauri desktop builds (`isTauri === true`): ALWAYS true (full Online 1v1, Friends, Emotes).
 * - Production Web builds (`!isTauri && !isDev`): ALWAYS false (zero URL bypasses; Solo Campaign & Survival only).
 * - Local browser dev mode (`!isTauri && isDev`): false by DEFAULT so `http://localhost:3000`
 *   matches the real locked web build; enabled ONLY when `?devOnline=1` is explicitly passed.
 */
export function evaluateOnlineFeaturesEnabled(ctx: OnlinePolicyContext): boolean {
  if (ctx.isTauri) return true;
  if (!ctx.isDev) return false;
  return isDevOnlineQueryActive(ctx.search);
}

export function isOnlineFeaturesEnabled(): boolean {
  let isDev = false;
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
    isDev = env.DEV === true;
  } catch {
    isDev = false;
  }
  const search = typeof window !== 'undefined' && window.location ? window.location.search : '';
  return evaluateOnlineFeaturesEnabled({
    isTauri: isTauriRuntime(),
    isDev,
    search,
  });
}

export function getDesktopDownloadPageUrl(language: Language): string {
  const safeLang = language === 'ru' ? 'ru' : language === 'uz' ? 'uz' : 'en';
  return `https://buro-ecosystem-web.pages.dev/${safeLang}/chuno`;
}
