import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BoardState } from '../core/chess/boardState';
import { PieceColor, PieceType, sqCol, sqRow } from '../core/chess/types';
import {
  CardType,
  DifficultyLevel,
  GameMode,
  GraphicsQuality,
  LightPreviewAvatar,
} from '../core/deck/cardData';
import { CoinSide, MatchActor } from '../core/match/matchEngine';
import { soundManager } from '../audio/soundManager';
import { AvatarId } from '../data/playerAvatars';
import { assetFactory } from './assetFactory';
import { CharacterRigController } from './characterRig';
import { createPlayerAvatarRig } from './playerAvatar3D';
import {
  HpMonitorRig,
  LightClockRig,
  MaterialBank,
  RevolverRig,
  buildHpMonitor,
  buildLightTableClock,
  createConcreteWallTexture,
  createMaterialBank,
  getCardFaceMaterial,
} from './proceduralAssets';

export type CameraPreset =
  | 'CAM_TITLE'
  | 'CAM_IDLE'
  | 'CAM_BOARD_TACTICAL'
  | 'CAM_CARD_DRAW'
  | 'CAM_COIN_FLIP'
  | 'CAM_REVOLVER';

export interface GraphicsSettings {
  quality: GraphicsQuality;
  showFps: boolean;
}

export interface SceneCallbacks {
  onSquareClick: (sq: number) => void;
  onDeckClick: () => void;
  onSquareHover: (sq: number | null) => void;
  onFpsSample?: (fps: number) => void;
}

const SQ_SIZE = 0.28;
const BOARD_SPAN = SQ_SIZE * 8;
const BOARD_HALF = BOARD_SPAN / 2;
const SURVIVAL_BLOOD_SQUARES = new Set([19, 28, 35, 44]);

// Pre-allocated scratch vectors for zero-GC animation loop
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _curLook = new THREE.Vector3(0, 0.5, 0);
const _rayMouse = new THREE.Vector2();
const _coinFocusPos = new THREE.Vector3(1.44, 0.015, 0.74);
const _handTargetWorld = new THREE.Vector3();
const _socketWorld = new THREE.Vector3();
const _pieceWorld = new THREE.Vector3();
const _pieceLocal = new THREE.Vector3();
const _revolverRestPos = new THREE.Vector3(-1.46, 0.055, -0.32);
const _revolverAimPos = new THREE.Vector3();
const _revolverFlashWorld = new THREE.Vector3();
const _revGripWorld = new THREE.Vector3();
const _revHandPos = new THREE.Vector3();
const _revHandOffset = new THREE.Vector3();
const _revQuat = new THREE.Quaternion();
const _revHandQuat = new THREE.Quaternion();
const _revEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _revDealerHandLocalQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, Math.PI, -Math.PI * 0.48));
const _revPlayerHandLocalQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0.04, 0.44));
const _deckDummy = new THREE.Object3D();
const _rimEasyColor = new THREE.Color(0x475569);
const _rimMedColor = new THREE.Color(0x7a2428);
const _rimHardColor = new THREE.Color(0xb91c1c);
const _rimTargetColor = new THREE.Color();
const _spotEasyColor = new THREE.Color(0xffcf8b);
const _spotHardColor = new THREE.Color(0xffdcb0);
const _spotTargetColor = new THREE.Color();

// Reusable Day -> Sunset -> Night palette colors (zero per-frame allocations)
const _skyDayColor = new THREE.Color(0xc5e1f5);
const _skySunsetColor = new THREE.Color(0xc97b63);
const _skyNightColor = new THREE.Color(0x0d152a);
const _fogDayColor = new THREE.Color(0xc5e1f5);
const _fogSunsetColor = new THREE.Color(0x6e5178);
const _fogNightColor = new THREE.Color(0x111b33);
const _hemiSkyDay = new THREE.Color(0xf3f7ff);
const _hemiSkySunset = new THREE.Color(0xffb58c);
const _hemiSkyNight = new THREE.Color(0x284178);
const _hemiGndDay = new THREE.Color(0x6b7c54);
const _hemiGndSunset = new THREE.Color(0x523f44);
const _hemiGndNight = new THREE.Color(0x141b2b);
const _sunLightDay = new THREE.Color(0xffeed0);
const _sunLightSunset = new THREE.Color(0xff7e3f);
const _faceFillDay = new THREE.Color(0xffe6cc);
const _faceFillNight = new THREE.Color(0xbcd4ff);
const _cloudDayColor = new THREE.Color(0xf8fbff);
const _cloudSunsetColor = new THREE.Color(0xffb18a);
const _cloudNightColor = new THREE.Color(0x253456);
const _sunDiskDay = new THREE.Color(0xfff6cc);
const _sunDiskSunset = new THREE.Color(0xff6b2b);
const _atmoBgColor = new THREE.Color(0xc5e1f5);
const _atmoFogColor = new THREE.Color(0xc5e1f5);

export function computeUnknownNightTarget(fullTurns: number): number {
  if (fullTurns <= 1) return 0;
  if (fullTurns === 2) return 0.28;
  if (fullTurns === 3) return 0.58;
  if (fullTurns === 4) return 0.85;
  return 1.0;
}

interface LightAtmosphereRig {
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  faceFillLight: THREE.DirectionalLight;
  moonLight: THREE.DirectionalLight;
  nightTableLight: THREE.PointLight;
  sunMesh: THREE.Mesh;
  sunHalo: THREE.Mesh;
  moonMesh: THREE.Mesh;
  moonHalo: THREE.Mesh;
  starsPoints: THREE.Points;
  cloudMat: THREE.MeshStandardMaterial;
}

interface ModeWorldBundle {
  mode: GameMode;
  bank: MaterialBank;
  envGroup: THREE.Group;
  boardStaticGroup: THREE.Group;
  propsGroup: THREE.Group;
  shadowLight: THREE.SpotLight | THREE.DirectionalLight;
  deckInstanced: THREE.InstancedMesh;
  deckBaseMatrices: THREE.Matrix4[];
  deckBasePos: { x: number; y: number; z: number; rotY: number }[];
  deckOutlineMesh: THREE.Mesh;
  playerHands: { left: THREE.Group; right: THREE.Group };
  overheadLampGroup?: THREE.Group;
  lampFixtureGroup?: THREE.Group;
  lampFadeTargets?: { mat: THREE.Material; baseOpacity: number }[];
  muzzleFlashLight?: THREE.PointLight;
  survivalSpotLight?: THREE.SpotLight;
  survivalRimLight?: THREE.DirectionalLight;
  revolverRig?: RevolverRig;
  coinMesh?: THREE.Group;
  hpMonitor?: HpMonitorRig;
  dealerRig?: CharacterRigController;
  lightClock?: LightClockRig;
  cloudInstanced?: THREE.InstancedMesh;
  cloudEntries?: { x: number; y: number; z: number; sx: number; sy: number; sz: number; speed: number }[];
  lightAtmosphere?: LightAtmosphereRig;
  lightNpcRigs?: Map<LightPreviewAvatar, CharacterRigController>;
}

function disposeObjectSubtree(root: THREE.Object3D): void {
  const disposeMat = (mat: THREE.Material) => {
    if (mat.userData?.shared) return;
    const anyMat = mat as THREE.MeshStandardMaterial;
    for (const tex of [anyMat.map, anyMat.bumpMap, anyMat.roughnessMap]) {
      if (tex && !tex.userData?.shared) {
        tex.dispose();
      }
    }
    mat.dispose();
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !mesh.geometry.userData?.shared) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach(disposeMat);
    } else if (mat) {
      disposeMat(mat);
    }
  });
}

function squareToLocalPos(sq: number): { x: number; z: number } {
  const r = sqRow(sq);
  const c = sqCol(sq);
  // Row 0 (White rank 1) at +Z (near player), Row 7 (Black rank 8) at -Z (near opponent)
  const x = (c - 3.5) * SQ_SIZE;
  const z = (3.5 - r) * SQ_SIZE;
  return { x, z };
}

export class ChUnoSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private isSoftwareGl: boolean;
  private callbacks: SceneCallbacks;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsedTime = 0;

  private mode: GameMode = 'light';
  private activeBundleMode: GameMode | null = null;
  private survivalDifficulty: DifficultyLevel = 'easy';
  private personality: LightPreviewAvatar = 'unknown';
  private maxHp = 3;
  private graphicsQuality: GraphicsQuality = 'high';
  private showFps = false;
  private fpsFrames = 0;
  private fpsAccumSec = 0;

  // Dual cached world containers (lazy-built once each, toggled via .visible for zero-lag switching)
  private survivalBundle: ModeWorldBundle | null = null;
  private lightBundle: ModeWorldBundle | null = null;

  // Active scene group references (pointing at the currently visible bundle)
  private envGroup = new THREE.Group();
  private boardPivot = new THREE.Group();
  private piecesGroup = new THREE.Group();
  private captureBloodGroup = new THREE.Group();
  private graveyardGroup = new THREE.Group();
  private propsGroup = new THREE.Group();
  private transientGroup = new THREE.Group();

  private bank!: MaterialBank;
  private activeShadowLight: THREE.SpotLight | THREE.DirectionalLight | null = null;
  private survivalSpotLight: THREE.SpotLight | null = null;
  private survivalRimLight: THREE.DirectionalLight | null = null;
  private lightAtmosphere: LightAtmosphereRig | null = null;
  private targetNight = 0;
  private currentNight = 0;
  private lightBgColor = new THREE.Color(0xc5e1f5);
  private lightFog = new THREE.FogExp2(0xc5e1f5, 0.016);
  private squareHighlights: THREE.Mesh[] = [];
  private squareHitboxes: THREE.Mesh[] = [];
  private interactables: THREE.Object3D[] = [];
  private deckHitbox: THREE.Mesh | null = null;
  private deckInstanced: THREE.InstancedMesh | null = null;
  private deckBaseMatrices: THREE.Matrix4[] = [];
  private deckBasePos: { x: number; y: number; z: number; rotY: number }[] = [];
  private deckOutlineMesh: THREE.Mesh | null = null;
  private visibleDeckTopIdx = 17;
  private lastAppliedTopIdx = -1;
  private lastAppliedDeckLift = -1;
  private canDrawDeck = false;
  private hoveredDeck = false;
  private deckHoverLift = 0;
  private interactiveRaycastEnabled = false;
  private pointerDirty = false;

  private pieceMeshes = new Map<number, THREE.Group>();
  private pieceAnimations = new Map<
    number,
    { from: THREE.Vector3; to: THREE.Vector3; elapsed: number; duration: number }
  >();

  private opponentRig: CharacterRigController | null = null;
  private speaking = false;

  private oppMoveAnim = {
    active: false,
    pieceId: null as number | null,
    fromLocal: new THREE.Vector3(),
    toLocal: new THREE.Vector3(),
    fromWorld: new THREE.Vector3(),
    toWorld: new THREE.Vector3(),
    isCapture: false,
    gripped: false,
    placed: false,
    elapsed: 0,
    approachDur: 0.28,
    carryDur: 0.38,
    returnDur: 0.3,
  };

  private oppReachAnim = {
    active: false,
    targetWorld: new THREE.Vector3(),
    gripped: false,
    elapsed: 0,
    approachDur: 0.28,
    holdDur: 0.22,
    returnDur: 0.3,
  };

  private oppCardAnim = {
    active: false,
    elapsed: 0,
    duration: 0.96,
  };

  private playerHandAction = {
    active: false,
    elapsed: 0,
    duration: 0.85,
  };

  private playerHands: { left: THREE.Group; right: THREE.Group } | null = null;
  private revolverRig: RevolverRig | null = null;
  private coinMesh: THREE.Group | null = null;
  private hpMonitor: HpMonitorRig | null = null;
  private lightClock: LightClockRig | null = null;
  private matchElapsedSeconds = 0;
  private cloudInstanced: THREE.InstancedMesh | null = null;
  private cloudEntries: { x: number; y: number; z: number; sx: number; sy: number; sz: number; speed: number }[] = [];

  // Separated lamp pivot (holds SpotLight) & visual fixture (faded out in CAM_BOARD_TACTICAL)
  private overheadLampGroup: THREE.Group | null = null;
  private lampFixtureGroup: THREE.Group | null = null;
  private lampFixtureFade = 1;
  private lampFadeTargets: { mat: THREE.Material; baseOpacity: number }[] = [];
  private muzzleFlashLight: THREE.PointLight | null = null;

  // Floating Card reveal mesh
  private revealCardMesh: THREE.Mesh | null = null;
  private revealCardTimer = 0;
  private revealCardDuration = 1.4;
  private revealCardStart = new THREE.Vector3(1.56, 0.25, 0.22);
  private revealCardEnd = new THREE.Vector3(0.1, 1.18, 1.05);

  // Coin animation state (~4.35s Buckshot-Roulette choreography)
  private coinAnim = {
    active: false,
    elapsed: 0,
    duration: 4.35,
    result: 'heads' as CoinSide,
    thrower: 'opponent' as MatchActor,
    slammed: false,
  };

  // 4-stage Revolver shot choreography (~2.25s)
  private revolverAnim = {
    active: false,
    elapsed: 0,
    duration: 2.25,
    target: 'opponent' as MatchActor,
    cocked: false,
    fired: false,
    baseCylRot: 0,
  };

  // Camera state
  private cameraPreset: CameraPreset = 'CAM_TITLE';
  private targetBoardRotationY = 0;
  private pointerNDC = { x: 0, y: 0 };
  private freeLookYaw = 0;
  private freeLookPitch = 0;
  private trauma = 0;

  // Board highlight state
  private selectedSq: number | null = null;
  private legalTargetSqs = new Set<number>();
  private checkSq: number | null = null;
  private hoveredSq: number | null = null;
  private movesRemainingDots: THREE.Mesh[] = [];

  constructor(
    container: HTMLElement,
    callbacks: SceneCallbacks,
    initialSettings: GraphicsSettings = { quality: 'high', showFps: false },
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.graphicsQuality = initialSettings.quality;
    this.showFps = initialSettings.showFps;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.applyRendererQuality();
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 130);
    this.camera.position.set(2.9, 2.35, 3.3);
    _curLook.set(0, 0.55, -0.2);
    this.camera.lookAt(_curLook);

    this.scene.add(this.boardPivot);
    this.boardPivot.add(this.piecesGroup);
    this.boardPivot.add(this.captureBloodGroup);
    this.scene.add(this.graveyardGroup);
    this.scene.add(this.transientGroup);

    this.initSharedBoardInteractables();
    this.rebuildWorld('light', 'unknown', 3, 'easy');

    void assetFactory.preloadPublicModels().then((loaded) => {
      if (loaded && !this.disposed) {
        this.refreshCustomOpponentAndProps();
      }
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();

    if (typeof window !== 'undefined') {
      (window as unknown as {
        __chunoSceneDebug?: {
          getNightState: () => { current: number; target: number };
          setNightProgress: (target: number, snap?: boolean) => void;
        };
      }).__chunoSceneDebug = {
        getNightState: () => this.getUnknownNightState(),
        setNightProgress: (target: number, snap = false) => {
          this.setUnknownNightProgress(target);
          if (snap) {
            this.currentNight = this.targetNight;
            this.applyLightAtmosphere(this.currentNight, this.elapsedTime);
          }
        },
      };
    }
  }

  private applyRendererQuality(): void {
    const cap =
      this.isSoftwareGl || this.graphicsQuality === 'low'
        ? 1.0
        : this.graphicsQuality === 'medium'
          ? 1.25
          : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));

    const shadowsOn = !this.isSoftwareGl && this.graphicsQuality !== 'low';
    this.renderer.shadowMap.enabled = shadowsOn;
    this.renderer.shadowMap.type =
      this.graphicsQuality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    if (this.activeShadowLight) {
      this.activeShadowLight.castShadow = shadowsOn;
      const sz = this.graphicsQuality === 'high' ? 1024 : 512;
      if (this.activeShadowLight.shadow.mapSize.x !== sz) {
        this.activeShadowLight.shadow.mapSize.set(sz, sz);
        this.activeShadowLight.shadow.map?.dispose();
        this.activeShadowLight.shadow.map = null;
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  public setGraphicsSettings(settings: GraphicsSettings): void {
    this.graphicsQuality = settings.quality;
    this.showFps = settings.showFps;
    this.fpsFrames = 0;
    this.fpsAccumSec = 0;
    this.applyRendererQuality();
  }

  public setInteractiveRaycastingEnabled(enabled: boolean): void {
    this.interactiveRaycastEnabled = enabled;
    if (!enabled) {
      this.pointerDirty = false;
      this.hoveredDeck = false;
      if (this.hoveredSq !== null) {
        this.hoveredSq = null;
        this.refreshSquareHighlights();
      }
      this.renderer.domElement.style.cursor = 'default';
    } else {
      this.pointerDirty = true;
    }
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (this.interactiveRaycastEnabled) {
      this.pointerDirty = true;
    }
  };

  private processHoverRaycast(): void {
    _rayMouse.set(this.pointerNDC.x, this.pointerNDC.y);
    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    let foundSq: number | null = null;
    let overDeck = false;
    for (const hit of hits) {
      if (hit.object.userData.isDeck) {
        overDeck = true;
        break;
      }
      if (typeof hit.object.userData.sq === 'number') {
        foundSq = hit.object.userData.sq;
        break;
      }
    }

    this.hoveredDeck = overDeck && this.canDrawDeck;

    if (foundSq !== this.hoveredSq) {
      this.hoveredSq = foundSq;
      this.callbacks.onSquareHover(foundSq);
      this.refreshSquareHighlights();
    }

    const canHoverSq = !this.canDrawDeck && foundSq !== null;
    this.renderer.domElement.style.cursor = this.hoveredDeck || canHoverSq ? 'pointer' : 'default';
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !this.interactiveRaycastEnabled) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    if (hits.length === 0) return;
    for (const hit of hits) {
      if (hit.object.userData.isDeck) {
        if (this.canDrawDeck) {
          this.callbacks.onDeckClick();
        }
        return;
      }
      if (typeof hit.object.userData.sq === 'number') {
        this.callbacks.onSquareClick(hit.object.userData.sq);
        return;
      }
    }
  };

  public setCanDrawDeck(canDraw: boolean): void {
    this.canDrawDeck = canDraw;
    if (!canDraw) {
      this.hoveredDeck = false;
    }
    this.pointerDirty = this.interactiveRaycastEnabled;
  }

  public setDealerTense(_tense: boolean): void {
    // CharacterRig maintains crossed-arms idle pose naturally
  }

  public setSpeaking(active: boolean): void {
    this.speaking = active;
  }

  private squareToWorldPos(sq: number, y: number, out: THREE.Vector3): THREE.Vector3 {
    const { x, z } = squareToLocalPos(sq);
    // Use targetBoardRotationY directly if boardPivot hasn't finished rotating, or current world matrix
    this.boardPivot.updateMatrixWorld(true);
    out.set(x, y, z);
    return this.boardPivot.localToWorld(out);
  }

  public triggerOpponentMove(fromSq: number, toSq: number, isCapture: boolean): void {
    // Snap any previously animated opponent piece before starting next move
    if (this.oppMoveAnim.active && this.oppMoveAnim.pieceId !== null) {
      const prevMesh = this.pieceMeshes.get(this.oppMoveAnim.pieceId);
      if (prevMesh) {
        prevMesh.position.copy(this.oppMoveAnim.toLocal);
      }
      if (!this.oppMoveAnim.placed) {
        soundManager.playPieceMove(this.oppMoveAnim.isCapture);
      }
    }

    const fromPos = squareToLocalPos(fromSq);
    const toPos = squareToLocalPos(toSq);
    this.oppMoveAnim.fromLocal.set(fromPos.x, 0.08, fromPos.z);
    this.oppMoveAnim.toLocal.set(toPos.x, 0.08, toPos.z);
    this.squareToWorldPos(fromSq, 0.08, this.oppMoveAnim.fromWorld);
    this.squareToWorldPos(toSq, 0.08, this.oppMoveAnim.toWorld);

    this.oppMoveAnim.active = true;
    this.oppMoveAnim.pieceId = null;
    this.oppMoveAnim.isCapture = isCapture;
    this.oppMoveAnim.gripped = false;
    this.oppMoveAnim.placed = false;
    this.oppMoveAnim.elapsed = 0;
    // Ruthless, snappy glove timing on Survival Hard
    const isHardDealer = this.mode === 'survival' && this.survivalDifficulty === 'hard';
    this.oppMoveAnim.approachDur = isHardDealer ? 0.22 : 0.28;
    this.oppMoveAnim.carryDur = isHardDealer ? 0.3 : 0.38;
    this.oppMoveAnim.returnDur = isHardDealer ? 0.24 : 0.3;

    this.oppReachAnim.active = false;
  }

  public triggerOpponentReach(sq: number): void {
    this.squareToWorldPos(sq, 0.22, this.oppReachAnim.targetWorld);
    this.oppReachAnim.active = true;
    this.oppReachAnim.gripped = false;
    this.oppReachAnim.elapsed = 0;
  }

  public addCaptureBloodDecal(sq: number): void {
    if (this.mode !== 'survival') return;
    if (this.captureBloodGroup.children.length >= 16) return;
    const { x, z } = squareToLocalPos(sq);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(SQ_SIZE * 0.86, SQ_SIZE * 0.86), this.bank.bloodDecal);
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = (sq * 1.37) % (Math.PI * 2);
    decal.position.set(x, 0.082, z);
    this.captureBloodGroup.add(decal);
  }

  public clearCaptureBloodDecals(): void {
    this.clearGroup(this.captureBloodGroup);
  }

  private initSharedBoardInteractables(): void {
    const hlGeo = new THREE.PlaneGeometry(SQ_SIZE * 0.9, SQ_SIZE * 0.9);
    const hitGeo = new THREE.PlaneGeometry(SQ_SIZE, SQ_SIZE);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    // Deck hitbox placed FIRST in interactables so it wins overlapping raycasts cleanly
    const deckHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.26, 0.68),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    deckHit.position.set(1.56, 0.1, 0.22);
    deckHit.userData.isDeck = true;
    this.scene.add(deckHit);
    this.deckHitbox = deckHit;
    this.interactables.push(deckHit);

    for (let sq = 0; sq < 64; sq++) {
      const { x, z } = squareToLocalPos(sq);
      const hlMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.rotation.x = -Math.PI / 2;
      hl.position.set(x, 0.088, z);
      this.boardPivot.add(hl);
      this.squareHighlights[sq] = hl;

      const hitbox = new THREE.Mesh(hitGeo, hitMat);
      hitbox.rotation.x = -Math.PI / 2;
      hitbox.position.set(x, 0.095, z);
      hitbox.userData.sq = sq;
      this.boardPivot.add(hitbox);
      this.squareHitboxes[sq] = hitbox;
      this.interactables.push(hitbox);
    }

    // Moves remaining diegetic glowing pips along the near edge of the board frame
    const pipGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12);
    for (let i = 0; i < 5; i++) {
      const pip = new THREE.Mesh(
        pipGeo,
        new THREE.MeshStandardMaterial({
          color: 0x333333,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.3,
        }),
      );
      pip.position.set((i - 2) * 0.16, 0.078, BOARD_HALF + 0.075);
      this.boardPivot.add(pip);
      this.movesRemainingDots.push(pip);
    }
  }

  private ensureWorldBundle(mode: GameMode): ModeWorldBundle {
    if (mode === 'survival' && this.survivalBundle) return this.survivalBundle;
    if (mode === 'light' && this.lightBundle) return this.lightBundle;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const bank = createMaterialBank(mode, maxAniso);
    const envGroup = new THREE.Group();
    const boardStaticGroup = new THREE.Group();
    const propsGroup = new THREE.Group();

    // Point temporary builder fields to this bundle's groups while constructing once
    const prevMode = this.mode;
    const prevBank = this.bank;
    const prevEnv = this.envGroup;
    const prevProps = this.propsGroup;

    this.mode = mode;
    this.bank = bank;
    this.envGroup = envGroup;
    this.propsGroup = propsGroup;
    this.activeShadowLight = null;
    this.survivalSpotLight = null;
    this.survivalRimLight = null;
    this.overheadLampGroup = null;
    this.lampFixtureGroup = null;
    this.lampFadeTargets = [];
    this.muzzleFlashLight = null;
    this.cloudInstanced = null;
    this.cloudEntries = [];

    if (mode === 'survival') {
      this.buildSurvivalEnvironment();
    } else {
      this.buildLightEnvironment();
    }

    this.buildTableAndBoardInto(boardStaticGroup, mode, bank);
    const propHandles = this.buildPropsInto(propsGroup, mode, bank);

    const bundle: ModeWorldBundle = {
      mode,
      bank,
      envGroup,
      boardStaticGroup,
      propsGroup,
      shadowLight: this.activeShadowLight!,
      deckInstanced: propHandles.deckInstanced,
      deckBaseMatrices: propHandles.deckBaseMatrices,
      deckBasePos: propHandles.deckBasePos,
      deckOutlineMesh: propHandles.deckOutlineMesh,
      playerHands: propHandles.playerHands,
      overheadLampGroup: this.overheadLampGroup ?? undefined,
      lampFixtureGroup: this.lampFixtureGroup ?? undefined,
      lampFadeTargets: this.lampFadeTargets.length > 0 ? [...this.lampFadeTargets] : undefined,
      muzzleFlashLight: this.muzzleFlashLight ?? undefined,
      survivalSpotLight: this.survivalSpotLight ?? undefined,
      survivalRimLight: this.survivalRimLight ?? undefined,
      revolverRig: propHandles.revolverRig,
      coinMesh: propHandles.coinMesh,
      hpMonitor: propHandles.hpMonitor,
      dealerRig: propHandles.dealerRig,
      lightClock: propHandles.lightClock,
      cloudInstanced: this.cloudInstanced ?? undefined,
      cloudEntries: this.cloudEntries.length > 0 ? [...this.cloudEntries] : undefined,
      lightAtmosphere: mode === 'light' ? (this.lightAtmosphere ?? undefined) : undefined,
      lightNpcRigs: propHandles.lightNpcRigs,
    };

    this.scene.add(envGroup);
    this.scene.add(propsGroup);
    this.boardPivot.add(boardStaticGroup);

    if (mode === 'survival') {
      this.survivalBundle = bundle;
    } else {
      this.lightBundle = bundle;
    }

    // Restore fields temporarily; rebuildWorld activates the chosen bundle cleanly right after
    this.mode = prevMode;
    this.bank = prevBank;
    this.envGroup = prevEnv;
    this.propsGroup = prevProps;

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    return bundle;
  }

  private applyHpMonitorSlots(maxHp: number): void {
    if (!this.hpMonitor) return;
    this.hpMonitor.setState({
      maxHp,
      playerHp: maxHp,
      opponentHp: maxHp,
      elapsedSeconds: this.matchElapsedSeconds,
      suppressLossAnim: true,
      opponentLabel: this.onlineOpponentName ?? 'DEALER',
    });
  }

  /**
   * Updates both the Survival 3D CRT Console clock and the Light Mode tabletop chess clock.
   * Redraws textures strictly when the integer second changes (zero per-frame overhead).
   */
  public setMatchTimeSeconds(seconds: number): void {
    const safeSec = Math.max(0, Math.floor(seconds));
    this.matchElapsedSeconds = safeSec;
    this.survivalBundle?.hpMonitor?.setState({ elapsedSeconds: safeSec });
    this.lightBundle?.lightClock?.setTime(safeSec);
  }

  /**
   * Smoothly transitions Friendly Mode time-of-day (0 = Day, 0.5 = Sunset, 1 = Moonlit Night).
   * Active exclusively during matches against Unknown; main menu & other opponents stay at 0.
   */
  public setUnknownNightProgress(target: number): void {
    this.targetNight = THREE.MathUtils.clamp(target, 0, 1);
  }

  public getUnknownNightState(): { current: number; target: number } {
    return { current: this.currentNight, target: this.targetNight };
  }

  private applyLightAtmosphere(p: number, elapsed: number): void {
    const atmo = this.lightAtmosphere;
    if (!atmo || this.mode !== 'light') return;

    const k = THREE.MathUtils.clamp(p, 0, 1);
    const sunsetPhase = THREE.MathUtils.clamp(k * 2, 0, 1);
    const nightPhase = THREE.MathUtils.clamp((k - 0.5) * 2, 0, 1);

    // 1. 3-point sky & fog gradient (Day -> Sunset -> Night)
    if (k <= 0.5) {
      _atmoBgColor.lerpColors(_skyDayColor, _skySunsetColor, sunsetPhase);
      _atmoFogColor.lerpColors(_fogDayColor, _fogSunsetColor, sunsetPhase);
      atmo.hemiLight.color.lerpColors(_hemiSkyDay, _hemiSkySunset, sunsetPhase);
      atmo.hemiLight.groundColor.lerpColors(_hemiGndDay, _hemiGndSunset, sunsetPhase);
      atmo.hemiLight.intensity = THREE.MathUtils.lerp(0.86, 0.52, sunsetPhase);
      atmo.cloudMat.color.lerpColors(_cloudDayColor, _cloudSunsetColor, sunsetPhase);
    } else {
      _atmoBgColor.lerpColors(_skySunsetColor, _skyNightColor, nightPhase);
      _atmoFogColor.lerpColors(_fogSunsetColor, _fogNightColor, nightPhase);
      atmo.hemiLight.color.lerpColors(_hemiSkySunset, _hemiSkyNight, nightPhase);
      atmo.hemiLight.groundColor.lerpColors(_hemiGndSunset, _hemiGndNight, nightPhase);
      atmo.hemiLight.intensity = THREE.MathUtils.lerp(0.52, 0.18, nightPhase);
      atmo.cloudMat.color.lerpColors(_cloudSunsetColor, _cloudNightColor, nightPhase);
    }

    this.lightBgColor.copy(_atmoBgColor);
    this.lightFog.color.copy(_atmoFogColor);
    this.lightFog.density = THREE.MathUtils.lerp(0.015, 0.028, k);
    this.scene.background = this.lightBgColor;
    this.scene.fog = this.lightFog;
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.72, 0.12, k);

    // 2. Sun arc & warm directional light fading out by p = 0.68
    const sunT = THREE.MathUtils.clamp(k / 0.68, 0, 1);
    const sunVis = 1 - THREE.MathUtils.smoothstep(sunT, 0.72, 1.0);
    atmo.sunMesh.visible = sunVis > 0.01;
    atmo.sunHalo.visible = sunVis > 0.01;
    if (atmo.sunMesh.visible) {
      const sx = THREE.MathUtils.lerp(-9.5, -6.8, sunT);
      const sy = THREE.MathUtils.lerp(2.1, -1.15, sunT);
      const sz = -40;
      atmo.sunMesh.position.set(sx, sy, sz);
      atmo.sunHalo.position.set(sx, sy, sz - 0.25);
      const sunMat = atmo.sunMesh.material as THREE.MeshBasicMaterial;
      sunMat.color.lerpColors(_sunDiskDay, _sunDiskSunset, THREE.MathUtils.clamp(sunT * 1.15, 0, 1));
      sunMat.opacity = sunVis;
      const haloMat = atmo.sunHalo.material as THREE.MeshBasicMaterial;
      haloMat.color.copy(sunMat.color);
      haloMat.opacity = sunVis * 0.34;
    }

    const sunLightFade = 1 - THREE.MathUtils.smoothstep(k, 0.36, 0.72);
    atmo.sunLight.intensity = 1.42 * sunLightFade;
    atmo.sunLight.color.lerpColors(_sunLightDay, _sunLightSunset, THREE.MathUtils.clamp(k * 1.8, 0, 1));
    atmo.sunLight.position.set(
      THREE.MathUtils.lerp(5.2, -4.2, sunT),
      THREE.MathUtils.lerp(8.8, 2.0, sunT),
      THREE.MathUtils.lerp(4.6, -2.5, sunT),
    );

    // 3. Moonrise along opposite sky arc (0.42 -> 1.0) & silver rim light behind Unknown's silhouette
    const moonT = THREE.MathUtils.clamp((k - 0.42) / 0.58, 0, 1);
    const moonSmooth = THREE.MathUtils.smoothstep(moonT, 0, 1);
    atmo.moonMesh.visible = moonSmooth > 0.01;
    atmo.moonHalo.visible = moonSmooth > 0.01;
    if (atmo.moonMesh.visible) {
      const mx = THREE.MathUtils.lerp(8.6, 5.8, moonSmooth);
      const my = THREE.MathUtils.lerp(-1.4, 1.15, moonSmooth);
      const mz = -38;
      atmo.moonMesh.position.set(mx, my, mz);
      atmo.moonHalo.position.set(mx, my, mz - 0.25);
      const moonMat = atmo.moonMesh.material as THREE.MeshStandardMaterial;
      moonMat.opacity = moonSmooth;
      moonMat.emissiveIntensity = 1.35 * moonSmooth;
      const moonHaloMat = atmo.moonHalo.material as THREE.MeshBasicMaterial;
      moonHaloMat.opacity = 0.3 * moonSmooth;
    }
    atmo.moonLight.intensity = 0.58 * moonSmooth;

    // 4. Twinkling night stars emerging smoothly above p = 0.5
    const starFade = THREE.MathUtils.smoothstep(k, 0.48, 0.96);
    atmo.starsPoints.visible = starFade > 0.01;
    if (atmo.starsPoints.visible) {
      const starMat = atmo.starsPoints.material as THREE.PointsMaterial;
      starMat.opacity = starFade * (0.86 + 0.08 * Math.sin(elapsed * 1.6));
    }

    // 5. Tight warm tabletop lantern pool above the chessboard so pieces, clock & cards glow warmly at night
    const lanternFade = THREE.MathUtils.smoothstep(k, 0.32, 0.92);
    const warmShimmer = 1 + 0.025 * Math.sin(elapsed * 2.7);
    atmo.nightTableLight.intensity = 3.8 * lanternFade * warmShimmer;

    // Soften frontal face fill toward cool silver-blue moonlight at night
    atmo.faceFillLight.color.lerpColors(_faceFillDay, _faceFillNight, nightPhase);
    atmo.faceFillLight.intensity = THREE.MathUtils.lerp(0.32, 0.14, nightPhase);
  }

  /**
   * Real-time zero-rebuild Survival difficulty update (Easy / Medium / Hard):
   * smoothly morphs Dealer eyes, angry brows, posture, and room lighting without tearing down the scene.
   */
  public setSurvivalDifficulty(difficulty: DifficultyLevel): void {
    this.survivalDifficulty = difficulty;
    const hp = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 2 : 1;
    this.maxHp = hp;
    if (this.survivalBundle?.dealerRig) {
      this.survivalBundle.dealerRig.setDifficulty?.(difficulty);
    }
    if (this.mode === 'survival') {
      this.applyHpMonitorSlots(hp);
    }
  }

  /**
   * Real-time zero-rebuild Light Mode opponent preview switch:
   * toggles .visible across cached Light NPC rigs without recreating the meadow or chessboard.
   */
  public setLightPersonality(personality: LightPreviewAvatar): void {
    this.personality = personality;
    if (!this.lightBundle?.lightNpcRigs) return;

    let chosen = this.lightBundle.lightNpcRigs.get(personality);
    if (!chosen) {
      chosen = assetFactory.createLightNpc(personality);
      chosen.root.position.set(0, -0.48, -1.88);
      chosen.root.scale.setScalar(1.32);
      chosen.resetPose();
      this.lightBundle.propsGroup.add(chosen.root);
      this.lightBundle.lightNpcRigs.set(personality, chosen);
    }

    for (const [key, rig] of this.lightBundle.lightNpcRigs.entries()) {
      rig.root.visible = !this.onlineOpponentRig && key === personality;
    }

    if (this.mode === 'light' && !this.onlineOpponentRig) {
      this.opponentRig = chosen;
      this.opponentRig.resetPose();
    }
  }

  private onlineOpponentRig: CharacterRigController | null = null;
  private onlineOpponentFillLight: THREE.PointLight | null = null;
  private onlineOpponentAvatarId: AvatarId | null = null;
  private onlineOpponentName: string | null = null;
  private opponentEmoteReaction: {
    kind: 'nod' | 'shake' | 'tilt' | 'bounce' | 'bow';
    elapsed: number;
    duration: number;
  } | null = null;

  /**
   * Subtle additive head micro-reaction when the opponent sends an emote or quick phrase.
   */
  public triggerOpponentEmoteReaction(kind: 'nod' | 'shake' | 'tilt' | 'bounce' | 'bow'): void {
    this.opponentEmoteReaction = {
      kind,
      elapsed: 0,
      duration: 0.65,
    };
  }

  /**
   * Renders the online opponent's full animated 3D CharacterRigController (`playerAvatar3D.ts`)
   * across the table during 1v1 multiplayer matches (with breathing, head sway, eye blinking,
   * and IK hand reaches), or restores NPC/Dealer when returning to solo.
   */
  public setOnlineOpponentAvatar(avatarId: AvatarId | null, opponentName?: string | null): void {
    const resolvedName = avatarId ? (opponentName?.trim() || null) : null;
    this.onlineOpponentName = resolvedName;
    if (this.hpMonitor) {
      this.hpMonitor.setState({ opponentLabel: resolvedName ?? 'DEALER' });
    }
    if (avatarId === this.onlineOpponentAvatarId && Boolean(avatarId) === Boolean(this.onlineOpponentRig)) {
      return;
    }
    this.onlineOpponentAvatarId = avatarId;

    if (this.onlineOpponentRig) {
      this.scene.remove(this.onlineOpponentRig.root);
      this.onlineOpponentRig.dispose();
      this.onlineOpponentRig = null;
    }
    if (this.onlineOpponentFillLight) {
      this.scene.remove(this.onlineOpponentFillLight);
      this.onlineOpponentFillLight = null;
    }

    if (avatarId) {
      if (this.survivalBundle?.dealerRig) {
        this.survivalBundle.dealerRig.root.visible = false;
      }
      if (this.lightBundle?.lightNpcRigs) {
        for (const rig of this.lightBundle.lightNpcRigs.values()) {
          rig.root.visible = false;
        }
      }
      const rig = createPlayerAvatarRig(avatarId);
      rig.root.position.set(0, -0.48, -1.88);
      rig.root.scale.setScalar(1.32);
      rig.resetPose();
      this.scene.add(rig.root);
      this.onlineOpponentRig = rig;
      this.opponentRig = rig;

      // Soft warm face-fill light only in dim Survival room (Classic meadow already has faceFillLight)
      if (this.mode === 'survival') {
        const fill = new THREE.PointLight(0xffdfb8, 1.05, 3.2, 1.6);
        fill.position.set(0.18, 1.52, -0.82);
        this.scene.add(fill);
        this.onlineOpponentFillLight = fill;
      }
    } else {
      if (this.survivalBundle?.dealerRig) {
        this.survivalBundle.dealerRig.root.visible = true;
      }
      if (this.lightBundle?.lightNpcRigs) {
        for (const [key, rig] of this.lightBundle.lightNpcRigs.entries()) {
          rig.root.visible = key === this.personality;
        }
      }
      if (this.mode === 'survival') {
        this.opponentRig = this.survivalBundle?.dealerRig ?? null;
      } else {
        this.opponentRig = this.lightBundle?.lightNpcRigs?.get(this.personality) ?? null;
      }
    }
  }

  public rebuildWorld(
    mode: GameMode,
    personality: LightPreviewAvatar,
    maxHp: number,
    difficulty: DifficultyLevel = maxHp === 3 ? 'easy' : maxHp === 1 ? 'hard' : 'medium',
  ): void {
    const modeChanged = this.activeBundleMode !== mode;
    this.mode = mode;
    this.personality = personality;
    this.maxHp = maxHp;
    this.survivalDifficulty = difficulty;

    this.oppMoveAnim.active = false;
    this.oppReachAnim.active = false;
    this.oppCardAnim.active = false;
    if (this.revealCardMesh) {
      this.transientGroup.remove(this.revealCardMesh);
      disposeObjectSubtree(this.revealCardMesh);
      this.revealCardMesh = null;
      this.revealCardTimer = 0;
    }

    const active = this.ensureWorldBundle(mode);
    const inactive = mode === 'survival' ? this.lightBundle : this.survivalBundle;

    if (inactive) {
      inactive.envGroup.visible = false;
      inactive.propsGroup.visible = false;
      inactive.boardStaticGroup.visible = false;
    }
    active.envGroup.visible = true;
    active.propsGroup.visible = true;
    active.boardStaticGroup.visible = true;

    this.activeBundleMode = mode;
    this.bank = active.bank;
    this.envGroup = active.envGroup;
    this.propsGroup = active.propsGroup;
    this.activeShadowLight = active.shadowLight;
    this.deckInstanced = active.deckInstanced;
    this.deckBaseMatrices = active.deckBaseMatrices;
    this.deckBasePos = active.deckBasePos;
    this.deckOutlineMesh = active.deckOutlineMesh;
    this.playerHands = active.playerHands;
    this.lastAppliedTopIdx = -1;
    this.lastAppliedDeckLift = -1;

    this.overheadLampGroup = active.overheadLampGroup ?? null;
    this.lampFixtureGroup = active.lampFixtureGroup ?? null;
    this.lampFadeTargets = active.lampFadeTargets ?? [];
    this.lampFixtureFade = 1;
    this.muzzleFlashLight = active.muzzleFlashLight ?? null;
    this.survivalSpotLight = active.survivalSpotLight ?? null;
    this.survivalRimLight = active.survivalRimLight ?? null;
    this.revolverRig = active.revolverRig ?? null;
    this.coinMesh = active.coinMesh ?? null;
    this.hpMonitor = active.hpMonitor ?? null;
    this.lightClock = active.lightClock ?? null;
    this.cloudInstanced = active.cloudInstanced ?? null;
    this.cloudEntries = active.cloudEntries ?? [];
    this.lightAtmosphere = active.lightAtmosphere ?? null;

    if (mode === 'survival') {
      this.scene.background = new THREE.Color(0x040304);
      this.scene.fog = new THREE.FogExp2(0x040304, 0.11);
      this.scene.environmentIntensity = 0.16;
      this.opponentRig = active.dealerRig ?? null;
      this.opponentRig?.resetPose();
      this.setSurvivalDifficulty(difficulty);
    } else {
      this.lightClock?.setTime(this.matchElapsedSeconds);
      this.setLightPersonality(personality);
      this.applyLightAtmosphere(this.currentNight, this.elapsedTime);
    }

    if (modeChanged) {
      // Only clear pieces/graveyard/blood when switching Survival <-> Light so materials match the mode
      this.clearGroup(this.graveyardGroup);
      this.clearGroup(this.captureBloodGroup);
      this.clearGroup(this.piecesGroup);
      this.pieceMeshes.clear();
      this.pieceAnimations.clear();
    } else {
      this.clearGroup(this.captureBloodGroup);
    }

    this.applyRendererQuality();
    this.refreshSquareHighlights();
    this.renderer.render(this.scene, this.camera);
  }

  private clearGroup(g: THREE.Group): void {
    while (g.children.length > 0) {
      const ch = g.children[0];
      g.remove(ch);
      disposeObjectSubtree(ch);
    }
  }

  private refreshCustomOpponentAndProps(): void {
    if (this.survivalBundle) {
      const sb = this.survivalBundle;
      if (sb.revolverRig) {
        sb.propsGroup.remove(sb.revolverRig.group);
        disposeObjectSubtree(sb.revolverRig.group);
        sb.revolverRig = assetFactory.createRevolver(sb.bank);
        sb.revolverRig.group.position.copy(_revolverRestPos);
        sb.revolverRig.group.rotation.set(0, 0.42, Math.PI / 2);
        sb.propsGroup.add(sb.revolverRig.group);
        if (this.mode === 'survival') {
          this.revolverRig = sb.revolverRig;
        }
      }
      if (sb.dealerRig) {
        sb.propsGroup.remove(sb.dealerRig.root);
        sb.dealerRig.dispose();
      }
      sb.dealerRig = assetFactory.createDealer();
      sb.dealerRig.root.position.set(0, -0.44, -2.16);
      sb.dealerRig.root.scale.setScalar(1.32);
      sb.dealerRig.resetPose();
      sb.dealerRig.setDifficulty?.(this.survivalDifficulty);
      sb.propsGroup.add(sb.dealerRig.root);
      if (this.mode === 'survival') {
        this.opponentRig = sb.dealerRig;
      }
    }

    if (this.lightBundle && this.lightBundle.lightNpcRigs) {
      const lb = this.lightBundle;
      const rigs = lb.lightNpcRigs;
      if (rigs) {
        for (const [, rig] of rigs.entries()) {
          lb.propsGroup.remove(rig.root);
          rig.dispose();
        }
        rigs.clear();
        const fresh = assetFactory.createLightNpc(this.personality);
        fresh.root.position.set(0, -0.48, -1.88);
        fresh.root.scale.setScalar(1.32);
        fresh.resetPose();
        lb.propsGroup.add(fresh.root);
        rigs.set(this.personality, fresh);
        if (this.mode === 'light') {
          this.opponentRig = fresh;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private buildSurvivalEnvironment(): void {
    this.scene.background = new THREE.Color(0x040304);
    this.scene.fog = new THREE.FogExp2(0x040304, 0.11);
    this.scene.environmentIntensity = 0.16;

    const hemi = new THREE.HemisphereLight(0x1f2533, 0x100b09, 0.3);
    this.envGroup.add(hemi);

    // Overhead swinging industrial lamp: lights live on lampGroup, visual fixture lives inside lampFixtureGroup
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 4.4, 0);

    const fixtureGroup = new THREE.Group();
    lampGroup.add(fixtureGroup);

    const cordMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9, transparent: true, opacity: 1 });
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), cordMat);
    cord.position.y = -0.8;
    fixtureGroup.add(cord);

    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x222426,
      roughness: 0.5,
      metalness: 0.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.34, 14, 1, true), shadeMat);
    shade.position.y = -1.65;
    fixtureGroup.add(shade);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffdfaa,
      emissive: 0xffb85c,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 1,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat);
    bulb.position.y = -1.72;
    fixtureGroup.add(bulb);

    // Soft volumetric light cone with vertical fade gradient beneath the shade
    const coneCanvas = document.createElement('canvas');
    coneCanvas.width = 16;
    coneCanvas.height = 128;
    const cCtx = coneCanvas.getContext('2d')!;
    const cGrad = cCtx.createLinearGradient(0, 0, 0, 128);
    cGrad.addColorStop(0, 'rgba(255, 215, 155, 0.55)');
    cGrad.addColorStop(0.55, 'rgba(255, 215, 155, 0.16)');
    cGrad.addColorStop(1, 'rgba(255, 215, 155, 0)');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, 16, 128);
    const coneTex = new THREE.CanvasTexture(coneCanvas);

    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffd79b,
      map: coneTex,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const volCone = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 1.75, 2.4, 18, 1, true), coneMat);
    volCone.position.y = -2.95;
    fixtureGroup.add(volCone);

    this.lampFixtureGroup = fixtureGroup;
    this.lampFadeTargets = [
      { mat: cordMat, baseOpacity: 1 },
      { mat: shadeMat, baseOpacity: 1 },
      { mat: bulbMat, baseOpacity: 1 },
      { mat: coneMat, baseOpacity: 0.09 },
    ];

    // Primary spotlight (strictly 1 shadow-casting light in Survival Mode) — sharp falloff into pitch darkness behind table
    const spot = new THREE.SpotLight(0xffcf8b, 42, 10.5, Math.PI / 2.75, 0.68, 1.45);
    spot.position.set(0, -1.75, 0);
    spot.target.position.set(0, -4.4, 0.06);
    spot.castShadow = !this.isSoftwareGl && this.graphicsQuality !== 'low';
    const shadowRes = this.graphicsQuality === 'high' ? 1024 : 512;
    spot.shadow.mapSize.set(shadowRes, shadowRes);
    spot.shadow.bias = -0.0005;
    spot.shadow.normalBias = 0.02;
    this.activeShadowLight = spot;
    this.survivalSpotLight = spot;
    lampGroup.add(spot);
    lampGroup.add(spot.target);

    // Focused warm table bounce so board & Dealer skull-face emerge starkly out of darkness
    const tableBounce = new THREE.PointLight(0xffbe76, 1.85, 5.0, 1.5);
    tableBounce.position.set(0, 1.15, 0.2);
    this.envGroup.add(tableBounce);

    // Subtle moody under-key grazing only the Dealer's cheekbones and teeth in the shadow
    const dealerFaceGraze = new THREE.PointLight(0xd9b896, 1.15, 2.8, 1.8);
    dealerFaceGraze.position.set(0, 1.12, -1.05);
    this.envGroup.add(dealerFaceGraze);

    this.overheadLampGroup = lampGroup;
    this.envGroup.add(lampGroup);

    // Rim separating the skull edge from pitch-black back wall (shifts softly crimson on Medium/Hard without blowing out forehead)
    const rim = new THREE.DirectionalLight(0x475569, 0.26);
    rim.position.set(-2.4, 1.35, -3.8);
    this.survivalRimLight = rim;
    this.envGroup.add(rim);

    // Muzzle flash transient light
    this.muzzleFlashLight = new THREE.PointLight(0xff9436, 0, 8, 2);
    this.muzzleFlashLight.position.set(0, 1.1, 0.4);
    this.envGroup.add(this.muzzleFlashLight);

    // Enclosed concrete/brick cellar room
    const concreteTex = createConcreteWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: concreteTex,
      roughness: 0.94,
      metalness: 0.05,
    });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x120f0e, roughness: 0.95, metalness: 0.04 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.45;
    floor.receiveShadow = true;
    this.envGroup.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
    backWall.position.set(0, 2.5, -4.4);
    this.envGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4.8, 2.5, 0);
    this.envGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(4.8, 2.5, 0);
    this.envGroup.add(rightWall);

    // Heavy steel door on back-left wall
    const rustSteelMat = new THREE.MeshStandardMaterial({ color: 0x242629, roughness: 0.72, metalness: 0.65 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.65, metalness: 0.7 });
    const pipeRustMat = new THREE.MeshStandardMaterial({ color: 0x3b261d, roughness: 0.82, metalness: 0.48 });

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, 0.14), darkMetalMat);
    doorFrame.position.set(-2.35, 0.05, -4.34);
    this.envGroup.add(doorFrame);

    const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.68, 0.08), rustSteelMat);
    doorSlab.position.set(-2.35, 0.0, -4.3);
    this.envGroup.add(doorSlab);

    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.1), darkMetalMat);
    doorHandle.position.set(-1.86, -0.05, -4.23);
    this.envGroup.add(doorHandle);

    // Iron ventilation grate on back-right wall (InstancedMesh bars = 1 draw call)
    const grateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.08), darkMetalMat);
    grateFrame.position.set(2.25, 1.55, -4.35);
    this.envGroup.add(grateFrame);
    const barGeo = new THREE.BoxGeometry(0.035, 0.56, 0.1);
    const grateBars = new THREE.InstancedMesh(barGeo, rustSteelMat, 7);
    for (let b = 0; b < 7; b++) {
      _deckDummy.position.set(2.25 + (b - 3) * 0.12, 1.55, -4.32);
      _deckDummy.rotation.set(0, 0, 0);
      _deckDummy.scale.set(1, 1, 1);
      _deckDummy.updateMatrix();
      grateBars.setMatrixAt(b, _deckDummy.matrix);
    }
    grateBars.computeBoundingSphere();
    this.envGroup.add(grateBars);

    // Rusty industrial pipes along back wall & upper corners
    const hPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9.6, 10), pipeRustMat);
    hPipe.rotation.z = Math.PI / 2;
    hPipe.position.set(0, 2.55, -4.24);
    this.envGroup.add(hPipe);

    const vPipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 6.0, 10), pipeRustMat);
    vPipeL.position.set(-3.95, 1.2, -4.2);
    this.envGroup.add(vPipeL);

    const vPipeR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.0, 10), darkMetalMat);
    vPipeR.position.set(3.85, 1.2, -4.22);
    this.envGroup.add(vPipeR);

    // Hanging cables on wall sides
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 });
    [-3.1, 3.2].forEach((wx, idx) => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8 + idx * 0.4, 5), wireMat);
      wire.position.set(wx, 2.1, -4.18);
      wire.rotation.z = idx === 0 ? 0.08 : -0.1;
      this.envGroup.add(wire);
    });
  }

  private buildLightEnvironment(): void {
    this.scene.background = new THREE.Color(0xc5e1f5);
    this.scene.fog = new THREE.FogExp2(0xc5e1f5, 0.016);
    this.scene.environmentIntensity = 0.72;

    const hemi = new THREE.HemisphereLight(0xf3f7ff, 0x6b7c54, 0.86);
    this.envGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeed0, 1.42);
    sun.position.set(5.2, 8.8, 4.6);
    sun.castShadow = !this.isSoftwareGl && this.graphicsQuality !== 'low';
    const shadowRes = this.graphicsQuality === 'high' ? 1024 : 512;
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    sun.shadow.camera.left = -4.5;
    sun.shadow.camera.right = 4.5;
    sun.shadow.camera.top = 4.5;
    sun.shadow.camera.bottom = -4.5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 22;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.activeShadowLight = sun;
    this.envGroup.add(sun);

    // Gentle warm frontal bounce so Friendly Mode faces read clearly without forehead glare
    const faceFill = new THREE.DirectionalLight(0xffe6cc, 0.32);
    faceFill.position.set(-2.4, 2.2, 4.2);
    this.envGroup.add(faceFill);

    // Cool silver moonlight rim (fades in smoothly during Unknown match night transition)
    const moonLight = new THREE.DirectionalLight(0x9ec5ff, 0);
    moonLight.position.set(5.5, 6.2, -9.5);
    this.envGroup.add(moonLight);

    // Warm tabletop lantern light above the chessboard (tight radius so night meadow stays dark & moody)
    const nightTableLight = new THREE.PointLight(0xffcb80, 0, 5.8, 1.7);
    nightTableLight.position.set(0, 1.9, 0.15);
    this.envGroup.add(nightTableLight);

    // 3D Sun disk + soft atmospheric halo on sky arc (descends behind distant hills on sunset)
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff6cc,
      transparent: true,
      opacity: 1,
      fog: false,
      depthWrite: false,
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12), sunMat);
    sunMesh.position.set(-14.5, 2.75, -40);
    this.envGroup.add(sunMesh);

    const sunHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.34,
      fog: false,
      depthWrite: false,
    });
    const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(3.3, 16, 12), sunHaloMat);
    sunHalo.position.set(-14.5, 2.75, -40.25);
    this.envGroup.add(sunHalo);

    // 3D Moon sphere + cool silver halo (rises smoothly behind Unknown's silhouette at night)
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xeef5ff,
      emissive: 0xd6e6ff,
      emissiveIntensity: 0,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.55, 20, 16), moonMat);
    moonMesh.position.set(13.5, -1.4, -38);
    moonMesh.visible = false;
    this.envGroup.add(moonMesh);

    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0x9ec5ff,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const moonHalo = new THREE.Mesh(new THREE.SphereGeometry(2.85, 16, 12), moonHaloMat);
    moonHalo.position.set(13.5, -1.4, -38.25);
    moonHalo.visible = false;
    this.envGroup.add(moonHalo);

    // Lightweight starfield (~220 stars across upper night dome & horizon sky behind Unknown, 1 draw call)
    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      if (i < 150) {
        const u = ((i * 0.6180339887) % 1) * 2 - 1;
        const v = (i * 0.3819660113 + (i % 7) * 0.13) % 1;
        starPositions[i * 3] = u * 34;
        starPositions[i * 3 + 1] = -0.35 + v * 5.2;
        starPositions[i * 3 + 2] = -39 - (i % 8) * 1.8;
      } else {
        const phi = (i * 2.39996) % (Math.PI * 2);
        const elev = 0.04 + ((i * 0.314159) % 1) * 1.05;
        const rad = 46;
        starPositions[i * 3] = Math.cos(phi) * Math.cos(elev) * rad;
        starPositions[i * 3 + 1] = Math.sin(elev) * rad;
        starPositions[i * 3 + 2] = Math.sin(phi) * Math.cos(elev) * rad;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf0f6ff,
      size: 0.28,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const starsPoints = new THREE.Points(starGeo, starMat);
    starsPoints.visible = false;
    this.envGroup.add(starsPoints);

    // Rolling sunny meadow terrain with low gentle outer hills so open sky & horizon remain clearly visible
    const grassGeo = new THREE.PlaneGeometry(120, 120, 28, 28);
    const pos = grassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.hypot(x, y);
      if (dist > 6.5) {
        const swell = Math.sin(x * 0.12) * Math.cos(y * 0.11) * 0.55;
        // Keep northern horizon (-Z -> plane +Y after -PI/2 X-rotation) open so sunset, moon & stars shine through
        const rimHill = dist > 30 && y < 6 ? (dist - 30) * 0.04 : 0;
        pos.setZ(i, swell + rimHill);
      }
    }
    grassGeo.computeVertexNormals();
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x67944c, roughness: 0.92, metalness: 0.0 });
    const ground = new THREE.Mesh(grassGeo, grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.45;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Distant horizon hills (low gentle silhouettes framing the open sky behind the meadow)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x568448, roughness: 0.95 });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rad = 26 + (i % 3) * 5;
      const sinA = Math.sin(ang);
      // Keep hills directly behind opponent (-Z) extra low so sun, moon, and stars frame Unknown's silhouette
      const isBackHorizon = sinA < -0.35;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(8.5 + (i % 3) * 2.0, 14, 10), hillMat);
      hill.scale.set(1.85, isBackHorizon ? 0.16 : 0.34, 1.15);
      hill.position.set(Math.cos(ang) * rad, isBackHorizon ? -2.05 : -1.85, sinA * rad);
      hill.rotation.y = ang;
      this.envGroup.add(hill);
    }

    // Ring of stylized 2-tier low-poly trees around meadow perimeter via InstancedMesh
    const treeCount = 26;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3f28, roughness: 0.9 });
    const canopyGeo = new THREE.ConeGeometry(1.38, 2.45, 7);
    const topCanopyGeo = new THREE.ConeGeometry(0.95, 2.0, 7);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x457439, roughness: 0.85 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    const topCanopies = new THREE.InstancedMesh(topCanopyGeo, canopyMat, treeCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.14;
      const rad = 10.5 + (i % 5) * 3.8;
      const scale = 0.85 + ((i * 7) % 10) * 0.045;
      dummy.position.set(Math.cos(ang) * rad, -1.45 + 1.1 * scale, Math.sin(ang) * rad);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.y = -1.45 + 2.75 * scale;
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);

      dummy.position.y = -1.45 + 4.05 * scale;
      dummy.updateMatrix();
      topCanopies.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.28 + (i % 4) * 0.015, 0.36, 0.34 + (i % 3) * 0.04);
      canopies.setColorAt(i, tint);
      topCanopies.setColorAt(i, tint);
    }
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
    topCanopies.computeBoundingSphere();
    this.envGroup.add(trunks, canopies, topCanopies);

    // Round foliage bushes scattered in mid-distance
    const bushCount = 18;
    const bushGeo = new THREE.DodecahedronGeometry(0.62, 0);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x4f8441, roughness: 0.88 });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
    for (let i = 0; i < bushCount; i++) {
      const ang = (i / bushCount) * Math.PI * 2 + 0.28;
      const rad = 7.2 + (i % 4) * 2.1;
      const s = 0.75 + (i % 3) * 0.25;
      dummy.position.set(Math.cos(ang) * rad, -1.18, Math.sin(ang) * rad);
      dummy.scale.set(s * 1.2, s * 0.78, s);
      dummy.rotation.set(0, ang, 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
    }
    bushes.computeBoundingSphere();
    this.envGroup.add(bushes);

    // Instanced grass tufts & wildflowers in the sunny meadow
    const bladeCount = 220;
    const bladeGeo = new THREE.ConeGeometry(0.055, 0.28, 3);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5c8b43, roughness: 0.9 });
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    for (let i = 0; i < bladeCount; i++) {
      const ang = i * 2.39996;
      const rad = 3.1 + ((i * 17) % 100) * 0.095;
      dummy.position.set(Math.cos(ang) * rad, -1.32, Math.sin(ang) * rad);
      dummy.rotation.set(((i % 5) - 2) * 0.08, ang, ((i % 3) - 1) * 0.08);
      const s = 0.7 + (i % 4) * 0.2;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      blades.setMatrixAt(i, dummy.matrix);
    }
    blades.computeBoundingSphere();
    this.envGroup.add(blades);

    const flowerCount = 68;
    const flowerGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    const palette = [0xfacc15, 0xfef3c7, 0xf472b6, 0xc084fc];
    for (let i = 0; i < flowerCount; i++) {
      const ang = i * 2.39996 + 0.5;
      const rad = 3.3 + ((i * 29) % 90) * 0.09;
      dummy.position.set(Math.cos(ang) * rad, -1.24, Math.sin(ang) * rad);
      dummy.scale.set(1, 0.65, 1);
      dummy.rotation.set(0, ang, 0);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      tint.setHex(palette[i % palette.length]);
      flowers.setColorAt(i, tint);
    }
    flowers.computeBoundingSphere();
    this.envGroup.add(flowers);

    // Soft drifting sky clouds via single InstancedMesh (21 puffs = 1 draw call)
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.95, metalness: 0.0 });
    const puffGeo = new THREE.SphereGeometry(1.4, 8, 6);
    const cloudInst = new THREE.InstancedMesh(puffGeo, cloudMat, 21);
    let puffIdx = 0;
    for (let c = 0; c < 7; c++) {
      const baseX = (c - 3) * 8.5;
      const baseZ = -21 - (c % 3) * 5;
      const baseY = 5.4 + (c % 3) * 1.4;
      const speed = 0.35 + (c % 3) * 0.12;
      [-1.3, 0, 1.4].forEach((ox, k) => {
        const s = 1 - k * 0.1;
        const entry = {
          x: baseX + ox,
          y: baseY + (k === 1 ? 0.35 : 0),
          z: baseZ + (k % 2) * 0.4,
          sx: 1.45 * s,
          sy: 0.56 * s,
          sz: 0.95 * s,
          speed,
        };
        this.cloudEntries.push(entry);
        _deckDummy.position.set(entry.x, entry.y, entry.z);
        _deckDummy.rotation.set(0, 0, 0);
        _deckDummy.scale.set(entry.sx, entry.sy, entry.sz);
        _deckDummy.updateMatrix();
        cloudInst.setMatrixAt(puffIdx++, _deckDummy.matrix);
      });
    }
    cloudInst.computeBoundingSphere();
    this.cloudInstanced = cloudInst;
    this.envGroup.add(cloudInst);

    this.lightAtmosphere = {
      hemiLight: hemi,
      sunLight: sun,
      faceFillLight: faceFill,
      moonLight,
      nightTableLight,
      sunMesh,
      sunHalo,
      moonMesh,
      moonHalo,
      starsPoints,
      cloudMat,
    };
  }

  private buildTableAndBoardInto(boardStaticGroup: THREE.Group, mode: GameMode, bank: MaterialBank): void {
    // Wooden table surface (top at y = 0)
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 3.3), bank.tableTop);
    tableTop.position.set(0, -0.08, 0);
    tableTop.receiveShadow = true;
    this.envGroup.add(tableTop);

    // Table legs (zero shadow casting needed beneath table)
    const legGeo = new THREE.BoxGeometry(0.18, 1.38, 0.18);
    [
      [-1.95, -1.4],
      [1.95, -1.4],
      [-1.95, 1.4],
      [1.95, 1.4],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, bank.boardFrame);
      leg.position.set(lx, -0.85, lz);
      this.envGroup.add(leg);
    });

    // Picnic benches on both sides in Light mode
    if (mode === 'light') {
      const benchGeo = new THREE.BoxGeometry(2.3, 0.12, 0.65);
      [-2.05, 2.05].forEach((bz) => {
        const bench = new THREE.Mesh(benchGeo, bank.boardFrame);
        bench.position.set(0, -0.68, bz);
        bench.receiveShadow = true;
        this.envGroup.add(bench);
      });
    }

    // Chessboard Base & Frame (inside boardStaticGroup -> boardPivot so it smoothly rotates 180° on Reverse!)
    this.boardPivot.position.set(0, 0.0, 0);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_SPAN + 0.28, 0.07, BOARD_SPAN + 0.28),
      bank.boardFrame,
    );
    frame.position.y = 0.035;
    frame.receiveShadow = true;
    frame.castShadow = true;
    boardStaticGroup.add(frame);

    // 64 Squares batched via InstancedMesh (light/dark) + up to 4 blood-stained squares in Survival Mode
    const sqGeo = new THREE.BoxGeometry(SQ_SIZE, 0.02, SQ_SIZE);
    const isSurv = mode === 'survival';

    const lightPositions: { x: number; z: number }[] = [];
    const darkPositions: { x: number; z: number }[] = [];

    for (let sq = 0; sq < 64; sq++) {
      const r = sqRow(sq);
      const c = sqCol(sq);
      const isLight = (r + c) % 2 === 1;
      const { x, z } = squareToLocalPos(sq);

      if (isSurv && SURVIVAL_BLOOD_SQUARES.has(sq)) {
        const tileMat = isLight
          ? (bank.woodLightBlood ?? bank.woodLight)
          : (bank.woodDarkBlood ?? bank.woodDark);
        const tile = new THREE.Mesh(sqGeo, tileMat);
        tile.position.set(x, 0.07, z);
        tile.receiveShadow = true;
        boardStaticGroup.add(tile);
      } else if (isLight) {
        lightPositions.push({ x, z });
      } else {
        darkPositions.push({ x, z });
      }
    }

    const addInstancedTiles = (coords: { x: number; z: number }[], mat: THREE.Material) => {
      if (coords.length === 0) return;
      const inst = new THREE.InstancedMesh(sqGeo, mat, coords.length);
      inst.receiveShadow = true;
      coords.forEach((pt, idx) => {
        _deckDummy.position.set(pt.x, 0.07, pt.z);
        _deckDummy.rotation.set(0, 0, 0);
        _deckDummy.scale.set(1, 1, 1);
        _deckDummy.updateMatrix();
        inst.setMatrixAt(idx, _deckDummy.matrix);
      });
      inst.computeBoundingSphere();
      boardStaticGroup.add(inst);
    };
    addInstancedTiles(lightPositions, bank.woodLight);
    addInstancedTiles(darkPositions, bank.woodDark);
  }

  private buildPropsInto(
    propsGroup: THREE.Group,
    mode: GameMode,
    bank: MaterialBank,
  ): {
    deckInstanced: THREE.InstancedMesh;
    deckBaseMatrices: THREE.Matrix4[];
    deckBasePos: { x: number; y: number; z: number; rotY: number }[];
    deckOutlineMesh: THREE.Mesh;
    playerHands: { left: THREE.Group; right: THREE.Group };
    revolverRig?: RevolverRig;
    coinMesh?: THREE.Group;
    hpMonitor?: HpMonitorRig;
    dealerRig?: CharacterRigController;
    lightClock?: LightClockRig;
    lightNpcRigs?: Map<LightPreviewAvatar, CharacterRigController>;
  } {
    // Card Deck Stack batched as 1 InstancedMesh (18 layers = 1 draw call!)
    const deckBaseX = 1.56;
    const deckBaseZ = 0.22;
    const cardGeo = new THREE.BoxGeometry(0.32, 0.0045, 0.46);
    const deckInst = new THREE.InstancedMesh(cardGeo, bank.cardBack, 18);
    deckInst.castShadow = true;
    deckInst.receiveShadow = true;
    const deckBaseMatrices: THREE.Matrix4[] = [];
    const deckBasePos: { x: number; y: number; z: number; rotY: number }[] = [];

    for (let i = 0; i < 18; i++) {
      const jitterX = Math.sin(i * 2.17) * 0.006;
      const jitterZ = Math.cos(i * 3.11) * 0.007;
      const px = deckBaseX + jitterX;
      const py = 0.004 + i * 0.0052;
      const pz = deckBaseZ + jitterZ;
      const rotY = Math.sin(i * 1.73) * 0.036;
      deckBasePos.push({ x: px, y: py, z: pz, rotY });

      _deckDummy.position.set(px, py, pz);
      _deckDummy.rotation.set(0, rotY, 0);
      _deckDummy.scale.set(1, 1, 1);
      _deckDummy.updateMatrix();
      deckInst.setMatrixAt(i, _deckDummy.matrix);
      deckBaseMatrices.push(_deckDummy.matrix.clone());
    }
    deckInst.computeBoundingSphere();
    propsGroup.add(deckInst);

    // Soft pulsing outline halo around deck stack when player can draw
    const outlineMat = new THREE.MeshBasicMaterial({
      color: mode === 'survival' ? 0xf59e0b : 0x16a34a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outlineMesh = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.32, 4), outlineMat);
    outlineMesh.rotation.x = -Math.PI / 2;
    outlineMesh.rotation.z = Math.PI / 4;
    outlineMesh.scale.set(0.92, 1.28, 1);
    outlineMesh.position.set(deckBaseX, 0.014, deckBaseZ);
    propsGroup.add(outlineMesh);

    // Side Graveyard trays shifted cleanly to far left so inner left table flank stays open for Revolver & Dealer hand
    [-0.55, 0.55].forEach((gz) => {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.025, 0.84), bank.boardFrame);
      tray.position.set(-1.94, 0.012, gz);
      tray.receiveShadow = true;
      propsGroup.add(tray);
    });

    let revolverRig: RevolverRig | undefined;
    let coinMesh: THREE.Group | undefined;
    let hpMonitor: HpMonitorRig | undefined;
    let dealerRig: CharacterRigController | undefined;
    let lightClock: LightClockRig | undefined;
    let lightNpcRigs: Map<LightPreviewAvatar, CharacterRigController> | undefined;

    if (mode === 'survival') {
      revolverRig = assetFactory.createRevolver(bank);
      revolverRig.group.position.copy(_revolverRestPos);
      revolverRig.group.rotation.set(0, 0.42, Math.PI / 2);
      propsGroup.add(revolverRig.group);

      coinMesh = assetFactory.createCoin(bank);
      coinMesh.position.set(1.44, 0.015, 0.74);
      propsGroup.add(coinMesh);

      // CRT Clock + Animated Hearts console angled clearly inside the camera frame, clear of Dealer's left glove
      hpMonitor = buildHpMonitor(this.maxHp);
      hpMonitor.group.position.set(1.66, 0, -0.82);
      hpMonitor.group.rotation.y = -0.52;
      propsGroup.add(hpMonitor.group);

      // Dealer stepped back along -Z so both resting gloves sit cleanly on open wood outside board frame & a8/h8
      dealerRig = assetFactory.createDealer();
      dealerRig.root.position.set(0, -0.44, -2.16);
      dealerRig.root.scale.setScalar(1.32);
      dealerRig.resetPose();
      dealerRig.setDifficulty?.(this.survivalDifficulty);
      propsGroup.add(dealerRig.root);
    } else {
      // Cozy wooden tabletop chess clock placed cleanly on open left wood flanking the board
      lightClock = buildLightTableClock();
      lightClock.group.position.set(-1.54, 0, -0.62);
      lightClock.group.rotation.y = 0.5;
      lightClock.setTime(this.matchElapsedSeconds);
      propsGroup.add(lightClock.group);

      lightNpcRigs = new Map();
      const npc = assetFactory.createLightNpc(this.personality);
      npc.root.position.set(0, -0.48, -1.88);
      npc.root.scale.setScalar(1.32);
      npc.resetPose();
      propsGroup.add(npc.root);
      lightNpcRigs.set(this.personality, npc);
    }

    // Player First-Person Hands anchored neatly near near-left / near-right foreground corners
    const playerHands = assetFactory.createPlayerHands(mode);
    playerHands.left.position.set(-0.88, 0.14, 1.98);
    playerHands.right.position.set(0.88, 0.14, 1.98);
    propsGroup.add(playerHands.left);
    propsGroup.add(playerHands.right);

    return {
      deckInstanced: deckInst,
      deckBaseMatrices,
      deckBasePos,
      deckOutlineMesh: outlineMesh,
      playerHands,
      revolverRig,
      coinMesh,
      hpMonitor,
      dealerRig,
      lightClock,
      lightNpcRigs,
    };
  }

  public syncBoardState(
    board: BoardState,
    playerColor: PieceColor,
    movesLeft: number,
    playerHp: number,
    opponentHp: number,
    deckCount: number,
    lastMovedFromTo?: { from: number; to: number },
  ): void {
    // Rotate board 180° smoothly when player is Black
    this.targetBoardRotationY = playerColor === 'black' ? Math.PI : 0;

    // Update check square highlight
    this.checkSq = null;
    if (board.isInCheck('white')) this.checkSq = board.findKing('white');
    else if (board.isInCheck('black')) this.checkSq = board.findKing('black');

    // Reconcile active pieces on the 64 squares
    const activePieceIds = new Set<number>();
    for (let sq = 0; sq < 64; sq++) {
      const p = board.squares[sq];
      if (!p) continue;
      activePieceIds.add(p.id);
      const { x, z } = squareToLocalPos(sq);
      const targetPos = new THREE.Vector3(x, 0.08, z);

      let mesh = this.pieceMeshes.get(p.id);
      const isOppMovingTarget =
        this.oppMoveAnim.active && lastMovedFromTo !== undefined && sq === lastMovedFromTo.to;

      if (!mesh) {
        mesh = assetFactory.createChessPiece(p.type, p.color, this.bank);
        mesh.position.copy(isOppMovingTarget ? this.oppMoveAnim.fromLocal : targetPos);
        this.piecesGroup.add(mesh);
        this.pieceMeshes.set(p.id, mesh);
        if (isOppMovingTarget) {
          this.oppMoveAnim.pieceId = p.id;
        }
      } else if (isOppMovingTarget) {
        this.oppMoveAnim.pieceId = p.id;
        this.pieceAnimations.delete(p.id);
        mesh.position.copy(this.oppMoveAnim.fromLocal);
      } else if (mesh.position.distanceToSquared(targetPos) > 0.001) {
        this.pieceAnimations.set(p.id, {
          from: mesh.position.clone(),
          to: targetPos,
          elapsed: 0,
          duration: lastMovedFromTo ? 0.34 : 0.24,
        });
      }
    }

    // Remove captured / absent pieces from active board & dispose unused wrapper nodes
    for (const [id, mesh] of this.pieceMeshes.entries()) {
      if (!activePieceIds.has(id)) {
        this.piecesGroup.remove(mesh);
        disposeObjectSubtree(mesh);
        this.pieceMeshes.delete(id);
        this.pieceAnimations.delete(id);
      }
    }

    // Rebuild physical graveyard display along left trays
    this.clearGroup(this.graveyardGroup);
    const placeGrave = (list: { type: PieceType; color: PieceColor }[], zStart: number, zDir: number) => {
      list.slice(0, 10).forEach((gp, idx) => {
        const gm = assetFactory.createChessPiece(gp.type, gp.color, this.bank);
        gm.scale.setScalar(0.56);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        gm.position.set(-2.02 + col * 0.16, 0.025, zStart + row * 0.16 * zDir);
        this.graveyardGroup.add(gm);
      });
    };
    placeGrave(board.graveyard.white, 0.25, 1);
    placeGrave(board.graveyard.black, -0.25, -1);

    // Update diegetic moves remaining pips
    this.movesRemainingDots.forEach((pip, idx) => {
      const mat = pip.material as THREE.MeshStandardMaterial;
      if (idx < movesLeft) {
        mat.color.setHex(this.mode === 'survival' ? 0xf59e0b : 0x22c55e);
        mat.emissive.setHex(this.mode === 'survival' ? 0xd97706 : 0x16a34a);
        mat.emissiveIntensity = 1.6;
      } else {
        mat.color.setHex(0x333333);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // Update diegetic 3D CRT console hearts & clock (automatically triggers 0.62s CRT heart-loss animation on HP drop)
    if (this.hpMonitor) {
      this.hpMonitor.setState({
        maxHp: this.maxHp,
        playerHp,
        opponentHp,
        elapsedSeconds: this.matchElapsedSeconds,
        opponentLabel: this.onlineOpponentName ?? 'DEALER',
      });
    }

    // Show deck thickness proportional to cards remaining via InstancedMesh.count
    if (this.deckInstanced) {
      const visibleLayers = Math.max(1, Math.min(18, Math.ceil((deckCount / 40) * 18)));
      this.visibleDeckTopIdx = visibleLayers - 1;
      this.deckInstanced.count = visibleLayers;
      this.lastAppliedTopIdx = -1;
    }

    this.refreshSquareHighlights();
    this.renderer.render(this.scene, this.camera);
  }

  public setHighlights(selectedSq: number | null, legalTargets: number[]): void {
    this.selectedSq = selectedSq;
    this.legalTargetSqs = new Set(legalTargets);
    this.refreshSquareHighlights();
    this.renderer.render(this.scene, this.camera);
  }

  private refreshSquareHighlights(): void {
    const isSurv = this.mode === 'survival';
    for (let sq = 0; sq < 64; sq++) {
      const hl = this.squareHighlights[sq];
      if (!hl) continue;
      const mat = hl.material as THREE.MeshBasicMaterial;

      if (this.checkSq === sq) {
        mat.color.setHex(0xdc2626);
        mat.opacity = 0.62;
      } else if (this.selectedSq === sq) {
        mat.color.setHex(isSurv ? 0xf59e0b : 0x2563eb);
        mat.opacity = 0.55;
      } else if (this.legalTargetSqs.has(sq)) {
        mat.color.setHex(isSurv ? 0xd97706 : 0x16a34a);
        mat.opacity = this.hoveredSq === sq ? 0.65 : 0.42;
      } else if (this.hoveredSq === sq && !this.canDrawDeck) {
        mat.color.setHex(0xffffff);
        mat.opacity = 0.22;
      } else {
        mat.opacity = 0;
      }
    }
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
  }

  public triggerCardReveal(card: CardType, actor: MatchActor): void {
    if (this.revealCardMesh) {
      this.transientGroup.remove(this.revealCardMesh);
      disposeObjectSubtree(this.revealCardMesh);
      this.revealCardMesh = null;
    }

    const faceMat = getCardFaceMaterial(card, this.mode);
    const cardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.54), [
      this.bank.cardBack,
      this.bank.cardBack,
      faceMat,
      this.bank.cardBack,
      this.bank.cardBack,
      this.bank.cardBack,
    ]);
    cardMesh.castShadow = true;

    this.revealCardStart.set(1.56, 0.14, 0.22);
    if (actor === 'player') {
      this.revealCardEnd.set(0.18, 1.05, 1.28);
      this.playerHandAction = { active: true, elapsed: 0, duration: 0.88 };
    } else {
      this.revealCardEnd.set(0.0, 1.15, -0.55);
      this.oppCardAnim = {
        active: true,
        elapsed: 0,
        duration: 0.96,
      };
    }

    cardMesh.position.copy(this.revealCardStart);
    this.transientGroup.add(cardMesh);
    this.revealCardMesh = cardMesh;
    this.revealCardTimer = this.revealCardDuration;
  }

  public triggerCoinFlip(result: CoinSide, thrower: MatchActor = 'opponent'): void {
    _coinFocusPos.set(1.44, 0.015, 0.74);
    this.coinAnim = {
      active: true,
      elapsed: 0,
      duration: 4.35,
      result,
      thrower,
      slammed: false,
    };
  }

  public triggerRevolverShot(target: MatchActor): void {
    const baseCyl = this.revolverRig ? this.revolverRig.cylinderPivot.rotation.z : 0;
    this.revolverAnim = {
      active: true,
      elapsed: 0,
      duration: target === 'player' ? 2.9 : 2.75,
      target,
      cocked: false,
      fired: false,
      baseCylRot: baseCyl,
    };
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsedTime += dt;
    const t = now * 0.001;

    // 0. Optional lightweight FPS sampling (2 Hz throttled, never 60 Hz React re-renders)
    if (this.showFps && this.callbacks.onFpsSample) {
      this.fpsFrames++;
      this.fpsAccumSec += dt;
      if (this.fpsAccumSec >= 0.5) {
        this.callbacks.onFpsSample(Math.round(this.fpsFrames / this.fpsAccumSec));
        this.fpsFrames = 0;
        this.fpsAccumSec = 0;
      }
    }

    // 0b. Smart dirty-flagged & phase-gated raycasting
    if (this.interactiveRaycastEnabled && this.pointerDirty) {
      this.pointerDirty = false;
      this.processHoverRaycast();
    }

    // 1. Board 180-degree rotation damping
    const rotDiff = this.targetBoardRotationY - this.boardPivot.rotation.y;
    this.boardPivot.rotation.y += rotDiff * (1 - Math.exp(-7.5 * dt));

    // 2. Active piece arc-hop animations
    for (const [id, anim] of this.pieceAnimations.entries()) {
      const mesh = this.pieceMeshes.get(id);
      if (!mesh) {
        this.pieceAnimations.delete(id);
        continue;
      }
      anim.elapsed += dt;
      const p = Math.min(1, anim.elapsed / anim.duration);
      const ease = 1 - Math.pow(1 - p, 3);
      mesh.position.lerpVectors(anim.from, anim.to, ease);
      mesh.position.y += Math.sin(p * Math.PI) * 0.28;
      if (p >= 1) {
        mesh.position.copy(anim.to);
        this.pieceAnimations.delete(id);
      }
    }

    // 3. Deck hover top-card lift (only updates InstancedMesh top matrix when changed) & pulsing glow outline
    const desiredLift = this.canDrawDeck && this.hoveredDeck ? 0.045 : 0;
    this.deckHoverLift = THREE.MathUtils.damp(this.deckHoverLift, desiredLift, 12, dt);
    if (this.deckInstanced && this.deckBasePos.length > 0) {
      const topIdx = this.visibleDeckTopIdx;
      const liftChanged = Math.abs(this.deckHoverLift - this.lastAppliedDeckLift) > 0.0002;
      if (topIdx !== this.lastAppliedTopIdx || liftChanged) {
        if (this.lastAppliedTopIdx >= 0 && this.lastAppliedTopIdx !== topIdx && this.deckBaseMatrices[this.lastAppliedTopIdx]) {
          this.deckInstanced.setMatrixAt(this.lastAppliedTopIdx, this.deckBaseMatrices[this.lastAppliedTopIdx]);
        }
        const base = this.deckBasePos[topIdx];
        if (base) {
          _deckDummy.position.set(base.x, base.y + this.deckHoverLift, base.z);
          _deckDummy.rotation.set(0, base.rotY, 0);
          _deckDummy.scale.set(1, 1, 1);
          _deckDummy.updateMatrix();
          this.deckInstanced.setMatrixAt(topIdx, _deckDummy.matrix);
        }
        this.deckInstanced.instanceMatrix.needsUpdate = true;
        this.lastAppliedTopIdx = topIdx;
        this.lastAppliedDeckLift = this.deckHoverLift;
      }
    }
    if (this.deckOutlineMesh) {
      const oMat = this.deckOutlineMesh.material as THREE.MeshBasicMaterial;
      const targetOp = this.canDrawDeck
        ? this.hoveredDeck
          ? 0.85
          : 0.24 + 0.14 * Math.sin(t * 4.2)
        : 0;
      oMat.opacity = THREE.MathUtils.damp(oMat.opacity, targetOp, 10, dt);
    }

    // 4. Floating Card reveal animation (upright anti-glare angle facing camera cleanly)
    if (this.revealCardMesh && this.revealCardTimer > 0) {
      this.revealCardTimer -= dt;
      const prog = 1 - Math.max(0, this.revealCardTimer / this.revealCardDuration);
      if (prog < 0.35) {
        const k = prog / 0.35;
        this.revealCardMesh.position.lerpVectors(this.revealCardStart, this.revealCardEnd, k);
        this.revealCardMesh.rotation.x = THREE.MathUtils.lerp(0, 1.18, k);
        this.revealCardMesh.rotation.y = THREE.MathUtils.lerp(0, -0.06, k);
      } else if (prog < 0.85) {
        this.revealCardMesh.position.copy(this.revealCardEnd);
        this.revealCardMesh.rotation.x = 1.18;
        this.revealCardMesh.rotation.y = -0.06;
      } else {
        const k = (prog - 0.85) / 0.15;
        this.revealCardMesh.position.y -= dt * 1.8;
        this.revealCardMesh.scale.setScalar(Math.max(0.01, 1 - k));
      }
      if (this.revealCardTimer <= 0) {
        this.transientGroup.remove(this.revealCardMesh);
        disposeObjectSubtree(this.revealCardMesh);
        this.revealCardMesh = null;
      }
    }

    // 5. Opponent IK Choreography (chess piece pickup/carry, resurrection reach, card draw) + Player Hands
    const coinFlipActive = this.coinAnim.active;
    const revActive = this.revolverAnim.active;
    const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

    if (this.opponentRig) {
      // 5a. Opponent 3-stage Chess Move with guaranteed King-clearance flight arcs (CLEARANCE_Y >= 0.92)
      const CLEARANCE_Y = 0.92;
      const RIGHT_REST_X = -1.56;
      const RIGHT_REST_Z = -1.1;
      const LEFT_REST_X = 1.42;
      const LEFT_REST_Z = -1.44;

      if (this.oppMoveAnim.active) {
        const m = this.oppMoveAnim;
        m.elapsed += dt;
        const e = m.elapsed;
        const carryEnd = m.approachDur + m.carryDur;
        const totalDur = carryEnd + m.returnDur;

        if (e < m.approachDur) {
          // Rise cleanly above all chess pieces first, cruise horizontally at CLEARANCE_Y, then descend onto piece
          const u = THREE.MathUtils.clamp(e / m.approachDur, 0, 1);
          const k = easeInOut(u);
          let targetX = m.fromWorld.x;
          let targetZ = m.fromWorld.z;
          let targetY = CLEARANCE_Y;
          if (u < 0.25) {
            const up = easeInOut(u / 0.25);
            targetX = THREE.MathUtils.lerp(RIGHT_REST_X, m.fromWorld.x, up * 0.2);
            targetZ = THREE.MathUtils.lerp(RIGHT_REST_Z, m.fromWorld.z, up * 0.2);
            targetY = THREE.MathUtils.lerp(0.08, CLEARANCE_Y, up);
          } else if (u < 0.75) {
            const fly = easeInOut((u - 0.25) / 0.5);
            targetX = THREE.MathUtils.lerp(RIGHT_REST_X, m.fromWorld.x, 0.2 + fly * 0.8);
            targetZ = THREE.MathUtils.lerp(RIGHT_REST_Z, m.fromWorld.z, 0.2 + fly * 0.8);
            targetY = CLEARANCE_Y + Math.sin(fly * Math.PI) * 0.08;
          } else {
            const down = easeInOut((u - 0.75) / 0.25);
            targetY = THREE.MathUtils.lerp(CLEARANCE_Y, 0.34, down);
          }
          _handTargetWorld.set(targetX, targetY, targetZ);
          this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
          if (k >= 0.88 && !m.gripped) {
            m.gripped = true;
            this.opponentRig.setHandGrip('right', true);
          }
        } else if (e < carryEnd) {
          if (!m.gripped) {
            m.gripped = true;
            this.opponentRig.setHandGrip('right', true);
          }
          const u = THREE.MathUtils.clamp((e - m.approachDur) / m.carryDur, 0, 1);
          const k = easeInOut(u);
          const lift = Math.sin(k * Math.PI) * 0.58;
          _handTargetWorld.lerpVectors(m.fromWorld, m.toWorld, k);
          _handTargetWorld.y = 0.34 + lift;
          this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
        } else {
          if (!m.placed) {
            m.placed = true;
            if (m.pieceId !== null) {
              const pieceMesh = this.pieceMeshes.get(m.pieceId);
              if (pieceMesh) {
                pieceMesh.position.copy(m.toLocal);
              }
            }
            soundManager.playPieceMove(m.isCapture);
            this.opponentRig.setHandGrip('right', false);
          }
          // High return arc back over all standing pieces to clear wood outside board
          const u = THREE.MathUtils.clamp((e - carryEnd) / Math.max(0.05, m.returnDur), 0, 1);
          if (u < 0.32) {
            const up = easeInOut(u / 0.32);
            _handTargetWorld.set(
              THREE.MathUtils.lerp(m.toWorld.x, RIGHT_REST_X, up * 0.15),
              THREE.MathUtils.lerp(0.36, CLEARANCE_Y, up),
              THREE.MathUtils.lerp(m.toWorld.z, RIGHT_REST_Z, up * 0.15),
            );
            this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
          } else if (u < 0.78) {
            const fly = easeInOut((u - 0.32) / 0.46);
            _handTargetWorld.set(
              THREE.MathUtils.lerp(m.toWorld.x, RIGHT_REST_X, 0.15 + fly * 0.85),
              CLEARANCE_Y + Math.sin(fly * Math.PI) * 0.06,
              THREE.MathUtils.lerp(m.toWorld.z, RIGHT_REST_Z, 0.15 + fly * 0.85),
            );
            this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
          } else {
            this.opponentRig.setHandTarget('right', null, 0);
          }
          if (e >= totalDur) {
            this.opponentRig.setHandTarget('right', null, 0);
            m.active = false;
          }
        }
      } else if (this.oppReachAnim.active) {
        // 5b. Opponent single-square placement reach (e.g. +2/+4 resurrection) with high clearance arc
        const r = this.oppReachAnim;
        r.elapsed += dt;
        const e = r.elapsed;
        const holdEnd = r.approachDur + r.holdDur;
        const totalDur = holdEnd + r.returnDur;

        if (e < r.approachDur) {
          const u = THREE.MathUtils.clamp(e / r.approachDur, 0, 1);
          if (u < 0.7) {
            const fly = easeInOut(u / 0.7);
            _handTargetWorld.set(
              THREE.MathUtils.lerp(RIGHT_REST_X, r.targetWorld.x, fly),
              THREE.MathUtils.lerp(0.18, CLEARANCE_Y, Math.min(1, fly * 1.5)),
              THREE.MathUtils.lerp(RIGHT_REST_Z, r.targetWorld.z, fly),
            );
          } else {
            const down = easeInOut((u - 0.7) / 0.3);
            _handTargetWorld.set(
              r.targetWorld.x,
              THREE.MathUtils.lerp(CLEARANCE_Y, r.targetWorld.y + 0.14, down),
              r.targetWorld.z,
            );
          }
          this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
          if (u >= 0.82 && !r.gripped) {
            r.gripped = true;
            this.opponentRig.setHandGrip('right', true);
          }
        } else if (e < holdEnd) {
          _handTargetWorld.set(r.targetWorld.x, r.targetWorld.y + 0.12, r.targetWorld.z);
          this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
        } else {
          if (r.gripped) {
            r.gripped = false;
            this.opponentRig.setHandGrip('right', false);
          }
          const u = THREE.MathUtils.clamp((e - holdEnd) / Math.max(0.05, r.returnDur), 0, 1);
          if (u < 0.75) {
            const back = easeInOut(u / 0.75);
            _handTargetWorld.set(
              THREE.MathUtils.lerp(r.targetWorld.x, RIGHT_REST_X, back),
              CLEARANCE_Y,
              THREE.MathUtils.lerp(r.targetWorld.z, RIGHT_REST_Z, back),
            );
            this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
          } else {
            this.opponentRig.setHandTarget('right', null, 0);
          }
          if (e >= totalDur) {
            this.opponentRig.setHandTarget('right', null, 0);
            r.active = false;
          }
        }
      }

      // 5c. Opponent Card Draw reach (deck on +X -> opponent's left arm, sweeping cleanly above pieces & monitor)
      if (this.oppCardAnim.active) {
        this.oppCardAnim.elapsed += dt;
        const e = this.oppCardAnim.elapsed;
        if (e < 0.32) {
          const u = THREE.MathUtils.clamp(e / 0.32, 0, 1);
          const k = easeInOut(u);
          _handTargetWorld.set(
            THREE.MathUtils.lerp(LEFT_REST_X, 1.56, k),
            THREE.MathUtils.lerp(0.18, 0.28, k) + Math.sin(k * Math.PI) * 0.68,
            THREE.MathUtils.lerp(LEFT_REST_Z, 0.22, k),
          );
          this.opponentRig.setHandTarget('left', _handTargetWorld, 1);
          this.opponentRig.setHandGrip('left', k > 0.78);
        } else if (e < 0.68) {
          const k = easeInOut((e - 0.32) / 0.36);
          _handTargetWorld.set(
            THREE.MathUtils.lerp(1.56, 0.12, k),
            THREE.MathUtils.lerp(0.28, 1.08, k) + Math.sin(k * Math.PI) * 0.18,
            THREE.MathUtils.lerp(0.22, -0.52, k),
          );
          this.opponentRig.setHandTarget('left', _handTargetWorld, 1);
          this.opponentRig.setHandGrip('left', true);
        } else {
          this.opponentRig.setHandGrip('left', false);
          const u = THREE.MathUtils.clamp((e - 0.68) / Math.max(0.05, this.oppCardAnim.duration - 0.68), 0, 1);
          if (u < 0.72) {
            const back = easeInOut(u / 0.72);
            _handTargetWorld.set(
              THREE.MathUtils.lerp(0.12, LEFT_REST_X, back),
              THREE.MathUtils.lerp(1.06, CLEARANCE_Y, back),
              THREE.MathUtils.lerp(-0.52, LEFT_REST_Z, back),
            );
            this.opponentRig.setHandTarget('left', _handTargetWorld, 1);
          } else {
            this.opponentRig.setHandTarget('left', null, 0);
          }
          if (e >= this.oppCardAnim.duration) {
            this.opponentRig.setHandTarget('left', null, 0);
            this.oppCardAnim.active = false;
          }
        }
      }
    }

    // Tick CRT monitor heart-loss animation ONLY while active (0 redraws otherwise)
    if (this.hpMonitor) {
      this.hpMonitor.tick(dt);
    }

    // Player First-Person Hands idle + foreground card draw reach (safe from near-plane clipping)
    if (this.playerHands) {
      const sway = Math.sin(t * 2.0) * 0.009;
      this.playerHands.left.position.y = 0.14 + sway;

      if (this.playerHandAction.active) {
        this.playerHandAction.elapsed += dt;
        if (this.playerHandAction.elapsed >= this.playerHandAction.duration) {
          this.playerHandAction.active = false;
        }
      }

      const playerUsingRightHand =
        (coinFlipActive && this.coinAnim.thrower === 'player') ||
        (revActive && this.revolverAnim.target === 'opponent');

      if (!playerUsingRightHand) {
        let pRx = 0.88;
        let pRy = 0.14 - sway;
        let pRz = 1.98;
        let pPitch = 0;
        let pYaw = 0;
        if (this.playerHandAction.active) {
          const p = this.playerHandAction.elapsed / this.playerHandAction.duration;
          const arc = Math.sin(p * Math.PI);
          pRx = THREE.MathUtils.lerp(0.88, 0.44, arc);
          pRy = THREE.MathUtils.lerp(0.14, 0.56, arc);
          pRz = THREE.MathUtils.lerp(1.98, 1.46, arc);
          pPitch = arc * -0.24;
          pYaw = arc * 0.22;
        }
        this.playerHands.right.position.x = THREE.MathUtils.damp(this.playerHands.right.position.x, pRx, 10, dt);
        this.playerHands.right.position.y = THREE.MathUtils.damp(this.playerHands.right.position.y, pRy, 10, dt);
        this.playerHands.right.position.z = THREE.MathUtils.damp(this.playerHands.right.position.z, pRz, 10, dt);
        this.playerHands.right.rotation.set(
          THREE.MathUtils.damp(this.playerHands.right.rotation.x, pPitch, 10, dt),
          THREE.MathUtils.damp(this.playerHands.right.rotation.y, pYaw, 10, dt),
          THREE.MathUtils.damp(this.playerHands.right.rotation.z, 0, 10, dt),
        );
      }
    }

    // 6. Buckshot-Roulette 5-Phase Coin Flip Choreography (0..4.35s)
    if (this.coinMesh && this.coinAnim.active) {
      this.coinAnim.elapsed += dt;
      const e = Math.min(this.coinAnim.elapsed, this.coinAnim.duration);
      const isOpp = this.coinAnim.thrower === 'opponent';
      const tableX = 1.44;
      const tableY = 0.015;
      const tableZ = 0.74;
      const launchX = isOpp ? 0.62 : 0.72;
      const launchY = isOpp ? 0.92 : 0.86;
      const launchZ = isOpp ? -0.78 : 1.08;
      const finalAngle = this.coinAnim.result === 'heads' ? 0 : Math.PI;

      // Rest world position for the thrower's right palm
      let restWorldX = 0.88;
      let restWorldY = 0.14;
      let restWorldZ = 1.98;
      if (isOpp && this.opponentRig) {
        restWorldX = 1.46;
        restWorldY = 0.058;
        restWorldZ = -0.34;
      }

      let handWX = restWorldX;
      let handWY = restWorldY;
      let handWZ = restWorldZ;
      let handPitch = 0;
      let handRoll = 0;

      if (e < 0.35) {
        // Phase 1a (0.0 - 0.35s): Hand reaches cleanly to the coin on the table
        const k = THREE.MathUtils.smoothstep(e / 0.35, 0, 1);
        handWX = THREE.MathUtils.lerp(restWorldX, tableX, k);
        handWY = THREE.MathUtils.lerp(restWorldY, 0.085, k) + Math.sin(k * Math.PI) * 0.16;
        handWZ = THREE.MathUtils.lerp(restWorldZ, tableZ, k);
        handPitch = THREE.MathUtils.lerp(0, 0.2, k);
        this.coinMesh.position.set(tableX, tableY, tableZ);
        this.coinMesh.rotation.set(0, 0, 0);
      } else if (e < 0.8) {
        // Phase 1b (0.35 - 0.80s): Hand grabs coin and lifts it to chest/eye launch position
        const k = THREE.MathUtils.smoothstep((e - 0.35) / 0.45, 0, 1);
        handWX = THREE.MathUtils.lerp(tableX, launchX, k);
        handWY = THREE.MathUtils.lerp(0.085, launchY, k);
        handWZ = THREE.MathUtils.lerp(tableZ, launchZ, k);
        handPitch = THREE.MathUtils.lerp(0.2, -0.42, k);
        this.coinMesh.position.set(handWX, handWY - 0.03, handWZ);
        this.coinMesh.rotation.set(handPitch * 0.6, 0, 0);
      } else if (e < 2.1) {
        // Phase 2 (0.80 - 2.10s): High arc flip with Buckshot-style slow-mo apex glint
        const u = (e - 0.8) / 1.3;
        const wu = u + (0.68 / (Math.PI * 2)) * Math.sin(Math.PI * 2 * u);
        const cx = THREE.MathUtils.lerp(launchX, tableX, wu);
        const cy = THREE.MathUtils.lerp(launchY, tableY + 0.04, wu) + Math.sin(wu * Math.PI) * 1.48;
        const cz = THREE.MathUtils.lerp(launchZ, tableZ, wu);
        this.coinMesh.position.set(cx, cy, cz);
        this.coinMesh.rotation.set(wu * Math.PI * 2 * 7 + finalAngle, 0, Math.sin(wu * Math.PI) * 0.28);

        if (u < 0.28) {
          const fk = u / 0.28;
          handWX = launchX;
          handWY = launchY + Math.sin(fk * Math.PI) * 0.14;
          handWZ = launchZ;
          handPitch = THREE.MathUtils.lerp(-0.42, -0.78, fk);
        } else {
          const ck = THREE.MathUtils.smoothstep((u - 0.28) / 0.72, 0, 1);
          handWX = THREE.MathUtils.lerp(launchX, tableX, ck);
          handWY = THREE.MathUtils.lerp(launchY, 0.38, ck);
          handWZ = THREE.MathUtils.lerp(launchZ, tableZ, ck);
          handPitch = THREE.MathUtils.lerp(-0.5, 0.1, ck);
        }
      } else if (e < 2.7) {
        // Phase 3 (2.10 - 2.70s): Coin lands; right palm slams sharply down covering coin
        this.coinMesh.position.set(tableX, tableY, tableZ);
        this.coinMesh.rotation.set(finalAngle, 0, 0);

        if (e < 2.35) {
          const sk = Math.pow((e - 2.1) / 0.25, 2.2);
          handWX = tableX;
          handWY = THREE.MathUtils.lerp(0.38, 0.055, sk);
          handWZ = tableZ;
          handPitch = THREE.MathUtils.lerp(0.1, 0.02, sk);
        } else {
          if (!this.coinAnim.slammed) {
            this.coinAnim.slammed = true;
            this.trauma = 0.44;
          }
          handWX = tableX;
          handWY = 0.055;
          handWZ = tableZ;
          handPitch = 0.02;
        }
      } else if (e < 3.4) {
        // Phase 4 (2.70 - 3.40s): 0.7s breathless suspense pause under closed palm
        this.coinMesh.position.set(tableX, tableY, tableZ);
        this.coinMesh.rotation.set(finalAngle, 0, 0);
        handWX = tableX + Math.sin(t * 22) * 0.0018;
        handWY = 0.055;
        handWZ = tableZ + Math.cos(t * 19) * 0.0018;
        handPitch = 0.02;
      } else {
        // Phase 5 (3.40 - 4.35s): Palm slowly lifts aside, exposing Heads/Tails in spotlight
        this.coinMesh.position.set(tableX, tableY, tableZ);
        this.coinMesh.rotation.set(finalAngle, 0, 0);
        const lk = THREE.MathUtils.smoothstep((e - 3.4) / 0.55, 0, 1);
        handWX = THREE.MathUtils.lerp(tableX, restWorldX, lk * 0.75);
        handWY = THREE.MathUtils.lerp(0.055, Math.max(restWorldY, 0.48), lk);
        handWZ = THREE.MathUtils.lerp(tableZ, restWorldZ, lk * 0.75);
        handPitch = THREE.MathUtils.lerp(0.02, -0.18, lk);
        handRoll = THREE.MathUtils.lerp(0, isOpp ? -0.22 : 0.22, lk);
      }

      _coinFocusPos.copy(this.coinMesh.position);

      if (isOpp && this.opponentRig) {
        _handTargetWorld.set(handWX, handWY + 0.18, handWZ);
        this.opponentRig.setHandTarget('left', _handTargetWorld, 1);
        this.opponentRig.setHandGrip('left', e >= 0.32 && e < 0.85);
      } else if (!isOpp && this.playerHands) {
        this.playerHands.right.position.set(handWX, handWY, Math.max(1.38, handWZ + 0.08));
        this.playerHands.right.rotation.set(handPitch, 0, handRoll);
      }

      if (e >= this.coinAnim.duration) {
        this.coinAnim.active = false;
        this.coinMesh.position.set(tableX, tableY, tableZ);
        this.coinMesh.rotation.set(finalAngle, 0, 0);
        if (isOpp && this.opponentRig) {
          this.opponentRig.setHandGrip('left', false);
          this.opponentRig.setHandTarget('left', null, 0);
        }
      }
    }

    // 7. Cinematic 5-Stage Revolver Shot Choreography with Rigid Grip Attachment
    // Scenario A (Dealer -> Player): 2.90s | Scenario B (Player FPS -> Dealer): 2.75s
    if (this.revolverRig && this.revolverAnim.active) {
      this.revolverAnim.elapsed += dt;
      const e = Math.min(this.revolverAnim.elapsed, this.revolverAnim.duration);
      const rev = this.revolverRig;
      const hitPlayer = this.revolverAnim.target === 'player';

      // Spring-damped muzzle flip helper (+28° = 0.49 rad kick with smooth damped settling)
      const springRecoil = (u: number): number => {
        if (u <= 0) return 0;
        if (u < 0.14) {
          return Math.sin((u / 0.14) * (Math.PI * 0.5));
        }
        const decay = Math.exp(-5.2 * (u - 0.14));
        const settle = Math.cos((u - 0.14) * 9.5);
        return Math.max(-0.08, decay * (0.72 + 0.28 * settle));
      };

      const aimX = hitPlayer ? -0.18 : 0.3;
      const aimY = hitPlayer ? 1.04 : 1.1;
      const aimZ = hitPlayer ? -0.52 : 1.24;
      const aimRotY = hitPlayer ? Math.PI - 0.06 : 0.09;
      const aimPitchBase = hitPlayer ? 0.03 : -0.01;

      let gunPitch = 0;
      let gunYaw = 0.42;
      let gunRoll = Math.PI / 2;
      let gripLockedToHand = false;

      if (hitPlayer) {
        // SCENARIO A: Dealer shoots Player (0..2.90s)
        if (e < 0.45) {
          // 0.00 - 0.45s: Right glove glides cleanly from clear wood onto revolver grip & closes fingers
          rev.group.position.copy(_revolverRestPos);
          rev.group.rotation.set(0, 0.42, Math.PI / 2);
          rev.group.updateMatrixWorld(true);
          rev.gripAnchor.getWorldPosition(_revGripWorld);

          const u = THREE.MathUtils.clamp(e / 0.45, 0, 1);
          const k = easeInOut(u);
          _handTargetWorld.set(
            THREE.MathUtils.lerp(-1.56, _revGripWorld.x, k),
            THREE.MathUtils.lerp(0.08, _revGripWorld.y + 0.06, k) + Math.sin(k * Math.PI) * 0.18,
            THREE.MathUtils.lerp(-1.1, _revGripWorld.z, k),
          );
          if (this.opponentRig) {
            this.opponentRig.setHandPoseLock?.('right', null, null);
            this.opponentRig.setHandTarget('right', _handTargetWorld, 1);
            this.opponentRig.setHandGrip('right', u >= 0.72);
          }
          rev.hammerPivot.rotation.x = 0;
          rev.muzzleFlash.visible = false;
          rev.smokePuff.visible = false;
        } else if (e < 1.1) {
          // 0.45 - 1.10s: Heavy smooth arc lift onto player's eye line
          gripLockedToHand = true;
          const k = easeInOut(THREE.MathUtils.clamp((e - 0.45) / 0.65, 0, 1));
          _revolverAimPos.set(
            THREE.MathUtils.lerp(_revolverRestPos.x, aimX, k),
            THREE.MathUtils.lerp(_revolverRestPos.y, aimY, k) + Math.sin(k * Math.PI) * 0.18,
            THREE.MathUtils.lerp(_revolverRestPos.z, aimZ, k),
          );
          gunPitch = THREE.MathUtils.lerp(0, aimPitchBase, k);
          gunYaw = THREE.MathUtils.lerp(0.42, aimRotY, k);
          gunRoll = THREE.MathUtils.lerp(Math.PI / 2, 0, k);
          rev.hammerPivot.rotation.x = 0;
          rev.muzzleFlash.visible = false;
          rev.smokePuff.visible = false;
        } else if (e < 1.6) {
          // 1.10 - 1.60s: Hammer cock + 60° cylinder spin + 0.4s tense living tremor pause
          gripLockedToHand = true;
          if (!this.revolverAnim.cocked) {
            this.revolverAnim.cocked = true;
          }
          const ck = easeInOut(THREE.MathUtils.clamp((e - 1.1) / 0.16, 0, 1));
          rev.hammerPivot.rotation.x = ck * 0.62;
          rev.cylinderPivot.rotation.z = this.revolverAnim.baseCylRot + ck * (Math.PI / 3);

          const tremorOn = e > 1.24 ? 1 : 0;
          const tx = Math.sin(t * 36) * 0.004 * tremorOn;
          const ty = Math.cos(t * 29) * 0.003 * tremorOn;
          _revolverAimPos.set(aimX + tx, aimY + ty, aimZ);
          gunPitch = aimPitchBase + Math.sin(t * 17) * 0.008 * tremorOn;
          gunYaw = aimRotY;
          gunRoll = 0;
        } else if (e < 2.1) {
          // 1.60 - 2.10s: Shot, 70ms muzzle flash, smoke puff, +28° (0.49 rad) muzzle flip + screen impact
          gripLockedToHand = true;
          if (!this.revolverAnim.fired) {
            this.revolverAnim.fired = true;
            this.trauma = 0.96;
            if (this.muzzleFlashLight) {
              rev.muzzleTip.getWorldPosition(_revolverFlashWorld);
              this.muzzleFlashLight.position.copy(_revolverFlashWorld);
              this.muzzleFlashLight.intensity = 38;
            }
          }
          const fk = THREE.MathUtils.clamp((e - 1.6) / 0.5, 0, 1);
          rev.hammerPivot.rotation.x = THREE.MathUtils.lerp(0.62, 0, Math.min(1, (e - 1.6) / 0.04));
          rev.muzzleFlash.visible = e < 1.67;
          rev.muzzleFlash.rotation.z = t * 44;

          rev.smokePuff.visible = e >= 1.65;
          rev.smokePuff.position.set(0, 0.16 + fk * 0.3, -0.48 - fk * 0.22);
          rev.smokePuff.scale.setScalar(0.85 + fk * 2.4);
          const sMat = rev.smokePuff.material as THREE.MeshStandardMaterial;
          sMat.opacity = Math.max(0, 0.56 * (1 - fk));

          const kick = springRecoil(fk);
          _revolverAimPos.set(aimX, aimY + kick * 0.095, aimZ - kick * 0.085);
          gunPitch = aimPitchBase + kick * 0.49;
          gunYaw = aimRotY;
          gunRoll = kick * 0.06;
        } else {
          // 2.10 - 2.90s: Smooth arc return to left table & glove release back to resting wood
          const u = THREE.MathUtils.clamp((e - 2.1) / 0.8, 0, 1);
          if (u < 0.72) {
            gripLockedToHand = true;
            const rk = easeInOut(u / 0.72);
            _revolverAimPos.set(
              THREE.MathUtils.lerp(aimX, _revolverRestPos.x, rk),
              THREE.MathUtils.lerp(aimY, _revolverRestPos.y, rk) + Math.sin(rk * Math.PI) * 0.16,
              THREE.MathUtils.lerp(aimZ, _revolverRestPos.z, rk),
            );
            gunPitch = THREE.MathUtils.lerp(aimPitchBase, 0, rk);
            gunYaw = THREE.MathUtils.lerp(aimRotY, 0.42, rk);
            gunRoll = THREE.MathUtils.lerp(0, Math.PI / 2, rk);
          } else {
            gripLockedToHand = false;
            _revolverAimPos.copy(_revolverRestPos);
            gunPitch = 0;
            gunYaw = 0.42;
            gunRoll = Math.PI / 2;
            if (this.opponentRig) {
              this.opponentRig.setHandPoseLock?.('right', null, null);
              this.opponentRig.setHandGrip('right', false);
              this.opponentRig.setHandTarget('right', null, 0);
            }
          }
          rev.muzzleFlash.visible = false;
          rev.smokePuff.visible = false;
        }

        if (e >= 0.45) {
          rev.group.position.copy(_revolverAimPos);
          _revEuler.set(gunPitch, gunYaw, gunRoll, 'YXZ');
          _revQuat.setFromEuler(_revEuler);
          rev.group.quaternion.copy(_revQuat);
          rev.group.updateMatrixWorld(true);
        }

        if (gripLockedToHand && this.opponentRig) {
          rev.gripAnchor.getWorldPosition(_revGripWorld);
          _revHandOffset.set(0.015, 0.015, 0.032).applyQuaternion(rev.group.quaternion);
          _revHandPos.copy(_revGripWorld).add(_revHandOffset);
          _revHandQuat.copy(rev.group.quaternion).multiply(_revDealerHandLocalQuat);
          this.opponentRig.setHandGrip('right', true);
          this.opponentRig.setHandPoseLock?.('right', _revHandPos, _revHandQuat);
        }
      } else {
        // SCENARIO B: Player First-Person shoots Dealer (0..2.75s)
        if (e < 0.85) {
          // 0.00 - 0.85s: Smooth sweep off left table into crisp lower-right FPS aiming position
          gripLockedToHand = true;
          const k = easeInOut(THREE.MathUtils.clamp(e / 0.85, 0, 1));
          _revolverAimPos.set(
            THREE.MathUtils.lerp(_revolverRestPos.x, aimX, k),
            THREE.MathUtils.lerp(_revolverRestPos.y, aimY, k) + Math.sin(k * Math.PI) * 0.22,
            THREE.MathUtils.lerp(_revolverRestPos.z, aimZ, k),
          );
          gunPitch = THREE.MathUtils.lerp(0, aimPitchBase, k);
          gunYaw = THREE.MathUtils.lerp(0.42, aimRotY, k);
          gunRoll = THREE.MathUtils.lerp(Math.PI / 2, 0, k);
          rev.hammerPivot.rotation.x = 0;
          rev.muzzleFlash.visible = false;
          rev.smokePuff.visible = false;
        } else if (e < 1.35) {
          // 0.85 - 1.35s: Visible hammer cock + 60° cylinder rotation + natural breathing sway
          gripLockedToHand = true;
          if (!this.revolverAnim.cocked) {
            this.revolverAnim.cocked = true;
          }
          const ck = easeInOut(THREE.MathUtils.clamp((e - 0.85) / 0.16, 0, 1));
          rev.hammerPivot.rotation.x = ck * 0.62;
          rev.cylinderPivot.rotation.z = this.revolverAnim.baseCylRot + ck * (Math.PI / 3);

          const swayX = Math.sin(t * 2.4) * 0.006;
          const swayY = Math.cos(t * 1.9) * 0.005;
          _revolverAimPos.set(aimX + swayX, aimY + swayY, aimZ);
          gunPitch = aimPitchBase + swayY * 0.4;
          gunYaw = aimRotY;
          gunRoll = 0;
        } else if (e < 1.95) {
          // 1.35 - 1.95s: Shot, 70ms flash, smoke, +28° muzzle flip, camera shake + Dealer skull hit recoil
          gripLockedToHand = true;
          if (!this.revolverAnim.fired) {
            this.revolverAnim.fired = true;
            this.trauma = 0.85;
            this.opponentRig?.triggerHitRecoil?.();
            if (this.muzzleFlashLight) {
              rev.muzzleTip.getWorldPosition(_revolverFlashWorld);
              this.muzzleFlashLight.position.copy(_revolverFlashWorld);
              this.muzzleFlashLight.intensity = 38;
            }
          }
          const fk = THREE.MathUtils.clamp((e - 1.35) / 0.6, 0, 1);
          rev.hammerPivot.rotation.x = THREE.MathUtils.lerp(0.62, 0, Math.min(1, (e - 1.35) / 0.04));
          rev.muzzleFlash.visible = e < 1.42;
          rev.muzzleFlash.rotation.z = t * 44;

          rev.smokePuff.visible = e >= 1.4;
          rev.smokePuff.position.set(0, 0.16 + fk * 0.3, -0.48 - fk * 0.24);
          rev.smokePuff.scale.setScalar(0.85 + fk * 2.5);
          const sMat = rev.smokePuff.material as THREE.MeshStandardMaterial;
          sMat.opacity = Math.max(0, 0.56 * (1 - fk));

          const kick = springRecoil(fk);
          _revolverAimPos.set(aimX, aimY + kick * 0.095, aimZ + kick * 0.09);
          gunPitch = aimPitchBase + kick * 0.49;
          gunYaw = aimRotY;
          gunRoll = -kick * 0.05;
        } else {
          // 1.95 - 2.75s: Smoothly return revolver to left table edge & lower player hand out of frame
          const u = THREE.MathUtils.clamp((e - 1.95) / 0.8, 0, 1);
          const rk = easeInOut(u);
          gripLockedToHand = u < 0.82;
          _revolverAimPos.set(
            THREE.MathUtils.lerp(aimX, _revolverRestPos.x, rk),
            THREE.MathUtils.lerp(aimY, _revolverRestPos.y, rk) + Math.sin(rk * Math.PI) * 0.16,
            THREE.MathUtils.lerp(aimZ, _revolverRestPos.z, rk),
          );
          gunPitch = THREE.MathUtils.lerp(aimPitchBase, 0, rk);
          gunYaw = THREE.MathUtils.lerp(aimRotY, 0.42, rk);
          gunRoll = THREE.MathUtils.lerp(0, Math.PI / 2, rk);
          rev.muzzleFlash.visible = false;
          rev.smokePuff.visible = false;
        }

        rev.group.position.copy(_revolverAimPos);
        _revEuler.set(gunPitch, gunYaw, gunRoll, 'YXZ');
        _revQuat.setFromEuler(_revEuler);
        rev.group.quaternion.copy(_revQuat);
        rev.group.updateMatrixWorld(true);

        if (this.playerHands) {
          if (gripLockedToHand) {
            rev.gripAnchor.getWorldPosition(_revGripWorld);
            _revHandOffset.set(0.018, -0.025, 0.048).applyQuaternion(rev.group.quaternion);
            this.playerHands.right.position.copy(_revGripWorld).add(_revHandOffset);
            this.playerHands.right.quaternion.copy(rev.group.quaternion).multiply(_revPlayerHandLocalQuat);
          } else {
            this.playerHands.right.position.x = THREE.MathUtils.damp(this.playerHands.right.position.x, 0.88, 9, dt);
            this.playerHands.right.position.y = THREE.MathUtils.damp(this.playerHands.right.position.y, 0.14, 9, dt);
            this.playerHands.right.position.z = THREE.MathUtils.damp(this.playerHands.right.position.z, 1.98, 9, dt);
            this.playerHands.right.rotation.set(0, 0, 0);
          }
        }
      }

      if (e >= this.revolverAnim.duration) {
        this.revolverAnim.active = false;
        rev.group.position.copy(_revolverRestPos);
        rev.group.rotation.set(0, 0.42, Math.PI / 2);
        rev.hammerPivot.rotation.x = 0;
        rev.muzzleFlash.visible = false;
        rev.smokePuff.visible = false;
        if (hitPlayer && this.opponentRig) {
          this.opponentRig.setHandPoseLock?.('right', null, null);
          this.opponentRig.setHandGrip('right', false);
          this.opponentRig.setHandTarget('right', null, 0);
        }
      }
    }

    // Update CharacterRig (breathing, torso lean, 2-bone IK arms, jaw/head speaking animation)
    if (this.opponentRig) {
      this.opponentRig.update(dt, this.elapsedTime, this.speaking);

      // Subtle additive 3D head reaction on incoming opponent emotes (non-conflicting with idle/IK)
      if (this.opponentEmoteReaction) {
        const r = this.opponentEmoteReaction;
        r.elapsed += dt;
        if (r.elapsed >= r.duration) {
          this.opponentEmoteReaction = null;
        } else {
          const p = r.elapsed / r.duration;
          const env = Math.sin(p * Math.PI);
          const head = this.opponentRig.headGroup;
          if (r.kind === 'nod') {
            head.rotation.x += Math.sin(p * Math.PI * 2) * 0.14 * env;
          } else if (r.kind === 'shake') {
            head.rotation.y += Math.sin(p * Math.PI * 4) * 0.16 * env;
          } else if (r.kind === 'tilt') {
            head.rotation.z += 0.18 * env;
          } else if (r.kind === 'bounce') {
            head.rotation.x -= Math.abs(Math.sin(p * Math.PI * 2)) * 0.11 * env;
          } else if (r.kind === 'bow') {
            head.rotation.x += 0.2 * env;
          }
        }
      }

      // Sync carried chess piece with opponent rightHandSocket during Stage 2 (Carry)
      const movingPieceId = this.oppMoveAnim.pieceId;
      if (this.oppMoveAnim.active && movingPieceId !== null) {
        const m = this.oppMoveAnim;
        const carryEnd = m.approachDur + m.carryDur;
        if (m.elapsed >= m.approachDur && m.elapsed < carryEnd) {
          const pieceMesh = this.pieceMeshes.get(movingPieceId);
          if (pieceMesh) {
            const u = THREE.MathUtils.clamp((m.elapsed - m.approachDur) / m.carryDur, 0, 1);
            const k = easeInOut(u);
            const lift = Math.sin(k * Math.PI) * 0.42;
            this.opponentRig.rightHandSocket.getWorldPosition(_socketWorld);

            _pieceWorld.lerpVectors(m.fromWorld, m.toWorld, k);
            _pieceWorld.y = 0.08 + lift;

            const sockBlend = Math.sin(k * Math.PI) * 0.65;
            _pieceWorld.x = THREE.MathUtils.lerp(_pieceWorld.x, _socketWorld.x, sockBlend);
            _pieceWorld.z = THREE.MathUtils.lerp(_pieceWorld.z, _socketWorld.z, sockBlend);
            _pieceWorld.y = THREE.MathUtils.lerp(_pieceWorld.y, Math.max(0.12, _socketWorld.y - 0.14), sockBlend);

            this.boardPivot.updateMatrixWorld(true);
            _pieceLocal.copy(_pieceWorld);
            this.boardPivot.worldToLocal(_pieceLocal);
            pieceMesh.position.copy(_pieceLocal);
          }
        }
      }
    }

    if (this.muzzleFlashLight && this.muzzleFlashLight.intensity > 0.05) {
      this.muzzleFlashLight.intensity *= Math.exp(-18 * dt);
    }

    // 8. Drifting clouds in Light Mode (batched InstancedMesh update)
    if (this.cloudInstanced && this.cloudEntries.length > 0) {
      for (let i = 0; i < this.cloudEntries.length; i++) {
        const ce = this.cloudEntries[i];
        ce.x += dt * ce.speed;
        if (ce.x > 34) ce.x = -34;
        _deckDummy.position.set(ce.x, ce.y, ce.z);
        _deckDummy.rotation.set(0, 0, 0);
        _deckDummy.scale.set(ce.sx, ce.sy, ce.sz);
        _deckDummy.updateMatrix();
        this.cloudInstanced.setMatrixAt(i, _deckDummy.matrix);
      }
      this.cloudInstanced.instanceMatrix.needsUpdate = true;
    }

    // 9. Overhead lamp sway + smooth fixture hiding during CAM_BOARD_TACTICAL + Survival difficulty lighting evolution
    if (this.overheadLampGroup) {
      const swaySpeed = this.survivalDifficulty === 'hard' ? 1.38 : 1.1;
      this.overheadLampGroup.rotation.z = Math.sin(t * swaySpeed) * 0.03;
      this.overheadLampGroup.rotation.x = Math.cos(t * (swaySpeed * 0.77)) * 0.02;
    }
    if (this.mode === 'survival') {
      const lightAlpha = 1 - Math.exp(-5.0 * dt);
      const isHard = this.survivalDifficulty === 'hard';
      const isMed = this.survivalDifficulty === 'medium';

      if (this.survivalSpotLight) {
        const targetIntensity = isHard ? 50 : isMed ? 45 : 42;
        const targetAngle = isHard ? Math.PI / 3.05 : isMed ? Math.PI / 2.88 : Math.PI / 2.75;
        this.survivalSpotLight.intensity += (targetIntensity - this.survivalSpotLight.intensity) * lightAlpha;
        this.survivalSpotLight.angle += (targetAngle - this.survivalSpotLight.angle) * lightAlpha;
        _spotTargetColor.copy(isHard ? _spotHardColor : _spotEasyColor);
        this.survivalSpotLight.color.lerp(_spotTargetColor, lightAlpha);
      }
      if (this.survivalRimLight) {
        const targetRimIntensity = isHard ? 0.44 + 0.08 * Math.sin(t * 3.1) : isMed ? 0.34 : 0.26;
        this.survivalRimLight.intensity += (targetRimIntensity - this.survivalRimLight.intensity) * lightAlpha;
        _rimTargetColor.copy(isHard ? _rimHardColor : isMed ? _rimMedColor : _rimEasyColor);
        this.survivalRimLight.color.lerp(_rimTargetColor, lightAlpha);
      }
    } else if (this.mode === 'light' && this.lightAtmosphere) {
      // Smooth exponential timelapse interpolation (Day -> Sunset -> Night) during Unknown matches
      const nightAlpha = 1 - Math.exp(-0.55 * dt);
      const diff = this.targetNight - this.currentNight;
      if (Math.abs(diff) > 0.0005) {
        this.currentNight += diff * nightAlpha;
      } else {
        this.currentNight = this.targetNight;
      }
      if (this.currentNight > 0.0005 || Math.abs(diff) > 0.0005) {
        this.applyLightAtmosphere(this.currentNight, t);
      }
    }
    if (this.lampFixtureGroup) {
      const targetFade = this.cameraPreset === 'CAM_BOARD_TACTICAL' ? 0 : 1;
      this.lampFixtureFade = THREE.MathUtils.damp(this.lampFixtureFade, targetFade, 22, dt);
      this.lampFixtureGroup.visible = this.lampFixtureFade > 0.04;
      for (const item of this.lampFadeTargets) {
        (item.mat as THREE.Material & { opacity: number }).opacity = item.baseOpacity * this.lampFixtureFade;
      }
    }

    // 10. Camera Rig with exponential damping + aspect-aware Tactical View + ±8° cursor Free Look + trauma shake
    const maxAngle = THREE.MathUtils.degToRad(8);
    const targetYaw = -this.pointerNDC.x * maxAngle;
    const targetPitch = this.pointerNDC.y * maxAngle * 0.65;
    this.freeLookYaw = THREE.MathUtils.damp(this.freeLookYaw, targetYaw, 6, dt);
    this.freeLookPitch = THREE.MathUtils.damp(this.freeLookPitch, targetPitch, 6, dt);

    const aspect = Math.max(0.42, this.camera.aspect);
    const portraitPullback = aspect < 1.0 ? (1.0 - aspect) * 1.75 : 0;

    switch (this.cameraPreset) {
      case 'CAM_TITLE':
        _desiredPos.set(
          Math.sin(t * 0.25) * 0.3 + 1.85,
          1.84 + portraitPullback * 0.45,
          2.68 + portraitPullback,
        );
        _desiredLook.set(-0.46 * Math.min(1, aspect), 0.56, -0.45);
        break;
      case 'CAM_IDLE':
        _desiredPos.set(0, 1.82 + portraitPullback * 0.48, 2.52 + portraitPullback * 1.05);
        _desiredLook.set(0, 0.64, -0.72);
        break;
      case 'CAM_BOARD_TACTICAL': {
        // Compute camera distance from aspect & FOV so all 64 squares + frame + pieces fit comfortably with clean margins
        const tanHalfV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
        const tanHalfH = tanHalfV * aspect;
        const spanW = BOARD_SPAN + 1.15;
        const spanH = BOARD_SPAN + 1.15;
        const distV = spanH / (2 * tanHalfV);
        const distH = spanW / (2 * tanHalfH);
        const dist = Math.max(4.15, distV, distH);
        const tiltRad = THREE.MathUtils.degToRad(72);
        _desiredPos.set(0, 0.08 + dist * Math.sin(tiltRad), 0.06 + dist * Math.cos(tiltRad));
        _desiredLook.set(0, 0.04, 0.06);
        break;
      }
      case 'CAM_CARD_DRAW':
        _desiredPos.set(0.28, 1.56 + portraitPullback * 0.35, 1.85 + portraitPullback * 0.75);
        _desiredLook.set(0.12, 0.92, 0.85);
        break;
      case 'CAM_COIN_FLIP': {
        const ce = this.coinAnim.active ? this.coinAnim.elapsed : this.coinAnim.duration;
        if (ce < 2.1) {
          const arcLift = Math.max(0, _coinFocusPos.y - 0.15) * 0.45;
          _desiredPos.set(0.86, 1.06 + arcLift * 0.45, 1.56);
          _desiredLook.set(_coinFocusPos.x * 0.85 + 0.15, Math.max(0.18, _coinFocusPos.y * 0.72), _coinFocusPos.z * 0.85);
        } else {
          const push = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((ce - 2.1) / 1.25, 0, 1), 0, 1);
          _desiredPos.set(
            THREE.MathUtils.lerp(0.92, 1.06, push),
            THREE.MathUtils.lerp(0.92, 0.56, push),
            THREE.MathUtils.lerp(1.42, 1.12, push),
          );
          _desiredLook.set(1.44, 0.035, 0.74);
        }
        break;
      }
      case 'CAM_REVOLVER':
        if (this.revolverAnim.target === 'player') {
          // Buckshot Roulette–style framing: gloved hand, walnut grip, cylinder, barrel & Dealer skull behind
          _desiredPos.set(-0.08, 1.24, 1.26);
          _desiredLook.set(-0.1, 1.02, -0.95);
        } else {
          // First-Person aiming view: crisp revolver in lower-right third pointed straight at Dealer's skull
          _desiredPos.set(0.06, 1.44, 2.08);
          _desiredLook.set(0.0, 1.04, -1.85);
        }
        break;
    }

    const dampFactor = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(_desiredPos, dampFactor);
    _curLook.lerp(_desiredLook, dampFactor);

    const allowFreeLook =
      this.cameraPreset !== 'CAM_TITLE' &&
      this.cameraPreset !== 'CAM_BOARD_TACTICAL' &&
      this.cameraPreset !== 'CAM_COIN_FLIP' &&
      this.cameraPreset !== 'CAM_REVOLVER';
    const lookX = _curLook.x + (allowFreeLook ? Math.sin(this.freeLookYaw) * 1.25 : 0);
    const lookY = _curLook.y + (allowFreeLook ? Math.sin(this.freeLookPitch) * 0.95 : 0);
    this.camera.lookAt(lookX, lookY, _curLook.z);

    if (this.trauma > 0.001) {
      const shake = this.trauma * this.trauma * 0.14;
      this.camera.rotation.z += (Math.random() * 2 - 1) * shake;
      this.camera.rotation.x += (Math.random() * 2 - 1) * shake * 0.6;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.onResize);

    this.oppMoveAnim.active = false;
    this.oppReachAnim.active = false;
    this.oppCardAnim.active = false;
    if (this.onlineOpponentRig) {
      this.scene.remove(this.onlineOpponentRig.root);
      this.onlineOpponentRig.dispose();
      this.onlineOpponentRig = null;
    }
    if (this.onlineOpponentFillLight) {
      this.scene.remove(this.onlineOpponentFillLight);
      this.onlineOpponentFillLight = null;
    }
    this.opponentRig = null;

    const disposeBundle = (bundle: ModeWorldBundle | null) => {
      if (!bundle) return;
      bundle.hpMonitor?.dispose();
      bundle.lightClock?.dispose();
      if (bundle.dealerRig) {
        bundle.propsGroup.remove(bundle.dealerRig.root);
        bundle.dealerRig.dispose();
      }
      if (bundle.lightNpcRigs) {
        for (const [, rig] of bundle.lightNpcRigs.entries()) {
          bundle.propsGroup.remove(rig.root);
          rig.dispose();
        }
        bundle.lightNpcRigs.clear();
      }
      this.clearGroup(bundle.envGroup);
      this.clearGroup(bundle.propsGroup);
      this.clearGroup(bundle.boardStaticGroup);
      this.scene.remove(bundle.envGroup);
      this.scene.remove(bundle.propsGroup);
      this.boardPivot.remove(bundle.boardStaticGroup);
    };

    disposeBundle(this.survivalBundle);
    disposeBundle(this.lightBundle);
    this.survivalBundle = null;
    this.lightBundle = null;

    this.clearGroup(this.transientGroup);
    this.clearGroup(this.graveyardGroup);
    this.clearGroup(this.captureBloodGroup);
    this.clearGroup(this.piecesGroup);

    if (this.deckHitbox) {
      this.scene.remove(this.deckHitbox);
      disposeObjectSubtree(this.deckHitbox);
      this.deckHitbox = null;
    }

    for (const hl of this.squareHighlights) {
      if (hl) {
        this.boardPivot.remove(hl);
        disposeObjectSubtree(hl);
      }
    }
    for (const hb of this.squareHitboxes) {
      if (hb) {
        this.boardPivot.remove(hb);
        disposeObjectSubtree(hb);
      }
    }
    for (const pip of this.movesRemainingDots) {
      this.boardPivot.remove(pip);
      disposeObjectSubtree(pip);
    }

    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
