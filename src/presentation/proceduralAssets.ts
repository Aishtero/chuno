import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PieceColor, PieceType } from '../core/chess/types';
import { CardType, GameMode, LightPreviewAvatar } from '../core/deck/cardData';

export interface MaterialBank {
  woodLight: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  woodLightBlood?: THREE.MeshStandardMaterial;
  woodDarkBlood?: THREE.MeshStandardMaterial;
  tableTop: THREE.MeshStandardMaterial;
  boardFrame: THREE.MeshStandardMaterial;
  whitePiece: THREE.MeshStandardMaterial;
  whitePieceCollar: THREE.MeshStandardMaterial;
  blackPiece: THREE.MeshStandardMaterial;
  blackPieceCollar: THREE.MeshStandardMaterial;
  gunMetal: THREE.MeshStandardMaterial;
  gunWood: THREE.MeshStandardMaterial;
  gunRubber: THREE.MeshStandardMaterial;
  brassCoin: THREE.MeshStandardMaterial;
  cardBack: THREE.MeshStandardMaterial;
  bloodDecal: THREE.MeshStandardMaterial;
}

function markShared<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(obj: T): T {
  obj.userData = { ...(obj.userData ?? {}), shared: true };
  return obj;
}

function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  if (!g.attributes.uv && pos) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
  }
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv') {
      g.deleteAttribute(key);
    }
  }
  return g;
}

function mergeNormalized(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = geos.map(normalizeForMerge);
  const merged = mergeGeometries(prepared, false);
  for (const p of prepared) p.dispose();
  if (!merged) {
    return markShared(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  }
  merged.computeBoundingSphere();
  return markShared(merged);
}

function seededNoise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Paints asymmetric ragged blood splatters, drag smears, and micro-droplet streaks
 * along with matching damp-vs-dry roughness contrast on an optional roughness context.
 */
function paintOrganicBloodSplatter(
  ctx: CanvasRenderingContext2D,
  rCtx: CanvasRenderingContext2D | null,
  cx: number,
  cy: number,
  scale: number,
  seed: number,
): void {
  const lobes = 16;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const n1 = seededNoise(seed + i * 3.1);
    const n2 = seededNoise(seed + i * 7.7 + 19);
    const rad = scale * (0.38 + Math.pow(n1, 1.5) * 0.72 + (n2 > 0.78 ? 0.42 : 0));
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad * (0.72 + seededNoise(seed + 41) * 0.48);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx, cy, scale * 0.1, cx, cy, scale * 1.15);
  grad.addColorStop(0, 'rgba(62, 5, 6, 0.96)');
  grad.addColorStop(0.55, 'rgba(104, 12, 12, 0.88)');
  grad.addColorStop(1, 'rgba(54, 7, 7, 0.45)');
  ctx.fillStyle = grad;
  ctx.fill();

  if (rCtx) {
    rCtx.save();
    rCtx.beginPath();
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const n1 = seededNoise(seed + i * 3.1);
      const n2 = seededNoise(seed + i * 7.7 + 19);
      const rad = scale * (0.38 + Math.pow(n1, 1.5) * 0.72 + (n2 > 0.78 ? 0.42 : 0));
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad * (0.72 + seededNoise(seed + 41) * 0.48);
      if (i === 0) rCtx.moveTo(px, py);
      else rCtx.lineTo(px, py);
    }
    rCtx.closePath();
    // Pooled wet center = lower roughness (0.28), outer dried edge = rougher (0.68)
    const rGrad = rCtx.createRadialGradient(cx, cy, scale * 0.08, cx, cy, scale * 1.05);
    rGrad.addColorStop(0, 'rgba(72, 72, 72, 0.92)');
    rGrad.addColorStop(0.65, 'rgba(130, 130, 130, 0.72)');
    rGrad.addColorStop(1, 'rgba(185, 185, 185, 0.25)');
    rCtx.fillStyle = rGrad;
    rCtx.fill();
    rCtx.restore();
  }

  // Directional smear / wipe streaks
  const smearCount = 2 + Math.floor(seededNoise(seed + 55) * 3);
  for (let s = 0; s < smearCount; s++) {
    const ang = seededNoise(seed + 70 + s * 5) * Math.PI * 2;
    const len = scale * (1.2 + seededNoise(seed + 71 + s * 5) * 2.1);
    const ex = cx + Math.cos(ang) * len;
    const ey = cy + Math.sin(ang) * len;
    const ctrlX = cx + Math.cos(ang + 0.35) * len * 0.52;
    const ctrlY = cy + Math.sin(ang + 0.35) * len * 0.52;

    const sGrad = ctx.createLinearGradient(cx, cy, ex, ey);
    sGrad.addColorStop(0, 'rgba(78, 9, 9, 0.72)');
    sGrad.addColorStop(0.6, 'rgba(62, 10, 10, 0.35)');
    sGrad.addColorStop(1, 'rgba(48, 8, 8, 0)');
    ctx.strokeStyle = sGrad;
    ctx.lineWidth = Math.max(1.5, scale * (0.24 - s * 0.04));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang + 1.2) * scale * 0.25, cy + Math.sin(ang + 1.2) * scale * 0.25);
    ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
    ctx.stroke();
  }

  // Elongated tiny satellite splash droplets flung radially outward
  const dropCount = 9;
  for (let d = 0; d < dropCount; d++) {
    const da = seededNoise(seed + 130 + d * 4) * Math.PI * 2;
    const dist = scale * (0.85 + seededNoise(seed + 131 + d * 4) * 1.9);
    const dx = cx + Math.cos(da) * dist;
    const dy = cy + Math.sin(da) * dist;
    const rx = 1.0 + seededNoise(seed + 132 + d * 4) * 2.8;
    const ry = rx * (0.4 + seededNoise(seed + 133 + d * 4) * 0.45);
    ctx.fillStyle = d % 2 === 0 ? 'rgba(84, 10, 10, 0.76)' : 'rgba(58, 7, 7, 0.65)';
    ctx.beginPath();
    ctx.ellipse(dx, dy, rx, ry, da, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function createWoodCanvasTexture(
  baseHex: string,
  grainHex: string,
  options: {
    scratches?: number;
    grime?: boolean;
    bloodSplatters?: number;
    seed?: number;
  } = {},
): { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  rCtx.fillStyle = options.grime ? '#cfcfcf' : '#969696';
  rCtx.fillRect(0, 0, 256, 256);

  // Natural wood grain lines
  ctx.strokeStyle = grainHex;
  ctx.globalAlpha = 0.24;
  bCtx.strokeStyle = '#686868';
  bCtx.globalAlpha = 0.32;
  for (let y = 0; y < 256; y += 5) {
    const lw = 0.9 + (y % 3 === 0 ? 1.2 : 0.35);
    ctx.lineWidth = lw;
    bCtx.lineWidth = lw;
    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(0, y);
    bCtx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) {
      const dy = Math.sin(x * 0.045 + y * 0.09) * 2.8;
      ctx.lineTo(x, y + dy);
      bCtx.lineTo(x, y + dy);
    }
    ctx.stroke();
    bCtx.stroke();
  }
  ctx.globalAlpha = 1;
  bCtx.globalAlpha = 1;

  const seed = options.seed ?? 1;

  // Uneven wear & grime smudges
  if (options.grime) {
    for (let i = 0; i < 14; i++) {
      const gx = seededNoise(seed + i * 3) * 256;
      const gy = seededNoise(seed + i * 3 + 1) * 256;
      const gr = 18 + seededNoise(seed + i * 3 + 2) * 38;
      const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
      grad.addColorStop(0, 'rgba(14, 10, 7, 0.34)');
      grad.addColorStop(1, 'rgba(14, 10, 7, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
  }

  // Knife/claw scratches
  const scratchCount = options.scratches ?? 0;
  for (let i = 0; i < scratchCount; i++) {
    const x1 = seededNoise(seed + 100 + i * 4) * 240 + 8;
    const y1 = seededNoise(seed + 101 + i * 4) * 240 + 8;
    const len = 18 + seededNoise(seed + 102 + i * 4) * 62;
    const ang = seededNoise(seed + 103 + i * 4) * Math.PI * 2;
    const x2 = x1 + Math.cos(ang) * len;
    const y2 = y1 + Math.sin(ang) * len;

    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = '#17100b';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    bCtx.globalAlpha = 0.8;
    bCtx.strokeStyle = '#222222';
    bCtx.lineWidth = 1.6;
    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.stroke();
  }
  ctx.globalAlpha = 1;
  bCtx.globalAlpha = 1;

  // Ragged asymmetric crimson splatters & drag smears (zero polka dots)
  const bloodCount = options.bloodSplatters ?? 0;
  for (let i = 0; i < bloodCount; i++) {
    const bx = 42 + seededNoise(seed + 200 + i * 5) * 172;
    const by = 42 + seededNoise(seed + 201 + i * 5) * 172;
    const scale = 14 + seededNoise(seed + 202 + i * 5) * 22;
    paintOrganicBloodSplatter(ctx, rCtx, bx, by, scale, seed + 500 + i * 37);
  }

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { colorMap, bumpMap, roughnessMap };
}

/**
 * Weathered bone / cast-iron surface for Survival chess pieces:
 * fine streaks, fracture hairlines, and base dirt — zero round dots.
 */
function createSurvivalPieceTexture(
  baseHex: string,
  streakHex: string,
  dirtHex: string,
  seed: number,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle vertical weathered grain streaks
  for (let i = 0; i < 48; i++) {
    const x = seededNoise(seed + i * 3) * 128;
    const y = seededNoise(seed + i * 3 + 1) * 110;
    const h = 10 + seededNoise(seed + i * 3 + 2) * 34;
    ctx.strokeStyle = streakHex;
    ctx.globalAlpha = 0.14 + seededNoise(seed + i * 7) * 0.18;
    ctx.lineWidth = 0.8 + (i % 2) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededNoise(seed + i * 11) - 0.5) * 4, y + h);
    ctx.stroke();
  }

  // Hairline cracks
  ctx.globalAlpha = 0.36;
  ctx.strokeStyle = '#1b1410';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    let cx = seededNoise(seed + 80 + i * 5) * 110 + 9;
    let cy = seededNoise(seed + 81 + i * 5) * 85 + 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      cx += (seededNoise(seed + 120 + i * 9 + seg) - 0.5) * 14;
      cy += 6 + seededNoise(seed + 140 + i * 9 + seg) * 10;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Gradual dirt & dried grime accumulating near base (y > 88 in lathe V coordinates)
  ctx.globalAlpha = 1;
  const dirtGrad = ctx.createLinearGradient(0, 0, 0, 128);
  dirtGrad.addColorStop(0, 'rgba(0,0,0,0)');
  dirtGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
  dirtGrad.addColorStop(1, dirtHex);
  ctx.fillStyle = dirtGrad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLightPieceWoodTexture(baseHex: string, grainHex: string, seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = grainHex;
  ctx.globalAlpha = 0.16;
  for (let x = 0; x < 128; x += 4) {
    ctx.lineWidth = 0.8 + (seededNoise(seed + x) > 0.6 ? 0.7 : 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= 128; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.08 + x * 0.15) * 2.2, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCardBackTexture(mode: GameMode): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  const isSurv = mode === 'survival';

  ctx.fillStyle = isSurv ? '#260b0e' : '#1b3554';
  ctx.fillRect(0, 0, 256, 360);

  // Subtle crosshatch linen weave
  ctx.strokeStyle = isSurv ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = -360; i < 360; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 360);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 256, 0);
    ctx.lineTo(i, 360);
    ctx.stroke();
  }

  // Ornate border
  ctx.strokeStyle = isSurv ? '#9c7848' : '#e8dec8';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 228, 332);
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, 204, 308);

  // Center diamond & crown motif
  ctx.save();
  ctx.translate(128, 180);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = isSurv ? '#8b1e1e' : '#d6b66f';
  ctx.lineWidth = 3;
  ctx.strokeRect(-42, -42, 84, 84);
  ctx.restore();

  ctx.fillStyle = isSurv ? '#b8945e' : '#f2e8cf';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♛', 128, 180);

  // Corner grime/scuffs in Survival Mode
  if (isSurv) {
    for (let i = 0; i < 10; i++) {
      const gx = seededNoise(900 + i * 3) * 256;
      const gy = seededNoise(901 + i * 3) * 360;
      const gr = 16 + seededNoise(902 + i * 3) * 34;
      const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
      grad.addColorStop(0, 'rgba(10, 6, 5, 0.45)');
      grad.addColorStop(1, 'rgba(10, 6, 5, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let skullTexCache: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
function createCrackedSkullTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (skullTexCache) return skullTexCache;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const b = document.createElement('canvas');
  b.width = 256;
  b.height = 256;
  const bCtx = b.getContext('2d')!;

  // Muted ash-gray matte bone base (#7c7770) — zero plastic glare
  ctx.fillStyle = '#7c7770';
  ctx.fillRect(0, 0, 256, 256);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  // Subtle grime & aged soot patches
  for (let i = 0; i < 22; i++) {
    const gx = seededNoise(31 + i * 3) * 256;
    const gy = seededNoise(32 + i * 3) * 256;
    const gr = 14 + seededNoise(33 + i * 3) * 32;
    const grad = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
    grad.addColorStop(0, 'rgba(26, 23, 20, 0.36)');
    grad.addColorStop(1, 'rgba(26, 23, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }

  // Hairline skull fractures
  ctx.strokeStyle = '#332e29';
  ctx.lineWidth = 1.25;
  bCtx.strokeStyle = '#242424';
  bCtx.lineWidth = 1.8;
  for (let i = 0; i < 8; i++) {
    let x = 20 + seededNoise(60 + i * 7) * 216;
    let y = 20 + seededNoise(61 + i * 7) * 216;
    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(x, y);
    bCtx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (seededNoise(90 + i * 11 + s) - 0.5) * 32;
      y += (seededNoise(91 + i * 11 + s) - 0.5) * 32;
      ctx.lineTo(x, y);
      bCtx.lineTo(x, y);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  const map = markShared(new THREE.CanvasTexture(c));
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = markShared(new THREE.CanvasTexture(b));
  skullTexCache = { map, bumpMap };
  return skullTexCache;
}

let concreteTexCache: THREE.CanvasTexture | null = null;
export function createConcreteWallTexture(): THREE.CanvasTexture {
  if (concreteTexCache) return concreteTexCache;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1b1817';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#110e0d';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    const offset = (y / 32) % 2 === 0 ? 0 : 32;
    for (let x = offset; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 32);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 16; i++) {
    const dx = seededNoise(i * 5 + 1) * 256;
    const dy = seededNoise(i * 5 + 2) * 140;
    const dh = 40 + seededNoise(i * 5 + 3) * 100;
    const grad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    grad.addColorStop(0, 'rgba(8, 6, 5, 0.55)');
    grad.addColorStop(1, 'rgba(8, 6, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(dx, dy, 4 + (i % 5), dh);
  }

  const tex = markShared(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  concreteTexCache = tex;
  return tex;
}

function createBloodDecalTextures(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const r = document.createElement('canvas');
  r.width = 256;
  r.height = 256;
  const rCtx = r.getContext('2d')!;
  rCtx.fillStyle = '#d4d4d4';
  rCtx.fillRect(0, 0, 256, 256);

  paintOrganicBloodSplatter(ctx, rCtx, 128, 128, 46, 707);
  paintOrganicBloodSplatter(ctx, rCtx, 102, 146, 24, 913);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(r);
  return { map, roughnessMap };
}

const materialBankCache = new Map<GameMode, MaterialBank>();

export function createMaterialBank(mode: GameMode, maxAniso: number): MaterialBank {
  const cached = materialBankCache.get(mode);
  if (cached) return cached;

  const isSurv = mode === 'survival';
  const aniso = Math.min(4, Math.max(1, maxAniso));

  const tableMaps = createWoodCanvasTexture(
    isSurv ? '#261b14' : '#96653f',
    isSurv ? '#120b07' : '#6c4223',
    isSurv ? { scratches: 28, grime: true, bloodSplatters: 2, seed: 42 } : {},
  );
  tableMaps.colorMap.anisotropy = aniso;

  const lightSqMaps = createWoodCanvasTexture(
    isSurv ? '#a69478' : '#edd9b8',
    isSurv ? '#78664e' : '#d5be96',
    isSurv ? { scratches: 8, grime: true, seed: 11 } : {},
  );
  lightSqMaps.colorMap.anisotropy = aniso;

  const darkSqMaps = createWoodCanvasTexture(
    isSurv ? '#3a271c' : '#7a4d2d',
    isSurv ? '#1d120b' : '#563218',
    isSurv ? { scratches: 8, grime: true, seed: 22 } : {},
  );
  darkSqMaps.colorMap.anisotropy = aniso;

  const lightBloodMaps = isSurv
    ? createWoodCanvasTexture('#a69478', '#78664e', { scratches: 10, grime: true, bloodSplatters: 2, seed: 77 })
    : null;
  const darkBloodMaps = isSurv
    ? createWoodCanvasTexture('#3a271c', '#1d120b', { scratches: 10, grime: true, bloodSplatters: 2, seed: 88 })
    : null;

  const frameMaps = isSurv
    ? createWoodCanvasTexture('#1c1410', '#0c0805', { scratches: 18, grime: true, bloodSplatters: 2, seed: 55 })
    : null;

  const whiteTex = isSurv
    ? createSurvivalPieceTexture('#bcae8e', '#756649', 'rgba(34, 24, 15, 0.55)', 19)
    : createLightPieceWoodTexture('#e6d5b5', '#c8af86', 17);
  const blackTex = isSurv
    ? createSurvivalPieceTexture('#1f1b1b', '#423632', 'rgba(8, 6, 6, 0.65)', 31)
    : createLightPieceWoodTexture('#291e19', '#140e0b', 29);

  const cardBackTex = createCardBackTexture(mode);
  cardBackTex.anisotropy = aniso;

  const bloodDecalMaps = createBloodDecalTextures();

  // Mark pooled textures shared so world rebuild disposal preserves them
  for (const t of [
    tableMaps.colorMap, tableMaps.bumpMap, tableMaps.roughnessMap,
    lightSqMaps.colorMap, lightSqMaps.bumpMap, lightSqMaps.roughnessMap,
    darkSqMaps.colorMap, darkSqMaps.bumpMap, darkSqMaps.roughnessMap,
    whiteTex, blackTex, cardBackTex, bloodDecalMaps.map, bloodDecalMaps.roughnessMap,
  ]) {
    markShared(t);
  }
  if (lightBloodMaps) {
    markShared(lightBloodMaps.colorMap);
    markShared(lightBloodMaps.bumpMap);
    markShared(lightBloodMaps.roughnessMap);
  }
  if (darkBloodMaps) {
    markShared(darkBloodMaps.colorMap);
    markShared(darkBloodMaps.bumpMap);
    markShared(darkBloodMaps.roughnessMap);
  }
  if (frameMaps) {
    markShared(frameMaps.colorMap);
    markShared(frameMaps.bumpMap);
    markShared(frameMaps.roughnessMap);
  }

  const bank: MaterialBank = {
    woodLight: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: lightSqMaps.colorMap,
      ...(isSurv ? { bumpMap: lightSqMaps.bumpMap, bumpScale: 0.012 } : {}),
      roughness: isSurv ? 0.82 : 0.58,
      metalness: 0.04,
    })),
    woodDark: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkSqMaps.colorMap,
      ...(isSurv ? { bumpMap: darkSqMaps.bumpMap, bumpScale: 0.012 } : {}),
      roughness: isSurv ? 0.84 : 0.6,
      metalness: 0.04,
    })),
    woodLightBlood: lightBloodMaps
      ? markShared(new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: lightBloodMaps.colorMap,
          bumpMap: lightBloodMaps.bumpMap,
          bumpScale: 0.014,
          roughnessMap: lightBloodMaps.roughnessMap,
          roughness: 0.92,
          metalness: 0.04,
        }))
      : undefined,
    woodDarkBlood: darkBloodMaps
      ? markShared(new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: darkBloodMaps.colorMap,
          bumpMap: darkBloodMaps.bumpMap,
          bumpScale: 0.014,
          roughnessMap: darkBloodMaps.roughnessMap,
          roughness: 0.94,
          metalness: 0.04,
        }))
      : undefined,
    tableTop: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tableMaps.colorMap,
      ...(isSurv ? { bumpMap: tableMaps.bumpMap, bumpScale: 0.015, roughnessMap: tableMaps.roughnessMap } : {}),
      roughness: isSurv ? 0.88 : 0.55,
      metalness: 0.04,
    })),
    boardFrame: markShared(new THREE.MeshStandardMaterial({
      color: frameMaps ? 0xffffff : 0x4b2e19,
      ...(frameMaps ? { map: frameMaps.colorMap, bumpMap: frameMaps.bumpMap, bumpScale: 0.012 } : {}),
      roughness: isSurv ? 0.8 : 0.44,
      metalness: 0.08,
    })),
    whitePiece: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: whiteTex,
      roughness: isSurv ? 0.72 : 0.34,
      metalness: 0.03,
    })),
    whitePieceCollar: markShared(new THREE.MeshStandardMaterial({
      color: isSurv ? 0x6b5a42 : 0xe0cfa9,
      roughness: isSurv ? 0.78 : 0.38,
      metalness: isSurv ? 0.14 : 0.04,
    })),
    blackPiece: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: blackTex,
      roughness: isSurv ? 0.68 : 0.28,
      metalness: isSurv ? 0.36 : 0.06,
    })),
    blackPieceCollar: markShared(new THREE.MeshStandardMaterial({
      color: isSurv ? 0x3b2a28 : 0x1c1411,
      roughness: isSurv ? 0.62 : 0.3,
      metalness: isSurv ? 0.32 : 0.06,
    })),
    gunMetal: markShared(new THREE.MeshStandardMaterial({
      color: 0x272a30,
      roughness: 0.38,
      metalness: 0.78,
    })),
    gunWood: markShared(new THREE.MeshStandardMaterial({
      color: 0x472312,
      roughness: 0.66,
      metalness: 0.04,
    })),
    gunRubber: markShared(new THREE.MeshStandardMaterial({
      color: 0x111214,
      roughness: 0.92,
      metalness: 0.02,
    })),
    brassCoin: markShared(new THREE.MeshStandardMaterial({
      color: 0xd6a638,
      roughness: 0.22,
      metalness: 0.9,
    })),
    cardBack: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cardBackTex,
      roughness: isSurv ? 0.88 : 0.82,
      metalness: 0.02,
    })),
    bloodDecal: markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bloodDecalMaps.map,
      roughnessMap: bloodDecalMaps.roughnessMap,
      roughness: 0.85,
      metalness: 0.04,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })),
  };

  materialBankCache.set(mode, bank);
  return bank;
}

// Merged & Cached Staunton Piece Geometries (1-2 draw calls per piece type)
const pieceMergedCache = new Map<string, { body: THREE.BufferGeometry; accent?: THREE.BufferGeometry }>();

function makeLathe(pts: [number, number][], segments = 20): THREE.BufferGeometry {
  const vecs = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

function getMergedPieceGeos(type: PieceType): { body: THREE.BufferGeometry; accent?: THREE.BufferGeometry } {
  const cached = pieceMergedCache.get(type);
  if (cached) return cached;

  let result: { body: THREE.BufferGeometry; accent?: THREE.BufferGeometry };

  if (type === 'pawn') {
    const pts: [number, number][] = [
      [0.001, 0], [0.105, 0], [0.106, 0.018], [0.095, 0.032], [0.1, 0.044],
      [0.078, 0.064], [0.064, 0.095], [0.048, 0.155], [0.036, 0.215],
      [0.058, 0.232], [0.058, 0.242], [0.036, 0.252],
    ];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.36 + (i / 10) * Math.PI * 0.86;
      pts.push([Math.max(0.001, Math.cos(a) * 0.06), 0.304 + Math.sin(a) * 0.062]);
    }
    const g = markShared(makeLathe(pts, 20));
    result = { body: g };
  } else if (type === 'rook') {
    const pts: [number, number][] = [
      [0.001, 0], [0.114, 0], [0.115, 0.02], [0.102, 0.036], [0.107, 0.05],
      [0.084, 0.072], [0.074, 0.12], [0.066, 0.2], [0.059, 0.285], [0.076, 0.302],
      [0.086, 0.328], [0.086, 0.388], [0.056, 0.388], [0.054, 0.348], [0.001, 0.348],
    ];
    const parts: THREE.BufferGeometry[] = [makeLathe(pts, 20)];
    const mBase = new THREE.BoxGeometry(0.036, 0.048, 0.03);
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const m = mBase.clone();
      m.rotateY(-ang);
      m.translate(Math.cos(ang) * 0.071, 0.412, Math.sin(ang) * 0.071);
      parts.push(m);
    }
    mBase.dispose();
    result = { body: mergeNormalized(parts) };
    for (const p of parts) p.dispose();
  } else if (type === 'knight') {
    // Bulky sculptural Staunton Knight (pedestal + beveled thick horse head + tapered 3D snout + flared ears + flowing mane)
    const pedPts: [number, number][] = [
      [0.001, 0], [0.116, 0], [0.117, 0.022], [0.104, 0.038], [0.11, 0.054],
      [0.086, 0.078], [0.08, 0.112], [0.086, 0.132], [0.072, 0.145], [0.001, 0.145],
    ];
    const ped = makeLathe(pedPts, 20);

    // Sculpted side profile extruded thick along Z then rotated +90° Y so muzzle points -Z
    const headShape = new THREE.Shape();
    headShape.moveTo(-0.074, 0.138);
    headShape.bezierCurveTo(-0.095, 0.22, -0.084, 0.32, -0.052, 0.405);
    headShape.lineTo(-0.044, 0.482);
    headShape.lineTo(-0.008, 0.445);
    headShape.lineTo(0.016, 0.468);
    headShape.bezierCurveTo(0.052, 0.432, 0.086, 0.39, 0.118, 0.34);
    headShape.lineTo(0.124, 0.302);
    headShape.lineTo(0.082, 0.288);
    headShape.bezierCurveTo(0.052, 0.304, 0.032, 0.326, 0.028, 0.344);
    headShape.bezierCurveTo(0.076, 0.285, 0.084, 0.205, 0.074, 0.138);
    headShape.closePath();

    const headGeo = new THREE.ExtrudeGeometry(headShape, {
      depth: 0.104,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 14,
    });
    headGeo.translate(0, 0, -0.052);
    headGeo.rotateY(Math.PI / 2);

    // Volumetric chest & cheek roundness so front/top views read sculptural rather than slab-like
    const chestSphere = new THREE.SphereGeometry(0.076, 14, 10);
    chestSphere.scale(0.98, 1.35, 1.05);
    chestSphere.translate(0, 0.235, -0.008);

    const muzzleCone = new THREE.CylinderGeometry(0.032, 0.056, 0.095, 12);
    muzzleCone.rotateX(Math.PI / 2 + 0.38);
    muzzleCone.scale(0.95, 0.9, 1);
    muzzleCone.translate(0, 0.33, -0.085);

    const earL = new THREE.ConeGeometry(0.024, 0.068, 6);
    earL.rotateX(-0.18);
    earL.rotateZ(0.22);
    earL.translate(-0.034, 0.455, 0.026);

    const earR = new THREE.ConeGeometry(0.024, 0.068, 6);
    earR.rotateX(-0.18);
    earR.rotateZ(-0.22);
    earR.translate(0.034, 0.455, 0.026);

    const bodyParts = [ped, headGeo, chestSphere, muzzleCone, earL, earR];
    const body = mergeNormalized(bodyParts);
    for (const p of bodyParts) p.dispose();

    // Thick flowing sculpted mane ridge along back of neck
    const maneShape = new THREE.Shape();
    maneShape.moveTo(-0.078, 0.15);
    maneShape.bezierCurveTo(-0.114, 0.225, -0.112, 0.338, -0.068, 0.422);
    maneShape.lineTo(-0.044, 0.412);
    maneShape.bezierCurveTo(-0.074, 0.325, -0.078, 0.218, -0.058, 0.15);
    maneShape.closePath();

    const maneGeo = new THREE.ExtrudeGeometry(maneShape, {
      depth: 0.044,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.009,
      bevelSegments: 2,
      curveSegments: 10,
    });
    maneGeo.translate(0, 0, -0.022);
    maneGeo.rotateY(Math.PI / 2);
    const accent = mergeNormalized([maneGeo]);
    maneGeo.dispose();

    result = { body, accent };
  } else if (type === 'bishop') {
    const pts: [number, number][] = [
      [0.001, 0], [0.112, 0], [0.113, 0.02], [0.1, 0.036], [0.105, 0.048],
      [0.08, 0.07], [0.066, 0.13], [0.052, 0.21], [0.04, 0.28], [0.068, 0.298],
      [0.068, 0.31], [0.046, 0.322], [0.065, 0.358], [0.066, 0.394], [0.05, 0.432],
      [0.026, 0.464], [0.014, 0.474], [0.024, 0.492], [0.018, 0.508], [0.001, 0.514],
    ];
    const body = markShared(makeLathe(pts, 20));
    const cleft = new THREE.BoxGeometry(0.09, 0.012, 0.045);
    cleft.rotateZ(0.62);
    cleft.translate(0.028, 0.405, 0);
    const accent = mergeNormalized([cleft]);
    cleft.dispose();
    result = { body, accent };
  } else if (type === 'queen') {
    const pts: [number, number][] = [
      [0.001, 0], [0.118, 0], [0.12, 0.022], [0.106, 0.04], [0.111, 0.054],
      [0.086, 0.078], [0.074, 0.14], [0.058, 0.24], [0.045, 0.34], [0.078, 0.362],
      [0.078, 0.376], [0.052, 0.39], [0.072, 0.44], [0.092, 0.486], [0.07, 0.488],
      [0.054, 0.514], [0.02, 0.53], [0.022, 0.548], [0.001, 0.558],
    ];
    const bodyParts: THREE.BufferGeometry[] = [makeLathe(pts, 22)];
    const accentParts: THREE.BufferGeometry[] = [];
    const spikeBase = new THREE.ConeGeometry(0.014, 0.048, 6);
    const pearlBase = new THREE.SphereGeometry(0.012, 7, 5);
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8;
      const spike = spikeBase.clone();
      spike.rotateZ(-Math.cos(ang) * 0.22);
      spike.rotateX(Math.sin(ang) * 0.22);
      spike.translate(Math.cos(ang) * 0.078, 0.508, Math.sin(ang) * 0.078);
      bodyParts.push(spike);

      const pearl = pearlBase.clone();
      pearl.translate(Math.cos(ang) * 0.082, 0.532, Math.sin(ang) * 0.082);
      accentParts.push(pearl);
    }
    spikeBase.dispose();
    pearlBase.dispose();
    const body = mergeNormalized(bodyParts);
    const accent = mergeNormalized(accentParts);
    for (const p of bodyParts) p.dispose();
    for (const p of accentParts) p.dispose();
    result = { body, accent };
  } else {
    // King: lathe + merged vertical/horizontal cross
    const pts: [number, number][] = [
      [0.001, 0], [0.122, 0], [0.124, 0.022], [0.11, 0.04], [0.115, 0.056],
      [0.09, 0.082], [0.078, 0.16], [0.062, 0.27], [0.05, 0.37], [0.084, 0.394],
      [0.084, 0.41], [0.058, 0.425], [0.082, 0.478], [0.098, 0.525], [0.078, 0.542],
      [0.032, 0.556], [0.001, 0.562],
    ];
    const body = markShared(makeLathe(pts, 22));
    const crossV = new THREE.BoxGeometry(0.026, 0.108, 0.026);
    crossV.translate(0, 0.606, 0);
    const crossH = new THREE.BoxGeometry(0.084, 0.026, 0.026);
    crossH.translate(0, 0.622, 0);
    const accent = mergeNormalized([crossV, crossH]);
    crossV.dispose();
    crossH.dispose();
    result = { body, accent };
  }

  pieceMergedCache.set(type, result);
  return result;
}

/**
 * Generates pooled, merged Staunton chess piece meshes (1-2 draw calls per piece)
 * with bottom-center pivot strictly at y = 0.
 */
export function buildChessPieceMesh(
  type: PieceType,
  color: PieceColor,
  bank: MaterialBank,
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = color === 'white' ? bank.whitePiece : bank.blackPiece;
  const accentMat = color === 'white' ? bank.whitePieceCollar : bank.blackPieceCollar;
  const { body, accent } = getMergedPieceGeos(type);

  const bodyMesh = new THREE.Mesh(body, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  if (accent) {
    const accentMesh = new THREE.Mesh(accent, accentMat);
    accentMesh.castShadow = true;
    group.add(accentMesh);
  }

  if (type === 'knight') {
    // Knights face squarely toward opponent with a noble 8° angle
    group.rotation.y = color === 'black' ? Math.PI - 0.14 : 0.14;
  }

  return group;
}

const cardFaceMatCache = new Map<string, THREE.MeshStandardMaterial>();

export function getCardFaceMaterial(card: CardType, mode: GameMode): THREE.MeshStandardMaterial {
  const key = `${mode}:${card}`;
  const cached = cardFaceMatCache.get(key);
  if (cached) return cached;

  const isSurv = mode === 'survival';
  const faceTex = markShared(createCardFaceTexture(card, mode));
  faceTex.anisotropy = 4;
  // Matte paper stock (roughness 0.94, metalness 0) + subtle self-lit face map so overhead
  // lamps never create a blinding specular hotspot on the card digits/symbols.
  const mat = markShared(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: faceTex,
    emissive: 0xffffff,
    emissiveMap: faceTex,
    emissiveIntensity: isSurv ? 0.34 : 0.14,
    roughness: 0.94,
    metalness: 0,
  }));
  cardFaceMatCache.set(key, mat);
  return mat;
}

export function createCardFaceTexture(card: CardType, mode: GameMode): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  const isSurv = mode === 'survival';
  ctx.fillStyle = card === 'BULLET' ? '#1c0b0c' : isSurv ? '#1c1917' : '#faf6ee';
  ctx.fillRect(0, 0, 256, 360);

  const accent =
    card === 'BULLET'
      ? '#ef4444'
      : card === 'WILD'
        ? isSurv ? '#f59e0b' : '#b45309'
        : card === 'REVERSE'
          ? isSurv ? '#38bdf8' : '#0369a1'
          : card === 'SKIP'
            ? isSurv ? '#fb7185' : '#be123c'
            : card === 'PLUS_2' || card === 'PLUS_4'
              ? isSurv ? '#4ade80' : '#15803d'
              : isSurv
                ? '#e2b974'
                : '#8b5e3c';

  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 332);

  ctx.strokeStyle = isSurv ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, 204, 308);

  let mainLabel = '';
  let subLabel = '';
  switch (card) {
    case 'NUM_1': mainLabel = '1'; subLabel = 'MOVE'; break;
    case 'NUM_2': mainLabel = '2'; subLabel = 'MOVES'; break;
    case 'NUM_3': mainLabel = '3'; subLabel = 'MOVES'; break;
    case 'NUM_4': mainLabel = '4'; subLabel = 'MOVES'; break;
    case 'NUM_5': mainLabel = '5'; subLabel = 'MOVES'; break;
    case 'SKIP': mainLabel = '⊘'; subLabel = 'SKIP'; break;
    case 'REVERSE': mainLabel = '⇄'; subLabel = 'REVERSE'; break;
    case 'PLUS_2': mainLabel = '+2'; subLabel = 'REVIVE'; break;
    case 'PLUS_4': mainLabel = '+4'; subLabel = 'REVIVE'; break;
    case 'WILD': mainLabel = '★'; subLabel = 'WILD'; break;
    case 'BULLET': mainLabel = '•'; subLabel = 'BULLET'; break;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (card === 'BULLET') {
    // Stylized 6-chamber revolver cylinder silhouette behind an upright brass cartridge
    ctx.save();
    ctx.translate(128, 150);

    ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = i === 0 ? 'rgba(220, 38, 38, 0.45)' : 'rgba(220, 38, 38, 0.18)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 44, Math.sin(a) * 44, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Upright brass cartridge & copper bullet tip
    const brassGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    brassGrad.addColorStop(0, '#92671d');
    brassGrad.addColorStop(0.45, '#f2cc68');
    brassGrad.addColorStop(1, '#7a5212');
    ctx.fillStyle = brassGrad;
    ctx.fillRect(-19, -12, 38, 72);
    // Cartridge rim
    ctx.fillStyle = '#d4a644';
    ctx.fillRect(-23, 56, 46, 9);

    // Copper-jacketed ogive bullet tip
    const copperGrad = ctx.createLinearGradient(-15, -62, 15, -12);
    copperGrad.addColorStop(0, '#fca5a5');
    copperGrad.addColorStop(0.5, '#d97742');
    copperGrad.addColorStop(1, '#7c2d12');
    ctx.fillStyle = copperGrad;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.quadraticCurveTo(-15, -48, 0, -68);
    ctx.quadraticCurveTo(15, -48, 16, -12);
    ctx.closePath();
    ctx.fill();

    // Rim crimp line
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-19, -12);
    ctx.lineTo(19, -12);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(subLabel, 128, 272);

    // Minimalist corner cartridge pips
    const drawCornerCartridge = (cx: number, cy: number) => {
      ctx.fillStyle = '#d97742';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 2);
      ctx.lineTo(cx, cy - 13);
      ctx.lineTo(cx + 5, cy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 5, cy - 2, 10, 14);
      ctx.fillRect(cx - 6, cy + 11, 12, 3);
    };
    drawCornerCartridge(46, 52);
    drawCornerCartridge(210, 308);
  } else {
    ctx.fillStyle = isSurv ? '#f5efe6' : '#1e1b18';
    ctx.font = 'bold 104px Georgia, serif';
    ctx.fillText(mainLabel, 128, 168);

    ctx.fillStyle = accent;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(subLabel, 128, 266);

    ctx.font = 'bold 26px monospace';
    ctx.fillText(mainLabel, 48, 52);
    ctx.fillText(mainLabel, 208, 312);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface RevolverRig {
  group: THREE.Group;
  gripAnchor: THREE.Object3D;
  muzzleTip: THREE.Object3D;
  cylinderPivot: THREE.Group;
  hammerPivot: THREE.Group;
  muzzleFlash: THREE.Group;
  smokePuff: THREE.Mesh;
}

let revolverGeoCache: {
  grip: THREE.BufferGeometry;
  frame: THREE.BufferGeometry;
  cylinderBody: THREE.BufferGeometry;
  cylinderFlutes: THREE.BufferGeometry;
  cartridgeRims: THREE.BufferGeometry;
  hammer: THREE.BufferGeometry;
  darkAccents: THREE.BufferGeometry;
} | null = null;

/**
 * Heavy .357 / .44 Magnum Revolver (PSX / low-poly Buckshot aesthetic):
 * - Curved beveled walnut grip + steel butt cap
 * - Blued steel frame with cylinder window, top strap, trigger guard & curved trigger
 * - Heavy barrel + underlug + triangular front blade sight + dark recessed bore
 * - Separate rotating 6-chamber fluted cylinderPivot with brass cartridge rims
 * - Separate cockable hammerPivot + hidden muzzle flash starburst & smoke puff
 */
export function buildRevolverMesh(bank: MaterialBank): RevolverRig {
  if (!revolverGeoCache) {
    // 1. Curved ergonomic walnut grip extruded in side profile (X=Z-forward, Y=up -> rotateY(Math.PI/2) => -Z barrel, +Z rear)
    const gripShape = new THREE.Shape();
    gripShape.moveTo(0.055, 0.095);
    gripShape.lineTo(0.115, 0.088);
    gripShape.bezierCurveTo(0.15, 0.04, 0.175, -0.05, 0.185, -0.145);
    gripShape.lineTo(0.112, -0.165);
    gripShape.bezierCurveTo(0.1, -0.08, 0.082, 0.015, 0.055, 0.095);
    gripShape.closePath();

    const gripRaw = new THREE.ExtrudeGeometry(gripShape, {
      depth: 0.044,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    gripRaw.translate(0, 0, -0.022);
    gripRaw.rotateY(-Math.PI / 2);
    const grip = mergeNormalized([gripRaw]);
    gripRaw.dispose();

    // 2. Blued steel frame: lower frame, top strap, rear recoil shield, trigger guard, trigger, barrel, underlug, front sight, grip cap
    const lowerFrame = new THREE.BoxGeometry(0.05, 0.052, 0.21);
    lowerFrame.translate(0, 0.068, 0.015);

    const rearFrame = new THREE.BoxGeometry(0.052, 0.102, 0.075);
    rearFrame.translate(0, 0.115, 0.098);

    const topStrap = new THREE.BoxGeometry(0.046, 0.024, 0.21);
    topStrap.translate(0, 0.176, 0.005);

    const frontFrame = new THREE.BoxGeometry(0.05, 0.105, 0.05);
    frontFrame.translate(0, 0.125, -0.085);

    const guard = new THREE.TorusGeometry(0.036, 0.0065, 6, 12);
    guard.rotateY(Math.PI / 2);
    guard.scale(1, 0.85, 1.15);
    guard.translate(0, 0.028, 0.012);

    const trigger = new THREE.BoxGeometry(0.008, 0.032, 0.012);
    trigger.rotateX(0.35);
    trigger.translate(0, 0.032, 0.016);

    const barrel = new THREE.CylinderGeometry(0.024, 0.028, 0.34, 8);
    barrel.rotateX(Math.PI / 2);
    barrel.translate(0, 0.148, -0.265);

    const underlug = new THREE.BoxGeometry(0.03, 0.036, 0.29);
    underlug.translate(0, 0.114, -0.245);

    const ribTop = new THREE.BoxGeometry(0.022, 0.014, 0.33);
    ribTop.translate(0, 0.176, -0.26);

    // Triangular front blade sight
    const sightShape = new THREE.Shape();
    sightShape.moveTo(0, 0);
    sightShape.lineTo(0.032, 0);
    sightShape.lineTo(0.028, 0.024);
    sightShape.closePath();
    const sight = new THREE.ExtrudeGeometry(sightShape, { depth: 0.009, bevelEnabled: false });
    sight.translate(0, 0, -0.0045);
    sight.rotateY(Math.PI / 2);
    sight.translate(0, 0.181, -0.39);

    const buttCap = new THREE.BoxGeometry(0.056, 0.018, 0.086);
    buttCap.rotateX(-0.22);
    buttCap.translate(0, -0.156, 0.148);

    const frameParts = [
      lowerFrame,
      rearFrame,
      topStrap,
      frontFrame,
      guard,
      trigger,
      barrel,
      underlug,
      ribTop,
      sight,
      buttCap,
    ];
    const frame = mergeNormalized(frameParts);
    for (const p of frameParts) p.dispose();

    // 3. Cylinder body + 6 dark flutes + 6 rear brass cartridge rims
    const cyl = new THREE.CylinderGeometry(0.052, 0.052, 0.125, 18);
    cyl.rotateX(Math.PI / 2);
    const cylinderBody = mergeNormalized([cyl]);
    cyl.dispose();

    const fluteParts: THREE.BufferGeometry[] = [];
    const rimParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const fx = Math.cos(ang + Math.PI / 6) * 0.049;
      const fy = Math.sin(ang + Math.PI / 6) * 0.049;
      const flute = new THREE.BoxGeometry(0.014, 0.014, 0.088);
      flute.rotateZ(ang + Math.PI / 6);
      flute.translate(fx, fy, -0.005);
      fluteParts.push(flute);

      const cx = Math.cos(ang) * 0.028;
      const cy = Math.sin(ang) * 0.028;
      const rim = new THREE.CylinderGeometry(0.013, 0.013, 0.01, 10);
      rim.rotateX(Math.PI / 2);
      rim.translate(cx, cy, 0.063);
      rimParts.push(rim);
    }
    const cylinderFlutes = mergeNormalized(fluteParts);
    for (const p of fluteParts) p.dispose();
    const cartridgeRims = mergeNormalized(rimParts);
    for (const p of rimParts) p.dispose();

    // 4. Cockable hammer (pivot at rear frame)
    const hammerNeck = new THREE.BoxGeometry(0.016, 0.046, 0.022);
    hammerNeck.rotateX(-0.28);
    hammerNeck.translate(0, 0.022, 0.004);
    const hammerSpur = new THREE.BoxGeometry(0.018, 0.014, 0.036);
    hammerSpur.rotateX(0.32);
    hammerSpur.translate(0, 0.042, 0.022);
    const hammer = mergeNormalized([hammerNeck, hammerSpur]);
    hammerNeck.dispose();
    hammerSpur.dispose();

    // 5. Recessed dark muzzle bore
    const bore = new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10);
    bore.rotateX(Math.PI / 2);
    bore.translate(0, 0.148, -0.432);
    const darkAccents = mergeNormalized([bore]);
    bore.dispose();

    revolverGeoCache = {
      grip,
      frame,
      cylinderBody,
      cylinderFlutes,
      cartridgeRims,
      hammer,
      darkAccents,
    };
  }

  const group = new THREE.Group();

  const gripMesh = new THREE.Mesh(revolverGeoCache.grip, bank.gunWood);
  gripMesh.castShadow = true;
  group.add(gripMesh);

  const frameMesh = new THREE.Mesh(revolverGeoCache.frame, bank.gunMetal);
  frameMesh.castShadow = true;
  group.add(frameMesh);

  group.add(new THREE.Mesh(revolverGeoCache.darkAccents, bank.gunRubber));

  // Separate rotatable 6-chamber cylinder
  const cylinderPivot = new THREE.Group();
  cylinderPivot.position.set(0, 0.125, -0.004);
  const cylMesh = new THREE.Mesh(revolverGeoCache.cylinderBody, bank.gunMetal);
  cylMesh.castShadow = true;
  cylinderPivot.add(cylMesh);
  cylinderPivot.add(new THREE.Mesh(revolverGeoCache.cylinderFlutes, bank.gunRubber));
  cylinderPivot.add(new THREE.Mesh(revolverGeoCache.cartridgeRims, bank.brassCoin));
  group.add(cylinderPivot);

  // Separate cockable hammer
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0, 0.146, 0.128);
  const hammerMesh = new THREE.Mesh(revolverGeoCache.hammer, bank.gunMetal);
  hammerMesh.castShadow = true;
  hammerPivot.add(hammerMesh);
  group.add(hammerPivot);

  // Hidden muzzle flash starburst + core
  const muzzleFlash = new THREE.Group();
  muzzleFlash.position.set(0, 0.148, -0.45);
  muzzleFlash.visible = false;
  const flashCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  const flashSpikeMat = new THREE.MeshBasicMaterial({
    color: 0xff9224,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  muzzleFlash.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), flashCoreMat));
  const spikeGeo = new THREE.ConeGeometry(0.032, 0.24, 5);
  for (let s = 0; s < 6; s++) {
    const sp = new THREE.Mesh(spikeGeo, flashSpikeMat);
    const a = (s / 6) * Math.PI * 2;
    sp.rotation.z = a;
    sp.position.set(Math.cos(a + Math.PI / 2) * 0.08, Math.sin(a + Math.PI / 2) * 0.08, -0.03);
    muzzleFlash.add(sp);
  }
  const fwdCone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 7), flashSpikeMat);
  fwdCone.rotation.x = -Math.PI / 2;
  fwdCone.position.z = -0.15;
  muzzleFlash.add(fwdCone);
  group.add(muzzleFlash);

  const smokePuff = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.075, 1),
    new THREE.MeshStandardMaterial({
      color: 0xc2beb6,
      roughness: 1,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  smokePuff.position.set(0, 0.16, -0.48);
  smokePuff.visible = false;
  group.add(smokePuff);

  // Anatomical center of the wooden walnut grip for rigid palm attachment
  const gripAnchor = new THREE.Object3D();
  gripAnchor.position.set(0, -0.045, 0.11);
  group.add(gripAnchor);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0.148, -0.45);
  group.add(muzzleTip);

  return { group, gripAnchor, muzzleTip, cylinderPivot, hammerPivot, muzzleFlash, smokePuff };
}

let coinTexturesCache: {
  headsMat: THREE.MeshStandardMaterial;
  tailsMat: THREE.MeshStandardMaterial;
  discGeo: THREE.BufferGeometry;
  rimGeo: THREE.BufferGeometry;
} | null = null;

/**
 * Embossed brass coin with 3D raised bevel rims and high-contrast bump-mapped Crown / Skull reliefs.
 */
export function buildCoinMesh(bank: MaterialBank): THREE.Group {
  if (!coinTexturesCache) {
    const makeSide = (
      label: string,
      bg: string,
      fg: string,
      ringHex: string,
    ): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = ringHex;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(128, 128, 108, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = fg;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 128, 92, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = fg;
      ctx.font = 'bold 116px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 128, 134);

      const b = document.createElement('canvas');
      b.width = 256;
      b.height = 256;
      const bCtx = b.getContext('2d')!;
      bCtx.fillStyle = '#606060';
      bCtx.fillRect(0, 0, 256, 256);
      bCtx.strokeStyle = '#d0d0d0';
      bCtx.lineWidth = 12;
      bCtx.beginPath();
      bCtx.arc(128, 128, 108, 0, Math.PI * 2);
      bCtx.stroke();
      bCtx.fillStyle = '#f2f2f2';
      bCtx.font = 'bold 116px Georgia, serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(label, 128, 134);

      const map = markShared(new THREE.CanvasTexture(c));
      map.colorSpace = THREE.SRGBColorSpace;
      const bump = markShared(new THREE.CanvasTexture(b));
      return { map, bump };
    };

    const heads = makeSide('♛', '#f5cb5b', '#3f2403', '#8a5d10');
    const tails = makeSide('☠', '#c99335', '#2a0606', '#693d08');

    const headsMat = markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: heads.map,
      bumpMap: heads.bump,
      bumpScale: 0.008,
      roughness: 0.2,
      metalness: 0.78,
    }));
    const tailsMat = markShared(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tails.map,
      bumpMap: tails.bump,
      bumpScale: 0.008,
      roughness: 0.24,
      metalness: 0.78,
    }));

    const discGeo = markShared(new THREE.CylinderGeometry(0.155, 0.155, 0.026, 28));
    const topRim = new THREE.TorusGeometry(0.146, 0.009, 8, 26);
    topRim.rotateX(Math.PI / 2);
    topRim.translate(0, 0.011, 0);
    const botRim = new THREE.TorusGeometry(0.146, 0.009, 8, 26);
    botRim.rotateX(Math.PI / 2);
    botRim.translate(0, -0.011, 0);
    const rimGeo = mergeNormalized([topRim, botRim]);
    topRim.dispose();
    botRim.dispose();

    coinTexturesCache = { headsMat, tailsMat, discGeo, rimGeo };
  }

  const coin = new THREE.Group();
  const disc = new THREE.Mesh(coinTexturesCache.discGeo, [
    bank.brassCoin,
    coinTexturesCache.headsMat,
    coinTexturesCache.tailsMat,
  ]);
  disc.castShadow = true;
  coin.add(disc);
  coin.add(new THREE.Mesh(coinTexturesCache.rimGeo, bank.brassCoin));
  return coin;
}

export interface HpMonitorStateUpdate {
  playerHp?: number;
  opponentHp?: number;
  maxHp?: number;
  elapsedSeconds?: number;
  suppressLossAnim?: boolean;
  opponentLabel?: string;
}

export function formatCrtOpponentLabel(raw?: string | null): string {
  const clean = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!clean) return 'DEALER';
  const upper = clean.toUpperCase();
  return upper.length > 9 ? `${upper.slice(0, 8)}…` : upper;
}

export interface HpMonitorRig {
  group: THREE.Group;
  setState: (update: HpMonitorStateUpdate) => void;
  tick: (dt: number) => void;
  dispose: () => void;
}

export interface LightClockRig {
  group: THREE.Group;
  setTime: (elapsedSeconds: number) => void;
  dispose: () => void;
}

function formatClockDisplay(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

// Crisp 9x8 retro pixel-art heart bitmaps for the CRT console
const HEART_FILLED_ROWS = [
  '011000110',
  '111101111',
  '111111111',
  '111111111',
  '011111110',
  '001111100',
  '000111000',
  '000010000',
];

const HEART_OUTLINE_ROWS = [
  '011000110',
  '100101001',
  '100010001',
  '100000001',
  '010000010',
  '001000100',
  '000101000',
  '000010000',
];

function drawPixelHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pxSize: number,
  filled: boolean,
  fillColor: string,
  glowColor?: string,
): void {
  const rows = filled ? HEART_FILLED_ROWS : HEART_OUTLINE_ROWS;
  const w = rows[0].length * pxSize;
  const h = rows.length * pxSize;
  const x0 = Math.round(cx - w * 0.5);
  const y0 = Math.round(cy - h * 0.5);

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = fillColor;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '1') {
        ctx.fillRect(x0 + c * pxSize, y0 + r * pxSize, pxSize, pxSize);
      }
    }
  }
  ctx.restore();
}

export function buildHpMonitor(initialMaxHp: number): HpMonitorRig {
  const group = new THREE.Group();

  // Slanted industrial CRT casing facing upward toward player's gaze
  const tiltPivot = new THREE.Group();
  tiltPivot.position.set(0, 0.02, 0);
  tiltPivot.rotation.x = -0.28;
  group.add(tiltPivot);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.58, metalness: 0.55 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.42, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd9f2e6,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.49, 0.28), metalMat);
  chassis.position.y = 0.245;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  tiltPivot.add(chassis);

  // Recessed dark frame bezel around CRT screen
  const bezelFrame = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.42, 0.03), bezelMat);
  bezelFrame.position.set(0, 0.245, 0.135);
  tiltPivot.add(bezelFrame);

  // Dynamic CanvasTexture (re-drawn ONLY on second change, HP change, or during 0.62s heart-loss animation)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: screenTex,
    emissive: 0xffffff,
    emissiveMap: screenTex,
    emissiveIntensity: 0.92,
    roughness: 0.32,
    metalness: 0.05,
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.38), screenMat);
  screen.position.set(0, 0.245, 0.152);
  tiltPivot.add(screen);

  // Glass reflection sheet over CRT
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.73, 0.39), glassMat);
  glassPane.position.set(0, 0.245, 0.164);
  tiltPivot.add(glassPane);

  let maxHp = Math.max(1, Math.min(3, initialMaxHp));
  let playerHp = maxHp;
  let opponentHp = maxHp;
  let elapsedSeconds = 0;
  let opponentLabel = 'DEALER';

  interface LossAnim {
    who: 'player' | 'opponent';
    slotIndex: number;
    elapsed: number;
    duration: number;
  }
  let lossAnim: LossAnim | null = null;

  const redraw = () => {
    const W = canvas.width;
    const H = canvas.height;

    // Deep CRT phosphor backdrop
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, W, H);

    // Subtle phosphor vignette & inner border
    ctx.strokeStyle = 'rgba(210, 140, 85, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // Top Row: Retro LED Match Clock ("TIME  00:00")
    const timeStr = formatClockDisplay(elapsedSeconds);
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(235, 165, 95, 0.72)';
    ctx.fillText('TIME', 28, 58);

    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(255, 120, 45, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff9d42';
    ctx.fillText(timeStr, W - 28, 58);
    ctx.restore();

    // Horizontal CRT divider line beneath clock
    ctx.strokeStyle = 'rgba(220, 150, 95, 0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 108);
    ctx.lineTo(W - 22, 108);
    ctx.stroke();

    // Secondary thin divider between DEALER and YOU
    ctx.strokeStyle = 'rgba(130, 155, 140, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(26, 206);
    ctx.lineTo(W - 26, 206);
    ctx.stroke();

    // Row Labels (dynamically sized for opponent nickname so it never overlaps hearts)
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const oppDisplay = formatCrtOpponentLabel(opponentLabel);
    const oppFontSize = oppDisplay.length <= 6 ? 34 : oppDisplay.length <= 8 ? 28 : 24;
    ctx.font = `bold ${oppFontSize}px monospace`;
    ctx.fillStyle = '#ef4444';
    ctx.fillText(oppDisplay, 28, 158);

    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('YOU', 28, 256);

    // Heart slots (centered neatly on right half, count === maxHp)
    const heartPx = 6;
    const slotSpacing = 74;
    const startX = W - 56 - (maxHp - 1) * slotSpacing;

    const drawRowHearts = (
      who: 'player' | 'opponent',
      hp: number,
      rowY: number,
      activeColor: string,
      activeGlow: string,
      dimColor: string,
    ) => {
      for (let i = 0; i < maxHp; i++) {
        const cx = startX + i * slotSpacing;
        const isLosing = lossAnim !== null && lossAnim.who === who && lossAnim.slotIndex === i;

        if (isLosing && lossAnim) {
          const p = Math.min(1, lossAnim.elapsed / lossAnim.duration);
          if (p < 0.52) {
            // 3 sharp CRT glitch/flash strobes (white/crimson) + horizontal jitter
            const strobe = Math.floor(p * 12) % 2 === 0;
            const jitterX = (strobe ? 1 : -1) * 5;
            drawPixelHeart(
              ctx,
              cx + jitterX,
              rowY,
              heartPx,
              true,
              strobe ? '#ffffff' : '#ff2424',
              '#ff3b3b',
            );
            // Tiny CRT scan glitch bar across the losing heart
            ctx.fillStyle = 'rgba(255, 70, 70, 0.45)';
            ctx.fillRect(cx - 32, rowY + (strobe ? -6 : 5), 64, 3);
          } else {
            // Smooth fade-out into extinguished dark heart outline
            const fade = Math.max(0, 1 - (p - 0.52) / 0.48);
            drawPixelHeart(ctx, cx, rowY, heartPx, false, dimColor);
            if (fade > 0.04) {
              ctx.save();
              ctx.globalAlpha = fade;
              drawPixelHeart(ctx, cx, rowY, heartPx, true, '#b91c1c', 'rgba(220,38,38,0.5)');
              ctx.restore();
            }
          }
        } else if (i < hp) {
          drawPixelHeart(ctx, cx, rowY, heartPx, true, activeColor, activeGlow);
        } else {
          drawPixelHeart(ctx, cx, rowY, heartPx, false, dimColor);
        }
      }
    };

    drawRowHearts('opponent', opponentHp, 158, '#ef233c', 'rgba(239, 35, 60, 0.85)', 'rgba(165, 65, 65, 0.34)');
    drawRowHearts('player', playerHp, 256, '#22c55e', 'rgba(34, 197, 94, 0.8)', 'rgba(80, 145, 105, 0.32)');

    // Subtle CRT horizontal scanlines overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1.5);
    }

    screenTex.needsUpdate = true;
  };

  redraw();

  const setState = (u: HpMonitorStateUpdate): void => {
    const nextMax = u.maxHp !== undefined ? Math.max(1, Math.min(3, u.maxHp)) : maxHp;
    const nextPlayer = u.playerHp !== undefined ? Math.max(0, Math.min(nextMax, u.playerHp)) : playerHp;
    const nextOpp = u.opponentHp !== undefined ? Math.max(0, Math.min(nextMax, u.opponentHp)) : opponentHp;
    const nextSec = u.elapsedSeconds !== undefined ? Math.max(0, Math.floor(u.elapsedSeconds)) : elapsedSeconds;
    const nextLabel = u.opponentLabel !== undefined ? (u.opponentLabel.trim() || 'DEALER') : opponentLabel;

    const changed =
      nextMax !== maxHp ||
      nextPlayer !== playerHp ||
      nextOpp !== opponentHp ||
      nextSec !== elapsedSeconds ||
      nextLabel !== opponentLabel;
    if (!changed) return;

    if (!u.suppressLossAnim && nextMax === maxHp) {
      if (nextPlayer < playerHp) {
        lossAnim = { who: 'player', slotIndex: nextPlayer, elapsed: 0, duration: 0.62 };
      } else if (nextOpp < opponentHp) {
        lossAnim = { who: 'opponent', slotIndex: nextOpp, elapsed: 0, duration: 0.62 };
      }
    } else if (u.suppressLossAnim || nextMax !== maxHp) {
      lossAnim = null;
    }

    maxHp = nextMax;
    playerHp = nextPlayer;
    opponentHp = nextOpp;
    elapsedSeconds = nextSec;
    opponentLabel = nextLabel;
    redraw();
  };

  const tick = (dt: number): void => {
    if (!lossAnim) return;
    lossAnim.elapsed += dt;
    if (lossAnim.elapsed >= lossAnim.duration) {
      lossAnim = null;
    }
    redraw();
  };

  const dispose = (): void => {
    screenTex.dispose();
    screenMat.dispose();
    metalMat.dispose();
    bezelMat.dispose();
    glassMat.dispose();
  };

  return { group, setState, tick, dispose };
}

/**
 * Cozy wooden tabletop chess clock for Light Mode showing live match time (MM:SS).
 */
export function buildLightTableClock(): LightClockRig {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7b5332, roughness: 0.56, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xb99453, roughness: 0.34, metalness: 0.72 });
  const darkBezelMat = new THREE.MeshStandardMaterial({ color: 0x262320, roughness: 0.45, metalness: 0.25 });

  // Slightly tilted cozy wooden chess-clock body
  const bodyPivot = new THREE.Group();
  bodyPivot.rotation.x = -0.18;
  group.add(bodyPivot);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.24), woodMat);
  base.position.y = 0.025;
  base.castShadow = true;
  base.receiveShadow = true;
  bodyPivot.add(base);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.28, 0.2), woodMat);
  housing.position.y = 0.17;
  housing.castShadow = true;
  housing.receiveShadow = true;
  bodyPivot.add(housing);

  // Classic twin chess-clock plunger buttons on top
  const btnGeo = new THREE.CylinderGeometry(0.044, 0.048, 0.036, 12);
  [-0.14, 0.14].forEach((bx, idx) => {
    const btn = new THREE.Mesh(btnGeo, trimMat);
    btn.position.set(bx, 0.325 + (idx === 0 ? 0.008 : 0), -0.01);
    btn.castShadow = true;
    bodyPivot.add(btn);
  });

  // Recessed screen frame
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.21, 0.02), darkBezelMat);
  bezel.position.set(0, 0.175, 0.098);
  bodyPivot.add(bezel);

  // Clean light-mode digital LCD face (redrawn ONLY when elapsedSeconds changes)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.22,
    roughness: 0.4,
    metalness: 0.04,
  });

  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.175), faceMat);
  face.position.set(0, 0.175, 0.11);
  bodyPivot.add(face);

  let currentSec = -1;
  const redraw = (sec: number) => {
    ctx.fillStyle = '#ece6d6';
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = 'rgba(42, 58, 48, 0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 244, 116);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#4e6355';
    ctx.fillText('MATCH TIME', 128, 32);

    ctx.font = 'bold 54px monospace';
    ctx.fillStyle = '#1b2620';
    ctx.fillText(formatClockDisplay(sec), 128, 82);

    tex.needsUpdate = true;
  };

  redraw(0);
  currentSec = 0;

  const setTime = (elapsedSeconds: number): void => {
    const s = Math.max(0, Math.floor(elapsedSeconds));
    if (s === currentSec) return;
    currentSec = s;
    redraw(s);
  };

  const dispose = (): void => {
    tex.dispose();
    faceMat.dispose();
    woodMat.dispose();
    trimMat.dispose();
    darkBezelMat.dispose();
  };

  return { group, setTime, dispose };
}

export interface OpponentRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  jawPivot?: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftFingers: THREE.Group[];
  rightFingers: THREE.Group[];
  personality?: LightPreviewAvatar;
  baseTorsoTilt?: number;
  baseHeadPitch?: number;
  mysteryBadge?: THREE.Group;
}

/**
 * Helper building an articulated 5-fingered hand with 2 phalanx segments per finger
 * and an anatomically inner-facing opposable thumb (palm faces down, fingers point +Z).
 */
function buildArticulatedHandMesh(
  side: -1 | 1,
  palmMat: THREE.Material,
  fingerTipMat: THREE.Material,
  cuffMat: THREE.Material,
  scale: number = 1,
): { hand: THREE.Group; fingers: THREE.Group[] } {
  const hand = new THREE.Group();

  // Dark cuff / wrist bridge
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056 * scale, 0.068 * scale, 0.12 * scale, 8), cuffMat);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.set(0, 0.006 * scale, -0.1 * scale);
  hand.add(cuff);

  // Arched sculpted palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.155 * scale, 0.052 * scale, 0.165 * scale), palmMat);
  palm.position.set(0, 0, -0.005 * scale);
  palm.castShadow = true;
  hand.add(palm);

  const knuckleBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.025 * scale, 0.115 * scale, 4, 8), palmMat);
  knuckleBar.rotation.z = Math.PI / 2;
  knuckleBar.position.set(0, 0.004 * scale, 0.072 * scale);
  hand.add(knuckleBar);

  const fingers: THREE.Group[] = [];
  const fOffsets = [-0.056, -0.019, 0.019, 0.056];
  const fLengths = [0.066, 0.074, 0.071, 0.056];
  fOffsets.forEach((fx, idx) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(fx * scale, 0.004 * scale, 0.08 * scale);
    fGroup.rotation.x = 0.16;

    const pLen = fLengths[idx] * scale;
    const prox = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * scale, 0.017 * scale, pLen, 6), palmMat);
    prox.rotation.x = Math.PI / 2;
    prox.position.z = pLen * 0.5;
    prox.castShadow = true;
    fGroup.add(prox);

    const distalPivot = new THREE.Group();
    distalPivot.position.z = pLen;
    distalPivot.rotation.x = 0.34;
    const dLen = pLen * 0.78;
    const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * scale, 0.014 * scale, dLen, 6), fingerTipMat);
    dist.rotation.x = Math.PI / 2;
    dist.position.z = dLen * 0.5;
    dist.castShadow = true;
    distalPivot.add(dist);
    fGroup.add(distalPivot);

    hand.add(fGroup);
    fingers.push(fGroup);
  });

  // Opposable thumb on inner medial side (-side) with 2 segments
  const thumbGroup = new THREE.Group();
  thumbGroup.position.set(-side * 0.078 * scale, -0.004 * scale, 0.015 * scale);
  thumbGroup.rotation.set(0.18, -side * 0.56, 0);
  const tProx = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * scale, 0.019 * scale, 0.055 * scale, 6), palmMat);
  tProx.rotation.x = Math.PI / 2;
  tProx.position.z = 0.028 * scale;
  tProx.castShadow = true;
  thumbGroup.add(tProx);

  const tDist = new THREE.Mesh(new THREE.CylinderGeometry(0.013 * scale, 0.015 * scale, 0.042 * scale, 6), fingerTipMat);
  tDist.rotation.x = Math.PI / 2 + 0.25;
  tDist.position.set(0, -0.006 * scale, 0.07 * scale);
  thumbGroup.add(tDist);

  hand.add(thumbGroup);
  fingers.push(thumbGroup);

  return { hand, fingers };
}

/**
 * Unit-length (+Z from z=0 to z=1) forearm sleeve bridge so hands remain connected to shoulders at any reach.
 */
function buildForearmBridge(mat: THREE.Material, rStart: number, rEnd: number): THREE.Group {
  const pivot = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(rEnd, rStart, 1.0, 9), mat);
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.5;
  sleeve.castShadow = true;
  pivot.add(sleeve);
  return pivot;
}

/**
 * Gritty Buckshot-inspired gaunt Dealer:
 * - Solid pitch-black interior core (#040404) creating real hollowed eye sockets, nasal pit & grinning mouth slit
 * - Smooth anatomical ash-gray skull mask (#7c7770, roughness 0.92) with NO inflated cap & NO visor bar
 * - Slightly crooked dirty-bone teeth along a curved grin arc
 * - Hunched dark cloak collar & shoulders (#0d0d0f) melting into the cellar shadows
 */
export function buildDealerCharacter(): OpponentRig {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  const skullMaps = createCrackedSkullTexture();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.96, metalness: 0.02 });
  const skullMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: skullMaps.map,
    bumpMap: skullMaps.bumpMap,
    bumpScale: 0.015,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });
  const shadowBoneMat = new THREE.MeshStandardMaterial({
    color: 0x45413b,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });
  const darkCoreMat = new THREE.MeshStandardMaterial({
    color: 0x040404,
    roughness: 1.0,
    metalness: 0.0,
  });
  const toothLightMat = new THREE.MeshStandardMaterial({ color: 0xb8af9e, roughness: 0.76, metalness: 0.02 });
  const toothDirtyMat = new THREE.MeshStandardMaterial({ color: 0x918776, roughness: 0.84, metalness: 0.01 });

  // Dirty off-white cloth gloves with organic dried crimson blood streaks & subtle contrast lift
  const makeGloveMat = (bloodyTips: boolean) => {
    const gloveCanvas = document.createElement('canvas');
    gloveCanvas.width = 128;
    gloveCanvas.height = 128;
    const gCtx = gloveCanvas.getContext('2d')!;
    gCtx.fillStyle = '#d4cbb8';
    gCtx.fillRect(0, 0, 128, 128);
    gCtx.fillStyle = 'rgba(42, 34, 26, 0.22)';
    gCtx.fillRect(0, 0, 128, 128);
    paintOrganicBloodSplatter(gCtx, null, 52, 54, 24, bloodyTips ? 404 : 612);
    paintOrganicBloodSplatter(gCtx, null, 88, 92, 19, bloodyTips ? 409 : 715);
    if (bloodyTips) {
      paintOrganicBloodSplatter(gCtx, null, 64, 28, 22, 811);
    }

    const gloveTex = new THREE.CanvasTexture(gloveCanvas);
    gloveTex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gloveTex,
      emissive: 0x1a1510,
      emissiveIntensity: 0.45,
      roughness: 0.72,
      metalness: 0.04,
    });
  };
  const gloveMat = makeGloveMat(false);
  const gloveBloodyTipMat = makeGloveMat(true);

  // Hunched broad cloak torso + high collar melting into cellar shadow
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.32, 9), coatMat);
  chest.position.set(0, 0.72, -0.04);
  chest.rotation.x = 0.18;
  chest.castShadow = true;
  torso.add(chest);

  const shoulderMantle = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.1, 5, 10), coatMat);
  shoulderMantle.rotation.z = Math.PI / 2;
  shoulderMantle.scale.set(1, 0.84, 0.94);
  shoulderMantle.position.set(0, 1.33, 0.04);
  shoulderMantle.rotation.x = 0.16;
  shoulderMantle.castShadow = true;
  torso.add(shoulderMantle);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.39, 0.28, 8, 1, true, Math.PI * 0.2, Math.PI * 1.6),
    coatMat,
  );
  collar.position.set(0, 1.5, 0.05);
  collar.rotation.y = Math.PI;
  torso.add(collar);

  const neckSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.28, 7), shadowBoneMat);
  neckSpine.position.set(0, 1.56, 0.04);
  neckSpine.rotation.x = 0.24;
  torso.add(neckSpine);

  // Anatomical Gaunt Skull (~1 : 1.24 : 1.05 W:H:D), slightly pitched down so forehead stays shadowed
  const head = new THREE.Group();
  head.position.set(0, 1.79, 0.16);

  const skullPitchPivot = new THREE.Group();
  skullPitchPivot.rotation.x = 0.14;
  head.add(skullPitchPivot);

  // 1. Pitch-dark interior core exposed naturally through orbital sockets, nose & mouth slit
  const innerCore = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), darkCoreMat);
  innerCore.scale.set(0.88, 1.15, 0.94);
  innerCore.position.set(0, 0.02, 0.055);
  skullPitchPivot.add(innerCore);

  // 2. Smooth rounded cranial dome + sloped forehead (LatheGeometry, no protruding cap!)
  const domePts = [
    new THREE.Vector2(0.188, -0.02),
    new THREE.Vector2(0.194, 0.055),
    new THREE.Vector2(0.185, 0.135),
    new THREE.Vector2(0.155, 0.205),
    new THREE.Vector2(0.098, 0.255),
    new THREE.Vector2(0.001, 0.272),
  ];
  const craniumDome = new THREE.Mesh(new THREE.LatheGeometry(domePts, 14), skullMat);
  craniumDome.scale.set(0.92, 1.0, 1.06);
  craniumDome.position.set(0, 0.115, -0.005);
  craniumDome.castShadow = true;
  skullPitchPivot.add(craniumDome);

  // Back/occipital skull shell wrapping behind the dark core
  const occiput = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.128, 0.24, 10, 1, false, Math.PI * 0.55, Math.PI * 0.9), skullMat);
  occiput.position.set(0, 0.01, -0.01);
  skullPitchPivot.add(occiput);

  // 3. Curved organic supraorbital brow arches (no blocky horizontal visor!)
  [-0.072, 0.072].forEach((bx, idx) => {
    const browArch = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.076, 4, 7), skullMat);
    browArch.rotation.z = Math.PI / 2 + (idx === 0 ? 0.18 : -0.18);
    browArch.rotation.y = idx === 0 ? 0.22 : -0.22;
    browArch.position.set(bx, 0.118, 0.196);
    browArch.castShadow = true;
    skullPitchPivot.add(browArch);
  });
  const glabella = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.055, 0.065), skullMat);
  glabella.position.set(0, 0.11, 0.195);
  skullPitchPivot.add(glabella);

  // 4. Lateral temple walls + protruding cheekbones framing deep open eye sockets
  [-0.142, 0.142].forEach((cx, idx) => {
    const side = idx === 0 ? -1 : 1;
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.145, 0.135), skullMat);
    temple.position.set(cx, 0.055, 0.115);
    temple.rotation.y = side * -0.22;
    skullPitchPivot.add(temple);

    // Protruding zygomatic cheekbone catching warm grazing lamp light
    const cheek = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.058, 0.105, 6), skullMat);
    cheek.position.set(side * 0.118, -0.015, 0.176);
    cheek.rotation.z = side * 0.48;
    cheek.rotation.x = 0.25;
    cheek.castShadow = true;
    skullPitchPivot.add(cheek);

    // Sunken under-cheek bone taper
    const cheekSlope = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.105, 0.09), shadowBoneMat);
    cheekSlope.position.set(side * 0.116, -0.095, 0.115);
    cheekSlope.rotation.y = side * -0.32;
    skullPitchPivot.add(cheekSlope);
  });

  // 5. Thin gaunt nasal bridge descending between eye sockets, leaving dark nasal pit below
  const nasalBridge = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.095, 4), skullMat);
  nasalBridge.position.set(0, 0.056, 0.214);
  nasalBridge.rotation.x = 0.36;
  skullPitchPivot.add(nasalBridge);

  // 6. Upper maxilla bone shelf & sculpted lower mandible framing hollow grin gap
  const maxilla = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.108, 0.055, 8, 1, false, -Math.PI * 0.45, Math.PI * 0.9), skullMat);
  maxilla.position.set(0, -0.052, 0.125);
  skullPitchPivot.add(maxilla);

  // Articulated lower jaw pivot for expressive speaking micro-animation
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.09, 0.04);
  skullPitchPivot.add(jawPivot);

  const chinJaw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.108, 0.088, 0.068, 8, 1, false, -Math.PI * 0.48, Math.PI * 0.96),
    skullMat,
  );
  chinJaw.position.set(0, -0.122, 0.068);
  chinJaw.castShadow = true;
  jawPivot.add(chinJaw);

  [-0.102, 0.102].forEach((rx, idx) => {
    const ramus = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.155, 0.09), skullMat);
    ramus.position.set(rx, -0.05, 0.028);
    ramus.rotation.z = idx === 0 ? 0.14 : -0.14;
    jawPivot.add(ramus);
  });

  // 7. Crooked thin upper & lower bone teeth with small gaps along a wide sinister grin arc
  const upperAngles = [-0.62, -0.46, -0.31, -0.16, 0, 0.16, 0.31, 0.46, 0.62];
  upperAngles.forEach((ang, idx) => {
    const radius = 0.116;
    const h = 0.036 + ((idx * 3) % 3) * 0.008;
    const tMat = idx % 2 === 0 ? toothLightMat : toothDirtyMat;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.015, h, 0.018), tMat);
    tooth.position.set(Math.sin(ang) * radius, -0.088, 0.12 + Math.cos(ang) * radius);
    tooth.rotation.y = ang;
    tooth.rotation.z = ((idx % 3) - 1) * 0.09;
    skullPitchPivot.add(tooth);
  });

  const lowerAngles = [-0.52, -0.34, -0.17, 0.01, 0.19, 0.36, 0.54];
  lowerAngles.forEach((ang, idx) => {
    const radius = 0.108;
    const h = 0.031 + ((idx * 5) % 3) * 0.007;
    const tMat = idx % 2 === 1 ? toothLightMat : toothDirtyMat;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, 0.016), tMat);
    tooth.position.set(Math.sin(ang) * radius, -0.082, 0.075 + Math.cos(ang) * radius);
    tooth.rotation.y = ang;
    tooth.rotation.z = (((idx + 1) % 3) - 1) * 0.11;
    jawPivot.add(tooth);
  });

  torso.add(head);

  // Forearms bridging shoulders -> open table-flank gloved hands (attached to root so torso breathing never distorts IK lookAt)
  const leftForearm = buildForearmBridge(coatMat, 0.095, 0.068);
  leftForearm.position.set(-0.62, 1.18, 0.08);
  root.add(leftForearm);

  const rightForearm = buildForearmBridge(coatMat, 0.095, 0.068);
  rightForearm.position.set(0.62, 1.18, 0.08);
  root.add(rightForearm);

  const leftBuilt = buildArticulatedHandMesh(-1, gloveMat, gloveBloodyTipMat, coatMat, 1.08);
  leftBuilt.hand.position.set(-1.38, 0.78, 1.12);
  root.add(leftBuilt.hand);

  const rightBuilt = buildArticulatedHandMesh(1, gloveMat, gloveBloodyTipMat, coatMat, 1.08);
  rightBuilt.hand.position.set(1.42, 0.78, 1.56);
  root.add(rightBuilt.hand);

  return {
    root,
    torso,
    head,
    jawPivot,
    leftHand: leftBuilt.hand,
    rightHand: rightBuilt.hand,
    leftForearm,
    rightForearm,
    leftFingers: leftBuilt.fingers,
    rightFingers: rightBuilt.fingers,
  };
}

/**
 * Four distinct stylized characters for Light Mode:
 * - Enthusiast: warm hoodie, backwards cap, tousled bangs, energetic forward lean
 * - Egoist: tailored blazer + turtleneck, gold lapel accent, slicked hair, dark sunglasses, proud lean back
 * - Calm Philosopher: sage knit cardigan + woven scarf, wire-rim round glasses, gray hair & neat beard
 * - Random (Mystery Stranger): smoky-slate trench coat, wide-brimmed traveler hat, shadowed silhouette & floating '?' emblem
 */
export function buildLightNpcCharacter(personality: LightPreviewAvatar): OpponentRig {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  if (personality === 'unknown') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x454f5b, roughness: 0.78, metalness: 0.06 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xd9d0be, roughness: 0.72, metalness: 0.02 });
    const silhouetteMat = new THREE.MeshStandardMaterial({ color: 0x2a313a, roughness: 0.72, metalness: 0.05 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.74, metalness: 0.04 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xc2a26b, roughness: 0.45, metalness: 0.25 });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe3b857,
      emissive: 0x8f6920,
      emissiveIntensity: 0.4,
      roughness: 0.28,
      metalness: 0.75,
    });

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.37, 0.94, 14), coatMat);
    chest.scale.set(1.06, 1, 0.76);
    chest.position.y = 0.78;
    chest.castShadow = true;
    torso.add(chest);

    const shoulderBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.58, 6, 12), coatMat);
    shoulderBar.rotation.z = Math.PI / 2;
    shoulderBar.position.set(0, 1.16, 0);
    shoulderBar.castShadow = true;
    torso.add(shoulderBar);

    // Upturned trench collar & lapels
    const highCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.19, 0.16, 12, 1, true, Math.PI * 0.22, Math.PI * 1.56),
      coatMat,
    );
    highCollar.position.set(0, 1.32, 0.02);
    highCollar.rotation.y = Math.PI;
    torso.add(highCollar);

    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.045), collarMat);
      lapel.position.set(side * 0.105, 1.07, 0.22);
      lapel.rotation.z = side * -0.22;
      torso.add(lapel);

      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.44, 10), coatMat);
      upperArm.position.set(side * 0.46, 0.98, 0.14);
      upperArm.rotation.x = -0.58;
      upperArm.rotation.z = side * 0.12;
      upperArm.castShadow = true;
      torso.add(upperArm);
    });

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.18, 12), silhouetteMat);
    neck.position.set(0, 1.33, 0.02);
    torso.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 1.59, 0.04);

    const headPts = [
      new THREE.Vector2(0.001, -0.22),
      new THREE.Vector2(0.085, -0.21),
      new THREE.Vector2(0.145, -0.15),
      new THREE.Vector2(0.175, -0.04),
      new THREE.Vector2(0.184, 0.06),
      new THREE.Vector2(0.172, 0.16),
      new THREE.Vector2(0.125, 0.225),
      new THREE.Vector2(0.001, 0.245),
    ];
    const cranium = new THREE.Mesh(new THREE.LatheGeometry(headPts, 16), silhouetteMat);
    cranium.scale.set(0.95, 1.0, 1.04);
    cranium.castShadow = true;
    head.add(cranium);

    // Wide-brimmed traveler hat tilted forward over the brow
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.145, 0.015);
    hatGroup.rotation.x = 0.16;
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.016, 22), hatMat);
    hatBrim.castShadow = true;
    hatGroup.add(hatBrim);
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.19, 0.17, 16), hatMat);
    hatCrown.position.y = 0.09;
    hatCrown.castShadow = true;
    hatGroup.add(hatCrown);
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.192, 0.032, 16), ribbonMat);
    hatBand.position.y = 0.025;
    hatGroup.add(hatBand);
    head.add(hatGroup);

    torso.add(head);

    // Sleek small floating 3D '?' emblem above right shoulder
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 128;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.clearRect(0, 0, 128, 128);
    bCtx.fillStyle = 'rgba(227, 184, 87, 0.22)';
    bCtx.beginPath();
    bCtx.arc(64, 64, 52, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.strokeStyle = '#e3b857';
    bCtx.lineWidth = 4;
    bCtx.stroke();
    bCtx.fillStyle = '#f8efd8';
    bCtx.font = 'bold 68px Georgia, serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('?', 64, 68);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const mysteryBadge = new THREE.Group();
    mysteryBadge.position.set(0.54, 1.72, 0.12);
    const badgeDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.26),
      new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true, side: THREE.DoubleSide }),
    );
    mysteryBadge.add(badgeDisc);
    const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.008, 8, 24), brassMat);
    mysteryBadge.add(badgeRing);
    root.add(mysteryBadge);

    const leftForearm = buildForearmBridge(coatMat, 0.072, 0.056);
    leftForearm.position.set(-0.46, 0.96, 0.16);
    root.add(leftForearm);

    const rightForearm = buildForearmBridge(coatMat, 0.072, 0.056);
    rightForearm.position.set(0.46, 0.96, 0.16);
    root.add(rightForearm);

    const leftBuilt = buildArticulatedHandMesh(-1, silhouetteMat, silhouetteMat, coatMat, 0.92);
    leftBuilt.hand.position.set(-1.26, 0.77, 1.05);
    root.add(leftBuilt.hand);

    const rightBuilt = buildArticulatedHandMesh(1, silhouetteMat, silhouetteMat, coatMat, 0.92);
    rightBuilt.hand.position.set(1.26, 0.77, 1.05);
    root.add(rightBuilt.hand);

    return {
      root,
      torso,
      head,
      leftHand: leftBuilt.hand,
      rightHand: rightBuilt.hand,
      leftForearm,
      rightForearm,
      leftFingers: leftBuilt.fingers,
      rightFingers: rightBuilt.fingers,
      personality: 'unknown',
      baseTorsoTilt: 0.0,
      baseHeadPitch: 0.03,
      mysteryBadge,
    };
  }

  const isEnt = personality === 'enthusiast';
  const isEgo = personality === 'egoist';

  const skinColor = isEnt ? 0xe7b696 : isEgo ? 0xdfb49b : 0xdfb092;
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.56, metalness: 0.02 });
  const hairColor = isEnt ? 0x6b3b1e : isEgo ? 0x16171d : 0x73726e;
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.72, metalness: 0.04 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.22 });

  const mainClothMat = new THREE.MeshStandardMaterial({
    color: isEnt ? 0xd97324 : isEgo ? 0x1d2536 : 0x355844,
    roughness: isEgo ? 0.64 : 0.84,
    metalness: isEgo ? 0.08 : 0.02,
  });
  const subClothMat = new THREE.MeshStandardMaterial({
    color: isEnt ? 0xf5ebd6 : isEgo ? 0x0f1218 : 0xe4dcc9,
    roughness: 0.78,
  });

  // Anatomical tapered chest & rounded shoulders
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(isEgo ? 0.34 : 0.31, 0.35, 0.92, 14),
    mainClothMat,
  );
  chest.scale.set(1.06, 1, 0.74);
  chest.position.y = 0.78;
  chest.castShadow = true;
  torso.add(chest);

  const shoulderBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.58, 6, 12), mainClothMat);
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.set(0, 1.16, 0);
  shoulderBar.castShadow = true;
  torso.add(shoulderBar);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.108, 0.2, 12), skinMat);
  neck.position.set(0, 1.33, 0.02);
  torso.add(neck);

  // Upper arms angled cleanly toward table
  [-1, 1].forEach((side) => {
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.44, 10), mainClothMat);
    upperArm.position.set(side * 0.46, 0.98, 0.14);
    upperArm.rotation.x = -0.58;
    upperArm.rotation.z = side * 0.12;
    upperArm.castShadow = true;
    torso.add(upperArm);
  });

  if (isEnt) {
    const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.068, 8, 16), mainClothMat);
    hoodRing.rotation.x = Math.PI / 2 + 0.25;
    hoodRing.position.set(0, 1.27, -0.03);
    torso.add(hoodRing);

    const teeV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), subClothMat);
    teeV.position.set(0, 1.18, 0.21);
    torso.add(teeV);
  } else if (isEgo) {
    const turtleneck = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.122, 0.13, 12), subClothMat);
    turtleneck.position.set(0, 1.3, 0.02);
    torso.add(turtleneck);

    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.045), mainClothMat);
      lapel.position.set(side * 0.1, 1.07, 0.22);
      lapel.rotation.z = side * -0.22;
      torso.add(lapel);
    });

    const goldPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.015, 10),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.85 }),
    );
    goldPin.rotation.x = Math.PI / 2;
    goldPin.position.set(-0.13, 1.11, 0.248);
    torso.add(goldPin);
  } else {
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0x8b4630, roughness: 0.9 });
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.058, 10, 18), scarfMat);
    scarfRing.rotation.x = Math.PI / 2 + 0.12;
    scarfRing.position.set(0, 1.26, 0.02);
    scarfRing.castShadow = true;
    torso.add(scarfRing);

    const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.055), scarfMat);
    scarfTail.position.set(0.07, 1.0, 0.24);
    scarfTail.rotation.z = -0.06;
    scarfTail.castShadow = true;
    torso.add(scarfTail);

    const buttonMat = new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.5 });
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.015, 8), buttonMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.84 + b * 0.11, 0.248);
      torso.add(btn);
    }
  }

  const head = new THREE.Group();
  head.position.set(0, 1.59, 0.04);

  const headPts = [
    new THREE.Vector2(0.001, -0.22),
    new THREE.Vector2(0.085, -0.21),
    new THREE.Vector2(0.145, -0.15),
    new THREE.Vector2(0.175, -0.04),
    new THREE.Vector2(0.184, 0.06),
    new THREE.Vector2(0.172, 0.16),
    new THREE.Vector2(0.125, 0.225),
    new THREE.Vector2(0.001, 0.245),
  ];
  const cranium = new THREE.Mesh(new THREE.LatheGeometry(headPts, 18), skinMat);
  cranium.scale.set(0.95, 1.0, 1.04);
  cranium.castShadow = true;
  head.add(cranium);

  [-0.172, 0.172].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skinMat);
    ear.scale.set(0.48, 1.15, 0.72);
    ear.position.set(ex, 0.0, -0.01);
    head.add(ear);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.085, 6), skinMat);
  nose.position.set(0, -0.01, 0.195);
  nose.rotation.x = 0.45;
  head.add(nose);

  [-0.068, 0.068].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
    eye.scale.set(1.1, 0.85, 0.6);
    eye.position.set(ex, 0.045, 0.174);
    head.add(eye);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.016, 0.02), hairMat);
    brow.position.set(ex, 0.084, 0.176);
    brow.rotation.z = isEgo ? (ex < 0 ? -0.14 : 0.22) : isEnt ? (ex < 0 ? 0.08 : -0.08) : 0;
    head.add(brow);
  });

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(isEnt ? 0.085 : 0.072, 0.018, 0.018),
    new THREE.MeshStandardMaterial({ color: 0x9b5449, roughness: 0.5 }),
  );
  mouth.position.set(0, -0.105, 0.168);
  if (isEnt) mouth.rotation.z = 0.04;
  head.add(mouth);

  if (isEnt) {
    const hairUnderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat,
    );
    hairUnderCap.scale.set(0.97, 1.02, 1.07);
    hairUnderCap.position.set(0, 0.075, -0.005);
    hairUnderCap.rotation.x = -0.14;
    head.add(hairUnderCap);

    for (let t = -2; t <= 2; t++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.095, 7), hairMat);
      tuft.position.set(t * 0.038, 0.125, 0.175 - Math.abs(t) * 0.015);
      tuft.rotation.x = 0.92;
      tuft.rotation.z = -t * 0.22;
      head.add(tuft);
    }

    const capMat = new THREE.MeshStandardMaterial({ color: 0x22384c, roughness: 0.78 });
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.196, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      capMat,
    );
    capDome.scale.set(0.98, 1.02, 1.08);
    capDome.position.set(0, 0.098, -0.012);
    capDome.rotation.x = -0.22;
    capDome.castShadow = true;
    head.add(capDome);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.014, 14, 1, false, -0.9, 1.8), capMat);
    brim.position.set(0, 0.098, -0.185);
    brim.rotation.y = Math.PI;
    brim.rotation.x = 0.16;
    head.add(brim);
  } else if (isEgo) {
    const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.191, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat);
    hairCrown.scale.set(0.97, 1.02, 1.07);
    hairCrown.position.set(0, 0.086, -0.01);
    hairCrown.rotation.x = -0.22;
    hairCrown.castShadow = true;
    head.add(hairCrown);

    const waveCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.062, 0.24, 10), hairMat);
    waveCrest.rotation.x = Math.PI / 2 - 0.16;
    waveCrest.position.set(0.025, 0.205, 0.06);
    head.add(waveCrest);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.25, metalness: 0.6 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x080b12, roughness: 0.08, metalness: 0.72 });
    [-0.072, 0.072].forEach((lx) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.056, 0.024), frameMat);
      frame.position.set(lx, 0.046, 0.186);
      head.add(frame);

      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.044, 0.028), lensMat);
      lens.position.set(lx, 0.046, 0.188);
      head.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.02), frameMat);
    bridge.position.set(0, 0.054, 0.188);
    head.add(bridge);
  } else {
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54),
      hairMat,
    );
    hairTop.scale.set(0.97, 1.02, 1.07);
    hairTop.position.set(0, 0.082, -0.014);
    hairTop.rotation.x = -0.18;
    head.add(hairTop);

    const beardGeo = new THREE.CylinderGeometry(0.142, 0.085, 0.145, 10, 1, false, -Math.PI * 0.48, Math.PI * 0.96);
    const beard = new THREE.Mesh(beardGeo, hairMat);
    beard.position.set(0, -0.145, 0.045);
    beard.rotation.x = 0.08;
    head.add(beard);

    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.024, 0.032), hairMat);
    mustache.position.set(0, -0.075, 0.178);
    head.add(mustache);

    const wireMat = new THREE.MeshStandardMaterial({ color: 0xb08d4f, roughness: 0.28, metalness: 0.8 });
    [-0.068, 0.068].forEach((gx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0055, 8, 20), wireMat);
      ring.position.set(gx, 0.045, 0.186);
      head.add(ring);
    });
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.007, 0.01), wireMat);
    noseBridge.position.set(0, 0.05, 0.188);
    head.add(noseBridge);
  }

  torso.add(head);

  const leftForearm = buildForearmBridge(mainClothMat, 0.07, 0.056);
  leftForearm.position.set(-0.46, 0.96, 0.16);
  root.add(leftForearm);

  const rightForearm = buildForearmBridge(mainClothMat, 0.07, 0.056);
  rightForearm.position.set(0.46, 0.96, 0.16);
  root.add(rightForearm);

  const leftBuilt = buildArticulatedHandMesh(-1, skinMat, skinMat, mainClothMat, 0.92);
  leftBuilt.hand.position.set(-1.26, 0.77, 1.05);
  root.add(leftBuilt.hand);

  const rightBuilt = buildArticulatedHandMesh(1, skinMat, skinMat, mainClothMat, 0.92);
  rightBuilt.hand.position.set(1.26, 0.77, 1.05);
  root.add(rightBuilt.hand);

  const baseTorsoTilt = isEnt ? 0.12 : isEgo ? -0.1 : 0.02;
  const baseHeadPitch = isEnt ? 0.06 : isEgo ? -0.08 : 0.02;
  torso.rotation.x = baseTorsoTilt;
  head.rotation.x = baseHeadPitch;

  return {
    root,
    torso,
    head,
    leftHand: leftBuilt.hand,
    rightHand: rightBuilt.hand,
    leftForearm,
    rightForearm,
    leftFingers: leftBuilt.fingers,
    rightFingers: rightBuilt.fingers,
    personality,
    baseTorsoTilt,
    baseHeadPitch,
  };
}

export function buildPlayerHands(mode: GameMode): { left: THREE.Group; right: THREE.Group } {
  const isSurv = mode === 'survival';
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: isSurv ? 0x1c1d22 : 0x5c728a,
    roughness: 0.8,
  });
  const handMat = new THREE.MeshStandardMaterial({
    color: isSurv ? 0xc2a28b : 0xe4bfa4,
    roughness: 0.65,
  });

  const makeHand = (side: -1 | 1) => {
    const g = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.092, 0.65, 10), sleeveMat);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.z = 0.36;
    g.add(sleeve);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.052, 0.16), handMat);
    palm.position.z = -0.02;
    palm.castShadow = true;
    g.add(palm);

    for (let i = -1.5; i <= 1.5; i++) {
      const f = new THREE.Group();
      f.position.set(i * 0.034, 0.004, -0.095);
      f.rotation.x = -0.16;
      const prox = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.06, 6), handMat);
      prox.rotation.x = Math.PI / 2;
      prox.position.z = -0.03;
      f.add(prox);
      const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.048, 6), handMat);
      dist.rotation.x = Math.PI / 2 - 0.35;
      dist.position.set(0, -0.012, -0.075);
      f.add(dist);
      g.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.08, 6), handMat);
    thumb.rotation.set(Math.PI / 2, side * 0.52, 0);
    thumb.position.set(-side * 0.078, -0.004, -0.055);
    g.add(thumb);
    return g;
  };

  return { left: makeHand(-1), right: makeHand(1) };
}
