import { useCallback, useEffect, useRef, useState } from 'react';
import { soundManager } from './audio/soundManager';
import { AchievementToast } from './components/AchievementToast';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { EndModal } from './components/EndModal';
import { GameHud } from './components/GameHud';
import { GodotModal } from './components/GodotModal';
import { LeaderDashboardModal } from './components/LeaderDashboardModal';
import { RulesModal } from './components/RulesModal';
import { TitleScreen } from './components/TitleScreen';
import { UpdaterModal } from './components/UpdaterModal';
import { WebGuestModal } from './components/WebGuestModal';
import { AchievementDefinition, MatchScoreBreakdown } from './core/achievements';
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
} from './core/profileManager';
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
  const [showGodot, setShowGodot] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState<'leaderboard' | 'achievements' | null>(null);

  const isTauri = isTauriRuntime();
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

  const [tacticalCam, setTacticalCam] = useState(false);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [endQuote, setEndQuote] = useState<string | null>(null);
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
      setLanguage(merged.language);
      setMuted(merged.muted);
      soundManager.setMuted(merged.muted);
      soundManager.setMenuMusicEnabled(merged.settings.menuMusicEnabled);
      soundManager.setGameMusicEnabled(merged.settings.gameMusicEnabled);
      soundManager.setMusicVolume(merged.settings.musicVolume);
      soundManager.setSfxVolume(merged.settings.sfxVolume);
      soundManager.setVoiceVolume(merged.settings.voiceVolume);
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

  const handleCheckUpdates = useCallback(async () => {
    if (!isTauri) return;
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
    const engine = engineRef.current;
    const wSq = wildSelectedSqRef.current;
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
      screen === 'playing' && !showRules && !showGodot && !showLeaderboard && !showAudioSettings;
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
  }, [screen, showRules, showGodot, showLeaderboard, showAudioSettings]);

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
  const handleDismissToast = useCallback((id: string) => {
    setToastQueue((q) => q.filter((item) => item.id !== id));
  }, []);
  const handleUpdateDisplayName = useCallback((name: string) => {
    const cleaned = name.trim().slice(0, 20);
    if (!cleaned) return;
    setProfile((prev) => {
      const next = { ...prev, displayName: cleaned };
      saveProfile(next);
      void leaderboardService.submitPlayerSnapshot(next);
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
    matchElapsedMsRef.current = 0;
    matchTimerAnchorRef.current = null;
    setElapsedSeconds(0);
    setCamera('CAM_TITLE');
    setScreen('title');
  }, [clearScheduled, setCamera]);

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
      isPlayerInteractivePhase;
    ctrl.setInteractiveRaycastingEnabled(allowRaycast);

    const canDraw = allowRaycast && hud.phase === 'AWAIT_DRAW_CARD';
    ctrl.setCanDrawDeck(canDraw);

    const tense =
      screen === 'playing' &&
      mode === 'survival' &&
      (hud.currentCard === 'BULLET' || hud.playerHp === 1);
    ctrl.setDealerTense(tense);
  }, [screen, mode, hud.phase, hud.activeActor, hud.currentCard, hud.playerHp, showRules, showGodot, showLeaderboard, showAudioSettings]);

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
      showAudioSettings
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
    speakEvent,
  ]);

  // Global keyboard bindings with strict Space isolation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showRules || showGodot || showLeaderboard || showAudioSettings) {
        if (e.key === 'Escape') {
          setShowRules(false);
          setShowGodot(false);
          setShowLeaderboard(null);
          setShowAudioSettings(false);
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
  }, [handleDrawCard, handlePause, handleResume, handleToggleCamera, handleToggleMute, showAudioSettings, showGodot, showLeaderboard, showRules, startNewMatch]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} data-testid="chuno-canvas" className="fixed inset-0 w-full h-full" />

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
          guestStatus={guestStatus}
          hasUpdateAvailable={Boolean(availableUpdate)}
          onCheckUpdates={() => void handleCheckUpdates()}
          onChangeMode={handleChangeMode}
          onChangeDifficulty={handleChangeDifficulty}
          onChangePersonality={handleChangePersonality}
          onChangeLanguage={handleChangeLanguage}
          onOpenAudioSettings={handleOpenAudioSettings}
          onStart={handleStartFromTitle}
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
          speechText={speechText}
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
          onToggleCamera={handleToggleCamera}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOpenRules={handleOpenRules}
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
          scoreBreakdown={lastScoreBreakdown}
          endQuote={endQuote}
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
          musicVolume={profile.settings.musicVolume}
          sfxVolume={profile.settings.sfxVolume}
          voiceVolume={profile.settings.voiceVolume}
          dialogueAudioMode={profile.settings.dialogueAudioMode}
          isTauri={isTauri}
          onExportSave={handleExportSave}
          onImportSaveJson={handleImportSaveJson}
          onCheckUpdates={() => void handleCheckUpdates()}
          onToggleMute={handleToggleMute}
          onToggleMenuMusic={handleToggleMenuMusic}
          onToggleGameMusic={handleToggleGameMusic}
          onChangeMusicVolume={handleChangeMusicVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onChangeVoiceVolume={handleChangeVoiceVolume}
          onChangeDialogueAudioMode={handleChangeDialogueAudioMode}
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
          onUpdateDisplayName={handleUpdateDisplayName}
          onClose={() => setShowLeaderboard(null)}
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
          className={`fixed bottom-3 left-4 z-20 pointer-events-none font-mono-num text-[11px] font-semibold px-2 py-0.5 rounded border ${
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
