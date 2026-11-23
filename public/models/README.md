# ChUno 3D Model Slots (`public/models/`)

Drop `.glb` models into this directory — `AssetFactory` discovers them automatically via `/models/manifest.json` (generated automatically during Vite dev/build) with **zero 404 console errors** when optional files are absent.

Every loaded `.glb` is automatically normalized using its bounding box (`Box3`):
- Uniformly scaled to the target height listed below.
- Centered on `X = 0` and `Z = 0` (base anchored at `Y = 0` for busts/pieces, or centered for detached head/hands/revolver).
- Shadows (`castShadow`, `receiveShadow`) enabled automatically.

## Orientation Convention
- **Forward direction:** `+Z` (characters and heads must face `+Z`, toward the player).
- **Up direction:** `+Y`.
- **Revolver barrel forward:** `-Z` (grip pointing down `-Y`).

## Supported Model Paths

| Path | Role | Target Height (units) | Anchor |
| :--- | :--- | :---: | :---: |
| `public/models/dealer_head.glb` | Survival Mode Dealer head/bust (emerges from shadow) | `0.62` | `center` |
| `public/models/dealer_hand_left.glb` | Survival Mode Dealer left floating gloved hand | `0.24` | `center` |
| `public/models/dealer_hand_right.glb` | Survival Mode Dealer right floating gloved hand | `0.24` | `center` |
| `public/models/revolver.glb` | Survival Mode .357 Revolver | `0.24` | `center` |
| `public/models/npc_enthusiast.glb` | Light Mode — Enthusiast bust/character | `1.32` | `base` |
| `public/models/npc_egoist.glb` | Light Mode — Egoist bust/character | `1.32` | `base` |
| `public/models/npc_philosopher.glb` | Light Mode — Calm Philosopher bust/character | `1.32` | `base` |
| `public/models/npc_unknown.glb` | Light Mode — Unknown (Incognito) bust/character | `1.32` | `base` |
| `public/models/chess/<color>_<piece>.glb` | Optional custom chess pieces (`white_king.glb`, `black_queen.glb`, etc.) | `0.20–0.34` | `base` |

> **Tip:** If a file is not present, ChUno seamlessly uses its built-in fallback geometry (Buckshot Roulette–style emerging skull & floating gloves for the Dealer, and stylized busts for Light Mode).
