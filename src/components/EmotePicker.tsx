import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, MessageSquareOff, Smile, Volume2 } from 'lucide-react';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import { preloadAllEmoteBlobs } from '../core/emoteAssets';
import {
  ANIMATED_EMOTES,
  CLIENT_EMOTE_COOLDOWN_MS,
  EmoteId,
  QUICK_PHRASES,
  getEmoteCooldownRatio,
  getEmoteUiCopy,
} from '../data/emotes';

interface EmotePickerProps {
  mode: GameMode;
  language: Language;
  lastSentAt: number;
  opponentEmotesMuted: boolean;
  disabled?: boolean;
  liftForMobileBanner?: boolean;
  onSelectEmote: (emoteId: EmoteId) => void;
  onToggleMuteOpponent: () => void;
}

const RING_RADIUS = 21;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const EmotePicker: React.FC<EmotePickerProps> = React.memo(
  ({
    mode,
    language,
    lastSentAt,
    opponentEmotesMuted,
    disabled = false,
    liftForMobileBanner = false,
    onSelectEmote,
    onToggleMuteOpponent,
  }) => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'emotes' | 'phrases'>('emotes');
    const [cooldownRatio, setCooldownRatio] = useState(0);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isSurv = mode === 'survival';
    const copy = getEmoteUiCopy(language);

    // Smooth 60fps cooldown ring via requestAnimationFrame while cooling down
    useEffect(() => {
      if (lastSentAt <= 0) {
        setCooldownRatio(0);
        return;
      }
      let rafId = 0;
      const tick = () => {
        const ratio = getEmoteCooldownRatio(lastSentAt, Date.now(), CLIENT_EMOTE_COOLDOWN_MS);
        setCooldownRatio(ratio);
        if (ratio > 0) {
          rafId = window.requestAnimationFrame(tick);
        }
      };
      tick();
      return () => {
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }, [lastSentAt]);

    // Preload WebP blobs when opening picker so hover/send is instant
    useEffect(() => {
      if (open) {
        void preloadAllEmoteBlobs();
      }
    }, [open]);

    // Close on outside click or Escape key
    useEffect(() => {
      if (!open) return;
      const handlePointerDown = (e: PointerEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setOpen(false);
        }
      };
      window.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        window.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }, [open]);

    const onCooldown = cooldownRatio > 0.005;
    const ringDashOffset = RING_CIRCUMFERENCE * (1 - cooldownRatio);

    const handlePick = (id: EmoteId) => {
      if (disabled || onCooldown) return;
      onSelectEmote(id);
      setOpen(false);
    };

    return (
      <div
        ref={containerRef}
        data-testid="emote-picker-dock"
        className={`fixed left-3 sm:left-5 z-[28] pointer-events-auto select-none ${
          liftForMobileBanner ? 'bottom-[86px] md:bottom-6' : 'bottom-4 sm:bottom-6'
        }`}
      >
        {/* Clash-Royale-inspired floating popup panel */}
        {open && (
          <div
            role="dialog"
            aria-label={copy.buttonTitle}
            data-testid="emote-picker-panel"
            className={`emote-picker-enter absolute left-0 bottom-[56px] w-[304px] sm:w-[336px] max-w-[calc(100vw-24px)] rounded-2xl border shadow-2xl backdrop-blur-md p-2.5 sm:p-3 ${
              isSurv
                ? 'bg-stone-950/95 border-amber-500/45 text-stone-100 shadow-black/75'
                : 'bg-white/96 border-stone-300/95 text-stone-900 shadow-stone-900/25'
            }`}
          >
            {/* Header strip: Tabs (Emotes / Phrases) + Opponent Mute Toggle */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-current/10">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-black/10 dark:bg-white/5">
                <button
                  type="button"
                  data-testid="emote-tab-animated"
                  onClick={() => setActiveTab('emotes')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    activeTab === 'emotes'
                      ? isSurv
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-900 text-white'
                      : isSurv
                        ? 'text-stone-300 hover:text-white'
                        : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>{copy.emotesTab}</span>
                </button>
                <button
                  type="button"
                  data-testid="emote-tab-phrases"
                  onClick={() => setActiveTab('phrases')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    activeTab === 'phrases'
                      ? isSurv
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-900 text-white'
                      : isSurv
                        ? 'text-stone-300 hover:text-white'
                        : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{copy.phrasesTab}</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="emote-mute-opponent-btn"
                aria-pressed={opponentEmotesMuted}
                title={opponentEmotesMuted ? copy.unmuteOpponent : copy.muteOpponent}
                aria-label={opponentEmotesMuted ? copy.unmuteOpponent : copy.muteOpponent}
                onClick={onToggleMuteOpponent}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                  opponentEmotesMuted
                    ? 'bg-red-600/20 border-red-500/60 text-red-400 hover:bg-red-600/30'
                    : isSurv
                      ? 'bg-stone-900/80 border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-white'
                      : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {opponentEmotesMuted ? (
                  <MessageSquareOff className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {opponentEmotesMuted && <span>{copy.mutedBadge}</span>}
              </button>
            </div>

            {/* Tab 1: 5x2 Grid of 10 Animated Emotes */}
            {activeTab === 'emotes' ? (
              <div
                data-testid="emote-grid-animated"
                className="grid grid-cols-5 gap-1.5 sm:gap-2"
              >
                {ANIMATED_EMOTES.map((emote) => {
                  const label = emote.labels[language] ?? emote.labels.en;
                  return (
                    <button
                      key={emote.id}
                      type="button"
                      data-testid={`emote-item-${emote.id}`}
                      disabled={disabled || onCooldown}
                      title={label}
                      aria-label={label}
                      onClick={() => handlePick(emote.id)}
                      className={`group relative aspect-square rounded-xl p-1 flex items-center justify-center border transition-transform duration-150 will-change-transform ${
                        disabled || onCooldown
                          ? 'opacity-45 cursor-not-allowed border-transparent'
                          : isSurv
                            ? 'bg-stone-900/75 border-stone-800 hover:border-amber-400/70 hover:bg-stone-800/90 hover:scale-110 active:scale-95 cursor-pointer'
                            : 'bg-stone-100/85 border-stone-200 hover:border-amber-500/80 hover:bg-amber-50/90 hover:scale-110 active:scale-95 cursor-pointer'
                      }`}
                    >
                      <img
                        src={emote.src}
                        alt={label}
                        width={56}
                        height={56}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-stone-950/95 text-white text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-120 shadow-md z-10"
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Tab 2: 2x3 Grid of 6 Quick Phrases */
              <div
                data-testid="emote-grid-phrases"
                className="grid grid-cols-2 gap-1.5 sm:gap-2"
              >
                {QUICK_PHRASES.map((phrase) => {
                  const label = phrase.labels[language] ?? phrase.labels.en;
                  return (
                    <button
                      key={phrase.id}
                      type="button"
                      data-testid={`emote-item-${phrase.id}`}
                      disabled={disabled || onCooldown}
                      onClick={() => handlePick(phrase.id)}
                      className={`px-2.5 py-2.5 rounded-xl border text-xs font-bold text-center transition-all duration-150 ${
                        disabled || onCooldown
                          ? 'opacity-45 cursor-not-allowed border-transparent'
                          : isSurv
                            ? 'bg-stone-900/85 border-stone-700/80 text-stone-100 hover:border-amber-400/70 hover:bg-amber-500/15 hover:text-amber-200 active:scale-95 cursor-pointer'
                            : 'bg-stone-100/90 border-stone-300/90 text-stone-900 hover:border-amber-500 hover:bg-amber-50 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {onCooldown && (
              <div className="mt-2 text-center text-[10px] font-semibold text-amber-500">
                {copy.cooldownHint}
              </div>
            )}
          </div>
        )}

        {/* Primary Floating Trigger Button (💬) opposite the card deck */}
        <button
          type="button"
          data-testid="emote-toggle-btn"
          aria-expanded={open}
          aria-label={copy.buttonTitle}
          title={copy.buttonTitle}
          onClick={(e) => {
            e.currentTarget.blur();
            setOpen((prev) => !prev);
          }}
          className={`relative h-12 w-12 sm:w-auto sm:h-11 sm:px-3.5 rounded-full border-2 shadow-xl flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 cursor-pointer ${
            open
              ? 'bg-amber-500 border-amber-300 text-stone-950 scale-105 shadow-[0_6px_22px_rgba(245,158,11,0.45)]'
              : isSurv
                ? 'bg-stone-900/95 border-amber-400/75 text-amber-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-300 shadow-[0_6px_22px_rgba(0,0,0,0.7)]'
                : 'bg-stone-900/92 border-amber-400/80 text-amber-200 hover:bg-stone-800 hover:border-amber-300 shadow-[0_6px_22px_rgba(24,20,16,0.38)]'
          }`}
        >
          {/* Smooth circular cooldown ring around icon */}
          <span className="relative inline-flex items-center justify-center w-6 h-6 shrink-0">
            {onCooldown && (
              <svg
                className="absolute -inset-1.5 w-9 h-9 -rotate-90 pointer-events-none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="24"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.22}
                  strokeWidth="3.5"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashOffset}
                />
              </svg>
            )}
            <MessageCircle className="w-5 h-5" />
          </span>
          <span className="hidden sm:inline text-xs font-bold tracking-wide whitespace-nowrap">
            {copy.emotesTab}
          </span>
          {opponentEmotesMuted && (
            <span
              data-testid="emote-muted-dot"
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-stone-950 flex items-center justify-center"
            />
          )}
        </button>
      </div>
    );
  },
);
EmotePicker.displayName = 'EmotePicker';
