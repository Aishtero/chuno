import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Download, RefreshCw, Sparkles, X } from 'lucide-react';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import { APP_VERSION, PlayerProfile } from '../core/profileManager';
import { AvailableAppUpdate, installDesktopUpdateAndRelaunch } from '../core/updaterService';
import { getChunoDownloadUrl } from '../core/webGuestGate';

interface UpdaterModalProps {
  mode: GameMode;
  language: Language;
  profile: PlayerProfile;
  checking: boolean;
  update: AvailableAppUpdate | null;
  checkError: string | null;
  onRecheck: () => void;
  onClose: () => void;
}

export const UpdaterModal: React.FC<UpdaterModalProps> = ({
  mode,
  language,
  profile,
  checking,
  update,
  checkError,
  onRecheck,
  onClose,
}) => {
  const isRu = language === 'ru';
  const isSurv = mode === 'survival';
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [installError, setInstallError] = useState<string | null>(null);

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const boxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800'
    : 'bg-stone-50 border-stone-200';

  const handleInstall = async () => {
    if (!update || installing) return;
    setInstalling(true);
    setInstallError(null);
    setProgress(5);
    const res = await installDesktopUpdateAndRelaunch(update, profile, (pct) => {
      setProgress(pct);
    });
    if (!res.ok) {
      setInstalling(false);
      setInstallError(res.error);
    }
  };

  const downloadUrl = getChunoDownloadUrl(language);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      data-testid="updater-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !installing) onClose();
      }}
    >
      <div className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl border shadow-2xl ${panelClass}`}>
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-2xl font-bold leading-none">
              {isRu ? 'Обновление ChUno' : 'ChUno Update'}
            </h2>
          </div>
          {!installing && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isRu ? 'Закрыть' : 'Close'}
              className="p-1.5 rounded-md text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {checking ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
              <p className="text-sm font-medium">
                {isRu ? 'Проверка наличия новой версии...' : 'Checking for updates...'}
              </p>
            </div>
          ) : update ? (
            <>
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${boxClass}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-75">
                    {isRu ? 'Доступна новая версия' : 'New version available'}
                  </span>
                  <span className="font-mono-num font-bold text-amber-500">
                    v{APP_VERSION} → v{update.version}
                  </span>
                </div>
                {update.body && (
                  <p className="text-xs leading-relaxed opacity-85 whitespace-pre-line pt-1.5 border-t border-stone-700/40 max-h-40 overflow-y-auto">
                    {update.body}
                  </p>
                )}
              </div>

              {installing && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>
                      {isRu
                        ? 'Сохранение профиля и загрузка обновления...'
                        : 'Saving profile & downloading update...'}
                    </span>
                    <span className="font-mono-num font-bold text-amber-500">{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                    />
                  </div>
                </div>
              )}

              {installError && (
                <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2.5 text-xs">
                  <p className="font-medium text-amber-300">
                    {isRu
                      ? 'Автоустановка недоступна для этого типа пакета (например, Linux .deb без прав root). Скачайте свежий установщик напрямую:'
                      : 'Automatic in-place install is not available for this package format (e.g., Linux .deb without root). Download the new installer directly:'}
                  </p>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isRu ? 'Скачать новую версию' : 'Download New Version'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={installing}
                  onClick={() => void handleInstall()}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    installing
                      ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isRu ? 'Обновить и перезапустить' : 'Update & Restart'}
                  </span>
                </button>
                {!installing && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      isSurv
                        ? 'border-stone-700 text-stone-300 hover:bg-stone-900'
                        : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {isRu ? 'Позже' : 'Later'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${boxClass}`}>
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold">
                    {isRu
                      ? `Установлена актуальная версия (v${APP_VERSION})`
                      : `You are on the latest version (v${APP_VERSION})`}
                  </div>
                  {checkError && (
                    <div className="opacity-70">
                      {isRu
                        ? 'Сервер обновлений сейчас недоступен или нет сети.'
                        : 'Update server is currently unreachable or offline.'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onRecheck}
                  className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                    isSurv
                      ? 'border-stone-700 text-stone-300 hover:bg-stone-900'
                      : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isRu ? 'Проверить снова' : 'Check Again'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
                >
                  {isRu ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
