import React, { useState } from 'react';
import { Check, Copy, Download, Globe, Lock, Smile, Users, X } from 'lucide-react';
import { copyTextToClipboard } from '../core/clipboard';
import { GameMode } from '../core/deck/cardData';
import { Language } from '../core/localization';
import { getDesktopDownloadPageUrl } from '../core/runtimePolicy';

interface DesktopOnlyModalProps {
  mode: GameMode;
  language: Language;
  inviteRoomCode?: string | null;
  onClose: () => void;
}

export const DesktopOnlyModal: React.FC<DesktopOnlyModalProps> = ({
  mode,
  language,
  inviteRoomCode,
  onClose,
}) => {
  const isSurv = mode === 'survival';
  const isRu = language === 'ru';
  const isUz = language === 'uz';
  const [copiedCode, setCopiedCode] = useState(false);

  const downloadUrl = getDesktopDownloadPageUrl(language);

  const copy = isRu
    ? {
        badge: 'Только на ПК',
        title: 'Онлайн 1 на 1 и Друзья — в приложении для ПК',
        subtitle:
          'В браузере доступны одиночные режимы «Кампания» и «Выживание». Полный сетевой функционал бесплатно доступен в нативном приложении ChUno для Windows и Linux.',
        f1Title: 'Живой мультиплеер 1 на 1',
        f1Desc: 'Классический режим и Выживание (3/2/1 HP), быстрый поиск, открытые и приватные комнаты.',
        f2Title: 'Френдлист с заявками',
        f2Desc: 'Добавляй друзей по коду CHUNO-XXXX-XXXX, принимай заявки и приглашай в один клик.',
        f3Title: 'Анимированные эмоции и 10 3D-обликов',
        f3Desc: 'Обменивайся эмоциями и быстрыми фразами за столом прямо во время партии.',
        inviteHeading: 'Код комнаты из ссылки-приглашения',
        inviteHint: 'Скопируй этот код и вставь его в разделе «Игра по сети» в приложении ChUno на ПК:',
        copyBtn: 'Скопировать код',
        copiedBtn: 'Скопировано!',
        downloadCta: 'Скачать ChUno для ПК',
        backBtn: 'Продолжить в браузере',
      }
    : isUz
      ? {
          badge: 'Faqat PK ilovasida',
          title: 'Onlayn 1 ga 1 va Do‘stlar — PK ilovasida mavjud',
          subtitle:
            'Brauzerda yakka «Kompaniya» va «Omon qolish» rejimlari ochiq. Onlayn multiplayer, do‘stlar so‘rovlari va jonli emotsiyalar Windows hamda Linux uchun ChUno ilovasida mutlaqo bepul.',
          f1Title: 'Jonli 1 ga 1 multiplayer',
          f1Desc: 'Klassika va Omon qolish (3/2/1 HP), tezkor qidiruv, ochiq va maxfiy xonalar.',
          f2Title: 'So‘rovlar bilan Do‘stlar ro‘yxati',
          f2Desc: 'CHUNO-XXXX-XXXX kodi orqali do‘st qo‘shing, so‘rovlarni qabul qiling va bir bosishda taklif eting.',
          f3Title: 'Animatsiyali emotsiyalar va 10 ta 3D qiyofa',
          f3Desc: 'Partiya davomida stolda jonli emotsiyalar va tezkor iboralar bilan almashing.',
          inviteHeading: 'Taklif havolasidagi xona kodi',
          inviteHint: 'Ushbu kodni nusxalab, kompyuterdagi ChUno ilovasining «Onlayn» bo‘limiga kiriting:',
          copyBtn: 'Kodni nusxalash',
          copiedBtn: 'Nusxalandi!',
          downloadCta: 'PK uchun ChUno ni yuklab olish',
          backBtn: 'Brauzerda davom etish',
        }
      : {
          badge: 'Desktop App Only',
          title: 'Online 1v1 & Friends Are Available on Desktop',
          subtitle:
            'Campaign and Survival solo modes are ready to play right here in your browser. Live 1v1 multiplayer, friend requests, and animated emotes are 100% free in the ChUno desktop app for Windows and Linux.',
          f1Title: 'Live 1v1 Online Multiplayer',
          f1Desc: 'Classic & Survival (3/2/1 HP), quick match, open rooms, and private room codes.',
          f2Title: 'Friends List & Live Requests',
          f2Desc: 'Add friends by CHUNO-XXXX-XXXX code, accept/decline requests, and invite in one click.',
          f3Title: 'Animated Emotes & 10 3D Avatars',
          f3Desc: 'Send smooth animated reactions and localized quick phrases across the 3D table.',
          inviteHeading: 'Invite Room Code Detected',
          inviteHint: 'Copy this room code and paste it inside the Online menu in the ChUno desktop app:',
          copyBtn: 'Copy Code',
          copiedBtn: 'Copied!',
          downloadCta: 'Download ChUno for PC',
          backBtn: 'Continue in Browser',
        };

  const panelClass = isSurv
    ? 'bg-stone-950 border-amber-500/35 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const boxClass = isSurv
    ? 'bg-stone-900/85 border-stone-800'
    : 'bg-stone-50 border-stone-200';
  const mutedText = isSurv ? 'text-stone-400' : 'text-stone-600';

  const handleCopyInvite = () => {
    if (!inviteRoomCode) return;
    void copyTextToClipboard(inviteRoomCode).then(() => {
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="desktop-only-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${panelClass}`}>
        <div className={`flex items-start justify-between gap-3 px-6 py-5 border-b ${isSurv ? 'border-stone-800' : 'border-stone-200'}`}>
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-2 ${
                isSurv
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{copy.badge}</span>
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="desktop-only-close"
            onClick={onClose}
            aria-label="Close"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              isSurv ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>{copy.subtitle}</p>

          {inviteRoomCode && (
            <div
              data-testid="desktop-only-invite-box"
              className={`p-3.5 rounded-xl border space-y-2 ${
                isSurv ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-50 border-amber-300'
              }`}
            >
              <div className="text-xs font-bold text-amber-500">{copy.inviteHeading}</div>
              <p className={`text-xs leading-snug ${mutedText}`}>{copy.inviteHint}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <code
                  data-testid="desktop-only-invite-code"
                  className={`font-mono-num text-base font-bold tracking-wider px-3 py-1.5 rounded-lg border ${
                    isSurv ? 'bg-stone-950 border-stone-700 text-amber-300' : 'bg-white border-amber-300 text-stone-900'
                  }`}
                >
                  {inviteRoomCode}
                </code>
                <button
                  type="button"
                  data-testid="desktop-only-copy-code"
                  onClick={handleCopyInvite}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : isSurv
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? copy.copiedBtn : copy.copyBtn}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { icon: Globe, title: copy.f1Title, desc: copy.f1Desc },
              { icon: Users, title: copy.f2Title, desc: copy.f2Desc },
              { icon: Smile, title: copy.f3Title, desc: copy.f3Desc },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`flex items-start gap-3 p-3 rounded-xl border ${boxClass}`}>
                <div className={`p-2 rounded-lg shrink-0 ${isSurv ? 'bg-amber-500/15 text-amber-400' : 'bg-stone-200/80 text-stone-800'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold">{title}</div>
                  <div className={`text-[11px] sm:text-xs leading-snug mt-0.5 ${mutedText}`}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="desktop-only-download-link"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors bg-amber-500 hover:bg-amber-400 text-stone-950"
            >
              <Download className="w-4 h-4" />
              <span>{copy.downloadCta}</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                isSurv
                  ? 'border-stone-700 text-stone-300 hover:bg-stone-900'
                  : 'border-stone-300 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {copy.backBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
