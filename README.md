# ChUno — Tactical 3D Chess & Roulette Card Thriller

**ChUno** is a 3D tactical chess hybrid built with **React, TypeScript, and Three.js** where every turn is driven by a 40-card tactical deck—combining multi-move streaks, board reversals, piece resurrections, temporary wild transformations, and high-stakes Russian-roulette coin flips.

---

## Features

- **Friendly Mode (Default)**
  - Bright outdoor meadow chessboard with a wooden 3D tabletop clock and 4 distinct animated AI opponents: **Enthusiast**, **Egoist**, **Calm Philosopher**, and **Unknown (Incognito)**.
  - **Dynamic Day → Sunset → Moonlit Night Cycle** exclusively during matches against **Unknown**, complete with setting sun, rising moon, starfield, silver moonlight rim lighting, and a warm tabletop lantern over the board.
- **Survival Mode**
  - Atmospheric Buckshot-inspired underground cellar table against **The Dealer**, featuring 3 difficulty tiers (**Easy · 3 HP**, **Medium · 2 HP**, **Hard · 1 HP**) with visual Dealer evolution (glowing eyes, brow expression, posture, lighting).
  - High-stakes **Bullet** cards trigger a 50/50 brass coin flip and a fully animated 3D revolver sequence alongside a live CRT HP & match-timer console.
- **Tactical Chess + 40-Card Deck Engine**
  - Full legal chess rules (castling, en passant, promotions, check/checkmate, stalemate, 3-fold repetition, King-vs-King auto-draw) powered by a dedicated Web Worker AI.
  - Multi-move streaks (`1`–`5`, atomically interrupted on check), `Skip`, `Reverse` (side swap), `+2`/`+4` Resurrection, `Wild` piece morphing, and `Bullet`.
- **32 Achievements & Leader Dashboard**
  - 32 unlockable achievements across Friendly, Survival, Tactics, and General categories with monotonic score tracking, local profile persistence, and an offline/online-ready **Leader Dashboard** (`HOUSE` benchmarks).
- **Adaptive 4-Channel Audio & Custom Voiceovers**
  - Automatic Vite discovery across 4 music channels (`survival/`, `friendly/`, `friendly_background/`, `unknown/`) with smooth crossfading, independent Menu/In-Game music toggles, perceptual volume curves, and graceful fallback when folders are empty.
  - Full bilingual (**EN / RU**) dialogue system with custom `.mp3`/`.ogg`/`.wav` voiceover support—see [`VOICE_SCRIPT.md`](./VOICE_SCRIPT.md) for all 82 lines, IDs, and target paths.

---

## Getting Started

### Prerequisites
- **Node.js 20+** (recommended)

### Commands

```bash
# Install dependencies
npm install

# Run local development server (http://localhost:3000)
npm run dev

# Type-check with TypeScript
npm run lint

# Run unit test suite (25 tests)
npm test

# Build production bundle (relative paths via base: './')
npm run build
```

---

## Custom Audio & Voiceovers

- **Background Music:** drop `.mp3`, `.ogg`, or `.wav` tracks into:
  - `src/assets/audio/music/friendly/` (Friendly Mode main menu)
  - `src/assets/audio/music/friendly_background/` (Friendly Mode gameplay)
  - `src/assets/audio/music/unknown/` (Friendly Mode gameplay vs. Unknown)
  - `src/assets/audio/music/survival/` (Survival Mode menu & gameplay)
- **Character Voices:** place recordings in `public/audio/voices/<speaker>/<ru|en>/<id>.mp3` following [`VOICE_SCRIPT.md`](./VOICE_SCRIPT.md). Regenerate `VOICE_SCRIPT.md` anytime after editing `src/data/voiceRegistry.ts` via:
  ```bash
  npx tsx scripts/gen_voice_script.ts
  ```
