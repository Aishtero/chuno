import { ACHIEVEMENTS } from './achievements';
import { AvatarId } from '../data/playerAvatars';
import { PlayerProfile, getAchievementProgressSnapshot } from './profileManager';

export type LeaderboardCategory = 'score' | 'hard_wins' | 'win_streak' | 'coop_wins';
export type LeaderboardTag = 'YOU' | 'HOUSE' | 'ONLINE' | 'COOP';

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  avatarBadge: string;
  avatarId?: AvatarId;
  score: number;
  totalWins: number;
  hardWins: number;
  bestStreak: number;
  coopWins: number;
  achievementsCount: number;
  isLocalPlayer: boolean;
  tag: LeaderboardTag;
}

export interface LeaderboardProvider {
  readonly isRemote: boolean;
  getBoard(category: LeaderboardCategory): Promise<LeaderboardEntry[]>;
  submitPlayerSnapshot(profile: PlayerProfile): Promise<void>;
}

// Honest Table Benchmarks (marked HOUSE) so the offline board has clear rivals to climb past
const HOUSE_BENCHMARKS: LeaderboardEntry[] = [
  {
    playerId: 'HOUSE-DEALER',
    displayName: 'The Dealer',
    avatarBadge: 'skull',
    score: 12500,
    totalWins: 64,
    hardWins: 25,
    bestStreak: 12,
    coopWins: 0,
    achievementsCount: 28,
    isLocalPlayer: false,
    tag: 'HOUSE',
  },
  {
    playerId: 'HOUSE-CALM',
    displayName: 'Calm Philosopher',
    avatarBadge: 'owl',
    score: 6800,
    totalWins: 42,
    hardWins: 9,
    bestStreak: 8,
    coopWins: 0,
    achievementsCount: 22,
    isLocalPlayer: false,
    tag: 'HOUSE',
  },
  {
    playerId: 'HOUSE-UNKNOWN',
    displayName: 'Unknown',
    avatarBadge: 'fedora',
    score: 3900,
    totalWins: 24,
    hardWins: 4,
    bestStreak: 6,
    coopWins: 0,
    achievementsCount: 16,
    isLocalPlayer: false,
    tag: 'HOUSE',
  },
  {
    playerId: 'HOUSE-EGOIST',
    displayName: 'The Egoist',
    avatarBadge: 'shades',
    score: 1850,
    totalWins: 14,
    hardWins: 1,
    bestStreak: 4,
    coopWins: 0,
    achievementsCount: 11,
    isLocalPlayer: false,
    tag: 'HOUSE',
  },
  {
    playerId: 'HOUSE-ENTHUSIAST',
    displayName: 'Enthusiast',
    avatarBadge: 'sun',
    score: 650,
    totalWins: 6,
    hardWins: 0,
    bestStreak: 3,
    coopWins: 0,
    achievementsCount: 6,
    isLocalPlayer: false,
    tag: 'HOUSE',
  },
];

export function profileToLeaderboardEntry(profile: PlayerProfile): LeaderboardEntry {
  const snap = getAchievementProgressSnapshot(profile);
  const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(profile.unlockedAchievements[a.id])).length;
  const resolvedName =
    profile.nickname && profile.nickname !== 'Player'
      ? profile.nickname
      : profile.displayName && profile.displayName !== 'Player'
        ? profile.displayName
        : profile.nickname || profile.displayName || 'Player';
  return {
    playerId: profile.playerId,
    displayName: resolvedName,
    avatarBadge: 'crown',
    avatarId: profile.avatarId,
    score: profile.score,
    totalWins: snap.totalWins,
    hardWins: snap.survivalWins.hard,
    bestStreak: snap.bestWinStreak,
    coopWins: 0,
    achievementsCount: unlockedCount,
    isLocalPlayer: true,
    tag: 'YOU',
  };
}

function sortEntries(entries: LeaderboardEntry[], category: LeaderboardCategory): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    const metric = (e: LeaderboardEntry) => {
      switch (category) {
        case 'score':
          return e.score;
        case 'hard_wins':
          return e.hardWins;
        case 'win_streak':
          return e.bestStreak;
        case 'coop_wins':
          return e.coopWins;
      }
    };
    const diff = metric(b) - metric(a);
    if (diff !== 0) return diff;
    if (b.score !== a.score) return b.score - a.score;
    return b.totalWins - a.totalWins;
  });
}

export class LocalLeaderboardProvider implements LeaderboardProvider {
  public readonly isRemote = false;
  private localEntry: LeaderboardEntry | null = null;

  public async submitPlayerSnapshot(profile: PlayerProfile): Promise<void> {
    this.localEntry = profileToLeaderboardEntry(profile);
  }

  public async getBoard(category: LeaderboardCategory): Promise<LeaderboardEntry[]> {
    const list: LeaderboardEntry[] = [...HOUSE_BENCHMARKS];
    if (this.localEntry) {
      list.push(this.localEntry);
    }
    return sortEntries(list, category);
  }
}

export class RemoteLeaderboardProvider implements LeaderboardProvider {
  public readonly isRemote = true;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fallback = new LocalLeaderboardProvider();

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      h.apikey = this.apiKey;
      h.Authorization = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  public async submitPlayerSnapshot(profile: PlayerProfile): Promise<void> {
    await this.fallback.submitPlayerSnapshot(profile);
    try {
      const entry = profileToLeaderboardEntry(profile);
      await fetch(`${this.baseUrl}/leaderboard`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(entry),
      });
    } catch {
      // Graceful offline fallback
    }
  }

  public async getBoard(category: LeaderboardCategory): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch(`${this.baseUrl}/leaderboard?category=${encodeURIComponent(category)}`, {
        headers: this.headers(),
      });
      if (res.ok) {
        const rows = (await res.json()) as LeaderboardEntry[];
        if (Array.isArray(rows) && rows.length > 0) {
          return sortEntries(rows, category);
        }
      }
    } catch {
      // Fall back seamlessly to local table benchmarks when offline
    }
    return this.fallback.getBoard(category);
  }
}

function createLeaderboardProvider(): LeaderboardProvider {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
    const url = env.VITE_LEADERBOARD_API_URL || env.VITE_SUPABASE_URL;
    const key = env.VITE_LEADERBOARD_API_KEY || env.VITE_SUPABASE_ANON_KEY || '';
    if (url && url.trim().length > 0) {
      return new RemoteLeaderboardProvider(url.trim(), key.trim());
    }
  } catch {
    // Node/test environment without Vite env
  }
  return new LocalLeaderboardProvider();
}

export const leaderboardService: LeaderboardProvider = createLeaderboardProvider();
