import React, { useRef, useState } from 'react';
import { FileDown, FileUp, RefreshCw, X } from 'lucide-react';
import { CardType, DialogueAudioMode, GraphicsQuality } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';
import { PlayerProfile } from '../core/profileManager';

interface RulesModalProps {
  language: Language;
  profile: PlayerProfile;
  graphicsQuality: GraphicsQuality;
  showFps: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  dialogueAudioMode: DialogueAudioMode;
  isTauri?: boolean;
  onExportSave?: () => void;
  onImportSaveJson?: (rawJson: string) => { ok: boolean; error?: string };
  onCheckUpdates?: () => void;
  onChangeGraphicsQuality: (quality: GraphicsQuality) => void;
  onToggleShowFps: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onChangeSfxVolume: (volume: number) => void;
  onChangeVoiceVolume: (volume: number) => void;
  onChangeDialogueAudioMode: (mode: DialogueAudioMode) => void;
  onClose: () => void;
}

const CARD_ORDER: CardType[] = [
  'NUM_1',
  'NUM_2',
  'NUM_3',
  'NUM_4',
  'NUM_5',
  'SKIP',
  'REVERSE',
  'PLUS_2',
  'PLUS_4',
  'WILD',
  'BULLET',
];

const QUALITY_OPTIONS: GraphicsQuality[] = ['low', 'medium', 'high'];
const DIALOGUE_MODE_OPTIONS: DialogueAudioMode[] = ['tts', 'sfx', 'off'];

export const RulesModal: React.FC<RulesModalProps> = ({
  language,
  profile,
  graphicsQuality,
  showFps,
  musicVolume,
  sfxVolume,
  voiceVolume,
  dialogueAudioMode,
  isTauri,
  onExportSave,
  onImportSaveJson,
  onCheckUpdates,
  onChangeGraphicsQuality,
  onToggleShowFps,
  onChangeMusicVolume,
  onChangeSfxVolume,
  onChangeVoiceVolume,
  onChangeDialogueAudioMode,
  onClose,
}) => {
  const t = getTranslations(language);
  const isRu = language === 'ru';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const s = profile.stats;
  const totalWins = s.lightWins + s.survivalEasyWins + s.survivalMedWins + s.survivalHardWins;
  const totalLosses =
    s.lightLosses + s.survivalEasyLosses + s.survivalMedLosses + s.survivalHardLosses;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportSaveJson) return;
    try {
      const text = await file.text();
      const res = onImportSaveJson(text);
      if (res.ok) {
        setSaveNotice({
          ok: true,
          text: isRu ? 'Сохранение успешно импортировано!' : 'Save imported successfully!',
        });
      } else {
        setSaveNotice({
          ok: false,
          text: isRu
            ? `Ошибка импорта: ${res.error || 'неверный формат'}`
            : `Import failed: ${res.error || 'invalid file'}`,
        });
      }
    } catch {
      setSaveNotice({
        ok: false,
        text: isRu ? 'Не удалось прочитать файл' : 'Failed to read file',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-stone-800 bg-stone-950 text-stone-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="font-display text-2xl font-bold">{t.rulesTitle}</h2>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Profile Summary */}
          <div>
            <h3 className="text-sm font-bold text-amber-500 mb-3">{t.profileTitle}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-xs text-stone-400">{t.wins}</div>
                <div className="font-mono-num text-xl font-bold">{totalWins}</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-xs text-stone-400">{t.losses}</div>
                <div className="font-mono-num text-xl font-bold">{totalLosses}</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-xs text-stone-400">{t.bestStreak}</div>
                <div className="font-mono-num text-xl font-bold">{s.bestStreak}</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-xs text-stone-400">{t.coinsSurvived}</div>
                <div className="font-mono-num text-xl font-bold">{s.coinsSurvivedTotal}</div>
              </div>
            </div>
          </div>

          {/* Graphics & Audio Settings */}
          <div>
            <h3 className="text-sm font-bold text-amber-500 mb-3">{t.settingsTitle}</h3>
            <div className="p-3.5 rounded-lg bg-stone-900 border border-stone-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-stone-400">{t.graphicsQuality}</span>
                  <div className="inline-flex rounded-md border border-stone-700 overflow-hidden" role="group" aria-label={t.graphicsQuality}>
                    {QUALITY_OPTIONS.map((q) => {
                      const label =
                        q === 'low' ? t.qualityLow : q === 'medium' ? t.qualityMedium : t.qualityHigh;
                      const active = graphicsQuality === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          data-quality={q}
                          onClick={() => onChangeGraphicsQuality(q)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-amber-600 text-stone-950'
                              : 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-xs text-stone-300">{t.showFpsLabel}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showFps}
                    data-testid="toggle-fps"
                    onClick={onToggleShowFps}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      showFps
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-stone-950 border-stone-700 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {showFps ? (language === 'ru' ? 'ВКЛ' : 'ON') : (language === 'ru' ? 'ВЫКЛ' : 'OFF')}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-stone-400">{t.dialogueAudioLabel}</span>
                  <div className="inline-flex rounded-md border border-stone-700 overflow-hidden w-fit" role="group" aria-label={t.dialogueAudioLabel}>
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
                          data-dialogue-mode={dm}
                          onClick={() => onChangeDialogueAudioMode(dm)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-amber-600 text-stone-950'
                              : 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">{t.musicVolumeLabel}</span>
                      <span className="font-mono-num text-stone-300">{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label={t.musicVolumeLabel}
                      data-testid="music-volume-slider"
                      value={Math.round(musicVolume * 100)}
                      onChange={(e) => onChangeMusicVolume(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">{t.sfxVolumeLabel}</span>
                      <span className="font-mono-num text-stone-300">{Math.round(sfxVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label={t.sfxVolumeLabel}
                      data-testid="sfx-volume-slider"
                      value={Math.round(sfxVolume * 100)}
                      onChange={(e) => onChangeSfxVolume(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">{t.voiceVolumeLabel}</span>
                      <span className="font-mono-num text-stone-300">{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label={t.voiceVolumeLabel}
                      data-testid="voice-volume-slider"
                      value={Math.round(voiceVolume * 100)}
                      onChange={(e) => onChangeVoiceVolume(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Save Backup (Export / Import JSON) & Tauri Auto-Updater */}
                {(onExportSave || onImportSaveJson || (isTauri && onCheckUpdates)) && (
                  <div className="pt-3 border-t border-stone-800 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {onExportSave && (
                        <button
                          type="button"
                          data-testid="rules-export-save-btn"
                          onClick={() => {
                            onExportSave();
                            setSaveNotice({
                              ok: true,
                              text: isRu
                                ? 'Файл сохранения (.json) скачан'
                                : 'Save file (.json) exported',
                            });
                          }}
                          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-md border border-stone-700 bg-stone-950 text-xs font-semibold text-stone-200 hover:bg-stone-800 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {isRu ? 'Экспорт сохранения (.json)' : 'Export Save (.json)'}
                          </span>
                        </button>
                      )}
                      {onImportSaveJson && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => void handleFileSelect(e)}
                          />
                          <button
                            type="button"
                            data-testid="rules-import-save-btn"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-md border border-stone-700 bg-stone-950 text-xs font-semibold text-stone-200 hover:bg-stone-800 cursor-pointer"
                          >
                            <FileUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {isRu ? 'Импорт сохранения (.json)' : 'Import Save (.json)'}
                            </span>
                          </button>
                        </>
                      )}
                      {isTauri && onCheckUpdates && (
                        <button
                          type="button"
                          data-testid="rules-check-updates-btn"
                          onClick={onCheckUpdates}
                          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-md border border-amber-500/40 bg-stone-950 text-xs font-semibold text-amber-300 hover:bg-stone-800 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                          <span>{isRu ? 'Проверить обновления' : 'Check for Updates'}</span>
                        </button>
                      )}
                    </div>
                    {saveNotice && (
                      <div
                        className={`text-xs font-medium ${
                          saveNotice.ok ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {saveNotice.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Deck Reference */}
          <div>
            <h3 className="text-sm font-bold text-amber-500 mb-3">
              {language === 'ru' ? 'Колода ChUno (40 карт)' : 'ChUno Deck (40 Cards)'}
            </h3>
            <div className="divide-y divide-stone-800 border border-stone-800 rounded-lg overflow-hidden">
              {CARD_ORDER.map((c) => (
                <div key={c} className="flex items-baseline justify-between gap-4 px-4 py-2.5 bg-stone-900/50">
                  <span className="font-semibold text-sm text-stone-100 whitespace-nowrap shrink-0">
                    {t.cardNames[c]}
                  </span>
                  <span className="text-xs text-stone-400 text-right">{t.cardDescs[c]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
