import * as THREE from 'three';
import { AvatarId, PlayerAvatarDefinition, getPlayerAvatar } from '../data/playerAvatars';
import type { ArmSide, CharacterRigController } from './characterRig';

interface AvatarFaceStyleSpec {
  iris: string;
  irisInner: string;
  blush: string;
  lip: string;
  lipHighlight: string;
  expression: 'calm_smile' | 'stoic' | 'smirk' | 'bright_smile' | 'wise_smile' | 'bold_grin' | 'poised' | 'mysterious' | 'warm_smile' | 'focused';
  browTilt: number; // + = inner up (warm), - = focused/sharp
  browThickness: number;
  isSharpJaw: boolean;
  hasWings: boolean;
}

const AVATAR_FACE_SPECS: Record<AvatarId, AvatarFaceStyleSpec> = {
  strategist: {
    iris: '#2f6a58',
    irisInner: '#5aa68c',
    blush: 'rgba(218, 128, 108, 0.16)',
    lip: '#9d584b',
    lipHighlight: 'rgba(255,220,210,0.22)',
    expression: 'calm_smile',
    browTilt: -0.05,
    browThickness: 0.015,
    isSharpJaw: true,
    hasWings: false,
  },
  wanderer: {
    iris: '#4a607a',
    irisInner: '#7e9ec2',
    blush: 'rgba(196, 118, 98, 0.14)',
    lip: '#8e5147',
    lipHighlight: 'rgba(255,215,205,0.16)',
    expression: 'stoic',
    browTilt: -0.09,
    browThickness: 0.016,
    isSharpJaw: true,
    hasWings: false,
  },
  gentleman: {
    iris: '#5e432c',
    irisInner: '#946f4c',
    blush: 'rgba(212, 124, 108, 0.15)',
    lip: '#944f46',
    lipHighlight: 'rgba(255,220,210,0.2)',
    expression: 'smirk',
    browTilt: -0.04,
    browThickness: 0.014,
    isSharpJaw: true,
    hasWings: false,
  },
  rookie: {
    iris: '#7a4b26',
    irisInner: '#b57b42',
    blush: 'rgba(232, 126, 108, 0.28)',
    lip: '#a65a4c',
    lipHighlight: 'rgba(255,228,218,0.26)',
    expression: 'bright_smile',
    browTilt: 0.12,
    browThickness: 0.014,
    isSharpJaw: false,
    hasWings: false,
  },
  veteran: {
    iris: '#4b5563',
    irisInner: '#8290a3',
    blush: 'rgba(205, 130, 112, 0.16)',
    lip: '#8f554a',
    lipHighlight: 'rgba(255,220,210,0.16)',
    expression: 'wise_smile',
    browTilt: -0.04,
    browThickness: 0.019,
    isSharpJaw: true,
    hasWings: false,
  },
  adventurer: {
    iris: '#6b3f22',
    irisInner: '#ab6c3e',
    blush: 'rgba(224, 122, 98, 0.22)',
    lip: '#9a5244',
    lipHighlight: 'rgba(255,224,212,0.22)',
    expression: 'bold_grin',
    browTilt: -0.08,
    browThickness: 0.016,
    isSharpJaw: true,
    hasWings: false,
  },
  grandmaster: {
    iris: '#5b5134',
    irisInner: '#a89254',
    blush: 'rgba(226, 132, 126, 0.24)',
    lip: '#a84b52',
    lipHighlight: 'rgba(255,228,232,0.34)',
    expression: 'poised',
    browTilt: 0.04,
    browThickness: 0.011,
    isSharpJaw: false,
    hasWings: true,
  },
  night_lady: {
    iris: '#59426e',
    irisInner: '#9e7ac0',
    blush: 'rgba(218, 120, 138, 0.22)',
    lip: '#96344b',
    lipHighlight: 'rgba(255,212,226,0.34)',
    expression: 'mysterious',
    browTilt: -0.06,
    browThickness: 0.011,
    isSharpJaw: false,
    hasWings: true,
  },
  artist: {
    iris: '#4d6b47',
    irisInner: '#82ad76',
    blush: 'rgba(236, 134, 118, 0.28)',
    lip: '#b85450',
    lipHighlight: 'rgba(255,230,224,0.34)',
    expression: 'warm_smile',
    browTilt: 0.1,
    browThickness: 0.011,
    isSharpJaw: false,
    hasWings: true,
  },
  tactician: {
    iris: '#2e6394',
    irisInner: '#68a6db',
    blush: 'rgba(222, 132, 128, 0.22)',
    lip: '#a4545e',
    lipHighlight: 'rgba(255,228,234,0.3)',
    expression: 'focused',
    browTilt: -0.05,
    browThickness: 0.011,
    isSharpJaw: false,
    hasWings: true,
  },
};

/**
 * Generates a high-detail 512x256 face CanvasTexture matching `friendlyFaces.ts` UV layout
 * (SphereGeometry with phiStart = -PI/2; face center strictly at x=256, y=128).
 */
function createAvatarFaceTexture(def: PlayerAvatarDefinition): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const p = def.palette;
  const spec = AVATAR_FACE_SPECS[def.id];
  const isFemale = def.gender === 'female';

  // 1. Warm skin base with radial depth shading
  ctx.fillStyle = p.skin;
  ctx.fillRect(0, 0, 512, 256);

  const skinGrad = ctx.createRadialGradient(256, 114, 16, 256, 132, 148);
  skinGrad.addColorStop(0, 'rgba(255, 248, 238, 0.18)');
  skinGrad.addColorStop(0.62, 'rgba(210, 150, 115, 0.04)');
  skinGrad.addColorStop(1, 'rgba(135, 86, 62, 0.2)');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 512, 256);

  // 2. Soft cheek blush
  [215, 297].forEach((bx) => {
    const blushGrad = ctx.createRadialGradient(bx, 138, 2, bx, 138, isFemale ? 19 : 16);
    blushGrad.addColorStop(0, spec.blush);
    blushGrad.addColorStop(1, 'rgba(232, 126, 108, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.arc(bx, 138, isFemale ? 19 : 16, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Soft nose bridge highlight & subtle underside shadow
  ctx.fillStyle = 'rgba(255, 246, 236, 0.14)';
  ctx.beginPath();
  ctx.ellipse(256, 128, 3.6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(128, 78, 54, 0.2)';
  ctx.beginPath();
  ctx.ellipse(256, 141, 6.8, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Expressive detailed eyes (orbital shadow, sclera, dual-tone iris, pupil, dual catchlights, lashes)
  const eyeY = 121;
  [230, 282].forEach((ex, idx) => {
    const side = idx === 0 ? -1 : 1;

    // Soft orbital depth
    ctx.fillStyle = isFemale ? 'rgba(135, 84, 78, 0.15)' : 'rgba(118, 76, 56, 0.14)';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 13, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sclera
    ctx.fillStyle = '#faf8f4';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 9.8, isFemale ? 9.0 : 8.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer limbal ring + main iris
    ctx.fillStyle = '#1b1d24';
    ctx.beginPath();
    ctx.arc(ex + side * -0.4, eyeY + 0.4, isFemale ? 6.0 : 5.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = spec.iris;
    ctx.beginPath();
    ctx.arc(ex + side * -0.4, eyeY + 0.4, isFemale ? 5.4 : 5.0, 0, Math.PI * 2);
    ctx.fill();

    // Inner iris luminosity
    ctx.fillStyle = spec.irisInner;
    ctx.beginPath();
    ctx.arc(ex + side * -0.4, eyeY + 1.5, isFemale ? 3.5 : 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#111116';
    ctx.beginPath();
    ctx.arc(ex + side * -0.4, eyeY + 0.4, isFemale ? 2.9 : 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Dual specular catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 2.3, eyeY - 2.1, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 2.2, eyeY + 2.1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Upper lash line (with subtle eyeliner wing for female avatars)
    ctx.strokeStyle = '#1e1715';
    ctx.lineWidth = isFemale ? 2.7 : 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ex, eyeY + 1.1, 10.3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    if (spec.hasWings) {
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(ex + side * 9.5, eyeY - 1.5);
      ctx.lineTo(ex + side * 13.0, eyeY - 4.0);
      ctx.stroke();
    }

    // Subtle upper eyelid crease
    ctx.strokeStyle = 'rgba(118, 74, 56, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ex, eyeY - 1.2, 10.6, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    // Soft lower lid line
    ctx.strokeStyle = 'rgba(118, 74, 56, 0.22)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(ex, eyeY - 1.0, 9.6, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Wisdom crow's-feet for Veteran
    if (def.id === 'veteran') {
      ctx.strokeStyle = 'rgba(120, 82, 62, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex + side * 11, eyeY - 1);
      ctx.lineTo(ex + side * 15, eyeY - 3);
      ctx.moveTo(ex + side * 11, eyeY + 2);
      ctx.lineTo(ex + side * 15, eyeY + 3);
      ctx.stroke();
    }
  });

  // 5. Individual mouth & lips
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isFemale) {
    // Sculpted upper & lower lips with cupid's bow
    const lift =
      spec.expression === 'warm_smile'
        ? -3.0
        : spec.expression === 'poised'
          ? -1.6
          : spec.expression === 'mysterious'
            ? -1.2
            : -0.6;

    // Upper lip
    ctx.fillStyle = spec.lip;
    ctx.beginPath();
    ctx.moveTo(242, 157 + lift * 0.4);
    ctx.quadraticCurveTo(250, 152, 256, 154.5);
    ctx.quadraticCurveTo(262, 152, 270, 157 + lift * 0.4);
    ctx.quadraticCurveTo(256, 159.2, 242, 157 + lift * 0.4);
    ctx.fill();

    // Lower lip
    ctx.fillStyle = spec.lip;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.moveTo(244, 157.5 + lift * 0.3);
    ctx.quadraticCurveTo(256, 165.5, 268, 157.5 + lift * 0.3);
    ctx.quadraticCurveTo(256, 159.2, 244, 157.5 + lift * 0.3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Soft lip gloss highlight
    ctx.fillStyle = spec.lipHighlight;
    ctx.beginPath();
    ctx.ellipse(256, 161.2, 5.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center mouth line
    ctx.strokeStyle = 'rgba(72, 24, 30, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(242, 157 + lift * 0.4);
    ctx.quadraticCurveTo(256, 159.5 - lift * 0.6, 270, 157 + lift * 0.4);
    ctx.stroke();
  } else if (spec.expression === 'bright_smile' || spec.expression === 'bold_grin') {
    // Open warm smile with upper teeth strip
    ctx.fillStyle = '#7e332c';
    ctx.beginPath();
    ctx.moveTo(240, 155);
    ctx.quadraticCurveTo(256, 168, 272, 155);
    ctx.quadraticCurveTo(256, 157.5, 240, 155);
    ctx.fill();

    ctx.fillStyle = '#faf8f2';
    ctx.beginPath();
    ctx.moveTo(243, 156);
    ctx.quadraticCurveTo(256, 160, 269, 156);
    ctx.quadraticCurveTo(256, 157.2, 243, 156);
    ctx.fill();

    ctx.strokeStyle = spec.lip;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(239, 155);
    ctx.quadraticCurveTo(256, 168, 273, 155);
    ctx.stroke();
  } else if (spec.expression === 'smirk') {
    ctx.strokeStyle = spec.lip;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(242, 158);
    ctx.quadraticCurveTo(257, 159, 272, 152);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(130, 74, 60, 0.32)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(250, 163);
    ctx.quadraticCurveTo(257, 164.8, 264, 162);
    ctx.stroke();
  } else if (spec.expression === 'stoic') {
    ctx.strokeStyle = spec.lip;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(243, 157.5);
    ctx.quadraticCurveTo(256, 158.8, 269, 157.5);
    ctx.stroke();
  } else {
    // Calm / wise gentle smile
    ctx.strokeStyle = spec.lip;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(243, 156);
    ctx.quadraticCurveTo(256, 162, 269, 156);
    ctx.stroke();
  }

  // Subtle jaw shadow / beard transition for Veteran
  if (def.id === 'veteran') {
    ctx.fillStyle = 'rgba(156, 150, 141, 0.34)';
    ctx.beginPath();
    ctx.ellipse(256, 173, 35, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Sculpted anatomical head matching `friendlyFaces.ts` proportions with softer jaw taper for female avatars.
 */
function createSculptedAvatarHeadGeometry(isSharpJaw: boolean, isFemale: boolean): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(0.22, 24, 18, -Math.PI / 2, Math.PI * 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= isFemale ? 0.89 : 0.92;
    y *= isFemale ? 1.05 : 1.07;
    z *= 0.96;

    if (y < -0.01) {
      const t = Math.min(1, Math.abs(y + 0.01) / 0.22);
      const jawTaper = isFemale ? 1 - t * 0.27 : isSharpJaw ? 1 - t * 0.23 : 1 - t * 0.19;
      x *= jawTaper;
      if (z > 0.04) {
        z += t * (isFemale ? 0.014 : 0.018);
        y -= t * 0.013;
      }
    }

    if (z > 0.06 && y > -0.05 && y < 0.03 && Math.abs(x) > 0.088) {
      x *= 1.035;
      z += 0.008;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function addDetailedGlasses(
  headGroup: THREE.Group,
  kind: 'rect' | 'thin_round',
  frameMat: THREE.Material,
  lensMat: THREE.Material,
  y = 0.082,
): void {
  const zFront = 0.21;
  const glasses = new THREE.Group();

  if (kind === 'rect') {
    [-0.071, 0.071].forEach((gx, idx) => {
      const rotY = idx === 0 ? -0.14 : 0.14;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.106, 0.011, 0.011), frameMat);
      topBar.position.set(gx, y + 0.028, zFront);
      topBar.rotation.y = rotY;
      glasses.add(topBar);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.009, 0.011), frameMat);
      botBar.position.set(gx, y - 0.026, zFront);
      botBar.rotation.y = rotY;
      glasses.add(botBar);

      [-0.05, 0.05].forEach((sx) => {
        const sideBar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.058, 0.011), frameMat);
        sideBar.position.set(gx + sx, y + 0.001, zFront);
        sideBar.rotation.y = rotY;
        glasses.add(sideBar);
      });

      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.048), lensMat);
      lens.position.set(gx, y + 0.001, zFront);
      lens.rotation.y = rotY;
      glasses.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.01, 0.011), frameMat);
    bridge.position.set(0, y + 0.008, zFront + 0.004);
    glasses.add(bridge);
  } else {
    const ringGeo = new THREE.TorusGeometry(0.05, 0.0055, 10, 24);
    const lensGeo = new THREE.CircleGeometry(0.047, 20);
    [-0.07, 0.07].forEach((gx, idx) => {
      const rotY = idx === 0 ? -0.14 : 0.14;
      const ring = new THREE.Mesh(ringGeo, frameMat);
      ring.position.set(gx, y, zFront);
      ring.rotation.y = rotY;
      glasses.add(ring);

      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(gx, y, zFront);
      lens.rotation.y = rotY;
      glasses.add(lens);
    });
    const bridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.021, 0.0045, 8, 12, Math.PI),
      frameMat,
    );
    bridge.position.set(0, y + 0.003, zFront + 0.004);
    glasses.add(bridge);
  }

  // Temples extending cleanly back to the ears
  const armGeo = new THREE.BoxGeometry(0.008, 0.01, 0.214);
  [-0.128, 0.128].forEach((ax, idx) => {
    const arm = new THREE.Mesh(armGeo, frameMat);
    arm.position.set(ax * 1.24, y + 0.006, 0.104);
    arm.rotation.y = idx === 0 ? 0.27 : -0.27;
    glasses.add(arm);
  });

  headGroup.add(glasses);
}

function makeLimbMesh(
  length: number,
  topRadius: number,
  bottomRadius: number,
  material: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, length, 10, 1);
  geo.translate(0, -length * 0.5, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeHandGroup(handMat: THREE.Material): {
  group: THREE.Group;
  fingersPivot: THREE.Group;
  socket: THREE.Object3D;
} {
  const group = new THREE.Group();
  const palmGeo = new THREE.BoxGeometry(0.088, 0.104, 0.036);
  palmGeo.translate(0, -0.052, 0);
  const palm = new THREE.Mesh(palmGeo, handMat);
  palm.castShadow = true;
  group.add(palm);

  const fingersPivot = new THREE.Group();
  fingersPivot.position.set(0, -0.102, 0);
  const offsets = [-0.03, -0.01, 0.01, 0.03];
  const lengths = [0.062, 0.072, 0.068, 0.054];
  offsets.forEach((x, i) => {
    const fGeo = new THREE.CylinderGeometry(0.009, 0.007, lengths[i], 6);
    fGeo.translate(0, -lengths[i] * 0.5, 0);
    const f = new THREE.Mesh(fGeo, handMat);
    f.position.set(x, 0, 0);
    f.rotation.x = 0.36;
    fingersPivot.add(f);
  });
  group.add(fingersPivot);

  const thumbGeo = new THREE.CylinderGeometry(0.0105, 0.008, 0.05, 6);
  thumbGeo.translate(0, -0.025, 0);
  const thumb = new THREE.Mesh(thumbGeo, handMat);
  thumb.position.set(0.046, -0.044, 0.012);
  thumb.rotation.z = 0.52;
  thumb.rotation.x = 0.38;
  group.add(thumb);

  const socket = new THREE.Object3D();
  socket.position.set(0, -0.125, 0.02);
  group.add(socket);

  return { group, fingersPivot, socket };
}

interface ArmChain {
  side: ArmSide;
  shoulderLocal: THREE.Vector3;
  idleHandLocal: THREE.Vector3;
  idlePoleLocal: THREE.Vector3;
  reachPoleLocal: THREE.Vector3;
  upperArm: THREE.Mesh;
  forearm: THREE.Mesh;
  elbowCap: THREE.Mesh;
  handGroup: THREE.Group;
  fingersPivot: THREE.Group;
  handSocket: THREE.Object3D;
  upperLen: number;
  forearmLen: number;
  targetWorld: THREE.Vector3 | null;
  desiredWeight: number;
  currentWeight: number;
  currentHandLocal: THREE.Vector3;
  gripped: boolean;
  gripAmount: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const TMP_DIR = new THREE.Vector3();
const TMP_POLE = new THREE.Vector3();
const TMP_ELBOW = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();
const TMP_TARGET = new THREE.Vector3();
const TMP_OFFSET = new THREE.Vector3();
const TMP_ROOT_TARGET = new THREE.Vector3();
const TMP_POLE_LERP = new THREE.Vector3();
const TMP_DESIRED_LOCAL = new THREE.Vector3();

function solveArmIK(arm: ArmChain, handPosLocal: THREE.Vector3, poleLocal: THREE.Vector3): void {
  const S = arm.shoulderLocal;
  const a = arm.upperLen;
  const b = arm.forearmLen;

  TMP_DIR.subVectors(handPosLocal, S);
  const maxDist = a + b - 0.008;
  const minDist = Math.abs(a - b) + 0.03;
  let d = TMP_DIR.length();
  if (d < 1e-5) {
    TMP_DIR.set(0, -1, 0.1).normalize();
    d = minDist;
  } else {
    TMP_DIR.divideScalar(d);
    d = THREE.MathUtils.clamp(d, minDist, maxDist);
  }

  TMP_POLE.subVectors(poleLocal, S);
  const proj = TMP_POLE.dot(TMP_DIR);
  TMP_POLE.addScaledVector(TMP_DIR, -proj);
  if (TMP_POLE.lengthSq() < 1e-6) {
    TMP_POLE.set(arm.side === 'left' ? 1 : -1, -0.3, 0.2).normalize();
  } else {
    TMP_POLE.normalize();
  }

  const cosAngle = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinAngle = Math.sqrt(Math.max(0, 1 - cosAngle * cosAngle));
  TMP_ELBOW.copy(S)
    .addScaledVector(TMP_DIR, cosAngle * a)
    .addScaledVector(TMP_POLE, sinAngle * a);

  arm.upperArm.position.copy(S);
  TMP_DIR.subVectors(TMP_ELBOW, S).normalize();
  TMP_QUAT.setFromUnitVectors(DOWN, TMP_DIR);
  arm.upperArm.quaternion.copy(TMP_QUAT);

  arm.elbowCap.position.copy(TMP_ELBOW);

  arm.forearm.position.copy(TMP_ELBOW);
  TMP_DIR.subVectors(handPosLocal, TMP_ELBOW).normalize();
  TMP_QUAT.setFromUnitVectors(DOWN, TMP_DIR);
  arm.forearm.quaternion.copy(TMP_QUAT);

  arm.handGroup.position.copy(handPosLocal);
  arm.handGroup.quaternion.copy(TMP_QUAT);
}

/**
 * Full CharacterRigController factory for all 10 ChUno player avatars (6 male + 4 female).
 * Matches the sculpted anatomical head, CanvasTexture face, layered hair, accessories,
 * contoured torso, IK arms, breathing, subtle head sway, and live eye-blinking of
 * `friendlyFaces.ts` + `characterRig.ts`.
 */
export function createPlayerAvatarRig(avatarId: AvatarId): CharacterRigController {
  const def = getPlayerAvatar(avatarId);
  const cfg = def.threeConfig;
  const spec = AVATAR_FACE_SPECS[def.id];
  const isFemale = def.gender === 'female';

  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = `player-avatar-rig-${def.id}`;
  root.userData.onlineAvatarId = def.id;

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.45, 0);
  root.add(torsoPivot);

  const faceTex = createAvatarFaceTexture(def);
  if (faceTex) textures.push(faceTex);

  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex ?? undefined,
    color: faceTex ? 0xffffff : cfg.skinColor,
    roughness: 0.66,
    metalness: 0.02,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: cfg.skinColor,
    roughness: 0.66,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: cfg.hairColor,
    roughness: 0.76,
    metalness: 0.05,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: cfg.hairColor,
    roughness: 0.84,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: cfg.coatColor,
    roughness: 0.8,
    metalness: 0.05,
  });
  const coatDoubleMat = new THREE.MeshStandardMaterial({
    color: cfg.coatColor,
    roughness: 0.82,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: cfg.shirtColor,
    roughness: 0.72,
    metalness: 0.03,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.48,
    metalness: 0.25,
  });
  const accentDoubleMat = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.5,
    metalness: 0.22,
    side: THREE.DoubleSide,
  });
  const glassFrameMat = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.28,
    metalness: 0.72,
  });
  const glassLensMat = new THREE.MeshStandardMaterial({
    color: 0xdff0ff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.22,
  });

  materials.push(
    headMat,
    skinMat,
    hairMat,
    browMat,
    coatMat,
    coatDoubleMat,
    shirtMat,
    accentMat,
    accentDoubleMat,
    glassFrameMat,
    glassLensMat,
  );

  // ── 1. Sculpted LatheGeometry Torso & Outfit ──────────────────────────────
  const sw = cfg.shoulderScale;
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.245 * sw, 0.0),
    new THREE.Vector2(0.26 * sw, 0.24),
    new THREE.Vector2(0.312 * sw, 0.46),
    new THREE.Vector2(0.33 * sw, 0.56),
    new THREE.Vector2(0.295 * sw, 0.625),
    new THREE.Vector2(0.205 * sw, 0.668),
    new THREE.Vector2(0.115, 0.69),
    new THREE.Vector2(0.0, 0.69),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 20);
  torsoGeo.scale(1.1, 1.0, 0.66);
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torsoPivot.add(torso);

  // Chest front surface Z reference at mid-chest (y ~ 0.56): 0.33 * sw * 0.66
  const chestFrontZ = 0.33 * sw * 0.66;

  // Subtle recessed shirt collar (curved cylinder flush with upper chest V-neck)
  if (cfg.collarStyle === 'crisp' || cfg.collarStyle === 'coat' || cfg.collarStyle === 'cloak') {
    const shirtCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.102, 0.128, 0.125, 14, 1, false, -Math.PI * 0.32, Math.PI * 0.64),
      shirtMat,
    );
    shirtCollar.position.set(0, 0.635, 0.068 + (sw - 1) * 0.04);
    torsoPivot.add(shirtCollar);
  }

  // Collar / Lapels / Scarf / Hoodie / Cloak (all Z offsets derived from chestFrontZ to prevent clipping)
  if (cfg.collarStyle === 'scarf') {
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.05, 12, 22), accentMat);
    scarfRing.rotation.x = Math.PI * 0.5;
    scarfRing.position.set(0, 0.7, 0.012);
    torsoPivot.add(scarfRing);

    const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 10), accentMat);
    scarfKnot.scale.set(1.12, 0.86, 0.8);
    scarfKnot.position.set(0.066, 0.645, chestFrontZ - 0.025);
    torsoPivot.add(scarfKnot);

    const scarfTail = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.19, 10), accentMat);
    scarfTail.scale.set(1.12, 1, 0.46);
    scarfTail.position.set(0.088, 0.535, chestFrontZ + 0.022);
    scarfTail.rotation.z = -0.12;
    scarfTail.rotation.x = -0.14;
    torsoPivot.add(scarfTail);
  } else if (cfg.collarStyle === 'high') {
    // Open-front regal high collar (thetaStart=0.28*PI..1.72*PI leaves front +Z 100% open)
    const highCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.23, 0.165, 18, 1, true, Math.PI * 0.28, Math.PI * 1.44),
      coatDoubleMat,
    );
    highCollar.position.set(0, 0.735, -0.02);
    torsoPivot.add(highCollar);

    // Matching accent trim along top rim (identical cylinder arc = zero rotation mismatch)
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.208, 0.208, 0.02, 18, 1, true, Math.PI * 0.28, Math.PI * 1.44),
      accentDoubleMat,
    );
    trim.position.set(0, 0.818, -0.02);
    torsoPivot.add(trim);
  } else if (cfg.collarStyle === 'cloak') {
    // Open-front tactical cape wrapping shoulders & back cleanly with front chest open
    const cloak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.39 * sw, 0.42, 20, 1, true, Math.PI * 0.2, Math.PI * 1.6),
      coatDoubleMat,
    );
    cloak.scale.set(1.12, 1, 0.72);
    cloak.position.set(0, 0.495, -0.015);
    torsoPivot.add(cloak);

    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), accentMat);
    clasp.position.set(0, 0.65, chestFrontZ + 0.01);
    torsoPivot.add(clasp);
  } else if (cfg.collarStyle === 'hoodie') {
    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.146, 0.04, 10, 20), accentMat);
    hoodRim.rotation.x = Math.PI * 0.48;
    hoodRim.position.set(0, 0.692, 0.008);
    torsoPivot.add(hoodRim);

    const hoodBackFold = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), coatMat);
    hoodBackFold.scale.set(1.2, 0.52, 0.75);
    hoodBackFold.position.set(0, 0.67, -0.115);
    torsoPivot.add(hoodBackFold);

    [-0.05, 0.05].forEach((dx) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.145, 6), accentMat);
      cord.position.set(dx, 0.565, chestFrontZ + 0.016);
      cord.rotation.x = -0.12;
      torsoPivot.add(cord);
    });
  } else {
    // Crisp blazer / coat lapels + tie or brooch hugging chest contour cleanly
    [-0.084, 0.084].forEach((lx, i) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.165, 0.026), coatMat);
      lapel.position.set(lx, 0.59, chestFrontZ - 0.008);
      lapel.rotation.z = i === 0 ? 0.24 : -0.24;
      lapel.rotation.x = -0.18;
      torsoPivot.add(lapel);
    });
    if (isFemale) {
      const brooch = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), accentMat);
      brooch.position.set(0, 0.625, chestFrontZ + 0.008);
      torsoPivot.add(brooch);
    } else {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.145, 0.016), accentMat);
      tie.position.set(0, 0.585, chestFrontZ + 0.008);
      tie.rotation.x = -0.14;
      torsoPivot.add(tie);
    }
  }

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.07 : 0.084, isFemale ? 0.084 : 0.098, 0.17, 12),
    skinMat,
  );
  neck.position.set(0, 0.73, 0.006);
  torsoPivot.add(neck);

  // ── 2. Detailed Sculpted Head + Face + Blinking Eyelids ───────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.895, 0.02);
  torsoPivot.add(headGroup);

  const headGeo = createSculptedAvatarHeadGeometry(spec.isSharpJaw, isFemale);
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.06, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.038, 10, 10);
  earGeo.scale(0.42, 1.05, 0.78);
  [-0.19, 0.19].forEach((ex) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(isFemale ? ex * 0.96 : ex, 0.062, -0.006);
    headGroup.add(ear);
  });

  // Soft 3D capsule nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skinMat);
  nose.scale.set(isFemale ? 0.68 : 0.78, isFemale ? 1.42 : 1.54, isFemale ? 1.02 : 1.15);
  nose.position.set(0, 0.054, 0.204);
  nose.rotation.x = -0.14;
  headGroup.add(nose);

  // Blinking eyelid overlays (hidden when scale.y ~ 0, smoothly sweep closed during blink)
  const eyelids: THREE.Mesh[] = [];
  const lidGeo = new THREE.SphereGeometry(0.044, 10, 8);
  lidGeo.scale(1.05, 0.72, 0.45);
  [-0.064, 0.064].forEach((lx, idx) => {
    const lid = new THREE.Mesh(lidGeo, skinMat);
    lid.position.set(lx, 0.088, 0.194);
    lid.rotation.y = idx === 0 ? -0.26 : 0.26;
    lid.scale.y = 0.001;
    lid.visible = false;
    headGroup.add(lid);
    eyelids.push(lid);
  });

  // Sculpted 3D eyebrows
  const browW = isFemale ? 0.058 : 0.066;
  const browGeo = new THREE.BoxGeometry(browW, spec.browThickness, 0.016);
  [-0.066, 0.066].forEach((bx, idx) => {
    const side = idx === 0 ? -1 : 1;
    const brow = new THREE.Mesh(browGeo, browMat);
    const by = def.id === 'gentleman' && idx === 1 ? 0.132 : 0.125;
    brow.position.set(bx, by, 0.199);
    brow.rotation.z = side * -spec.browTilt;
    brow.rotation.y = side * 0.22;
    headGroup.add(brow);
  });

  // ── 3. Multi-layered Hairstyles, Beard & Signature Headwear ───────────────
  // Keep hairline strictly above eyebrows (y >= 0.15) so eyes & brows remain 100% clear!
  const addBaseHairCap = (heightScale = 0.96, radius = 0.222) => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.45),
      hairMat,
    );
    cap.scale.set(isFemale ? 0.93 : 0.96, heightScale, 1.03);
    cap.position.set(0, 0.125, -0.026);
    cap.rotation.x = -0.16;
    cap.castShadow = true;
    headGroup.add(cap);
  };

  if (cfg.hairStyle === 'neat_part') {
    addBaseHairCap(0.96);
    // Side-parted layered top wave + sideburns (cleanly above forehead)
    const topWave = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), hairMat);
    topWave.scale.set(1.18, 0.52, 1.25);
    topWave.position.set(0.032, 0.248, 0.015);
    topWave.rotation.z = -0.14;
    headGroup.add(topWave);
    [-0.184, 0.184].forEach((sx) => {
      const sb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.08, 0.044), hairMat);
      sb.position.set(sx, 0.105, 0.015);
      headGroup.add(sb);
    });
  } else if (cfg.hairStyle === 'hood_tucked') {
    // Clean inner hair cap + tousled bangs high on forehead peeking under Wanderer's open hood
    addBaseHairCap(0.92, 0.218);
    const bangs: Array<[number, number, number, number]> = [
      [-0.078, 0.186, 0.156, 0.28],
      [-0.02, 0.194, 0.168, 0.08],
      [0.044, 0.19, 0.164, -0.18],
      [0.092, 0.182, 0.15, -0.34],
    ];
    bangs.forEach(([x, y, z, rz]) => {
      const lock = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), hairMat);
      lock.scale.set(1.0, 0.62, 0.78);
      lock.position.set(x, y, z);
      lock.rotation.z = rz;
      headGroup.add(lock);
    });
  } else if (cfg.hairStyle === 'swept_back') {
    addBaseHairCap(0.95);
    [-0.185, 0.185].forEach((sx) => {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), hairMat);
      tuft.scale.set(0.55, 1.15, 1.15);
      tuft.position.set(sx, 0.11, -0.015);
      headGroup.add(tuft);
    });
  } else if (cfg.hairStyle === 'messy_short') {
    addBaseHairCap(0.98);
    // 5 dynamic tousled bangs resting high on forehead above brows
    const bangs: Array<[number, number, number, number, number, number]> = [
      [-0.105, 0.185, 0.145, 0.046, 0.032, 0.34],
      [-0.048, 0.194, 0.166, 0.052, 0.036, 0.14],
      [0.006, 0.198, 0.174, 0.054, 0.038, -0.04],
      [0.06, 0.192, 0.164, 0.048, 0.034, -0.22],
      [0.11, 0.182, 0.142, 0.042, 0.03, -0.36],
    ];
    bangs.forEach(([x, y, z, rx, ry, rz]) => {
      const lock = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hairMat);
      lock.scale.set(rx, ry, 0.04);
      lock.position.set(x, y, z);
      lock.rotation.z = rz;
      lock.rotation.x = 0.2;
      headGroup.add(lock);
    });
    const crownTuft = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 8), hairMat);
    crownTuft.scale.set(1.22, 0.62, 1.22);
    crownTuft.position.set(0, 0.27, 0.0);
    headGroup.add(crownTuft);
  } else if (cfg.hairStyle === 'silver_trim') {
    addBaseHairCap(0.96);
    [-0.185, 0.185].forEach((sx, idx) => {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), hairMat);
      tuft.scale.set(0.55, 1.2, 1.3);
      tuft.position.set(sx, 0.12, -0.015);
      tuft.rotation.z = idx === 0 ? 0.12 : -0.12;
      headGroup.add(tuft);
    });
  } else if (cfg.hairStyle === 'ponytail_band') {
    addBaseHairCap(0.98);
    [-0.075, 0.0, 0.078].forEach((x, i) => {
      const lock = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), hairMat);
      lock.scale.set(0.92, 0.62, 0.85);
      lock.position.set(x, 0.198, 0.145 + (i === 1 ? 0.016 : 0));
      lock.rotation.z = i === 0 ? 0.25 : i === 2 ? -0.25 : 0;
      headGroup.add(lock);
    });
    const pony = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.28, 12), hairMat);
    pony.position.set(0, 0.09, -0.27);
    pony.rotation.x = -0.68;
    headGroup.add(pony);
  } else if (cfg.hairStyle === 'high_bun') {
    addBaseHairCap(0.96);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.094, 16, 12), hairMat);
    bun.scale.set(1.05, 0.92, 1.0);
    bun.position.set(0, 0.31, -0.05);
    headGroup.add(bun);

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 8), accentMat);
    pin.rotation.z = 1.22;
    pin.position.set(0.01, 0.315, -0.05);
    headGroup.add(pin);

    [-0.164, 0.164].forEach((sx, i) => {
      const strand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), hairMat);
      strand.scale.set(0.62, 1.5, 0.78);
      strand.position.set(sx, 0.135, 0.07);
      strand.rotation.z = i === 0 ? 0.22 : -0.22;
      headGroup.add(strand);
    });
  } else if (cfg.hairStyle === 'sleek_bob') {
    addBaseHairCap(0.98);
    [-0.178, 0.178].forEach((sx, i) => {
      const cheekLock = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.056, 0.27, 12), hairMat);
      cheekLock.scale.set(0.72, 1, 1.18);
      cheekLock.position.set(sx, 0.015, 0.005);
      cheekLock.rotation.z = i === 0 ? 0.08 : -0.08;
      headGroup.add(cheekLock);
    });
    const backBob = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.205, 0.25, 16), hairMat);
    backBob.position.set(0, 0.015, -0.075);
    headGroup.add(backBob);

    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.102, 12, 8), hairMat);
    fringe.scale.set(1.22, 0.35, 0.75);
    fringe.position.set(-0.04, 0.212, 0.125);
    fringe.rotation.z = 0.24;
    headGroup.add(fringe);
  } else if (cfg.hairStyle === 'long_waves') {
    addBaseHairCap(0.98);
    const backWaves = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.235, 0.44, 16), hairMat);
    backWaves.scale.set(1.08, 1, 0.72);
    backWaves.position.set(0, -0.08, -0.095);
    headGroup.add(backWaves);
    [-0.176, 0.176].forEach((sx, i) => {
      const wave = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.054, 0.4, 12), hairMat);
      wave.position.set(sx, -0.015, 0.006);
      wave.rotation.z = i === 0 ? 0.08 : -0.08;
      headGroup.add(wave);
    });
    const bangs = new THREE.Mesh(new THREE.SphereGeometry(0.104, 12, 8), hairMat);
    bangs.scale.set(1.28, 0.36, 0.76);
    bangs.position.set(0.025, 0.206, 0.128);
    bangs.rotation.z = -0.12;
    headGroup.add(bangs);
  } else if (cfg.hairStyle === 'high_ponytail') {
    addBaseHairCap(0.96);
    const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.014, 8, 16), accentMat);
    tieRing.position.set(0, 0.21, -0.2);
    tieRing.rotation.x = 0.7;
    headGroup.add(tieRing);

    const pony = new THREE.Mesh(new THREE.ConeGeometry(0.082, 0.36, 14), hairMat);
    pony.position.set(0, 0.09, -0.28);
    pony.rotation.x = -0.52;
    headGroup.add(pony);

    [-0.085, 0.085].forEach((sx, i) => {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), hairMat);
      fringe.scale.set(0.95, 0.46, 0.78);
      fringe.position.set(sx, 0.202, 0.135);
      fringe.rotation.z = i === 0 ? 0.26 : -0.26;
      headGroup.add(fringe);
    });
  }

  // Sculpted 3D Beard + separate curved mustache (Veteran)
  if (cfg.facialHair === 'beard') {
    const chinBeard = new THREE.Mesh(new THREE.ConeGeometry(0.108, 0.15, 14), hairMat);
    chinBeard.rotation.x = Math.PI;
    chinBeard.scale.set(1.08, 1.0, 0.7);
    chinBeard.position.set(0, -0.112, 0.122);
    headGroup.add(chinBeard);

    [-0.116, 0.116].forEach((bx, idx) => {
      const sideBeard = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), hairMat);
      sideBeard.scale.set(0.72, 1.2, 1.08);
      sideBeard.position.set(bx, -0.045, 0.088);
      sideBeard.rotation.z = idx === 0 ? 0.34 : -0.34;
      sideBeard.rotation.y = idx === 0 ? -0.3 : 0.3;
      headGroup.add(sideBeard);
    });

    [-0.04, 0.04].forEach((mx, idx) => {
      const stache = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), hairMat);
      stache.scale.set(1.48, 0.46, 0.68);
      stache.position.set(mx, 0.004, 0.198);
      stache.rotation.z = idx === 0 ? 0.22 : -0.22;
      stache.rotation.y = idx === 0 ? -0.22 : 0.22;
      headGroup.add(stache);
    });
  }

  // Headwear (strictly clear of +Z face, eyes, and eyebrows)
  if (cfg.headwear === 'fedora') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.35, 0.018, 24), coatMat);
    brim.scale.set(0.95, 1, 1.06);
    brim.position.set(0, 0.196, 0.006);
    brim.rotation.x = 0.04;
    brim.castShadow = true;
    headGroup.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.204, 0.165, 18), coatMat);
    crown.scale.set(0.94, 1, 1.05);
    crown.position.set(0, 0.282, 0.0);
    crown.rotation.x = 0.04;
    headGroup.add(crown);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.201, 0.206, 0.032, 18), accentMat);
    band.scale.set(0.94, 1, 1.05);
    band.position.set(0, 0.222, 0.004);
    band.rotation.x = 0.04;
    headGroup.add(band);
  } else if (cfg.headwear === 'hood') {
    // Three.js SphereGeometry: phi=PI/2 is +Z (face), phi=3*PI/2 is -Z (back of head).
    // phiStart=0.86*PI, phiLength=1.28*PI wraps ONLY the back, crown, and temples,
    // keeping the entire +Z face 100% open and unobstructed!
    const hoodShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.272, 22, 16, Math.PI * 0.86, Math.PI * 1.28, 0, Math.PI * 0.84),
      coatDoubleMat,
    );
    hoodShell.scale.set(1.0, 1.05, 1.04);
    hoodShell.position.set(0, 0.088, -0.028);
    hoodShell.castShadow = true;
    headGroup.add(hoodShell);

    // Sculpted open hood arch framing forehead & cheeks cleanly from behind the eye line
    const hoodArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.238, 0.026, 10, 22, Math.PI * 1.18),
      coatMat,
    );
    hoodArch.position.set(0, 0.092, 0.068);
    hoodArch.rotation.z = -Math.PI * 0.09;
    hoodArch.rotation.x = -0.14;
    headGroup.add(hoodArch);

    // Back cowl drape joining hood seamlessly to shoulders behind the neck
    const hoodDrape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.26, 0.2, 16, 1, true, Math.PI * 0.42, Math.PI * 1.16),
      coatDoubleMat,
    );
    hoodDrape.position.set(0, -0.095, -0.04);
    headGroup.add(hoodDrape);
  } else if (cfg.headwear === 'beret') {
    const beret = new THREE.Mesh(new THREE.SphereGeometry(0.238, 20, 14), accentMat);
    beret.scale.set(1.14, 0.4, 1.08);
    beret.position.set(-0.036, 0.232, -0.012);
    beret.rotation.z = 0.22;
    beret.castShadow = true;
    headGroup.add(beret);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.035, 8), accentMat);
    stem.position.set(-0.054, 0.32, -0.01);
    stem.rotation.z = 0.25;
    headGroup.add(stem);
  } else if (cfg.headwear === 'headband') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.019, 10, 24), accentMat);
    band.scale.set(0.94, 0.98, 1.0);
    band.rotation.x = Math.PI * 0.5;
    band.position.set(0, 0.165, 0.0);
    headGroup.add(band);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), accentMat);
    knot.position.set(0, 0.162, -0.2);
    headGroup.add(knot);
  }

  // Eyewear with full temples back to ears
  if (cfg.eyewear === 'glasses') {
    addDetailedGlasses(headGroup, 'rect', glassFrameMat, glassLensMat, 0.083);
  } else if (cfg.eyewear === 'thin_glasses') {
    addDetailedGlasses(headGroup, 'thin_round', glassFrameMat, glassLensMat, 0.083);
  }

  // ── 4. Articulated IK Arms & Hands (with smooth tailored shoulders) ───────
  const buildArm = (side: ArmSide): ArmChain => {
    const sign = side === 'left' ? 1 : -1;
    const upperLen = 0.43;
    const forearmLen = 0.4;
    const shoulderRadius = isFemale ? 0.056 : 0.066;
    const shoulderPos = new THREE.Vector3(sign * 0.305 * sw, 0.545, 0.004);

    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(shoulderRadius, 12, 10),
      coatMat,
    );
    shoulderCap.scale.set(1.0, 0.84, 0.94);
    shoulderCap.position.copy(shoulderPos);
    shoulderCap.castShadow = true;

    const upperArm = makeLimbMesh(upperLen, isFemale ? 0.055 : 0.065, isFemale ? 0.044 : 0.051, coatMat);
    const forearm = makeLimbMesh(forearmLen, isFemale ? 0.043 : 0.05, isFemale ? 0.034 : 0.039, coatMat);
    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.044 : 0.051, 8, 8), coatMat);
    const { group: handGroup, fingersPivot, socket: handSocket } = makeHandGroup(skinMat);

    torsoPivot.add(shoulderCap, upperArm, elbowCap, forearm, handGroup);

    const idleHandLocal =
      side === 'right'
        ? new THREE.Vector3(0.165, 0.27, 0.28)
        : new THREE.Vector3(-0.165, 0.22, 0.25);

    return {
      side,
      shoulderLocal: shoulderPos,
      idleHandLocal,
      idlePoleLocal: new THREE.Vector3(sign * 0.54, 0.16, 0.14),
      reachPoleLocal: new THREE.Vector3(sign * 0.64, 0.42, 0.28),
      upperArm,
      forearm,
      elbowCap,
      handGroup,
      fingersPivot,
      handSocket,
      upperLen,
      forearmLen,
      targetWorld: null,
      desiredWeight: 0,
      currentWeight: 0,
      currentHandLocal: idleHandLocal.clone(),
      gripped: false,
      gripAmount: 0,
    };
  };

  const leftArm = buildArm('left');
  const rightArm = buildArm('right');
  const arms = [leftArm, rightArm];

  const baseLeanX = 0.03;
  const currentTorsoOffset = new THREE.Vector3(0, 0.45, 0);
  let currentLeanX = baseLeanX;
  let currentTurnY = 0;

  // Natural blinking schedule
  let nextBlinkAt = 2.6;
  let blinkElapsed = -1;
  const BLINK_DUR = 0.17;

  const setHandTarget = (side: ArmSide, worldPos: THREE.Vector3 | null, weight = 1): void => {
    const arm = side === 'left' ? leftArm : rightArm;
    if (worldPos) {
      if (!arm.targetWorld) arm.targetWorld = worldPos.clone();
      else arm.targetWorld.copy(worldPos);
      arm.desiredWeight = THREE.MathUtils.clamp(weight, 0, 1);
    } else {
      arm.targetWorld = null;
      arm.desiredWeight = 0;
    }
  };

  const resetPose = (): void => {
    setHandTarget('left', null, 0);
    setHandTarget('right', null, 0);
    leftArm.gripped = false;
    rightArm.gripped = false;
  };

  const setHandGrip = (side: ArmSide, gripped: boolean): void => {
    (side === 'left' ? leftArm : rightArm).gripped = gripped;
  };

  const update = (dt: number, elapsed: number, isSpeaking = false): void => {
    const safeDt = Math.min(dt, 0.05);
    const smooth = 1 - Math.exp(-8.5 * safeDt);
    const armSmooth = 1 - Math.exp(-11 * safeDt);
    const gripSmooth = 1 - Math.exp(-14 * safeDt);

    let activeArm: ArmChain | null = null;
    for (const arm of arms) {
      arm.currentWeight = THREE.MathUtils.lerp(arm.currentWeight, arm.desiredWeight, smooth);
      if (arm.targetWorld && arm.currentWeight > 0.02) activeArm = arm;
    }

    const breath = Math.sin(elapsed * 1.75);
    let desiredLeanX = baseLeanX + breath * 0.015;
    let desiredTurnY = Math.sin(elapsed * 0.62) * 0.032;
    TMP_OFFSET.set(0, 0.45 + breath * 0.012, 0);

    if (activeArm && activeArm.targetWorld) {
      TMP_ROOT_TARGET.copy(activeArm.targetWorld);
      root.worldToLocal(TMP_ROOT_TARGET);
      const w = activeArm.currentWeight;
      const extraZ = Math.max(0, TMP_ROOT_TARGET.z - 0.65);
      TMP_OFFSET.z += Math.min(extraZ * 0.72, 0.95) * w;
      TMP_OFFSET.x += THREE.MathUtils.clamp(TMP_ROOT_TARGET.x * 0.32, -0.45, 0.45) * w;
      desiredLeanX += THREE.MathUtils.clamp(0.18 + extraZ * 0.22, 0.14, 0.46) * w;
      desiredTurnY =
        THREE.MathUtils.clamp(
          Math.atan2(TMP_ROOT_TARGET.x, Math.max(0.4, TMP_ROOT_TARGET.z)) * 0.45,
          -0.35,
          0.35,
        ) * w;
    }

    currentTorsoOffset.lerp(TMP_OFFSET, smooth);
    currentLeanX = THREE.MathUtils.lerp(currentLeanX, desiredLeanX, smooth);
    currentTurnY = THREE.MathUtils.lerp(currentTurnY, desiredTurnY, smooth);

    torsoPivot.position.copy(currentTorsoOffset);
    torsoPivot.rotation.set(currentLeanX, currentTurnY, 0);
    torsoPivot.updateMatrixWorld(true);

    // Expressive micro head motion
    const headNod = isSpeaking ? Math.sin(elapsed * 12) * 0.04 : breath * 0.022;
    headGroup.rotation.x = headNod - currentLeanX * 0.42;
    headGroup.rotation.y = Math.sin(elapsed * 0.85) * 0.045;
    headGroup.rotation.z = Math.sin(elapsed * 0.52) * 0.018;

    // Live periodic eye blinking
    if (blinkElapsed < 0 && elapsed >= nextBlinkAt) {
      blinkElapsed = 0;
    }
    if (blinkElapsed >= 0) {
      blinkElapsed += safeDt;
      if (blinkElapsed >= BLINK_DUR) {
        blinkElapsed = -1;
        nextBlinkAt = elapsed + 3.2 + ((Math.sin(elapsed * 7.3) * 0.5 + 0.5) * 2.2);
        for (const lid of eyelids) {
          lid.visible = false;
          lid.scale.y = 0.001;
        }
      } else {
        const u = blinkElapsed / BLINK_DUR;
        const closeFactor = u < 0.5 ? u * 2 : (1 - u) * 2;
        for (const lid of eyelids) {
          lid.visible = closeFactor > 0.05;
          lid.scale.y = Math.max(0.01, closeFactor * 0.78);
        }
      }
    }

    for (const arm of arms) {
      TMP_POLE_LERP.lerpVectors(arm.idlePoleLocal, arm.reachPoleLocal, arm.currentWeight);
      if (arm.targetWorld && arm.currentWeight > 0.005) {
        TMP_TARGET.copy(arm.targetWorld);
        torsoPivot.worldToLocal(TMP_TARGET);
        TMP_DESIRED_LOCAL.lerpVectors(arm.idleHandLocal, TMP_TARGET, arm.currentWeight);
      } else {
        TMP_DESIRED_LOCAL.copy(arm.idleHandLocal);
      }
      arm.currentHandLocal.lerp(TMP_DESIRED_LOCAL, armSmooth);
      solveArmIK(arm, arm.currentHandLocal, TMP_POLE_LERP);
      arm.gripAmount = THREE.MathUtils.lerp(arm.gripAmount, arm.gripped ? 1 : 0, gripSmooth);
      arm.fingersPivot.rotation.x = 0.25 + arm.gripAmount * 0.85;
    }
  };

  update(0.016, 0, false);

  const dispose = (): void => {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.geometry.userData?.shared) {
        obj.geometry.dispose();
      }
    });
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
  };

  return {
    root,
    torsoPivot,
    headGroup,
    jawGroup: null,
    leftHandSocket: leftArm.handSocket,
    rightHandSocket: rightArm.handSocket,
    update,
    setHandTarget,
    resetPose,
    setHandGrip,
    dispose,
  };
}

/** Backwards-compatible helper returning the root THREE.Group for an avatarId. */
export function buildPlayerAvatar3DGroup(avatarId: AvatarId): THREE.Group {
  return createPlayerAvatarRig(avatarId).root;
}
