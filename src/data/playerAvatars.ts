import type { Language } from '../core/localization';

export type AvatarGender = 'male' | 'female';

export type AvatarId =
  | 'strategist'
  | 'wanderer'
  | 'gentleman'
  | 'rookie'
  | 'veteran'
  | 'adventurer'
  | 'grandmaster'
  | 'night_lady'
  | 'artist'
  | 'tactician';

export type AvatarHairStyle =
  | 'neat_part'
  | 'hood_tucked'
  | 'swept_back'
  | 'messy_short'
  | 'silver_trim'
  | 'ponytail_band'
  | 'high_bun'
  | 'sleek_bob'
  | 'long_waves'
  | 'high_ponytail';

export type AvatarHeadwear = 'none' | 'hood' | 'fedora' | 'beret' | 'headband';
export type AvatarEyewear = 'none' | 'glasses' | 'thin_glasses';
export type AvatarCollarStyle = 'crisp' | 'scarf' | 'coat' | 'hoodie' | 'high' | 'cloak';
export type AvatarFacialHair = 'none' | 'beard';

export interface PlayerAvatar3DConfig {
  skinColor: string;
  hairColor: string;
  coatColor: string;
  shirtColor: string;
  accentColor: string;
  hairStyle: AvatarHairStyle;
  headwear: AvatarHeadwear;
  eyewear: AvatarEyewear;
  collarStyle: AvatarCollarStyle;
  facialHair: AvatarFacialHair;
  shoulderScale: number;
}

export interface PlayerAvatarPalette {
  bgFrom: string;
  bgTo: string;
  ring: string;
  accent: string;
  skin: string;
  skinShadow: string;
  hair: string;
  outfit: string;
  outfitTrim: string;
  eye: string;
}

export interface PlayerAvatarDefinition {
  id: AvatarId;
  gender: AvatarGender;
  name: Record<Language, string>;
  tagline: Record<Language, string>;
  palette: PlayerAvatarPalette;
  threeConfig: PlayerAvatar3DConfig;
}

export const DEFAULT_AVATAR_ID: AvatarId = 'strategist';

export const PLAYER_AVATARS: readonly PlayerAvatarDefinition[] = [
  // ── Male (6) ──────────────────────────────────────────────────────────────
  {
    id: 'strategist',
    gender: 'male',
    name: { en: 'Strategist', ru: 'Стратег', uz: 'Strateg' },
    tagline: {
      en: 'Glasses & crisp collar',
      ru: 'Очки и строгий воротник',
      uz: 'Ko‘zoynak va rasmiy yoqa',
    },
    palette: {
      bgFrom: '#1f332c',
      bgTo: '#0f1b18',
      ring: '#5fb88c',
      accent: '#d8b25c',
      skin: '#e8c4a6',
      skinShadow: '#cfa07d',
      hair: '#2a221d',
      outfit: '#263832',
      outfitTrim: '#ece5d6',
      eye: '#1c2420',
    },
    threeConfig: {
      skinColor: '#e8c4a6',
      hairColor: '#2a221d',
      coatColor: '#263832',
      shirtColor: '#ece5d6',
      accentColor: '#d8b25c',
      hairStyle: 'neat_part',
      headwear: 'none',
      eyewear: 'glasses',
      collarStyle: 'crisp',
      facialHair: 'none',
      shoulderScale: 1.0,
    },
  },
  {
    id: 'wanderer',
    gender: 'male',
    name: { en: 'Wanderer', ru: 'Странник', uz: 'Sayohatchi' },
    tagline: {
      en: 'Weathered hood & scarf',
      ru: 'Капюшон и дорожный шарф',
      uz: 'Kapyushon va yo‘l sharfi',
    },
    palette: {
      bgFrom: '#2a2b38',
      bgTo: '#13141c',
      ring: '#8fa3c7',
      accent: '#c76d44',
      skin: '#dfb594',
      skinShadow: '#c2926e',
      hair: '#3a2d25',
      outfit: '#343b46',
      outfitTrim: '#c76d44',
      eye: '#1f232c',
    },
    threeConfig: {
      skinColor: '#dfb594',
      hairColor: '#3a2d25',
      coatColor: '#343b46',
      shirtColor: '#232830',
      accentColor: '#c76d44',
      hairStyle: 'hood_tucked',
      headwear: 'hood',
      eyewear: 'none',
      collarStyle: 'scarf',
      facialHair: 'none',
      shoulderScale: 1.04,
    },
  },
  {
    id: 'gentleman',
    gender: 'male',
    name: { en: 'Gentleman', ru: 'Джентльмен', uz: 'Jentlmen' },
    tagline: {
      en: 'Fedora hat & tailored coat',
      ru: 'Шляпа-федора и пальто',
      uz: 'Fedora shlyapa va palto',
    },
    palette: {
      bgFrom: '#2d231d',
      bgTo: '#140f0d',
      ring: '#d4a656',
      accent: '#b83c34',
      skin: '#ead0b8',
      skinShadow: '#cfa98b',
      hair: '#221c18',
      outfit: '#26211e',
      outfitTrim: '#d4a656',
      eye: '#1c1715',
    },
    threeConfig: {
      skinColor: '#ead0b8',
      hairColor: '#221c18',
      coatColor: '#26211e',
      shirtColor: '#f2ece0',
      accentColor: '#b83c34',
      hairStyle: 'swept_back',
      headwear: 'fedora',
      eyewear: 'none',
      collarStyle: 'coat',
      facialHair: 'none',
      shoulderScale: 1.02,
    },
  },
  {
    id: 'rookie',
    gender: 'male',
    name: { en: 'Rookie', ru: 'Новичок', uz: 'Yangi o‘yinchi' },
    tagline: {
      en: 'Warm hoodie & bright spark',
      ru: 'Худи и тёплый акцент',
      uz: 'Xudi va iliq aksent',
    },
    palette: {
      bgFrom: '#3b2b1d',
      bgTo: '#1c140e',
      ring: '#f0a642',
      accent: '#f0a642',
      skin: '#efc8a8',
      skinShadow: '#d4a481',
      hair: '#4a301f',
      outfit: '#3e4a44',
      outfitTrim: '#f0a642',
      eye: '#261e17',
    },
    threeConfig: {
      skinColor: '#efc8a8',
      hairColor: '#4a301f',
      coatColor: '#3e4a44',
      shirtColor: '#f0a642',
      accentColor: '#f0a642',
      hairStyle: 'messy_short',
      headwear: 'none',
      eyewear: 'none',
      collarStyle: 'hoodie',
      facialHair: 'none',
      shoulderScale: 0.98,
    },
  },
  {
    id: 'veteran',
    gender: 'male',
    name: { en: 'Veteran', ru: 'Ветеран', uz: 'Veteran' },
    tagline: {
      en: 'Silver beard & long coat',
      ru: 'Борода и длинное пальто',
      uz: 'Soqol va uzun palto',
    },
    palette: {
      bgFrom: '#2c2926',
      bgTo: '#141210',
      ring: '#a69a86',
      accent: '#9c4034',
      skin: '#dfb89b',
      skinShadow: '#be9273',
      hair: '#9c968d',
      outfit: '#3a3029',
      outfitTrim: '#a69a86',
      eye: '#1c1917',
    },
    threeConfig: {
      skinColor: '#dfb89b',
      hairColor: '#9c968d',
      coatColor: '#3a3029',
      shirtColor: '#d9d2c5',
      accentColor: '#9c4034',
      hairStyle: 'silver_trim',
      headwear: 'none',
      eyewear: 'none',
      collarStyle: 'coat',
      facialHair: 'beard',
      shoulderScale: 1.08,
    },
  },
  {
    id: 'adventurer',
    gender: 'male',
    name: { en: 'Adventurer', ru: 'Авантюрист', uz: 'Sarguzashtchi' },
    tagline: {
      en: 'Headband, ponytail & jacket',
      ru: 'Повязка, хвостик и куртка',
      uz: 'Bosh bog‘ichi va kurtka',
    },
    palette: {
      bgFrom: '#36221e',
      bgTo: '#170f0d',
      ring: '#d96b43',
      accent: '#d96b43',
      skin: '#e0b38d',
      skinShadow: '#c18d65',
      hair: '#2b1e16',
      outfit: '#4c3326',
      outfitTrim: '#d96b43',
      eye: '#1d1410',
    },
    threeConfig: {
      skinColor: '#e0b38d',
      hairColor: '#2b1e16',
      coatColor: '#4c3326',
      shirtColor: '#ede3d4',
      accentColor: '#d96b43',
      hairStyle: 'ponytail_band',
      headwear: 'headband',
      eyewear: 'none',
      collarStyle: 'crisp',
      facialHair: 'none',
      shoulderScale: 1.03,
    },
  },

  // ── Female (4) ────────────────────────────────────────────────────────────
  {
    id: 'grandmaster',
    gender: 'female',
    name: { en: 'Grandmaster', ru: 'Гроссмейстер', uz: 'Grossmeyster' },
    tagline: {
      en: 'High bun & tailored blazer',
      ru: 'Высокий пучок и строгий жакет',
      uz: 'Baland turmak va klassik jaket',
    },
    palette: {
      bgFrom: '#23312d',
      bgTo: '#101816',
      ring: '#d6ae5e',
      accent: '#d6ae5e',
      skin: '#efd1ba',
      skinShadow: '#d4ac8e',
      hair: '#261c18',
      outfit: '#1e2c28',
      outfitTrim: '#d6ae5e',
      eye: '#1a201d',
    },
    threeConfig: {
      skinColor: '#efd1ba',
      hairColor: '#261c18',
      coatColor: '#1e2c28',
      shirtColor: '#f5efe2',
      accentColor: '#d6ae5e',
      hairStyle: 'high_bun',
      headwear: 'none',
      eyewear: 'none',
      collarStyle: 'crisp',
      facialHair: 'none',
      shoulderScale: 0.92,
    },
  },
  {
    id: 'night_lady',
    gender: 'female',
    name: { en: 'Lady of the Night', ru: 'Леди Ночи', uz: 'Tun Xonimi' },
    tagline: {
      en: 'Sleek bob & high collar',
      ru: 'Каре и высокий воротник',
      uz: 'Kare soch va baland yoqa',
    },
    palette: {
      bgFrom: '#2d1a26',
      bgTo: '#120a10',
      ring: '#c85a7c',
      accent: '#c85a7c',
      skin: '#f2d9c9',
      skinShadow: '#d4b29f',
      hair: '#17151c',
      outfit: '#261924',
      outfitTrim: '#c85a7c',
      eye: '#261420',
    },
    threeConfig: {
      skinColor: '#f2d9c9',
      hairColor: '#17151c',
      coatColor: '#261924',
      shirtColor: '#17111a',
      accentColor: '#c85a7c',
      hairStyle: 'sleek_bob',
      headwear: 'none',
      eyewear: 'none',
      collarStyle: 'high',
      facialHair: 'none',
      shoulderScale: 0.9,
    },
  },
  {
    id: 'artist',
    gender: 'female',
    name: { en: 'Artist', ru: 'Художница', uz: 'Rassom' },
    tagline: {
      en: 'Beret, long hair & scarf',
      ru: 'Берет, длинные волосы и шарф',
      uz: 'Beret, uzun soch va sharf',
    },
    palette: {
      bgFrom: '#3a2224',
      bgTo: '#190f11',
      ring: '#d46a64',
      accent: '#e3b35c',
      skin: '#f0ccb0',
      skinShadow: '#d3a585',
      hair: '#4a2a1e',
      outfit: '#45282c',
      outfitTrim: '#e3b35c',
      eye: '#241815',
    },
    threeConfig: {
      skinColor: '#f0ccb0',
      hairColor: '#4a2a1e',
      coatColor: '#45282c',
      shirtColor: '#f3e8d8',
      accentColor: '#e3b35c',
      hairStyle: 'long_waves',
      headwear: 'beret',
      eyewear: 'none',
      collarStyle: 'scarf',
      facialHair: 'none',
      shoulderScale: 0.91,
    },
  },
  {
    id: 'tactician',
    gender: 'female',
    name: { en: 'Tactician', ru: 'Тактик', uz: 'Taktik' },
    tagline: {
      en: 'High ponytail, glasses & cloak',
      ru: 'Высокий хвост, очки и плащ',
      uz: 'Baland dum, ko‘zoynak va plash',
    },
    palette: {
      bgFrom: '#1c2b3a',
      bgTo: '#0d151e',
      ring: '#5fa4d6',
      accent: '#5fa4d6',
      skin: '#ebd0b8',
      skinShadow: '#cda788',
      hair: '#222836',
      outfit: '#1d2d3d',
      outfitTrim: '#5fa4d6',
      eye: '#17202b',
    },
    threeConfig: {
      skinColor: '#ebd0b8',
      hairColor: '#222836',
      coatColor: '#1d2d3d',
      shirtColor: '#e6edf4',
      accentColor: '#5fa4d6',
      hairStyle: 'high_ponytail',
      headwear: 'none',
      eyewear: 'thin_glasses',
      collarStyle: 'cloak',
      facialHair: 'none',
      shoulderScale: 0.92,
    },
  },
] as const;

const AVATAR_MAP = new Map<AvatarId, PlayerAvatarDefinition>(
  PLAYER_AVATARS.map((a) => [a.id, a]),
);

export function isValidAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && AVATAR_MAP.has(value as AvatarId);
}

export function getPlayerAvatar(id?: string | null): PlayerAvatarDefinition {
  if (id && AVATAR_MAP.has(id as AvatarId)) {
    return AVATAR_MAP.get(id as AvatarId)!;
  }
  return AVATAR_MAP.get(DEFAULT_AVATAR_ID)!;
}

export function getAvatarsByGender(
  filter: 'all' | AvatarGender,
): PlayerAvatarDefinition[] {
  if (filter === 'all') return [...PLAYER_AVATARS];
  return PLAYER_AVATARS.filter((a) => a.gender === filter);
}
