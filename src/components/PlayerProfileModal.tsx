import React, { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles, User, X } from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { GameMode } from '../core/deck/cardData';
import { Language, getTranslations } from '../core/localization';
import {
  NICKNAME_MAX_LEN,
  PlayerProfile,
  validateNickname,
} from '../core/profileManager';
import {
  AvatarGender,
  AvatarId,
  getAvatarsByGender,
  getPlayerAvatar,
} from '../data/playerAvatars';
import { PlayerAvatarPortrait } from './PlayerAvatarPortrait';

interface PlayerProfileModalProps {
  profile: PlayerProfile;
  language: Language;
  mode: GameMode;
  onUpdateNickname: (nickname: string) => void;
  onSelectAvatar: (avatarId: AvatarId) => void;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  profile,
  language,
  mode,
  onUpdateNickname,
  onSelectAvatar,
  onClose,
}) => {
  const t = getTranslations(language);
  const isSurv = mode === 'survival';

  const [draftName, setDraftName] = useState(profile.nickname || profile.displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | AvatarGender>('all');

  useEffect(() => {
    setDraftName(profile.nickname || profile.displayName);
  }, [profile.nickname, profile.displayName]);

  const activeAvatar = useMemo(
    () => getPlayerAvatar(profile.avatarId),
    [profile.avatarId],
  );
  const visibleAvatars = useMemo(
    () => getAvatarsByGender(genderFilter),
    [genderFilter],
  );

  const handleSaveNickname = () => {
    const res = validateNickname(draftName);
    if (!res.valid) {
      setNameError(res.error === 'too_long' ? t.nicknameErrLong : t.nicknameErrShort);
      return;
    }
    setNameError(null);
    setDraftName(res.normalized);
    if (res.normalized !== (profile.nickname || profile.displayName)) {
      onUpdateNickname(res.normalized);
    }
    soundManager.playClick();
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1600);
  };

  const handlePickAvatar = (id: AvatarId) => {
    soundManager.playClick();
    onSelectAvatar(id);
  };

  const panelClass = isSurv
    ? 'bg-stone-950 border-stone-800 text-stone-100'
    : 'bg-white border-stone-300 text-stone-900';
  const subBoxClass = isSurv
    ? 'bg-stone-900/90 border-stone-800'
    : 'bg-stone-50 border-stone-200';
  const mutedText = isSurv ? 'text-stone-400' : 'text-stone-600';

  const filters: { key: 'all' | AvatarGender; label: string }[] = [
    { key: 'all', label: t.avatarFilterAll },
    { key: 'male', label: t.avatarFilterMale },
    { key: 'female', label: t.avatarFilterFemale },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      data-testid="player-profile-modal"
    >
      <div className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl ${panelClass}`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${
            isSurv ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              {t.profileModalTitle}
            </h2>
          </div>

          <button
            type="button"
            aria-label={t.close}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isSurv
                ? 'text-stone-400 hover:text-white hover:bg-stone-900'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Top Showcase + Nickname Editor */}
          <div className={`p-4 rounded-xl border ${subBoxClass} grid grid-cols-1 md:grid-cols-12 gap-4 items-center`}>
            {/* Large Avatar Preview */}
            <div className="md:col-span-5 flex items-center gap-4">
              <div className="relative shrink-0">
                <PlayerAvatarPortrait avatarId={activeAvatar.id} size={96} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                  {activeAvatar.gender === 'male'
                    ? t.avatarFilterMale.replace(/\s*\(\d+\)/, '')
                    : t.avatarFilterFemale.replace(/\s*\(\d+\)/, '')}
                </div>
                <div
                  className="font-display text-xl font-bold leading-tight truncate mt-0.5"
                  data-testid="selected-avatar-name"
                >
                  {activeAvatar.name[language]}
                </div>
                <div className={`text-xs mt-1 leading-snug ${mutedText}`}>
                  {activeAvatar.tagline[language]}
                </div>
                <div className={`mt-2 inline-flex items-center gap-1 text-[10px] ${mutedText}`}>
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="leading-tight">{t.avatar3dReadyHint}</span>
                </div>
              </div>
            </div>

            {/* Nickname Form */}
            <div className="md:col-span-7 space-y-2">
              <label
                htmlFor="chuno-nickname-input"
                className="block text-xs font-semibold uppercase tracking-wider opacity-80"
              >
                {t.nicknameLabel}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="chuno-nickname-input"
                  data-testid="profile-nickname-input"
                  type="text"
                  value={draftName}
                  maxLength={NICKNAME_MAX_LEN}
                  placeholder={t.nicknamePlaceholder}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNickname();
                  }}
                  className={`flex-1 min-w-0 px-3 py-2 text-sm font-semibold rounded-lg border outline-none transition-colors ${
                    isSurv
                      ? 'bg-stone-950 border-stone-700 focus:border-amber-500 text-stone-100'
                      : 'bg-white border-stone-300 focus:border-stone-900 text-stone-900'
                  }`}
                />
                <button
                  type="button"
                  data-testid="profile-nickname-save"
                  onClick={handleSaveNickname}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    savedFeedback
                      ? 'bg-emerald-600 text-white'
                      : isSurv
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  {savedFeedback ? <Check className="w-4 h-4" /> : null}
                  <span>{savedFeedback ? t.savedLabel : t.saveNickname}</span>
                </button>
              </div>
              {nameError ? (
                <p className="text-xs font-medium text-red-500" role="alert">
                  {nameError}
                </p>
              ) : (
                <p className={`text-[11px] ${mutedText}`}>{t.nicknameHint}</p>
              )}
            </div>
          </div>

          {/* Avatar Selector Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">
                {t.avatarSectionTitle}
              </h3>

              <div className="flex items-center gap-1.5" role="group" aria-label="Avatar gender filter">
                {filters.map((f) => {
                  const active = genderFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      data-avatar-filter={f.key}
                      onClick={() => {
                        soundManager.playClick();
                        setGenderFilter(f.key);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? isSurv
                            ? 'bg-amber-600 border-amber-500 text-stone-950'
                            : 'bg-stone-900 border-stone-900 text-white'
                          : isSurv
                            ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                            : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {visibleAvatars.map((av) => {
                const selected = av.id === activeAvatar.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    data-avatar-option={av.id}
                    aria-pressed={selected}
                    onClick={() => handlePickAvatar(av.id)}
                    className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                      selected
                        ? isSurv
                          ? 'border-amber-500 bg-amber-500/15 shadow-sm'
                          : 'border-[#2d4e3b] bg-[#2d4e3b]/10 shadow-sm'
                        : isSurv
                          ? 'border-stone-800 bg-stone-900/60 hover:border-stone-700 hover:bg-stone-900'
                          : 'border-stone-200 bg-stone-50/70 hover:border-stone-400 hover:bg-white'
                    }`}
                  >
                    {selected && (
                      <span
                        className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${
                          isSurv ? 'bg-amber-500 text-stone-950' : 'bg-[#2d4e3b] text-white'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <PlayerAvatarPortrait avatarId={av.id} size={58} />
                    <span className="mt-2 text-xs font-bold leading-tight truncate w-full">
                      {av.name[language]}
                    </span>
                    <span className={`mt-0.5 text-[10px] leading-tight line-clamp-2 ${mutedText}`}>
                      {av.tagline[language]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
