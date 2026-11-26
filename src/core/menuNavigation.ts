export type MainMenuTab = 'campaign' | 'survival' | 'online';
export type OnlineSubMode = 'online_friendly' | 'online_survival';
export type LeaderDashboardTab = 'leaderboard' | 'achievements';

export const ONLINE_SUBMODES: readonly OnlineSubMode[] = [
  'online_friendly',
  'online_survival',
] as const;

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateDemoRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(rng() * ROOM_CODE_CHARS.length) % ROOM_CODE_CHARS.length;
    code += ROOM_CODE_CHARS[idx];
  }
  return `CH-${code}`;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidDemoRoomCode(raw: string): boolean {
  return /^CH-[A-Z0-9]{4}$/.test(normalizeRoomCode(raw));
}

export function buildDemoInviteLink(roomCode: string, subMode: OnlineSubMode): string {
  const modeSlug = subMode === 'online_survival' ? 'survival' : 'friendly';
  const cleanCode = normalizeRoomCode(roomCode);
  return `https://chuno.buro.local/lobby/${modeSlug}/${cleanCode}`;
}

export function nextLeaderDashboardTab(
  current: LeaderDashboardTab,
  requested: LeaderDashboardTab,
): LeaderDashboardTab {
  if (requested === 'leaderboard' || requested === 'achievements') {
    return requested;
  }
  return current;
}
