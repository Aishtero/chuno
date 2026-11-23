import React from 'react';
import { ArrowUpRight, Download, FileDown, ShieldCheck, Sparkles } from 'lucide-react';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import {
  WebGuestGateStatus,
  getChunoDownloadUrl,
} from '../core/webGuestGate';

interface WebGuestModalProps {
  mode: GameMode;
  language: Language;
  guestStatus: WebGuestGateStatus;
  onContinueGuest?: () => void;
  onExportSave: () => void;
}

export const WebGuestModal: React.FC<WebGuestModalProps> = ({
  mode,
  language,
  guestStatus,
  onContinueGuest,
  onExportSave,
}) => {
  const isRu = language === 'ru';
  const isSurv = mode === 'survival';
  const isLocked = guestStatus.isLocked || guestStatus.promptKind === 'locked';
  const isAfterSecond = !isLocked && guestStatus.promptKind === 'after_second';
  const downloadUrl = getChunoDownloadUrl(language);

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const boxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800 text-stone-300'
    : 'bg-stone-50 border-stone-200 text-stone-700';

  const title = isLocked
    ? isRu
      ? `Гостевой лимит исчерпан (${guestStatus.matchesPlayed}/${guestStatus.maxMatches})`
      : `Guest Limit Reached (${guestStatus.matchesPlayed}/${guestStatus.maxMatches})`
    : isAfterSecond
      ? isRu
        ? `Осталась 1 гостевая партия (${guestStatus.matchesPlayed}/${guestStatus.maxMatches})`
        : `1 Guest Match Left (${guestStatus.matchesPlayed}/${guestStatus.maxMatches})`
      : isRu
        ? 'Скачайте полную версию ChUno на ПК'
        : 'Get the Full ChUno Desktop Experience';

  const description = isLocked
    ? isRu
      ? `Вы сыграли все ${guestStatus.maxMatches} гостевые партии в браузерной версии ChUno v${guestStatus.appVersion}. Полная десктопная версия для Windows и Linux бесплатна, работает оффлайн без ограничений и надёжно сохраняет все 32 достижения и рекорды на диске. Следующий гостевой доступ в браузере откроется после выхода нового обновления.`
      : `You have played all ${guestStatus.maxMatches} guest matches in the ChUno v${guestStatus.appVersion} browser version. The full desktop app for Windows and Linux is free, runs offline without limits, and permanently saves all 32 achievements and career stats on disk. Browser guest access will reset with the next release update.`
    : isRu
      ? `В браузере доступен гостевой демо-режим (${guestStatus.matchesPlayed} из ${guestStatus.maxMatches} партий в версии v${guestStatus.appVersion}). Скачайте нативный установщик ChUno для Windows или Linux — без лимитов, с оффлайн-режимом и неубиваемыми сохранениями.`
      : `The browser edition runs in Guest Mode (${guestStatus.matchesPlayed} of ${guestStatus.maxMatches} matches used in v${guestStatus.appVersion}). Download the native ChUno desktop installer for Windows or Linux for unlimited offline play and permanent disk-backed saves.`;

  const continueLabel = isAfterSecond
    ? isRu
      ? 'Последняя гостевая партия (осталась 1)'
      : 'Play final guest match (1 left)'
    : isRu
      ? `Попробовать дальше (осталось ${guestStatus.remainingMatches} партии)`
      : `Keep trying (${guestStatus.remainingMatches} matches left)`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      data-testid="web-guest-modal"
      data-guest-locked={isLocked ? 'true' : 'false'}
    >
      <div className={`w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-xl border p-6 shadow-2xl ${panelClass}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-500 font-mono-num text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {isRu
              ? `Гость · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches} партий · v${guestStatus.appVersion}`
              : `Guest · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches} matches · v${guestStatus.appVersion}`}
          </span>
        </div>

        <h2 className="font-display text-3xl font-bold leading-tight mb-2.5">{title}</h2>
        <p className="text-xs sm:text-sm leading-relaxed opacity-85 mb-4">{description}</p>

        <div className={`p-3.5 rounded-xl border text-xs space-y-2 mb-5 ${boxClass}`}>
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isRu
                ? 'Безлимитные партии оффлайн + автосохранение прогресса на диск'
                : 'Unlimited offline matches + atomic disk-backed save protection'}
            </span>
          </div>
          <div className="opacity-80 pl-6">
            {isRu
              ? 'Вы можете экспортировать своё текущее сохранение (.json) и импортировать его в установленной игре.'
              : 'You can export your current save (.json) and import it directly inside the installed desktop game.'}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="web-guest-download-cta"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>
              {isRu ? 'Скачать ChUno (Windows / Linux)' : 'Download ChUno (Windows / Linux)'}
            </span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </a>

          {!isLocked && onContinueGuest && (
            <button
              type="button"
              data-testid="web-guest-continue-btn"
              onClick={onContinueGuest}
              className={`w-full py-2.5 px-4 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isSurv
                  ? 'border-stone-700 text-stone-200 hover:bg-stone-900'
                  : 'border-stone-300 text-stone-800 hover:bg-stone-100'
              }`}
            >
              {continueLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onExportSave}
            className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium opacity-75 hover:opacity-100 transition-opacity cursor-pointer ${
              isSurv ? 'text-stone-300' : 'text-stone-600'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>
              {isRu ? 'Экспорт сохранения (.json)' : 'Export Save (.json)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
