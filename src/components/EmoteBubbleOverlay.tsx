import React, { useEffect, useState } from 'react';
import { GameMode } from '../core/deck/cardData';
import {
  FreshEmoteHandle,
  createFreshEmoteObjectUrl,
  revokeEmoteObjectUrl,
} from '../core/emoteAssets';
import { Language } from '../core/localization';
import {
  EMOTE_EXIT_MS,
  EmoteId,
  getEmoteDefinition,
  getEmoteLabel,
} from '../data/emotes';

export interface ActiveEmoteInstance {
  instanceId: number;
  emoteId: EmoteId;
  senderSide: 'player' | 'opponent';
  senderName?: string;
  sentAt: number;
}

interface SingleBubbleProps {
  instance: ActiveEmoteInstance;
  mode: GameMode;
  language: Language;
  onFinished: (instanceId: number) => void;
}

const SingleEmoteBubble: React.FC<SingleBubbleProps> = React.memo(
  ({ instance, mode, language, onFinished }) => {
    const def = getEmoteDefinition(instance.emoteId);
    const [phase, setPhase] = useState<'in' | 'out'>('in');
    const [mediaHandle, setMediaHandle] = useState<FreshEmoteHandle | null>(null);

    // Manage fresh blob: URL lifecycle strictly per instanceId (always starts at frame 1,
    // and defers revocation slightly so React StrictMode & unmounting <img> never hit ERR_FILE_NOT_FOUND)
    useEffect(() => {
      if (!def || def.kind !== 'animated') {
        setMediaHandle(null);
        return;
      }
      const handle = createFreshEmoteObjectUrl(def.id);
      setMediaHandle(handle);
      return () => {
        window.setTimeout(() => {
          revokeEmoteObjectUrl(handle);
        }, 400);
      };
    }, [def, instance.instanceId]);

    // Smooth timed fade-out and cleanup
    useEffect(() => {
      if (!def) {
        onFinished(instance.instanceId);
        return;
      }
      setPhase('in');
      const exitAt = Math.max(800, def.durationMs - EMOTE_EXIT_MS);
      const exitTimer = window.setTimeout(() => {
        setPhase('out');
      }, exitAt);
      const doneTimer = window.setTimeout(() => {
        onFinished(instance.instanceId);
      }, def.durationMs);
      return () => {
        window.clearTimeout(exitTimer);
        window.clearTimeout(doneTimer);
      };
    }, [def, instance.instanceId, onFinished]);

    if (!def) return null;

    const isSurv = mode === 'survival';
    const isPlayer = instance.senderSide === 'player';
    const label = getEmoteLabel(def.id, language);

    const animClass =
      phase === 'out'
        ? 'emote-bubble-out'
        : isPlayer
          ? 'emote-bubble-in-player'
          : 'emote-bubble-in-opponent';

    const bubbleSurface = isSurv
      ? 'bg-stone-950/92 border-amber-400/55 text-stone-100 shadow-[0_12px_32px_rgba(0,0,0,0.65)]'
      : 'bg-[#fffdf8]/96 border-stone-800/80 text-stone-900 shadow-[0_12px_28px_rgba(24,20,16,0.24)]';

    const tailFill = isSurv ? 'bg-stone-950/92 border-amber-400/55' : 'bg-[#fffdf8]/96 border-stone-800/80';

    return (
      <div
        data-testid={`emote-bubble-${instance.senderSide}`}
        data-emote-id={instance.emoteId}
        className={`relative pointer-events-none select-none will-change-transform ${animClass}`}
      >
        <div
          className={`relative rounded-[22px] border-2 backdrop-blur-sm ${bubbleSurface} ${
            def.kind === 'animated'
              ? 'w-[126px] h-[126px] sm:w-[144px] sm:h-[144px] p-1.5 flex items-end justify-center overflow-hidden'
              : 'px-4 py-2.5 max-w-[230px] sm:max-w-[260px]'
          }`}
        >
          {def.kind === 'animated' && mediaHandle ? (
            <img
              src={mediaHandle.url}
              alt={label}
              width={132}
              height={132}
              decoding="async"
              draggable={false}
              className="w-full h-full object-contain object-bottom drop-shadow-[0_3px_8px_rgba(0,0,0,0.28)]"
            />
          ) : (
            <div className="flex flex-col items-center text-center">
              {instance.senderName && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                    isSurv ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  {instance.senderName}
                </span>
              )}
              <span className="text-sm sm:text-base font-extrabold leading-snug tracking-tight">
                {label}
              </span>
            </div>
          )}
        </div>

        {/* Comic speech bubble tail */}
        <span
          aria-hidden="true"
          className={`absolute w-3.5 h-3.5 rotate-45 ${tailFill} ${
            isPlayer
              ? '-bottom-[7px] left-6 border-r-2 border-b-2'
              : '-top-[7px] left-1/2 -translate-x-1/2 border-l-2 border-t-2'
          }`}
        />
      </div>
    );
  },
);
SingleEmoteBubble.displayName = 'SingleEmoteBubble';

interface EmoteBubbleOverlayProps {
  mode: GameMode;
  language: Language;
  playerEmote: ActiveEmoteInstance | null;
  opponentEmote: ActiveEmoteInstance | null;
  liftPlayerForMobileBanner?: boolean;
  onClearPlayerEmote: (instanceId: number) => void;
  onClearOpponentEmote: (instanceId: number) => void;
}

export const EmoteBubbleOverlay: React.FC<EmoteBubbleOverlayProps> = React.memo(
  ({
    mode,
    language,
    playerEmote,
    opponentEmote,
    liftPlayerForMobileBanner = false,
    onClearPlayerEmote,
    onClearOpponentEmote,
  }) => {
    return (
      <div
        aria-live="polite"
        className="fixed inset-0 z-[26] pointer-events-none overflow-hidden"
      >
        {/* Opponent Emote Bubble — near opponent's 3D avatar in the upper center */}
        {opponentEmote && (
          <div className="fixed top-[72px] sm:top-[84px] left-1/2 -translate-x-1/2 sm:translate-x-[36px] flex justify-center">
            <SingleEmoteBubble
              key={opponentEmote.instanceId}
              instance={opponentEmote}
              mode={mode}
              language={language}
              onFinished={onClearOpponentEmote}
            />
          </div>
        )}

        {/* Player Emote Bubble — near player's bottom-left emote button */}
        {playerEmote && (
          <div
            className={`fixed left-3 sm:left-5 ${
              liftPlayerForMobileBanner
                ? 'bottom-[146px] md:bottom-[82px]'
                : 'bottom-[74px] sm:bottom-[82px]'
            }`}
          >
            <SingleEmoteBubble
              key={playerEmote.instanceId}
              instance={playerEmote}
              mode={mode}
              language={language}
              onFinished={onClearPlayerEmote}
            />
          </div>
        )}
      </div>
    );
  },
);
EmoteBubbleOverlay.displayName = 'EmoteBubbleOverlay';
