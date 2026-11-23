export type CardType =
  | 'NUM_1'
  | 'NUM_2'
  | 'NUM_3'
  | 'NUM_4'
  | 'NUM_5'
  | 'SKIP'
  | 'REVERSE'
  | 'PLUS_2'
  | 'PLUS_4'
  | 'WILD'
  | 'BULLET';

export type GameMode = 'light' | 'survival';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type LightPersonality = 'enthusiast' | 'egoist' | 'calm' | 'unknown';
export type LightPreviewAvatar = LightPersonality;
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type DialogueAudioMode = 'tts' | 'sfx' | 'off';

export const LIGHT_PERSONALITIES: readonly LightPersonality[] = [
  'enthusiast',
  'egoist',
  'calm',
  'unknown',
];

export interface DeckPreset {
  counts: Record<CardType, number>;
}

export const DECK_PRESETS: Record<'light' | 'survival_easy_med' | 'survival_hard', DeckPreset> = {
  light: {
    counts: {
      NUM_1: 8,
      NUM_2: 8,
      NUM_3: 6,
      NUM_4: 4,
      NUM_5: 2,
      SKIP: 3,
      REVERSE: 3,
      PLUS_2: 3,
      PLUS_4: 1,
      WILD: 2,
      BULLET: 0,
    },
  },
  survival_easy_med: {
    counts: {
      NUM_1: 8,
      NUM_2: 8,
      NUM_3: 6,
      NUM_4: 4,
      NUM_5: 2,
      SKIP: 3,
      REVERSE: 2,
      PLUS_2: 2,
      PLUS_4: 1,
      WILD: 2,
      BULLET: 2,
    },
  },
  survival_hard: {
    counts: {
      NUM_1: 9,
      NUM_2: 9,
      NUM_3: 6,
      NUM_4: 4,
      NUM_5: 2,
      SKIP: 3,
      REVERSE: 0,
      PLUS_2: 2,
      PLUS_4: 1,
      WILD: 2,
      BULLET: 2,
    },
  },
};

export function cardMoveCount(card: CardType): number {
  switch (card) {
    case 'NUM_1':
      return 1;
    case 'NUM_2':
      return 2;
    case 'NUM_3':
      return 3;
    case 'NUM_4':
      return 4;
    case 'NUM_5':
      return 5;
    default:
      return 0;
  }
}
