import { CardType } from './deck/cardData';

export type Language = 'en' | 'ru';

export interface Translations {
  gameTitle: string;
  modeSurvival: string;
  modeLight: string;
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
}

const EN: Translations = {
  gameTitle: 'ChUno',
  modeSurvival: 'Survival',
  modeLight: 'Friendly',
  difficultyEasy: 'Easy · 3 HP',
  difficultyMedium: 'Medium · 2 HP',
  difficultyHard: 'Hard · 1 HP',
  personalityUnknown: 'Unknown',
  personalityEnthusiast: 'Enthusiast',
  personalityEgoist: 'Egoist',
  personalityCalm: 'Calm Philosopher',
  startGame: 'Take a Seat',
  rulesAndStats: 'Rules & Profile',
  godotSource: 'Godot 4.3+',
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
  dialogueModeTts: 'Voice (MP3 / TTS)',
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
};

const RU: Translations = {
  gameTitle: 'ChUno',
  modeSurvival: 'Выживание',
  modeLight: 'Дружеский',
  difficultyEasy: 'Лёгкий · 3 HP',
  difficultyMedium: 'Средний · 2 HP',
  difficultyHard: 'Сложный · 1 HP',
  personalityUnknown: 'Неизвестный',
  personalityEnthusiast: 'Энтузиаст',
  personalityEgoist: 'Эгоист',
  personalityCalm: 'Спокойный философ',
  startGame: 'Сесть за стол',
  rulesAndStats: 'Правила и Профиль',
  godotSource: 'Код Godot 4.3+',
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
  dialogueModeTts: 'Голос (MP3 / TTS)',
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
};

export function getTranslations(lang: Language): Translations {
  return lang === 'ru' ? RU : EN;
}

export function formatMatchTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}
