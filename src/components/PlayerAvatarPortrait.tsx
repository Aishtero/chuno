import React from 'react';
import { AvatarId, getPlayerAvatar } from '../data/playerAvatars';

interface PlayerAvatarPortraitProps {
  avatarId: AvatarId | string | undefined;
  size?: number;
  className?: string;
  showRing?: boolean;
}

const PORTRAIT_EYE_IRIS: Record<AvatarId, { iris: string; inner: string; lip: string; blush: string }> = {
  strategist: { iris: '#2f6a58', inner: '#62b398', lip: '#9d584b', blush: '#de806c' },
  wanderer: { iris: '#4a607a', inner: '#85a6cc', lip: '#8e5147', blush: '#c87662' },
  gentleman: { iris: '#5e432c', inner: '#9b7450', lip: '#944f46', blush: '#d47c6c' },
  rookie: { iris: '#7a4b26', inner: '#be8349', lip: '#a65a4c', blush: '#e87e6c' },
  veteran: { iris: '#4b5563', inner: '#8b99ad', lip: '#8f554a', blush: '#cd8270' },
  adventurer: { iris: '#6b3f22', inner: '#b37142', lip: '#9a5244', blush: '#e07a62' },
  grandmaster: { iris: '#5b5134', inner: '#b59d5e', lip: '#a84b52', blush: '#e2847e' },
  night_lady: { iris: '#59426e', inner: '#a984cc', lip: '#96344b', blush: '#da788a' },
  artist: { iris: '#4d6b47', inner: '#8ab87e', lip: '#b85450', blush: '#ec8676' },
  tactician: { iris: '#2e6394', inner: '#6faee3', lip: '#a4545e', blush: '#de8480' },
};

/**
 * High-detail stylized 2D SVG portraits for all 10 ChUno player avatars,
 * visually matching the sculpted 3D CanvasTexture faces, layered hairstyles,
 * eyes with catchlights, sculpted lips, and signature accessories.
 */
export const PlayerAvatarPortrait: React.FC<PlayerAvatarPortraitProps> = React.memo(
  ({ avatarId, size = 40, className = '', showRing = true }) => {
    const def = getPlayerAvatar(avatarId);
    const p = def.palette;
    const cfg = def.threeConfig;
    const face = PORTRAIT_EYE_IRIS[def.id];
    const isFemale = def.gender === 'female';
    const uid = `av-${def.id}`;

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-full select-none ${className}`}
        aria-hidden="true"
        data-avatar-id={def.id}
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="8" y1="6" x2="72" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.bgFrom} />
            <stop offset="100%" stopColor={p.bgTo} />
          </linearGradient>
          <radialGradient id={`${uid}-skin`} cx="40" cy="34" r="19" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="70%" stopColor={p.skin} stopOpacity="0" />
            <stop offset="100%" stopColor={p.skinShadow} stopOpacity="0.34" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <circle cx="40" cy="40" r="38" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          {/* Atmospheric backdrop + subtle rim glow */}
          <rect width="80" height="80" fill={`url(#${uid}-bg)`} />
          <circle cx="40" cy="30" r="26" fill={p.ring} fillOpacity="0.16" />
          <circle cx="40" cy="68" r="24" fill="#000000" fillOpacity="0.22" />

          {/* Back hair layers */}
          {cfg.hairStyle === 'long_waves' && (
            <>
              <path
                d="M19 30 C14 44 13 60 19 76 L61 76 C67 60 66 44 61 30 Z"
                fill={p.hair}
              />
              <path
                d="M21 44 C19 54 20 64 23 73 M59 44 C61 54 60 64 57 73"
                stroke="#ffffff"
                strokeOpacity="0.12"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </>
          )}
          {cfg.hairStyle === 'sleek_bob' && (
            <path
              d="M20 29 C17 42 18 52 24 56 L56 56 C62 52 63 42 60 29 Z"
              fill={p.hair}
            />
          )}
          {cfg.hairStyle === 'high_ponytail' && (
            <>
              <path
                d="M47 15 C61 17 67 31 62 49 C58 40 55 31 47 26 Z"
                fill={p.hair}
              />
              <circle cx="49" cy="19" r="2.8" fill={p.accent} />
            </>
          )}
          {cfg.hairStyle === 'ponytail_band' && (
            <path
              d="M52 24 C62 28 65 39 60 51 C56 44 54 37 50 31 Z"
              fill={p.hair}
            />
          )}
          {cfg.hairStyle === 'high_bun' && (
            <>
              <ellipse cx="40" cy="13.5" rx="9.5" ry="7.8" fill={p.hair} />
              <line x1="28" y1="16" x2="52" y2="11" stroke={p.accent} strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="52" cy="11" r="2.1" fill={p.accent} />
            </>
          )}

          {/* Hood outer silhouette */}
          {cfg.headwear === 'hood' && (
            <>
              <path
                d="M14 44 C14 21 25 11 40 11 C55 11 66 21 66 44 L69 80 L11 80 Z"
                fill={p.outfit}
              />
              <path
                d="M21 43 C21 25 29 17 40 17 C51 17 59 25 59 43 Z"
                fill="#000000"
                fillOpacity="0.28"
              />
            </>
          )}

          {/* Shoulders & sculpted outfit */}
          <path
            d={
              isFemale
                ? 'M15 80 C17 63 26 56 40 56 C54 56 63 63 65 80 Z'
                : 'M11 80 C13 61 23 55 40 55 C57 55 67 61 69 80 Z'
            }
            fill={p.outfit}
          />
          {/* Subtle shoulder rim lighting */}
          <path
            d={isFemale ? 'M17 72 C20 62 28 57 40 57 C52 57 60 62 63 72' : 'M13 72 C16 61 25 56 40 56 C55 56 64 61 67 72'}
            stroke="#ffffff"
            strokeOpacity="0.14"
            strokeWidth="1.2"
          />

          {/* Collar, Lapels, Scarf, Hoodie, Cloak */}
          {cfg.collarStyle === 'scarf' && (
            <>
              <path d="M24 55 Q40 65 56 55 L59 64 Q40 74 21 64 Z" fill={p.outfitTrim} />
              <path d="M46 61 L54 61 L52 79 L44 79 Z" fill={p.outfitTrim} />
              <path d="M25 60 Q40 68 55 60" stroke="#000000" strokeOpacity="0.18" strokeWidth="1.3" />
            </>
          )}
          {cfg.collarStyle === 'crisp' && (
            <>
              <path d="M32 55 L40 69 L48 55 Z" fill={p.outfitTrim} />
              <path d="M30 55 L38 67 L34 70 L25 59 Z" fill={p.outfit} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.9" />
              <path d="M50 55 L42 67 L46 70 L55 59 Z" fill={p.outfit} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.9" />
              {isFemale ? (
                <polygon points="40,61 43,64 40,67 37,64" fill={p.accent} />
              ) : (
                <path d="M38.5 58 L41.5 58 L42.2 71 L37.8 71 Z" fill={p.accent} />
              )}
            </>
          )}
          {cfg.collarStyle === 'coat' && (
            <>
              <path d="M33 55 L40 71 L47 55 Z" fill="#f3ede2" />
              <path d="M38.6 58 L41.4 58 L42 71 L38 71 Z" fill={p.accent} />
              <path d="M26 57 L35 70 L30 74 L21 61 Z" fill={p.outfit} stroke={p.outfitTrim} strokeOpacity="0.45" strokeWidth="1" />
              <path d="M54 57 L45 70 L50 74 L59 61 Z" fill={p.outfit} stroke={p.outfitTrim} strokeOpacity="0.45" strokeWidth="1" />
            </>
          )}
          {cfg.collarStyle === 'hoodie' && (
            <>
              <path d="M27 56 Q40 65 53 56" stroke={p.outfitTrim} strokeWidth="3.4" strokeLinecap="round" />
              <line x1="34.5" y1="60" x2="34.5" y2="73" stroke={p.outfitTrim} strokeWidth="1.9" strokeLinecap="round" />
              <line x1="45.5" y1="60" x2="45.5" y2="73" stroke={p.outfitTrim} strokeWidth="1.9" strokeLinecap="round" />
            </>
          )}
          {cfg.collarStyle === 'high' && (
            <path
              d="M24 57 L27 45 L53 45 L56 57 Q40 63 24 57 Z"
              fill={p.outfit}
              stroke={p.outfitTrim}
              strokeWidth="1.5"
            />
          )}
          {cfg.collarStyle === 'cloak' && (
            <>
              <path d="M15 62 Q40 53 65 62 L69 80 L11 80 Z" fill={p.outfit} />
              <path d="M17 63 Q40 55 63 63" stroke={p.outfitTrim} strokeOpacity="0.55" strokeWidth="1.2" />
              <polygon points="40,56.5 43.2,60 40,63.5 36.8,60" fill={p.outfitTrim} />
            </>
          )}

          {/* Neck + shadow under chin */}
          <rect x={isFemale ? 35.6 : 34.8} y="47" width={isFemale ? 8.8 : 10.4} height="11" rx="4" fill={p.skinShadow} />
          <path d="M35 51 Q40 55 45 51 L45 48 L35 48 Z" fill="#000000" fillOpacity="0.16" />

          {/* Ears */}
          <ellipse cx={isFemale ? 26.2 : 25.4} cy="37.5" rx="2.4" ry="3.8" fill={p.skinShadow} />
          <ellipse cx={isFemale ? 53.8 : 54.6} cy="37.5" rx="2.4" ry="3.8" fill={p.skinShadow} />

          {/* Sculpted Face Contour (tapered chin & jaw) */}
          <path
            d={
              isFemale
                ? 'M26.5 33 C26.5 23 32 19.5 40 19.5 C48 19.5 53.5 23 53.5 33 C53.5 42.5 48.2 50.2 40 51.8 C31.8 50.2 26.5 42.5 26.5 33 Z'
                : 'M25.8 33 C25.8 22.5 31.8 19 40 19 C48.2 19 54.2 22.5 54.2 33 C54.2 42.8 49.4 49.8 40 52 C30.6 49.8 25.8 42.8 25.8 33 Z'
            }
            fill={p.skin}
          />
          <path
            d={
              isFemale
                ? 'M26.5 33 C26.5 23 32 19.5 40 19.5 C48 19.5 53.5 23 53.5 33 C53.5 42.5 48.2 50.2 40 51.8 C31.8 50.2 26.5 42.5 26.5 33 Z'
                : 'M25.8 33 C25.8 22.5 31.8 19 40 19 C48.2 19 54.2 22.5 54.2 33 C54.2 42.8 49.4 49.8 40 52 C30.6 49.8 25.8 42.8 25.8 33 Z'
            }
            fill={`url(#${uid}-skin)`}
          />

          {/* Soft cheek blush */}
          <ellipse cx="31.5" cy="40.5" rx="3.4" ry="2.1" fill={face.blush} fillOpacity={isFemale ? '0.26' : '0.16'} />
          <ellipse cx="48.5" cy="40.5" rx="3.4" ry="2.1" fill={face.blush} fillOpacity={isFemale ? '0.26' : '0.16'} />

          {/* Detailed Eyes: sclera, colored iris, inner ring, pupil, dual catchlights, lash line */}
          {[34.2, 45.8].map((ex, idx) => {
            const side = idx === 0 ? -1 : 1;
            return (
              <g key={ex}>
                <ellipse cx={ex} cy="36.2" rx="3.3" ry={isFemale ? 2.8 : 2.4} fill="#faf8f4" />
                <circle cx={ex} cy="36.3" r={isFemale ? 2.1 : 1.9} fill={face.iris} />
                <circle cx={ex} cy="36.7" r={isFemale ? 1.2 : 1.05} fill={face.inner} />
                <circle cx={ex} cy="36.3" r={isFemale ? 1.0 : 0.9} fill="#111116" />
                <circle cx={ex - 0.8} cy="35.4" r="0.65" fill="#ffffff" />
                <circle cx={ex + 0.7} cy="37.0" r="0.32" fill="#ffffff" />
                <path
                  d={`M${ex - 3.4} 35.6 Q${ex} ${isFemale ? 33.1 : 33.5} ${ex + 3.4} 35.6`}
                  stroke="#1d1715"
                  strokeWidth={isFemale ? '1.25' : '1.1'}
                  strokeLinecap="round"
                />
                {isFemale && (
                  <line
                    x1={ex + side * 3.1}
                    y1="35.2"
                    x2={ex + side * 4.3}
                    y2="34.2"
                    stroke="#1d1715"
                    strokeWidth="1.05"
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}

          {/* Expressive Eyebrows */}
          <path
            d={def.id === 'gentleman' ? 'M30.5 32 Q34.2 30.8 37.6 31.8' : 'M30.6 31.8 Q34.2 30.5 37.6 31.6'}
            stroke={p.hair}
            strokeWidth={isFemale ? '1.2' : '1.6'}
            strokeLinecap="round"
          />
          <path
            d={def.id === 'gentleman' ? 'M42.4 31.2 Q45.8 29.8 49.5 31.4' : 'M42.4 31.6 Q45.8 30.5 49.4 31.8'}
            stroke={p.hair}
            strokeWidth={isFemale ? '1.2' : '1.6'}
            strokeLinecap="round"
          />

          {/* Subtle Nose Bridge & Shadow */}
          <path d="M40 35.5 L39.4 40.3 Q40 41.2 41 40.5" stroke={p.skinShadow} strokeWidth="1.05" strokeLinecap="round" />

          {/* Sculpted Lips / Expression */}
          {isFemale ? (
            <>
              <path d="M36.4 44.6 Q38.4 43.3 40 44.1 Q41.6 43.3 43.6 44.6 Q40 45.4 36.4 44.6 Z" fill={face.lip} />
              <path d="M36.8 44.8 Q40 47.2 43.2 44.8 Q40 45.5 36.8 44.8 Z" fill={face.lip} fillOpacity="0.88" />
              <ellipse cx="40" cy="45.8" rx="1.4" ry="0.45" fill="#ffffff" fillOpacity="0.35" />
            </>
          ) : def.id === 'rookie' || def.id === 'adventurer' ? (
            <>
              <path d="M36.2 44.2 Q40 47.4 43.8 44.2 Q40 45.1 36.2 44.2 Z" fill="#82352e" />
              <path d="M37 44.5 Q40 45.6 43 44.5" stroke="#faf8f2" strokeWidth="0.95" strokeLinecap="round" />
            </>
          ) : def.id === 'gentleman' ? (
            <path d="M36.4 45.1 Q40.2 45.5 44 43.6" stroke={face.lip} strokeWidth="1.45" strokeLinecap="round" />
          ) : (
            <path d="M36.6 44.6 Q40 46.2 43.4 44.6" stroke={face.lip} strokeWidth="1.4" strokeLinecap="round" />
          )}

          {/* Sculpted Beard & Mustache (Veteran) */}
          {cfg.facialHair === 'beard' && (
            <>
              <path
                d="M26 39 C26 48.5 32 54.5 40 54.5 C48 54.5 54 48.5 54 39 C51 43.5 46 45.5 40 45.5 C34 45.5 29 43.5 26 39 Z"
                fill={p.hair}
              />
              <path
                d="M35 43.6 Q37.8 42.2 40 43.5 Q42.2 42.2 45 43.6 Q42.2 44.8 40 44.2 Q37.8 44.8 35 43.6 Z"
                fill="#b8b2a8"
              />
            </>
          )}

          {/* Front Layered Hair */}
          {cfg.headwear !== 'hood' ? (
            <>
              <path
                d={
                  cfg.hairStyle === 'messy_short'
                    ? 'M24.5 34 C24.5 20 31 16.5 40 16.5 C49 16.5 55.5 21 55.5 34 C51.5 27.5 47.5 24 42.5 26.5 L39 22.5 L34.5 27.5 C30.5 25 27 28.5 24.5 34 Z'
                    : cfg.hairStyle === 'sleek_bob'
                      ? 'M23.5 34 C23.5 20.5 31 17 40 17 C49 17 56.5 20.5 56.5 34 C52 26 45 23.5 37 25.5 C31 27 26.5 29.5 23.5 34 Z'
                      : cfg.hairStyle === 'neat_part'
                        ? 'M24.5 33.5 C24.5 20 31 16.8 40 16.8 C49 16.8 55.5 20.5 55.5 33.5 C51 25.5 44 23 36 24.5 L33 22 C29 24.5 26.5 28 24.5 33.5 Z'
                        : 'M24.5 33.5 C24.5 20.5 31 17 40 17 C49 17 55.5 20.5 55.5 33.5 C51 25.5 46 23.5 40 23.8 C34 23.5 29 25.5 24.5 33.5 Z'
                }
                fill={p.hair}
              />
              {/* Subtle hair sheen highlight */}
              <path
                d="M31 21.5 Q40 18.8 49 21.5"
                stroke="#ffffff"
                strokeOpacity="0.18"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </>
          ) : (
            /* Tousled bangs peeking out under hood */
            <path
              d="M27 28 Q33 23 39 26 Q45 23 52 28 Q46 26.5 40 27.5 Q33 26.5 27 28 Z"
              fill={p.hair}
            />
          )}

          {/* Headwear */}
          {cfg.headwear === 'fedora' && (
            <>
              <path d="M22.5 25 L27.5 12 Q40 9 52.5 12 L57.5 25 Z" fill={p.outfit} />
              <rect x="25.8" y="21" width="28.4" height="3.2" rx="1" fill={p.outfitTrim} />
              <ellipse cx="40" cy="25.4" rx="22.5" ry="3.8" fill={p.outfit} />
              <path d="M23 25.2 Q40 27.5 57 25.2" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.9" />
            </>
          )}
          {cfg.headwear === 'beret' && (
            <>
              <path
                d="M21 26 C21 14 35 11 50 15.5 C56 17.5 58 23 54.5 27 C45 24 33 24 21 26 Z"
                fill={p.accent}
              />
              <path d="M28 17.5 Q40 14.5 50 18" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
            </>
          )}
          {cfg.headwear === 'headband' && (
            <path
              d="M25 28.5 Q40 24.5 55 28.5 L55 32.2 Q40 28.2 25 32.2 Z"
              fill={p.accent}
            />
          )}

          {/* Detailed Eyewear with subtle specular gleam */}
          {cfg.eyewear === 'glasses' && (
            <g stroke={p.accent} strokeWidth="1.7">
              <rect x="29.4" y="33.2" width="9.6" height="6.2" rx="1.8" fill="#dff0ff" fillOpacity="0.16" />
              <rect x="41.0" y="33.2" width="9.6" height="6.2" rx="1.8" fill="#dff0ff" fillOpacity="0.16" />
              <line x1="39.0" y1="36.0" x2="41.0" y2="36.0" />
              <line x1="31.2" y1="34.8" x2="33.4" y2="34.8" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round" />
              <line x1="42.8" y1="34.8" x2="45.0" y2="34.8" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round" />
            </g>
          )}
          {cfg.eyewear === 'thin_glasses' && (
            <g stroke={p.accent} strokeWidth="1.35">
              <circle cx="34.2" cy="36.3" r="4.6" fill="#dff0ff" fillOpacity="0.16" />
              <circle cx="45.8" cy="36.3" r="4.6" fill="#dff0ff" fillOpacity="0.16" />
              <path d="M38.8 36.2 Q40 35.1 41.2 36.2" />
              <path d="M31.5 34.4 Q32.8 33.4 34.0 33.8" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.85" strokeLinecap="round" />
              <path d="M43.1 34.4 Q44.4 33.4 45.6 33.8" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.85" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* Outer ring */}
        {showRing && (
          <circle cx="40" cy="40" r="38" stroke={p.ring} strokeWidth="2.4" strokeOpacity="0.88" />
        )}
      </svg>
    );
  },
);
PlayerAvatarPortrait.displayName = 'PlayerAvatarPortrait';
