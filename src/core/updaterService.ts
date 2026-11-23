import { PlayerProfile, flushProfileBackupSync, isTauriRuntime } from './profileManager';

export interface AvailableAppUpdate {
  version: string;
  currentVersion: string;
  date?: string;
  body: string;
  rawUpdate: {
    downloadAndInstall: (
      onEvent?: (event: {
        event: 'Started' | 'Progress' | 'Finished';
        data?: { contentLength?: number; chunkLength?: number };
      }) => void,
    ) => Promise<void>;
  };
}

export type UpdateCheckOutcome =
  | { status: 'disabled' }
  | { status: 'up-to-date' }
  | { status: 'available'; update: AvailableAppUpdate }
  | { status: 'error'; message: string };

/**
 * Checks for a newer signed desktop release via `@tauri-apps/plugin-updater`.
 * In web browser or when offline during silent startup check, safely returns without throwing.
 */
export async function checkForDesktopUpdate(silent = true): Promise<UpdateCheckOutcome> {
  if (!isTauriRuntime()) {
    return { status: 'disabled' };
  }
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      return { status: 'up-to-date' };
    }
    return {
      status: 'available',
      update: {
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date,
        body: typeof update.body === 'string' && update.body.trim().length > 0 ? update.body.trim() : '',
        rawUpdate: update,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!silent) {
      console.warn('[ChUno Updater] Check failed:', message);
    }
    return { status: 'error', message };
  }
}

/**
 * Flushes the player profile to atomic disk backup (`save.json`), downloads & installs
 * the update, and relaunches the desktop application.
 */
export async function installDesktopUpdateAndRelaunch(
  update: AvailableAppUpdate,
  profile: PlayerProfile,
  onProgress?: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // 1. Force flush player profile to disk before touching the executable
    await flushProfileBackupSync(profile);

    // 2. Download and install update with progress tracking
    let totalBytes = 0;
    let downloadedBytes = 0;
    onProgress?.(2);

    await update.rawUpdate.downloadAndInstall((evt) => {
      if (evt.event === 'Started') {
        totalBytes = evt.data?.contentLength ?? 0;
        downloadedBytes = 0;
        onProgress?.(5);
      } else if (evt.event === 'Progress') {
        downloadedBytes += evt.data?.chunkLength ?? 0;
        if (totalBytes > 0) {
          const pct = Math.min(98, Math.max(5, Math.round((downloadedBytes / totalBytes) * 100)));
          onProgress?.(pct);
        }
      } else if (evt.event === 'Finished') {
        onProgress?.(100);
      }
    });

    // 3. Flush profile one final time & relaunch process
    await flushProfileBackupSync(profile);
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}
