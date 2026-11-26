import type { Language } from '../core/localization';

export type AnimatedEmoteId =
  | 'anger'
  | 'cry'
  | 'defeat'
  | 'laugh'
  | 'luck'
  | 'panic'
  | 'respect'
  | 'think'
  | 'unlucky'
  | 'yawn';

export type QuickPhraseId =
  | 'phrase_gl'
  | 'phrase_wp'
  | 'phrase_wow'
  | 'phrase_oops'
  | 'phrase_hurry'
  | 'phrase_gg';

export type EmoteId = AnimatedEmoteId | QuickPhraseId;

export type EmoteSfxType =
  | 'anger'
  | 'sigh'
  | 'laugh'
  | 'fanfare'
  | 'panic'
  | 'chime'
  | 'think'
  | 'phrase';

export type AvatarReactionType = 'nod' | 'shake' | 'tilt' | 'bounce' | 'bow';

export interface AnimatedEmoteDefinition {
  id: AnimatedEmoteId;
  kind: 'animated';
  src: string;
  durationMs: number;
  sfx: EmoteSfxType;
  avatarReaction: AvatarReactionType;
  labels: Record<Language, string>;
}

export interface QuickPhraseDefinition {
  id: QuickPhraseId;
  kind: 'phrase';
  durationMs: number;
  sfx: EmoteSfxType;
  avatarReaction: AvatarReactionType;
  labels: Record<Language, string>;
}

export type EmoteDefinition = AnimatedEmoteDefinition | QuickPhraseDefinition;

export const CLIENT_EMOTE_COOLDOWN_MS = 2_500;
export const EMOTE_ENTER_MS = 320;
export const EMOTE_EXIT_MS = 280;

export const ANIMATED_EMOTES: readonly AnimatedEmoteDefinition[] = [
  {
    id: 'laugh',
    kind: 'animated',
    src: './emotes/emote_04_laugh.webp',
    durationMs: 2500,
    sfx: 'laugh',
    avatarReaction: 'bounce',
    labels: { en: 'Haha!', ru: 'Смех', uz: 'Kulgi' },
  },
  {
    id: 'respect',
    kind: 'animated',
    src: './emotes/emote_07_respect.webp',
    durationMs: 2500,
    sfx: 'chime',
    avatarReaction: 'nod',
    labels: { en: 'Respect', ru: 'Уважение', uz: 'Hurmat' },
  },
  {
    id: 'luck',
    kind: 'animated',
    src: './emotes/emote_05_luck.webp',
    durationMs: 2600,
    sfx: 'fanfare',
    avatarReaction: 'bounce',
    labels: { en: 'Lucky!', ru: 'Удача!', uz: 'Omad!' },
  },
  {
    id: 'think',
    kind: 'animated',
    src: './emotes/emote_08_think.webp',
    durationMs: 2600,
    sfx: 'think',
    avatarReaction: 'tilt',
    labels: { en: 'Thinking...', ru: 'Думаю...', uz: 'O‘ylayapman...' },
  },
  {
    id: 'panic',
    kind: 'animated',
    src: './emotes/emote_06_panic.webp',
    durationMs: 2500,
    sfx: 'panic',
    avatarReaction: 'shake',
    labels: { en: 'Panic!', ru: 'Паника!', uz: 'Vahima!' },
  },
  {
    id: 'anger',
    kind: 'animated',
    src: './emotes/emote_01_anger.webp',
    durationMs: 2500,
    sfx: 'anger',
    avatarReaction: 'shake',
    labels: { en: 'Furious', ru: 'Злость', uz: 'Jahldor' },
  },
  {
    id: 'cry',
    kind: 'animated',
    src: './emotes/emote_02_cry.webp',
    durationMs: 2600,
    sfx: 'sigh',
    avatarReaction: 'bow',
    labels: { en: 'Crying', ru: 'Плач', uz: 'Yig‘i' },
  },
  {
    id: 'unlucky',
    kind: 'animated',
    src: './emotes/emote_09_unlucky.webp',
    durationMs: 2600,
    sfx: 'sigh',
    avatarReaction: 'shake',
    labels: { en: 'Unlucky', ru: 'Не повезло', uz: 'Omadsiz' },
  },
  {
    id: 'yawn',
    kind: 'animated',
    src: './emotes/emote_10_yawn.webp',
    durationMs: 2500,
    sfx: 'sigh',
    avatarReaction: 'tilt',
    labels: { en: 'Yawn', ru: 'Зевок', uz: 'Esnash' },
  },
  {
    id: 'defeat',
    kind: 'animated',
    src: './emotes/emote_03_defeat.webp',
    durationMs: 2600,
    sfx: 'sigh',
    avatarReaction: 'bow',
    labels: { en: 'Defeated', ru: 'Поражение', uz: 'Mag‘lubiyat' },
  },
] as const;

export const QUICK_PHRASES: readonly QuickPhraseDefinition[] = [
  {
    id: 'phrase_gl',
    kind: 'phrase',
    durationMs: 2400,
    sfx: 'phrase',
    avatarReaction: 'nod',
    labels: { en: 'Good luck!', ru: 'Удачи!', uz: 'Omad!' },
  },
  {
    id: 'phrase_wp',
    kind: 'phrase',
    durationMs: 2400,
    sfx: 'chime',
    avatarReaction: 'nod',
    labels: { en: 'Well played!', ru: 'Хорошо сыграно!', uz: 'Yaxshi o‘yin!' },
  },
  {
    id: 'phrase_wow',
    kind: 'phrase',
    durationMs: 2400,
    sfx: 'fanfare',
    avatarReaction: 'bounce',
    labels: { en: 'Wow!', ru: 'Ого!', uz: 'Vau!' },
  },
  {
    id: 'phrase_oops',
    kind: 'phrase',
    durationMs: 2400,
    sfx: 'sigh',
    avatarReaction: 'tilt',
    labels: { en: 'Oops...', ru: 'Ой...', uz: 'Voy...' },
  },
  {
    id: 'phrase_hurry',
    kind: 'phrase',
    durationMs: 2400,
    sfx: 'think',
    avatarReaction: 'tilt',
    labels: { en: 'Hurry up!', ru: 'Поторопись!', uz: 'Tezroq!' },
  },
  {
    id: 'phrase_gg',
    kind: 'phrase',
    durationMs: 2500,
    sfx: 'chime',
    avatarReaction: 'nod',
    labels: { en: 'Good game!', ru: 'Хорошая партия!', uz: 'Ajoyib partiya!' },
  },
] as const;

export const ALL_EMOTES: readonly EmoteDefinition[] = [...ANIMATED_EMOTES, ...QUICK_PHRASES];

const EMOTE_BY_ID: ReadonlyMap<string, EmoteDefinition> = new Map(
  ALL_EMOTES.map((item) => [item.id, item]),
);

export function isValidEmoteId(raw: unknown): raw is EmoteId {
  return typeof raw === 'string' && EMOTE_BY_ID.has(raw);
}

export function getEmoteDefinition(id: string): EmoteDefinition | null {
  return EMOTE_BY_ID.get(id) ?? null;
}

export function getEmoteLabel(id: string, language: Language): string {
  const def = EMOTE_BY_ID.get(id);
  if (!def) return '';
  return def.labels[language] ?? def.labels.en;
}

export function canSendEmote(
  lastSentAt: number,
  now: number,
  cooldownMs: number = CLIENT_EMOTE_COOLDOWN_MS,
): boolean {
  if (lastSentAt <= 0) return true;
  return now - lastSentAt >= cooldownMs;
}

/**
 * Returns remaining cooldown ratio in [0..1] (`0` = ready to send, `1` = just sent).
 */
export function getEmoteCooldownRatio(
  lastSentAt: number,
  now: number,
  cooldownMs: number = CLIENT_EMOTE_COOLDOWN_MS,
): number {
  if (lastSentAt <= 0 || cooldownMs <= 0) return 0;
  const elapsed = now - lastSentAt;
  if (elapsed >= cooldownMs) return 0;
  return Math.max(0, Math.min(1, 1 - elapsed / cooldownMs));
}

export function shouldShowIncomingEmote(
  senderSide: 'player' | 'opponent',
  opponentEmotesMuted: boolean,
): boolean {
  if (senderSide === 'opponent' && opponentEmotesMuted) {
    return false;
  }
  return true;
}

export interface EmoteUiCopy {
  buttonTitle: string;
  emotesTab: string;
  phrasesTab: string;
  muteOpponent: string;
  unmuteOpponent: string;
  mutedBadge: string;
  cooldownHint: string;
}

export function getEmoteUiCopy(language: Language): EmoteUiCopy {
  if (language === 'ru') {
    return {
      buttonTitle: 'Эмоции и быстрые фразы',
      emotesTab: 'Эмоции',
      phrasesTab: 'Фразы',
      muteOpponent: 'Заглушить эмоции соперника',
      unmuteOpponent: 'Включить эмоции соперника',
      mutedBadge: 'Заглушено',
      cooldownHint: 'Подождите секунду…',
    };
  }
  if (language === 'uz') {
    return {
      buttonTitle: 'Emotsiyalar va tezkor iboralar',
      emotesTab: 'Emotsiyalar',
      phrasesTab: 'Iboralar',
      muteOpponent: 'Raqib emotsiyalarini o‘chirish',
      unmuteOpponent: 'Raqib emotsiyalarini yoqish',
      mutedBadge: 'O‘chirilgan',
      cooldownHint: 'Bir soniya kuting…',
    };
  }
  return {
    buttonTitle: 'Emotes & Quick Phrases',
    emotesTab: 'Emotes',
    phrasesTab: 'Phrases',
    muteOpponent: 'Mute opponent emotes',
    unmuteOpponent: 'Unmute opponent emotes',
    mutedBadge: 'Muted',
    cooldownHint: 'Please wait a moment…',
  };
}
