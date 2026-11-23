# ChUno Audio Slots (`public/audio/`)

Drop `.mp3`, `.ogg`, or `.wav` files into the subdirectories below. ChUno scans `public/audio/` automatically via `/audio/manifest.json` (generated during Vite dev/build). Missing files are silently ignored with **zero 404 console errors**.

## 1. Background Music (`public/audio/music/`)
Looped automatically (`loop = true`) with a **1.0s smooth crossfade** when switching screens (`MAIN_MENU` ↔ `SURVIVAL` ↔ `LIGHT`), controlled by the **Music** volume slider:

- `public/audio/music/menu.mp3` — Main Menu background music
- `public/audio/music/survival.mp3` — Survival Mode match music / cellar ambience
- `public/audio/music/light.mp3` — Light Mode match music / meadow ambience

*(Alternative extensions `.ogg` and `.wav` are also detected automatically.)*

## 2. Sound Effects (`public/audio/sfx/`)
Optional file overrides for core gameplay SFX, controlled by the **Effects (SFX)** volume slider (built-in procedural SFX play automatically if a file is not provided):

- `public/audio/sfx/card_draw.mp3`
- `public/audio/sfx/piece_move.mp3`
- `public/audio/sfx/coin_flip.mp3`
- `public/audio/sfx/revolver_cock.mp3`
- `public/audio/sfx/revolver_shot.mp3`
- `public/audio/sfx/ui_click.mp3`

## 3. Character Voices (`public/audio/voices/<speaker>/<lang>/<id>.mp3`)
Controlled by the **Voice** volume slider and Dialogue Audio mode (`Voice (MP3 / TTS)`):

- Speakers: `dealer`, `enthusiast`, `egoist`, `calm`, `unknown`
- Languages: `en`, `ru`
- Example: `public/audio/voices/dealer/ru/match_start_01.mp3`
- Example: `public/audio/voices/unknown/en/start_01.mp3`

See `src/data/voiceRegistry.ts` for the full list of entry paths.
