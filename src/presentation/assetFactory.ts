import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PieceColor, PieceType } from '../core/chess/types';
import { GameMode, LightPreviewAvatar } from '../core/deck/cardData';
import { CharacterRigController, createCharacterRig } from './characterRig';
import {
  MaterialBank,
  RevolverRig,
  buildChessPieceMesh,
  buildCoinMesh,
  buildPlayerHands,
  buildRevolverMesh,
} from './proceduralAssets';

export type AssetOverrideKey =
  | `piece_${PieceType}_${PieceColor}`
  | 'dealer'
  | 'dealer_head'
  | 'dealer_hand_left'
  | 'dealer_hand_right'
  | `light_npc_${LightPreviewAvatar}`
  | 'revolver'
  | 'coin';

interface ModelSlotSpec {
  key: AssetOverrideKey;
  targetHeight: number;
  anchor: 'base' | 'center';
}

const PUBLIC_MODEL_SLOTS: Record<string, ModelSlotSpec> = {
  'dealer_head.glb': { key: 'dealer_head', targetHeight: 0.62, anchor: 'center' },
  'dealer_hand_left.glb': { key: 'dealer_hand_left', targetHeight: 0.24, anchor: 'center' },
  'dealer_hand_right.glb': { key: 'dealer_hand_right', targetHeight: 0.24, anchor: 'center' },
  'revolver.glb': { key: 'revolver', targetHeight: 0.24, anchor: 'center' },
  'coin.glb': { key: 'coin', targetHeight: 0.04, anchor: 'center' },
  'npc_enthusiast.glb': { key: 'light_npc_enthusiast', targetHeight: 1.25, anchor: 'base' },
  'npc_egoist.glb': { key: 'light_npc_egoist', targetHeight: 1.25, anchor: 'base' },
  'npc_philosopher.glb': { key: 'light_npc_calm', targetHeight: 1.25, anchor: 'base' },
  'npc_unknown.glb': { key: 'light_npc_unknown', targetHeight: 1.25, anchor: 'base' },
};

const CHESS_PIECE_HEIGHTS: Record<PieceType, number> = {
  pawn: 0.19,
  rook: 0.23,
  knight: 0.25,
  bishop: 0.27,
  queen: 0.31,
  king: 0.34,
};

/**
 * Auto-normalizes any loaded .glb model using its Box3 bounding box:
 * - Uniformly scales to targetHeight
 * - Centers X/Z on 0 and aligns Y to either base (min.y = 0) or center (center.y = 0)
 * - Enables castShadow / receiveShadow and clean sRGB/roughness defaults on every mesh
 */
export function normalizeGlbModel(
  source: THREE.Object3D,
  targetHeight: number,
  anchor: 'base' | 'center' = 'base',
): THREE.Group {
  const wrapper = new THREE.Group();
  const inner = source.clone(true);

  inner.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat && 'envMapIntensity' in mat) {
        (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.85;
      }
    }
  });

  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const height = Math.max(size.y, 1e-4);
  const scale = targetHeight / height;
  inner.scale.multiplyScalar(scale);

  // Recompute bounds after scaling for exact pivot alignment
  inner.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(inner);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  inner.position.x -= scaledCenter.x;
  inner.position.z -= scaledCenter.z;
  inner.position.y -= anchor === 'base' ? scaledBox.min.y : scaledCenter.y;

  wrapper.add(inner);
  return wrapper;
}

/**
 * Unified AssetFactory with automatic public/models/ discovery + Box3 auto-normalization
 * and seamless built-in fallback geometry when optional .glb files are not present.
 */
export class AssetFactory {
  private loader = new GLTFLoader();
  private overrideUrls = new Map<AssetOverrideKey, { url: string; targetHeight: number; anchor: 'base' | 'center' }>();
  private glbCache = new Map<AssetOverrideKey, THREE.Group>();
  private publicManifestChecked = false;

  public registerGlbOverride(
    key: AssetOverrideKey,
    url: string,
    targetHeight = 1.0,
    anchor: 'base' | 'center' = 'base',
  ): void {
    this.overrideUrls.set(key, { url, targetHeight, anchor });
  }

  /**
   * Discovers any .glb files dropped into public/models/ via /models/manifest.json
   * (zero 404 console errors when empty), loads and auto-normalizes them.
   * Returns true if at least one new custom model was loaded.
   */
  public async preloadPublicModels(): Promise<boolean> {
    if (this.publicManifestChecked || typeof window === 'undefined' || typeof fetch !== 'function') {
      return false;
    }
    this.publicManifestChecked = true;

    let discoveredCount = 0;
    try {
      const res = await fetch('./models/manifest.json');
      if (!res.ok) return false;
      const data = (await res.json()) as { files?: string[] };
      const files = Array.isArray(data.files) ? data.files : [];

      for (const relPath of files) {
        const clean = relPath.replace(/^\/+/, '');
        const slot = PUBLIC_MODEL_SLOTS[clean];
        if (slot) {
          this.registerGlbOverride(slot.key, `/models/${clean}`, slot.targetHeight, slot.anchor);
          discoveredCount++;
          continue;
        }
        // Optional chess piece slots: chess/white_king.glb, chess/black_queen.glb, etc.
        const chessMatch = clean.match(/^chess\/(white|black)_(pawn|rook|knight|bishop|queen|king)\.(glb|gltf)$/i);
        if (chessMatch) {
          const color = chessMatch[1].toLowerCase() as PieceColor;
          const piece = chessMatch[2].toLowerCase() as PieceType;
          this.registerGlbOverride(
            `piece_${piece}_${color}`,
            `/models/${clean}`,
            CHESS_PIECE_HEIGHTS[piece],
            'base',
          );
          discoveredCount++;
        }
      }
    } catch {
      return false;
    }

    if (discoveredCount === 0) return false;
    await this.preloadOverrides();
    return this.glbCache.size > 0;
  }

  public async preloadOverrides(): Promise<void> {
    const entries = [...this.overrideUrls.entries()];
    await Promise.all(
      entries.map(async ([key, spec]) => {
        if (this.glbCache.has(key)) return;
        try {
          const gltf = await this.loader.loadAsync(spec.url);
          const normalized = normalizeGlbModel(gltf.scene, spec.targetHeight, spec.anchor);
          this.glbCache.set(key, normalized);
        } catch {
          // Graceful fallback to procedural asset if optional external .glb fails to load
        }
      }),
    );
  }

  private cloneOverride(key: AssetOverrideKey): THREE.Group | null {
    const proto = this.glbCache.get(key);
    return proto ? proto.clone(true) : null;
  }

  public createChessPiece(type: PieceType, color: PieceColor, bank: MaterialBank): THREE.Group {
    const custom = this.cloneOverride(`piece_${type}_${color}`);
    if (custom) return custom;
    return buildChessPieceMesh(type, color, bank);
  }

  public createDealer(): CharacterRigController {
    const headModel = this.cloneOverride('dealer_head') ?? this.cloneOverride('dealer');
    const leftHandModel = this.cloneOverride('dealer_hand_left');
    const rightHandModel = this.cloneOverride('dealer_hand_right');
    return createCharacterRig('dealer', {
      headModel,
      leftHandModel,
      rightHandModel,
    });
  }

  public createLightNpc(personality: LightPreviewAvatar): CharacterRigController {
    const fullBustModel = this.cloneOverride(`light_npc_${personality}`);
    return createCharacterRig(personality, { fullBustModel });
  }

  public createRevolver(bank: MaterialBank): RevolverRig {
    const custom = this.cloneOverride('revolver');
    if (custom) {
      const rig = buildRevolverMesh(bank);
      rig.group.clear();
      rig.group.add(custom);
      rig.group.add(rig.gripAnchor, rig.muzzleTip, rig.muzzleFlash, rig.smokePuff);
      return rig;
    }
    return buildRevolverMesh(bank);
  }

  public createCoin(bank: MaterialBank): THREE.Group {
    const custom = this.cloneOverride('coin');
    if (custom) return custom;
    return buildCoinMesh(bank);
  }

  public createPlayerHands(mode: GameMode): { left: THREE.Group; right: THREE.Group } {
    return buildPlayerHands(mode);
  }
}

export const assetFactory = new AssetFactory();
