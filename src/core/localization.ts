import { CardType } from './deck/cardData';

export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  gameTitle: string;
  modeSurvival: string;
  modeLight: string;
  modeOnline: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  personalityUnknown: string;
  personalityEnthusiast: string;
  personalityEgoist: string;
  personalityCalm: string;
  startGame: string;
  rulesAndStats: string;
  godotSource: string;
  leaderboardBtn: string;
  leaderboardTab: string;
  achievementsTab: string;
  profileBtn: string;
  profileModalTitle: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  nicknameHint: string;
  nicknameErrShort: string;
  nicknameErrLong: string;
  saveNickname: string;
  savedLabel: string;
  avatarSectionTitle: string;
  avatarFilterAll: string;
  avatarFilterMale: string;
  avatarFilterFemale: string;
  changeAvatarBtn: string;
  avatar3dReadyHint: string;
  onlineSubtitle: string;
  onlineFriendlyTitle: string;
  onlineFriendlyDesc: string;
  onlineSurvivalTitle: string;
  onlineSurvivalDesc: string;
  onlineCreateRoom: string;
  onlineJoinRoom: string;
  onlineRoomCodeLabel: string;
  onlineCopyCode: string;
  onlineCodeCopied: string;
  onlineCopyLink: string;
  onlineLinkCopied: string;
  onlineRegenerateCode: string;
  onlineEnterCodePlaceholder: string;
  onlineJoinBtn: string;
  onlineBackToModes: string;
  onlinePreviewNotice: string;
  onlineJoinPreviewReply: string;
  onlineInvalidCode: string;
  onlineConnecting: string;
  onlineConnected: string;
  onlineReconnecting: string;
  onlineServerOffline: string;
  onlineRoomNotFound: string;
  onlineRoomFull: string;
  onlineRoomInProgress: string;
  onlineSeatReserved: string;
  onlineWaitingGuest: string;
  onlineReady: string;
  onlineNotReady: string;
  onlineStartMatch: string;
  onlineStartingHpLabel: string;
  onlineRematch: string;
  onlineRematchWaiting: string;
  onlineRematchRequested: string;
  onlineThinkTimeLabel: string;
  onlineAvgTurnLabel: string;
  onlineDisconnectPaused: string;
  onlineClaimDisconnectWin: string;
  onlineDisconnectForfeitReason: string;
  onlineReconnectBannerTitle: string;
  onlineReconnectBannerBtn: string;
  onlineReconnectDismissBtn: string;
  onlineReconnectingOverlay: string;
  onlineOpponentDisconnectedBanner: string;
  onlineOpponentReconnectedNotice: string;
  onlineVisibilityLabel: string;
  onlinePublicLabel: string;
  onlinePrivateLabel: string;
  onlinePublicBadge: string;
  onlinePrivateBadge: string;
  onlineQuickMatchBtn: string;
  onlineQuickMatchDesc: string;
  onlineQuickMatchSearching: string;
  onlineOpenRoomsTitle: string;
  onlineRefreshBtn: string;
  onlineNoOpenRooms: string;
  onlineJoinByCodeTitle: string;
  onlineEnterRoomBtn: string;
  friendsTab: string;
  yourFriendCodeLabel: string;
  addFriendBtn: string;
  addedFriendBadge: string;
  addFriendByCodeTitle: string;
  friendCodePlaceholder: string;
  friendNameOptionalPlaceholder: string;
  addFriendSubmitBtn: string;
  friendErrInvalidCode: string;
  friendErrSelf: string;
  friendErrDuplicate: string;
  friendsEmptyHint: string;
  friendMatchesTogether: string;
  friendInviteBtn: string;
  friendInviteCopied: string;
  friendJoinOpenRoomBtn: string;
  friendRemoveBtn: string;
  friendOnlineNow: string;
  updateAvailableTitle: string;
  updateNowBtn: string;
  updateLaterBtn: string;
  yourTurn: string;
  opponentTurn: string;
  dealerName: string;
  friendName: string;
  playingAsWhite: string;
  playingAsBlack: string;
  drawCard: string;
  movesLeft: string;
  resurrectLeft: string;
  checkWarning: string;
  tacticalCam: string;
  idleCam: string;
  mute: string;
  unmute: string;
  pause: string;
  resume: string;
  restart: string;
  mainMenu: string;
  playAgain: string;
  pausedTitle: string;
  victory: string;
  defeat: string;
  drawResult: string;
  reasonCheckmate: string;
  reasonStalemate: string;
  reasonRevolver: string;
  reasonInsufficient: string;
  reasonRepetition: string;
  reasonFiftyMove: string;
  reasonDrawAgreed: string;
  reasonResignation: string;
  matchTime: string;
  offerDraw: string;
  agreeToDraw: string;
  resign: string;
  confirmResign: string;
  kingVsKingBanner: string;
  drawCooldownLabel: string;
  turnsPlayed: string;
  movesMade: string;
  coinsSurvived: string;
  shotsFired: string;
  chooseCoinTitle: string;
  dealerFlippedHint: string;
  playerFlippedHint: string;
  heads: string;
  tails: string;
  chooseWildPiece: string;
  chooseWildTarget: string;
  choosePromotion: string;
  chooseGravePiece: string;
  placeOnHalfHint: string;
  deckRemaining: string;
  playerHp: string;
  dealerHp: string;
  clickPieceHint: string;
  clickDeckHint: string;
  clickDeckPrompt: string;
  streakBrokenCheck: string;
  resurrectConverted: string;
  checkSkipRedraw: string;
  checkSkipConverted: string;
  stalemateReset: string;
  rulesTitle: string;
  profileTitle: string;
  wins: string;
  losses: string;
  bestStreak: string;
  close: string;
  settingsTitle: string;
  graphicsQuality: string;
  qualityLow: string;
  qualityMedium: string;
  qualityHigh: string;
  showFpsLabel: string;
  audioSettingsTitle: string;
  menuMusicLabel: string;
  gameMusicLabel: string;
  muteAllLabel: string;
  unmuteAllLabel: string;
  musicVolumeLabel: string;
  sfxVolumeLabel: string;
  voiceVolumeLabel: string;
  dialogueAudioLabel: string;
  dialogueModeTts: string;
  dialogueModeSfx: string;
  dialogueModeOff: string;
  cardNames: Record<CardType, string>;
  cardDescs: Record<CardType, string>;
  pieceNames: Record<'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king', string>;
  howToPlayBtn: string;
  guideTabVisual: string;
  guideTabRules: string;
  guideSkip: string;
  guideBack: string;
  guideNext: string;
  guideDone: string;
  guidePauseAuto: string;
  guideResumeAuto: string;
  guideSlides: {
    title: string;
    line1: string;
    line2: string;
  }[];
  hintDrawCard: string;
  hintMovePiece: string;
  hintResurrect: string;
  hintWild: string;
  hintCoinFlip: string;
  privacyTitle: string;
  privacyLine1: string;
  privacyLine2: string;
  privacyLinkLabel: string;
}

const EN: Translations = {
  gameTitle: 'ChUno',
  modeSurvival: 'Survival',
  modeLight: 'Campaign',
  modeOnline: 'Online',
  difficultyEasy: 'Easy · 3 HP',
  difficultyMedium: 'Medium · 2 HP',
  difficultyHard: 'Hard · 1 HP',
  personalityUnknown: 'Unknown',
  personalityEnthusiast: 'Enthusiast',
  personalityEgoist: 'Egoist',
  personalityCalm: 'Calm Philosopher',
  startGame: 'Take a Seat',
  rulesAndStats: 'Rules & Stats',
  godotSource: 'Godot 4.3+',
  leaderboardBtn: 'Leaderboard',
  leaderboardTab: 'Leaderboard',
  achievementsTab: 'Achievements',
  profileBtn: 'Profile',
  profileModalTitle: 'Player Profile',
  nicknameLabel: 'Player Name',
  nicknamePlaceholder: 'Enter nickname (2–18 chars)',
  nicknameHint: '2–18 characters. Shown on the leaderboard, HUD, and online lobby.',
  nicknameErrShort: 'Name must be at least 2 characters.',
  nicknameErrLong: 'Name must be 18 characters or fewer.',
  saveNickname: 'Save',
  savedLabel: 'Saved',
  avatarSectionTitle: 'Table Avatar',
  avatarFilterAll: 'All (10)',
  avatarFilterMale: 'Male (6)',
  avatarFilterFemale: 'Female (4)',
  changeAvatarBtn: 'Change Avatar',
  avatar3dReadyHint: '3D figure synced by avatar ID for upcoming 1v1 tables',
  onlineSubtitle: 'Choose a 1v1 mode to play with a friend by code or invite link.',
  onlineFriendlyTitle: 'Classic',
  onlineFriendlyDesc: 'Standard 1v1 ChUno match with a friend by room code or invite link.',
  onlineSurvivalTitle: 'Survival',
  onlineSurvivalDesc: '1v1 duel with Bullet cards, revolver, and host-selected 1 / 2 / 3 HP.',
  onlineCreateRoom: 'Create Room',
  onlineJoinRoom: 'Join by Code',
  onlineRoomCodeLabel: 'Room Code',
  onlineCopyCode: 'Copy Code',
  onlineCodeCopied: 'Copied!',
  onlineCopyLink: 'Copy Invite Link',
  onlineLinkCopied: 'Link Copied',
  onlineRegenerateCode: 'New Room',
  onlineEnterCodePlaceholder: 'CH-XXXX',
  onlineJoinBtn: 'Join Room',
  onlineBackToModes: 'Back to Online Modes',
  onlinePreviewNotice: 'Connected to local multiplayer server.',
  onlineJoinPreviewReply: 'Connecting to room...',
  onlineInvalidCode: 'Enter a room code like CH-4829.',
  onlineConnecting: 'Connecting...',
  onlineConnected: 'Connected',
  onlineReconnecting: 'Reconnecting...',
  onlineServerOffline: 'Multiplayer server unreachable. Start chuno-mp-server on port 8787.',
  onlineRoomNotFound: 'Room not found. Check the code and try again.',
  onlineRoomFull: 'This room already has 2 players.',
  onlineRoomInProgress: 'Match is already in progress in this room.',
  onlineSeatReserved: 'Seat is reserved for a reconnecting player.',
  onlineWaitingGuest: 'Waiting for opponent to join...',
  onlineReady: 'Ready',
  onlineNotReady: 'Not Ready',
  onlineStartMatch: 'Start Match',
  onlineStartingHpLabel: 'Starting HP',
  onlineRematch: 'Rematch',
  onlineRematchWaiting: 'Waiting for opponent...',
  onlineRematchRequested: 'Opponent wants a rematch!',
  onlineThinkTimeLabel: 'Think Time',
  onlineAvgTurnLabel: 'Avg / turn',
  onlineDisconnectPaused: 'Opponent disconnected · Timer paused (90s reconnect window)',
  onlineClaimDisconnectWin: 'Claim Win (Disconnect)',
  onlineDisconnectForfeitReason: 'Opponent did not reconnect within 90s',
  onlineReconnectBannerTitle: 'Active online match',
  onlineReconnectBannerBtn: 'Reconnect to Match',
  onlineReconnectDismissBtn: 'Hide',
  onlineReconnectingOverlay: 'Restoring connection...',
  onlineOpponentDisconnectedBanner: 'Opponent disconnected — waiting for reconnect',
  onlineOpponentReconnectedNotice: 'Opponent reconnected!',
  onlineVisibilityLabel: 'Room Visibility',
  onlinePublicLabel: 'Open (visible to all)',
  onlinePrivateLabel: 'Private (code only)',
  onlinePublicBadge: 'Open',
  onlinePrivateBadge: 'Private',
  onlineQuickMatchBtn: 'Quick Play · Random Opponent',
  onlineQuickMatchDesc: 'Instantly join an open table or open a public room while waiting.',
  onlineQuickMatchSearching: 'Finding opponent...',
  onlineOpenRoomsTitle: 'Open Rooms',
  onlineRefreshBtn: 'Refresh',
  onlineNoOpenRooms: 'No open rooms yet — press Quick Play or create one!',
  onlineJoinByCodeTitle: 'Join by Room Code (CH-XXXX)',
  onlineEnterRoomBtn: 'Join',
  friendsTab: 'Friends',
  yourFriendCodeLabel: 'Your Friend Code',
  addFriendBtn: 'Add Friend',
  addedFriendBadge: 'Friends ✓',
  addFriendByCodeTitle: 'Add Friend by Code',
  friendCodePlaceholder: 'CHUNO-XXXX-XXXX',
  friendNameOptionalPlaceholder: 'Nickname (optional)',
  addFriendSubmitBtn: 'Add',
  friendErrInvalidCode: 'Enter a valid Friend Code like CHUNO-4A8K-9P2Q.',
  friendErrSelf: 'You cannot add your own Friend Code.',
  friendErrDuplicate: 'This player is already in your Friends list.',
  friendsEmptyHint: 'No friends yet. Share your Friend Code or add an opponent during or after an online match.',
  friendMatchesTogether: 'Matches together',
  friendInviteBtn: 'Invite to Room',
  friendInviteCopied: 'Invite Copied!',
  friendJoinOpenRoomBtn: 'Join Room',
  friendRemoveBtn: 'Remove',
  friendOnlineNow: 'Waiting in Open Room',
  updateAvailableTitle: 'Update available',
  updateNowBtn: 'Update',
  updateLaterBtn: 'Later',
  yourTurn: 'Your Turn',
  opponentTurn: 'Opponent Turn',
  dealerName: 'The Dealer',
  friendName: 'Companion',
  playingAsWhite: 'White',
  playingAsBlack: 'Black',
  drawCard: 'Draw Card',
  movesLeft: 'Moves Left',
  resurrectLeft: 'Pieces to Revive',
  checkWarning: 'CHECK',
  tacticalCam: 'Top View [Tab]',
  idleCam: 'Seat View [Tab]',
  mute: 'Mute [M]',
  unmute: 'Unmute [M]',
  pause: 'Pause [Esc]',
  resume: 'Resume',
  restart: 'Restart Match',
  mainMenu: 'Main Menu',
  playAgain: 'Play Again',
  pausedTitle: 'Match Paused',
  victory: 'Victory',
  defeat: 'Eliminated',
  drawResult: 'Draw',
  reasonCheckmate: 'Checkmate on the board',
  reasonStalemate: 'No legal moves remain',
  reasonRevolver: 'Last life extinguished',
  reasonInsufficient: 'Insufficient mating material',
  reasonRepetition: 'Threefold repetition',
  reasonFiftyMove: 'Fifty-move rule',
  reasonDrawAgreed: 'Draw by mutual agreement',
  reasonResignation: 'Match resigned',
  matchTime: 'Time',
  offerDraw: 'Offer Draw',
  agreeToDraw: 'Agree to Draw',
  resign: 'Resign',
  confirmResign: 'Confirm?',
  kingVsKingBanner: 'King vs King — checkmate impossible without revival.',
  drawCooldownLabel: 'Wait',
  turnsPlayed: 'Turns',
  movesMade: 'Moves',
  coinsSurvived: 'Coins Survived',
  shotsFired: 'Shots Fired',
  chooseCoinTitle: 'Bullet Card — Call the Coin',
  dealerFlippedHint: 'The Dealer holds the brass coin. Choose Heads or Tails.',
  playerFlippedHint: 'You flip the coin. The Dealer calls...',
  heads: 'Heads',
  tails: 'Tails',
  chooseWildPiece: 'Wild Card: Click one of your pieces (not King) on the board.',
  chooseWildTarget: 'Transform selected piece into:',
  choosePromotion: 'Promote Pawn to:',
  chooseGravePiece: 'Select a captured piece to return to your half:',
  placeOnHalfHint: 'Click a highlighted square on your half of the board.',
  deckRemaining: 'Deck',
  playerHp: 'You',
  dealerHp: 'Dealer',
  clickPieceHint: 'Select one of your pieces, then click a highlighted square.',
  clickDeckHint: 'Click the deck on the table or press Space to draw.',
  clickDeckPrompt: 'Click deck or press [Space]',
  streakBrokenCheck: 'Check! Streak interrupted.',
  resurrectConverted: 'No valid resurrection — converted to 1 move.',
  checkSkipRedraw: 'Check! Skip cancelled — draw again.',
  checkSkipConverted: 'Check! Skip converted to 1 move.',
  stalemateReset: 'Stalemate! Board resets for a new round.',
  rulesTitle: 'How to Play ChUno',
  profileTitle: 'Career Profile',
  wins: 'Wins',
  losses: 'Losses',
  bestStreak: 'Best Streak',
  close: 'Close',
  settingsTitle: 'Graphics & Audio',
  graphicsQuality: 'Graphics Quality',
  qualityLow: 'Low',
  qualityMedium: 'Medium',
  qualityHigh: 'High',
  showFpsLabel: 'Show FPS',
  audioSettingsTitle: 'Audio Settings',
  menuMusicLabel: 'Menu Music',
  gameMusicLabel: 'In-Game Music',
  muteAllLabel: 'Mute All',
  unmuteAllLabel: 'Unmute All',
  musicVolumeLabel: 'Music Volume',
  sfxVolumeLabel: 'SFX Volume',
  voiceVolumeLabel: 'Voice Volume',
  dialogueAudioLabel: 'Dialogue Audio',
  dialogueModeTts: 'Voice (Audio / TTS)',
  dialogueModeSfx: 'Subtitles Only',
  dialogueModeOff: 'Off',
  cardNames: {
    NUM_1: '1 Move',
    NUM_2: '2 Moves',
    NUM_3: '3 Moves',
    NUM_4: '4 Moves',
    NUM_5: '5 Moves',
    SKIP: 'Skip',
    REVERSE: 'Reverse',
    PLUS_2: '+2 Revive',
    PLUS_4: '+4 Revive',
    WILD: 'Wild',
    BULLET: 'Bullet',
  },
  cardDescs: {
    NUM_1: 'Make 1 legal chess move.',
    NUM_2: 'Make 2 consecutive legal moves (stops on Check).',
    NUM_3: 'Make 3 consecutive legal moves (stops on Check).',
    NUM_4: 'Make 4 consecutive legal moves (stops on Check).',
    NUM_5: 'Make 5 consecutive legal moves (stops on Check).',
    SKIP: 'Active player forfeits their turn.',
    REVERSE: 'Board rotates 180°. Players swap armies!',
    PLUS_2: 'Restore up to 2 captured pieces to your half.',
    PLUS_4: 'Restore up to 4 captured pieces to your half.',
    WILD: 'Temporarily morph 1 piece (not King) for 1 move.',
    BULLET: '50/50 coin flip. Guess wrong and face the revolver.',
  },
  pieceNames: {
    pawn: 'Pawn',
    rook: 'Rook',
    knight: 'Knight',
    bishop: 'Bishop',
    queen: 'Queen',
    king: 'King',
  },
  howToPlayBtn: 'How to Play',
  guideTabVisual: 'Visual Guide',
  guideTabRules: 'Detailed Rules',
  guideSkip: 'Skip',
  guideBack: 'Back',
  guideNext: 'Next',
  guideDone: "Got it, let's play!",
  guidePauseAuto: 'Pause auto-play',
  guideResumeAuto: 'Resume auto-play',
  guideSlides: [
    {
      title: '1. Draw a Card Every Turn',
      line1: 'Click the 40-card deck on the right side of the table (or press [Space]).',
      line2: 'The drawn card flips face-up immediately and decides your action for the turn.',
    },
    {
      title: '2. Move Your Chess Pieces',
      line1: 'Number cards (1–5 Moves) grant 1 to 5 consecutive legal chess moves.',
      line2: 'Click your piece, then click a highlighted square. Delivering Check stops a streak.',
    },
    {
      title: '3. Reverse — 180° Board Swap',
      line1: 'Drawing Reverse rotates the entire chessboard 180° and swaps White ⇄ Black.',
      line2: 'You immediately inherit your opponent’s army and turn passes to the rival.',
    },
    {
      title: '4. Tactical Special Cards',
      line1: 'Skip forfeits the turn; +2 / +4 Revive restores captured pieces onto your half.',
      line2: 'Wild temporarily morphs any non-King piece into another type for 1 move.',
    },
    {
      title: '5. Survival Mode — Coin & Revolver',
      line1: 'Drawing a Bullet card triggers a 50/50 brass coin flip (Heads ♛ / Tails ☠).',
      line2: 'Guess right to survive; guess wrong and face The Dealer’s revolver (-1 HP).',
    },
  ],
  hintDrawCard: 'Click the deck on the table (or press [Space]) to draw a card.',
  hintMovePiece: 'Select one of your pieces and click a highlighted square.',
  hintResurrect: 'Pick a captured piece below, then place it on your half of the board.',
  hintWild: 'Pick one of your pieces (not King) to temporarily morph it for 1 move.',
  hintCoinFlip: 'Bullet card! Pick Heads or Tails — a wrong guess faces the revolver.',
  privacyTitle: 'Privacy',
  privacyLine1: 'Saves, achievements, and settings are stored locally on your device only.',
  privacyLine2: 'No ads or telemetry; desktop connects only to check signed updates (latest.json).',
  privacyLinkLabel: 'Privacy Policy',
};

const RU: Translations = {
  gameTitle: 'ChUno',
  modeSurvival: 'Выживание',
  modeLight: 'Кампания',
  modeOnline: 'Игра по сети',
  difficultyEasy: 'Лёгкий · 3 HP',
  difficultyMedium: 'Средний · 2 HP',
  difficultyHard: 'Сложный · 1 HP',
  personalityUnknown: 'Неизвестный',
  personalityEnthusiast: 'Энтузиаст',
  personalityEgoist: 'Эгоист',
  personalityCalm: 'Спокойный философ',
  startGame: 'Сесть за стол',
  rulesAndStats: 'Правила и Статистика',
  godotSource: 'Код Godot 4.3+',
  leaderboardBtn: 'Таблица лидеров',
  leaderboardTab: 'Таблица лидеров',
  achievementsTab: 'Ачивки',
  profileBtn: 'Профиль',
  profileModalTitle: 'Профиль игрока',
  nicknameLabel: 'Имя игрока',
  nicknamePlaceholder: 'Введите ник (2–18 символов)',
  nicknameHint: 'От 2 до 18 символов. Отображается в таблице лидеров, HUD и сетевом лобби.',
  nicknameErrShort: 'Минимум 2 символа.',
  nicknameErrLong: 'Максимум 18 символов.',
  saveNickname: 'Сохранить',
  savedLabel: 'Сохранено',
  avatarSectionTitle: 'Облик за столом',
  avatarFilterAll: 'Все (10)',
  avatarFilterMale: 'Мужские (6)',
  avatarFilterFemale: 'Женские (4)',
  changeAvatarBtn: 'Сменить облик',
  avatar3dReadyHint: '3D-модель привязана к avatarId для будущих матчей 1 на 1',
  onlineSubtitle: 'Выберите формат 1 на 1 для партии с другом по коду или ссылке.',
  onlineFriendlyTitle: 'Классический',
  onlineFriendlyDesc: 'Обычная партия 1 на 1 по правилам ChUno с другом по коду или ссылке.',
  onlineSurvivalTitle: 'Выживание',
  onlineSurvivalDesc: 'Дуэль 1 на 1 с картой пули, револьвером и выбором 1 / 2 / 3 HP.',
  onlineCreateRoom: 'Создать комнату',
  onlineJoinRoom: 'Войти по коду',
  onlineRoomCodeLabel: 'Код комнаты',
  onlineCopyCode: 'Копировать код',
  onlineCodeCopied: 'Скопировано!',
  onlineCopyLink: 'Копировать ссылку',
  onlineLinkCopied: 'Ссылка скопирована',
  onlineRegenerateCode: 'Новая комната',
  onlineEnterCodePlaceholder: 'CH-XXXX',
  onlineJoinBtn: 'Войти в комнату',
  onlineBackToModes: 'Назад к режимам сети',
  onlinePreviewNotice: 'Подключено к серверу мультиплеера.',
  onlineJoinPreviewReply: 'Подключение к комнате...',
  onlineInvalidCode: 'Введите код вида CH-4829.',
  onlineConnecting: 'Подключение...',
  onlineConnected: 'Подключено',
  onlineReconnecting: 'Переподключение...',
  onlineServerOffline: 'Сервер мультиплеера недоступен. Запустите chuno-mp-server на порту 8787.',
  onlineRoomNotFound: 'Комната не найдена. Проверьте код.',
  onlineRoomFull: 'В этой комнате уже 2 игрока.',
  onlineRoomInProgress: 'В этой комнате уже идёт партия.',
  onlineSeatReserved: 'Место зарезервировано для переподключающегося игрока.',
  onlineWaitingGuest: 'Ожидание второго игрока...',
  onlineReady: 'Готов',
  onlineNotReady: 'Не готов',
  onlineStartMatch: 'Начать партию',
  onlineStartingHpLabel: 'Стартовые жизни',
  onlineRematch: 'Реванш',
  onlineRematchWaiting: 'Ждём соперника...',
  onlineRematchRequested: 'Соперник предлагает реванш!',
  onlineThinkTimeLabel: 'Время на ходы',
  onlineAvgTurnLabel: 'Среднее / ход',
  onlineDisconnectPaused: 'Соперник отключился · Таймер на паузе (90 сек на возврат)',
  onlineClaimDisconnectWin: 'Засчитать победу (выход)',
  onlineDisconnectForfeitReason: 'Соперник не вернулся за 90 сек',
  onlineReconnectBannerTitle: 'Незавершённый онлайн-матч',
  onlineReconnectBannerBtn: 'Вернуться в матч',
  onlineReconnectDismissBtn: 'Скрыть',
  onlineReconnectingOverlay: 'Восстановление соединения...',
  onlineOpponentDisconnectedBanner: 'Соперник отключился — ожидание переподключения',
  onlineOpponentReconnectedNotice: 'Соперник вернулся в игру!',
  onlineVisibilityLabel: 'Видимость комнаты',
  onlinePublicLabel: 'Открытая (видна всем)',
  onlinePrivateLabel: 'Приватная (только по коду)',
  onlinePublicBadge: 'Открытая',
  onlinePrivateBadge: 'Приватная',
  onlineQuickMatchBtn: 'Быстрая игра · Случайный соперник',
  onlineQuickMatchDesc: 'Мгновенный вход в свободную комнату или создание открытого стола.',
  onlineQuickMatchSearching: 'Поиск соперника...',
  onlineOpenRoomsTitle: 'Открытые комнаты',
  onlineRefreshBtn: 'Обновить',
  onlineNoOpenRooms: 'Пока нет открытых комнат — нажмите «Быстрая игра» или создайте стол.',
  onlineJoinByCodeTitle: 'Войти по коду комнаты (CH-XXXX)',
  onlineEnterRoomBtn: 'Войти',
  friendsTab: 'Друзья',
  yourFriendCodeLabel: 'Ваш код друга',
  addFriendBtn: 'В друзья',
  addedFriendBadge: 'В друзьях ✓',
  addFriendByCodeTitle: 'Добавить друга по коду',
  friendCodePlaceholder: 'CHUNO-XXXX-XXXX',
  friendNameOptionalPlaceholder: 'Имя (необязательно)',
  addFriendSubmitBtn: 'Добавить',
  friendErrInvalidCode: 'Введите код вида CHUNO-4A8K-9P2Q.',
  friendErrSelf: 'Нельзя добавить свой собственный код друга.',
  friendErrDuplicate: 'Этот игрок уже есть в списке друзей.',
  friendsEmptyHint: 'Список друзей пока пуст. Поделитесь кодом друга или добавьте соперника во время/после матча.',
  friendMatchesTogether: 'Совместных матчей',
  friendInviteBtn: 'Пригласить в комнату',
  friendInviteCopied: 'Приглашение скопировано!',
  friendJoinOpenRoomBtn: 'Присоединиться',
  friendRemoveBtn: 'Удалить',
  friendOnlineNow: 'Ждёт в открытой комнате',
  updateAvailableTitle: 'Доступно обновление',
  updateNowBtn: 'Обновить',
  updateLaterBtn: 'Позже',
  yourTurn: 'Ваш ход',
  opponentTurn: 'Ход соперника',
  dealerName: 'Дилер',
  friendName: 'Соперник',
  playingAsWhite: 'Белые',
  playingAsBlack: 'Чёрные',
  drawCard: 'Взять карту',
  movesLeft: 'Осталось ходов',
  resurrectLeft: 'Фигур к возврату',
  checkWarning: 'ШАХ',
  tacticalCam: 'Вид сверху [Tab]',
  idleCam: 'От 1-го лица [Tab]',
  mute: 'Без звука [M]',
  unmute: 'Звук [M]',
  pause: 'Пауза [Esc]',
  resume: 'Продолжить',
  restart: 'Начать заново',
  mainMenu: 'Главное меню',
  playAgain: 'Сыграть ещё',
  pausedTitle: 'Пауза',
  victory: 'Победа',
  defeat: 'Выбывание',
  drawResult: 'Ничья',
  reasonCheckmate: 'Мат на шахматной доске',
  reasonStalemate: 'Нет легальных ходов',
  reasonRevolver: 'Последний заряд погашен',
  reasonInsufficient: 'Недостаточно материала для мата',
  reasonRepetition: 'Троекратное повторение позиции',
  reasonFiftyMove: 'Правило 50 ходов',
  reasonDrawAgreed: 'Ничья по соглашению',
  reasonResignation: 'Партия сдана',
  matchTime: 'Время',
  offerDraw: 'Ничья',
  agreeToDraw: 'Согласиться на ничью',
  resign: 'Сдаться',
  confirmResign: 'Подтвердить?',
  kingVsKingBanner: 'Король против Короля — мат невозможен без возврата фигур.',
  drawCooldownLabel: 'Ждать',
  turnsPlayed: 'Ходов',
  movesMade: 'Движений',
  coinsSurvived: 'Монет угадано',
  shotsFired: 'Выстрелов',
  chooseCoinTitle: 'Карта Пули — Выберите сторону',
  dealerFlippedHint: 'Дилер сжимает монету. Выбирайте Орёл или Решка.',
  playerFlippedHint: 'Вы подбрасываете монету. Дилер называет сторону...',
  heads: 'Орёл',
  tails: 'Решка',
  chooseWildPiece: 'Джокер: выберите свою фигуру на доске (кроме Короля).',
  chooseWildTarget: 'Превратить фигуру на 1 ход в:',
  choosePromotion: 'Превращение пешки в:',
  chooseGravePiece: 'Выберите срубленную фигуру для возврата:',
  placeOnHalfHint: 'Кликните по подсвеченной клетке на вашей половине доски.',
  deckRemaining: 'Колода',
  playerHp: 'Вы',
  dealerHp: 'Дилер',
  clickPieceHint: 'Выберите свою фигуру и кликните по подсвеченной клетке.',
  clickDeckHint: 'Кликните по колоде на столе или нажмите Пробел.',
  clickDeckPrompt: 'Клик по колоде или [Space]',
  streakBrokenCheck: 'Шах! Серия ходов прервана.',
  resurrectConverted: 'Нет фигур или клеток для возврата — дан 1 обычный ход.',
  checkSkipRedraw: 'Шах! Карта «Пропуск» отменена — тяните карту снова.',
  checkSkipConverted: 'Шах! Карта «Пропуск» заменена на 1 обычный ход.',
  stalemateReset: 'Пат! Доска сброшена на новый раунд без потери HP.',
  rulesTitle: 'Правила ChUno',
  profileTitle: 'Профиль игрока',
  wins: 'Победы',
  losses: 'Поражения',
  bestStreak: 'Лучшая серия',
  close: 'Закрыть',
  settingsTitle: 'Графика и звук',
  graphicsQuality: 'Качество графики',
  qualityLow: 'Низкое',
  qualityMedium: 'Среднее',
  qualityHigh: 'Высокое',
  showFpsLabel: 'Показывать FPS',
  audioSettingsTitle: 'Настройки звука',
  menuMusicLabel: 'Музыка в главном меню',
  gameMusicLabel: 'Музыка во время игры',
  muteAllLabel: 'Отключить всё',
  unmuteAllLabel: 'Включить звук',
  musicVolumeLabel: 'Громкость музыки',
  sfxVolumeLabel: 'Звуковые эффекты',
  voiceVolumeLabel: 'Громкость голоса',
  dialogueAudioLabel: 'Режим фраз',
  dialogueModeTts: 'Голос (Озвучка / TTS)',
  dialogueModeSfx: 'Только субтитры',
  dialogueModeOff: 'Выкл',
  cardNames: {
    NUM_1: '1 Ход',
    NUM_2: '2 Хода',
    NUM_3: '3 Хода',
    NUM_4: '4 Хода',
    NUM_5: '5 Ходов',
    SKIP: 'Пропуск',
    REVERSE: 'Реверс',
    PLUS_2: '+2 Возврат',
    PLUS_4: '+4 Возврат',
    WILD: 'Джокер',
    BULLET: 'Пуля',
  },
  cardDescs: {
    NUM_1: 'Сделать 1 легальный шахматный ход.',
    NUM_2: 'Сделать 2 хода подряд (прерывается при шахе).',
    NUM_3: 'Сделать 3 хода подряд (прерывается при шахе).',
    NUM_4: 'Сделать 4 хода подряд (прерывается при шахе).',
    NUM_5: 'Сделать 5 ходов подряд (прерывается при шахе).',
    SKIP: 'Активный игрок теряет ход.',
    REVERSE: 'Доска поворачивается на 180°. Смена цвета фигур!',
    PLUS_2: 'Вернуть до 2 срубленных фигур на свою половину.',
    PLUS_4: 'Вернуть до 4 срубленных фигур на свою половину.',
    WILD: 'Превратить 1 свою фигуру (не Короля) на 1 ход.',
    BULLET: 'Монетка 50/50. Ошибка стоит выстрела из револьвера.',
  },
  pieceNames: {
    pawn: 'Пешка',
    rook: 'Ладья',
    knight: 'Конь',
    bishop: 'Слон',
    queen: 'Ферзь',
    king: 'Король',
  },
  howToPlayBtn: 'Как играть',
  guideTabVisual: 'Визуальный гайд',
  guideTabRules: 'Подробные правила',
  guideSkip: 'Пропустить',
  guideBack: 'Назад',
  guideNext: 'Далее',
  guideDone: 'Понятно, играем!',
  guidePauseAuto: 'Пауза автопоказа',
  guideResumeAuto: 'Продолжить автопоказ',
  guideSlides: [
    {
      title: '1. Вытяни карту в начале хода',
      line1: 'Нажми на колоду из 40 карт справа на столе (или клавишу [Space]).',
      line2: 'Карта сразу переворачивается на столе и задаёт твоё действие на ход.',
    },
    {
      title: '2. Сделай ход фигурами',
      line1: 'Числовые карты (1–5 ходов) дают серию от 1 до 5 легальных шахматных ходов.',
      line2: 'Выбери свою фигуру и кликни по подсвеченной клетке. Шах прерывает серию.',
    },
    {
      title: '3. Реверс — разворот доски на 180°',
      line1: 'Карта Реверс разворачивает всю доску на 180° и меняет цвета (Белые ⇄ Чёрные).',
      line2: 'Ты перехватываешь армию соперника, а право хода переходит оппоненту.',
    },
    {
      title: '4. Тактические спецкарты',
      line1: 'Пропуск сжигает ход; +2 / +4 Возврат возвращает срубленные фигуры на твою половину.',
      line2: 'Джокер на 1 ход превращает любую фигуру (кроме Короля) в выбранный тип.',
    },
    {
      title: '5. Survival Mode — Монета и Револьвер',
      line1: 'Карта Пули запускает бросок латунной монеты 50/50 (Орёл ♛ / Решка ☠).',
      line2: 'Угадал — выжил; ошибся — выстрел из револьвера Дилера (-1 HP).',
    },
  ],
  hintDrawCard: 'Нажми на колоду на столе (или [Space]), чтобы вытянуть карту.',
  hintMovePiece: 'Выбери свою фигуру и кликни по подсвеченной клетке.',
  hintResurrect: 'Выбери срубленную фигуру ниже и поставь её на свою половину доски.',
  hintWild: 'Выбери свою фигуру (кроме Короля), чтобы временно превратить её на 1 ход.',
  hintCoinFlip: 'Карта Пули! Выбери Орёл или Решку — ошибка стоит выстрела.',
  privacyTitle: 'Конфиденциальность',
  privacyLine1: 'Сохранения, ачивки и настройки хранятся только локально на устройстве.',
  privacyLine2: 'Без рекламы и телеметрии; в десктопе сеть нужна только для проверки обновлений (latest.json).',
  privacyLinkLabel: 'Политика конфиденциальности',
};

const UZ: Translations = {
  ...EN,
  gameTitle: 'ChUno',
  modeSurvival: 'Omon qolish',
  modeLight: 'Kampaniya',
  modeOnline: 'Tarmoq o‘yini',
  difficultyEasy: 'Oson · 3 HP',
  difficultyMedium: 'O‘rtacha · 2 HP',
  difficultyHard: 'Qiyin · 1 HP',
  personalityUnknown: 'Noma’lum',
  personalityEnthusiast: 'Ishtiyoqmand',
  personalityEgoist: 'Egoist',
  personalityCalm: 'Sokin faylasuf',
  startGame: 'Stolga o‘tirish',
  rulesAndStats: 'Qoidalar va Statistika',
  godotSource: 'Godot 4.3+ kodi',
  leaderboardBtn: 'Peshqadamlar',
  leaderboardTab: 'Peshqadamlar',
  achievementsTab: 'Yutuqlar',
  profileBtn: 'Profil',
  profileModalTitle: 'O‘yinchi profili',
  nicknameLabel: 'O‘yinchi ismi',
  nicknamePlaceholder: 'Ism kiriting (2–18 belgi)',
  nicknameHint: '2 dan 18 belgigacha. Peshqadamlar jadvali, HUD va onlayn lobbida ko‘rinadi.',
  nicknameErrShort: 'Kamida 2 ta belgi kiriting.',
  nicknameErrLong: 'Ko‘pi bilan 18 ta belgi.',
  saveNickname: 'Saqlash',
  savedLabel: 'Saqlandi',
  avatarSectionTitle: 'Stoldagi qiyofa',
  avatarFilterAll: 'Barchasi (10)',
  avatarFilterMale: 'Erkaklar (6)',
  avatarFilterFemale: 'Ayollar (4)',
  changeAvatarBtn: 'Qiyofani almashtirish',
  avatar3dReadyHint: 'Kelajakdagi 1v1 stollarda 3D-model avatarId orqali chiziladi',
  onlineSubtitle: 'Do‘st bilan kod yoki havola orqali 1v1 rejimini tanlang.',
  onlineFriendlyTitle: 'Klassik',
  onlineFriendlyDesc: 'Xona kodi yoki havola orqali do‘st bilan oddiy 1v1 ChUno o‘yini.',
  onlineSurvivalTitle: 'Omon qolish',
  onlineSurvivalDesc: 'O‘q kartasi, revolver va 1 / 2 / 3 HP tanlovi bilan 1v1 duel.',
  onlineCreateRoom: 'Xona yaratish',
  onlineJoinRoom: 'Kod bilan kirish',
  onlineRoomCodeLabel: 'Xona kodi',
  onlineCopyCode: 'Kodni nusxalash',
  onlineCodeCopied: 'Nusxalandi!',
  onlineCopyLink: 'Havolani nusxalash',
  onlineLinkCopied: 'Havola nusxalandi',
  onlineRegenerateCode: 'Yangi xona',
  onlineEnterCodePlaceholder: 'CH-XXXX',
  onlineJoinBtn: 'Xonaga kirish',
  onlineBackToModes: 'Tarmoq rejimlariga qaytish',
  onlinePreviewNotice: 'Tarmoq serveriga ulandi.',
  onlineJoinPreviewReply: 'Xonaga ulanilmoqda...',
  onlineInvalidCode: 'CH-4829 ko‘rinishidagi kod kiriting.',
  onlineConnecting: 'Ulanmoqda...',
  onlineConnected: 'Ulandi',
  onlineReconnecting: 'Qayta ulanmoqda...',
  onlineServerOffline: 'Tarmoq serveri ishlamayapti (chuno-mp-server, 8787-port).',
  onlineRoomNotFound: 'Xona topilmadi. Kodni tekshiring.',
  onlineRoomFull: 'Bu xonada allaqachon 2 ta o‘yinchi bor.',
  onlineRoomInProgress: 'Bu xonada o‘yin allaqachon davom etmoqda.',
  onlineSeatReserved: 'Bu o‘rin qayta ulanayotgan o‘yinchi uchun band.',
  onlineWaitingGuest: 'Ikkinchi o‘yinchi kutilmoqda...',
  onlineReady: 'Tayyor',
  onlineNotReady: 'Tayyor emas',
  onlineStartMatch: 'O‘yinni boshlash',
  onlineStartingHpLabel: 'Boshlang‘ich HP',
  onlineRematch: 'Revansh',
  onlineRematchWaiting: 'Raqib kutilmoqda...',
  onlineRematchRequested: 'Raqib revansh taklif qildi!',
  onlineThinkTimeLabel: 'Yurish vaqti',
  onlineAvgTurnLabel: 'O‘rtacha / yurish',
  onlineDisconnectPaused: 'Raqib uzildi · Taymer pauzada (90 soniya)',
  onlineClaimDisconnectWin: 'G‘alabani olish',
  onlineDisconnectForfeitReason: 'Raqib 90 soniyada qaytmadi',
  onlineReconnectBannerTitle: 'Faol onlayn o‘yin',
  onlineReconnectBannerBtn: 'O‘yinga qaytish',
  onlineReconnectDismissBtn: 'Yashirish',
  onlineReconnectingOverlay: 'Aloqa tiklanmoqda...',
  onlineOpponentDisconnectedBanner: 'Raqib uzildi — qayta ulanish kutilmoqda',
  onlineOpponentReconnectedNotice: 'Raqib o‘yinga qaytdi!',
  onlineVisibilityLabel: 'Xona ko‘rinishi',
  onlinePublicLabel: 'Ochiq (hammaga ko‘rinadi)',
  onlinePrivateLabel: 'Yopiq (faqat kod bilan)',
  onlinePublicBadge: 'Ochiq',
  onlinePrivateBadge: 'Yopiq',
  onlineQuickMatchBtn: 'Tez o‘yin · Tasodifiy raqib',
  onlineQuickMatchDesc: 'Bo‘sh ochiq xonaga kirish yoki kutish uchun ochiq stol yaratish.',
  onlineQuickMatchSearching: 'Raqib qidirilmoqda...',
  onlineOpenRoomsTitle: 'Ochiq xonalar',
  onlineRefreshBtn: 'Yangilash',
  onlineNoOpenRooms: 'Hozircha ochiq xonalar yo‘q — «Tez o‘yin»ni bosing yoki xona yarating.',
  onlineJoinByCodeTitle: 'Xona kodi orqali kirish (CH-XXXX)',
  onlineEnterRoomBtn: 'Kirish',
  friendsTab: 'Do‘stlar',
  yourFriendCodeLabel: 'Sizning do‘st kodingiz',
  addFriendBtn: 'Do‘stlarga qo‘shish',
  addedFriendBadge: 'Do‘stlarda ✓',
  addFriendByCodeTitle: 'Kod orqali do‘st qo‘shish',
  friendCodePlaceholder: 'CHUNO-XXXX-XXXX',
  friendNameOptionalPlaceholder: 'Ism (ixtiyoriy)',
  addFriendSubmitBtn: 'Qo‘shish',
  friendErrInvalidCode: 'CHUNO-4A8K-9P2Q ko‘rinishidagi kod kiriting.',
  friendErrSelf: 'O‘z do‘st kodingizni qo‘shib bo‘lmaydi.',
  friendErrDuplicate: 'Bu o‘yinchi allaqachon do‘stlaringiz ro‘yxatida.',
  friendsEmptyHint: 'Hozircha do‘stlar yo‘q. Do‘st kodingizni ulashing yoki o‘yin paytida raqibni qo‘shing.',
  friendMatchesTogether: 'Birgalikdagi o‘yinlar',
  friendInviteBtn: 'Xonaga taklif qilish',
  friendInviteCopied: 'Taklif nusxalandi!',
  friendJoinOpenRoomBtn: 'Qo‘shilish',
  friendRemoveBtn: 'O‘chirish',
  friendOnlineNow: 'Ochiq xonada kutmoqda',
  updateAvailableTitle: 'Yangilanish mavjud',
  updateNowBtn: 'Yangilash',
  updateLaterBtn: 'Keyinroq',
  yourTurn: 'Sizning yurishingiz',
  opponentTurn: 'Raqib yurishi',
  dealerName: 'Diler',
  friendName: 'Raqib',
  playingAsWhite: 'Oqlar',
  playingAsBlack: 'Qoralar',
  drawCard: 'Karta olish',
  movesLeft: 'Qolgan yurishlar',
  resurrectLeft: 'Tiklanadigan donalar',
  checkWarning: 'SHOH',
  checkSkipRedraw: 'Shoh! «O‘tkazish» bekor qilindi — yana karta torting.',
  checkSkipConverted: 'Shoh! «O‘tkazish» 1 ta oddiy yurishga almashtirildi.',
  pause: 'Pauza [Esc]',
  resume: 'Davom etish',
  restart: 'Qayta boshlash',
  mainMenu: 'Bosh menyu',
  playAgain: 'Yana o‘ynash',
  pausedTitle: 'Pauza',
  victory: 'G‘alaba',
  defeat: 'Mag‘lubiyat',
  drawResult: 'Durang',
  matchTime: 'Vaqt',
  offerDraw: 'Durang',
  resign: 'Taslim bo‘lish',
  close: 'Yopish',
  howToPlayBtn: 'Qanday o‘ynaladi',
  rulesTitle: 'ChUno qoidalari',
  profileTitle: 'O‘yinchi profili',
  wins: 'G‘alabalar',
  losses: 'Mag‘lubiyatlar',
  bestStreak: 'Eng uzun seriya',
  audioSettingsTitle: 'Ovoz sozlamalari',
  privacyTitle: 'Maxfiylik',
  privacyLinkLabel: 'Maxfiylik siyosati',
};

export function getTranslations(lang: Language): Translations {
  if (lang === 'ru') return RU;
  if (lang === 'uz') return UZ;
  return EN;
}

export function formatMatchTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}
