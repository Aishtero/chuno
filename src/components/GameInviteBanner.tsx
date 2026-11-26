import React, { useEffect, useState } from 'react';
import { Check, Clock, ShieldAlert, Swords, X } from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import {
  GameInviteItem,
  INVITE_DURATION_MS,
  getInviteProgressRatio,
  getInviteRemainingSeconds,
} from '../core/socialClient';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

interface GameInviteBannerProps {
  invite: GameInviteItem;
  mode: GameMode;
  language: Language;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onExpiredLocal: (inviteId: string) => void;
}

export const GameInviteBanner: React.FC<GameInviteBannerProps> = ({
  invite,
  mode,
  language,
  onAccept,
  onDecline,
  onExpiredLocal,
}) => {
  const isSurv = mode === 'survival';
  const isRu = language === 'ru';
  const isUz = language === 'uz';
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    setBusy(false);
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= invite.expiresAt) {
        window.clearInterval(id);
        onExpiredLocal(invite.inviteId);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [invite.inviteId, invite.expiresAt, onExpiredLocal]);

  const secsLeft = getInviteRemainingSeconds(invite.expiresAt, now);
  const progressPct = Math.round(getInviteProgressRatio(invite.expiresAt, now, INVITE_DURATION_MS) * 100);

  const modeBadge =
    invite.mode === 'survival'
      ? isRu
        ? `Выживание · ${invite.startingHp} HP`
        : isUz
          ? `Omon qolish · ${invite.startingHp} HP`
          : `Survival · ${invite.startingHp} HP`
      : isRu
        ? 'Классический'
        : isUz
          ? 'Klassik'
          : 'Classic';

  const heading = isRu
    ? 'Вас приглашают играть'
    : isUz
      ? 'Sizni o‘yinga taklif qilishmoqda'
      : 'Game Invite';
  const acceptLabel = isRu ? 'Принять' : isUz ? 'Qabul qilish' : 'Accept';
  const declineLabel = isRu ? 'Отказать' : isUz ? 'Rad etish' : 'Decline';

  return (
    <div
      role="alertdialog"
      aria-label={heading}
      data-testid="game-invite-banner"
      data-invite-id={invite.inviteId}
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-24px)] max-w-md pointer-events-auto invite-banner-enter"
    >
      <div
        className={`rounded-2xl border-2 shadow-2xl overflow-hidden backdrop-blur-md ${
          isSurv
            ? 'bg-stone-950/96 border-amber-400/75 text-stone-100 shadow-black/80'
            : 'bg-white/97 border-amber-500/80 text-stone-900 shadow-stone-900/30'
        }`}
      >
        <div className="p-3.5 sm:p-4 flex items-center gap-3">
          <PlayerAvatarPortrait avatarId={invite.fromAvatarId} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                {heading}
              </span>
              <span
                data-testid="invite-countdown"
                className="inline-flex items-center gap-1 font-mono-num text-xs font-extrabold text-amber-500 shrink-0"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{secsLeft}s</span>
              </span>
            </div>
            <div className="text-sm sm:text-base font-extrabold truncate mt-0.5">
              {invite.fromNickname}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold opacity-85">
              {invite.mode === 'survival' ? (
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
              ) : (
                <Swords className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
              <span data-testid="invite-mode-badge">{modeBadge}</span>
            </div>
          </div>
        </div>

        <div className="px-3.5 sm:px-4 pb-3.5 flex items-center gap-2">
          <button
            type="button"
            data-testid="invite-accept-btn"
            disabled={busy}
            onClick={() => {
              soundManager.playClick();
              setBusy(true);
              onAccept(invite.inviteId);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{acceptLabel}</span>
          </button>
          <button
            type="button"
            data-testid="invite-decline-btn"
            disabled={busy}
            onClick={() => {
              soundManager.playClick();
              setBusy(true);
              onDecline(invite.inviteId);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
              isSurv
                ? 'border-stone-700 bg-stone-900 text-stone-200 hover:border-red-500/70 hover:text-red-400'
                : 'border-stone-300 bg-stone-100 text-stone-800 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <X className="w-4 h-4" />
            <span>{declineLabel}</span>
          </button>
        </div>

        {/* Smooth 20s countdown progress strip */}
        <div className={`h-1 w-full ${isSurv ? 'bg-stone-800' : 'bg-stone-200'}`}>
          <div
            className="h-full bg-amber-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
