import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Clock, Copy, Eye, Flag, Handshake, HelpCircle, Loader2, Lock, Music, Pause, SkipForward, UserPlus, Volume2, VolumeX, WifiOff, X } from 'lucide-react';
import { MusicTrackPreference, getMusicTrackLabel } from '../audio/musicManager';
import { copyTextToClipboard } from '../core/clipboard';
import { PieceColor, PieceType, PromotablePieceType } from '../core/chess/types';
import { CardType, GameMode } from '../core/deck/cardData';
import { Language, formatMatchTime, getTranslations } from '../core/localization';
import { CoinSide, MatchActor, MatchPhase } from '../core/match/matchEngine';
import {
  OnlineConnectionStatus,
  formatThinkTimeMs,
  getReconnectRemainingSeconds,
} from '../core/onlineClient';
import { OpponentRelationStatus } from '../core/socialClient';
import { AvatarId } from '../data/playerAvatars';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

export function resolveHudOpponentHpLabel(
  onlineOpponentNickname: string | null | undefined,
  fallbackDealerLabel: string,
): string {
  const clean = typeof onlineOpponentNickname === 'string' ? onlineOpponentNickname.trim() : '';
  return clean.length > 0 ? clean : fallbackDealerLabel;
}

export interface OnlineHudInfo {
  roomCode: string;
  connectionStatus: OnlineConnectionStatus;
  opponentNickname: string;
  opponentAvatarId: string;
  opponentFriendCode?: string | null;
  opponentRelation?: OpponentRelationStatus;
  onSendOpponentFriendRequest?: () => void;
  onAcceptOpponentFriendRequest?: () => void;
  yourThinkTimeMs: number;
  opponentThinkTimeMs: number;
  activeSide: 'player' | 'opponent';
  turnStartedAt: number | null;
  serverClockOffsetMs: number;
  timerPaused: boolean;
  opponentDisconnected: boolean;
  opponentReconnectDeadline: number | null;
  opponentReconnectedNotice?: string | null;
  canClaimDisconnectWin: boolean;
  drawOfferFromOpponent: boolean;
  onAcceptDraw: () => void;
  onClaimDisconnectWin: () => void;
}

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
  musicTrackPreference?: MusicTrackPreference;
  speechText: string | null;
  playerNickname?: string;
  playerAvatarId?: AvatarId;
  onlineHud?: OnlineHudInfo | null;
  isTauri?: boolean;
  hasUpdateAvailable?: boolean;
  guestBadgeText?: string | null;
  firstMatchHint?: string | null;
  wildSelectedSq: number | null;
  pendingPromoMove: { from: number; to: number } | null;
  resurrectOptions: { pieceId: number; type: PieceType; legalSquares: number[] }[];
  selectedResurrectId: number | null;
  onToggleCamera: () => void;
  onCycleMusicTrack?: () => void;
  onOpenAudioSettings: () => void;
  onOpenGuide: () => void;
  onOpenRules: () => void;
  onDismissFirstMatchHint?: () => void;
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
  musicTrackPreference = 'auto',
  speechText,
  playerNickname,
  playerAvatarId,
  onlineHud,
  isTauri,
  hasUpdateAvailable,
  guestBadgeText,
  firstMatchHint,
  wildSelectedSq,
  pendingPromoMove,
  resurrectOptions,
  selectedResurrectId,
  onToggleCamera,
  onCycleMusicTrack,
  onOpenAudioSettings,
  onOpenGuide,
  onOpenRules,
  onDismissFirstMatchHint,
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
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [tickNow, setTickNow] = useState(() => Date.now());

  useEffect(() => {
    const shouldTickTurn =
      Boolean(onlineHud && !onlineHud.timerPaused && onlineHud.turnStartedAt !== null && phase !== 'MATCH_OVER');
    const shouldTickReconnect = Boolean(
      onlineHud && onlineHud.opponentDisconnected && phase !== 'MATCH_OVER',
    );
    if (!shouldTickTurn && !shouldTickReconnect) {
      return;
    }
    setTickNow(Date.now());
    const id = window.setInterval(() => setTickNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [onlineHud, phase]);

  const reconnectRemainingSec = onlineHud?.opponentDisconnected
    ? getReconnectRemainingSeconds(
        onlineHud.opponentReconnectDeadline,
        onlineHud.serverClockOffsetMs,
        tickNow,
      )
    : 0;

  const handleCopyHudRoomCode = () => {
    if (!onlineHud?.roomCode) return;
    void copyTextToClipboard(onlineHud.roomCode).then(() => {
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1800);
    });
  };

  const liveElapsedTurnMs =
    onlineHud && !onlineHud.timerPaused && onlineHud.turnStartedAt !== null && phase !== 'MATCH_OVER'
      ? Math.max(0, tickNow + onlineHud.serverClockOffsetMs - onlineHud.turnStartedAt)
      : 0;
  const yourLiveThinkMs = onlineHud
    ? onlineHud.yourThinkTimeMs + (onlineHud.activeSide === 'player' ? liveElapsedTurnMs : 0)
    : 0;
  const oppLiveThinkMs = onlineHud
    ? onlineHud.opponentThinkTimeMs + (onlineHud.activeSide === 'opponent' ? liveElapsedTurnMs : 0)
    : 0;

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
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: Match State Placard */}
        <div className={`pointer-events-auto shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border min-w-0 sm:min-w-[248px] max-w-full sm:max-w-none ${cardBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 min-w-0">
              {playerAvatarId && (
                <PlayerAvatarPortrait avatarId={playerAvatarId} size={20} />
              )}
              {playerNickname && (
                <span
                  data-testid="hud-player-nickname"
                  className={`text-xs font-bold truncate max-w-[96px] ${isSurv ? 'text-stone-100' : 'text-stone-900'}`}
                >
                  {playerNickname}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 whitespace-nowrap">
                {isPlayerTurn
                  ? t.yourTurn
                  : onlineHud
                    ? `${t.opponentTurn} (${onlineHud.opponentNickname})`
                    : t.opponentTurn}
              </span>
            </div>
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

          {onlineHud && (
            <div
              data-testid="online-think-timers"
              className={`mt-2 pt-2 border-t ${isSurv ? 'border-stone-800' : 'border-stone-200'} grid grid-cols-2 gap-2 text-xs`}
            >
              <div
                className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border transition-colors ${
                  onlineHud.activeSide === 'player' && !onlineHud.timerPaused
                    ? 'border-amber-500/70 bg-amber-500/15'
                    : isSurv
                      ? 'border-stone-800 bg-stone-900/60'
                      : 'border-stone-200 bg-stone-50'
                }`}
              >
                <span className="truncate font-semibold max-w-[74px]">{playerNickname || 'You'}</span>
                <span
                  data-testid="hud-your-think-time"
                  className="font-mono-num font-bold text-amber-500 shrink-0"
                >
                  {formatThinkTimeMs(yourLiveThinkMs)}
                </span>
              </div>
              <div
                className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border transition-colors ${
                  onlineHud.activeSide === 'opponent' && !onlineHud.timerPaused
                    ? 'border-amber-500/70 bg-amber-500/15'
                    : isSurv
                      ? 'border-stone-800 bg-stone-900/60'
                      : 'border-stone-200 bg-stone-50'
                }`}
              >
                <div className="inline-flex items-center gap-1 min-w-0">
                  <PlayerAvatarPortrait avatarId={onlineHud.opponentAvatarId} size={16} />
                  <span className="truncate font-semibold max-w-[60px]">{onlineHud.opponentNickname}</span>
                  {onlineHud.opponentFriendCode && (
                    onlineHud.opponentRelation === 'friend' ? (
                      <span
                        data-testid="hud-friend-badge"
                        title={t.addedFriendBadge}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    ) : onlineHud.opponentRelation === 'incoming' &&
                      onlineHud.onAcceptOpponentFriendRequest ? (
                      <button
                        type="button"
                        data-testid="hud-accept-friend"
                        title={language === 'ru' ? 'Принять заявку' : language === 'uz' ? 'Qabul qilish' : 'Accept Request'}
                        aria-label={language === 'ru' ? 'Принять заявку' : language === 'uz' ? 'Qabul qilish' : 'Accept Request'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onlineHud.onAcceptOpponentFriendRequest?.();
                        }}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    ) : onlineHud.opponentRelation === 'outgoing' ? (
                      <span
                        data-testid="hud-friend-pending"
                        title={language === 'ru' ? 'Заявка отправлена' : language === 'uz' ? 'So‘rov yuborildi' : 'Request Sent'}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 shrink-0"
                      >
                        <Clock className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      onlineHud.onSendOpponentFriendRequest && (
                        <button
                          type="button"
                          data-testid="hud-add-friend"
                          title={t.addFriendBtn}
                          aria-label={t.addFriendBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onlineHud.onSendOpponentFriendRequest?.();
                          }}
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-full border transition-colors shrink-0 cursor-pointer ${
                            isSurv
                              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-stone-950'
                              : 'border-emerald-600/50 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          <UserPlus className="w-2.5 h-2.5" />
                        </button>
                      )
                    )
                  )}
                </div>
                <span
                  data-testid="hud-opp-think-time"
                  className="font-mono-num font-bold text-amber-500 shrink-0"
                >
                  {formatThinkTimeMs(oppLiveThinkMs)}
                </span>
              </div>
            </div>
          )}

          {onlineHud?.connectionStatus === 'reconnecting' && phase !== 'MATCH_OVER' && (
            <div
              data-testid="self-reconnecting-banner"
              className="mt-2 px-2.5 py-1.5 rounded border border-amber-500/50 bg-amber-500/15 text-[11px] font-semibold flex items-center gap-2 text-amber-300"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{t.onlineReconnectingOverlay}</span>
            </div>
          )}

          {onlineHud?.opponentDisconnected && phase !== 'MATCH_OVER' && (
            <div
              data-testid="opponent-disconnect-banner"
              className={`mt-2 px-2.5 py-2 rounded border text-[11px] space-y-1.5 ${
                isSurv
                  ? 'border-amber-500/50 bg-amber-500/12 text-amber-200'
                  : 'border-amber-500/60 bg-amber-50 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {t.onlineOpponentDisconnectedBanner} (
                    <span data-testid="opponent-disconnect-countdown" className="font-mono-num font-bold">
                      {reconnectRemainingSec}
                      {language === 'ru' ? 'с' : 's'}
                    </span>
                    )
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5">
                  <span className="opacity-75">{t.onlineRoomCodeLabel}:</span>
                  <span
                    data-testid="hud-reconnect-room-code"
                    className="font-mono-num font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20"
                  >
                    {onlineHud.roomCode}
                  </span>
                  <button
                    type="button"
                    data-testid="hud-copy-room-code"
                    onClick={handleCopyHudRoomCode}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold border transition-colors cursor-pointer ${
                      copiedRoomCode
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : isSurv
                          ? 'border-amber-500/50 bg-stone-900 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                          : 'border-amber-500/60 bg-white text-amber-950 hover:bg-amber-100'
                    }`}
                  >
                    {copiedRoomCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRoomCode ? t.onlineCodeCopied : t.onlineCopyCode}</span>
                  </button>
                </div>
                {onlineHud.canClaimDisconnectWin && (
                  <button
                    type="button"
                    onClick={onlineHud.onClaimDisconnectWin}
                    className="px-2 py-0.5 rounded bg-amber-600 text-stone-950 font-bold whitespace-nowrap cursor-pointer"
                  >
                    {t.onlineClaimDisconnectWin}
                  </button>
                )}
              </div>
            </div>
          )}

          {onlineHud?.opponentReconnectedNotice && !onlineHud.opponentDisconnected && phase !== 'MATCH_OVER' && (
            <div
              data-testid="opponent-reconnected-toast"
              className="mt-2 px-2.5 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/15 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{onlineHud.opponentReconnectedNotice}</span>
            </div>
          )}

          {onlineHud?.drawOfferFromOpponent && phase !== 'MATCH_OVER' && (
            <div className="mt-2 px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[11px] flex items-center justify-between gap-2">
              <span>{t.agreeToDraw}?</span>
              <button
                type="button"
                onClick={onlineHud.onAcceptDraw}
                className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold whitespace-nowrap cursor-pointer"
              >
                {t.agreeToDraw}
              </button>
            </div>
          )}

          {isSurv && (
            <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-stone-800 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-stone-400 truncate max-w-[88px]">
                  {onlineHud ? (playerNickname || t.playerHp) : t.playerHp}
                </span>
                <HeartRow
                  hp={playerHp}
                  maxHp={maxHp}
                  tone="player"
                  ariaLabel={`Player HP ${playerHp} of ${maxHp}`}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  data-testid="hud-opponent-hp-label"
                  className="text-stone-400 truncate max-w-[96px]"
                >
                  {resolveHudOpponentHpLabel(onlineHud?.opponentNickname, t.dealerHp)}
                </span>
                <HeartRow
                  hp={opponentHp}
                  maxHp={maxHp}
                  tone="dealer"
                  ariaLabel={`${resolveHudOpponentHpLabel(onlineHud?.opponentNickname, 'Dealer')} HP ${opponentHp} of ${maxHp}`}
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
                {onlineHud ? onlineHud.opponentNickname : isSurv ? t.dealerName : t.friendName}:
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
        <div className="pointer-events-auto min-w-0 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
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

          {onCycleMusicTrack && (
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-music-next-btn"
              data-music-track={musicTrackPreference}
              aria-label={`${getMusicTrackLabel(musicTrackPreference, language)} — ${
                language === 'ru' ? 'Следующий трек' : language === 'uz' ? 'Keyingi trek' : 'Next track'
              }`}
              title={`${getMusicTrackLabel(musicTrackPreference, language)} (${
                language === 'ru' ? 'клик — следующий трек' : language === 'uz' ? 'keyingi trek' : 'click for next track'
              })`}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleMusicTrack();
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${btnMuted}`}
            >
              <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden lg:inline max-w-[116px] truncate">
                {getMusicTrackLabel(musicTrackPreference, language)}
              </span>
              <SkipForward className="w-3 h-3 opacity-75 shrink-0" />
            </button>
          )}

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
            className={`relative p-2 rounded-md border transition-colors cursor-pointer ${btnMuted}`}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            {isTauri && hasUpdateAvailable && (
              <span
                data-testid="hud-update-dot"
                className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                aria-hidden="true"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-how-to-play"
            aria-label={t.howToPlayBtn}
            title={t.howToPlayBtn}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGuide();
            }}
            className={`p-2 rounded-md border transition-colors cursor-pointer ${btnMuted}`}
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
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

      {/* Bottom-Center: Contextual Turn Interaction Dock + First-Match Floating Hint */}
      <div className="flex flex-col items-center gap-2 pb-12 md:pb-0">
        {firstMatchHint && !pendingPromoMove && (
          <div
            data-testid="first-match-hint-pill"
            className={`pointer-events-auto inline-flex items-center gap-2.5 max-w-[92vw] px-3.5 py-2 rounded-full border shadow-lg text-xs font-semibold ${
              isSurv
                ? 'bg-stone-950/94 border-amber-500/55 text-amber-200'
                : 'bg-stone-950/92 border-amber-500/60 text-amber-100'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="leading-snug">{firstMatchHint}</span>
            {onDismissFirstMatchHint && (
              <button
                type="button"
                data-testid="dismiss-first-match-hint"
                aria-label={t.close}
                onClick={onDismissFirstMatchHint}
                className="p-0.5 rounded-full text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {isPlayerTurn && phase === 'PLAYER_MOVE_LOOP' && !pendingPromoMove && !firstMatchHint && (
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
                <p className="text-xs text-stone-300 text-center max-w-xs">
                  {onlineHud
                    ? language === 'ru'
                      ? `${onlineHud.opponentNickname} вытянул Пулю! Выберите сторону монеты.`
                      : language === 'uz'
                        ? `${onlineHud.opponentNickname} O‘q kartasini tortdi! Tanga tomonini tanlang.`
                        : `${onlineHud.opponentNickname} drew the Bullet! Call the coin flip.`
                    : t.dealerFlippedHint}
                </p>
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
