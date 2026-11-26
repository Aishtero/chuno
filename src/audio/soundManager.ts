import { GameMode } from '../core/deck/cardData';
import {
  MusicContext,
  MusicFolder,
  MusicTrackPreference,
  computeEffectiveMusicVolume,
  isMobileWebEnvironment,
  musicManager,
} from './musicManager';

export type VoiceSpeakerProfile = 'dealer' | 'enthusiast' | 'egoist' | 'calm' | 'unknown';
export type MusicTrackId = 'menu' | 'survival' | 'light';
export type CustomSfxSlot =
  | 'card_draw'
  | 'piece_move'
  | 'coin_flip'
  | 'revolver_cock'
  | 'revolver_shot'
  | 'ui_click';

const AUDIO_EXTS = ['.mp3', '.ogg', '.wav'] as const;
const BGM_CROSSFADE_MS = 1000;
/** Deep perceptual headroom curves so SFX, ambient & voice stay comfortable across all saves */
const SFX_GAIN_SCALE = 0.25;
const SFX_VOLUME_CURVE = 2.0;
const VOICE_GAIN_SCALE = 0.45;
const VOICE_VOLUME_CURVE = 1.8;

export function computeEffectiveSfxVolume(sliderVolume: number): number {
  const clamped = Math.max(0, Math.min(1, sliderVolume));
  if (clamped <= 0) return 0;
  return Math.pow(clamped, SFX_VOLUME_CURVE) * SFX_GAIN_SCALE;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicVolume: number = 0.3;
  private menuMusicEnabled: boolean = true;
  private gameMusicEnabled: boolean = true;
  private sfxVolume: number = 0.35;
  private voiceVolume: number = 0.6;
  private ambientDucked: boolean = false;
  private audioUnlocked: boolean = false;

  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private activeMode: GameMode | null = null;

  private sfxBusGain: GainNode | null = null;
  private activeVoiceGain: GainNode | null = null;

  // Discovered files under public/audio/ (via /audio/manifest.json, zero 404s when empty)
  private availableAudioFiles = new Set<string>();
  private manifestLoaded = false;
  private manifestPromise: Promise<void> | null = null;

  // BGM Crossfade state
  private desiredMusicTrack: MusicTrackId | null = null;
  private activeMusicTrack: MusicTrackId | null = null;
  private currentBgm: HTMLAudioElement | null = null;
  private fadingOutBgm: HTMLAudioElement | null = null;
  private crossfadeTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      void this.loadAudioManifest();
    }
  }

  public loadAudioManifest(): Promise<void> {
    if (this.manifestLoaded) return Promise.resolve();
    if (this.manifestPromise) return this.manifestPromise;
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      this.manifestLoaded = true;
      return Promise.resolve();
    }
    this.manifestPromise = fetch('./audio/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { files?: string[] } | null) => {
        if (data && Array.isArray(data.files)) {
          for (const f of data.files) {
            this.availableAudioFiles.add(f.replace(/^\/+/, ''));
          }
        }
        this.manifestLoaded = true;
        if (this.desiredMusicTrack && this.audioUnlocked && this.activeMusicTrack !== this.desiredMusicTrack) {
          this.startMusicCrossfade(this.desiredMusicTrack);
        }
      })
      .catch(() => {
        this.manifestLoaded = true;
      });
    return this.manifestPromise;
  }

  /** Resolve a file under public/audio/ (e.g. 'music/menu' or 'sfx/piece_move') across .mp3/.ogg/.wav */
  public resolveAudioSlot(relBaseWithoutExt: string): string | null {
    const clean = relBaseWithoutExt.replace(/^\/+/, '').replace(/\.(mp3|ogg|wav)$/i, '');
    for (const ext of AUDIO_EXTS) {
      const rel = `${clean}${ext}`;
      if (this.availableAudioFiles.has(rel)) {
        return `./audio/${rel}`;
      }
    }
    return null;
  }

  /** Resolve a voice path like './audio/voices/ru/dealer/dealer_match_start_01.ogg' if present on disk */
  public resolveVoiceAsset(preferredPath: string): string | null {
    const rel = preferredPath.replace(/^\.?\/?audio\//i, '');
    return this.resolveAudioSlot(rel);
  }

  /** Gently dip/restore background music while a character voice clip plays (~65% volume). */
  public setVoiceMusicDucked(ducked: boolean): void {
    musicManager.setVoiceDucked(ducked);
  }

  /** Expose the shared unlocked AudioContext for Web Audio voice fallback playback. */
  public getAudioContext(): AudioContext | null {
    return this.ensureContext(false);
  }

  private getEffectiveSfxGain(): number {
    if (this.muted || this.sfxVolume <= 0) return 0;
    const base = computeEffectiveSfxVolume(this.sfxVolume);
    const boosted = isMobileWebEnvironment() ? Math.min(0.55, Math.max(0.05, base * 2.1)) : base;
    return Math.max(0, Math.min(1, boosted));
  }

  private playCustomSfxSlot(slot: CustomSfxSlot): boolean {
    const effective = this.getEffectiveSfxGain();
    if (effective <= 0) return true;
    const url = this.resolveAudioSlot(`sfx/${slot}`);
    if (!url || typeof Audio === 'undefined') return false;
    try {
      const el = new Audio(url);
      el.volume = effective;
      el.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  private getTargetAmbientGain(): number {
    if (this.muted || !this.gameMusicEnabled || this.musicVolume <= 0) return 0;
    // Completely mute procedural hum/wind whenever a real music track (.ogg/.mp3/.wav) backs the channel
    if (this.currentBgm || musicManager.isPlayingRealMusic() || musicManager.hasRealTracksForActiveChannel()) {
      return 0;
    }
    const base = this.ambientDucked ? 0.002 : 0.009;
    return base * computeEffectiveMusicVolume(this.musicVolume);
  }

  private getTargetBgmVolume(): number {
    if (this.muted || this.musicVolume <= 0) return 0;
    const curved = computeEffectiveMusicVolume(this.musicVolume);
    return Math.max(0, Math.min(1, curved * (this.ambientDucked ? 0.35 : 1)));
  }

  private getSfxBus(ctx: AudioContext): GainNode {
    if (!this.sfxBusGain) {
      const g = ctx.createGain();
      g.gain.value = this.getEffectiveSfxGain();
      g.connect(ctx.destination);
      this.sfxBusGain = g;
    }
    return this.sfxBusGain;
  }

  private ensureContext(requireActivation: boolean = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (
      requireActivation &&
      'userActivation' in navigator &&
      !(navigator as Navigator & { userActivation: { hasBeenActive: boolean } }).userActivation.hasBeenActive
    ) {
      return null;
    }
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): void {
    const wasUnlocked = this.audioUnlocked;
    this.audioUnlocked = true;
    const ctx = this.ensureContext(false);
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Standard mobile WebKit/iOS hardware channel unlock via 1-sample silent buffer on first gesture
      if (!wasUnlocked) {
        try {
          const silentBuf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = silentBuf;
          src.connect(ctx.destination);
          src.start(0);
        } catch {
          // Ignore
        }
      }
    }
    musicManager.unlockAndResume();
    if (this.desiredMusicTrack) {
      if (this.currentBgm && this.currentBgm.paused && this.activeMusicTrack === this.desiredMusicTrack) {
        this.currentBgm.play().catch(() => {});
      } else if (this.activeMusicTrack !== this.desiredMusicTrack) {
        this.startMusicCrossfade(this.desiredMusicTrack);
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    musicManager.setMuted(muted);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.12);
    }
    if (this.sfxBusGain && this.ctx) {
      this.sfxBusGain.gain.setTargetAtTime(this.getEffectiveSfxGain(), this.ctx.currentTime, 0.04);
    }
    if (this.currentBgm && this.crossfadeTimer === null) {
      this.currentBgm.volume = this.getTargetBgmVolume();
    }
    if (muted) {
      this.fadeOutCurrentVoice();
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    musicManager.setMusicVolume(this.musicVolume);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.08);
    }
    if (this.currentBgm && this.crossfadeTimer === null) {
      this.currentBgm.volume = this.getTargetBgmVolume();
    }
  }

  public setMenuMusicEnabled(enabled: boolean): void {
    this.menuMusicEnabled = enabled;
    musicManager.setMenuMusicEnabled(enabled);
  }

  public getMenuMusicEnabled(): boolean {
    return this.menuMusicEnabled;
  }

  public setGameMusicEnabled(enabled: boolean): void {
    this.gameMusicEnabled = enabled;
    musicManager.setGameMusicEnabled(enabled);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.15);
    }
  }

  public getGameMusicEnabled(): boolean {
    return this.gameMusicEnabled;
  }

  public setMusicChannel(folder: MusicFolder | null, context: MusicContext): void {
    musicManager.setChannel(folder, context);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.2);
    }
  }

  public setMusicTrackPreference(pref: MusicTrackPreference): void {
    musicManager.setTrackPreference(pref);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.2);
    }
  }

  public getMusicTrackPreference(): MusicTrackPreference {
    return musicManager.getTrackPreference();
  }

  public playInviteChime(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext(false);
    if (!ctx) return;
    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.095, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.34);
      osc.connect(g);
      g.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxBusGain && this.ctx) {
      this.sfxBusGain.gain.setTargetAtTime(this.getEffectiveSfxGain(), this.ctx.currentTime, 0.04);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setVoiceVolume(volume: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
  }

  public getVoiceVolume(): number {
    return this.voiceVolume;
  }

  public duckAmbient(ducked: boolean): void {
    this.ambientDucked = ducked;
    musicManager.setDucked(ducked);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.18);
    }
    if (this.currentBgm && this.crossfadeTimer === null) {
      this.currentBgm.volume = this.getTargetBgmVolume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Switch BGM track (`menu` | `survival` | `light`) with a smooth 1.0s crossfade.
   * Silently no-ops if no audio file has been placed in public/audio/music/ yet.
   */
  public playMusicTrack(track: MusicTrackId | null): void {
    this.desiredMusicTrack = track;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (!this.manifestLoaded) {
      void this.loadAudioManifest().then(() => {
        if (this.desiredMusicTrack === track && this.audioUnlocked) {
          this.startMusicCrossfade(track);
        }
      });
      return;
    }
    if (!this.audioUnlocked) return;
    this.startMusicCrossfade(track);
  }

  private startMusicCrossfade(track: MusicTrackId | null): void {
    if (track === this.activeMusicTrack && this.currentBgm) return;

    if (this.crossfadeTimer !== null) {
      window.clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    if (this.fadingOutBgm) {
      try {
        this.fadingOutBgm.pause();
      } catch {
        // Ignore
      }
      this.fadingOutBgm = null;
    }

    const outgoing = this.currentBgm;
    const outStartVol = outgoing ? outgoing.volume : 0;
    let incoming: HTMLAudioElement | null = null;

    if (track) {
      const url = this.resolveAudioSlot(`music/${track}`);
      if (url) {
        try {
          incoming = new Audio(url);
          incoming.loop = true;
          incoming.volume = 0;
          incoming.play().catch(() => {});
        } catch {
          incoming = null;
        }
      }
    }

    this.fadingOutBgm = outgoing;
    this.currentBgm = incoming;
    this.activeMusicTrack = incoming ? track : null;

    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.getTargetAmbientGain(), this.ctx.currentTime, 0.25);
    }

    if (!outgoing && !incoming) return;

    const startTime = performance.now();
    this.crossfadeTimer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - startTime) / BGM_CROSSFADE_MS);
      const targetVol = this.getTargetBgmVolume();
      if (outgoing) {
        outgoing.volume = Math.max(0, outStartVol * (1 - p));
      }
      if (incoming) {
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
        if (this.fadingOutBgm === outgoing) {
          this.fadingOutBgm = null;
        }
        if (this.crossfadeTimer !== null) {
          window.clearInterval(this.crossfadeTimer);
          this.crossfadeTimer = null;
        }
      }
    }, 30);
  }

  private getVoiceBus(ctx: AudioContext): GainNode {
    if (!this.activeVoiceGain) {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(ctx.destination);
      this.activeVoiceGain = g;
    }
    return this.activeVoiceGain;
  }

  public fadeOutCurrentVoice(): void {
    const ctx = this.ctx;
    const bus = this.activeVoiceGain;
    if (!ctx || !bus) return;
    const now = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + 0.05);
    } catch {
      // Ignore audio node scheduling issues
    }
    // Replace active bus cleanly so subsequent speech starts at full gain without cutting off fade
    const retiring = bus;
    this.activeVoiceGain = null;
    window.setTimeout(() => {
      try {
        retiring.disconnect();
      } catch {
        // Ignore already disconnected
      }
    }, 70);
  }

  public startAmbient(mode: GameMode): void {
    const ctx = this.ensureContext(true);
    if (!ctx) return;
    if (this.activeMode === mode && this.ambientNodes.length > 0) return;

    this.stopAmbient();
    this.activeMode = mode;

    const gain = ctx.createGain();
    gain.gain.value = this.getTargetAmbientGain();
    gain.connect(ctx.destination);
    this.ambientGain = gain;

    if (mode === 'survival') {
      // Low fluorescent buzz + sub-room drone
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 58;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 140;
      osc1.connect(filter);
      filter.connect(gain);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 116.5;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.25;
      osc2.connect(subGain);
      subGain.connect(gain);
      osc2.start();

      this.ambientNodes = [osc1, osc2, filter, subGain, gain];
    } else {
      // Gentle warm wind filter over soft pink/white noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.8;
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      this.ambientNodes = [noise, filter, gain];
    }
  }

  public stopAmbient(): void {
    for (const n of this.ambientNodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    this.ambientNodes = [];
    this.ambientGain = null;
    this.activeMode = null;
  }

  public playCardDraw(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    if (this.playCustomSfxSlot('card_draw')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const dur = 0.09;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const env = Math.sin((i / ch.length) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(out);
    src.start(now);
  }

  public playPieceMove(isCapture: boolean = false): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    if (this.playCustomSfxSlot('piece_move')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((isCapture ? 210 : 280) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.085);

    const g = ctx.createGain();
    g.gain.setValueAtTime(isCapture ? 0.34 : 0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCheck(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    [440, 554.37].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
      osc.connect(filter);
      filter.connect(g);
      g.connect(out);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  public playReverse(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playCoinPickup(): void {
    if (this.muted || this.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const dur = 0.14;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const env = Math.sin((i / ch.length) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env * 0.45;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.value = 3.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.005, now + dur);
    noise.connect(filter);
    filter.connect(g);
    g.connect(out);
    noise.start(now);

    const clink = ctx.createOscillator();
    clink.type = 'triangle';
    clink.frequency.setValueAtTime(1750, now + 0.04);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.08, now + 0.04);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    clink.connect(cg);
    cg.connect(out);
    clink.start(now + 0.04);
    clink.stop(now + 0.17);
  }

  public playCoinPing(): void {
    if (this.muted || this.sfxVolume <= 0.001) return;
    if (this.playCustomSfxSlot('coin_flip')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    [
      { freq: 2480, gain: 0.14, dur: 1.05 },
      { freq: 3740, gain: 0.09, dur: 0.85 },
      { freq: 5210, gain: 0.05, dur: 0.55 },
    ].forEach(({ freq, gain, dur }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    });
  }

  public playCoinSlam(): void {
    if (this.muted || this.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(135, now);
    thud.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.52, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thud.connect(tg);
    tg.connect(out);
    thud.start(now);
    thud.stop(now + 0.24);

    const dur = 0.11;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const slap = ctx.createBufferSource();
    slap.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, now);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.45, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    slap.connect(lp);
    lp.connect(sg);
    sg.connect(out);
    slap.start(now);
  }

  public playHeartbeat(): void {
    if (this.muted || this.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    [0, 0.19].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 62 : 52, now + offset);
      osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(idx === 0 ? 0.32 : 0.22, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(g);
      g.connect(out);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  public playCoinFlip(): void {
    this.playCoinPing();
  }

  /** Heavy wood & blued-steel lift sound when picking up the revolver */
  public playRevolverPickup(): void {
    if (this.muted || this.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const thud = ctx.createOscillator();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(175, now);
    thud.frequency.exponentialRampToValueAtTime(68, now + 0.08);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.18, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    thud.connect(tg);
    tg.connect(out);
    thud.start(now);
    thud.stop(now + 0.1);

    const clink = ctx.createOscillator();
    clink.type = 'sine';
    clink.frequency.setValueAtTime(2150, now + 0.03);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.055, now + 0.03);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    clink.connect(cg);
    cg.connect(out);
    clink.start(now + 0.03);
    clink.stop(now + 0.13);
  }

  /** Crisp two-stage metallic revolver hammer cock + cylinder pawl click-clack */
  public playRevolverCock(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    if (this.playCustomSfxSlot('revolver_cock')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    [
      { offset: 0, freq: 1850, dur: 0.035, gain: 0.22 },
      { offset: 0.125, freq: 2480, dur: 0.045, gain: 0.28 },
    ].forEach(({ offset, freq, dur, gain }) => {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(freq, now + offset);
      clickOsc.frequency.exponentialRampToValueAtTime(420, now + offset + dur);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(gain, now + offset);
      cg.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
      clickOsc.connect(cg);
      cg.connect(out);
      clickOsc.start(now + offset);
      clickOsc.stop(now + offset + dur + 0.01);

      // Tiny metallic snap transient
      const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
      const ch = nBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
      }
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.24, now + offset);
      ng.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);
      nSrc.connect(hp);
      hp.connect(ng);
      ng.connect(out);
      nSrc.start(now + offset);
    });
  }

  /** Punchy high-caliber revolver crack + concrete cellar room echo + optional ear ringing when player hit */
  public playRevolverShot(playerWasHit: boolean = false): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    if (this.playCustomSfxSlot('revolver_shot')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;

    // 1. Sharp dry pistol transient crack
    const crackDur = 0.065;
    const crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * crackDur), ctx.sampleRate);
    const crackCh = crackBuf.getChannelData(0);
    for (let i = 0; i < crackCh.length; i++) {
      crackCh[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.011));
    }
    const crack = ctx.createBufferSource();
    crack.buffer = crackBuf;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(2200, now);
    crackFilter.Q.value = 0.7;
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0.7, now);
    crackG.gain.exponentialRampToValueAtTime(0.001, now + crackDur);
    crack.connect(crackFilter);
    crackFilter.connect(crackG);
    crackG.connect(out);
    crack.start(now);

    // 2. Concussive chest punch (190Hz -> 42Hz)
    const punch = ctx.createOscillator();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(195, now);
    punch.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    const punchG = ctx.createGain();
    punchG.gain.setValueAtTime(0.6, now);
    punchG.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    punch.connect(punchG);
    punchG.connect(out);
    punch.start(now);
    punch.stop(now + 0.28);

    // 3. Cellar room slapback & reverb tail
    const tailDur = 0.62;
    const tailBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * tailDur), ctx.sampleRate);
    const tailCh = tailBuf.getChannelData(0);
    for (let i = 0; i < tailCh.length; i++) {
      tailCh[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }
    const tail = ctx.createBufferSource();
    tail.buffer = tailBuf;
    const tailLp = ctx.createBiquadFilter();
    tailLp.type = 'lowpass';
    tailLp.frequency.setValueAtTime(1750, now);
    tailLp.frequency.exponentialRampToValueAtTime(240, now + tailDur);
    const tailG = ctx.createGain();
    tailG.gain.setValueAtTime(0.32, now + 0.025);
    tailG.gain.exponentialRampToValueAtTime(0.001, now + tailDur);
    tail.connect(tailLp);
    tailLp.connect(tailG);
    tailG.connect(out);
    tail.start(now + 0.02);

    // 4. Brief subtle high-pitched ringing when the player takes a round
    if (playerWasHit) {
      const ring = ctx.createOscillator();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3250, now + 0.08);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0.001, now + 0.08);
      rg.gain.linearRampToValueAtTime(0.045, now + 0.15);
      rg.gain.exponentialRampToValueAtTime(0.0005, now + 0.92);
      ring.connect(rg);
      rg.connect(out);
      ring.start(now + 0.08);
      ring.stop(now + 0.95);
    }
  }

  /**
   * Quiet single atmospheric cue when a dialogue subtitle appears (fallback when no MP3/TTS is active).
   * - dealer (Survival): muted low breath / paper rustle + soft wood creak
   * - light mode NPCs: soft barely audible paper/wood tap
   */
  public playDialogueCue(speaker: VoiceSpeakerProfile): void {
    if (this.muted || this.voiceVolume <= 0) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    const bus = this.getVoiceBus(ctx);
    const now = ctx.currentTime;
    const vol = Math.pow(Math.max(0, Math.min(1, this.voiceVolume)), VOICE_VOLUME_CURVE) * VOICE_GAIN_SCALE;

    if (speaker === 'dealer') {
      // Muted low exhale / paper rustle
      const dur = 0.24;
      const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const ch = nBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        const env = Math.sin((i / ch.length) * Math.PI);
        ch[i] = (Math.random() * 2 - 1) * env;
      }
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(420, now);
      lp.frequency.exponentialRampToValueAtTime(180, now + dur);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.001, now);
      ng.gain.linearRampToValueAtTime(0.08 * vol, now + 0.045);
      ng.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      nSrc.connect(lp);
      lp.connect(ng);
      ng.connect(bus);
      nSrc.start(now);

      // Subtle low wood creak
      const creak = ctx.createOscillator();
      creak.type = 'sine';
      creak.frequency.setValueAtTime(112, now + 0.02);
      creak.frequency.exponentialRampToValueAtTime(74, now + 0.19);
      const creakFilter = ctx.createBiquadFilter();
      creakFilter.type = 'lowpass';
      creakFilter.frequency.value = 240;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.001, now + 0.02);
      cg.gain.linearRampToValueAtTime(0.04 * vol, now + 0.06);
      cg.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);

      creak.connect(creakFilter);
      creakFilter.connect(cg);
      cg.connect(bus);
      creak.start(now + 0.02);
      creak.stop(now + 0.22);
      return;
    }

    // Light mode: gentle page flip / muted wooden tap
    const dur = 0.085;
    const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = nBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const env = Math.sin((i / ch.length) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1250, now);
    bp.Q.value = 1.1;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.045 * vol, now + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.0008, now + dur);

    nSrc.connect(bp);
    bp.connect(ng);
    ng.connect(bus);
    nSrc.start(now);

    const tap = ctx.createOscillator();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(290, now);
    tap.frequency.exponentialRampToValueAtTime(155, now + 0.045);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.032 * vol, now);
    tg.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
    tap.connect(tg);
    tg.connect(bus);
    tap.start(now);
    tap.stop(now + 0.06);
  }

  public playClick(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    if (this.playCustomSfxSlot('ui_click')) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playAchievementUnlock(): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.09, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, start + 0.42);
      osc.connect(g);
      g.connect(out);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /**
   * Soft, unobtrusive procedural Web Audio cues for in-match animated emotes and quick phrases.
   * Respects both global mute and SFX volume slider.
   */
  public playEmoteSfx(
    kind: 'anger' | 'sigh' | 'laugh' | 'fanfare' | 'panic' | 'chime' | 'think' | 'phrase',
  ): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    const out = this.getSfxBus(ctx);
    const now = ctx.currentTime;

    const tone = (
      type: OscillatorType,
      freqStart: number,
      freqEnd: number,
      startOffset: number,
      dur: number,
      peakGain: number,
      lowpassHz?: number,
    ) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const t0 = now + startOffset;
      osc.frequency.setValueAtTime(freqStart, t0);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.022, dur * 0.25));
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
      if (lowpassHz) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = lowpassHz;
        osc.connect(lp);
        lp.connect(g);
      } else {
        osc.connect(g);
      }
      g.connect(out);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    switch (kind) {
      case 'chime':
        tone('sine', 587.33, 587.33, 0, 0.2, 0.11);
        tone('triangle', 880, 880, 0.075, 0.28, 0.09);
        break;
      case 'fanfare':
        tone('triangle', 523.25, 523.25, 0, 0.13, 0.09);
        tone('triangle', 659.25, 659.25, 0.06, 0.14, 0.095);
        tone('triangle', 783.99, 783.99, 0.12, 0.16, 0.1);
        tone('sine', 1046.5, 1046.5, 0.18, 0.3, 0.09);
        break;
      case 'laugh':
        tone('sine', 490, 560, 0, 0.085, 0.095);
        tone('sine', 620, 680, 0.095, 0.085, 0.095);
        tone('sine', 550, 630, 0.19, 0.12, 0.085);
        break;
      case 'panic':
        tone('triangle', 420, 740, 0, 0.11, 0.1, 1800);
        tone('triangle', 480, 820, 0.105, 0.12, 0.095, 1900);
        break;
      case 'anger':
        tone('sawtooth', 195, 130, 0, 0.22, 0.085, 520);
        tone('sawtooth', 165, 110, 0.11, 0.2, 0.07, 460);
        break;
      case 'sigh':
        tone('sine', 360, 215, 0, 0.34, 0.095);
        break;
      case 'think':
        tone('sine', 392, 466.16, 0, 0.16, 0.09);
        break;
      case 'phrase':
      default:
        tone('sine', 440, 640, 0, 0.09, 0.085);
        break;
    }
  }
}

export const soundManager = new SoundManager();
