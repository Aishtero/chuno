export const UPDATE_CHECK_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

export interface UpdateIndicatorState {
  showRedDot: boolean;
  showToast: boolean;
}

export function shouldRunBackgroundUpdateCheck(input: {
  isTauri: boolean;
  lastCheckedAt: number | null;
  now?: number;
}): boolean {
  if (!input.isTauri) return false;
  if (input.lastCheckedAt === null) return true;
  const nowTs = input.now ?? Date.now();
  return nowTs - input.lastCheckedAt >= UPDATE_CHECK_COOLDOWN_MS;
}

export function computeUpdateIndicatorState(input: {
  isTauri: boolean;
  availableVersion: string | null | undefined;
  toastDismissed: boolean;
}): UpdateIndicatorState {
  if (!input.isTauri) {
    return { showRedDot: false, showToast: false };
  }
  const hasUpdate = typeof input.availableVersion === 'string' && input.availableVersion.trim().length > 0;
  if (!hasUpdate) {
    return { showRedDot: false, showToast: false };
  }
  return {
    showRedDot: true,
    showToast: !input.toastDismissed,
  };
}
