import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Clock, Eye, Flag, Handshake, Lock, Pause, Volume2, VolumeX } from 'lucide-react';
import { PieceColor, PieceType, PromotablePieceType } from '../core/chess/types';
import { CardType, GameMode } from '../core/deck/cardData';
import { Language, formatMatchTime, getTranslations } from '../core/localization';
import { CoinSide, MatchActor, MatchPhase } from '../core/match/matchEngine';

interface HeartRowProps {
  hp: number;
  maxHp: number;
  tone: 'player' | 'dealer';
  ariaLabel: string;
}

const HeartRow: React.FC<HeartRowProps> = React.memo(({ hp, maxHp, tone, ariaLabel }) => {
  const prevHpRef = useRef(hp);
  const [losingIdx, setLosingIdx] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevHpRef.current;
    prevHpRef.current = hp;
    if (hp < prev && hp >= 0 && hp < maxHp) {
      setLosingIdx(hp);
      const timer = window.setTimeout(() => setLosingIdx(null), 440);
      return () => window.clearTimeout(timer);
    }
    if (hp > prev) {
      setLosingIdx(null);
    }
  }, [hp, maxHp]);

  const activeFill = tone === 'player' ? 'text-emerald-400' : 'text-red-500';
  const activeStroke = tone === 'player' ? 'stroke-emerald-300' : 'stroke-red-300';
  const activeGlow =
    tone === 'player'
      ? 'drop-shadow-[0_0_5px_rgba(52,211,153,0.7)]'
      : 'drop-shadow-[0_0_5px_rgba(239,68,68,0.75)]';

  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel} data-hp-hearts={tone}>
      {Array.from({ length: maxHp }).map((_, i) => {
        const alive = i < hp;
        const isLosing = losingIdx === i;
        const isCritical = alive && hp === 1;

        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`w-4 h-4 transition-all duration-300 ${
              isLosing
                ? `heart-losing ${activeFill}`
                : alive
                  ? `${activeFill} ${activeGlow} ${isCritical ? 'heart-critical' : ''}`
                  : 'text-stone-600 opacity-[0.22]'
            }`}
            aria-hidden="true"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={alive || isLosing ? 'currentColor' : 'none'}
              className={alive || isLosing ? activeStroke : 'stroke-stone-500'}
              strokeWidth={alive || isLosing ? 1.2 : 1.9}
              strokeLinejoin="round"
            />
            {isLosing && (
              <path
                d="M12.5 5.5L10.5 10.5L13.5 13L11.2 18.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
});
HeartRow.displayName = 'HeartRow';

interface GameHudProps {
  mode: GameMode;
  language: Language;
  phase: MatchPhase;
  activeActor: MatchActor;
  playerColor: PieceColor;
  playerHp: number;
  opponentHp: number;
  maxHp: number;
  currentCard: CardType | null;
  movesLeft: number;
  resurrectsLeft: number;
  deckCount: number;
  isInCheck: boolean;
  isKingVsKing: boolean;
  drawOfferCooldownTurns: number;
  drawOfferLocked: boolean;
  elapsedSeconds: number;
  tacticalCam: boolean;
  muted: boolean;
  speechText: string | null;
  guestBadgeText?: string | null;
  wildSelectedSq: number | null;
  pendingPromoMove: { from: number; to: number } | null;
  resurrectOptions: { pieceId: number; type: PieceType; legalSquares: number[] }[];
  selectedResurrectId: number | null;
  onToggleCamera: () => void;
  onOpenAudioSettings: () => void;
  onOpenRules: () => void;
  onPause: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onPickWildTarget: (targetType: Exclude<PieceType, 'king'>) => void;
  onCancelWildPiece: () => void;
  onPickPromotion: (promo: PromotablePieceType) => void;
  onSelectResurrectPiece: (pieceId: number) => void;
  onPickCoinSide: (side: CoinSide) => void;
}

export const GameHud: React.FC<GameHudProps> = React.memo(({
  mode,
  language,
  phase,
  activeActor,
  playerColor,
  playerHp,
  opponentHp,
  maxHp,
  currentCard,
  movesLeft,
  resurrectsLeft,
  deckCount,
  isInCheck,
  isKingVsKing,
  drawOfferCooldownTurns,
  drawOfferLocked,
  elapsedSeconds,
  tacticalCam,
  muted,
  speechText,
  guestBadgeText,
  wildSelectedSq,
  pendingPromoMove,
  resurrectOptions,
  selectedResurrectId,
  onToggleCamera,
  onOpenAudioSettings,
  onOpenRules,
  onPause,
  onOfferDraw,
  onResign,
  onPickWildTarget,
  onCancelWildPiece,
  onPickPromotion,
  onSelectResurrectPiece,
  onPickCoinSide,
}) => {
  const t = getTranslations(language);
  const isSurv = mode === 'survival';
  const isPlayerTurn = activeActor === 'player';
  const [confirmingResign, setConfirmingResign] = useState(false);

  useEffect(() => {
    if (!confirmingResign) return;
    const id = window.setTimeout(() => setConfirmingResign(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmingResign]);

  const cardBg = isSurv
    ? 'bg-stone-950/90 border-stone-800 text-stone-100'
    : 'bg-white/92 border-stone-300 text-stone-900';

  const btnMuted = isSurv
    ? 'bg-stone-950/88 border-stone-800 text-stone-200 hover:bg-stone-900'
    : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-white';

  const drawLockedHint =
    language === 'ru'
      ? 'Дилер не торгуется на Medium/Hard'
      : "The Dealer doesn't bargain on Medium/Hard";
  const drawDisabled = phase === 'MATCH_OVER' || drawOfferLocked || drawOfferCooldownTurns > 0;
  const formattedTime = formatMatchTime(elapsedSeconds);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 md:p-6">
      {/* Top Row: Compact Turn & Card Readout | Opponent Speech | Utility Controls */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: Match State Placard */}
        <div className={`pointer-events-auto shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border min-w-0 sm:min-w-[248px] max-w-[66vw] sm:max-w-none ${cardBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 whitespace-nowrap">
              {isPlayerTurn ? t.yourTurn : t.opponentTurn}
            </span>
            {guestBadgeText && (
              <span
                data-testid="hud-guest-badge"
                className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono-num text-[10px] font-semibold whitespace-nowrap"
              >
                {guestBadgeText}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
              <span>{playerColor === 'white' ? t.playingAsWhite : t.playingAsBlack}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{t.deckRemaining} {deckCount}</span>
              <span aria-hidden="true">·</span>
              <span
                data-match-timer="true"
                className={`inline-flex items-center gap-1 font-mono-num font-semibold ${isSurv ? 'text-stone-200' : 'text-stone-800'}`}
                title={t.matchTime}
              >
                <Clock className="w-3 h-3 opacity-75" />
                {formattedTime}
              </span>
            </span>
          </div>

          {isPlayerTurn && phase === 'AWAIT_DRAW_CARD' && (
            <div className={`mt-1.5 text-xs font-medium ${isSurv ? 'text-amber-300/90' : 'text-emerald-700'}`}>
              {t.clickDeckPrompt}
            </div>
          )}

          {isSurv && (
            <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-stone-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-400">{t.playerHp}</span>
                <HeartRow
                  hp={playerHp}
                  maxHp={maxHp}
                  tone="player"
                  ariaLabel={`Player HP ${playerHp} of ${maxHp}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-400">{t.dealerHp}</span>
                <HeartRow
                  hp={opponentHp}
                  maxHp={maxHp}
                  tone="dealer"
                  ariaLabel={`Dealer HP ${opponentHp} of ${maxHp}`}
                />
              </div>
            </div>
          )}

          {currentCard && (
            <div
              className={`mt-2 pt-2 border-t ${
                isSurv ? 'border-stone-800' : 'border-stone-200'
              } flex items-baseline justify-between gap-3`}
            >
              <span className="font-display text-xl font-bold leading-none">
                {t.cardNames[currentCard]}
              </span>
              {movesLeft > 0 && (
                <span className="font-mono-num text-xs font-bold text-amber-500">
                  {t.movesLeft}: {movesLeft}
                </span>
              )}
              {resurrectsLeft > 0 && (
                <span className="font-mono-num text-xs font-bold text-emerald-500">
                  {t.resurrectLeft}: {resurrectsLeft}
                </span>
              )}
            </div>
          )}

          {isInCheck && (
            <div className="mt-2 px-2 py-1 rounded bg-red-700 text-white text-xs font-bold tracking-wider text-center">
              {t.checkWarning}
            </div>
          )}
        </div>

        {/* Top-Center: Opponent Speech Subtitle + King vs King Banner */}
        <div className="flex-1 min-w-0 flex flex-col items-center gap-2 px-1">
          {speechText && (
            <div
              className={`hidden md:block max-w-full lg:max-w-md px-3.5 py-2 rounded-lg border text-xs lg:text-sm font-medium text-center ${
                isSurv
                  ? 'bg-stone-950/90 border-red-900/60 text-stone-200'
                  : 'bg-white/92 border-stone-300 text-stone-800'
              }`}
            >
              <span className={`font-bold mr-1.5 ${isSurv ? 'text-red-400' : 'text-emerald-700'}`}>
                {isSurv ? t.dealerName : t.friendName}:
              </span>
              <span>“{speechText}”</span>
            </div>
          )}

          {isKingVsKing && phase !== 'MATCH_OVER' && (
            <div
              className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-lg border text-xs font-medium ${
                isSurv
                  ? 'bg-stone-950/92 border-amber-700/70 text-amber-200'
                  : 'bg-amber-50/95 border-amber-400 text-amber-950'
              }`}
            >
              <span>{t.kingVsKingBanner}</span>
              <button
                type="button"
                onClick={onOfferDraw}
                className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isSurv
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                {t.agreeToDraw}
              </button>
            </div>
          )}
        </div>

        {/* Top-Right: Compact Utility Actions + Offer Draw / Resign */}
        <div className="pointer-events-auto shrink-0 flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            tabIndex={-1}
            disabled={drawDisabled}
            onClick={(e) => {
              e.currentTarget.blur();
              onOfferDraw();
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              drawDisabled
                ? isSurv
                  ? 'bg-stone-950/60 border-stone-800/70 text-stone-600 cursor-not-allowed'
                  : 'bg-white/60 border-stone-300/70 text-stone-400 cursor-not-allowed'
                : `${btnMuted} cursor-pointer`
            }`}
            title={
              drawOfferLocked
                ? drawLockedHint
                : drawOfferCooldownTurns > 0
                  ? `${t.drawCooldownLabel} (${drawOfferCooldownTurns})`
                  : t.offerDraw
            }
            aria-label={
              drawOfferLocked
                ? drawLockedHint
                : drawOfferCooldownTurns > 0
                  ? `${t.drawCooldownLabel} (${drawOfferCooldownTurns})`
                  : t.offerDraw
            }
            data-draw-locked={drawOfferLocked ? 'true' : 'false'}
          >
            {drawOfferLocked ? (
              <Lock className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <Handshake className="w-3.5 h-3.5" />
            )}
            <span className={drawOfferCooldownTurns > 0 ? 'inline font-mono-num' : 'hidden xl:inline'}>
              {drawOfferLocked
                ? language === 'ru'
                  ? 'Без ничьей'
                  : 'No Draws'
                : drawOfferCooldownTurns > 0
                  ? `${t.drawCooldownLabel} (${drawOfferCooldownTurns})`
                  : t.offerDraw}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            disabled={phase === 'MATCH_OVER'}
            onClick={(e) => {
              e.currentTarget.blur();
              if (confirmingResign) {
                setConfirmingResign(false);
                onResign();
              } else {
                setConfirmingResign(true);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              confirmingResign
                ? 'bg-red-700 border-red-500 text-white hover:bg-red-600'
                : btnMuted
            }`}
            title={confirmingResign ? t.confirmResign : t.resign}
            aria-label={confirmingResign ? t.confirmResign : t.resign}
          >
            <Flag className="w-3.5 h-3.5" />
            <span className={confirmingResign ? 'inline' : 'hidden xl:inline'}>
              {confirmingResign ? t.confirmResign : t.resign}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${btnMuted}`}
          >
            <Eye className="w-4 h-4" />
            <span>{tacticalCam ? t.idleCam : t.tacticalCam}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-audio-settings"
            aria-label={t.audioSettingsTitle}
            title={t.audioSettingsTitle}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenAudioSettings();
            }}
            className={`p-2 rounded-md border transition-colors cursor-pointer ${btnMuted}`}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={t.rulesTitle}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenRules();
            }}
            className={`p-2 rounded-md border transition-colors cursor-pointer ${btnMuted}`}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={t.pause}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className={`p-2 rounded-md border transition-colors cursor-pointer ${btnMuted}`}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom-Center: Contextual Turn Interaction Dock (No Draw Card modal box over board) */}
      <div className="flex justify-center">
        {isPlayerTurn && phase === 'PLAYER_MOVE_LOOP' && !pendingPromoMove && (
          <div className={`px-4 py-2 rounded-md border text-xs font-medium ${cardBg}`}>
            {t.clickPieceHint}
          </div>
        )}

        {isPlayerTurn && pendingPromoMove && (
          <div className={`pointer-events-auto flex flex-col items-center gap-2 px-5 py-3 rounded-lg border ${cardBg}`}>
            <span className="text-xs font-semibold">{t.choosePromotion}</span>
            <div className="flex items-center gap-2">
              {(['queen', 'rook', 'bishop', 'knight'] as PromotablePieceType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => onPickPromotion(pt)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-md border transition-colors whitespace-nowrap ${
                    isSurv
                      ? 'bg-stone-900 border-amber-600 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                      : 'bg-stone-900 border-stone-900 text-white hover:bg-stone-700'
                  }`}
                >
                  {t.pieceNames[pt]}
                </button>
              ))}
            </div>
          </div>
        )}

        {isPlayerTurn && phase === 'AWAIT_WILD_ACTION' && (
          <div className={`pointer-events-auto flex flex-col items-center gap-2 px-5 py-3 rounded-lg border ${cardBg}`}>
            {wildSelectedSq === null ? (
              <span className="text-xs font-semibold">{t.chooseWildPiece}</span>
            ) : (
              <>
                <span className="text-xs font-semibold">{t.chooseWildTarget}</span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {(['queen', 'rook', 'bishop', 'knight', 'pawn'] as Exclude<PieceType, 'king'>[]).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => onPickWildTarget(pt)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors whitespace-nowrap ${
                        isSurv
                          ? 'bg-stone-900 border-amber-600 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                          : 'bg-stone-900 border-stone-900 text-white hover:bg-stone-700'
                      }`}
                    >
                      {t.pieceNames[pt]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onCancelWildPiece}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-stone-500/40 text-stone-400 hover:text-stone-200"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {isPlayerTurn && phase === 'AWAIT_RESURRECT_PLACEMENT' && (
          <div className={`pointer-events-auto flex flex-col items-center gap-2 px-5 py-3 rounded-lg border ${cardBg}`}>
            <span className="text-xs font-semibold">
              {selectedResurrectId === null ? t.chooseGravePiece : t.placeOnHalfHint}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {resurrectOptions.map((opt) => {
                const active = selectedResurrectId === opt.pieceId;
                return (
                  <button
                    key={opt.pieceId}
                    type="button"
                    onClick={() => onSelectResurrectPiece(opt.pieceId)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : isSurv
                          ? 'bg-stone-900 border-stone-700 text-stone-200 hover:border-emerald-500'
                          : 'bg-stone-100 border-stone-300 text-stone-900 hover:border-emerald-600'
                    }`}
                  >
                    {t.pieceNames[opt.type]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'AWAIT_COIN_CHOICE' && (
          <div className={`pointer-events-auto flex flex-col items-center gap-3 px-6 py-4 rounded-lg border ${cardBg}`}>
            <div className="text-sm font-bold text-red-500">{t.chooseCoinTitle}</div>
            {activeActor === 'opponent' ? (
              <>
                <p className="text-xs text-stone-300 text-center max-w-xs">{t.dealerFlippedHint}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onPickCoinSide('heads')}
                    className="px-5 py-2.5 text-sm font-bold rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 whitespace-nowrap"
                  >
                    ♛ {t.heads}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPickCoinSide('tails')}
                    className="px-5 py-2.5 text-sm font-bold rounded-md bg-red-700 hover:bg-red-600 text-white whitespace-nowrap"
                  >
                    ☠ {t.tails}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-stone-300 text-center max-w-xs">{t.playerFlippedHint}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
GameHud.displayName = 'GameHud';
