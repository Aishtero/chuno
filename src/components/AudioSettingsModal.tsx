import React from 'react';
import { Music, Volume2, VolumeX, X } from 'lucide-react';
import { DialogueAudioMode, GameMode } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';

interface AudioSettingsModalProps {
  mode: GameMode;
  language: Language;
  muted: boolean;
  menuMusicEnabled: boolean;
  gameMusicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  dialogueAudioMode: DialogueAudioMode;
  onToggleMute: () => void;
  onToggleMenuMusic: () => void;
  onToggleGameMusic: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onChangeSfxVolume: (volume: number) => void;
  onChangeVoiceVolume: (volume: number) => void;
  onChangeDialogueAudioMode: (mode: DialogueAudioMode) => void;
  onClose: () => void;
}

const DIALOGUE_MODE_OPTIONS: DialogueAudioMode[] = ['tts', 'sfx', 'off'];

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = React.memo(
  ({
    mode,
    language,
    muted,
    menuMusicEnabled,
    gameMusicEnabled,
    musicVolume,
    sfxVolume,
    voiceVolume,
    dialogueAudioMode,
    onToggleMute,
    onToggleMenuMusic,
    onToggleGameMusic,
    onChangeMusicVolume,
    onChangeSfxVolume,
    onChangeVoiceVolume,
    onChangeDialogueAudioMode,
    onClose,
  }) => {
    const t = getTranslations(language);
    const isSurv = mode === 'survival';
    const isRu = language === 'ru';

    const panelClass = isSurv
      ? 'bg-stone-950 border-stone-800 text-stone-100'
      : 'bg-white border-stone-300 text-stone-900';
    const boxClass = isSurv
      ? 'bg-stone-900/90 border-stone-800'
      : 'bg-stone-50 border-stone-200';
    const labelClass = isSurv ? 'text-stone-300' : 'text-stone-700';
    const mutedLabelClass = isSurv ? 'text-stone-400' : 'text-stone-600';

    const renderSwitch = (checked: boolean, onClick: () => void, testId: string) => (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={onClick}
        className={`px-3 py-1 text-[11px] font-bold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
          checked
            ? 'bg-emerald-600 border-emerald-500 text-white'
            : isSurv
              ? 'bg-stone-950 border-stone-700 text-stone-400 hover:text-stone-200'
              : 'bg-white border-stone-300 text-stone-600 hover:text-stone-900'
        }`}
      >
        {checked ? (isRu ? 'ВКЛ' : 'ON') : isRu ? 'ВЫКЛ' : 'OFF'}
      </button>
    );

    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
        data-testid="audio-settings-modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden ${panelClass}`}>
          {/* Header */}
          <div
            className={`flex items-center justify-between px-5 py-4 border-b ${
              isSurv ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {muted ? (
                <VolumeX className="w-5 h-5 text-red-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-500" />
              )}
              <h2 className="font-display text-2xl font-bold leading-none">{t.audioSettingsTitle}</h2>
            </div>
            <button
              type="button"
              aria-label={t.close}
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSurv
                  ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Mute All Toggle */}
            <button
              type="button"
              data-testid="audio-mute-all"
              onClick={onToggleMute}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                muted
                  ? 'bg-red-700 border-red-500 text-white hover:bg-red-600'
                  : isSurv
                    ? 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                    : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200'
              }`}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{muted ? t.unmuteAllLabel : t.muteAllLabel}</span>
            </button>

            {/* Menu Music & In-Game Music Switches */}
            <div className={`p-3.5 rounded-xl border space-y-3 ${boxClass}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold ${labelClass}`}>
                  <Music className="w-3.5 h-3.5 text-amber-500 opacity-85" />
                  {t.menuMusicLabel}
                </span>
                {renderSwitch(menuMusicEnabled, onToggleMenuMusic, 'toggle-menu-music')}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold ${labelClass}`}>
                  <Music className="w-3.5 h-3.5 text-emerald-500 opacity-85" />
                  {t.gameMusicLabel}
                </span>
                {renderSwitch(gameMusicEnabled, onToggleGameMusic, 'toggle-game-music')}
              </div>
            </div>

            {/* Volume Sliders */}
            <div className={`p-3.5 rounded-xl border space-y-3.5 ${boxClass}`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${mutedLabelClass}`}>{t.musicVolumeLabel}</span>
                  <span className="font-mono-num font-semibold">{Math.round(musicVolume * 100)}%</span>
                </div>
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
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${mutedLabelClass}`}>{t.sfxVolumeLabel}</span>
                  <span className="font-mono-num font-semibold">{Math.round(sfxVolume * 100)}%</span>
                </div>
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
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${mutedLabelClass}`}>{t.voiceVolumeLabel}</span>
                  <span className="font-mono-num font-semibold">{Math.round(voiceVolume * 100)}%</span>
                </div>
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
              </div>
            </div>

            {/* Dialogue / Voice Mode Selector */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${boxClass}`}>
              <div className={`text-xs font-medium ${mutedLabelClass}`}>{t.dialogueAudioLabel}</div>
              <div
                className={`grid grid-cols-3 rounded-lg border overflow-hidden ${
                  isSurv ? 'border-stone-700' : 'border-stone-300'
                }`}
                role="group"
                aria-label={t.dialogueAudioLabel}
              >
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
                      className={`px-2 py-2 text-[11px] font-semibold transition-colors text-center cursor-pointer ${
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
          </div>

          <div
            className={`px-5 py-3 border-t flex justify-end ${
              isSurv ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 text-xs font-bold rounded-md cursor-pointer ${
                isSurv
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    );
  },
);
AudioSettingsModal.displayName = 'AudioSettingsModal';
