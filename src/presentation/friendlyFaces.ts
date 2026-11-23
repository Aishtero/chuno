import * as THREE from 'three';

export type FriendlyFaceStyle = 'enthusiast' | 'egoist' | 'calm' | 'unknown';

interface FacePalette {
  skin: string;
  skinHex: number;
  blush: string;
  iris: string;
  lip: string;
  browHex: number;
  hairHex: number;
}

const PALETTES: Record<FriendlyFaceStyle, FacePalette> = {
  enthusiast: {
    skin: '#f2c6a6',
    skinHex: 0xf2c6a6,
    blush: 'rgba(232, 126, 108, 0.28)',
    iris: '#7a4b26',
    lip: '#9e5446',
    browHex: 0x4d2f1a,
    hairHex: 0x5c3920,
  },
  egoist: {
    skin: '#e9c0a1',
    skinHex: 0xe9c0a1,
    blush: 'rgba(204, 125, 105, 0.14)',
    iris: '#34495e',
    lip: '#8f4d43',
    browHex: 0x1a1d24,
    hairHex: 0x1e222b,
  },
  calm: {
    skin: '#e6bc9c',
    skinHex: 0xe6bc9c,
    blush: 'rgba(210, 134, 114, 0.18)',
    iris: '#4a3d31',
    lip: '#94584b',
    browHex: 0x9aa2ad,
    hairHex: 0xb6bdc7,
  },
  unknown: {
    skin: '#49525e',
    skinHex: 0x49525e,
    blush: 'rgba(0, 0, 0, 0)',
    iris: '#181c22',
    lip: '#2b313a',
    browHex: 0x1f242b,
    hairHex: 0x20252e,
  },
};

/**
 * Генерирует 2:1 текстуру лица (512x256) для SphereGeometry с phiStart = -PI/2.
 * Центр лица (u = 0.5, v = 0.5) находится строго в (256, 128), масштаб 1° ≈ 1.422 px по X и Y.
 */
function createFaceTexture(style: FriendlyFaceStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const p = PALETTES[style];

  // Базовый тёплый тон кожи с лёгким градиентом объёма (чуть темнее к затылку и подбородку)
  ctx.fillStyle = p.skin;
  ctx.fillRect(0, 0, 512, 256);

  const grad = ctx.createRadialGradient(256, 116, 16, 256, 130, 140);
  if (style === 'unknown') {
    grad.addColorStop(0, 'rgba(130, 146, 168, 0.18)');
    grad.addColorStop(0.65, 'rgba(20, 24, 30, 0.12)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.45)');
  } else {
    grad.addColorStop(0, 'rgba(255, 245, 232, 0.16)');
    grad.addColorStop(0.65, 'rgba(210, 150, 115, 0.04)');
    grad.addColorStop(1, 'rgba(155, 100, 74, 0.18)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Мягкий румянец на щеках
  if (style !== 'unknown') {
    [216, 296].forEach((bx) => {
      const blushGrad = ctx.createRadialGradient(bx, 138, 2, bx, 138, 17);
      blushGrad.addColorStop(0, p.blush);
      blushGrad.addColorStop(1, 'rgba(232, 126, 108, 0)');
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.arc(bx, 138, 17, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Лёгкая тень под носом для глубины
  ctx.fillStyle = style === 'unknown' ? 'rgba(0,0,0,0.22)' : 'rgba(135, 84, 58, 0.18)';
  ctx.beginPath();
  ctx.ellipse(256, 141, 7, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Глаза (у egoist и unknown скрыты за тёмными очками, но лёгкая тень под очками даёт глубину)
  if (style === 'enthusiast' || style === 'calm') {
    const eyeY = 121;
    const isCalm = style === 'calm';

    [230, 282].forEach((ex, idx) => {
      const side = idx === 0 ? -1 : 1;

      // Мягкая тень глазницы
      ctx.fillStyle = 'rgba(120, 78, 56, 0.14)';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 12.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Склера (белок)
      ctx.fillStyle = '#f8f6f2';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 9.6, isCalm ? 7.4 : 9.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Радужка
      ctx.fillStyle = p.iris;
      ctx.beginPath();
      ctx.arc(ex + side * -0.5, eyeY + 0.5, isCalm ? 5.2 : 5.8, 0, Math.PI * 2);
      ctx.fill();

      // Зрачок
      ctx.fillStyle = '#141418';
      ctx.beginPath();
      ctx.arc(ex + side * -0.5, eyeY + 0.5, isCalm ? 2.8 : 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Живой блик в глазах (catchlight)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 2.3, eyeY - 2.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Верхнее веко / ресничная линия
      ctx.strokeStyle = '#2d221c';
      ctx.lineWidth = isCalm ? 2.2 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, eyeY + (isCalm ? 1.5 : 1.0), 10.2, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();

      // Добрые морщинки мудрости у уголков глаз Философа
      if (isCalm) {
        ctx.strokeStyle = 'rgba(125, 86, 65, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ex + side * 11, eyeY - 1);
        ctx.lineTo(ex + side * 15, eyeY - 3);
        ctx.moveTo(ex + side * 11, eyeY + 2);
        ctx.lineTo(ex + side * 15, eyeY + 3);
        ctx.stroke();
      }
    });
  }

  // Выразительный рот для каждого характера
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (style === 'enthusiast') {
    // Живая открытая дружелюбная улыбка
    ctx.fillStyle = '#7e332c';
    ctx.beginPath();
    ctx.moveTo(239, 154);
    ctx.quadraticCurveTo(256, 169, 273, 154);
    ctx.quadraticCurveTo(256, 157, 239, 154);
    ctx.fill();

    // Верхняя полоска зубов
    ctx.fillStyle = '#fbfaf6';
    ctx.beginPath();
    ctx.moveTo(242, 155);
    ctx.quadraticCurveTo(256, 159, 270, 155);
    ctx.quadraticCurveTo(256, 156.5, 242, 155);
    ctx.fill();

    // Тёплый контур губ
    ctx.strokeStyle = p.lip;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(238, 154);
    ctx.quadraticCurveTo(256, 169, 274, 154);
    ctx.stroke();
  } else if (style === 'egoist') {
    // Самоуверенная асимметричная ухмылка
    ctx.strokeStyle = p.lip;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(241, 158);
    ctx.quadraticCurveTo(257, 159, 274, 151);
    ctx.stroke();

    // Короткая складочка в поднятом уголке рта + тень нижней губы
    ctx.strokeStyle = 'rgba(130, 74, 60, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(250, 163);
    ctx.quadraticCurveTo(257, 165, 264, 162);
    ctx.stroke();
  } else if (style === 'calm') {
    // Мягкая спокойная полуулыбка (аккуратно видна под 3D-усами)
    ctx.strokeStyle = p.lip;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(244, 156);
    ctx.quadraticCurveTo(256, 162, 268, 156);
    ctx.stroke();

    // Лёгкая текстура бакенбард/перехода бороды по линии челюсти
    ctx.fillStyle = 'rgba(162, 170, 180, 0.28)';
    ctx.beginPath();
    ctx.ellipse(256, 172, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Unknown: сдержанная загадочная линия губ в полутени
    ctx.strokeStyle = 'rgba(20, 24, 30, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(244, 157);
    ctx.quadraticCurveTo(256, 159, 269, 155);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Создаёт гладкую анатомичную low-poly голову (без острых «шаровых» граней)
 * с мягкой линией челюсти и подбородком.
 */
function createSculptedHeadGeometry(isSharpJaw: boolean): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(0.22, 24, 18, -Math.PI / 2, Math.PI * 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Овальная форма головы
    x *= 0.92;
    y *= 1.07;
    z *= 0.96;

    // Сужение нижней половины лица к аккуратной челюсти и подбородку
    if (y < -0.01) {
      const t = Math.min(1, Math.abs(y + 0.01) / 0.22);
      const jawTaper = isSharpJaw ? 1 - t * 0.24 : 1 - t * 0.19;
      x *= jawTaper;
      // Подбородок чуть выдвинут вперёд и вниз
      if (z > 0.04) {
        z += t * 0.018;
        y -= t * 0.014;
      }
    }

    // Лёгкий объём скул
    if (z > 0.06 && y > -0.05 && y < 0.03 && Math.abs(x) > 0.09) {
      x *= 1.035;
      z += 0.008;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function addGlassesWithArms(
  headGroup: THREE.Group,
  options: {
    kind: 'sunglasses' | 'round';
    frameMat: THREE.Material;
    lensMat: THREE.Material;
    y?: number;
  }
): void {
  const y = options.y ?? 0.088;
  const zFront = 0.212;
  const glasses = new THREE.Group();

  if (options.kind === 'sunglasses') {
    // Стильные угловатые очки (wayfarer) с оправой и стёклами
    [-0.072, 0.072].forEach((gx, idx) => {
      const tilt = idx === 0 ? -0.05 : 0.05;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.062, 0.014), options.frameMat);
      frame.position.set(gx, y, zFront);
      frame.rotation.z = tilt;
      frame.rotation.y = idx === 0 ? -0.14 : 0.14;
      glasses.add(frame);

      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.05, 0.016), options.lensMat);
      lens.position.set(gx, y, zFront + 0.002);
      lens.rotation.z = tilt;
      lens.rotation.y = idx === 0 ? -0.14 : 0.14;
      glasses.add(lens);
    });

    // Верхняя планка-переносица
    const browBar = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.013, 0.014), options.frameMat);
    browBar.position.set(0, y + 0.016, zFront + 0.004);
    glasses.add(browBar);
  } else {
    // Тонкие круглые очки Философа с полупрозрачными стёклами
    const ringGeo = new THREE.TorusGeometry(0.052, 0.0065, 10, 24);
    const lensGeo = new THREE.CircleGeometry(0.049, 20);
    [-0.071, 0.071].forEach((gx, idx) => {
      const ring = new THREE.Mesh(ringGeo, options.frameMat);
      ring.position.set(gx, y, zFront);
      ring.rotation.y = idx === 0 ? -0.14 : 0.14;
      glasses.add(ring);

      const lens = new THREE.Mesh(lensGeo, options.lensMat);
      lens.position.set(gx, y, zFront);
      lens.rotation.y = idx === 0 ? -0.14 : 0.14;
      glasses.add(lens);
    });

    // Арочная переносица
    const bridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.005, 8, 12, Math.PI),
      options.frameMat
    );
    bridge.position.set(0, y + 0.002, zFront + 0.004);
    glasses.add(bridge);
  }

  // Тонкие дужки, идущие от внешнего края оправы (±0.132, z=0.21) ровно назад к ушам (±0.194, z=0.0)
  const armGeo = new THREE.BoxGeometry(0.009, 0.011, 0.218);
  [-0.132, 0.132].forEach((ax, idx) => {
    const arm = new THREE.Mesh(armGeo, options.frameMat);
    arm.position.set(ax * 1.23, y + 0.006, 0.105);
    arm.rotation.y = idx === 0 ? 0.28 : -0.28;
    glasses.add(arm);
  });

  headGroup.add(glasses);
}

/**
 * Основная фабрика проработанных голов и лиц для всех 4 персонажей Friendly Mode.
 * Все созданные материалы добавляются в `materials` для корректного dispose().
 */
export function buildFriendlyHead(
  style: FriendlyFaceStyle,
  materials: THREE.Material[]
): THREE.Group {
  const headGroup = new THREE.Group();
  const p = PALETTES[style];

  const faceTex = createFaceTexture(style);
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: style === 'unknown' ? 0.85 : 0.68,
    metalness: 0.02,
    flatShading: false,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: p.skinHex,
    roughness: style === 'unknown' ? 0.85 : 0.68,
    metalness: 0.02,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: p.browHex,
    roughness: 0.82,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: p.hairHex,
    roughness: style === 'egoist' ? 0.52 : 0.82,
    metalness: style === 'egoist' ? 0.08 : 0.02,
  });
  materials.push(headMat, skinMat, browMat, hairMat);

  // 1. Вылепленная голова с нарисованным лицом
  const headGeo = createSculptedHeadGeometry(style === 'egoist' || style === 'unknown');
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.06, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // 2. Аккуратные уши
  const earGeo = new THREE.SphereGeometry(0.04, 10, 10);
  earGeo.scale(0.42, 1.05, 0.78);
  [-0.196, 0.196].forEach((ex) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(ex, 0.062, -0.005);
    headGroup.add(ear);
  });

  // 3. Мягкий 3D-нос (капсульный силуэт вместо острого конуса)
  const noseBridge = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skinMat);
  noseBridge.scale.set(0.78, 1.55, 1.15);
  noseBridge.position.set(0, 0.052, 0.205);
  noseBridge.rotation.x = -0.15;
  headGroup.add(noseBridge);

  // 4. Скульптурные 3D-брови с индивидуальным выражением
  if (style !== 'unknown') {
    const browW = style === 'calm' ? 0.072 : 0.062;
    const browH = style === 'calm' ? 0.02 : 0.014;
    const browGeo = new THREE.BoxGeometry(browW, browH, 0.018);

    [-0.068, 0.068].forEach((bx, idx) => {
      const side = idx === 0 ? -1 : 1;
      const brow = new THREE.Mesh(browGeo, browMat);
      let by = 0.125;
      let rz = 0;

      if (style === 'enthusiast') {
        by = 0.129;
        rz = side * -0.14; // Приветливо приподнятые брови
      } else if (style === 'egoist') {
        by = idx === 1 ? 0.136 : 0.124; // Одна бровь надменно приподнята над очками
        rz = idx === 1 ? -0.12 : 0.1;
      } else if (style === 'calm') {
        by = 0.125;
        rz = side * -0.05; // Спокойные густые брови
      }

      brow.position.set(bx, by, 0.201);
      brow.rotation.z = rz;
      brow.rotation.y = side * 0.2;
      headGroup.add(brow);
    });
  }

  // 5. Индивидуальные причёски, бороды, очки и головные уборы
  if (style === 'enthusiast') {
    const capMainMat = new THREE.MeshStandardMaterial({ color: 0xd96826, roughness: 0.78 });
    const capTrimMat = new THREE.MeshStandardMaterial({ color: 0xf0e4cf, roughness: 0.82 });
    materials.push(capMainMat, capTrimMat);

    // Кепка козырьком назад (без провалов и прилипших кубов)
    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.228, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      capMainMat
    );
    capCrown.scale.set(0.95, 0.96, 1.0);
    capCrown.position.set(0, 0.095, -0.008);
    capCrown.rotation.x = -0.1;
    capCrown.castShadow = true;
    headGroup.add(capCrown);

    // Кнопка на макушке кепки
    const topBtn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), capTrimMat);
    topBtn.scale.set(1, 0.5, 1);
    topBtn.position.set(0, 0.308, -0.032);
    headGroup.add(topBtn);

    // Задний козырёк кепки
    const brimGeo = new THREE.CylinderGeometry(0.16, 0.17, 0.016, 16, 1, false, Math.PI * 0.65, Math.PI * 0.7);
    const brim = new THREE.Mesh(brimGeo, capMainMat);
    brim.position.set(0, 0.125, -0.17);
    brim.rotation.x = 0.14;
    headGroup.add(brim);

    // Многослойная растрёпанная чёлка из 5 отдельных мягких прядей под передним краем кепки
    const bangs: Array<[number, number, number, number, number, number]> = [
      [-0.11, 0.155, 0.16, 0.048, 0.038, 0.35],
      [-0.055, 0.162, 0.188, 0.056, 0.044, 0.16],
      [0.0, 0.164, 0.196, 0.06, 0.046, -0.05],
      [0.062, 0.16, 0.184, 0.054, 0.042, -0.22],
      [0.115, 0.152, 0.155, 0.046, 0.036, -0.38],
    ];
    bangs.forEach(([x, y, z, rx, ry, rz]) => {
      const lock = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hairMat);
      lock.scale.set(rx, ry, 0.045);
      lock.position.set(x, y, z);
      lock.rotation.z = rz;
      lock.rotation.x = 0.28;
      headGroup.add(lock);
    });

    // Виски / боковые пряди у ушей
    [-0.185, 0.185].forEach((sx) => {
      const sideHair = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hairMat);
      sideHair.scale.set(0.55, 1.35, 1.1);
      sideHair.position.set(sx, 0.125, 0.02);
      headGroup.add(sideHair);
    });
  } else if (style === 'egoist') {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x16181e, metalness: 0.65, roughness: 0.28 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: 0.9, roughness: 0.1 });
    materials.push(frameMat, lensMat);

    // Стильная объёмная укладка, зачёсанная назад (не пластиковый шлем!)
    const baseHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.222, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
      hairMat
    );
    baseHair.scale.set(0.95, 1.0, 1.03);
    baseHair.position.set(0, 0.095, -0.02);
    baseHair.castShadow = true;
    headGroup.add(baseHair);

    // Высокая волна-помпадур спереди
    const wave = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), hairMat);
    wave.scale.set(1.22, 0.68, 1.35);
    wave.position.set(0.015, 0.245, 0.045);
    wave.rotation.x = -0.25;
    wave.rotation.z = -0.08;
    headGroup.add(wave);

    // Боковая прядь пробора
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), hairMat);
    sweep.scale.set(1.1, 0.55, 1.3);
    sweep.position.set(-0.085, 0.225, 0.04);
    sweep.rotation.z = 0.3;
    headGroup.add(sweep);

    // Аккуратные бакенбарды
    [-0.188, 0.188].forEach((sx) => {
      const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.08, 0.042), hairMat);
      sideburn.position.set(sx, 0.095, 0.035);
      headGroup.add(sideburn);
    });

    // Настоящие солнцезащитные очки с дужками
    addGlassesWithArms(headGroup, {
      kind: 'sunglasses',
      frameMat,
      lensMat,
      y: 0.084,
    });
  } else if (style === 'calm') {
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xaab2bc, roughness: 0.9 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3d2e, metalness: 0.68, roughness: 0.32 });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xdff0ff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      metalness: 0.2,
    });
    materials.push(beardMat, frameMat, lensMat);

    // Мягкие седые волосы с пробором и прядями по бокам
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.224, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    hairTop.scale.set(0.96, 0.98, 1.02);
    hairTop.position.set(0, 0.098, -0.018);
    hairTop.castShadow = true;
    headGroup.add(hairTop);

    // Боковые седые пряди над ушами
    [-0.185, 0.185].forEach((sx, idx) => {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), hairMat);
      tuft.scale.set(0.55, 1.25, 1.35);
      tuft.position.set(sx, 0.115, -0.01);
      tuft.rotation.z = idx === 0 ? 0.12 : -0.12;
      headGroup.add(tuft);
    });

    // Настоящая скульптурная борода (облегает линию челюсти и подбородок, НЕ «медицинская маска»!)
    const chinBeard = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.165, 12), beardMat);
    chinBeard.rotation.x = Math.PI; // Остриём вниз к бородке
    chinBeard.scale.set(1.12, 1.0, 0.72);
    chinBeard.position.set(0, -0.105, 0.12);
    headGroup.add(chinBeard);

    // Боковые части бороды, плавно соединяющие бакенбарды с подбородком
    [-0.118, 0.118].forEach((bx, idx) => {
      const sideBeard = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 8), beardMat);
      sideBeard.scale.set(0.75, 1.25, 1.1);
      sideBeard.position.set(bx, -0.042, 0.095);
      sideBeard.rotation.z = idx === 0 ? 0.35 : -0.35;
      sideBeard.rotation.y = idx === 0 ? -0.3 : 0.3;
      headGroup.add(sideBeard);
    });

    // Отдельные скульптурные усы (две мягкие дуги над улыбкой)
    [-0.042, 0.042].forEach((mx, idx) => {
      const stache = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), hairMat);
      stache.scale.set(1.55, 0.58, 0.72);
      stache.position.set(mx, -0.002, 0.195);
      stache.rotation.z = idx === 0 ? 0.24 : -0.24;
      stache.rotation.y = idx === 0 ? -0.22 : 0.22;
      headGroup.add(stache);
    });

    // Тонкие круглые очки с дужками и лёгким бликом стекла
    addGlassesWithArms(headGroup, {
      kind: 'round',
      frameMat,
      lensMat,
      y: 0.082,
    });
  } else {
    // Unknown (Инкогнито): чёрная федора с вмятиной на тулье + тёмные очки с дужками
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.82 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x7d6b4b, roughness: 0.55 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f1116, metalness: 0.7, roughness: 0.25 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x07090d, metalness: 0.92, roughness: 0.08 });
    materials.push(hatMat, bandMat, frameMat, lensMat);

    // Изогнутые поля шляпы
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.37, 0.018, 24), hatMat);
    brim.scale.set(0.95, 1, 1.08);
    brim.position.set(0, 0.165, 0.01);
    brim.rotation.x = 0.08;
    brim.castShadow = true;
    headGroup.add(brim);

    // Тулья федоры
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.21, 0.175, 18), hatMat);
    crown.scale.set(0.94, 1, 1.06);
    crown.position.set(0, 0.255, 0.0);
    crown.rotation.x = 0.08;
    headGroup.add(crown);

    // Лента на шляпе
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.203, 0.209, 0.034, 18), bandMat);
    band.scale.set(0.94, 1, 1.06);
    band.position.set(0, 0.192, 0.005);
    band.rotation.x = 0.08;
    headGroup.add(band);

    // Тёмные очки инкогнито
    addGlassesWithArms(headGroup, {
      kind: 'sunglasses',
      frameMat,
      lensMat,
      y: 0.082,
    });
  }

  return headGroup;
}
