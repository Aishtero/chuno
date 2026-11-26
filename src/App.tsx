import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MusicTrackPreference,
  getNextMusicTrackPreference,
} from './audio/musicManager';
import { soundManager } from './audio/soundManager';
import { AchievementToast } from './components/AchievementToast';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { DesktopOnlyModal } from './components/DesktopOnlyModal';
import { ActiveEmoteInstance, EmoteBubbleOverlay } from './components/EmoteBubbleOverlay';
import { EmotePicker } from './components/EmotePicker';
import { EndModal } from './components/EndModal';
import { FriendsModal, FriendsModalTab } from './components/FriendsModal';
import { GameHud, OnlineHudInfo } from './components/GameHud';
import { GameInviteBanner } from './components/GameInviteBanner';
import { GodotModal } from './components/GodotModal';
import { LeaderDashboardModal, LeaderModalTab } from './components/LeaderDashboardModal';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { RulesModal } from './components/RulesModal';
import { TitleScreen } from './components/TitleScreen';
import { UpdaterModal } from './components/UpdaterModal';
import { VisualGuideModal } from './components/VisualGuideModal';
import { WebGuestModal } from './components/WebGuestModal';
import { AchievementDefinition, MatchScoreBreakdown } from './core/achievements';
import { BoardState } from './core/chess/boardState';
import { OnlineSubMode } from './core/menuNavigation';
import { resolveOnlineAutoCamera } from './core/onlineCamera';
import {
  OnlineConnectionStatus,
  OnlineEmoteEvent,
  OnlineMatchEndSummary,
  OnlineMatchEvent,
  OnlineMode,
  OnlineRoomClient,
  OnlineRoomView,
  RoomErrorCode,
  RoomVisibility,
  StartingHp,
  createOnlineRoom,
  parseRoomCodeFromSearch,
  requestQuickMatch,
} from './core/onlineClient';
import { isOnlineFeaturesEnabled } from './core/runtimePolicy';
import {
  EMPTY_SOCIAL_STATE,
  GameInviteItem,
  SocialErrorCode,
  SocialInviteErrorCode,
  SocialPresenceClient,
  SocialStateSnapshot,
  cancelFriendRequest,
  removeSocialFriend,
  resolveOpponentRelation,
  respondFriendRequest,
  sendFriendRequest,
  sortFriendsByPresence,
  syncSocialState,
} from './core/socialClient';
import { preloadAllEmoteBlobs } from './core/emoteAssets';
import {
  CLIENT_EMOTE_COOLDOWN_MS,
  EmoteId,
  canSendEmote,
  getEmoteDefinition,
  isValidEmoteId,
  shouldShowIncomingEmote,
} from './data/emotes';
import {
  computeUpdateIndicatorState,
  shouldRunBackgroundUpdateCheck,
} from './core/updateNotificationState';
import { AvatarId, isValidAvatarId } from './data/playerAvatars';
import { AIDifficulty, evaluateBoard } from './core/chess/chessAI';
import { leaderboardService } from './core/leaderboardService';
import { aiWorkerClient } from './core/chess/chessAIWorkerClient';
import {
  generateLegalMoves,
  generateLegalMovesForSquare,
  generateWildMoves,
  getLegalResurrectSquares,
  getWildEligibleSquares,
} from './core/chess/moveGenerator';
import { PieceColor, PieceType, PromotablePieceType } from './core/chess/types';
import {
  CardType,
  DialogueAudioMode,
  DifficultyLevel,
  GameMode,
  GraphicsQuality,
  LightPersonality,
  LightPreviewAvatar,
} from './core/deck/cardData';
import { Language, getTranslations } from './core/localization';
import {
  DialogueEvent,
  dialogueManager,
  getDialogueLine,
  speakerFromPersonality,
} from './data/voiceRegistry';
import {
  CoinSide,
  MatchActor,
  MatchEndReason,
  MatchEngine,
  MatchEvent,
  MatchPhase,
  MatchStats,
} from './core/match/matchEngine';
import {
  PlayerProfile,
  exportProfileToJson,
  hydrateProfileFromTauriDisk,
  isTauriRuntime,
  loadProfile,
  parseAndValidateImportedProfile,
  recordMatchOutcomeDetailed,
  saveProfile,
  syncFriendMatchPresence,
  validateNickname,
} from './core/profileManager';
import {
  FIRST_MATCH_HINT_CYCLES,
  resolveFirstMatchHint,
} from './core/tutorialHelper';
import {
  AvailableAppUpdate,
  checkForDesktopUpdate,
} from './core/updaterService';
import {
  WebGuestGateStatus,
  getChunoDownloadUrl,
  getWebGuestStatus,
  recordWebGuestMatchCompleted,
} from './core/webGuestGate';
import {
  CameraPreset,
  ChUnoSceneController,
  computeUnknownNightTarget,
} from './presentation/chunoScene';

type AppScreenState = 'title' | 'playing' | 'paused' | 'gameover';

interface HudSnapshot {
  phase: MatchPhase;
  activeActor: MatchActor;
  playerColor: PieceColor;
  playerHp: number;
  opponentHp: number;
  maxHp: number;
  currentCard: CardType | null;
  movesLeft: number;
  resurrectsLeft: number;
  deckCount: number;
  isInCheck: boolean;
  isKingVsKing: boolean;
  drawOfferCooldownTurns: number;
  drawOfferLocked: boolean;
  winner: MatchActor | 'draw' | null;
  endReason: MatchEndReason | null;
  stats: MatchStats;
  resurrectOptions: { pieceId: number; type: PieceType; legalSquares: number[] }[];
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ChUnoSceneController | null>(null);
  const engineRef = useRef<MatchEngine | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const p = loadProfile();
    soundManager.setMuted(p.muted);
    soundManager.setMenuMusicEnabled(p.settings.menuMusicEnabled);
    soundManager.setGameMusicEnabled(p.settings.gameMusicEnabled);
    soundManager.setMusicVolume(p.settings.musicVolume);
    soundManager.setSfxVolume(p.settings.sfxVolume);
    soundManager.setVoiceVolume(p.settings.voiceVolume);
    soundManager.setMusicTrackPreference(p.settings.musicTrackPreference ?? 'auto');
    return p;
  });

  const [screen, setScreen] = useState<AppScreenState>('title');
  const [mode, setMode] = useState<GameMode>('light');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const userPickedSurvivalDifficultyRef = useRef(false);
  const [personalityOpt, setPersonalityOpt] = useState<LightPreviewAvatar>('unknown');
  const [activePersonality, setActivePersonality] = useState<LightPersonality>('unknown');
  const [language, setLanguage] = useState<Language>(profile.language);
  const [muted, setMuted] = useState<boolean>(profile.muted);
  const [fpsValue, setFpsValue] = useState<number | null>(null);

  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState<boolean>(() => !profile.hasSeenTutorial);
  const [guideAutoPlay, setGuideAutoPlay] = useState<boolean>(() => !profile.hasSeenTutorial);
  const [firstMatchCycles, setFirstMatchCycles] = useState(0);
  const prevHudActorRef = useRef<MatchActor>('player');
  const [showGodot, setShowGodot] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState<LeaderModalTab | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState<{
    open: boolean;
    initialTab?: FriendsModalTab;
  }>({ open: false });
  const [socialState, setSocialState] = useState<SocialStateSnapshot>(EMPTY_SOCIAL_STATE);
  const [socialLoading, setSocialLoading] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<GameInviteItem | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<GameInviteItem | null>(null);
  const [inviteNotice, setInviteNotice] = useState<{ tone: 'info' | 'err'; text: string } | null>(null);
  const socialWsRef = useRef<SocialPresenceClient | null>(null);
  const [desktopOnlyModal, setDesktopOnlyModal] = useState<{
    open: boolean;
    inviteRoomCode?: string | null;
  }>({ open: false, inviteRoomCode: null });
  const [onlineLobbySubMode, setOnlineLobbySubMode] = useState<OnlineSubMode | null>(null);
  const [onlineInitialRoomCode, setOnlineInitialRoomCode] = useState<string | null>(null);
  const [onlineRoomState, setOnlineRoomState] = useState<OnlineRoomView | null>(null);
  const [onlineConnectionStatus, setOnlineConnectionStatus] = useState<OnlineConnectionStatus>('idle');
  const [onlineErrorCode, setOnlineErrorCode] = useState<RoomErrorCode | 'CONNECTION_ERROR' | null>(null);
  const [onlineEndSummary, setOnlineEndSummary] = useState<OnlineMatchEndSummary | null>(null);
  const onlineClientRef = useRef<OnlineRoomClient | null>(null);
  const onlineRoomStateRef = useRef<OnlineRoomView | null>(null);
  onlineRoomStateRef.current = onlineRoomState;
  const onlineClockOffsetRef = useRef<number>(0);
  const onlineMatchActiveRef = useRef<boolean>(false);
  const onlineCameraTimerRef = useRef<number | null>(null);
  const [cameraPresetState, setCameraPresetState] = useState<CameraPreset>('CAM_TITLE');

  const isTauri = isTauriRuntime();
  const onlineEnabled = useMemo(() => isOnlineFeaturesEnabled(), []);
  const [guestStatus, setGuestStatus] = useState<WebGuestGateStatus>(() => getWebGuestStatus());
  const [showGuestModal, setShowGuestModal] = useState<boolean>(() => {
    const st = getWebGuestStatus();
    return st.isGuestMode && st.isLocked;
  });
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(false);

  const [showUpdaterModal, setShowUpdaterModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);
  const [updateToastDismissed, setUpdateToastDismissed] = useState(false);
  const lastUpdateCheckAtRef = useRef<number | null>(null);

  const [tacticalCam, setTacticalCam] = useState(false);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [endQuote, setEndQuote] = useState<string | null>(null);
  const [playerEmote, setPlayerEmote] = useState<ActiveEmoteInstance | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<ActiveEmoteInstance | null>(null);
  const [emoteLastSentAt, setEmoteLastSentAt] = useState<number>(0);
  const [opponentEmotesMuted, setOpponentEmotesMuted] = useState<boolean>(false);
  const opponentEmotesMutedRef = useRef(opponentEmotesMuted);
  opponentEmotesMutedRef.current = opponentEmotesMuted;
  const emoteSeqRef = useRef<number>(1);
  const emoteLastSentAtRef = useRef<number>(0);
  emoteLastSentAtRef.current = emoteLastSentAt;
  const [hitFlash, setHitFlash] = useState(false);
  const [hitBlackout, setHitBlackout] = useState(false);
  const [lastScoreBreakdown, setLastScoreBreakdown] = useState<MatchScoreBreakdown | null>(null);
  const [toastQueue, setToastQueue] = useState<AchievementDefinition[]>([]);
  const [modeTransitioning, setModeTransitioning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedSecondsRef = useRef(0);
  elapsedSecondsRef.current = elapsedSeconds;
  const matchElapsedMsRef = useRef(0);
  const matchTimerAnchorRef = useRef<number | null>(null);
  const modeFadeTimerRef = useRef<number | null>(null);

  const [selectedSq, setSelectedSq] = useState<number | null>(null);
  const [wildSelectedSq, setWildSelectedSq] = useState<number | null>(null);
  const [wildTargetType, setWildTargetType] = useState<Exclude<PieceType, 'king'> | null>(null);
  const [pendingPromoMove, setPendingPromoMove] = useState<{ from: number; to: number } | null>(null);
  const [selectedResurrectId, setSelectedResurrectId] = useState<number | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    phase: 'AWAIT_DRAW_CARD',
    activeActor: 'player',
    playerColor: 'white',
    playerHp: 3,
    opponentHp: 3,
    maxHp: 3,
    currentCard: null,
    movesLeft: 0,
    resurrectsLeft: 0,
    deckCount: 40,
    isInCheck: false,
    isKingVsKing: false,
    drawOfferCooldownTurns: 0,
    drawOfferLocked: false,
    winner: null,
    endReason: null,
    stats: {
      turnsPlayed: 0,
      movesMade: 0,
      coinsSurvived: 0,
      shotsFired: 0,
      reverseOccurred: false,
      maxResurrectedSingleCard: 0,
      wonByWildCheckmate: false,
    },
    resurrectOptions: [],
  });

  // Refs to avoid stale closures inside Three.js event callbacks & timeouts
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const languageRef = useRef(language);
  languageRef.current = language;
  const tacticalCamRef = useRef(tacticalCam);
  tacticalCamRef.current = tacticalCam;
  const selectedSqRef = useRef(selectedSq);
  selectedSqRef.current = selectedSq;
  const wildSelectedSqRef = useRef(wildSelectedSq);
  wildSelectedSqRef.current = wildSelectedSq;
  const wildTargetTypeRef = useRef(wildTargetType);
  wildTargetTypeRef.current = wildTargetType;
  const selectedResurrectIdRef = useRef(selectedResurrectId);
  selectedResurrectIdRef.current = selectedResurrectId;
  const activePersonalityRef = useRef(activePersonality);
  activePersonalityRef.current = activePersonality;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const voiceVolumeRef = useRef(profile.settings.voiceVolume);
  voiceVolumeRef.current = profile.settings.voiceVolume;
  const dialogueAudioModeRef = useRef<DialogueAudioMode>(profile.settings.dialogueAudioMode);
  dialogueAudioModeRef.current = profile.settings.dialogueAudioMode;
  const aiBusyRef = useRef(false);
  const aiGenRef = useRef(0);
  const aiTimerRef = useRef<number | null>(null);
  const aiLastProgressRef = useRef<number>(Date.now());
  const isAnimatingRef = useRef(false);

  const clearAiTimer = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  const scheduleAiStep = useCallback(
    (fn: () => void, ms: number) => {
      clearAiTimer();
      aiTimerRef.current = window.setTimeout(() => {
        aiTimerRef.current = null;
        fn();
      }, ms);
    },
    [clearAiTimer],
  );

  // Unlock Web Audio context & resume BGM cleanly on user interaction (pointer, touch, click, keyboard)
  useEffect(() => {
    const unlock = () => {
      soundManager.unlockAudio();
    };
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('touchstart', unlock, { capture: true });
      window.removeEventListener('touchend', unlock, { capture: true });
      window.removeEventListener('click', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  // Tauri desktop startup: hydrate atomic save.json backup + silent background update check
  useEffect(() => {
    if (!isTauri) return;
    let active = true;
    void hydrateProfileFromTauriDisk(profile).then((merged) => {
      if (!active) return;
      setProfile(merged);
      if (merged.hasSeenTutorial) {
        setShowGuide(false);
      }
      setLanguage(merged.language);
      setMuted(merged.muted);
      soundManager.setMuted(merged.muted);
      soundManager.setMenuMusicEnabled(merged.settings.menuMusicEnabled);
      soundManager.setGameMusicEnabled(merged.settings.gameMusicEnabled);
      soundManager.setMusicVolume(merged.settings.musicVolume);
      soundManager.setSfxVolume(merged.settings.sfxVolume);
      soundManager.setVoiceVolume(merged.settings.voiceVolume);
      soundManager.setMusicTrackPreference(merged.settings.musicTrackPreference ?? 'auto');
      sceneRef.current?.setGraphicsSettings({
        quality: merged.settings.graphicsQuality,
        showFps: merged.settings.showFps,
      });
    });

    void checkForDesktopUpdate(true).then((outcome) => {
      if (!active) return;
      if (outcome.status === 'available') {
        setAvailableUpdate(outcome.update);
        setShowUpdaterModal(true);
      }
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTauri]);

  const runSilentUpdateCheck = useCallback(async () => {
    if (!shouldRunBackgroundUpdateCheck({ isTauri, lastCheckedAt: lastUpdateCheckAtRef.current })) {
      return;
    }
    lastUpdateCheckAtRef.current = Date.now();
    const outcome = await checkForDesktopUpdate(true);
    if (outcome.status === 'available') {
      setAvailableUpdate(outcome.update);
    }
  }, [isTauri]);

  const handleCheckUpdates = useCallback(async () => {
    if (!isTauri) return;
    lastUpdateCheckAtRef.current = Date.now();
    setShowUpdaterModal(true);
    setCheckingUpdate(true);
    setUpdateCheckError(null);
    const outcome = await checkForDesktopUpdate(false);
    setCheckingUpdate(false);
    if (outcome.status === 'available') {
      setAvailableUpdate(outcome.update);
    } else if (outcome.status === 'error') {
      setUpdateCheckError(outcome.message);
    } else {
      setAvailableUpdate(null);
    }
  }, [isTauri]);

  const handleExportSave = useCallback(() => {
    try {
      const json = exportProfileToJson(profile);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chuno-save-${profile.playerId.toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.warn('[ChUno Save] Failed to export profile JSON:', err);
    }
  }, [profile]);

  const handleImportSaveJson = useCallback(
    (rawJson: string): { ok: boolean; error?: string } => {
      const res = parseAndValidateImportedProfile(rawJson, profile);
      if (!res.ok) {
        return { ok: false, error: res.error };
      }
      const next = res.profile;
      saveProfile(next);
      setProfile(next);
      setLanguage(next.language);
      setMuted(next.muted);
      soundManager.setMuted(next.muted);
      soundManager.setMenuMusicEnabled(next.settings.menuMusicEnabled);
      soundManager.setGameMusicEnabled(next.settings.gameMusicEnabled);
      soundManager.setMusicVolume(next.settings.musicVolume);
      soundManager.setSfxVolume(next.settings.sfxVolume);
      soundManager.setVoiceVolume(next.settings.voiceVolume);
      soundManager.setMusicTrackPreference(next.settings.musicTrackPreference ?? 'auto');
      sceneRef.current?.setGraphicsSettings({
        quality: next.settings.graphicsQuality,
        showFps: next.settings.showFps,
      });
      void leaderboardService.submitPlayerSnapshot(next);
      return { ok: true };
    },
    [profile],
  );

  const clearScheduled = useCallback(() => {
    aiGenRef.current++;
    clearAiTimer();
    aiWorkerClient.cancelPending();
    aiBusyRef.current = false;
    dialogueManager.stop();
    for (const id of timeoutsRef.current) {
      clearTimeout(id);
    }
    timeoutsRef.current = [];
  }, [clearAiTimer]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const setCamera = useCallback((preset: CameraPreset) => {
    setCameraPresetState(preset);
    sceneRef.current?.setCameraPreset(preset);
    setTacticalCam(preset === 'CAM_BOARD_TACTICAL');
  }, []);

  const speakEvent = useCallback((event: DialogueEvent, isEndQuote = false) => {
    const engine = engineRef.current;
    if (!engine) return;
    const speaker = speakerFromPersonality(engine.mode === 'survival', activePersonalityRef.current);
    const entry = getDialogueLine(speaker, event, languageRef.current);
    if (!entry) return;
    dialogueManager.speak(entry, languageRef.current, {
      mode: dialogueAudioModeRef.current,
      muted: mutedRef.current,
      voiceVolume: voiceVolumeRef.current,
      immediate: isEndQuote,
      onSubtitleUpdate: (txt) => {
        if (isEndQuote) {
          setEndQuote(txt);
        } else {
          setSpeechText(txt);
        }
      },
      onSpeakingChange: (active) => {
        sceneRef.current?.setSpeaking(active);
      },
    });
  }, []);

  const syncAllFromEngine = useCallback((lastMoved?: { from: number; to: number }) => {
    const engine = engineRef.current;
    if (!engine) return;

    const activeColor = engine.getActiveColor();
    const inCheck = engine.board.isInCheck(activeColor);
    const snap = engine.getState();

    setHud({
      phase: engine.phase,
      activeActor: engine.activeActor,
      playerColor: engine.playerColor,
      playerHp: engine.playerHp,
      opponentHp: engine.opponentHp,
      maxHp: engine.maxHp,
      currentCard: engine.currentCard,
      movesLeft: engine.movesLeft,
      resurrectsLeft: engine.resurrectsLeft,
      deckCount: engine.deck.drawPile.length,
      isInCheck: inCheck,
      isKingVsKing: snap.isKingVsKing,
      drawOfferCooldownTurns: snap.drawOfferCooldownTurns,
      drawOfferLocked: snap.drawOfferLocked,
      winner: engine.winner,
      endReason: engine.endReason,
      stats: { ...engine.stats },
      resurrectOptions: engine.getResurrectOptionsForActive(),
    });

    sceneRef.current?.syncBoardState(
      engine.board,
      engine.playerColor,
      engine.movesLeft,
      engine.playerHp,
      engine.opponentHp,
      engine.deck.drawPile.length,
      lastMoved,
    );
  }, []);

  const handleMatchEnd = useCallback(
    (winner: MatchActor | 'draw', reason: MatchEndReason) => {
      const engine = engineRef.current;
      if (!engine) return;
      clearScheduled();
      soundManager.duckAmbient(false);
      aiBusyRef.current = false;
      isAnimatingRef.current = false;

      if (reason === 'draw_agreed') {
        speakEvent('draw_accepted', true);
      } else if (reason === 'resignation') {
        speakEvent('player_resigned', true);
      } else if (winner === 'player') {
        speakEvent('gameover_win', true);
      } else if (winner === 'opponent') {
        if (reason === 'revolver_hp_zero') {
          speakEvent('gameover_loss_revolver', true);
        } else {
          speakEvent('gameover_loss_checkmate', true);
        }
      } else {
        setEndQuote(null);
      }

      const outcome = winner === 'player' ? 'win' : winner === 'opponent' ? 'loss' : 'draw';
      const finalElapsedSec = Math.max(
        elapsedSecondsRef.current,
        Math.floor(
          (matchElapsedMsRef.current +
            (matchTimerAnchorRef.current !== null
              ? performance.now() - matchTimerAnchorRef.current
              : 0)) /
            1000,
        ),
      );
      setProfile((prev) => {
        const res = recordMatchOutcomeDetailed(prev, {
          mode: engine.mode,
          difficulty: engine.difficulty,
          personality: engine.personality,
          outcome,
          endReason: reason,
          coinsSurvived: engine.stats.coinsSurvived,
          shotsFired: engine.stats.shotsFired,
          playerHpRemaining: engine.playerHp,
          elapsedSeconds: finalElapsedSec,
          turnsPlayed: engine.stats.turnsPlayed,
          reverseOccurred: engine.stats.reverseOccurred,
          maxResurrectedSingleCard: engine.stats.maxResurrectedSingleCard,
          wonByWildCheckmate: engine.stats.wonByWildCheckmate,
        });
        setLastScoreBreakdown(res.scoreBreakdown);
        void leaderboardService.submitPlayerSnapshot(res.profile);
        if (res.newlyUnlocked.length > 0) {
          soundManager.playAchievementUnlock();
          setToastQueue((q) => [...q, ...res.newlyUnlocked]);
          res.newlyUnlocked.forEach((ach, idx) => {
            window.setTimeout(() => {
              setToastQueue((q) => q.filter((item) => item.id !== ach.id));
            }, 5600 + idx * 650);
          });
        }
        return res.profile;
      });
      if (!isTauri) {
        const nextGuest = recordWebGuestMatchCompleted();
        setGuestStatus(nextGuest);
        if (nextGuest.promptKind !== 'none') {
          setShowGuestModal(true);
        }
      }
      setScreen('gameover');
    },
    [clearScheduled, isTauri, speakEvent],
  );

  const processEvents = useCallback(
    (events: MatchEvent[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const lang = languageRef.current;
      const t = getTranslations(lang);

      for (const evt of events) {
        if (evt.type === 'CARD_DRAWN') {
          soundManager.playCardDraw();
          sceneRef.current?.triggerCardReveal(evt.card, evt.actor);

          if (evt.convertedFromResurrect) {
            setSpeechText(t.resurrectConverted);
          } else if (evt.card === 'BULLET') {
            speakEvent(
              evt.actor === 'player' ? 'bullet_drawn_by_player' : 'bullet_drawn_by_opponent',
            );
          } else if (evt.card === 'PLUS_2' || evt.card === 'PLUS_4') {
            speakEvent('resurrect_pieces');
          } else if (evt.actor === 'player') {
            if (evt.card === 'NUM_4' || evt.card === 'NUM_5') {
              speakEvent('player_draw_high');
            } else if (evt.card === 'SKIP') {
              speakEvent('player_draw_skip');
            }
          }
        } else if (evt.type === 'PIECE_MOVED' || evt.type === 'WILD_MOVED') {
          if (evt.actor === 'player') {
            soundManager.playPieceMove(evt.captured);
          } else {
            sceneRef.current?.triggerOpponentMove(evt.move.from, evt.move.to, evt.captured);
          }
          if (evt.captured) {
            sceneRef.current?.addCaptureBloodDecal(evt.move.to);
          }
          if (evt.isCheck) {
            soundManager.playCheck();
            if (!events.some((e) => e.type === 'MATCH_ENDED')) {
              speakEvent(evt.actor === 'player' ? 'check_to_opponent' : 'check_to_player');
            }
          }
          if (evt.type === 'PIECE_MOVED' && evt.streakInterrupted) {
            setSpeechText(t.streakBrokenCheck);
          }
        } else if (evt.type === 'BOARD_REVERSED') {
          soundManager.playReverse();
          speakEvent('reverse_board');
        } else if (evt.type === 'PIECE_RESURRECTED') {
          soundManager.playPieceMove(false);
          if (evt.actor === 'opponent') {
            sceneRef.current?.triggerOpponentReach(evt.square);
          }
        } else if (evt.type === 'BOARD_RESET_STALEMATE') {
          sceneRef.current?.clearCaptureBloodDecals();
          setSpeechText(t.stalemateReset);
        } else if (evt.type === 'COIN_RESOLVED') {
          isAnimatingRef.current = true;
          soundManager.duckAmbient(true);
          soundManager.playCoinPickup();
          sceneRef.current?.triggerCoinFlip(evt.actual, evt.drawer);
          setCamera('CAM_COIN_FLIP');

          schedule(() => soundManager.playCoinPing(), 800);
          schedule(() => soundManager.playCoinSlam(), 2350);
          schedule(() => soundManager.playHeartbeat(), 2750);
          schedule(() => soundManager.playHeartbeat(), 3100);

          if (!evt.guessedRight) {
            const playerHit = evt.guesser === 'player';
            const cockDelay = playerHit ? 1100 : 850;
            const shotDelay = playerHit ? 1600 : 1350;
            schedule(() => {
              soundManager.duckAmbient(false);
              setCamera('CAM_REVOLVER');
              soundManager.playRevolverPickup();
              sceneRef.current?.triggerRevolverShot(evt.guesser);
              schedule(() => {
                soundManager.playRevolverCock();
              }, cockDelay);
              schedule(() => {
                soundManager.playRevolverShot(playerHit);
                // Sync HP loss right on the exact frame of the gunshot so both 3D CRT console & HUD hearts flash/crack in sync!
                syncAllFromEngine();
                if (playerHit) {
                  setHitFlash(true);
                  setHitBlackout(true);
                  schedule(() => setHitFlash(false), 200);
                  schedule(() => setHitBlackout(false), 520);
                }
                speakEvent('coin_shot_hit');
              }, shotDelay);
            }, 4350);
          } else {
            schedule(() => {
              soundManager.duckAmbient(false);
              speakEvent('coin_survived');
            }, 4350);
          }
        } else if (evt.type === 'MATCH_ENDED') {
          const delay = evt.reason === 'revolver_hp_zero' ? 7350 : 1020;
          schedule(() => handleMatchEnd(evt.winner, evt.reason), delay);
        }
      }
    },
    [handleMatchEnd, schedule, setCamera, speakEvent, syncAllFromEngine],
  );

  const getAIMoveDelayMs = useCallback((eng: MatchEngine, isFollowUp: boolean): number => {
    if (eng.mode === 'light') {
      const pers = activePersonalityRef.current;
      if (pers === 'egoist') {
        return isFollowUp ? 720 : 450;
      }
      if (pers === 'calm') {
        // Calm Philosopher: deliberate 1200–2000ms contemplation before moving
        return 1200 + Math.floor(Math.random() * 800);
      }
      if (pers === 'unknown') {
        return isFollowUp ? 980 : 760 + Math.floor(Math.random() * 320);
      }
      return isFollowUp ? 980 : 750;
    }
    // Survival Mode (Dealer): match the 3-stage glove pickup/carry/return choreography
    return isFollowUp ? 1020 : 920;
  }, []);

  // Opponent AI Turn Runner (deadlock-proof, generation-guarded, strict try/catch/finally)
  const runAITurnIfNeeded = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || screenRef.current !== 'playing') return;
    const initState = engine.getState();
    if (initState.activeActor !== 'opponent' || initState.phase === 'MATCH_OVER') return;
    if (initState.phase === 'AWAIT_COIN_CHOICE') return;
    if (aiBusyRef.current) return;

    aiBusyRef.current = true;
    aiLastProgressRef.current = Date.now();
    const gen = aiGenRef.current;

    const aiDiff: AIDifficulty =
      engine.mode === 'light' ? activePersonalityRef.current : engine.difficulty;

    const recoverOrEndTurn = (eng: MatchEngine) => {
      const evts = eng.forceEndActiveTurn();
      if (evts.length > 0) processEvents(evts);
      syncAllFromEngine();
      aiLastProgressRef.current = Date.now();
    };

    const stepAI = async () => {
      const eng = engineRef.current;
      if (gen !== aiGenRef.current || !eng || screenRef.current !== 'playing') {
        aiBusyRef.current = false;
        return;
      }

      const st = eng.getState();
      if (st.activeActor !== 'opponent' || st.phase === 'MATCH_OVER' || st.phase === 'AWAIT_COIN_CHOICE') {
        aiBusyRef.current = false;
        return;
      }

      if (st.phase === 'PLAYER_MOVE_LOOP' && st.movesLeft <= 0) {
        recoverOrEndTurn(eng);
        aiBusyRef.current = false;
        return;
      }

      aiLastProgressRef.current = Date.now();
      let scheduledNext = false;

      try {
        if (st.phase === 'AWAIT_DRAW_CARD') {
          setCamera('CAM_IDLE');
          const evts = eng.drawCard();
          processEvents(evts);
          syncAllFromEngine();
          aiLastProgressRef.current = Date.now();

          const post = eng.getState();
          if (post.phase === 'AWAIT_COIN_CHOICE' || post.phase === 'MATCH_OVER') {
            return;
          }
          if (post.activeActor === 'opponent') {
            scheduledNext = true;
            const nextDelay =
              post.phase === 'PLAYER_MOVE_LOOP'
                ? getAIMoveDelayMs(eng, false)
                : 980;
            scheduleAiStep(() => {
              void stepAI();
            }, nextDelay);
          } else if (post.phase === 'AWAIT_DRAW_CARD') {
            setCamera('CAM_IDLE');
          }
          return;
        }

        if (st.phase === 'PLAYER_MOVE_LOOP') {
          let move = null;
          try {
            move = await aiWorkerClient.chooseMoveAsync(
              eng.board,
              eng.getActiveColor(),
              aiDiff,
              st.movesLeft,
              eng.recentPositionKeys,
            );
          } catch (err) {
            if (err instanceof Error && err.message === 'AI_CANCELLED') {
              return;
            }
            console.warn('[ChUno AI] Worker move computation failed, falling back to legal move', err);
          }

          if (gen !== aiGenRef.current || screenRef.current !== 'playing' || eng !== engineRef.current) {
            return;
          }
          const live = eng.getState();
          if (live.activeActor !== 'opponent' || live.phase !== 'PLAYER_MOVE_LOOP' || live.movesLeft <= 0) {
            return;
          }

          if (!move) {
            const fallbackLegal = generateLegalMoves(eng.board, eng.getActiveColor());
            move = fallbackLegal[0] ?? null;
          }
          if (!move) {
            recoverOrEndTurn(eng);
            return;
          }

          let evts: MatchEvent[];
          try {
            evts = eng.executeMove(move);
          } catch (err) {
            console.warn('[ChUno AI] executeMove rejected AI move, trying first legal move', err);
            const fallback = generateLegalMoves(eng.board, eng.getActiveColor())[0];
            if (!fallback) {
              recoverOrEndTurn(eng);
              return;
            }
            move = fallback;
            evts = eng.executeMove(fallback);
          }

          processEvents(evts);
          syncAllFromEngine({ from: move.from, to: move.to });
          aiLastProgressRef.current = Date.now();

          const post = eng.getState();
          if (
            post.activeActor === 'opponent' &&
            post.phase === 'PLAYER_MOVE_LOOP' &&
            post.movesLeft > 0
          ) {
            scheduledNext = true;
            scheduleAiStep(() => {
              void stepAI();
            }, getAIMoveDelayMs(eng, true));
          }
          return;
        }

        if (st.phase === 'AWAIT_RESURRECT_PLACEMENT') {
          let choice = null;
          try {
            choice = await aiWorkerClient.chooseResurrectionAsync(eng.board, eng.getActiveColor());
          } catch (err) {
            if (err instanceof Error && err.message === 'AI_CANCELLED') {
              return;
            }
          }

          if (gen !== aiGenRef.current || screenRef.current !== 'playing' || eng !== engineRef.current) {
            return;
          }
          const live = eng.getState();
          if (live.activeActor !== 'opponent' || live.phase !== 'AWAIT_RESURRECT_PLACEMENT') {
            return;
          }

          if (!choice) {
            const opts = eng.getResurrectOptionsForActive();
            if (opts.length > 0 && opts[0].legalSquares.length > 0) {
              choice = { pieceId: opts[0].pieceId, square: opts[0].legalSquares[0] };
            }
          }
          if (!choice) {
            recoverOrEndTurn(eng);
            return;
          }

          const evts = eng.executeResurrect(choice.pieceId, choice.square);
          processEvents(evts);
          syncAllFromEngine();
          aiLastProgressRef.current = Date.now();

          const post = eng.getState();
          if (post.activeActor === 'opponent' && post.phase === 'AWAIT_RESURRECT_PLACEMENT') {
            scheduledNext = true;
            scheduleAiStep(() => {
              void stepAI();
            }, 900);
          }
          return;
        }

        if (st.phase === 'AWAIT_WILD_ACTION') {
          let wild = null;
          try {
            wild = await aiWorkerClient.chooseWildActionAsync(eng.board, eng.getActiveColor(), aiDiff);
          } catch (err) {
            if (err instanceof Error && err.message === 'AI_CANCELLED') {
              return;
            }
          }

          if (gen !== aiGenRef.current || screenRef.current !== 'playing' || eng !== engineRef.current) {
            return;
          }
          const live = eng.getState();
          if (live.activeActor !== 'opponent' || live.phase !== 'AWAIT_WILD_ACTION') {
            return;
          }

          if (!wild) {
            const color = eng.getActiveColor();
            const eligible = getWildEligibleSquares(eng.board, color);
            for (const sq of eligible) {
              const moves = generateWildMoves(eng.board, sq, 'queen', color);
              if (moves.length > 0) {
                wild = { square: sq, targetType: 'queen' as const, move: moves[0] };
                break;
              }
            }
          }
          if (!wild) {
            recoverOrEndTurn(eng);
            return;
          }

          const evts = eng.executeWildMove(
            wild.square,
            wild.targetType,
            wild.move.to,
            wild.move.promotion,
          );
          processEvents(evts);
          syncAllFromEngine({ from: wild.move.from, to: wild.move.to });
          aiLastProgressRef.current = Date.now();
          return;
        }
      } catch (err) {
        console.warn('[ChUno AI] Unexpected error during opponent step; forcing turn recovery', err);
        if (eng === engineRef.current && eng.getState().activeActor === 'opponent') {
          recoverOrEndTurn(eng);
        }
      } finally {
        if (!scheduledNext) {
          aiBusyRef.current = false;
        }
      }
    };

    const initialDelay =
      engine.mode === 'light' && activePersonalityRef.current === 'egoist' ? 450 : 680;
    scheduleAiStep(() => {
      void stepAI();
    }, initialDelay);
  }, [getAIMoveDelayMs, processEvents, scheduleAiStep, setCamera, syncAllFromEngine]);

  // Anti-freeze Watchdog: if Opponent turn makes zero progress for >5s (outside coin/revolver anim), force recovery
  useEffect(() => {
    if (screen !== 'playing') return;
    const interval = window.setInterval(() => {
      const eng = engineRef.current;
      if (!eng || screenRef.current !== 'playing' || isAnimatingRef.current) return;
      const st = eng.getState();
      if (st.activeActor !== 'opponent' || st.phase === 'MATCH_OVER' || st.phase === 'AWAIT_COIN_CHOICE') {
        aiLastProgressRef.current = Date.now();
        return;
      }
      if (Date.now() - aiLastProgressRef.current >= 5000) {
        console.warn('[ChUno Watchdog] Opponent turn stalled for >5s; forcing recovery', st);
        aiGenRef.current++;
        clearAiTimer();
        aiWorkerClient.cancelPending();
        aiBusyRef.current = false;
        aiLastProgressRef.current = Date.now();

        if (st.phase === 'PLAYER_MOVE_LOOP' && st.movesLeft > 0) {
          const fallback = generateLegalMoves(eng.board, eng.getActiveColor())[0];
          if (fallback) {
            const evts = eng.executeMove(fallback);
            processEvents(evts);
            syncAllFromEngine({ from: fallback.from, to: fallback.to });
            if (eng.getState().activeActor === 'opponent' && eng.getState().phase !== 'MATCH_OVER') {
              runAITurnIfNeeded();
            }
            return;
          }
        }
        const evts = eng.forceEndActiveTurn();
        if (evts.length > 0) processEvents(evts);
        syncAllFromEngine();
        if (eng.getState().activeActor === 'opponent' && eng.getState().phase !== 'MATCH_OVER') {
          runAITurnIfNeeded();
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clearAiTimer, processEvents, runAITurnIfNeeded, screen, syncAllFromEngine]);

  const clearSelection = useCallback(() => {
    setSelectedSq(null);
    setWildSelectedSq(null);
    setWildTargetType(null);
    setPendingPromoMove(null);
    setSelectedResurrectId(null);
    sceneRef.current?.setHighlights(null, []);
  }, []);

  const handleDrawCard = useCallback(() => {
    const onlineState = onlineRoomStateRef.current;
    if (onlineState && onlineState.phase !== 'LOBBY') {
      if (
        screenRef.current === 'playing' &&
        onlineState.phase === 'AWAIT_DRAW_CARD' &&
        onlineState.activeSeat === onlineState.yourSeat
      ) {
        soundManager.playClick();
        onlineClientRef.current?.drawCard();
      }
      return;
    }

    const engine = engineRef.current;
    if (!engine || screenRef.current !== 'playing') return;
    if (isAnimatingRef.current) return;
    if (engine.activeActor !== 'player' || engine.phase !== 'AWAIT_DRAW_CARD') return;

    isAnimatingRef.current = true;
    clearSelection();
    setCamera('CAM_CARD_DRAW');
    const evts = engine.drawCard();
    processEvents(evts);
    syncAllFromEngine();

    const postPhase = engine.getPhase();
    const postActor = engine.getActiveActor();
    if (
      postPhase === 'PLAYER_MOVE_LOOP' ||
      postPhase === 'AWAIT_WILD_ACTION' ||
      postPhase === 'AWAIT_RESURRECT_PLACEMENT'
    ) {
      if (postPhase === 'AWAIT_WILD_ACTION') {
        const eligible = getWildEligibleSquares(engine.board, engine.getActiveColor());
        sceneRef.current?.setHighlights(null, eligible);
      }
      schedule(() => {
        isAnimatingRef.current = false;
        if (screenRef.current === 'playing' && engineRef.current?.getActiveActor() === 'player') {
          setCamera('CAM_BOARD_TACTICAL');
        }
      }, 950);
    } else if (postPhase === 'AWAIT_COIN_CHOICE') {
      // Player drew Bullet -> AI randomly calls Heads or Tails, then flip resolves!
      schedule(() => {
        const eng = engineRef.current;
        if (!eng || eng.getPhase() !== 'AWAIT_COIN_CHOICE') {
          isAnimatingRef.current = false;
          return;
        }
        const aiCall: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
        const coinEvts = eng.resolveCoinFlip(aiCall);
        const shotWillFire = coinEvts.some((e) => e.type === 'COIN_RESOLVED' && !e.guessedRight);
        processEvents(coinEvts);
        // When a gunshot will fire, hold back HP sync until the exact gunshot frame so hearts crack in sync
        if (!shotWillFire) {
          syncAllFromEngine();
        }
        const afterCoinPhase = eng.getPhase();
        if (afterCoinPhase !== 'MATCH_OVER') {
          const waitAfterShot = shotWillFire ? 7300 : 4950;
          schedule(() => {
            isAnimatingRef.current = false;
            syncAllFromEngine();
            setCamera('CAM_IDLE');
            runAITurnIfNeeded();
          }, waitAfterShot);
        } else {
          isAnimatingRef.current = false;
        }
      }, 1150);
    } else if (postActor === 'opponent') {
      schedule(() => {
        isAnimatingRef.current = false;
        setCamera('CAM_IDLE');
        runAITurnIfNeeded();
      }, 1100);
    } else {
      isAnimatingRef.current = false;
    }
  }, [clearSelection, processEvents, runAITurnIfNeeded, schedule, setCamera, syncAllFromEngine]);

  const handleSquareClick = useCallback(
    (sq: number) => {
      const onlineState = onlineRoomStateRef.current;
      if (onlineState && onlineState.phase !== 'LOBBY') {
        if (screenRef.current !== 'playing' || !onlineState.board) return;
        if (onlineState.activeSeat !== onlineState.yourSeat) return;
        const mySlot = onlineState.players[onlineState.yourSeat];
        if (!mySlot) return;
        const board = BoardState.fromSnapshot(onlineState.board);
        const myColor = mySlot.color;

        if (onlineState.phase === 'PLAYER_MOVE_LOOP') {
          const curSel = selectedSqRef.current;
          if (curSel !== null) {
            const legalFromSel = generateLegalMovesForSquare(board, curSel, myColor);
            const matching = legalFromSel.filter((m) => m.to === sq);
            if (matching.length > 0) {
              if (matching.some((m) => m.promotion)) {
                setPendingPromoMove({ from: curSel, to: sq });
                return;
              }
              clearSelection();
              soundManager.playClick();
              onlineClientRef.current?.movePiece(curSel, sq);
              return;
            }
          }
          const clickedPiece = board.squares[sq];
          if (clickedPiece && clickedPiece.color === myColor) {
            const legal = generateLegalMovesForSquare(board, sq, myColor);
            setSelectedSq(sq);
            sceneRef.current?.setHighlights(sq, legal.map((m) => m.to));
            soundManager.playClick();
          } else {
            clearSelection();
          }
          return;
        }

        if (onlineState.phase === 'AWAIT_WILD_ACTION') {
          const wSq = wildSelectedSqRef.current;
          const wTarget = wildTargetTypeRef.current;
          if (wSq !== null && wTarget !== null) {
            const wildMoves = generateWildMoves(board, wSq, wTarget, myColor);
            const matching = wildMoves.filter((m) => m.to === sq);
            if (matching.length > 0) {
              if (matching.some((m) => m.promotion)) {
                setPendingPromoMove({ from: wSq, to: sq });
                return;
              }
              clearSelection();
              soundManager.playClick();
              onlineClientRef.current?.wildMove(wSq, wTarget, sq);
              return;
            }
          }
          const eligible = getWildEligibleSquares(board, myColor);
          if (eligible.includes(sq)) {
            setWildSelectedSq(sq);
            setWildTargetType(null);
            sceneRef.current?.setHighlights(sq, []);
            soundManager.playClick();
          }
          return;
        }

        if (onlineState.phase === 'AWAIT_RESURRECT_PLACEMENT') {
          const pieceId = selectedResurrectIdRef.current;
          if (pieceId === null) return;
          const piece = board.graveyard[myColor].find((p) => p.id === pieceId);
          if (!piece) return;
          const legalSquares = getLegalResurrectSquares(board, myColor, piece.type);
          if (legalSquares.includes(sq)) {
            clearSelection();
            soundManager.playClick();
            onlineClientRef.current?.resurrectPiece(pieceId, sq);
          }
        }
        return;
      }

      const engine = engineRef.current;
      if (!engine || screenRef.current !== 'playing') return;
      if (engine.activeActor !== 'player') return;

      const playerColor = engine.playerColor;

      // 1. Standard move loop
      if (engine.phase === 'PLAYER_MOVE_LOOP') {
        const curSel = selectedSqRef.current;
        if (curSel !== null) {
          const legalFromSel = generateLegalMovesForSquare(engine.board, curSel, playerColor);
          const matchingMoves = legalFromSel.filter((m) => m.to === sq);
          if (matchingMoves.length > 0) {
            if (matchingMoves.some((m) => m.promotion)) {
              setPendingPromoMove({ from: curSel, to: sq });
              return;
            }
            const mv = matchingMoves[0];
            clearSelection();
            const evts = engine.executeMove(mv);
            processEvents(evts);
            syncAllFromEngine({ from: mv.from, to: mv.to });
            const nextActor = engine.getActiveActor();
            const nextPhase = engine.getPhase();
            if (nextActor === 'opponent' && nextPhase !== 'MATCH_OVER') {
              setCamera('CAM_IDLE');
              runAITurnIfNeeded();
            }
            return;
          }
        }

        // Otherwise select clicked own piece
        const clickedPiece = engine.board.squares[sq];
        if (clickedPiece && clickedPiece.color === playerColor) {
          const legal = generateLegalMovesForSquare(engine.board, sq, playerColor);
          setSelectedSq(sq);
          sceneRef.current?.setHighlights(
            sq,
            legal.map((m) => m.to),
          );
          soundManager.playClick();
        } else {
          clearSelection();
        }
        return;
      }

      // 2. Wild Action
      if (engine.phase === 'AWAIT_WILD_ACTION') {
        const wSq = wildSelectedSqRef.current;
        const wTarget = wildTargetTypeRef.current;

        if (wSq !== null && wTarget !== null) {
          const wildMoves = generateWildMoves(engine.board, wSq, wTarget, playerColor);
          const matching = wildMoves.filter((m) => m.to === sq);
          if (matching.length > 0) {
            if (matching.some((m) => m.promotion)) {
              setPendingPromoMove({ from: wSq, to: sq });
              return;
            }
            const mv = matching[0];
            clearSelection();
            const evts = engine.executeWildMove(wSq, wTarget, mv.to);
            processEvents(evts);
            syncAllFromEngine({ from: mv.from, to: mv.to });
            const nextActor = engine.getActiveActor();
            const nextPhase = engine.getPhase();
            if (nextActor === 'opponent' && nextPhase !== 'MATCH_OVER') {
              setCamera('CAM_IDLE');
              runAITurnIfNeeded();
            }
            return;
          }
        }

        const eligible = getWildEligibleSquares(engine.board, playerColor);
        if (eligible.includes(sq)) {
          setWildSelectedSq(sq);
          setWildTargetType(null);
          sceneRef.current?.setHighlights(sq, []);
          soundManager.playClick();
        }
        return;
      }

      // 3. Resurrection Placement
      if (engine.phase === 'AWAIT_RESURRECT_PLACEMENT') {
        const pieceId = selectedResurrectIdRef.current;
        if (pieceId === null) return;
        const piece = engine.board.graveyard[playerColor].find((p) => p.id === pieceId);
        if (!piece) return;

        const legalSquares = getLegalResurrectSquares(engine.board, playerColor, piece.type);
        if (legalSquares.includes(sq)) {
          const evts = engine.executeResurrect(pieceId, sq);
          processEvents(evts);
          clearSelection();
          syncAllFromEngine();
          const nextActor = engine.getActiveActor();
          const nextPhase = engine.getPhase();
          if (nextActor === 'opponent' && nextPhase !== 'MATCH_OVER') {
            setCamera('CAM_IDLE');
            runAITurnIfNeeded();
          }
        }
      }
    },
    [clearSelection, processEvents, runAITurnIfNeeded, setCamera, syncAllFromEngine],
  );

  const handlePickWildTarget = useCallback((targetType: Exclude<PieceType, 'king'>) => {
    const onlineState = onlineRoomStateRef.current;
    const wSq = wildSelectedSqRef.current;
    if (onlineState && onlineState.phase === 'AWAIT_WILD_ACTION' && onlineState.board && wSq !== null) {
      const mySlot = onlineState.players[onlineState.yourSeat];
      if (!mySlot) return;
      const board = BoardState.fromSnapshot(onlineState.board);
      setWildTargetType(targetType);
      const moves = generateWildMoves(board, wSq, targetType, mySlot.color);
      sceneRef.current?.setHighlights(wSq, moves.map((m) => m.to));
      soundManager.playClick();
      return;
    }

    const engine = engineRef.current;
    if (!engine || wSq === null) return;

    setWildTargetType(targetType);
    const moves = generateWildMoves(engine.board, wSq, targetType, engine.playerColor);
    sceneRef.current?.setHighlights(
      wSq,
      moves.map((m) => m.to),
    );
    soundManager.playClick();
  }, []);

  const handlePickPromotion = useCallback(
    (promo: PromotablePieceType) => {
      const onlineState = onlineRoomStateRef.current;
      if (onlineState && onlineState.phase !== 'LOBBY' && pendingPromoMove) {
        const { from, to } = pendingPromoMove;
        const wTarget = wildTargetTypeRef.current;
        clearSelection();
        if (onlineState.phase === 'AWAIT_WILD_ACTION' && wTarget) {
          onlineClientRef.current?.wildMove(from, wTarget, to, promo);
        } else {
          onlineClientRef.current?.movePiece(from, to, promo);
        }
        return;
      }

      const engine = engineRef.current;
      if (!engine || !pendingPromoMove) return;

      const { from, to } = pendingPromoMove;
      clearSelection();

      let evts: MatchEvent[] = [];
      if (engine.phase === 'AWAIT_WILD_ACTION' && wildTargetTypeRef.current) {
        evts = engine.executeWildMove(from, wildTargetTypeRef.current, to, promo);
      } else {
        evts = engine.executeMove({ from, to, promotion: promo });
      }
      processEvents(evts);
      syncAllFromEngine({ from, to });

      if (engine.activeActor === 'opponent' && engine.phase !== 'MATCH_OVER') {
        setCamera('CAM_IDLE');
        runAITurnIfNeeded();
      }
    },
    [clearSelection, pendingPromoMove, processEvents, runAITurnIfNeeded, setCamera, syncAllFromEngine],
  );

  const handleSelectResurrectPiece = useCallback((pieceId: number) => {
    const onlineState = onlineRoomStateRef.current;
    if (onlineState && onlineState.phase === 'AWAIT_RESURRECT_PLACEMENT' && onlineState.board) {
      const mySlot = onlineState.players[onlineState.yourSeat];
      if (!mySlot) return;
      const board = BoardState.fromSnapshot(onlineState.board);
      const piece = board.graveyard[mySlot.color].find((p) => p.id === pieceId);
      if (!piece) return;
      const squares = getLegalResurrectSquares(board, mySlot.color, piece.type);
      setSelectedResurrectId(pieceId);
      sceneRef.current?.setHighlights(null, squares);
      soundManager.playClick();
      return;
    }

    const engine = engineRef.current;
    if (!engine) return;
    const piece = engine.board.graveyard[engine.playerColor].find((p) => p.id === pieceId);
    if (!piece) return;
    const squares = getLegalResurrectSquares(engine.board, engine.playerColor, piece.type);
    setSelectedResurrectId(pieceId);
    sceneRef.current?.setHighlights(null, squares);
    soundManager.playClick();
  }, []);

  const handlePickCoinSide = useCallback(
    (side: CoinSide) => {
      const onlineState = onlineRoomStateRef.current;
      if (onlineState && onlineState.phase === 'AWAIT_COIN_CHOICE') {
        if (onlineState.actingSeat === onlineState.yourSeat) {
          soundManager.playClick();
          onlineClientRef.current?.coinChoice(side);
        }
        return;
      }

      const engine = engineRef.current;
      if (!engine || engine.phase !== 'AWAIT_COIN_CHOICE' || engine.activeActor !== 'opponent') {
        return;
      }
      const coinEvts = engine.resolveCoinFlip(side);
      const shotWillFire = coinEvts.some((e) => e.type === 'COIN_RESOLVED' && !e.guessedRight);
      processEvents(coinEvts);
      if (!shotWillFire) {
        syncAllFromEngine();
      }

      const afterPhase = engine.getPhase();
      if (afterPhase !== 'MATCH_OVER') {
        const waitAfterShot = shotWillFire ? 7400 : 4950;
        schedule(() => {
          isAnimatingRef.current = false;
          syncAllFromEngine();
          setCamera('CAM_IDLE');
          const afterActor = engine.getActiveActor();
          if (afterActor === 'opponent') {
            runAITurnIfNeeded();
          }
        }, waitAfterShot);
      } else {
        isAnimatingRef.current = false;
      }
    },
    [processEvents, runAITurnIfNeeded, schedule, setCamera, syncAllFromEngine],
  );

  const startNewMatch = useCallback(
    (targetMode: GameMode = mode, targetDiff: DifficultyLevel = difficulty) => {
      if (!isTauri) {
        const currentGuest = getWebGuestStatus();
        setGuestStatus(currentGuest);
        if (currentGuest.isLocked) {
          setShowGuestModal(true);
          return;
        }
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      clearScheduled();
      soundManager.duckAmbient(false);
      aiBusyRef.current = false;
      isAnimatingRef.current = false;
      clearSelection();
      setSpeechText(null);
      setEndQuote(null);
      setPlayerEmote(null);
      setOpponentEmote(null);
      setEmoteLastSentAt(0);
      setOpponentEmotesMuted(false);
      setHitFlash(false);
      setHitBlackout(false);
      setLastScoreBreakdown(null);

      // Reset match timer strictly to 00:00
      matchElapsedMsRef.current = 0;
      matchTimerAnchorRef.current = performance.now();
      setElapsedSeconds(0);

      const chosenPersonality: LightPersonality = personalityOpt;
      activePersonalityRef.current = chosenPersonality;
      setActivePersonality(chosenPersonality);

      const engine = new MatchEngine({
        mode: targetMode,
        difficulty: targetDiff,
        personality: chosenPersonality,
      });
      engineRef.current = engine;

      sceneRef.current?.setUnknownNightProgress(0);
      sceneRef.current?.rebuildWorld(targetMode, chosenPersonality, engine.maxHp, targetDiff);
      syncAllFromEngine();
      setCamera('CAM_IDLE');
      setScreen('playing');
      soundManager.startAmbient(targetMode);
      soundManager.playMusicTrack(targetMode);
      speakEvent(targetMode === 'survival' && targetDiff === 'hard' ? 'match_start_hard' : 'match_start');
    },
    [clearScheduled, clearSelection, difficulty, mode, personalityOpt, setCamera, speakEvent, syncAllFromEngine],
  );

  // Sync document.body.dataset.state for testability & game shell hygiene
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Reactive 4-folder background music router with seamless crossfade:
  // - Menu Survival -> survival/
  // - Match Survival -> survival/ (continues seamlessly without restart!)
  // - Menu Friendly (even with Unknown selected) -> friendly/
  // - Match Friendly vs Unknown -> unknown/ (1.2s crossfade, falls back to friendly_background/ if empty)
  // - Match Friendly vs others -> friendly_background/
  useEffect(() => {
    if (screen === 'title') {
      soundManager.setMusicChannel(mode === 'survival' ? 'survival' : 'friendly', 'menu');
    } else if (mode === 'survival') {
      soundManager.setMusicChannel('survival', 'game');
    } else {
      soundManager.setMusicChannel(
        activePersonality === 'unknown' ? 'unknown' : 'friendly_background',
        'game',
      );
    }
  }, [screen, mode, activePersonality]);

  // Day -> Sunset -> Moonlit Night atmosphere progression exclusively during matches against Unknown
  useEffect(() => {
    if (screen !== 'title' && mode === 'light' && activePersonality === 'unknown') {
      const fullTurns = Math.floor(hud.stats.turnsPlayed / 2);
      sceneRef.current?.setUnknownNightProgress(computeUnknownNightTarget(fullTurns));
    } else {
      sceneRef.current?.setUnknownNightProgress(0);
    }
  }, [screen, mode, activePersonality, hud.stats.turnsPlayed]);

  // 1 Hz Match Timer using performance.now() delta; pauses on Pause / Modals and stops on Game Over
  useEffect(() => {
    const isTimerRunning =
      screen === 'playing' &&
      !showRules &&
      !showGodot &&
      !showLeaderboard &&
      !showAudioSettings &&
      !showFriendsModal.open &&
      !desktopOnlyModal.open;
    if (!isTimerRunning) return;

    matchTimerAnchorRef.current = performance.now();
    const tickTimer = () => {
      if (matchTimerAnchorRef.current === null) return;
      const totalMs = matchElapsedMsRef.current + (performance.now() - matchTimerAnchorRef.current);
      const secs = Math.floor(totalMs / 1000);
      setElapsedSeconds((prev) => (prev === secs ? prev : secs));
    };

    const intervalId = window.setInterval(tickTimer, 1000);
    return () => {
      window.clearInterval(intervalId);
      if (matchTimerAnchorRef.current !== null) {
        matchElapsedMsRef.current += performance.now() - matchTimerAnchorRef.current;
        matchTimerAnchorRef.current = null;
        const secs = Math.floor(matchElapsedMsRef.current / 1000);
        setElapsedSeconds((prev) => (prev === secs ? prev : secs));
      }
    };
  }, [
    screen,
    showRules,
    showGodot,
    showLeaderboard,
    showAudioSettings,
    showFriendsModal.open,
    desktopOnlyModal.open,
  ]);

  // Keep 3D tabletop clocks (Survival CRT console & Light wooden chess clock) strictly synced at 1 Hz
  useEffect(() => {
    sceneRef.current?.setMatchTimeSeconds(elapsedSeconds);
  }, [elapsedSeconds]);

  // Mount Three.js scene once
  const callbacksRef = useRef({
    onSquareClick: handleSquareClick,
    onDeckClick: handleDrawCard,
    onSquareHover: (_sq: number | null) => {},
  });
  callbacksRef.current = {
    onSquareClick: handleSquareClick,
    onDeckClick: handleDrawCard,
    onSquareHover: (_sq: number | null) => {},
  };

  useEffect(() => {
    if (!canvasMountRef.current) return;
    const ctrl = new ChUnoSceneController(
      canvasMountRef.current,
      {
        onSquareClick: (sq) => callbacksRef.current.onSquareClick(sq),
        onDeckClick: () => callbacksRef.current.onDeckClick(),
        onSquareHover: (sq) => callbacksRef.current.onSquareHover(sq),
        onFpsSample: (fps) => setFpsValue(fps),
      },
      {
        quality: profile.settings.graphicsQuality,
        showFps: profile.settings.showFps,
      },
    );
    sceneRef.current = ctrl;

    // Show initial Friendly Mode chessboard pieces in title showcase
    const previewEngine = new MatchEngine({
      mode: 'light',
      difficulty: 'easy',
      personality: 'unknown',
    });
    ctrl.syncBoardState(previewEngine.board, 'white', 0, 3, 3, 40);
    ctrl.setCameraPreset('CAM_TITLE');
    soundManager.playMusicTrack('menu');

    // Support ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startNewMatch('light', 'easy');
    }

    return () => {
      if (modeFadeTimerRef.current !== null) {
        window.clearTimeout(modeFadeTimerRef.current);
      }
      clearScheduled();
      soundManager.stopAmbient();
      soundManager.playMusicTrack(null);
      ctrl.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cached zero-rebuild 3D preview switching on Title Screen
  const syncTitlePreview = useCallback(
    (nextMode: GameMode, nextDiff: DifficultyLevel, nextPers: LightPreviewAvatar) => {
      if (screenRef.current !== 'title' || !sceneRef.current) return;
      const hp = nextDiff === 'easy' ? 3 : nextDiff === 'medium' ? 2 : 1;
      sceneRef.current.rebuildWorld(nextMode, nextPers, hp, nextDiff);
      const preview = new MatchEngine({ mode: nextMode, difficulty: nextDiff, personality: nextPers });
      sceneRef.current.syncBoardState(preview.board, 'white', 0, hp, hp, 40);
      sceneRef.current.setCameraPreset('CAM_TITLE');
    },
    [],
  );

  const handleChangeMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode === mode) return;
      setModeTransitioning(true);
      if (modeFadeTimerRef.current !== null) {
        window.clearTimeout(modeFadeTimerRef.current);
      }
      let effectiveDiff = difficulty;
      if (nextMode === 'survival' && !userPickedSurvivalDifficultyRef.current) {
        effectiveDiff = 'easy';
        setDifficulty('easy');
      }
      setMode(nextMode);
      syncTitlePreview(nextMode, effectiveDiff, personalityOpt);
      modeFadeTimerRef.current = window.setTimeout(() => {
        modeFadeTimerRef.current = null;
        setModeTransitioning(false);
      }, 220);
    },
    [difficulty, mode, personalityOpt, syncTitlePreview],
  );

  const handleChangeDifficulty = useCallback((nextDiff: DifficultyLevel) => {
    userPickedSurvivalDifficultyRef.current = true;
    setDifficulty(nextDiff);
    if (screenRef.current === 'title' && sceneRef.current) {
      // Smooth real-time morph of Dealer eyes/brows/posture/lighting & HP monitor without rebuilding the scene
      sceneRef.current.setSurvivalDifficulty(nextDiff);
    }
  }, []);

  const handleChangePersonality = useCallback((nextPers: LightPreviewAvatar) => {
    setPersonalityOpt(nextPers);
    if (screenRef.current === 'title' && sceneRef.current) {
      // Instant .visible toggle across cached Light NPC rigs without rebuilding the meadow/board
      sceneRef.current.setLightPersonality(nextPers);
    }
  }, []);

  const handleChangeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setProfile((prev) => {
      const next = { ...prev, language: lang };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, graphicsQuality: quality },
      };
      saveProfile(next);
      sceneRef.current?.setGraphicsSettings({
        quality: next.settings.graphicsQuality,
        showFps: next.settings.showFps,
      });
      return next;
    });
  }, []);

  const handleToggleShowFps = useCallback(() => {
    setProfile((prev) => {
      const showFps = !prev.settings.showFps;
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, showFps },
      };
      saveProfile(next);
      sceneRef.current?.setGraphicsSettings({
        quality: next.settings.graphicsQuality,
        showFps,
      });
      if (!showFps) setFpsValue(null);
      return next;
    });
  }, []);

  const handleChangeMusicVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    soundManager.setMusicVolume(clamped);
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, musicVolume: clamped },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeSfxVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    soundManager.setSfxVolume(clamped);
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, sfxVolume: clamped },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeVoiceVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    soundManager.setVoiceVolume(clamped);
    dialogueManager.setLiveVolume(clamped, mutedRef.current);
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, voiceVolume: clamped },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeDialogueAudioMode = useCallback((dialogueAudioMode: DialogueAudioMode) => {
    if (dialogueAudioMode === 'off') {
      dialogueManager.stop();
    }
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, dialogueAudioMode },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleTestVoice = useCallback(() => {
    soundManager.unlockAudio();
    if (mutedRef.current) return;
    const effectiveSlider = voiceVolumeRef.current > 0.01 ? voiceVolumeRef.current : 0.6;
    if (dialogueAudioModeRef.current !== 'tts') {
      handleChangeDialogueAudioMode('tts');
    }
    dialogueManager.playTestSample(languageRef.current, {
      muted: false,
      voiceVolume: effectiveSlider,
    });
  }, [handleChangeDialogueAudioMode]);

  const handleToggleMenuMusic = useCallback(() => {
    setProfile((prev) => {
      const enabled = !prev.settings.menuMusicEnabled;
      soundManager.setMenuMusicEnabled(enabled);
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, menuMusicEnabled: enabled },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleToggleGameMusic = useCallback(() => {
    setProfile((prev) => {
      const enabled = !prev.settings.gameMusicEnabled;
      soundManager.setGameMusicEnabled(enabled);
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, gameMusicEnabled: enabled },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeMusicTrackPreference = useCallback((pref: MusicTrackPreference) => {
    soundManager.setMusicTrackPreference(pref);
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, musicTrackPreference: pref },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleCycleMusicTrack = useCallback(() => {
    soundManager.playClick();
    setProfile((prev) => {
      const nextPref = getNextMusicTrackPreference(
        prev.settings.musicTrackPreference ?? 'auto',
        1,
      );
      soundManager.setMusicTrackPreference(nextPref);
      const next: PlayerProfile = {
        ...prev,
        settings: { ...prev.settings, musicTrackPreference: nextPref },
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const nextMuted = !prev;
      soundManager.setMuted(nextMuted);
      if (nextMuted) {
        dialogueManager.stop();
      }
      setProfile((p) => {
        const next = { ...p, muted: nextMuted };
        saveProfile(next);
        return next;
      });
      return nextMuted;
    });
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    setCamera(tacticalCamRef.current ? 'CAM_IDLE' : 'CAM_BOARD_TACTICAL');
  }, [setCamera]);

  const handlePause = useCallback(() => {
    aiGenRef.current++;
    clearAiTimer();
    aiWorkerClient.cancelPending();
    aiBusyRef.current = false;
    dialogueManager.stop();
    setScreen('paused');
  }, [clearAiTimer]);

  const handleResume = useCallback(() => {
    setScreen('playing');
    const eng = engineRef.current;
    if (eng && eng.activeActor === 'opponent' && eng.phase !== 'MATCH_OVER') {
      window.setTimeout(() => runAITurnIfNeeded(), 60);
    }
  }, [runAITurnIfNeeded]);

  const handleOfferDraw = useCallback(() => {
    const onlineState = onlineRoomStateRef.current;
    if (onlineState && onlineState.phase !== 'LOBBY' && onlineState.phase !== 'MATCH_OVER') {
      soundManager.playClick();
      if (onlineState.drawOfferFrom && onlineState.drawOfferFrom !== onlineState.yourSeat) {
        onlineClientRef.current?.acceptDraw();
      } else {
        onlineClientRef.current?.offerDraw();
      }
      return;
    }

    const engine = engineRef.current;
    if (!engine) return;
    if (screenRef.current !== 'playing' && screenRef.current !== 'paused') return;
    if (engine.phase === 'MATCH_OVER') return;

    soundManager.playClick();
    const aiEval = evaluateBoard(engine.board, engine.opponentColor);
    const res = engine.offerDraw(aiEval);
    if (res.accepted) {
      syncAllFromEngine();
      handleMatchEnd('draw', 'draw_agreed');
    } else if (res.reason === 'dealer_hard_refusal') {
      syncAllFromEngine();
      speakEvent('draw_declined_hard');
    } else if (res.reason === 'dealer_early_refusal') {
      syncAllFromEngine();
      speakEvent('draw_declined_early');
    } else if (res.reason === 'declined') {
      syncAllFromEngine();
      speakEvent('draw_declined');
    }
  }, [handleMatchEnd, speakEvent, syncAllFromEngine]);

  const handleResign = useCallback(() => {
    const onlineState = onlineRoomStateRef.current;
    if (onlineState && onlineState.phase !== 'LOBBY' && onlineState.phase !== 'MATCH_OVER') {
      soundManager.playClick();
      onlineClientRef.current?.resign();
      return;
    }

    const engine = engineRef.current;
    if (!engine) return;
    if (screenRef.current !== 'playing' && screenRef.current !== 'paused') return;
    if (engine.phase === 'MATCH_OVER') return;

    soundManager.playClick();
    engine.resign('player');
    syncAllFromEngine();
    handleMatchEnd('opponent', 'resignation');
  }, [handleMatchEnd, syncAllFromEngine]);

  const handleOpenRules = useCallback(() => setShowRules(true), []);
  const handleOpenGodot = useCallback(() => setShowGodot(true), []);
  const handleOpenAudioSettings = useCallback(() => setShowAudioSettings(true), []);
  const handleOpenLeaderboard = useCallback(() => setShowLeaderboard('leaderboard'), []);
  const handleOpenProfile = useCallback(() => setShowProfile(true), []);
  const applyOnlineRoomState = useCallback(
    (state: OnlineRoomView, events?: OnlineMatchEvent[], summary?: OnlineMatchEndSummary) => {
      const prevState = onlineRoomStateRef.current;
      onlineClockOffsetRef.current = state.serverNow - Date.now();
      setOnlineRoomState(state);
      setOnlineErrorCode(null);

      if (state.phase === 'LOBBY') {
        onlineMatchActiveRef.current = false;
        setOnlineEndSummary(null);
        return;
      }

      const mySeat = state.yourSeat;
      const oppSeat = mySeat === 'host' ? 'guest' : 'host';
      const mySlot = state.players[mySeat];
      const oppSlot = state.players[oppSeat];
      if (!mySlot || !oppSlot) return;

      const targetGameMode: GameMode = state.mode === 'survival' ? 'survival' : 'light';
      const targetDiff: DifficultyLevel =
        state.startingHp === 1 ? 'hard' : state.startingHp === 2 ? 'medium' : 'easy';

      // Transition from lobby or rematch into active 3D match
      const justEnteredMatch =
        !onlineMatchActiveRef.current || (state.phase !== 'MATCH_OVER' && screenRef.current !== 'playing');
      const oppAv: AvatarId = isValidAvatarId(oppSlot.avatarId) ? oppSlot.avatarId : 'strategist';
      if (justEnteredMatch) {
        onlineMatchActiveRef.current = true;
        setOnlineLobbySubMode(null);
        setOnlineEndSummary(null);
        setMode(targetGameMode);
        setDifficulty(targetDiff);
        sceneRef.current?.rebuildWorld(targetGameMode, 'calm', state.maxHp, targetDiff);
        sceneRef.current?.setOnlineOpponentAvatar(oppAv, oppSlot.nickname);
        soundManager.playMusicTrack(targetGameMode);
        setCamera('CAM_IDLE');
        setScreen('playing');
      } else {
        sceneRef.current?.setOnlineOpponentAvatar(oppAv, oppSlot.nickname);
      }

      // Auto-sync known friend's latest nickname/avatar and increment matchesTogether on match completion
      const justFinishedMatch =
        (state.phase === 'MATCH_OVER' || Boolean(summary)) && prevState?.phase !== 'MATCH_OVER';
      if (oppSlot.friendCode) {
        setProfile((prev) => {
          const synced = syncFriendMatchPresence(
            prev,
            {
              friendCode: oppSlot.friendCode,
              nickname: oppSlot.nickname,
              avatarId: oppSlot.avatarId,
            },
            justFinishedMatch,
          );
          if (synced !== prev) saveProfile(synced);
          return synced;
        });
      }

      if (state.board) {
        const board = BoardState.fromSnapshot(state.board);
        sceneRef.current?.syncBoardState(
          board,
          mySlot.color,
          state.movesLeft,
          mySlot.hp,
          oppSlot.hp,
          state.deckCount,
        );
        if (state.phase === 'AWAIT_WILD_ACTION' && state.activeSeat === mySeat) {
          const eligible = getWildEligibleSquares(board, mySlot.color);
          sceneRef.current?.setHighlights(null, eligible);
        } else if (state.activeSeat !== mySeat || state.phase === 'AWAIT_DRAW_CARD') {
          sceneRef.current?.setHighlights(null, []);
        }
      }

      // Automatic camera transitions matching solo ChUno (draw -> top-down tactical for moves/wild/revive -> idle)
      if (!justEnteredMatch) {
        const camPlan = resolveOnlineAutoCamera({
          prevPhase: prevState?.phase ?? null,
          prevActiveSeat: prevState?.activeSeat ?? null,
          nextPhase: state.phase,
          nextActiveSeat: state.activeSeat,
          yourSeat: mySeat,
          events,
        });
        if (camPlan.immediatePreset) {
          if (onlineCameraTimerRef.current !== null) {
            window.clearTimeout(onlineCameraTimerRef.current);
            onlineCameraTimerRef.current = null;
          }
          setCamera(camPlan.immediatePreset);
        }
        if (camPlan.delayedPreset && camPlan.delayMs) {
          if (onlineCameraTimerRef.current !== null) {
            window.clearTimeout(onlineCameraTimerRef.current);
          }
          const delayed = camPlan.delayedPreset;
          onlineCameraTimerRef.current = window.setTimeout(() => {
            onlineCameraTimerRef.current = null;
            if (screenRef.current === 'playing' && onlineMatchActiveRef.current) {
              setCamera(delayed);
            }
          }, camPlan.delayMs);
        }
      }

      // Trigger 3D animations for key server events (draw, coin flip, revolver shot)
      if (events && events.length > 0) {
        for (const ev of events) {
          if (ev.type === 'CARD_DRAWN' && ev.card) {
            sceneRef.current?.triggerCardReveal(
              ev.card,
              ev.actor === mySeat ? 'player' : 'opponent',
            );
          } else if (ev.type === 'PIECE_MOVED' && ev.move && ev.actor && ev.actor !== mySeat) {
            sceneRef.current?.triggerOpponentMove(ev.move.from, ev.move.to, Boolean(ev.captured));
          } else if (ev.type === 'COIN_RESOLVED' && ev.actual && ev.guesser) {
            const guesserActor: MatchActor = ev.guesser === mySeat ? 'player' : 'opponent';
            const drawerActor: MatchActor = ev.drawer === mySeat ? 'player' : 'opponent';
            sceneRef.current?.triggerCoinFlip(ev.actual, drawerActor);
            if (!ev.guessedRight) {
              window.setTimeout(() => {
                setCamera('CAM_REVOLVER');
                sceneRef.current?.triggerRevolverShot(guesserActor);
              }, 1600);
            }
          }
        }
      }

      const activeActor: MatchActor = state.activeSeat === mySeat ? 'player' : 'opponent';
      const winnerActor: MatchActor | 'draw' | null =
        state.winner === null
          ? null
          : state.winner === 'draw'
            ? 'draw'
            : state.winner === mySeat
              ? 'player'
              : 'opponent';

      setHud({
        phase: state.phase as MatchPhase,
        activeActor,
        playerColor: mySlot.color,
        playerHp: mySlot.hp,
        opponentHp: oppSlot.hp,
        maxHp: state.maxHp,
        currentCard: state.currentCard,
        movesLeft: state.movesLeft,
        resurrectsLeft: state.resurrectsLeft,
        deckCount: state.deckCount,
        isInCheck: state.isInCheck,
        isKingVsKing: state.isKingVsKing,
        drawOfferCooldownTurns: 0,
        drawOfferLocked: false,
        winner: winnerActor,
        endReason: (state.endReason === 'disconnect_forfeit' ? 'resignation' : state.endReason) as MatchEndReason | null,
        stats: {
          turnsPlayed: mySlot.turnsCount + oppSlot.turnsCount,
          movesMade: 0,
          coinsSurvived: 0,
          shotsFired: 0,
          reverseOccurred: false,
          maxResurrectedSingleCard: 0,
          wonByWildCheckmate: false,
        },
        resurrectOptions: state.resurrectOptions,
      });

      if (state.phase === 'MATCH_OVER' || summary) {
        setOnlineEndSummary(summary ?? state.endSummary);
        setScreen('gameover');
      }
    },
    [setCamera],
  );

  // Preload all 10 animated WebP emote blobs when entering a match for zero-latency frame-1 playback
  useEffect(() => {
    if (screen === 'playing') {
      void preloadAllEmoteBlobs();
    }
  }, [screen]);

  const handleClearPlayerEmote = useCallback((instanceId: number) => {
    setPlayerEmote((cur) => (cur && cur.instanceId === instanceId ? null : cur));
  }, []);

  const handleClearOpponentEmote = useCallback((instanceId: number) => {
    setOpponentEmote((cur) => (cur && cur.instanceId === instanceId ? null : cur));
  }, []);

  const handleToggleMuteOpponentEmotes = useCallback(() => {
    setOpponentEmotesMuted((prev) => {
      const next = !prev;
      if (next) {
        setOpponentEmote(null);
      }
      return next;
    });
  }, []);

  const handleSendEmote = useCallback(
    (emoteId: EmoteId) => {
      const now = Date.now();
      if (!canSendEmote(emoteLastSentAtRef.current, now, CLIENT_EMOTE_COOLDOWN_MS)) {
        return;
      }
      const def = getEmoteDefinition(emoteId);
      if (!def) return;

      emoteLastSentAtRef.current = now;
      setEmoteLastSentAt(now);

      const instanceId = emoteSeqRef.current++;
      setPlayerEmote({
        instanceId,
        emoteId,
        senderSide: 'player',
        senderName: profile.nickname || profile.displayName,
        sentAt: now,
      });
      soundManager.playEmoteSfx(def.sfx);

      if (onlineMatchActiveRef.current && onlineRoomStateRef.current) {
        onlineClientRef.current?.sendEmote(emoteId);
      }
    },
    [profile.displayName, profile.nickname],
  );

  const handleReceiveOnlineEmote = useCallback((event: OnlineEmoteEvent) => {
    const room = onlineRoomStateRef.current;
    if (!room) return;
    if (!isValidEmoteId(event.emoteId)) return;
    const senderSide: 'player' | 'opponent' =
      event.senderRole === room.yourSeat ? 'player' : 'opponent';

    // Local sender already rendered immediately with 0ms latency
    if (senderSide === 'player') return;
    if (!shouldShowIncomingEmote('opponent', opponentEmotesMutedRef.current)) {
      return;
    }

    const def = getEmoteDefinition(event.emoteId);
    if (!def) return;

    const oppSlot = room.players[event.senderRole];
    const instanceId = emoteSeqRef.current++;
    setOpponentEmote({
      instanceId,
      emoteId: event.emoteId,
      senderSide: 'opponent',
      senderName: oppSlot?.nickname,
      sentAt: event.sentAt,
    });
    soundManager.playEmoteSfx(def.sfx);
    sceneRef.current?.triggerOpponentEmoteReaction(def.avatarReaction);
  }, []);

  const syncLocalFriendsFromSocial = useCallback((nextSocial: SocialStateSnapshot) => {
    setProfile((prev) => {
      const existingByCode = new Map(
        (prev.friends ?? []).map((f) => [f.friendCode.toUpperCase(), f]),
      );
      const nextFriends = nextSocial.friends.map((sf) => {
        const key = sf.friendCode.toUpperCase();
        const existing = existingByCode.get(key);
        const safeAvatar: AvatarId = isValidAvatarId(sf.avatarId)
          ? sf.avatarId
          : (existing?.avatarId ?? 'strategist');
        return {
          friendCode: key,
          nickname: sf.nickname,
          avatarId: safeAvatar,
          addedAt: existing?.addedAt ?? new Date(sf.since || Date.now()).toISOString(),
          matchesTogether: existing?.matchesTogether ?? 0,
        };
      });
      const prevFriends = prev.friends ?? [];
      if (
        prevFriends.length === nextFriends.length &&
        prevFriends.every(
          (pf, idx) =>
            pf.friendCode === nextFriends[idx].friendCode &&
            pf.nickname === nextFriends[idx].nickname &&
            pf.avatarId === nextFriends[idx].avatarId,
        )
      ) {
        return prev;
      }
      const updated: PlayerProfile = { ...prev, friends: nextFriends };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const refreshSocialState = useCallback(async () => {
    if (!onlineEnabled) return;
    setSocialLoading(true);
    try {
      const snap = await syncSocialState({
        friendCode: profile.playerId,
        nickname: profile.nickname || profile.displayName,
        avatarId: profile.avatarId,
      });
      setSocialState(snap);
      syncLocalFriendsFromSocial(snap);
    } catch {
      // Server offline — keep existing cached state
    } finally {
      setSocialLoading(false);
    }
  }, [
    onlineEnabled,
    profile.avatarId,
    profile.displayName,
    profile.nickname,
    profile.playerId,
    syncLocalFriendsFromSocial,
  ]);

  const refreshSocialStateRef = useRef(refreshSocialState);
  refreshSocialStateRef.current = refreshSocialState;

  const handleJoinOnlineRoomRef = useRef<(roomCode: string) => void>(() => {});
  const syncLocalFriendsFromSocialRef = useRef(syncLocalFriendsFromSocial);
  syncLocalFriendsFromSocialRef.current = syncLocalFriendsFromSocial;

  // Persistent lightweight WebSocket `/ws/social/:friendCode` for online presence & 20s instant game invites.
  // STRICTLY gated by `onlineEnabled` — 0 WS connections on default web / production web!
  useEffect(() => {
    if (!onlineEnabled) {
      socialWsRef.current?.disconnect();
      socialWsRef.current = null;
      return;
    }

    const client = new SocialPresenceClient({
      onSocialState: (snap) => {
        setSocialState(snap);
        syncLocalFriendsFromSocialRef.current(snap);
      },
      onFriendPresence: (friendCode, isOnline, presenceStatus) => {
        setSocialState((prev) => {
          const nextFriends = sortFriendsByPresence(
            prev.friends.map((f) =>
              f.friendCode === friendCode ? { ...f, isOnline, presenceStatus } : f,
            ),
          );
          return { ...prev, friends: nextFriends };
        });
      },
      onInviteSent: (invite) => {
        setOutgoingInvite(invite);
        setInviteNotice(null);
      },
      onInviteIncoming: (invite) => {
        setIncomingInvite(invite);
        soundManager.playInviteChime();
      },
      onInviteAccepted: (payload) => {
        setIncomingInvite(null);
        setOutgoingInvite(null);
        setInviteNotice(null);
        setShowFriendsModal({ open: false });
        setShowLeaderboard(null);
        setShowProfile(false);
        setShowRules(false);
        setOnlineLobbySubMode(null);
        setOnlineInitialRoomCode(payload.roomCode);
        handleJoinOnlineRoomRef.current(payload.roomCode);
      },
      onInviteDeclined: ({ inviteId, targetNickname }) => {
        setOutgoingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
        const lang = languageRef.current;
        const text =
          lang === 'ru'
            ? `${targetNickname}: сейчас не может / друг отказался`
            : lang === 'uz'
              ? `${targetNickname}: hozir o‘ynay olmaydi / do‘st rad etdi`
              : `${targetNickname}: can't play right now / friend declined`;
        setInviteNotice({ tone: 'err', text });
      },
      onInviteExpired: ({ inviteId, fromCode, reason }) => {
        setIncomingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
        setOutgoingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
        if (reason === 'expired' && fromCode === profile.playerId) {
          const lang = languageRef.current;
          const text =
            lang === 'ru'
              ? 'Друг не ответил (20с)'
              : lang === 'uz'
                ? 'Do‘st javob bermadi (20s)'
                : 'Friend did not respond (20s)';
          setInviteNotice({ tone: 'info', text });
        }
      },
      onInviteError: (code: SocialInviteErrorCode) => {
        setOutgoingInvite(null);
        const lang = languageRef.current;
        let text =
          lang === 'ru'
            ? 'Не удалось отправить приглашение.'
            : lang === 'uz'
              ? 'Taklif yuborib bo‘lmadi.'
              : 'Could not send invite.';
        if (code === 'FRIEND_OFFLINE') {
          text =
            lang === 'ru'
              ? 'Друг сейчас не в сети.'
              : lang === 'uz'
                ? 'Do‘stingiz hozir oflayn.'
                : 'Friend is currently offline.';
        } else if (code === 'FRIEND_BUSY') {
          text =
            lang === 'ru'
              ? 'Друг сейчас уже играет партию.'
              : lang === 'uz'
                ? 'Do‘stingiz hozir o‘yinda.'
                : 'Friend is currently in a match.';
        }
        setInviteNotice({ tone: 'err', text });
      },
    });

    socialWsRef.current = client;
    client.connect({
      friendCode: profile.playerId,
      nickname: profile.nickname || profile.displayName,
      avatarId: profile.avatarId,
      status: screenRef.current === 'playing' ? 'in_match' : 'online',
    });

    return () => {
      client.disconnect();
      if (socialWsRef.current === client) {
        socialWsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineEnabled, profile.playerId]);

  // Keep presence status (`online` vs `in_match`) & nickname/avatar live on the social socket
  useEffect(() => {
    if (!onlineEnabled || !socialWsRef.current) return;
    const status: 'online' | 'in_match' = screen === 'playing' ? 'in_match' : 'online';
    socialWsRef.current.updateHello(
      profile.nickname || profile.displayName,
      profile.avatarId,
      status,
    );
  }, [onlineEnabled, screen, profile.nickname, profile.displayName, profile.avatarId]);

  // Sync confirmed friends & incoming/outgoing requests ONLY when online features are enabled (0 server calls when locked)
  useEffect(() => {
    if (!onlineEnabled) return;
    void refreshSocialState();
    const shouldPoll =
      screen === 'title' || showFriendsModal.open || onlineLobbySubMode !== null;
    if (!shouldPoll) return;
    const id = window.setInterval(() => {
      void refreshSocialState();
    }, 5000);
    return () => window.clearInterval(id);
  }, [onlineEnabled, screen, showFriendsModal.open, onlineLobbySubMode, refreshSocialState]);

  const ensureOnlineClient = useCallback(() => {
    if (!onlineClientRef.current) {
      onlineClientRef.current = new OnlineRoomClient({
        onStatus: (st) => setOnlineConnectionStatus(st),
        onState: (state, events) => applyOnlineRoomState(state, events),
        onMatchEnded: (summary, state) => applyOnlineRoomState(state, undefined, summary),
        onEmote: (ev) => handleReceiveOnlineEmote(ev),
        onSocialUpdate: () => {
          void refreshSocialStateRef.current();
        },
        onError: (code) => setOnlineErrorCode(code),
      });
    }
    return onlineClientRef.current;
  }, [applyOnlineRoomState, handleReceiveOnlineEmote]);

  const handleOpenBlockedOnline = useCallback((inviteRoomCode?: string | null) => {
    setDesktopOnlyModal({ open: true, inviteRoomCode: inviteRoomCode ?? null });
  }, []);

  const handleLeaveOnlineRoom = useCallback(() => {
    if (onlineCameraTimerRef.current !== null) {
      window.clearTimeout(onlineCameraTimerRef.current);
      onlineCameraTimerRef.current = null;
    }
    onlineClientRef.current?.disconnect();
    onlineMatchActiveRef.current = false;
    setOnlineRoomState(null);
    setOnlineEndSummary(null);
    setOnlineErrorCode(null);
    setOnlineInitialRoomCode(null);
    setPlayerEmote(null);
    setOpponentEmote(null);
    setOpponentEmotesMuted(false);
    sceneRef.current?.setOnlineOpponentAvatar(null);
  }, []);

  const handleCreateOnlineRoom = useCallback(
    async (
      onlineMode: OnlineMode,
      startingHp: StartingHp,
      visibility: RoomVisibility = 'public',
    ) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return null;
      }
      setOnlineErrorCode(null);
      setOnlineConnectionStatus('connecting');
      const nick = profile.nickname || profile.displayName;
      try {
        const created = await createOnlineRoom(onlineMode, startingHp, {
          visibility,
          hostNickname: nick,
          hostAvatarId: profile.avatarId,
          hostFriendCode: profile.playerId,
        });
        const client = ensureOnlineClient();
        client.connect({
          roomCode: created.roomCode,
          nickname: nick,
          avatarId: profile.avatarId,
          friendCode: profile.playerId,
          mode: onlineMode,
          startingHp,
          visibility,
        });
        return created.roomCode;
      } catch {
        setOnlineConnectionStatus('error');
        setOnlineErrorCode('CONNECTION_ERROR');
        return null;
      }
    },
    [
      ensureOnlineClient,
      handleOpenBlockedOnline,
      onlineEnabled,
      profile.avatarId,
      profile.displayName,
      profile.nickname,
      profile.playerId,
    ],
  );

  const handleQuickMatch = useCallback(
    async (onlineMode: OnlineMode, startingHp?: StartingHp) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return;
      }
      setOnlineErrorCode(null);
      setOnlineConnectionStatus('connecting');
      const nick = profile.nickname || profile.displayName;
      try {
        const res = await requestQuickMatch({
          mode: onlineMode,
          startingHp,
          nickname: nick,
          avatarId: profile.avatarId,
          friendCode: profile.playerId,
        });
        const client = ensureOnlineClient();
        client.connect({
          roomCode: res.roomCode,
          nickname: nick,
          avatarId: profile.avatarId,
          friendCode: profile.playerId,
          mode: res.mode,
          startingHp: res.startingHp,
          visibility: 'public',
        });
      } catch {
        setOnlineConnectionStatus('error');
        setOnlineErrorCode('CONNECTION_ERROR');
      }
    },
    [
      ensureOnlineClient,
      handleOpenBlockedOnline,
      onlineEnabled,
      profile.avatarId,
      profile.displayName,
      profile.nickname,
      profile.playerId,
    ],
  );

  const handleJoinOnlineRoom = useCallback(
    (roomCode: string) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline(roomCode);
        return;
      }
      setOnlineErrorCode(null);
      const client = ensureOnlineClient();
      client.connect({
        roomCode,
        nickname: profile.nickname || profile.displayName,
        avatarId: profile.avatarId,
        friendCode: profile.playerId,
      });
    },
    [
      ensureOnlineClient,
      handleOpenBlockedOnline,
      onlineEnabled,
      profile.avatarId,
      profile.displayName,
      profile.nickname,
      profile.playerId,
    ],
  );
  handleJoinOnlineRoomRef.current = handleJoinOnlineRoom;

  const handleSendFriendRequest = useCallback(
    async (
      toCode: string,
      toNickname?: string,
      toAvatarId?: string,
    ): Promise<
      { ok: true; status: 'sent' | 'auto_accepted' } | { ok: false; error: SocialErrorCode }
    > => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return { ok: false, error: 'SERVER_OFFLINE' };
      }
      const res = await sendFriendRequest({
        fromCode: profile.playerId,
        fromNickname: profile.nickname || profile.displayName,
        fromAvatarId: profile.avatarId,
        toCode,
        toNickname,
        toAvatarId,
      });
      if (!res.ok) return res;
      setSocialState(res.state);
      syncLocalFriendsFromSocial(res.state);
      onlineClientRef.current?.notifySocial(
        res.status === 'auto_accepted' ? 'request_accepted' : 'request_sent',
      );
      return { ok: true, status: res.status };
    },
    [
      handleOpenBlockedOnline,
      onlineEnabled,
      profile.avatarId,
      profile.displayName,
      profile.nickname,
      profile.playerId,
      syncLocalFriendsFromSocial,
    ],
  );

  const handleRespondFriendRequest = useCallback(
    async (requesterCode: string, action: 'accept' | 'decline') => {
      if (!onlineEnabled) return;
      const res = await respondFriendRequest({
        friendCode: profile.playerId,
        requesterCode,
        action,
      });
      if (!res.ok) return;
      setSocialState(res.state);
      syncLocalFriendsFromSocial(res.state);
      onlineClientRef.current?.notifySocial(
        action === 'accept' ? 'request_accepted' : 'request_declined',
      );
    },
    [onlineEnabled, profile.playerId, syncLocalFriendsFromSocial],
  );

  const handleCancelFriendRequest = useCallback(
    async (targetCode: string) => {
      if (!onlineEnabled) return;
      const res = await cancelFriendRequest({
        friendCode: profile.playerId,
        targetCode,
      });
      if (!res.ok) return;
      setSocialState(res.state);
    },
    [onlineEnabled, profile.playerId],
  );

  const handleRemoveSocialFriend = useCallback(
    async (targetCode: string) => {
      if (!onlineEnabled) return;
      const res = await removeSocialFriend({
        friendCode: profile.playerId,
        targetCode,
      });
      if (!res.ok) return;
      setSocialState(res.state);
      syncLocalFriendsFromSocial(res.state);
      onlineClientRef.current?.notifySocial('friend_removed');
    },
    [onlineEnabled, profile.playerId, syncLocalFriendsFromSocial],
  );

  const handleSendGameInvite = useCallback(
    (targetCode: string, onlineMode: OnlineMode, startingHp: StartingHp) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return;
      }
      setInviteNotice(null);
      const sent = socialWsRef.current?.sendInvite(targetCode, onlineMode, startingHp);
      if (!sent) {
        const lang = languageRef.current;
        setInviteNotice({
          tone: 'err',
          text:
            lang === 'ru'
              ? 'Нет связи с сервером мультиплеера.'
              : lang === 'uz'
                ? 'Multiplayer serveri bilan aloqa yo‘q.'
                : 'Not connected to multiplayer server.',
        });
      }
    },
    [handleOpenBlockedOnline, onlineEnabled],
  );

  const handleCancelGameInvite = useCallback((inviteId: string) => {
    socialWsRef.current?.cancelInvite(inviteId);
    setOutgoingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
  }, []);

  const handleAcceptGameInvite = useCallback((inviteId: string) => {
    socialWsRef.current?.respondInvite(inviteId, 'accept');
  }, []);

  const handleDeclineGameInvite = useCallback((inviteId: string) => {
    socialWsRef.current?.respondInvite(inviteId, 'decline');
    setIncomingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
  }, []);

  const handleExpireIncomingInviteLocal = useCallback((inviteId: string) => {
    setIncomingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
  }, []);

  const handleJoinFriendRoom = useCallback(
    (roomCode: string) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline(roomCode);
        return;
      }
      setShowLeaderboard(null);
      setShowFriendsModal({ open: false });
      setOnlineInitialRoomCode(roomCode);
      setOnlineLobbySubMode(mode === 'survival' ? 'online_survival' : 'online_friendly');
      handleJoinOnlineRoom(roomCode);
    },
    [handleJoinOnlineRoom, handleOpenBlockedOnline, mode, onlineEnabled],
  );

  // Auto-open Online Lobby if URL contains ?room=CH-XXXX (or DesktopOnlyModal with zero server calls when locked)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const roomFromUrl = parseRoomCodeFromSearch(window.location.search);
    if (roomFromUrl) {
      setShowGuide(false);
      if (!onlineEnabled) {
        setDesktopOnlyModal({ open: true, inviteRoomCode: roomFromUrl });
      } else {
        setOnlineInitialRoomCode(roomFromUrl);
        setOnlineLobbySubMode('online_friendly');
        handleJoinOnlineRoom(roomFromUrl);
      }
    }
    return () => {
      onlineClientRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenOnlineLobby = useCallback(
    (subMode: OnlineSubMode) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return;
      }
      setOnlineErrorCode(null);
      setOnlineLobbySubMode(subMode);
    },
    [handleOpenBlockedOnline, onlineEnabled],
  );

  const handleOpenFriends = useCallback(
    (initialTab?: FriendsModalTab) => {
      if (!onlineEnabled) {
        handleOpenBlockedOnline();
        return;
      }
      setShowLeaderboard(null);
      setOnlineLobbySubMode(null);
      setShowFriendsModal({ open: true, initialTab });
      void refreshSocialState();
    },
    [handleOpenBlockedOnline, onlineEnabled, refreshSocialState],
  );
  const handleDismissToast = useCallback((id: string) => {
    setToastQueue((q) => q.filter((item) => item.id !== id));
  }, []);
  const handleUpdateDisplayName = useCallback((name: string) => {
    const res = validateNickname(name);
    if (!res.valid) return;
    setProfile((prev) => {
      const next: PlayerProfile = {
        ...prev,
        nickname: res.normalized,
        displayName: res.normalized,
      };
      saveProfile(next);
      void leaderboardService.submitPlayerSnapshot(next);
      onlineClientRef.current?.updateProfile(next.nickname, next.avatarId, next.playerId);
      return next;
    });
  }, []);
  const handleSelectAvatar = useCallback((avatarId: AvatarId) => {
    setProfile((prev) => {
      if (prev.avatarId === avatarId) return prev;
      const next: PlayerProfile = { ...prev, avatarId };
      saveProfile(next);
      void leaderboardService.submitPlayerSnapshot(next);
      onlineClientRef.current?.updateProfile(
        next.nickname || next.displayName,
        next.avatarId,
        next.playerId,
      );
      return next;
    });
  }, []);
  const handleStartFromTitle = useCallback(() => startNewMatch(), [startNewMatch]);
  const handleReturnToMenu = useCallback(() => {
    clearScheduled();
    dialogueManager.stop();
    setSpeechText(null);
    setEndQuote(null);
    soundManager.duckAmbient(false);
    aiBusyRef.current = false;
    isAnimatingRef.current = false;
    soundManager.stopAmbient();
    soundManager.playMusicTrack('menu');
    sceneRef.current?.clearCaptureBloodDecals();
    handleLeaveOnlineRoom();
    matchElapsedMsRef.current = 0;
    matchTimerAnchorRef.current = null;
    setElapsedSeconds(0);
    setCamera('CAM_TITLE');
    setScreen('title');
    void runSilentUpdateCheck();
  }, [clearScheduled, handleLeaveOnlineRoom, runSilentUpdateCheck, setCamera]);

  // Sync deck draw interactivity, interactive raycasting gating & Dealer tension state to 3D scene
  useEffect(() => {
    const ctrl = sceneRef.current;
    if (!ctrl) return;
    const isPlayerInteractivePhase =
      hud.phase === 'AWAIT_DRAW_CARD' ||
      hud.phase === 'PLAYER_MOVE_LOOP' ||
      hud.phase === 'AWAIT_WILD_ACTION' ||
      hud.phase === 'AWAIT_RESURRECT_PLACEMENT';
    const allowRaycast =
      screen === 'playing' &&
      hud.activeActor === 'player' &&
      !showRules &&
      !showGodot &&
      !showLeaderboard &&
      !showAudioSettings &&
      !showFriendsModal.open &&
      !desktopOnlyModal.open &&
      isPlayerInteractivePhase;
    ctrl.setInteractiveRaycastingEnabled(allowRaycast);

    const canDraw = allowRaycast && hud.phase === 'AWAIT_DRAW_CARD';
    ctrl.setCanDrawDeck(canDraw);

    const tense =
      screen === 'playing' &&
      mode === 'survival' &&
      (hud.currentCard === 'BULLET' || hud.playerHp === 1);
    ctrl.setDealerTense(tense);
  }, [
    screen,
    mode,
    hud.phase,
    hud.activeActor,
    hud.currentCard,
    hud.playerHp,
    showRules,
    showGodot,
    showLeaderboard,
    showAudioSettings,
    showFriendsModal.open,
    desktopOnlyModal.open,
  ]);

  // 15-second idle taunt timer during player's active turn
  useEffect(() => {
    if (
      screen !== 'playing' ||
      hud.activeActor !== 'player' ||
      hud.phase === 'MATCH_OVER' ||
      hud.phase === 'AWAIT_COIN_CHOICE' ||
      showRules ||
      showGodot ||
      showLeaderboard ||
      showAudioSettings ||
      showFriendsModal.open ||
      desktopOnlyModal.open
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      speakEvent('idle_taunt');
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [
    screen,
    hud.activeActor,
    hud.phase,
    hud.movesLeft,
    hud.resurrectsLeft,
    showRules,
    showGodot,
    showLeaderboard,
    showAudioSettings,
    showFriendsModal.open,
    desktopOnlyModal.open,
    speakEvent,
  ]);

  const handleOpenGuide = useCallback(() => {
    setShowRules(false);
    setGuideAutoPlay(false);
    setShowGuide(true);
  }, []);

  const handleCloseGuide = useCallback(() => {
    setShowGuide(false);
    setGuideAutoPlay(false);
    setProfile((prev) => {
      if (prev.hasSeenTutorial) return prev;
      const next: PlayerProfile = { ...prev, hasSeenTutorial: true };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleDismissFirstMatchHint = useCallback(() => {
    setProfile((prev) => {
      if (prev.hasSeenFirstMatchHints) return prev;
      const next: PlayerProfile = { ...prev, hasSeenFirstMatchHints: true };
      saveProfile(next);
      return next;
    });
  }, []);

  // Track completed player turn cycles in the first match to auto-retire live hints
  useEffect(() => {
    if (screen !== 'playing') {
      prevHudActorRef.current = hud.activeActor;
      return;
    }
    const prevActor = prevHudActorRef.current;
    prevHudActorRef.current = hud.activeActor;
    if (
      prevActor === 'player' &&
      hud.activeActor === 'opponent' &&
      !profile.hasSeenFirstMatchHints
    ) {
      setFirstMatchCycles((c) => {
        const nextCycles = c + 1;
        if (nextCycles >= FIRST_MATCH_HINT_CYCLES) {
          handleDismissFirstMatchHint();
        }
        return nextCycles;
      });
    }
  }, [handleDismissFirstMatchHint, hud.activeActor, profile.hasSeenFirstMatchHints, screen]);

  const activeFirstMatchHint =
    screen === 'playing'
      ? resolveFirstMatchHint({
          hasSeenFirstMatchHints: profile.hasSeenFirstMatchHints,
          completedCycles: firstMatchCycles,
          phase: hud.phase,
          activeActor: hud.activeActor,
          language,
        })
      : null;

  // Global keyboard bindings with strict Space isolation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        showGuide ||
        showRules ||
        showGodot ||
        showLeaderboard ||
        showAudioSettings ||
        showFriendsModal.open ||
        desktopOnlyModal.open
      ) {
        if (e.key === 'Escape') {
          if (showGuide) handleCloseGuide();
          setShowRules(false);
          setShowGodot(false);
          setShowLeaderboard(null);
          setShowAudioSettings(false);
          setShowFriendsModal({ open: false });
          setDesktopOnlyModal({ open: false, inviteRoomCode: null });
        }
        return;
      }

      if (screenRef.current === 'title') {
        if (e.key === 'Enter') {
          e.preventDefault();
          startNewMatch();
        }
        return;
      }

      if (screenRef.current === 'playing') {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleToggleCamera();
        } else if (e.key === ' ') {
          const onlineState = onlineRoomStateRef.current;
          if (onlineState && onlineState.phase !== 'LOBBY') {
            if (
              onlineState.phase === 'AWAIT_DRAW_CARD' &&
              onlineState.activeSeat === onlineState.yourSeat
            ) {
              e.preventDefault();
              handleDrawCard();
            }
          } else {
            const eng = engineRef.current;
            if (
              eng &&
              eng.getPhase() === 'AWAIT_DRAW_CARD' &&
              eng.getActiveActor() === 'player' &&
              !isAnimatingRef.current
            ) {
              e.preventDefault();
              handleDrawCard();
            }
          }
        } else if (e.key === 'm' || e.key === 'M') {
          handleToggleMute();
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePause();
        }
        return;
      }

      if (screenRef.current === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    desktopOnlyModal.open,
    handleCloseGuide,
    handleDrawCard,
    handlePause,
    handleResume,
    handleToggleCamera,
    handleToggleMute,
    showAudioSettings,
    showFriendsModal.open,
    showGodot,
    showGuide,
    showLeaderboard,
    showRules,
    startNewMatch,
  ]);

  const updateIndicators = computeUpdateIndicatorState({
    isTauri,
    availableVersion: availableUpdate?.version ?? null,
    toastDismissed: updateToastDismissed,
  });

  const incomingFriendRequestsCount = onlineEnabled ? socialState.incomingRequests.length : 0;

  const onlineOpponentCode = (() => {
    if (!onlineRoomState) return null;
    const oppSeat = onlineRoomState.yourSeat === 'host' ? 'guest' : 'host';
    return onlineRoomState.players[oppSeat]?.friendCode ?? null;
  })();

  const onlineOpponentRelation = useMemo(
    () => resolveOpponentRelation(onlineOpponentCode, socialState),
    [onlineOpponentCode, socialState],
  );

  const activeOnlineHud: OnlineHudInfo | null = (() => {
    if (!onlineRoomState || onlineRoomState.phase === 'LOBBY') return null;
    const mySeat = onlineRoomState.yourSeat;
    const oppSeat = mySeat === 'host' ? 'guest' : 'host';
    const me = onlineRoomState.players[mySeat];
    const opp = onlineRoomState.players[oppSeat];
    if (!me || !opp) return null;
    return {
      opponentNickname: opp.nickname,
      opponentAvatarId: opp.avatarId,
      opponentFriendCode: opp.friendCode ?? null,
      opponentRelation: onlineOpponentRelation,
      onSendOpponentFriendRequest: opp.friendCode
        ? () => {
            void handleSendFriendRequest(opp.friendCode!, opp.nickname, opp.avatarId);
          }
        : undefined,
      onAcceptOpponentFriendRequest: opp.friendCode
        ? () => {
            void handleRespondFriendRequest(opp.friendCode!, 'accept');
          }
        : undefined,
      yourThinkTimeMs: me.thinkTimeMs,
      opponentThinkTimeMs: opp.thinkTimeMs,
      activeSide: onlineRoomState.actingSeat === mySeat ? 'player' : 'opponent',
      turnStartedAt: onlineRoomState.turnStartedAt,
      serverClockOffsetMs: onlineClockOffsetRef.current,
      timerPaused: onlineRoomState.timerPaused,
      opponentDisconnected: !opp.connected,
      canClaimDisconnectWin: onlineRoomState.canClaimDisconnectWin,
      drawOfferFromOpponent: Boolean(
        onlineRoomState.drawOfferFrom && onlineRoomState.drawOfferFrom !== mySeat,
      ),
      onAcceptDraw: () => onlineClientRef.current?.acceptDraw(),
      onClaimDisconnectWin: () => onlineClientRef.current?.claimDisconnectWin(),
    };
  })();

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="chuno-canvas"
        data-camera-preset={cameraPresetState}
        className="fixed inset-0 w-full h-full"
      />

      {/* Subtle PSX Scanline & Vignette overlay ONLY in Survival Mode */}
      {mode === 'survival' && (
        <div className="fixed inset-0 z-[5] pointer-events-none survival-psx-overlay" />
      )}

      {/* Subtle Dark-Crimson Tension Vignette on Survival Hard */}
      {mode === 'survival' && difficulty === 'hard' && (
        <div
          data-hard-vignette="true"
          className="fixed inset-0 z-[6] pointer-events-none survival-hard-vignette transition-opacity duration-300"
        />
      )}

      {/* Smooth 220ms cinematic crossfade veil when toggling Survival <-> Light */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[8] pointer-events-none transition-opacity duration-200 ${
          mode === 'survival' ? 'bg-black' : 'bg-[#e8eff4]'
        } ${modeTransitioning ? 'opacity-55' : 'opacity-0'}`}
      />

      {/* Revolver Hit Flash & brief dramatic blackout when Player takes a shot */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[15] pointer-events-none bg-red-900/65 transition-opacity duration-150 ${
          hitFlash ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[16] pointer-events-none bg-black transition-opacity duration-300 ${
          hitBlackout ? 'opacity-80' : 'opacity-0'
        }`}
      />

      {/* Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          mode={mode}
          difficulty={difficulty}
          personality={personalityOpt}
          language={language}
          muted={muted}
          isTauri={isTauri}
          onlineEnabled={onlineEnabled}
          incomingFriendRequestsCount={incomingFriendRequestsCount}
          profile={profile}
          guestStatus={guestStatus}
          hasUpdateAvailable={updateIndicators.showRedDot}
          availableUpdateVersion={availableUpdate?.version ?? null}
          showUpdateToast={updateIndicators.showToast}
          onDismissUpdateToast={() => setUpdateToastDismissed(true)}
          onCheckUpdates={() => void handleCheckUpdates()}
          onChangeMode={handleChangeMode}
          onChangeDifficulty={handleChangeDifficulty}
          onChangePersonality={handleChangePersonality}
          onChangeLanguage={handleChangeLanguage}
          onOpenAudioSettings={handleOpenAudioSettings}
          onStart={handleStartFromTitle}
          onOpenProfile={handleOpenProfile}
          onOpenFriends={() => handleOpenFriends()}
          onBlockedOnlineAttempt={() => handleOpenBlockedOnline()}
          onOpenOnlineLobby={handleOpenOnlineLobby}
          onOpenGuide={handleOpenGuide}
          onOpenRules={handleOpenRules}
          onOpenLeaderboard={handleOpenLeaderboard}
          onOpenGodot={handleOpenGodot}
        />
      )}

      {/* Active Gameplay HUD */}
      {(screen === 'playing' || screen === 'paused') && (
        <GameHud
          mode={mode}
          language={language}
          phase={hud.phase}
          activeActor={hud.activeActor}
          playerColor={hud.playerColor}
          playerHp={hud.playerHp}
          opponentHp={hud.opponentHp}
          maxHp={hud.maxHp}
          currentCard={hud.currentCard}
          movesLeft={hud.movesLeft}
          resurrectsLeft={hud.resurrectsLeft}
          deckCount={hud.deckCount}
          isInCheck={hud.isInCheck}
          isKingVsKing={hud.isKingVsKing}
          drawOfferCooldownTurns={hud.drawOfferCooldownTurns}
          drawOfferLocked={hud.drawOfferLocked}
          elapsedSeconds={elapsedSeconds}
          tacticalCam={tacticalCam}
          muted={muted}
          musicTrackPreference={profile.settings.musicTrackPreference ?? 'auto'}
          speechText={speechText}
          playerNickname={profile.nickname || profile.displayName}
          playerAvatarId={profile.avatarId}
          onlineHud={activeOnlineHud}
          isTauri={isTauri}
          hasUpdateAvailable={updateIndicators.showRedDot}
          guestBadgeText={
            !isTauri && guestStatus.isGuestMode
              ? language === 'ru'
                ? `Гость · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches}`
                : `Guest · ${guestStatus.matchesPlayed}/${guestStatus.maxMatches}`
              : null
          }
          wildSelectedSq={wildSelectedSq}
          pendingPromoMove={pendingPromoMove}
          resurrectOptions={hud.resurrectOptions}
          selectedResurrectId={selectedResurrectId}
          firstMatchHint={activeFirstMatchHint}
          onToggleCamera={handleToggleCamera}
          onCycleMusicTrack={handleCycleMusicTrack}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOpenGuide={handleOpenGuide}
          onOpenRules={handleOpenRules}
          onDismissFirstMatchHint={handleDismissFirstMatchHint}
          onPause={handlePause}
          onOfferDraw={handleOfferDraw}
          onResign={handleResign}
          onPickWildTarget={handlePickWildTarget}
          onCancelWildPiece={clearSelection}
          onPickPromotion={handlePickPromotion}
          onSelectResurrectPiece={handleSelectResurrectPiece}
          onPickCoinSide={handlePickCoinSide}
        />
      )}

      {/* Smooth In-Match Emote Picker (opposite the card deck) & Comic Speech Bubbles */}
      {screen === 'playing' && (
        <>
          <EmoteBubbleOverlay
            mode={mode}
            language={language}
            playerEmote={playerEmote}
            opponentEmote={opponentEmote}
            liftPlayerForMobileBanner={!isTauri && !mobileBannerDismissed}
            onClearPlayerEmote={handleClearPlayerEmote}
            onClearOpponentEmote={handleClearOpponentEmote}
          />
          <EmotePicker
            mode={mode}
            language={language}
            lastSentAt={emoteLastSentAt}
            opponentEmotesMuted={opponentEmotesMuted}
            disabled={hud.phase === 'MATCH_OVER'}
            liftForMobileBanner={!isTauri && !mobileBannerDismissed}
            onSelectEmote={handleSendEmote}
            onToggleMuteOpponent={handleToggleMuteOpponentEmotes}
          />
        </>
      )}

      {/* Pause & Game Over Modals */}
      {(screen === 'paused' || screen === 'gameover') && (
        <EndModal
          kind={screen}
          mode={mode}
          language={language}
          winner={hud.winner}
          endReason={hud.endReason}
          stats={hud.stats}
          elapsedSeconds={elapsedSeconds}
          drawOfferCooldownTurns={hud.drawOfferCooldownTurns}
          drawOfferLocked={hud.drawOfferLocked}
          scoreBreakdown={onlineEndSummary ? null : lastScoreBreakdown}
          onlineSummary={onlineEndSummary}
          onlineYourSeat={onlineRoomState?.yourSeat}
          onlineOpponentRelation={onlineOpponentRelation}
          onSendOnlineFriendRequest={(fc, nick, av) => {
            void handleSendFriendRequest(fc, nick, av);
          }}
          onAcceptOnlineFriendRequest={(fc) => {
            void handleRespondFriendRequest(fc, 'accept');
          }}
          onlineRematchRequestedByMe={Boolean(
            onlineRoomState && onlineRoomState.players[onlineRoomState.yourSeat]?.rematchRequested,
          )}
          onlineRematchRequestedByOpp={Boolean(
            onlineRoomState &&
              onlineRoomState.players[onlineRoomState.yourSeat === 'host' ? 'guest' : 'host']?.rematchRequested,
          )}
          onRequestRematch={() => onlineClientRef.current?.requestRematch()}
          endQuote={onlineEndSummary ? null : endQuote}
          graphicsQuality={profile.settings.graphicsQuality}
          showFps={profile.settings.showFps}
          musicVolume={profile.settings.musicVolume}
          sfxVolume={profile.settings.sfxVolume}
          voiceVolume={profile.settings.voiceVolume}
          dialogueAudioMode={profile.settings.dialogueAudioMode}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onToggleShowFps={handleToggleShowFps}
          onChangeMusicVolume={handleChangeMusicVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onChangeVoiceVolume={handleChangeVoiceVolume}
          onChangeDialogueAudioMode={handleChangeDialogueAudioMode}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOfferDraw={handleOfferDraw}
          onResign={handleResign}
          onResume={handleResume}
          onRestart={handleStartFromTitle}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Unified Audio Settings Modal (Menu + In-Game + Pause) */}
      {showAudioSettings && (
        <AudioSettingsModal
          mode={mode}
          language={language}
          muted={muted}
          menuMusicEnabled={profile.settings.menuMusicEnabled}
          gameMusicEnabled={profile.settings.gameMusicEnabled}
          musicTrackPreference={profile.settings.musicTrackPreference ?? 'auto'}
          musicVolume={profile.settings.musicVolume}
          sfxVolume={profile.settings.sfxVolume}
          voiceVolume={profile.settings.voiceVolume}
          dialogueAudioMode={profile.settings.dialogueAudioMode}
          isTauri={isTauri}
          availableUpdateVersion={updateIndicators.showRedDot ? (availableUpdate?.version ?? null) : null}
          onExportSave={handleExportSave}
          onImportSaveJson={handleImportSaveJson}
          onCheckUpdates={() => void handleCheckUpdates()}
          onToggleMute={handleToggleMute}
          onToggleMenuMusic={handleToggleMenuMusic}
          onToggleGameMusic={handleToggleGameMusic}
          onChangeMusicTrackPreference={handleChangeMusicTrackPreference}
          onChangeMusicVolume={handleChangeMusicVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onChangeVoiceVolume={handleChangeVoiceVolume}
          onChangeDialogueAudioMode={handleChangeDialogueAudioMode}
          onTestVoice={handleTestVoice}
          onClose={() => setShowAudioSettings(false)}
        />
      )}

      {/* Leader Dashboard & Achievements Modal */}
      {showLeaderboard && (
        <LeaderDashboardModal
          profile={profile}
          language={language}
          mode={mode}
          initialTab={showLeaderboard}
          friendsCount={onlineEnabled ? socialState.friends.length : (profile.friends ?? []).length}
          incomingFriendRequestsCount={incomingFriendRequestsCount}
          onUpdateDisplayName={handleUpdateDisplayName}
          onOpenFriends={() => handleOpenFriends()}
          onOpenProfile={() => {
            setShowLeaderboard(null);
            setShowProfile(true);
          }}
          onClose={() => setShowLeaderboard(null)}
        />
      )}

      {/* Dedicated Friends & Live Requests Modal */}
      {showFriendsModal.open && onlineEnabled && (
        <FriendsModal
          profile={profile}
          language={language}
          mode={mode}
          socialState={socialState}
          loading={socialLoading}
          initialTab={showFriendsModal.initialTab}
          outgoingInvite={outgoingInvite}
          inviteNotice={inviteNotice}
          onRefresh={() => void refreshSocialState()}
          onSendRequest={(code) => handleSendFriendRequest(code)}
          onRespondRequest={handleRespondFriendRequest}
          onCancelRequest={handleCancelFriendRequest}
          onRemoveFriend={handleRemoveSocialFriend}
          onSendGameInvite={handleSendGameInvite}
          onCancelGameInvite={handleCancelGameInvite}
          onJoinFriendRoom={handleJoinFriendRoom}
          onClose={() => setShowFriendsModal({ open: false })}
        />
      )}

      {/* Top-Center Live Incoming Game Invite Banner (20s countdown, Accept / Decline) */}
      {onlineEnabled && incomingInvite && (
        <GameInviteBanner
          invite={incomingInvite}
          mode={mode}
          language={language}
          onAccept={handleAcceptGameInvite}
          onDecline={handleDeclineGameInvite}
          onExpiredLocal={handleExpireIncomingInviteLocal}
        />
      )}

      {/* Desktop App Only Modal (shown in Web production / ?webLock=1 for Online & Friends) */}
      {desktopOnlyModal.open && (
        <DesktopOnlyModal
          mode={mode}
          language={language}
          inviteRoomCode={desktopOnlyModal.inviteRoomCode}
          onClose={() => setDesktopOnlyModal({ open: false, inviteRoomCode: null })}
        />
      )}

      {/* Player Profile & 10 Avatars Modal */}
      {showProfile && (
        <PlayerProfileModal
          profile={profile}
          language={language}
          mode={mode}
          onUpdateNickname={handleUpdateDisplayName}
          onSelectAvatar={handleSelectAvatar}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Online 1v1 Live Lobby Modal */}
      {onlineLobbySubMode && onlineEnabled && (
        <OnlineLobbyModal
          subMode={onlineLobbySubMode}
          initialRoomCode={onlineInitialRoomCode}
          profile={profile}
          language={language}
          mode={mode}
          roomState={onlineRoomState}
          connectionStatus={onlineConnectionStatus}
          errorCode={onlineErrorCode}
          incomingFriendRequestsCount={incomingFriendRequestsCount}
          opponentRelation={onlineOpponentRelation}
          onCreateRoom={(m, hp, vis) => void handleCreateOnlineRoom(m, hp, vis)}
          onQuickMatch={(m, hp) => void handleQuickMatch(m, hp)}
          onJoinRoom={handleJoinOnlineRoom}
          onSetStartingHp={(hp) => onlineClientRef.current?.setStartingHp(hp)}
          onSetReady={(ready) => onlineClientRef.current?.setReady(ready)}
          onStartMatch={() => onlineClientRef.current?.startMatch()}
          onLeaveRoom={handleLeaveOnlineRoom}
          onSendFriendRequest={(fc, nick, av) => {
            void handleSendFriendRequest(fc, nick, av);
          }}
          onAcceptFriendRequest={(fc) => {
            void handleRespondFriendRequest(fc, 'accept');
          }}
          onOpenFriends={() => handleOpenFriends()}
          onChangeAvatar={() => setShowProfile(true)}
          onBack={() => setOnlineLobbySubMode(null)}
          onClose={() => setOnlineLobbySubMode(null)}
        />
      )}

      {/* Animated Visual Guide Modal (auto-opens on first launch, or via ? / How to Play) */}
      {showGuide && (
        <VisualGuideModal
          language={language}
          autoPlayInitial={guideAutoPlay}
          onSwitchToRules={() => {
            handleCloseGuide();
            setShowRules(true);
          }}
          onClose={handleCloseGuide}
        />
      )}

      {/* Rules & Profile Modal */}
      {showRules && (
        <RulesModal
          language={language}
          profile={profile}
          graphicsQuality={profile.settings.graphicsQuality}
          showFps={profile.settings.showFps}
          musicVolume={profile.settings.musicVolume}
          sfxVolume={profile.settings.sfxVolume}
          voiceVolume={profile.settings.voiceVolume}
          dialogueAudioMode={profile.settings.dialogueAudioMode}
          isTauri={isTauri}
          onSwitchToGuide={handleOpenGuide}
          onExportSave={handleExportSave}
          onImportSaveJson={handleImportSaveJson}
          onCheckUpdates={() => void handleCheckUpdates()}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onToggleShowFps={handleToggleShowFps}
          onChangeMusicVolume={handleChangeMusicVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onChangeVoiceVolume={handleChangeVoiceVolume}
          onChangeDialogueAudioMode={handleChangeDialogueAudioMode}
          onClose={() => setShowRules(false)}
        />
      )}

      {/* Godot 4.3+ Source Modal */}
      {showGodot && <GodotModal language={language} onClose={() => setShowGodot(false)} />}

      {/* Tauri Desktop Auto-Updater Modal (hidden in web browser) */}
      {isTauri && showUpdaterModal && (
        <UpdaterModal
          mode={mode}
          language={language}
          profile={profile}
          checking={checkingUpdate}
          update={availableUpdate}
          checkError={updateCheckError}
          onRecheck={() => void handleCheckUpdates()}
          onClose={() => setShowUpdaterModal(false)}
        />
      )}

      {/* Browser-Only Guest 3-Match Gate Modal (never shown in Tauri desktop) */}
      {!isTauri && showGuestModal && guestStatus.isGuestMode && (
        <WebGuestModal
          mode={mode}
          language={language}
          guestStatus={guestStatus}
          onContinueGuest={
            guestStatus.isLocked ? undefined : () => setShowGuestModal(false)
          }
          onExportSave={handleExportSave}
        />
      )}

      {/* Dismissible Mobile Browser Orientation / Desktop Download Recommendation Banner */}
      {!isTauri && !mobileBannerDismissed && (
        <div
          data-testid="mobile-web-hint-banner"
          className="md:hidden fixed bottom-2.5 inset-x-3 z-20 pointer-events-auto flex items-center justify-between gap-2.5 rounded-lg border border-amber-500/35 bg-stone-950/92 px-3 py-2 text-[11px] text-stone-100 shadow-lg"
        >
          <span className="leading-snug">
            {language === 'ru'
              ? 'Для лучшего опыта поверните экран горизонтально или скачайте десктопную версию ChUno.'
              : 'For the best experience, rotate your screen to landscape or download the desktop version of ChUno.'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={getChunoDownloadUrl(language)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-amber-500 text-stone-950 font-bold whitespace-nowrap"
            >
              {language === 'ru' ? 'Скачать' : 'Download'}
            </a>
            <button
              type="button"
              aria-label={language === 'ru' ? 'Закрыть' : 'Dismiss'}
              onClick={() => setMobileBannerDismissed(true)}
              className="px-1.5 py-1 rounded text-stone-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Achievement Unlock Toast Stack */}
      <AchievementToast
        items={toastQueue}
        language={language}
        onDismiss={handleDismissToast}
      />

      {/* Optional Throttled FPS Counter */}
      {profile.settings.showFps && fpsValue !== null && (
        <div
          data-testid="fps-counter"
          className={`fixed bottom-3 ${screen === 'playing' ? 'left-[72px] sm:left-[152px]' : 'left-4'} z-20 pointer-events-none font-mono-num text-[11px] font-semibold px-2 py-0.5 rounded border ${
            mode === 'survival'
              ? 'bg-stone-950/85 border-stone-800 text-amber-400'
              : 'bg-white/88 border-stone-300 text-stone-800'
          }`}
        >
          {fpsValue} FPS
        </div>
      )}
    </div>
  );
}
