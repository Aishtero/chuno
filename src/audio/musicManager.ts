export type MusicFolder = 'survival' | 'friendly' | 'friendly_background' | 'unknown';
export type MusicContext = 'menu' | 'game';
export type MusicTrackChoiceId = 'sunlight' | 'meadow' | 'iron_girders' | 'midnight';
export type MusicTrackPreference = 'auto' | MusicTrackChoiceId;

export interface MusicTrackCatalogEntry {
  id: MusicTrackChoiceId;
  folder: MusicFolder;
  labels: Record<'en' | 'ru' | 'uz', string>;
}

export const MUSIC_TRACK_CATALOG: readonly MusicTrackCatalogEntry[] = [
  {
    id: 'sunlight',
    folder: 'friendly',
    labels: {
      en: 'Sunlight on the Manuscript',
      ru: 'Свет на манускрипте',
      uz: 'Qo‘lyozmadagi quyosh',
    },
  },
  {
    id: 'meadow',
    folder: 'friendly_background',
    labels: {
      en: 'Meadow Breeze',
      ru: 'Луговой бриз',
      uz: 'O‘tloq shabadasi',
    },
  },
  {
    id: 'iron_girders',
    folder: 'survival',
    labels: {
      en: 'Beneath the Iron Girders',
      ru: 'Под железными балками',
      uz: 'Temir to‘sinlar ostida',
    },
  },
  {
    id: 'midnight',
    folder: 'unknown',
    labels: {
      en: 'Midnight Horizon',
      ru: 'Полуночный горизонт',
      uz: 'Yarim tun ufqi',
    },
  },
] as const;

export const MUSIC_PREFERENCE_ORDER: readonly MusicTrackPreference[] = [
  'auto',
  'sunlight',
  'meadow',
  'iron_girders',
  'midnight',
] as const;

export function isValidMusicTrackPreference(raw: unknown): raw is MusicTrackPreference {
  return (
    raw === 'auto' ||
    raw === 'sunlight' ||
    raw === 'meadow' ||
    raw === 'iron_girders' ||
    raw === 'midnight'
  );
}

export function resolveMusicFolderForPreference(
  preference: MusicTrackPreference,
  autoFolder: MusicFolder | null,
): MusicFolder | null {
  if (preference === 'auto') return autoFolder;
  const entry = MUSIC_TRACK_CATALOG.find((t) => t.id === preference);
  return entry ? entry.folder : autoFolder;
}

export function getNextMusicTrackPreference(
  current: MusicTrackPreference,
  step: 1 | -1 = 1,
): MusicTrackPreference {
  const idx = MUSIC_PREFERENCE_ORDER.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = (base + step + MUSIC_PREFERENCE_ORDER.length) % MUSIC_PREFERENCE_ORDER.length;
  return MUSIC_PREFERENCE_ORDER[next];
}

export function getMusicTrackLabel(
  pref: MusicTrackPreference,
  lang: 'en' | 'ru' | 'uz',
): string {
  if (pref === 'auto') {
    return lang === 'ru' ? 'Авто (по режиму)' : lang === 'uz' ? 'Avto (rejim bo‘yicha)' : 'Auto (by mode)';
  }
  const entry = MUSIC_TRACK_CATALOG.find((t) => t.id === pref);
  return entry ? (entry.labels[lang] ?? entry.labels.en) : pref;
}

const CROSSFADE_MS = 900;
const UNKNOWN_CROSSFADE_MS = 1200;
/** Ultra-calm background curve: 30% slider -> ~0.0113 normal / ~0.0051 unknown */
const MUSIC_GAIN_SCALE = 0.16;
const MUSIC_VOLUME_CURVE = 2.2;

export const CHANNEL_VOLUME_SCALE: Record<MusicFolder, number> = {
  survival: 1.0,
  friendly: 1.0,
  friendly_background: 1.0,
  unknown: 0.45,
};

export function isMobileWebEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) return false;
  try {
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    }
    return window.innerWidth < 768;
  } catch {
    return false;
  }
}

export function computeEffectiveMusicVolume(
  sliderVolume: number,
  channel: MusicFolder | null = null,
  mobileSpeakerBoost = false,
): number {
  const clamped = Math.max(0, Math.min(1, sliderVolume));
  if (clamped <= 0) return 0;
  const channelScale = channel ? (CHANNEL_VOLUME_SCALE[channel] ?? 1.0) : 1.0;
  const base = Math.pow(clamped, MUSIC_VOLUME_CURVE) * MUSIC_GAIN_SCALE;
  if (mobileSpeakerBoost) {
    // Phone speakers in mobile browsers make 0.0113 (-39 dB) nearly inaudible; lift floor gently
    const boosted = Math.max(clamped >= 0.05 ? 0.034 : 0, base * 2.5);
    return Math.min(0.45, boosted * channelScale);
  }
  return base * channelScale;
}

function extractGlobUrls(globMap: Record<string, unknown> | undefined): string[] {
  if (!globMap || typeof globMap !== 'object') return [];
  return Object.keys(globMap)
    .sort()
    .map((k) => {
      const entry = globMap[k];
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'default' in entry) {
        const def = (entry as { default?: unknown }).default;
        if (typeof def === 'string') return def;
      }
      return '';
    })
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}

// Vite transforms import.meta.glob() statically at build time.
// IMPORTANT: Never guard with `typeof import.meta.glob === 'function'` — in the browser
// `import.meta.glob` does not exist at runtime, so that guard evaluates to false!
// Wrapping direct calls in try/catch stays safe in Node/tsx tests where Vite doesn't transform them.
let survivalUrls: string[] = [];
let friendlyMenuUrls: string[] = [];
let friendlyGameUrls: string[] = [];
let unknownUrls: string[] = [];

try {
  survivalUrls = extractGlobUrls(
    import.meta.glob('../assets/audio/music/survival/*.{mp3,ogg,wav}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  );
  friendlyMenuUrls = extractGlobUrls(
    import.meta.glob('../assets/audio/music/friendly/*.{mp3,ogg,wav}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  );
  friendlyGameUrls = extractGlobUrls(
    import.meta.glob('../assets/audio/music/friendly_background/*.{mp3,ogg,wav}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  );
  unknownUrls = extractGlobUrls(
    import.meta.glob('../assets/audio/music/unknown/*.{mp3,ogg,wav}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  );
} catch {
  // Node / tsx test runtime without Vite glob transform
}

const FOLDER_PLAYLISTS: Record<MusicFolder, string[]> = {
  survival: survivalUrls,
  friendly: friendlyMenuUrls,
  friendly_background: friendlyGameUrls,
  unknown: unknownUrls,
};

export interface MusicDebugSnapshot {
  tracks: {
    survival: number;
    friendly: number;
    friendly_background: number;
    unknown: number;
  };
  opusSupport: string;
  unlocked: boolean;
  needsResume: boolean;
  pendingCategory: MusicFolder | null;
  desiredFolder: MusicFolder | null;
  desiredContext: MusicContext;
  activeFolder: MusicFolder | null;
  muted: boolean;
  menuMusicEnabled: boolean;
  gameMusicEnabled: boolean;
  musicVolume: number;
  targetVolume: number;
  audio: {
    src: string;
    readyState: number;
    paused: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    error: string | null;
  } | null;
}

class MusicManager {
  private muted = false;
  private musicVolume = 0.3;
  private menuMusicEnabled = true;
  private gameMusicEnabled = true;
  private ducked = false;
  private voiceDucked = false;
  private unlocked = false;
  private needsResume = false;
  private pendingCategory: MusicFolder | null = null;
  private opusSupport = '';
  private decodeErrorOccurred = false;

  private desiredFolder: MusicFolder | null = null;
  private autoFolder: MusicFolder | null = null;
  private trackPreference: MusicTrackPreference = 'auto';
  private desiredContext: MusicContext = 'menu';

  private activeFolder: MusicFolder | null = null;
  private activeTrackIndex = 0;
  private currentEl: HTMLAudioElement | null = null;
  private outgoingEl: HTMLAudioElement | null = null;
  private fadeTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        const probe = new Audio();
        this.opusSupport = probe.canPlayType('audio/ogg; codecs=opus') || '';
      } catch {
        this.opusSupport = '';
      }

      console.info(
        `[MusicManager] Discovered tracks -> survival: ${survivalUrls.length}, friendly: ${friendlyMenuUrls.length}, friendly_background: ${friendlyGameUrls.length}, unknown: ${unknownUrls.length} | opus support: "${this.opusSupport}"`,
      );
      if (!this.opusSupport) {
        console.warn('[MusicManager] Browser reports no audio/ogg; codecs=opus support.');
      }

      // Global gesture listeners in capture phase across pointer, touch, click & key events
      const onUserGesture = () => {
        if (this.shouldAttemptResumeOnGesture()) {
          this.unlockAndResume();
        }
      };
      window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true });
      window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true });
      window.addEventListener('touchend', onUserGesture, { capture: true, passive: true });
      window.addEventListener('click', onUserGesture, { capture: true, passive: true });
      window.addEventListener('keydown', onUserGesture, { capture: true, passive: true });

      // Expose read-only diagnostic hook for runtime inspection
      (window as unknown as { __chunoMusicDebug?: () => MusicDebugSnapshot }).__chunoMusicDebug = () =>
        this.getDebugSnapshot();
    }
  }

  private shouldAttemptResumeOnGesture(): boolean {
    if (!this.desiredFolder || !this.isCurrentContextEnabled()) return false;
    if (this.needsResume || !this.unlocked) return true;
    if (this.currentEl && this.currentEl.paused) return true;
    if (!this.currentEl && (FOLDER_PLAYLISTS[this.desiredFolder]?.length ?? 0) > 0) return true;
    return false;
  }

  public getFolderTracks(folder: MusicFolder): string[] {
    return FOLDER_PLAYLISTS[folder] ?? [];
  }

  public getDebugSnapshot(): MusicDebugSnapshot {
    const el = this.currentEl;
    return {
      tracks: {
        survival: survivalUrls.length,
        friendly: friendlyMenuUrls.length,
        friendly_background: friendlyGameUrls.length,
        unknown: unknownUrls.length,
      },
      opusSupport: this.opusSupport,
      unlocked: this.unlocked,
      needsResume: this.needsResume,
      pendingCategory: this.pendingCategory,
      desiredFolder: this.desiredFolder,
      desiredContext: this.desiredContext,
      activeFolder: this.activeFolder,
      muted: this.muted,
      menuMusicEnabled: this.menuMusicEnabled,
      gameMusicEnabled: this.gameMusicEnabled,
      musicVolume: this.musicVolume,
      targetVolume: this.getEffectiveVolume(),
      audio: el
        ? {
            src: el.currentSrc || el.src,
            readyState: el.readyState,
            paused: el.paused,
            volume: el.volume,
            currentTime: el.currentTime,
            duration: Number.isFinite(el.duration) ? el.duration : 0,
            error: el.error ? `code=${el.error.code} ${el.error.message || ''}`.trim() : null,
          }
        : null,
    };
  }

  public isPlayingRealMusic(): boolean {
    return this.currentEl !== null && !this.currentEl.paused && this.getEffectiveVolume() > 0.0005;
  }

  /** True whenever the active/desired music channel has playable audio files (so procedural ambient stays muted). */
  public hasRealTracksForActiveChannel(): boolean {
    if (this.decodeErrorOccurred) return false;
    const folder = this.activeFolder ?? this.desiredFolder;
    if (!folder) return false;
    return (FOLDER_PLAYLISTS[folder]?.length ?? 0) > 0;
  }

  private isCurrentContextEnabled(): boolean {
    return this.desiredContext === 'menu' ? this.menuMusicEnabled : this.gameMusicEnabled;
  }

  /**
   * Single source of truth for real HTMLAudioElement.volume across all 4 channels
   * (used on track start, every crossfade tick, setMusicVolume, and resume).
   */
  public getEffectiveVolume(channelOverride?: MusicFolder | null): number {
    if (this.muted || !this.isCurrentContextEnabled()) return 0;
    const channel = channelOverride ?? this.activeFolder ?? this.pendingCategory ?? this.desiredFolder;
    const mobileBoost = isMobileWebEnvironment();
    return Math.max(
      0,
      Math.min(
        1,
        computeEffectiveMusicVolume(this.musicVolume, channel, mobileBoost) *
          (this.ducked ? 0.35 : 1) *
          (this.voiceDucked ? 0.65 : 1),
      ),
    );
  }

  /**
   * Request background music for a folder + context ('menu' | 'game').
   * - If 'unknown' is requested but its folder is empty, gracefully falls back to 'friendly_background'.
   * - If the same folder is already actively playing and remains enabled (e.g. Survival Menu -> Survival Match),
   *   continues seamlessly without restarting!
   * - If the folder is empty, silently fades out previous track with 0 console errors.
   */
  public getTrackPreference(): MusicTrackPreference {
    return this.trackPreference;
  }

  public setTrackPreference(pref: MusicTrackPreference): void {
    const safe: MusicTrackPreference = isValidMusicTrackPreference(pref) ? pref : 'auto';
    if (this.trackPreference === safe) return;
    this.trackPreference = safe;
    this.setChannel(this.autoFolder, this.desiredContext);
  }

  public setChannel(folder: MusicFolder | null, context: MusicContext): void {
    this.autoFolder = folder;
    const preferredFolder = resolveMusicFolderForPreference(this.trackPreference, folder);
    const resolvedFolder: MusicFolder | null =
      preferredFolder === 'unknown' && (FOLDER_PLAYLISTS.unknown?.length ?? 0) === 0
        ? 'friendly_background'
        : preferredFolder;
    const prevFolder = this.activeFolder ?? this.desiredFolder;
    this.desiredFolder = resolvedFolder;
    this.desiredContext = context;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    if (!this.isCurrentContextEnabled() || !resolvedFolder) {
      this.needsResume = false;
      this.pendingCategory = null;
      this.fadeCurrentToVolume(0, 420, true);
      return;
    }

    const tracks = FOLDER_PLAYLISTS[resolvedFolder] ?? [];
    if (tracks.length === 0) {
      this.needsResume = false;
      this.pendingCategory = null;
      this.fadeCurrentToVolume(0, 420, true);
      this.activeFolder = null;
      return;
    }

    // Same folder already playing cleanly -> keep seamlessly without restarting
    if (this.activeFolder === resolvedFolder && this.currentEl && !this.currentEl.paused && !this.needsResume) {
      this.fadeCurrentToVolume(this.getEffectiveVolume(resolvedFolder), 500, false);
      return;
    }

    // Same folder exists as paused element (e.g., after pause or blocked autoplay) -> try resume
    if (
      this.currentEl &&
      (this.activeFolder === resolvedFolder || this.pendingCategory === resolvedFolder) &&
      this.currentEl.paused
    ) {
      this.attemptResumeElement(this.currentEl, resolvedFolder);
      return;
    }

    const fadeMs = resolvedFolder === 'unknown' || prevFolder === 'unknown' ? UNKNOWN_CROSSFADE_MS : CROSSFADE_MS;
    this.crossfadeToFolder(resolvedFolder, 0, fadeMs);
  }

  public unlockAndResume(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (!this.desiredFolder || !this.isCurrentContextEnabled()) {
      this.unlocked = true;
      return;
    }

    const folder = this.desiredFolder;
    const tracks = FOLDER_PLAYLISTS[folder] ?? [];
    if (tracks.length === 0) {
      this.unlocked = true;
      return;
    }

    // Already playing the desired folder -> just ensure volume isn't stuck at 0
    if (this.currentEl && this.activeFolder === folder && !this.currentEl.paused && !this.needsResume) {
      this.unlocked = true;
      const target = this.getEffectiveVolume();
      if (this.fadeTimer === null && Math.abs(this.currentEl.volume - target) > 0.01) {
        this.fadeCurrentToVolume(target, 350, false);
      }
      return;
    }

    // Resume an already-created paused element for this folder synchronously within user gesture
    if (this.currentEl && (this.pendingCategory === folder || this.activeFolder === folder)) {
      this.attemptResumeElement(this.currentEl, folder);
      return;
    }

    // Otherwise start fresh crossfade into desired folder
    this.crossfadeToFolder(folder, 0);
  }

  public unlock(): void {
    this.unlockAndResume();
  }

  private attemptResumeElement(el: HTMLAudioElement, folder: MusicFolder): void {
    if (el.error) {
      // Element encountered an earlier load/decode error; recreate cleanly inside user gesture
      this.crossfadeToFolder(folder, this.activeTrackIndex);
      return;
    }
    const targetVol = this.getEffectiveVolume(folder);
    if (el.volume <= 0.001 && targetVol > 0) {
      el.volume = Math.min(targetVol, 0.01);
    }
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          if (this.currentEl !== el) return;
          this.unlocked = true;
          this.needsResume = false;
          this.decodeErrorOccurred = false;
          this.pendingCategory = null;
          this.activeFolder = folder;
          this.fadeCurrentToVolume(this.getEffectiveVolume(folder), 480, false);
        })
        .catch((err: unknown) => {
          if (this.currentEl !== el) return;
          const name = err instanceof Error ? err.name : '';
          if (name === 'NotAllowedError') {
            this.needsResume = true;
            this.pendingCategory = folder;
            this.activeFolder = null;
          } else if (name === 'NotSupportedError') {
            this.decodeErrorOccurred = true;
            this.needsResume = false;
            this.pendingCategory = null;
            this.activeFolder = null;
          } else if (name !== 'AbortError') {
            console.warn('[MusicManager] Failed to resume audio:', el.src, err);
          }
        });
    } else {
      this.unlocked = true;
      this.needsResume = false;
      this.pendingCategory = null;
      this.activeFolder = folder;
      this.fadeCurrentToVolume(this.getEffectiveVolume(folder), 480, false);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (!muted && this.shouldAttemptResumeOnGesture()) {
      this.unlockAndResume();
      return;
    }
    this.applyVolumeSmooth(320);
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    const target = this.getEffectiveVolume();
    if (this.currentEl && !this.currentEl.paused) {
      this.currentEl.volume = this.fadeTimer === null ? target : Math.min(this.currentEl.volume, target);
    }
    if (this.outgoingEl && !this.outgoingEl.paused) {
      this.outgoingEl.volume = Math.min(this.outgoingEl.volume, target);
    }
  }

  public setMenuMusicEnabled(enabled: boolean): void {
    this.menuMusicEnabled = enabled;
    if (this.desiredContext === 'menu') {
      this.syncEnabledState();
    }
  }

  public setGameMusicEnabled(enabled: boolean): void {
    this.gameMusicEnabled = enabled;
    if (this.desiredContext === 'game') {
      this.syncEnabledState();
    }
  }

  public setDucked(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolumeSmooth(280);
  }

  public setVoiceDucked(ducked: boolean): void {
    if (this.voiceDucked === ducked) return;
    this.voiceDucked = ducked;
    this.applyVolumeSmooth(ducked ? 200 : 420);
  }

  private syncEnabledState(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    if (!this.isCurrentContextEnabled()) {
      this.needsResume = false;
      this.pendingCategory = null;
      this.fadeCurrentToVolume(0, 420, true);
    } else if (this.desiredFolder) {
      if (this.currentEl && (this.activeFolder === this.desiredFolder || this.pendingCategory === this.desiredFolder)) {
        if (this.currentEl.paused) {
          this.attemptResumeElement(this.currentEl, this.desiredFolder);
        } else {
          this.activeFolder = this.desiredFolder;
          this.fadeCurrentToVolume(this.getEffectiveVolume(), 520, false);
        }
      } else {
        this.crossfadeToFolder(this.desiredFolder, 0);
      }
    }
  }

  private applyVolumeSmooth(durationMs: number): void {
    if (!this.currentEl) return;
    this.fadeCurrentToVolume(this.getEffectiveVolume(), durationMs, false);
  }

  private stopFadeTimer(): void {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.outgoingEl) {
      try {
        this.outgoingEl.pause();
        this.outgoingEl.currentTime = 0;
      } catch {
        // Ignore
      }
      this.outgoingEl = null;
    }
  }

  private fadeCurrentToVolume(targetVol: number, durationMs: number, pauseWhenZero: boolean): void {
    if (typeof window === 'undefined' || !this.currentEl) return;
    this.stopFadeTimer();
    const el = this.currentEl;
    const startVol = el.volume;
    if (Math.abs(targetVol - startVol) < 0.0005) {
      el.volume = targetVol;
      if (pauseWhenZero && targetVol <= 0.0005) {
        try {
          el.pause();
        } catch {
          // Ignore
        }
      }
      return;
    }
    const start = performance.now();
    this.fadeTimer = window.setInterval(() => {
      if (this.currentEl !== el) {
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        return;
      }
      const liveTarget = pauseWhenZero && targetVol <= 0.0005 ? 0 : this.getEffectiveVolume();
      const p = Math.min(1, (performance.now() - start) / Math.max(50, durationMs));
      // Smooth ease-in-out cosine curve eliminates any audible stepping clicks during ducking
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
      el.volume = Math.max(0, Math.min(1, startVol + (liveTarget - startVol) * eased));
      if (p >= 1) {
        el.volume = liveTarget;
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        if (pauseWhenZero && liveTarget <= 0.0005) {
          try {
            el.pause();
          } catch {
            // Ignore
          }
        }
      }
    }, 16);
  }

  private crossfadeToFolder(folder: MusicFolder, trackIndex: number, crossfadeMs: number = CROSSFADE_MS): void {
    this.stopFadeTimer();

    const tracks = FOLDER_PLAYLISTS[folder] ?? [];
    const outgoing = this.currentEl;
    const outStartVol = outgoing ? outgoing.volume : 0;

    let incoming: HTMLAudioElement | null = null;
    if (tracks.length > 0) {
      const safeIdx = ((trackIndex % tracks.length) + tracks.length) % tracks.length;
      const url = tracks[safeIdx];
      try {
        incoming = new Audio(url);
        incoming.preload = 'auto';
        incoming.volume = 0;
        incoming.loop = tracks.length === 1;
        incoming.addEventListener('error', () => {
          this.decodeErrorOccurred = true;
          console.warn(
            '[MusicManager] Audio load/decode error:',
            url,
            incoming?.error ? `code=${incoming.error.code} ${incoming.error.message || ''}`.trim() : 'unknown',
          );
        });
        if (tracks.length > 1) {
          incoming.addEventListener('ended', () => {
            if (this.currentEl === incoming && this.activeFolder === folder && this.isCurrentContextEnabled()) {
              this.crossfadeToFolder(folder, safeIdx + 1);
            }
          });
        }
        this.activeTrackIndex = safeIdx;
      } catch (err) {
        console.warn('[MusicManager] Failed to initialize HTMLAudioElement:', url, err);
        incoming = null;
      }
    }

    this.outgoingEl = outgoing;
    this.currentEl = incoming;
    // Do NOT mark activeFolder until play() resolves (or immediately if synchronous)
    this.activeFolder = null;
    this.pendingCategory = incoming ? folder : null;

    if (!outgoing && !incoming) return;

    if (incoming) {
      const el = incoming;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (this.currentEl !== el) return;
            this.unlocked = true;
            this.needsResume = false;
            this.pendingCategory = null;
            this.activeFolder = folder;
            // Ensure volume smoothly finishes reaching target even if timer already ended
            if (this.fadeTimer === null) {
              this.fadeCurrentToVolume(this.getEffectiveVolume(), 500, false);
            }
          })
          .catch((err: unknown) => {
            if (this.currentEl !== el) return;
            const name = err instanceof Error ? err.name : '';
            if (name === 'NotAllowedError') {
              // Autoplay blocked: DO NOT mark as playing; keep ready to resume on first click/key
              this.needsResume = true;
              this.pendingCategory = folder;
              this.activeFolder = null;
              el.volume = 0;
            } else if (name === 'NotSupportedError') {
              this.decodeErrorOccurred = true;
              this.needsResume = false;
              this.pendingCategory = null;
              this.activeFolder = null;
            } else if (name !== 'AbortError') {
              console.warn('[MusicManager] Playback error:', el.src, err);
            }
          });
      } else {
        this.unlocked = true;
        this.needsResume = false;
        this.pendingCategory = null;
        this.activeFolder = folder;
      }
    }

    const startTime = performance.now();
    this.fadeTimer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - startTime) / Math.max(50, crossfadeMs));
      const targetVol = this.getEffectiveVolume(folder);
      if (outgoing) {
        outgoing.volume = Math.max(0, outStartVol * (1 - p));
      }
      if (incoming && !incoming.paused) {
        incoming.volume = Math.max(0, Math.min(1, targetVol * p));
      }
      if (p >= 1) {
        if (outgoing) {
          try {
            outgoing.pause();
            outgoing.currentTime = 0;
          } catch {
            // Ignore
          }
        }
        if (this.outgoingEl === outgoing) {
          this.outgoingEl = null;
        }
        if (incoming && !incoming.paused) {
          incoming.volume = targetVol;
        }
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
      }
    }, 35);
  }

  public getActiveTrackIndex(): number {
    return this.activeTrackIndex;
  }
}

export const musicManager = new MusicManager();
