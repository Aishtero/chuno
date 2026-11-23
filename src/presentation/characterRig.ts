import * as THREE from 'three';
import type { DifficultyLevel } from '../core/deck/cardData';
import { buildFriendlyHead, FriendlyFaceStyle } from './friendlyFaces';

export type CharacterStyle = 'dealer' | 'enthusiast' | 'egoist' | 'calm' | 'unknown' | 'random';
export type ArmSide = 'left' | 'right';

export interface CharacterRigOverrides {
  headModel?: THREE.Group | null;
  leftHandModel?: THREE.Group | null;
  rightHandModel?: THREE.Group | null;
  fullBustModel?: THREE.Group | null;
}

export interface CharacterRigController {
  root: THREE.Group;
  torsoPivot: THREE.Group;
  headGroup: THREE.Group;
  jawGroup: THREE.Group | null;
  leftHandSocket: THREE.Object3D;
  rightHandSocket: THREE.Object3D;
  /** Вызывать каждый кадр: обновляет дыхание, наклон, IK/парящие руки и анимацию речи */
  update: (dt: number, elapsed: number, isSpeaking?: boolean) => void;
  /** Плавно тянет указанную руку к мировой точке (фигура, карта, монета, револьвер). weight 0..1 */
  setHandTarget: (side: ArmSide, worldPos: THREE.Vector3 | null, weight?: number) => void;
  /** Сбросить обе руки в позу покоя */
  resetPose: () => void;
  /** Сжать/разжать пальцы при захвате фигуры или карты */
  setHandGrip: (side: ArmSide, gripped: boolean) => void;
  /** Плавно эволюционирует образ и поведение Дилера под сложность (Easy / Medium / Hard) без пересоздания модели */
  setDifficulty?: (difficulty: DifficultyLevel) => void;
  /** Жёсткая анатомическая привязка руки (мировая позиция и ориентация) для удержания револьвера */
  setHandPoseLock?: (side: ArmSide, worldPos: THREE.Vector3 | null, worldQuat?: THREE.Quaternion | null) => void;
  /** Резкий отброс черепа Дилера в тень при попадании выстрела игрока */
  triggerHitRecoil?: () => void;
  dispose: () => void;
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

interface FloatingHandChain {
  side: ArmSide;
  idleLocal: THREE.Vector3;
  handRoot: THREE.Group;
  fingersPivot: THREE.Group;
  handSocket: THREE.Object3D;
  targetWorld: THREE.Vector3 | null;
  poseLockWorld: THREE.Vector3 | null;
  poseLockQuat: THREE.Quaternion | null;
  desiredWeight: number;
  currentWeight: number;
  currentPosLocal: THREE.Vector3;
  gripped: boolean;
  gripAmount: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();
const TMP_POLE = new THREE.Vector3();
const TMP_ELBOW = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();
const TMP_PARENT_QUAT = new THREE.Quaternion();
const TMP_TARGET = new THREE.Vector3();
const TMP_OFFSET = new THREE.Vector3();
const TMP_ROOT_TARGET = new THREE.Vector3();
const TMP_POLE_LERP = new THREE.Vector3();
const TMP_DESIRED_LOCAL = new THREE.Vector3();

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

function makeLightHandGroup(handMat: THREE.Material): {
  group: THREE.Group;
  fingersPivot: THREE.Group;
  socket: THREE.Object3D;
} {
  const group = new THREE.Group();

  const palmGeo = new THREE.BoxGeometry(0.11, 0.125, 0.045);
  palmGeo.translate(0, -0.062, 0);
  const palm = new THREE.Mesh(palmGeo, handMat);
  palm.castShadow = true;
  group.add(palm);

  const fingersPivot = new THREE.Group();
  fingersPivot.position.set(0, -0.12, 0);
  const fingerOffsets = [-0.038, -0.013, 0.013, 0.038];
  const fingerLengths = [0.078, 0.09, 0.086, 0.068];

  fingerOffsets.forEach((x, i) => {
    const fGeo = new THREE.CylinderGeometry(0.011, 0.0085, fingerLengths[i], 6);
    fGeo.translate(0, -fingerLengths[i] * 0.5, 0);
    const finger = new THREE.Mesh(fGeo, handMat);
    finger.position.set(x, 0, 0);
    finger.rotation.x = 0.25;
    fingersPivot.add(finger);
  });
  group.add(fingersPivot);

  const thumbGeo = new THREE.CylinderGeometry(0.013, 0.01, 0.062, 6);
  thumbGeo.translate(0, -0.031, 0);
  const thumb = new THREE.Mesh(thumbGeo, handMat);
  thumb.position.set(0.058, -0.052, 0.014);
  thumb.rotation.z = 0.55;
  thumb.rotation.x = 0.35;
  group.add(thumb);

  const socket = new THREE.Object3D();
  socket.position.set(0, -0.145, 0.024);
  group.add(socket);

  return { group, fingersPivot, socket };
}

/**
 * Buckshot Roulette–style detached floating gloved hand (dirty-white worn glove with dried bloodstains
 * and dark shadowed cuff fading into darkness — zero stick arms).
 * Oriented with palm facing down (-Y) and fingers pointing forward (+Z).
 */
function makeDealerFloatingHand(
  side: ArmSide,
  gloveMat: THREE.Material,
  bloodMat: THREE.Material,
  cuffShadowMat: THREE.Material,
  overrideModel?: THREE.Group | null,
): {
  group: THREE.Group;
  fingersPivot: THREE.Group;
  socket: THREE.Object3D;
} {
  const group = new THREE.Group();
  const sign = side === 'left' ? 1 : -1;

  if (overrideModel) {
    group.add(overrideModel);
    const fingersPivot = new THREE.Group();
    const socket = new THREE.Object3D();
    socket.position.set(0, -0.08, 0.05);
    group.add(fingersPivot, socket);
    return { group, fingersPivot, socket };
  }

  // Dark shadowy cuff tapering into the dark behind the wrist
  const cuffGeo = new THREE.CylinderGeometry(0.048, 0.068, 0.16, 8);
  cuffGeo.rotateX(Math.PI / 2);
  const cuff = new THREE.Mesh(cuffGeo, cuffShadowMat);
  cuff.position.set(0, 0.008, -0.14);
  group.add(cuff);

  // Sculpted gloved palm (flat-shaded angular Buckshot aesthetic)
  const palmGeo = new THREE.BoxGeometry(0.135, 0.044, 0.145);
  const palm = new THREE.Mesh(palmGeo, gloveMat);
  palm.position.set(0, 0, -0.01);
  palm.castShadow = true;
  palm.receiveShadow = true;
  group.add(palm);

  // Knuckle ridge
  const knuckleGeo = new THREE.BoxGeometry(0.132, 0.036, 0.034);
  const knuckle = new THREE.Mesh(knuckleGeo, gloveMat);
  knuckle.position.set(0, 0.005, 0.064);
  knuckle.castShadow = true;
  group.add(knuckle);

  // Dried bloodstains across back of glove & knuckles
  const stain1 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.048), bloodMat);
  stain1.position.set(sign * 0.015, 0.023, 0.02);
  stain1.rotation.y = sign * 0.28;
  group.add(stain1);

  const stain2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.028), bloodMat);
  stain2.position.set(-sign * 0.032, 0.023, 0.052);
  group.add(stain2);

  // Articulated fingers pivoting downward when gripping pieces/cards/revolver
  const fingersPivot = new THREE.Group();
  fingersPivot.position.set(0, 0.002, 0.075);

  const fingerOffsets = [-0.046, -0.016, 0.016, 0.046];
  const fingerLengths = [0.076, 0.09, 0.084, 0.066];
  fingerOffsets.forEach((fx, i) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(fx, 0, 0);

    const proxLen = fingerLengths[i] * 0.56;
    const proxGeo = new THREE.BoxGeometry(0.02, 0.022, proxLen);
    proxGeo.translate(0, 0, proxLen * 0.5);
    const prox = new THREE.Mesh(proxGeo, gloveMat);
    prox.castShadow = true;
    fGroup.add(prox);

    const distLen = fingerLengths[i] * 0.48;
    const distGeo = new THREE.BoxGeometry(0.017, 0.018, distLen);
    distGeo.translate(0, 0, distLen * 0.5);
    const tipMat = i < 2 ? bloodMat : gloveMat;
    const dist = new THREE.Mesh(distGeo, tipMat);
    dist.position.set(0, -0.004, proxLen);
    dist.rotation.x = 0.36;
    dist.castShadow = true;
    fGroup.add(dist);

    fingersPivot.add(fGroup);
  });
  group.add(fingersPivot);

  // Opposable thumb on medial (inner) side
  const thumbGeo = new THREE.BoxGeometry(0.022, 0.022, 0.072);
  thumbGeo.translate(0, 0, 0.036);
  const thumb = new THREE.Mesh(thumbGeo, gloveMat);
  thumb.position.set(-sign * 0.068, -0.008, 0.005);
  thumb.rotation.set(0.24, -sign * 0.52, 0);
  thumb.castShadow = true;
  group.add(thumb);

  // Grasp socket right below fingertips for carrying chess pieces
  const socket = new THREE.Object3D();
  socket.position.set(0, -0.075, 0.09);
  group.add(socket);

  return { group, fingersPivot, socket };
}

function solveArmIK(arm: ArmChain, targetLocal: THREE.Vector3, poleLocal: THREE.Vector3): void {
  const S = arm.shoulderLocal;
  const L1 = arm.upperLen;
  const L2 = arm.forearmLen;

  TMP_A.subVectors(targetLocal, S);
  const rawDist = TMP_A.length();
  const minDist = Math.abs(L1 - L2) + 0.02;
  const maxDist = L1 + L2 - 0.015;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) {
    TMP_DIR.set(0, -1, 0);
  } else {
    TMP_DIR.copy(TMP_A).multiplyScalar(1 / rawDist);
  }

  TMP_POLE.subVectors(poleLocal, S);
  const proj = TMP_POLE.dot(TMP_DIR);
  TMP_POLE.addScaledVector(TMP_DIR, -proj);
  if (TMP_POLE.lengthSq() < 1e-5) {
    TMP_POLE.set(arm.side === 'left' ? 1 : -1, -0.3, 0.2);
  }
  TMP_POLE.normalize();

  const cosAlpha = THREE.MathUtils.clamp(
    (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist),
    -1,
    1,
  );
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  TMP_ELBOW.copy(S)
    .addScaledVector(TMP_DIR, L1 * cosAlpha)
    .addScaledVector(TMP_POLE, L1 * sinAlpha);

  TMP_B.copy(S).addScaledVector(TMP_DIR, dist);

  arm.upperArm.position.copy(S);
  TMP_A.subVectors(TMP_ELBOW, S).normalize();
  TMP_QUAT.setFromUnitVectors(DOWN, TMP_A);
  arm.upperArm.quaternion.copy(TMP_QUAT);

  arm.elbowCap.position.copy(TMP_ELBOW);

  arm.forearm.position.copy(TMP_ELBOW);
  TMP_A.subVectors(TMP_B, TMP_ELBOW).normalize();
  TMP_QUAT.setFromUnitVectors(DOWN, TMP_A);
  arm.forearm.quaternion.copy(TMP_QUAT);

  arm.handGroup.position.copy(TMP_B);
  arm.handGroup.quaternion.copy(TMP_QUAT);
  arm.handGroup.rotateY(arm.side === 'left' ? -0.45 : 0.45);
}

interface DealerEvolutionNodes {
  eyeOrbs: THREE.Mesh[];
  eyeMat: THREE.MeshStandardMaterial;
  eyeLight: THREE.PointLight;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
}

/**
 * Buckshot Roulette–inspired gaunt angular skull/face emerging directly from cellar darkness.
 * Includes smoothly morphable crimson eyes & angry brow ridges for Medium / Hard evolution,
 * while remaining completely blank-socketed on Easy.
 */
function buildBuckshotDealerHead(
  materials: THREE.Material[],
  overrideModel?: THREE.Group | null,
): {
  headGroup: THREE.Group;
  jawGroup: THREE.Group | null;
  evolution: DealerEvolutionNodes | null;
} {
  const headGroup = new THREE.Group();

  if (overrideModel) {
    headGroup.add(overrideModel);
    return { headGroup, jawGroup: null, evolution: null };
  }

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x8d8679,
    roughness: 0.9,
    metalness: 0.04,
    flatShading: true,
  });
  const shadowBoneMat = new THREE.MeshStandardMaterial({
    color: 0x45413b,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x020203 });
  const teethMat = new THREE.MeshStandardMaterial({
    color: 0xbcb29b,
    roughness: 0.68,
    metalness: 0.06,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x200000,
    emissive: 0xff0d0d,
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
    toneMapped: false,
  });
  materials.push(boneMat, shadowBoneMat, voidMat, teethMat, eyeMat);

  // Gaunt, angular sculpted cranium with recessed sockets & sharp cheekbones (low-poly Buckshot vibe)
  const craniumGeo = new THREE.IcosahedronGeometry(0.245, 2);
  const pos = craniumGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Narrow gaunt skull proportions
    x *= 0.88;
    y *= 1.18;
    z *= 1.06;

    // Taper lower face sharply beneath cheekbones
    if (y < -0.02) {
      x *= 0.78;
      z *= 0.92;
    }
    // Deep sunken eye sockets carved directly into front plane
    if (z > 0.07 && y > -0.01 && y < 0.12 && Math.abs(x) > 0.032 && Math.abs(x) < 0.15) {
      z -= 0.11;
    }
    // Heavy overhanging angular brow ridge
    if (z > 0.08 && y >= 0.105 && y < 0.17 && Math.abs(x) < 0.16) {
      z += 0.038;
      y -= 0.012;
    }
    // Sharp gaunt cheekbones
    if (z > 0.04 && y < -0.005 && y > -0.10 && Math.abs(x) > 0.095) {
      x *= 1.14;
      z += 0.032;
    }
    // Hollow sunken cheeks below cheekbones
    if (z > 0.02 && y < -0.09 && Math.abs(x) > 0.065) {
      x *= 0.82;
    }
    // Fade/taper back of skull into dark
    if (z < -0.12) {
      x *= 0.88;
    }
    pos.setXYZ(i, x, y, z);
  }
  craniumGeo.computeVertexNormals();
  const cranium = new THREE.Mesh(craniumGeo, boneMat);
  cranium.position.set(0, 0.09, 0);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Pitch-black sunken eye voids + compact deep-set crimson ember pupils inside (off on Easy, glowing on Medium/Hard)
  const eyeVoidGeo = new THREE.BoxGeometry(0.084, 0.056, 0.052);
  const eyeOrbGeo = new THREE.SphereGeometry(0.0135, 8, 8);
  const eyeOrbs: THREE.Mesh[] = [];
  [-0.078, 0.078].forEach((ex, idx) => {
    const eyeSocket = new THREE.Mesh(eyeVoidGeo, voidMat);
    eyeSocket.position.set(ex, 0.112, 0.162);
    eyeSocket.rotation.z = idx === 0 ? -0.14 : 0.14;
    headGroup.add(eyeSocket);

    const orb = new THREE.Mesh(eyeOrbGeo, eyeMat);
    orb.position.set(ex, 0.109, 0.184);
    orb.scale.setScalar(0.001);
    orb.visible = false;
    headGroup.add(orb);
    eyeOrbs.push(orb);
  });

  // Tight local crimson eye-glow recessed slightly BELOW eye sockets so it grazes lower rims without washing out forehead
  const eyeLight = new THREE.PointLight(0xdc1414, 0, 0.42, 2.4);
  eyeLight.position.set(0, 0.072, 0.182);
  headGroup.add(eyeLight);

  // Sculpted angular brow plates (recessed/neutral on Easy, steeply frowning downward on Hard)
  const browGeo = new THREE.BoxGeometry(0.098, 0.024, 0.052);
  const leftBrow = new THREE.Mesh(browGeo, boneMat);
  leftBrow.position.set(-0.076, 0.156, 0.172);
  leftBrow.visible = false;
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, boneMat);
  rightBrow.position.set(0.076, 0.156, 0.172);
  rightBrow.visible = false;
  headGroup.add(rightBrow);

  // Sharp dark nasal cavity
  const noseGeo = new THREE.ConeGeometry(0.026, 0.074, 3);
  const nose = new THREE.Mesh(noseGeo, voidMat);
  nose.position.set(0, 0.028, 0.212);
  nose.rotation.x = 0.22;
  headGroup.add(nose);

  // Upper maxilla & dark mouth interior
  const upperJawGeo = new THREE.CylinderGeometry(
    0.112,
    0.098,
    0.085,
    8,
    1,
    false,
    -Math.PI * 0.56,
    Math.PI * 1.12,
  );
  const upperJaw = new THREE.Mesh(upperJawGeo, boneMat);
  upperJaw.position.set(0, -0.048, 0.092);
  headGroup.add(upperJaw);

  const mouthVoid = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.084, 0.15, 8), voidMat);
  mouthVoid.position.set(0, -0.082, 0.078);
  headGroup.add(mouthVoid);

  // Crooked grinning upper teeth
  const toothGeo = new THREE.BoxGeometry(0.02, 0.04, 0.016);
  for (let i = -3; i <= 3; i++) {
    const angle = i * 0.225;
    const tooth = new THREE.Mesh(toothGeo, teethMat);
    tooth.position.set(Math.sin(angle) * 0.098, -0.092, 0.092 + Math.cos(angle) * 0.098);
    tooth.rotation.y = angle;
    tooth.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06;
    tooth.scale.y = 0.85 + (Math.abs(i) % 2) * 0.24;
    headGroup.add(tooth);
  }

  // Hinged lower jaw (animates smoothly while speaking; clenches tightly on Hard)
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.062, 0.03);

  const lowerJawGeo = new THREE.CylinderGeometry(
    0.102,
    0.074,
    0.075,
    8,
    1,
    false,
    -Math.PI * 0.52,
    Math.PI * 1.04,
  );
  const lowerJaw = new THREE.Mesh(lowerJawGeo, shadowBoneMat);
  lowerJaw.position.set(0, -0.078, 0.064);
  jawGroup.add(lowerJaw);

  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.048, 0.072), boneMat);
  chin.position.set(0, -0.1, 0.12);
  jawGroup.add(chin);

  for (let i = -3; i <= 3; i++) {
    const angle = i * 0.21;
    const tooth = new THREE.Mesh(toothGeo, teethMat);
    tooth.position.set(Math.sin(angle) * 0.088, -0.042, 0.064 + Math.cos(angle) * 0.088);
    tooth.rotation.y = angle;
    tooth.scale.y = 0.82 + (Math.abs(i + 1) % 2) * 0.2;
    jawGroup.add(tooth);
  }
  headGroup.add(jawGroup);

  // Subtle dark neck-shadow cone vanishing straight into the cellar void below the jaw
  const shadowNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.24, 0.36, 8), voidMat);
  shadowNeck.position.set(0, -0.26, -0.05);
  headGroup.add(shadowNeck);

  return {
    headGroup,
    jawGroup,
    evolution: { eyeOrbs, eyeMat, eyeLight, leftBrow, rightBrow },
  };
}

function disposeMaterialList(materials: THREE.Material[]): void {
  for (const m of materials) {
    if ('map' in m) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map) map.dispose();
    }
    m.dispose();
  }
}

/**
 * Buckshot Roulette–style Dealer Rig:
 * Only a grim angular head emerging from shadow + two detached floating bloodstained gloves.
 */
function createDealerRig(overrides?: CharacterRigOverrides): CharacterRigController {
  const materials: THREE.Material[] = [];
  const root = new THREE.Group();
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.45, 0);
  root.add(torsoPivot);

  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0xd8d2c5,
    roughness: 0.84,
    metalness: 0.04,
    flatShading: true,
  });
  const bloodMat = new THREE.MeshStandardMaterial({
    color: 0x5c0c10,
    roughness: 0.42,
    metalness: 0.06,
  });
  const cuffShadowMat = new THREE.MeshStandardMaterial({
    color: 0x0a090b,
    roughness: 0.98,
    metalness: 0.0,
  });
  materials.push(gloveMat, bloodMat, cuffShadowMat);

  const builtHead = buildBuckshotDealerHead(materials, overrides?.headModel);
  const headGroup = builtHead.headGroup;
  const jawGroup = builtHead.jawGroup;
  const evolution = builtHead.evolution;
  headGroup.position.set(0, 0.94, 0.08);
  torsoPivot.add(headGroup);

  const buildFloatingHand = (side: ArmSide): FloatingHandChain => {
    const override = side === 'left' ? overrides?.leftHandModel : overrides?.rightHandModel;
    const built = makeDealerFloatingHand(side, gloveMat, bloodMat, cuffShadowMat, override);
    const handRoot = new THREE.Group();
    handRoot.add(built.group);
    root.add(handRoot);

    // Rest palms flat on clear wooden table zones strictly OUTSIDE the chessboard frame & a8/h8 rooks:
    // - Dealer right hand (viewer left): clear wood left of board & behind revolver -> world (-1.56, 0.045, -1.10)
    // - Dealer left hand (viewer right): clear wood behind far-right board corner -> world (+1.28, 0.045, -1.46)
    const idleLocal =
      side === 'right'
        ? new THREE.Vector3(-1.18, 0.368, 0.80)
        : new THREE.Vector3(0.97, 0.368, 0.53);
    handRoot.position.copy(idleLocal);

    return {
      side,
      idleLocal,
      handRoot,
      fingersPivot: built.fingersPivot,
      handSocket: built.socket,
      targetWorld: null,
      poseLockWorld: null,
      poseLockQuat: null,
      desiredWeight: 0,
      currentWeight: 0,
      currentPosLocal: idleLocal.clone(),
      gripped: false,
      gripAmount: 0,
    };
  };

  const leftHand = buildFloatingHand('left');
  const rightHand = buildFloatingHand('right');
  const hands = [leftHand, rightHand];

  let headYaw = 0;
  let headPitch = 0.08;
  // Smooth continuous intensity factor: 0 = Easy, 1 = Medium, 2 = Hard
  let targetDiffLevel = 0;
  let currentDiffLevel = 0;
  // Hit recoil state when player shoots the Dealer: snaps skull into shadow then slowly emerges back
  let hitRecoilActive = false;
  let hitRecoilElapsed = 0;
  const HIT_RECOIL_DUR = 1.35;

  const setDifficulty = (difficulty: DifficultyLevel): void => {
    targetDiffLevel = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0;
  };

  const triggerHitRecoil = (): void => {
    hitRecoilActive = true;
    hitRecoilElapsed = 0;
  };

  const setHandTarget = (side: ArmSide, worldPos: THREE.Vector3 | null, weight = 1): void => {
    const h = side === 'left' ? leftHand : rightHand;
    if (worldPos) {
      if (!h.targetWorld) h.targetWorld = worldPos.clone();
      else h.targetWorld.copy(worldPos);
      h.desiredWeight = THREE.MathUtils.clamp(weight, 0, 1);
    } else {
      h.targetWorld = null;
      h.desiredWeight = 0;
    }
  };

  const setHandPoseLock = (
    side: ArmSide,
    worldPos: THREE.Vector3 | null,
    worldQuat?: THREE.Quaternion | null,
  ): void => {
    const h = side === 'left' ? leftHand : rightHand;
    if (worldPos) {
      if (!h.poseLockWorld) h.poseLockWorld = worldPos.clone();
      else h.poseLockWorld.copy(worldPos);
      if (worldQuat) {
        if (!h.poseLockQuat) h.poseLockQuat = worldQuat.clone();
        else h.poseLockQuat.copy(worldQuat);
      } else {
        h.poseLockQuat = null;
      }
    } else {
      h.poseLockWorld = null;
      h.poseLockQuat = null;
    }
  };

  const resetPose = (): void => {
    setHandTarget('left', null, 0);
    setHandTarget('right', null, 0);
    setHandPoseLock('left', null, null);
    setHandPoseLock('right', null, null);
    leftHand.gripped = false;
    rightHand.gripped = false;
    hitRecoilActive = false;
    hitRecoilElapsed = 0;
  };

  const setHandGrip = (side: ArmSide, gripped: boolean): void => {
    (side === 'left' ? leftHand : rightHand).gripped = gripped;
  };

  const update = (dt: number, elapsed: number, isSpeaking = false): void => {
    const safeDt = Math.min(dt, 0.05);
    const smooth = 1 - Math.exp(-8.5 * safeDt);
    const morphSmooth = 1 - Math.exp(-5.5 * safeDt);
    currentDiffLevel = THREE.MathUtils.lerp(currentDiffLevel, targetDiffLevel, morphSmooth);

    // medFactor: 0 on Easy, 1 on Medium & Hard; hardFactor: 0 on Easy/Medium, 1 on Hard
    const medFactor = THREE.MathUtils.clamp(currentDiffLevel, 0, 1);
    const hardFactor = THREE.MathUtils.clamp(currentDiffLevel - 1, 0, 1);

    const breathFreq = THREE.MathUtils.lerp(1.45, 2.05, medFactor * 0.6 + hardFactor * 0.4);
    const breathAmp = THREE.MathUtils.lerp(0.018, 0.026, medFactor) * (1 - hardFactor * 0.25);
    const breath = Math.sin(elapsed * breathFreq);

    // Posture pressure: leans closer and lower into the light cone on Medium/Hard + hit recoil into shadows
    let recoilBackZ = 0;
    let recoilDropY = 0;
    let recoilPitch = 0;
    let recoilRoll = 0;
    if (hitRecoilActive) {
      hitRecoilElapsed += safeDt;
      const e = hitRecoilElapsed;
      if (e < 0.16) {
        const k = 1 - Math.pow(1 - e / 0.16, 3);
        recoilBackZ = -0.46 * k;
        recoilDropY = -0.06 * k;
        recoilPitch = -0.46 * k;
        recoilRoll = 0.24 * k;
      } else if (e < 0.48) {
        recoilBackZ = -0.46;
        recoilDropY = -0.06;
        recoilPitch = -0.46;
        recoilRoll = 0.24;
      } else if (e < HIT_RECOIL_DUR) {
        const u = (e - 0.48) / (HIT_RECOIL_DUR - 0.48);
        const k = 1 - Math.pow(1 - u, 3);
        recoilBackZ = THREE.MathUtils.lerp(-0.46, 0, k);
        recoilDropY = THREE.MathUtils.lerp(-0.06, 0, k);
        recoilPitch = THREE.MathUtils.lerp(-0.46, 0, k);
        recoilRoll = THREE.MathUtils.lerp(0.24, 0, k);
      } else {
        hitRecoilActive = false;
      }
    }

    const leanZ = medFactor * 0.07 + hardFactor * 0.14 + recoilBackZ;
    const dropY = -hardFactor * 0.055 + recoilDropY;
    torsoPivot.position.set(0, 0.45 + dropY + breath * breathAmp, leanZ);
    torsoPivot.updateMatrixWorld(true);

    // Animate Difficulty Evolution: Crimson Eyes + Angry Brows
    if (evolution) {
      const hardPulse = hardFactor > 0.05 ? Math.sin(elapsed * 4.8) * 0.5 + 0.5 : 0;
      const eyeIntensity = medFactor * 0.72 + hardFactor * (0.45 + hardPulse * 0.35);
      const eyeOpacity = THREE.MathUtils.clamp(medFactor * 1.05, 0, 1);
      const showEyes = eyeOpacity > 0.02;

      evolution.eyeMat.opacity = eyeOpacity;
      evolution.eyeMat.emissiveIntensity = eyeIntensity;
      evolution.eyeMat.emissive.setRGB(
        THREE.MathUtils.lerp(0.68, 1.0, hardFactor),
        THREE.MathUtils.lerp(0.02, 0.05, hardFactor),
        THREE.MathUtils.lerp(0.02, 0.03, hardFactor),
      );
      const orbScale = showEyes ? THREE.MathUtils.lerp(0.82, 1.05, hardFactor) * eyeOpacity : 0.001;
      for (let i = 0; i < evolution.eyeOrbs.length; i++) {
        const orb = evolution.eyeOrbs[i];
        orb.visible = showEyes;
        orb.scale.setScalar(orbScale);
      }
      // Subtle crimson glow recessed under sockets without lighting up forehead triangles
      evolution.eyeLight.intensity = medFactor * 0.22 + hardFactor * (0.3 + hardPulse * 0.14);

      // Predatory frowning brow ridges (completely hidden on Easy, aggressive downward angle on Hard)
      const browVis = hardFactor > 0.04 || medFactor > 0.4;
      const browAngle = medFactor * 0.08 + hardFactor * 0.25;
      const browY = THREE.MathUtils.lerp(0.156, 0.136, medFactor * 0.3 + hardFactor * 0.7);
      const browZ = THREE.MathUtils.lerp(0.17, 0.198, hardFactor);
      const browScaleY = THREE.MathUtils.lerp(0.4, 1.0, medFactor * 0.35 + hardFactor * 0.65);

      evolution.leftBrow.visible = browVis;
      evolution.rightBrow.visible = browVis;
      evolution.leftBrow.position.set(-0.074, browY, browZ);
      evolution.rightBrow.position.set(0.074, browY, browZ);
      evolution.leftBrow.rotation.set(0.12 * hardFactor, 0.12 * hardFactor, -browAngle);
      evolution.rightBrow.rotation.set(0.12 * hardFactor, -0.12 * hardFactor, browAngle);
      evolution.leftBrow.scale.set(1, browScaleY, 1);
      evolution.rightBrow.scale.set(1, browScaleY, 1);
    }

    // Gaze: calm slow sway on Easy, unblinking locked predatory stare on Hard
    const swayAmp = THREE.MathUtils.lerp(0.06, 0.008, medFactor * 0.45 + hardFactor * 0.55);
    let desiredYaw = Math.sin(elapsed * 0.6) * swayAmp;
    const basePitch = 0.08 + medFactor * 0.045 + hardFactor * 0.06;
    let desiredPitch = basePitch + (isSpeaking ? Math.sin(elapsed * 13) * 0.045 : breath * 0.02 * (1 - hardFactor * 0.6));

    // Hand responsiveness increases with difficulty (calm on Easy -> fast & ruthless on Hard)
    const glideRate = 9.5 + medFactor * 3.5 + hardFactor * 5.0;
    const handSmooth = 1 - Math.exp(-glideRate * safeDt);
    const gripSmooth = 1 - Math.exp(-(14 + hardFactor * 6) * safeDt);

    for (const h of hands) {
      if (h.poseLockWorld) {
        // Rigid anatomical pose lock (zero-lag grip synchronization for revolver shooting)
        root.updateMatrixWorld(true);
        TMP_TARGET.copy(h.poseLockWorld);
        root.worldToLocal(TMP_TARGET);
        h.currentPosLocal.copy(TMP_TARGET);
        h.handRoot.position.copy(TMP_TARGET);
        if (h.poseLockQuat) {
          root.getWorldQuaternion(TMP_PARENT_QUAT).invert();
          h.handRoot.quaternion.copy(TMP_PARENT_QUAT).multiply(h.poseLockQuat);
        }
        h.currentWeight = 1;
        h.gripAmount = THREE.MathUtils.lerp(h.gripAmount, h.gripped ? 1 : 0, gripSmooth);
        h.fingersPivot.rotation.x = 0.18 + h.gripAmount * 1.15;
        desiredYaw = THREE.MathUtils.clamp(TMP_TARGET.x * 0.24, -0.28, 0.28);
        desiredPitch = basePitch + 0.04;
        continue;
      }

      h.currentWeight = THREE.MathUtils.lerp(h.currentWeight, h.desiredWeight, smooth);
      const sign = h.side === 'left' ? 1 : -1;
      // Micro breathing shift strictly >= 0 so palms never dip into the wooden tabletop
      const subtleLift = (0.5 + 0.5 * Math.sin(elapsed * breathFreq + (h.side === 'left' ? 0 : 1.7))) * 0.006;

      // Both gloves stay strictly outside chessboard bounds (clearance >= 0.25 from frame and a8/h8)
      const idleX =
        h.side === 'right'
          ? THREE.MathUtils.lerp(-1.18, -1.15, hardFactor)
          : THREE.MathUtils.lerp(0.97, 0.95, hardFactor);
      const idleY = THREE.MathUtils.lerp(0.368, 0.382, hardFactor) + subtleLift;
      const idleZ =
        h.side === 'right'
          ? THREE.MathUtils.lerp(0.80, 0.87, hardFactor)
          : THREE.MathUtils.lerp(0.53, 0.57, hardFactor);
      TMP_A.set(idleX, idleY, idleZ);

      if (h.targetWorld && h.currentWeight > 0.005) {
        TMP_TARGET.copy(h.targetWorld);
        root.worldToLocal(TMP_TARGET);
        TMP_B.lerpVectors(TMP_A, TMP_TARGET, h.currentWeight);
        desiredYaw = THREE.MathUtils.clamp(TMP_TARGET.x * 0.28, -0.34, 0.34) * h.currentWeight;
        desiredPitch = basePitch + 0.06 + Math.min(0.22, Math.max(0, TMP_TARGET.z - 0.5) * 0.12) * h.currentWeight;
      } else {
        TMP_B.copy(TMP_A);
      }

      h.currentPosLocal.lerp(TMP_B, handSmooth);
      h.handRoot.position.copy(h.currentPosLocal);

      // Palms rest naturally parallel to table surface in idle, pitching softly downward when grasping pieces
      const targetRotX = THREE.MathUtils.lerp(0.03 + hardFactor * 0.04, 0.22, h.currentWeight);
      const targetRotY = THREE.MathUtils.lerp(-sign * (0.14 + hardFactor * 0.08), -sign * 0.05, h.currentWeight);
      const targetRotZ = THREE.MathUtils.lerp(sign * 0.03, 0, h.currentWeight);
      h.handRoot.rotation.x = THREE.MathUtils.lerp(h.handRoot.rotation.x, targetRotX, smooth);
      h.handRoot.rotation.y = THREE.MathUtils.lerp(h.handRoot.rotation.y, targetRotY, smooth);
      h.handRoot.rotation.z = THREE.MathUtils.lerp(h.handRoot.rotation.z, targetRotZ, smooth);

      h.gripAmount = THREE.MathUtils.lerp(h.gripAmount, h.gripped ? 1 : 0, gripSmooth);
      // Gentle natural resting finger curve toward table wood; tighter predatory claw curl on Hard
      const idleCurl = 0.14 + hardFactor * 0.22;
      h.fingersPivot.rotation.x = idleCurl + h.gripAmount * (0.86 - hardFactor * 0.1);
    }

    headYaw = THREE.MathUtils.lerp(headYaw, desiredYaw, smooth);
    headPitch = THREE.MathUtils.lerp(headPitch, desiredPitch, smooth);
    headGroup.rotation.set(
      headPitch + recoilPitch,
      headYaw,
      Math.sin(elapsed * 0.85) * (0.03 * (1 - hardFactor * 0.85)) + recoilRoll,
    );

    if (jawGroup) {
      const idleJaw = THREE.MathUtils.lerp(0.03 + Math.max(0, breath) * 0.022, -0.028, hardFactor);
      const jawOpen = isSpeaking
        ? (0.12 + hardFactor * 0.04) + Math.abs(Math.sin(elapsed * (16 + hardFactor * 3))) * 0.2
        : idleJaw;
      jawGroup.rotation.x = THREE.MathUtils.lerp(jawGroup.rotation.x, jawOpen, 1 - Math.exp(-16 * safeDt));
    }
  };

  update(0.016, 0, false);

  const dispose = (): void => {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.geometry.userData?.shared) {
        obj.geometry.dispose();
      }
    });
    disposeMaterialList(materials);
  };

  return {
    root,
    torsoPivot,
    headGroup,
    jawGroup,
    leftHandSocket: leftHand.handSocket,
    rightHandSocket: rightHand.handSocket,
    update,
    setHandTarget,
    resetPose,
    setHandGrip,
    setDifficulty,
    setHandPoseLock,
    triggerHitRecoil,
    dispose,
  };
}

export function createCharacterRig(
  style: CharacterStyle,
  overrides?: CharacterRigOverrides,
): CharacterRigController {
  if (style === 'dealer') {
    return createDealerRig(overrides);
  }

  const faceStyle: FriendlyFaceStyle =
    style === 'enthusiast' || style === 'egoist' || style === 'calm' ? style : 'unknown';

  const materials: THREE.Material[] = [];
  const root = new THREE.Group();
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.45, 0);
  root.add(torsoPivot);

  const outfitColors: Record<FriendlyFaceStyle, number> = {
    enthusiast: 0xc96428,
    egoist: 0x1e2736,
    calm: 0x4b6355,
    unknown: 0x111317, // Black incognito coat
  };
  const skinColors: Record<FriendlyFaceStyle, number> = {
    enthusiast: 0xf2c6a6,
    egoist: 0xe9c0a1,
    calm: 0xe6bc9c,
    unknown: 0x181a1f, // Dark gloves for Incognito
  };

  const outfitMat = new THREE.MeshStandardMaterial({
    color: outfitColors[faceStyle],
    roughness: faceStyle === 'unknown' ? 0.88 : 0.82,
    metalness: 0.05,
  });
  const handMat = new THREE.MeshStandardMaterial({
    color: skinColors[faceStyle],
    roughness: faceStyle === 'unknown' ? 0.6 : 0.68,
  });
  materials.push(outfitMat, handMat);

  let headGroup: THREE.Group;

  if (overrides?.fullBustModel) {
    torsoPivot.add(overrides.fullBustModel);
    headGroup = new THREE.Group();
    headGroup.position.set(0, 0.9, 0.02);
    torsoPivot.add(headGroup);
  } else {
    const torsoProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.29, 0.28),
      new THREE.Vector2(0.35, 0.54),
      new THREE.Vector2(0.31, 0.64),
      new THREE.Vector2(0.14, 0.69),
      new THREE.Vector2(0.0, 0.69),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoProfile, 16);
    torsoGeo.scale(1.12, 1.0, 0.66);
    const torso = new THREE.Mesh(torsoGeo, outfitMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torsoPivot.add(torso);

    if (faceStyle === 'calm') {
      const scarfMat = new THREE.MeshStandardMaterial({ color: 0xc9bca4, roughness: 0.9 });
      materials.push(scarfMat);
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.052, 8, 16), scarfMat);
      scarf.rotation.x = Math.PI * 0.5;
      scarf.position.set(0, 0.68, 0.02);
      torsoPivot.add(scarf);
    } else if (faceStyle === 'unknown') {
      // Popped black trench-coat collar for Incognito look
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12, 1, true, Math.PI * 0.22, Math.PI * 1.56),
        outfitMat,
      );
      collar.position.set(0, 0.72, -0.02);
      torsoPivot.add(collar);

      const lapelMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.8 });
      materials.push(lapelMat);
      [-0.1, 0.1].forEach((lx, i) => {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.04), lapelMat);
        lapel.position.set(lx, 0.56, 0.21);
        lapel.rotation.z = i === 0 ? 0.22 : -0.22;
        torsoPivot.add(lapel);
      });
    }

    const neckMat = faceStyle === 'unknown' ? outfitMat : handMat;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.17, 12), neckMat);
    neck.position.set(0, 0.725, 0.005);
    torsoPivot.add(neck);

    headGroup = buildFriendlyHead(faceStyle, materials);
    headGroup.position.set(0, 0.895, 0.02);
    torsoPivot.add(headGroup);
  }

  const buildArm = (side: ArmSide): ArmChain => {
    const sign = side === 'left' ? 1 : -1;
    const upperLen = 0.45;
    const forearmLen = 0.43;

    const upperArm = makeLimbMesh(upperLen, 0.07, 0.054, outfitMat);
    const forearm = makeLimbMesh(forearmLen, 0.053, 0.042, outfitMat);
    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.054, 8, 8), outfitMat);
    const { group: handGroup, fingersPivot, socket: handSocket } = makeLightHandGroup(handMat);

    if (!overrides?.fullBustModel) {
      torsoPivot.add(upperArm, elbowCap, forearm, handGroup);
    } else {
      torsoPivot.add(handSocket);
    }

    const idleHandLocal =
      side === 'right'
        ? new THREE.Vector3(0.2, 0.31, 0.27)
        : new THREE.Vector3(-0.2, 0.25, 0.24);

    return {
      side,
      shoulderLocal: new THREE.Vector3(sign * 0.36, 0.58, 0.01),
      idleHandLocal,
      idlePoleLocal: new THREE.Vector3(sign * 0.56, 0.16, 0.14),
      reachPoleLocal: new THREE.Vector3(sign * 0.65, 0.42, 0.28),
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

  const baseLeanX =
    faceStyle === 'enthusiast' ? 0.08 : faceStyle === 'egoist' ? -0.07 : faceStyle === 'unknown' ? 0.05 : 0.02;
  const currentTorsoOffset = new THREE.Vector3(0, 0.45, 0);
  let currentLeanX = baseLeanX;
  let currentTurnY = 0;

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
      if (arm.targetWorld && arm.currentWeight > 0.02) {
        activeArm = arm;
      }
    }

    const breath = Math.sin(elapsed * (style === 'enthusiast' ? 2.2 : 1.7));
    let desiredLeanX = baseLeanX + breath * 0.015;
    let desiredTurnY = Math.sin(elapsed * 0.65) * 0.03;
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

    const headNod = isSpeaking ? Math.sin(elapsed * 13) * 0.045 : breath * 0.02;
    headGroup.rotation.x = headNod - currentLeanX * 0.45;
    headGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.04;

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
      if (!overrides?.fullBustModel) {
        solveArmIK(arm, arm.currentHandLocal, TMP_POLE_LERP);
      } else {
        arm.handSocket.position.copy(arm.currentHandLocal);
      }

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
    disposeMaterialList(materials);
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
