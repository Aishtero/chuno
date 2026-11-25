import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from 'lucide-react';
import step1DrawImg from '../assets/guide/step_1_draw.webp';
import step2PlayImg from '../assets/guide/step_2_play.webp';
import step3ReverseImg from '../assets/guide/step_3_reverse.webp';
import step4SpecialsImg from '../assets/guide/step_4_specials.webp';
import step5SurvivalImg from '../assets/guide/step_5_survival.webp';
import { Language, getTranslations } from '../core/localization';
import {
  GUIDE_AUTOPLAY_MS,
  GUIDE_SLIDE_COUNT,
  clampGuideSlide,
  nextGuideSlide,
  prevGuideSlide,
} from '../core/tutorialHelper';

const GUIDE_IMAGES = [
  step1DrawImg,
  step2PlayImg,
  step3ReverseImg,
  step4SpecialsImg,
  step5SurvivalImg,
];

interface VisualGuideModalProps {
  language: Language;
  autoPlayInitial?: boolean;
  onSwitchToRules?: () => void;
  onClose: () => void;
}

export const VisualGuideModal: React.FC<VisualGuideModalProps> = ({
  language,
  autoPlayInitial = false,
  onSwitchToRules,
  onClose,
}) => {
  const t = getTranslations(language);
  const isRu = language === 'ru';
  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(autoPlayInitial);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const isLast = slide === GUIDE_SLIDE_COUNT - 1;
  const activeCopy = t.guideSlides[slide] ?? t.guideSlides[0];
  const activeImg = GUIDE_IMAGES[slide] ?? GUIDE_IMAGES[0];

  const goToSlide = useCallback((idx: number, pauseAuto = true) => {
    setSlide(clampGuideSlide(idx));
    setProgressKey((k) => k + 1);
    if (pauseAuto) setAutoPlay(false);
  }, []);

  const handleNext = useCallback(() => {
    if (slide >= GUIDE_SLIDE_COUNT - 1) {
      onClose();
      return;
    }
    goToSlide(nextGuideSlide(slide), true);
  }, [goToSlide, onClose, slide]);

  const handlePrev = useCallback(() => {
    goToSlide(prevGuideSlide(slide), true);
  }, [goToSlide, slide]);

  // Gentle auto-play on first launch (~4.5s per slide)
  useEffect(() => {
    if (!autoPlay) return;
    if (slide >= GUIDE_SLIDE_COUNT - 1) {
      setAutoPlay(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSlide((prev) => nextGuideSlide(prev));
      setProgressKey((k) => k + 1);
    }, GUIDE_AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoPlay, slide]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (slide < GUIDE_SLIDE_COUNT - 1) {
          goToSlide(nextGuideSlide(slide), true);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (slide > 0) {
          goToSlide(prevGuideSlide(slide), true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToSlide, onClose, slide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (typeof endX !== 'number') return;
    const dx = endX - startX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && slide < GUIDE_SLIDE_COUNT - 1) {
      goToSlide(nextGuideSlide(slide), true);
    } else if (dx > 0 && slide > 0) {
      goToSlide(prevGuideSlide(slide), true);
    }
  };

  return (
    <div
      data-testid="visual-guide-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t.guideTabVisual}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2.5 sm:p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[94vh] flex flex-col rounded-2xl border border-stone-800 bg-stone-950 text-stone-100 shadow-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top thin auto-play progress bar */}
        <div className="h-1 w-full bg-stone-900 overflow-hidden">
          <div
            key={`${slide}-${progressKey}-${autoPlay ? 'play' : 'pause'}`}
            className="h-full bg-amber-500 transition-all"
            style={{
              width: autoPlay ? '100%' : `${((slide + 1) / GUIDE_SLIDE_COUNT) * 100}%`,
              transitionDuration: autoPlay ? `${GUIDE_AUTOPLAY_MS}ms` : '220ms',
              transitionTimingFunction: autoPlay ? 'linear' : 'ease-out',
            }}
          />
        </div>

        {/* Header with 2 clean tabs (Visual Guide | Detailed Rules) + Auto-Play Pause + Close */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5 border-b border-stone-800">
          <div className="inline-flex items-center rounded-lg bg-stone-900 p-1 border border-stone-800">
            <button
              type="button"
              data-testid="guide-tab-visual"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 text-stone-950 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.guideTabVisual}</span>
            </button>
            {onSwitchToRules && (
              <button
                type="button"
                data-testid="guide-tab-rules"
                onClick={onSwitchToRules}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t.guideTabRules}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {slide < GUIDE_SLIDE_COUNT - 1 && (
              <button
                type="button"
                data-testid="guide-toggle-autoplay"
                aria-label={autoPlay ? t.guidePauseAuto : t.guideResumeAuto}
                title={autoPlay ? t.guidePauseAuto : t.guideResumeAuto}
                onClick={() => setAutoPlay((p) => !p)}
                className="p-1.5 rounded-md text-stone-400 hover:text-amber-400 hover:bg-stone-900 transition-colors cursor-pointer"
              >
                {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              data-testid="guide-close-btn"
              aria-label={t.close}
              onClick={onClose}
              className="p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-stone-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main body: 16:9 Animated 3D Scene Stage + concise 2-line caption */}
        <div className="overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-stone-800 bg-black select-none">
            <img
              src={activeImg}
              alt={activeCopy.title}
              width={1280}
              height={720}
              className="h-full w-full object-cover"
            />
            {/* Soft dark vignette so SVG overlays pop crisply */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0.52) 100%)',
              }}
            />

            {/* Per-slide precision SVG/CSS animation layer (1280x720 viewBox matching real scene coords) */}
            <svg
              viewBox="0 0 1280 720"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="guide-arrow-amber"
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3.5, 0 7" fill="#f59e0b" />
                </marker>
                <marker
                  id="guide-arrow-emerald"
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3.5, 0 7" fill="#34d399" />
                </marker>
                <marker
                  id="guide-arrow-cyan"
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3.5, 0 7" fill="#38bdf8" />
                </marker>
              </defs>

              {/* SLIDE 1: Pulsing ring on 40-card deck (935, 625) + curved arc + gliding mini-card */}
              {slide === 0 && (
                <g>
                  <circle
                    cx="935"
                    cy="625"
                    r="58"
                    fill="rgba(245, 158, 11, 0.14)"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    className="guide-pulse-ring"
                  />
                  <circle cx="935" cy="625" r="46" fill="none" stroke="#fde68a" strokeWidth="3" />
                  <path
                    d="M 910 582 Q 775 430 625 488"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="5"
                    strokeDasharray="12 10"
                    markerEnd="url(#guide-arrow-amber)"
                  />
                  {/* Gliding mini-card along Deck -> Table */}
                  <g className="guide-card-arc">
                    <rect
                      x="900"
                      y="580"
                      width="72"
                      height="98"
                      rx="9"
                      fill="#1c1917"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                    />
                    <text
                      x="936"
                      y="638"
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="34"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      3
                    </text>
                  </g>
                  {/* Deck callout pill */}
                  <rect
                    x="815"
                    y="495"
                    width="240"
                    height="42"
                    rx="10"
                    fill="rgba(12, 10, 9, 0.88)"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x="935"
                    y="522"
                    textAnchor="middle"
                    fill="#fef3c7"
                    fontSize="20"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {isRu ? 'КОЛОДА [SPACE]' : 'DECK [SPACE]'}
                  </text>
                </g>
              )}

              {/* SLIDE 2: Highlight drawn "1 MOVE" card (990, 515) + glowing chess move path e2 -> e4 */}
              {slide === 1 && (
                <g>
                  <rect
                    x="915"
                    y="435"
                    width="150"
                    height="178"
                    rx="12"
                    fill="rgba(245, 158, 11, 0.14)"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    className="guide-pulse-ring"
                  />
                  {/* Highlighted pawn start square e2 (665, 580) & destination e4 (665, 455) */}
                  <circle cx="665" cy="580" r="30" fill="rgba(52, 211, 153, 0.25)" stroke="#34d399" strokeWidth="3.5" />
                  <path
                    d="M 665 552 L 665 480"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="6"
                    strokeDasharray="10 8"
                    markerEnd="url(#guide-arrow-emerald)"
                  />
                  <circle
                    cx="665"
                    cy="455"
                    r="34"
                    fill="rgba(52, 211, 153, 0.2)"
                    stroke="#34d399"
                    strokeWidth="4"
                    className="guide-pulse-ring"
                  />
                  <circle cx="665" cy="580" r="14" fill="#6ee7b7" className="guide-piece-glide" />
                  <rect
                    x="535"
                    y="380"
                    width="260"
                    height="40"
                    rx="10"
                    fill="rgba(12, 10, 9, 0.88)"
                    stroke="#34d399"
                    strokeWidth="2"
                  />
                  <text
                    x="665"
                    y="406"
                    textAnchor="middle"
                    fill="#d1fae5"
                    fontSize="19"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {isRu ? 'ХОД ФИГУРОЙ (1–5)' : 'CHESS MOVE (1–5)'}
                  </text>
                </g>
              )}

              {/* SLIDE 3: 180° Board Rotation Arrows (↺ ↻) + White <-> Black swap */}
              {slide === 2 && (
                <g>
                  <g className="guide-spin-orbit">
                    <path
                      d="M 480 460 A 150 150 0 0 1 770 460"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="7"
                      strokeLinecap="round"
                      markerEnd="url(#guide-arrow-cyan)"
                    />
                    <path
                      d="M 770 480 A 150 150 0 0 1 480 480"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="7"
                      strokeLinecap="round"
                      markerEnd="url(#guide-arrow-amber)"
                    />
                  </g>
                  {/* Center 180° pill */}
                  <rect
                    x="505"
                    y="438"
                    width="240"
                    height="64"
                    rx="16"
                    fill="rgba(12, 10, 9, 0.92)"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <text
                    x="625"
                    y="468"
                    textAnchor="middle"
                    fill="#e0f2fe"
                    fontSize="24"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    ↺ 180° ↻
                  </text>
                  <text
                    x="625"
                    y="492"
                    textAnchor="middle"
                    fill="#fde68a"
                    fontSize="16"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {isRu ? 'БЕЛЫЕ ⇄ ЧЁРНЫЕ' : 'WHITE ⇄ BLACK'}
                  </text>
                </g>
              )}

              {/* SLIDE 4: 3 compact animated special-card badges matching matchEngine.ts */}
              {slide === 3 && (
                <g>
                  {/* Badge 1: SKIP */}
                  <rect
                    x="54"
                    y="56"
                    width="340"
                    height="92"
                    rx="14"
                    fill="rgba(12, 10, 9, 0.9)"
                    stroke="#f87171"
                    strokeWidth="2.5"
                  />
                  <text x="80" y="96" fill="#fca5a5" fontSize="22" fontWeight="800" fontFamily="sans-serif">
                    ⊘ {isRu ? 'ПРОПУСК (SKIP)' : 'SKIP'}
                  </text>
                  <text x="80" y="128" fill="#e7e5e4" fontSize="16" fontFamily="sans-serif">
                    {isRu ? 'Активный игрок теряет ход' : 'Forfeits the active turn'}
                  </text>

                  {/* Badge 2: +2 / +4 REVIVE */}
                  <rect
                    x="470"
                    y="56"
                    width="355"
                    height="92"
                    rx="14"
                    fill="rgba(12, 10, 9, 0.9)"
                    stroke="#34d399"
                    strokeWidth="2.5"
                  />
                  <text x="496" y="96" fill="#6ee7b7" fontSize="22" fontWeight="800" fontFamily="sans-serif">
                    ✚ {isRu ? '+2 / +4 ВОЗВРАТ' : '+2 / +4 REVIVE'}
                  </text>
                  <text x="496" y="128" fill="#e7e5e4" fontSize="16" fontFamily="sans-serif">
                    {isRu ? 'Возврат срубленных фигур' : 'Restores captured pieces'}
                  </text>

                  {/* Badge 3: WILD */}
                  <rect
                    x="886"
                    y="56"
                    width="340"
                    height="92"
                    rx="14"
                    fill="rgba(12, 10, 9, 0.9)"
                    stroke="#c084fc"
                    strokeWidth="2.5"
                  />
                  <text x="912" y="96" fill="#e9d5ff" fontSize="22" fontWeight="800" fontFamily="sans-serif">
                    ★ {isRu ? 'ДЖОКЕР (WILD)' : 'WILD'}
                  </text>
                  <text x="912" y="128" fill="#e7e5e4" fontSize="16" fontFamily="sans-serif">
                    {isRu ? 'Превращение фигуры на 1 ход' : 'Morphs 1 piece for 1 move'}
                  </text>
                </g>
              )}

              {/* SLIDE 5: Survival Mode — 50/50 flipping brass coin + accent ring on revolver (345, 455) */}
              {slide === 4 && (
                <g>
                  {/* Revolver highlight at (345, 455) */}
                  <circle
                    cx="345"
                    cy="455"
                    r="62"
                    fill="rgba(239, 68, 68, 0.16)"
                    stroke="#ef4444"
                    strokeWidth="4"
                    className="guide-pulse-ring"
                  />
                  <circle cx="345" cy="455" r="48" fill="none" stroke="#fca5a5" strokeWidth="2.5" />
                  <rect
                    x="220"
                    y="345"
                    width="250"
                    height="40"
                    rx="10"
                    fill="rgba(12, 10, 9, 0.92)"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                  <text
                    x="345"
                    y="371"
                    textAnchor="middle"
                    fill="#fecaca"
                    fontSize="19"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {isRu ? 'РЕВОЛЬВЕР (-1 HP)' : 'REVOLVER (-1 HP)'}
                  </text>

                  {/* Animated 50/50 flipping coin over center of board (640, 380) */}
                  <g className="guide-coin-flip">
                    <circle
                      cx="640"
                      cy="380"
                      r="60"
                      fill="#b45309"
                      stroke="#fde68a"
                      strokeWidth="5"
                    />
                    <circle cx="640" cy="380" r="46" fill="#d97706" stroke="#fef3c7" strokeWidth="2" />
                    <text
                      x="640"
                      y="394"
                      textAnchor="middle"
                      fill="#fef3c7"
                      fontSize="38"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      ♛ / ☠
                    </text>
                  </g>
                  <rect
                    x="530"
                    y="456"
                    width="220"
                    height="38"
                    rx="10"
                    fill="rgba(12, 10, 9, 0.92)"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x="640"
                    y="481"
                    textAnchor="middle"
                    fill="#fde68a"
                    fontSize="18"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {isRu ? 'МОНЕТА 50 / 50' : '50 / 50 COIN FLIP'}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Concise Slide Copy (Title + 2 short lines) */}
          <div className="px-1 space-y-1.5">
            <h2
              data-testid="guide-slide-title"
              className="font-display text-lg sm:text-xl font-bold text-amber-400"
            >
              {activeCopy.title}
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 leading-snug">{activeCopy.line1}</p>
            <p className="text-xs sm:text-sm text-stone-400 leading-snug">{activeCopy.line2}</p>
          </div>
        </div>

        {/* Footer: Skip | Dots | Back & Next/Play */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 border-t border-stone-800 bg-stone-950/95">
          <button
            type="button"
            data-testid="guide-skip-btn"
            onClick={onClose}
            className="text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            {t.guideSkip}
          </button>

          {/* Slide Dots */}
          <div className="flex items-center gap-2" role="tablist" aria-label={t.guideTabVisual}>
            {Array.from({ length: GUIDE_SLIDE_COUNT }).map((_, idx) => {
              const active = idx === slide;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${idx + 1} / ${GUIDE_SLIDE_COUNT}`}
                  data-testid={`guide-dot-${idx}`}
                  onClick={() => goToSlide(idx, true)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    active ? 'w-6 bg-amber-500' : 'w-2.5 bg-stone-700 hover:bg-stone-500'
                  }`}
                />
              );
            })}
          </div>

          {/* Back / Next / Done */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="guide-prev-btn"
              disabled={slide === 0}
              onClick={handlePrev}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                slide === 0
                  ? 'border-stone-800 text-stone-600 cursor-not-allowed'
                  : 'border-stone-700 text-stone-200 hover:bg-stone-900 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t.guideBack}</span>
            </button>
            <button
              type="button"
              data-testid="guide-next-btn"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>{isLast ? t.guideDone : t.guideNext}</span>
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
