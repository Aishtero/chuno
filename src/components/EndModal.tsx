import React, { useEffect, useState } from 'react';
import { Check, Crown, Lock, UserPlus } from 'lucide-react';
import { MatchScoreBreakdown } from '../core/achievements';
import { DialogueAudioMode, GameMode, GraphicsQuality } from '../core/deck/cardData';
import { Language, formatMatchTime, getTranslations } from '../core/localization';
import { MatchActor, MatchEndReason, MatchStats } from '../core/match/matchEngine';
import {
  OnlineMatchEndSummary,
  SeatRole,
  formatThinkTimeMs,
} from '../core/onlineClient';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

interface EndModalProps {
  kind: 'paused' | 'gameover';
  mode: GameMode;
  language: Language;
  winner: MatchActor | 'draw' | null;
  endReason: MatchEndReason | null;
  stats: MatchStats;
  elapsedSeconds: number;
  drawOfferCooldownTurns: number;
  drawOfferLocked: boolean;
  scoreBreakdown?: MatchScoreBreakdown | null;
  onlineSummary?: OnlineMatchEndSummary | null;
  onlineYourSeat?: SeatRole;
  onlineOpponentIsFriend?: boolean;
  onAddOnlineFriend?: (friendCode: string, nickname: string, avatarId: string) => void;
  onlineRematchRequestedByMe?: boolean;
  onlineRematchRequestedByOpp?: boolean;
  onRequestRematch?: () => void;
  endQuote: string | null;
  graphicsQuality: GraphicsQuality;
  showFps: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  dialogueAudioMode: DialogueAudioMode;
  onChangeGraphicsQuality: (quality: GraphicsQuality) => void;
  onToggleShowFps: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onChangeSfxVolume: (volume: number) => void;
  onChangeVoiceVolume: (volume: number) => void;
  onChangeDialogueAudioMode: (mode: DialogueAudioMode) => void;
  onOpenAudioSettings: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

const QUALITY_OPTIONS: GraphicsQuality[] = ['low', 'medium', 'high'];
const DIALOGUE_MODE_OPTIONS: DialogueAudioMode[] = ['tts', 'sfx', 'off'];

export const EndModal: React.FC<EndModalProps> = ({
  kind,
  mode,
  language,
  winner,
  endReason,
  stats,
  elapsedSeconds,
  drawOfferCooldownTurns,
  drawOfferLocked,
  scoreBreakdown,
  onlineSummary,
  onlineYourSeat,
  onlineOpponentIsFriend,
  onAddOnlineFriend,
  onlineRematchRequestedByMe,
  onlineRematchRequestedByOpp,
  onRequestRematch,
  endQuote,
  graphicsQuality,
  showFps,
  musicVolume,
  sfxVolume,
  voiceVolume,
  dialogueAudioMode,
  onChangeGraphicsQuality,
  onToggleShowFps,
  onChangeMusicVolume,
  onChangeSfxVolume,
  onChangeVoiceVolume,
  onChangeDialogueAudioMode,
  onOpenAudioSettings,
  onOfferDraw,
  onResign,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  const t = getTranslations(language);
  const isSurv = mode === 'survival';
  const [confirmingResign, setConfirmingResign] = useState(false);

  useEffect(() => {
    if (!confirmingResign) return;
    const id = window.setTimeout(() => setConfirmingResign(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmingResign]);

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';

  const statBoxClass = isSurv
    ? 'bg-stone-900 border-stone-800'
    : 'bg-stone-50 border-stone-200';

  if (kind === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
        <div className={`w-full max-w-sm rounded-xl border p-6 ${panelClass}`}>
          <h2 className="font-display text-3xl font-bold mb-4 text-center">{t.pausedTitle}</h2>

          <div className={`mb-4 p-3 rounded-lg border space-y-2.5 ${statBoxClass}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.graphicsQuality}
              </span>
              <div className={`inline-flex rounded-md border overflow-hidden ${isSurv ? 'border-stone-700' : 'border-stone-300'}`}>
                {QUALITY_OPTIONS.map((q) => {
                  const label =
                    q === 'low' ? t.qualityLow : q === 'medium' ? t.qualityMedium : t.qualityHigh;
                  const active = graphicsQuality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onChangeGraphicsQuality(q)}
                      className={`px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? isSurv
                            ? 'bg-amber-600 text-stone-950'
                            : 'bg-stone-900 text-white'
                          : isSurv
                            ? 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                            : 'bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.dialogueAudioLabel}
              </span>
              <div className={`inline-flex rounded-md border overflow-hidden ${isSurv ? 'border-stone-700' : 'border-stone-300'}`}>
                {DIALOGUE_MODE_OPTIONS.map((dm) => {
                  const label =
                    dm === 'tts'
                      ? t.dialogueModeTts
                      : dm === 'sfx'
                        ? t.dialogueModeSfx
                        : t.dialogueModeOff;
                  const active = dialogueAudioMode === dm;
                  return (
                    <button
                      key={dm}
                      type="button"
                      onClick={() => onChangeDialogueAudioMode(dm)}
                      className={`px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? isSurv
                            ? 'bg-amber-600 text-stone-950'
                            : 'bg-stone-900 text-white'
                          : isSurv
                            ? 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                            : 'bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-medium whitespace-nowrap ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.musicVolumeLabel}
              </span>
              <div className="flex items-center gap-2 flex-1 max-w-[155px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  aria-label={t.musicVolumeLabel}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => onChangeMusicVolume(Number(e.target.value) / 100)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="font-mono-num text-[11px] w-8 text-right opacity-80">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-medium whitespace-nowrap ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.sfxVolumeLabel}
              </span>
              <div className="flex items-center gap-2 flex-1 max-w-[155px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  aria-label={t.sfxVolumeLabel}
                  value={Math.round(sfxVolume * 100)}
                  onChange={(e) => onChangeSfxVolume(Number(e.target.value) / 100)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="font-mono-num text-[11px] w-8 text-right opacity-80">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-medium whitespace-nowrap ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.voiceVolumeLabel}
              </span>
              <div className="flex items-center gap-2 flex-1 max-w-[155px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  aria-label={t.voiceVolumeLabel}
                  value={Math.round(voiceVolume * 100)}
                  onChange={(e) => onChangeVoiceVolume(Number(e.target.value) / 100)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="font-mono-num text-[11px] w-8 text-right opacity-80">
                  {Math.round(voiceVolume * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
                {t.showFpsLabel}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showFps}
                onClick={onToggleShowFps}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  showFps
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : isSurv
                      ? 'bg-stone-950 border-stone-700 text-stone-400 hover:text-stone-200'
                      : 'bg-white border-stone-300 text-stone-600 hover:text-stone-900'
                }`}
              >
                {showFps ? (language === 'ru' ? 'ВКЛ' : 'ON') : (language === 'ru' ? 'ВЫКЛ' : 'OFF')}
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenAudioSettings}
              className={`w-full py-1.5 px-3 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                isSurv
                  ? 'bg-stone-950 border-stone-700 text-amber-300 hover:bg-stone-800'
                  : 'bg-white border-stone-300 text-stone-800 hover:bg-stone-100'
              }`}
            >
              {t.audioSettingsTitle}
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className={`w-full py-2.5 px-4 text-sm font-bold rounded-md whitespace-nowrap cursor-pointer ${
                isSurv
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {t.resume}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={drawOfferLocked || drawOfferCooldownTurns > 0}
                title={
                  drawOfferLocked
                    ? language === 'ru'
                      ? 'Дилер не торгуется на Medium/Hard'
                      : "The Dealer doesn't bargain on Medium/Hard"
                    : t.offerDraw
                }
                onClick={() => {
                  onOfferDraw();
                }}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md border whitespace-nowrap transition-colors ${
                  drawOfferLocked || drawOfferCooldownTurns > 0
                    ? isSurv
                      ? 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'
                      : 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
                    : isSurv
                      ? 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer'
                      : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200 cursor-pointer'
                }`}
              >
                {drawOfferLocked && <Lock className="w-3 h-3 opacity-70" />}
                <span>
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
                onClick={() => {
                  if (confirmingResign) {
                    setConfirmingResign(false);
                    onResign();
                  } else {
                    setConfirmingResign(true);
                  }
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md border whitespace-nowrap transition-colors cursor-pointer ${
                  confirmingResign
                    ? 'bg-red-700 border-red-500 text-white hover:bg-red-600'
                    : isSurv
                      ? 'bg-stone-900 border-red-900/60 text-red-300 hover:bg-red-950/60'
                      : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
              >
                {confirmingResign ? t.confirmResign : t.resign}
              </button>
            </div>

            <button
              type="button"
              onClick={onRestart}
              className={`w-full py-2.5 px-4 text-sm font-semibold rounded-md border whitespace-nowrap cursor-pointer ${
                isSurv
                  ? 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                  : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200'
              }`}
            >
              {t.restart}
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className={`w-full py-2.5 px-4 text-sm font-semibold rounded-md border whitespace-nowrap cursor-pointer ${
                isSurv
                  ? 'border-stone-800 text-stone-400 hover:text-stone-200'
                  : 'border-stone-300 text-stone-600 hover:text-stone-900'
              }`}
            >
              {t.mainMenu}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title =
    winner === 'player' ? t.victory : winner === 'opponent' ? t.defeat : t.drawResult;
  const reasonLabel =
    endReason === 'checkmate'
      ? t.reasonCheckmate
      : endReason === 'revolver_hp_zero'
        ? t.reasonRevolver
        : endReason === 'insufficient_material'
          ? t.reasonInsufficient
          : endReason === 'repetition'
            ? t.reasonRepetition
            : endReason === 'fifty_move'
              ? t.reasonFiftyMove
              : endReason === 'draw_agreed'
                ? t.reasonDrawAgreed
                : endReason === 'resignation'
                  ? t.reasonResignation
                  : t.reasonStalemate;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className={`w-full max-w-md rounded-xl border p-6 md:p-7 ${panelClass}`}>
        <div className="text-center mb-5">
          <h2
            className={`font-display text-4xl font-bold mb-1 ${
              winner === 'player'
                ? 'text-emerald-500'
                : winner === 'opponent'
                  ? 'text-red-500'
                  : 'text-amber-500'
            }`}
          >
            {title}
          </h2>
          <p className={`text-xs font-medium ${isSurv ? 'text-stone-400' : 'text-stone-600'}`}>
            {reasonLabel}
          </p>
        </div>

        {endQuote && (
          <blockquote
            className={`mb-5 px-4 py-3 rounded-lg border text-sm italic text-center ${statBoxClass}`}
          >
            “{endQuote}”
          </blockquote>
        )}

        {onlineSummary ? (
          <div className="space-y-3 mb-6" data-testid="online-end-summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([onlineSummary.players.host, onlineSummary.players.guest] as const).map((p) => {
                const isWinner = onlineSummary.winner === p.seat;
                const isMe = onlineYourSeat === p.seat;
                return (
                  <div
                    key={p.seat}
                    data-end-player={p.seat}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isWinner
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : statBoxClass
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatarPortrait avatarId={p.avatarId} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold truncate">{p.nickname}</span>
                          {isWinner && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className={`text-[10px] font-semibold ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
                          {isMe ? 'YOU' : p.seat.toUpperCase()}
                          {isWinner ? ` · ${t.victory}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-500/20 text-xs">
                      <div>
                        <div className={`text-[10px] ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
                          {t.onlineThinkTimeLabel}
                        </div>
                        <div className="font-mono-num text-base font-bold text-amber-500" data-testid={`end-think-${p.seat}`}>
                          {formatThinkTimeMs(p.thinkTimeMs)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-[10px] ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
                          {t.onlineAvgTurnLabel}
                        </div>
                        <div className="font-mono-num text-sm font-semibold">
                          {formatThinkTimeMs(p.avgTurnMs)} ({p.turnsCount})
                        </div>
                      </div>
                    </div>
                    {!isMe && p.friendCode && (
                      <div className="pt-1.5 border-t border-stone-500/20">
                        {onlineOpponentIsFriend ? (
                          <span
                            data-testid="end-friend-badge"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                          >
                            <Check className="w-3 h-3" />
                            <span>{t.addedFriendBadge}</span>
                          </span>
                        ) : (
                          onAddOnlineFriend && (
                            <button
                              type="button"
                              data-testid="end-add-friend"
                              onClick={() => onAddOnlineFriend(p.friendCode!, p.nickname, p.avatarId)}
                              className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                                isSurv
                                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-600 hover:text-stone-950'
                                  : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-900 hover:text-white'
                              }`}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>{t.addFriendBtn}</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {onlineRematchRequestedByOpp && !onlineRematchRequestedByMe && (
              <div className="text-center text-xs font-semibold text-emerald-400">
                {t.onlineRematchRequested}
              </div>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className={`p-3 rounded-lg border ${statBoxClass}`}>
            <div className={`text-xs ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
              {t.matchTime}
            </div>
            <div className="font-mono-num text-xl font-bold mt-0.5">
              {formatMatchTime(elapsedSeconds)}
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${statBoxClass}`}>
            <div className={`text-xs ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
              {t.turnsPlayed}
            </div>
            <div className="font-mono-num text-xl font-bold mt-0.5">{stats.turnsPlayed}</div>
          </div>
          <div className={`p-3 rounded-lg border ${statBoxClass}`}>
            <div className={`text-xs ${isSurv ? 'text-stone-400' : 'text-stone-500'}`}>
              {t.movesMade}
            </div>
            <div className="font-mono-num text-xl font-bold mt-0.5">{stats.movesMade}</div>
          </div>
          {isSurv && (
            <div className="col-span-3 grid grid-cols-2 gap-2.5">
              <div className={`p-3 rounded-lg border ${statBoxClass}`}>
                <div className="text-xs text-stone-400">{t.coinsSurvived}</div>
                <div className="font-mono-num text-xl font-bold mt-0.5">{stats.coinsSurvived}</div>
              </div>
              <div className={`p-3 rounded-lg border ${statBoxClass}`}>
                <div className="text-xs text-stone-400">{t.shotsFired}</div>
                <div className="font-mono-num text-xl font-bold mt-0.5">{stats.shotsFired}</div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Score Breakdown & Style Bonuses */}
        {scoreBreakdown && scoreBreakdown.totalAwarded > 0 && (
          <div className={`mb-5 p-3.5 rounded-lg border space-y-1.5 text-xs ${statBoxClass}`}>
            <div className="flex items-center justify-between font-bold text-amber-500">
              <span>{language === 'ru' ? 'Начислено очков' : 'Score Awarded'}</span>
              <span className="font-mono-num text-sm">+{scoreBreakdown.totalAwarded}</span>
            </div>
            {scoreBreakdown.baseWinPoints > 0 && (
              <div className="flex items-center justify-between opacity-85">
                <span>
                  {language === 'ru' ? 'Победа' : 'Victory'}
                  {scoreBreakdown.streakMultiplier > 1 ? ` (×${scoreBreakdown.streakMultiplier})` : ''}
                </span>
                <span className="font-mono-num">+{scoreBreakdown.multipliedBase}</span>
              </div>
            )}
            {scoreBreakdown.styleBonuses.map((bonus) => (
              <div key={bonus.key} className="flex items-center justify-between text-emerald-400">
                <span>{bonus.label[language === 'ru' ? 'ru' : 'en']}</span>
                <span className="font-mono-num">+{bonus.points}</span>
              </div>
            ))}
            {scoreBreakdown.achievementPoints > 0 && (
              <div className="flex items-center justify-between text-amber-300">
                <span>{language === 'ru' ? 'Новые достижения' : 'Achievements Unlocked'}</span>
                <span className="font-mono-num">+{scoreBreakdown.achievementPoints}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-start="true"
            data-testid={onlineSummary ? 'online-rematch-btn' : 'solo-restart-btn'}
            disabled={Boolean(onlineSummary && onlineRematchRequestedByMe)}
            onClick={onlineSummary && onRequestRematch ? onRequestRematch : onRestart}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-md whitespace-nowrap cursor-pointer ${
              onlineSummary && onlineRematchRequestedByMe
                ? 'bg-stone-700 text-stone-300 cursor-not-allowed'
                : isSurv
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {onlineSummary
              ? onlineRematchRequestedByMe
                ? t.onlineRematchWaiting
                : t.onlineRematch
              : t.playAgain}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md border whitespace-nowrap ${
              isSurv
                ? 'border-stone-700 text-stone-200 hover:bg-stone-900'
                : 'border-stone-300 text-stone-800 hover:bg-stone-100'
            }`}
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
};
