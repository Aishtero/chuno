import { soundManager } from '../audio/soundManager';
import { DialogueAudioMode, LightPersonality } from '../core/deck/cardData';
import { Language } from '../core/localization';

export type DialogueEvent =
  | 'match_start'
  | 'match_start_hard'
  | 'player_draw_high'
  | 'player_draw_skip'
  | 'reverse_board'
  | 'resurrect_pieces'
  | 'bullet_drawn_by_player'
  | 'bullet_drawn_by_opponent'
  | 'coin_survived'
  | 'coin_shot_hit'
  | 'check_to_player'
  | 'check_to_opponent'
  | 'idle_taunt'
  | 'draw_accepted'
  | 'draw_declined'
  | 'draw_declined_hard'
  | 'draw_declined_early'
  | 'player_resigned'
  | 'gameover_loss_checkmate'
  | 'gameover_loss_revolver'
  | 'gameover_win';

export type DialogueSpeaker = 'dealer' | 'enthusiast' | 'egoist' | 'calm' | 'unknown';

export interface VoiceRegistryEntry {
  id: string;
  speaker: DialogueSpeaker;
  event: DialogueEvent;
  text: {
    en: string;
    ru: string;
  };
  audio: {
    en: string;
    ru: string;
  };
}

/**
 * Set to true once .mp3/.wav/.ogg voice files are placed under public/audio/voices/.
 * Keeping this false when files are absent prevents 404 network console errors.
 */
export const VOICE_GAIN_SCALE = 0.45;
const VOICE_VOLUME_CURVE = 1.8;

export function computeEffectiveVoiceVolume(sliderVolume: number): number {
  const clamped = Math.max(0, Math.min(1, sliderVolume));
  if (clamped <= 0) return 0;
  return Math.pow(clamped, VOICE_VOLUME_CURVE) * VOICE_GAIN_SCALE;
}

const ENABLE_EXTERNAL_VOICE_AUDIO = false;

export const VOICE_REGISTRY: VoiceRegistryEntry[] = [
  // =========================================================================
  // SURVIVAL MODE — THE DEALER
  // =========================================================================
  {
    id: 'dealer_match_start_01',
    speaker: 'dealer',
    event: 'match_start',
    text: {
      en: 'Sit down. Forty cards, thirty-two pieces, and one loaded cylinder.',
      ru: 'Садись. Сорок карт, тридцать две фигуры и один заряженный барабан.',
    },
    audio: {
      en: '/audio/voices/dealer/en/match_start_01.mp3',
      ru: '/audio/voices/dealer/ru/match_start_01.mp3',
    },
  },
  {
    id: 'dealer_match_start_02',
    speaker: 'dealer',
    event: 'match_start',
    text: {
      en: 'Let us see what fate pulls from the stack tonight.',
      ru: 'Посмотрим, что судьба вытянет из колоды этой ночью.',
    },
    audio: {
      en: '/audio/voices/dealer/en/match_start_02.mp3',
      ru: '/audio/voices/dealer/ru/match_start_02.mp3',
    },
  },
  {
    id: 'dealer_draw_high_01',
    speaker: 'dealer',
    event: 'player_draw_high',
    text: {
      en: 'Greedy hands. Four or five moves will not save a careless king.',
      ru: 'Жадная рука. Четыре или пять ходов не спасут беспечного короля.',
    },
    audio: {
      en: '/audio/voices/dealer/en/draw_high_01.mp3',
      ru: '/audio/voices/dealer/ru/draw_high_01.mp3',
    },
  },
  {
    id: 'dealer_draw_skip_01',
    speaker: 'dealer',
    event: 'player_draw_skip',
    text: {
      en: 'Skipped. Sit still and watch me work.',
      ru: 'Пропуск. Сиди смирно и смотри на мой ход.',
    },
    audio: {
      en: '/audio/voices/dealer/en/draw_skip_01.mp3',
      ru: '/audio/voices/dealer/ru/draw_skip_01.mp3',
    },
  },
  {
    id: 'dealer_reverse_01',
    speaker: 'dealer',
    event: 'reverse_board',
    text: {
      en: 'Swap sides. Now defend the traps you built yourself.',
      ru: 'Меняемся сторонами. Теперь защищайся от своих же ловушек.',
    },
    audio: {
      en: '/audio/voices/dealer/en/reverse_01.mp3',
      ru: '/audio/voices/dealer/ru/reverse_01.mp3',
    },
  },
  {
    id: 'dealer_resurrect_01',
    speaker: 'dealer',
    event: 'resurrect_pieces',
    text: {
      en: 'Pulling dead wood back onto the board? Cute.',
      ru: 'Тащишь мёртвые фигуры обратно на доску? Забавно.',
    },
    audio: {
      en: '/audio/voices/dealer/en/resurrect_01.mp3',
      ru: '/audio/voices/dealer/ru/resurrect_01.mp3',
    },
  },
  {
    id: 'dealer_bullet_player_01',
    speaker: 'dealer',
    event: 'bullet_drawn_by_player',
    text: {
      en: 'You pulled the Bullet. Flip the brass—let me guess.',
      ru: 'Ты вытянул Пулю. Подбрасывай латунь — мой черёд угадывать.',
    },
    audio: {
      en: '/audio/voices/dealer/en/bullet_player_01.mp3',
      ru: '/audio/voices/dealer/ru/bullet_player_01.mp3',
    },
  },
  {
    id: 'dealer_bullet_opponent_01',
    speaker: 'dealer',
    event: 'bullet_drawn_by_opponent',
    text: {
      en: 'My favorite card in all forty. Heads or tails, strategist?',
      ru: 'Моя любимая карта из сорока. Орёл или решка, стратег?',
    },
    audio: {
      en: '/audio/voices/dealer/en/bullet_opponent_01.mp3',
      ru: '/audio/voices/dealer/ru/bullet_opponent_01.mp3',
    },
  },
  {
    id: 'dealer_coin_survived_01',
    speaker: 'dealer',
    event: 'coin_survived',
    text: {
      en: 'Tch. A lucky breath. The chamber is still waiting.',
      ru: 'Тц. Удачный вдох. Камора всё ещё ждёт.',
    },
    audio: {
      en: '/audio/voices/dealer/en/coin_survived_01.mp3',
      ru: '/audio/voices/dealer/ru/coin_survived_01.mp3',
    },
  },
  {
    id: 'dealer_coin_shot_01',
    speaker: 'dealer',
    event: 'coin_shot_hit',
    text: {
      en: 'Brass never lies. Hear that cold hammer drop?',
      ru: 'Латунь не врёт. Слышишь этот холодный щелчок курка?',
    },
    audio: {
      en: '/audio/voices/dealer/en/coin_shot_01.mp3',
      ru: '/audio/voices/dealer/ru/coin_shot_01.mp3',
    },
  },
  {
    id: 'dealer_check_player_01',
    speaker: 'dealer',
    event: 'check_to_player',
    text: {
      en: 'Check. Your king is running out of dark corners.',
      ru: 'Шах. Твоему королю больше негде прятаться.',
    },
    audio: {
      en: '/audio/voices/dealer/en/check_player_01.mp3',
      ru: '/audio/voices/dealer/ru/check_player_01.mp3',
    },
  },
  {
    id: 'dealer_check_opponent_01',
    speaker: 'dealer',
    event: 'check_to_opponent',
    text: {
      en: 'A bold check. Enjoy the spark while it lasts.',
      ru: 'Дерзкий шах. Наслаждайся моментом, пока можешь.',
    },
    audio: {
      en: '/audio/voices/dealer/en/check_opponent_01.mp3',
      ru: '/audio/voices/dealer/ru/check_opponent_01.mp3',
    },
  },
  {
    id: 'dealer_idle_01',
    speaker: 'dealer',
    event: 'idle_taunt',
    text: {
      en: 'Staring at the board will not move the wood for you.',
      ru: 'Если просто сверлить доску взглядом, фигуры сами не пойдут.',
    },
    audio: {
      en: '/audio/voices/dealer/en/idle_01.mp3',
      ru: '/audio/voices/dealer/ru/idle_01.mp3',
    },
  },
  {
    id: 'dealer_idle_02',
    speaker: 'dealer',
    event: 'idle_taunt',
    text: {
      en: 'Hurry up. The lamp is burning down.',
      ru: 'Пошевеливайся. Лампа не будет светить вечно.',
    },
    audio: {
      en: '/audio/voices/dealer/en/idle_02.mp3',
      ru: '/audio/voices/dealer/ru/idle_02.mp3',
    },
  },
  // Strictly Chess / Checkmate loss quotes (NO revolver/coin/bullet references)
  {
    id: 'dealer_checkmate_01',
    speaker: 'dealer',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Oh, how sad that you lost again... your king had nowhere left to run.',
      ru: 'Ой, как печально, что ты снова проиграл... твоему королю больше некуда бежать.',
    },
    audio: {
      en: '/audio/voices/dealer/en/checkmate_01.mp3',
      ru: '/audio/voices/dealer/ru/checkmate_01.mp3',
    },
  },
  {
    id: 'dealer_checkmate_02',
    speaker: 'dealer',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Checkmate. Every square sealed, every escape cut clean.',
      ru: 'Мат. Все клетки перекрыты, ни единого выхода для короля.',
    },
    audio: {
      en: '/audio/voices/dealer/en/checkmate_02.mp3',
      ru: '/audio/voices/dealer/ru/checkmate_02.mp3',
    },
  },
  {
    id: 'dealer_checkmate_03',
    speaker: 'dealer',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Leave your fallen king on the board. I collect crowns.',
      ru: 'Оставь павшего короля на доске. Я коллекционирую короны.',
    },
    audio: {
      en: '/audio/voices/dealer/en/checkmate_03.mp3',
      ru: '/audio/voices/dealer/ru/checkmate_03.mp3',
    },
  },
  // Strictly Revolver / Coin / Bullet loss quotes
  {
    id: 'dealer_revolver_01',
    speaker: 'dealer',
    event: 'gameover_loss_revolver',
    text: {
      en: 'Your pulse flatlined faster than the coin settled.',
      ru: 'Твой пульс оборвался быстрее, чем улеглась монета.',
    },
    audio: {
      en: '/audio/voices/dealer/en/revolver_01.mp3',
      ru: '/audio/voices/dealer/ru/revolver_01.mp3',
    },
  },
  {
    id: 'dealer_revolver_02',
    speaker: 'dealer',
    event: 'gameover_loss_revolver',
    text: {
      en: 'Six steel chambers settle what a chess blunder could not.',
      ru: 'Шесть стальных камор поставили точку там, где не хватило удачи.',
    },
    audio: {
      en: '/audio/voices/dealer/en/revolver_02.mp3',
      ru: '/audio/voices/dealer/ru/revolver_02.mp3',
    },
  },
  {
    id: 'dealer_revolver_03',
    speaker: 'dealer',
    event: 'gameover_loss_revolver',
    text: {
      en: 'Brass spun clean. You guessed wrong one time too many.',
      ru: 'Монета легла чисто. Ты ошибся в последний раз.',
    },
    audio: {
      en: '/audio/voices/dealer/en/revolver_03.mp3',
      ru: '/audio/voices/dealer/ru/revolver_03.mp3',
    },
  },
  {
    id: 'dealer_win_01',
    speaker: 'dealer',
    event: 'gameover_win',
    text: {
      en: 'You outlasted the dark across this table. Do not expect mercy next time.',
      ru: 'Ты пережил этот стол. Не жди пощады в следующей партии.',
    },
    audio: {
      en: '/audio/voices/dealer/en/gameover_win_01.mp3',
      ru: '/audio/voices/dealer/ru/gameover_win_01.mp3',
    },
  },
  {
    id: 'dealer_draw_hard_01',
    speaker: 'dealer',
    event: 'draw_declined_hard',
    text: {
      en: 'A draw? You leave this table winning, or in a box.',
      ru: 'Ничья? Из-за этого стола уходят либо победителем, либо вперёд ногами.',
    },
    audio: {
      en: '/audio/voices/dealer/en/draw_hard_01.mp3',
      ru: '/audio/voices/dealer/ru/draw_hard_01.mp3',
    },
  },
  {
    id: 'dealer_draw_hard_02',
    speaker: 'dealer',
    event: 'draw_declined_hard',
    text: {
      en: "Mercy isn't in the deck on this difficulty.",
      ru: 'На этой сложности пощады в колоде нет.',
    },
    audio: {
      en: '/audio/voices/dealer/en/draw_hard_02.mp3',
      ru: '/audio/voices/dealer/ru/draw_hard_02.mp3',
    },
  },
  {
    id: 'dealer_draw_early_01',
    speaker: 'dealer',
    event: 'draw_declined_early',
    text: {
      en: 'Too early. Bleed a little first.',
      ru: 'Рано. Сначала пролей немного крови.',
    },
    audio: {
      en: '/audio/voices/dealer/en/draw_early_01.mp3',
      ru: '/audio/voices/dealer/ru/draw_early_01.mp3',
    },
  },

  // =========================================================================
  // LIGHT MODE — ENTHUSIAST
  // =========================================================================
  {
    id: 'enthusiast_start_01',
    speaker: 'enthusiast',
    event: 'match_start',
    text: {
      en: 'What a lovely breeze! Ready for some wild ChUno?',
      ru: 'Какой чудесный ветерок! Сыграем яркую партию в ChUno?',
    },
    audio: { en: '/audio/voices/enthusiast/en/start_01.mp3', ru: '/audio/voices/enthusiast/ru/start_01.mp3' },
  },
  {
    id: 'enthusiast_high_01',
    speaker: 'enthusiast',
    event: 'player_draw_high',
    text: {
      en: 'Whoa, look at that card draw! Let us see a brilliant combo!',
      ru: 'Ух ты, вот это карта! Покажи красивую комбинацию!',
    },
    audio: { en: '/audio/voices/enthusiast/en/high_01.mp3', ru: '/audio/voices/enthusiast/ru/high_01.mp3' },
  },
  {
    id: 'enthusiast_skip_01',
    speaker: 'enthusiast',
    event: 'player_draw_skip',
    text: {
      en: 'Skipped! Take a sip of tea while I plan my move.',
      ru: 'Пропуск! Самое время сделать глоток чая, пока я думаю.',
    },
    audio: { en: '/audio/voices/enthusiast/en/skip_01.mp3', ru: '/audio/voices/enthusiast/ru/skip_01.mp3' },
  },
  {
    id: 'enthusiast_reverse_01',
    speaker: 'enthusiast',
    event: 'reverse_board',
    text: {
      en: 'Board spin! I love switching armies mid-game!',
      ru: 'Разворот доски! Обожаю меняться фигурами в разгар игры!',
    },
    audio: { en: '/audio/voices/enthusiast/en/reverse_01.mp3', ru: '/audio/voices/enthusiast/ru/reverse_01.mp3' },
  },
  {
    id: 'enthusiast_resurrect_01',
    speaker: 'enthusiast',
    event: 'resurrect_pieces',
    text: {
      en: 'Reinforcements! That makes the board so exciting!',
      ru: 'Подкрепление! Партия становится ещё интереснее!',
    },
    audio: { en: '/audio/voices/enthusiast/en/resurrect_01.mp3', ru: '/audio/voices/enthusiast/ru/resurrect_01.mp3' },
  },
  {
    id: 'enthusiast_check_01',
    speaker: 'enthusiast',
    event: 'check_to_opponent',
    text: {
      en: 'Check! What a sharp tactical line!',
      ru: 'Шах! Какая острая тактическая идея!',
    },
    audio: { en: '/audio/voices/enthusiast/en/check_01.mp3', ru: '/audio/voices/enthusiast/ru/check_01.mp3' },
  },
  {
    id: 'enthusiast_check_p_01',
    speaker: 'enthusiast',
    event: 'check_to_player',
    text: {
      en: 'Check! Watch your king closely!',
      ru: 'Шах! Приглядывай за королём!',
    },
    audio: { en: '/audio/voices/enthusiast/en/check_p_01.mp3', ru: '/audio/voices/enthusiast/ru/check_p_01.mp3' },
  },
  {
    id: 'enthusiast_idle_01',
    speaker: 'enthusiast',
    event: 'idle_taunt',
    text: {
      en: 'Calculating a five-move masterpiece? Take your time!',
      ru: 'Просчитываешь шедевр на пять ходов вперёд? Не торопись!',
    },
    audio: { en: '/audio/voices/enthusiast/en/idle_01.mp3', ru: '/audio/voices/enthusiast/ru/idle_01.mp3' },
  },
  {
    id: 'enthusiast_loss_01',
    speaker: 'enthusiast',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Good game! That checkmate was genuinely thrilling — rematch?',
      ru: 'Отличная партия! Этот мат был потрясающим — реванш?',
    },
    audio: { en: '/audio/voices/enthusiast/en/loss_01.mp3', ru: '/audio/voices/enthusiast/ru/loss_01.mp3' },
  },
  {
    id: 'enthusiast_win_01',
    speaker: 'enthusiast',
    event: 'gameover_win',
    text: {
      en: 'Haha, you outplayed me cleanly! Well fought!',
      ru: 'Ха-ха, ты меня красиво переиграл! Браво!',
    },
    audio: { en: '/audio/voices/enthusiast/en/win_01.mp3', ru: '/audio/voices/enthusiast/ru/win_01.mp3' },
  },

  // =========================================================================
  // LIGHT MODE — EGOIST
  // =========================================================================
  {
    id: 'egoist_start_01',
    speaker: 'egoist',
    event: 'match_start',
    text: {
      en: 'Try to keep up. I rarely lose on a sunny afternoon.',
      ru: 'Попробуй угнаться. Я редко проигрываю в такую погоду.',
    },
    audio: { en: '/audio/voices/egoist/en/start_01.mp3', ru: '/audio/voices/egoist/ru/start_01.mp3' },
  },
  {
    id: 'egoist_high_01',
    speaker: 'egoist',
    event: 'player_draw_high',
    text: {
      en: 'Pure luck. Let us see if you even use those moves properly.',
      ru: 'Чистое везение. Посмотрим, сумеешь ли ты правильно ими распорядиться.',
    },
    audio: { en: '/audio/voices/egoist/en/high_01.mp3', ru: '/audio/voices/egoist/ru/high_01.mp3' },
  },
  {
    id: 'egoist_skip_01',
    speaker: 'egoist',
    event: 'player_draw_skip',
    text: {
      en: 'Skipped! Even the deck knows whose turn really matters.',
      ru: 'Пропуск! Даже колода понимает, чей ход здесь важнее.',
    },
    audio: { en: '/audio/voices/egoist/en/skip_01.mp3', ru: '/audio/voices/egoist/ru/skip_01.mp3' },
  },
  {
    id: 'egoist_reverse_01',
    speaker: 'egoist',
    event: 'reverse_board',
    text: {
      en: 'Switching sides? Does not matter, I win with either color.',
      ru: 'Смена сторон? Неважно, я выигрываю любым цветом.',
    },
    audio: { en: '/audio/voices/egoist/en/reverse_01.mp3', ru: '/audio/voices/egoist/ru/reverse_01.mp3' },
  },
  {
    id: 'egoist_resurrect_01',
    speaker: 'egoist',
    event: 'resurrect_pieces',
    text: {
      en: 'Bringing pieces back already? Feeling desperate?',
      ru: 'Уже возвращаешь фигуры? Пахнет отчаянием.',
    },
    audio: { en: '/audio/voices/egoist/en/resurrect_01.mp3', ru: '/audio/voices/egoist/ru/resurrect_01.mp3' },
  },
  {
    id: 'egoist_check_01',
    speaker: 'egoist',
    event: 'check_to_player',
    text: {
      en: 'Check! Bet you did not see that coming.',
      ru: 'Шах! Спорим, ты этого не ожидал?',
    },
    audio: { en: '/audio/voices/egoist/en/check_01.mp3', ru: '/audio/voices/egoist/ru/check_01.mp3' },
  },
  {
    id: 'egoist_idle_01',
    speaker: 'egoist',
    event: 'idle_taunt',
    text: {
      en: 'Any day now. The sun will set before you find a move.',
      ru: 'Давай уже. Солнце сядет раньше, чем ты найдёшь ход.',
    },
    audio: { en: '/audio/voices/egoist/en/idle_01.mp3', ru: '/audio/voices/egoist/ru/idle_01.mp3' },
  },
  {
    id: 'egoist_loss_01',
    speaker: 'egoist',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Checkmate, as expected. Want another lesson?',
      ru: 'Мат, как и ожидалось. Хочешь ещё один урок?',
    },
    audio: { en: '/audio/voices/egoist/en/loss_01.mp3', ru: '/audio/voices/egoist/ru/loss_01.mp3' },
  },
  {
    id: 'egoist_check_opp_01',
    speaker: 'egoist',
    event: 'check_to_opponent',
    text: {
      en: 'Cute check. Enjoy the moment while it lasts.',
      ru: 'Милый шах. Наслаждайся моментом, пока он не кончился.',
    },
    audio: {
      en: '/audio/voices/egoist/en/egoist_check_opp_01.mp3',
      ru: '/audio/voices/egoist/ru/egoist_check_opp_01.mp3',
    },
  },
  {
    id: 'egoist_win_01',
    speaker: 'egoist',
    event: 'gameover_win',
    text: {
      en: 'Wait—really? Okay, fine, that was actually pretty slick.',
      ru: 'Погоди... серьёзно? Ладно, признаю, это было сильно.',
    },
    audio: { en: '/audio/voices/egoist/en/win_01.mp3', ru: '/audio/voices/egoist/ru/win_01.mp3' },
  },

  // =========================================================================
  // FRIENDLY MODE — CALM PHILOSOPHER
  // =========================================================================
  {
    id: 'calm_start_01',
    speaker: 'calm',
    event: 'match_start',
    text: {
      en: 'Take your time. The meadow is not going anywhere.',
      ru: 'Не спеши. Луг никуда не убежит.',
    },
    audio: { en: '/audio/voices/calm/en/start_01.mp3', ru: '/audio/voices/calm/ru/start_01.mp3' },
  },
  {
    id: 'calm_high_01',
    speaker: 'calm',
    event: 'player_draw_high',
    text: {
      en: 'A generous draw. Let us see where the rhythm takes us.',
      ru: 'Щедрая карта. Посмотрим, куда приведёт ритм игры.',
    },
    audio: { en: '/audio/voices/calm/en/high_01.mp3', ru: '/audio/voices/calm/ru/high_01.mp3' },
  },
  {
    id: 'calm_skip_01',
    speaker: 'calm',
    event: 'player_draw_skip',
    text: {
      en: 'A quiet pause. Even chess needs room to breathe.',
      ru: 'Небольшая пауза. Даже шахматам нужен воздух.',
    },
    audio: { en: '/audio/voices/calm/en/skip_01.mp3', ru: '/audio/voices/calm/ru/skip_01.mp3' },
  },
  {
    id: 'calm_reverse_01',
    speaker: 'calm',
    event: 'reverse_board',
    text: {
      en: 'Perspective shifts. Sometimes seeing the other side helps.',
      ru: 'Смена перспективы. Полезно взглянуть на доску с другой стороны.',
    },
    audio: { en: '/audio/voices/calm/en/reverse_01.mp3', ru: '/audio/voices/calm/ru/reverse_01.mp3' },
  },
  {
    id: 'calm_resurrect_01',
    speaker: 'calm',
    event: 'resurrect_pieces',
    text: {
      en: 'Old pieces return to the board. Everything moves in cycles.',
      ru: 'Старые фигуры возвращаются на доску. Всё движется по кругу.',
    },
    audio: { en: '/audio/voices/calm/en/resurrect_01.mp3', ru: '/audio/voices/calm/ru/resurrect_01.mp3' },
  },
  {
    id: 'calm_check_01',
    speaker: 'calm',
    event: 'check_to_player',
    text: {
      en: 'Your king should mind the breeze from that diagonal.',
      ru: 'Твоему королю стоит поберечься от этой линии.',
    },
    audio: { en: '/audio/voices/calm/en/check_01.mp3', ru: '/audio/voices/calm/ru/check_01.mp3' },
  },
  {
    id: 'calm_idle_01',
    speaker: 'calm',
    event: 'idle_taunt',
    text: {
      en: 'Listen to the wind in the grass—no rush at all.',
      ru: 'Послушай ветер в траве — торопиться вовсе некуда.',
    },
    audio: { en: '/audio/voices/calm/en/idle_01.mp3', ru: '/audio/voices/calm/ru/idle_01.mp3' },
  },
  {
    id: 'calm_loss_01',
    speaker: 'calm',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'A peaceful match well played. Shall we set the pieces again?',
      ru: 'Спокойная, достойная партия. Расставим фигуры снова?',
    },
    audio: { en: '/audio/voices/calm/en/loss_01.mp3', ru: '/audio/voices/calm/ru/loss_01.mp3' },
  },
  {
    id: 'calm_check_opp_01',
    speaker: 'calm',
    event: 'check_to_opponent',
    text: {
      en: 'A thoughtful check. Let me step aside gracefully.',
      ru: 'Вдумчивый шах. Позволь мне спокойно отступить.',
    },
    audio: {
      en: '/audio/voices/calm/en/calm_check_opp_01.mp3',
      ru: '/audio/voices/calm/ru/calm_check_opp_01.mp3',
    },
  },
  {
    id: 'calm_win_01',
    speaker: 'calm',
    event: 'gameover_win',
    text: {
      en: 'Gracefully played. That checkmate was well deserved.',
      ru: 'Изящная игра. Заслуженный мат.',
    },
    audio: { en: '/audio/voices/calm/en/win_01.mp3', ru: '/audio/voices/calm/ru/win_01.mp3' },
  },

  // =========================================================================
  // FRIENDLY MODE — UNKNOWN (INCOGNITO)
  // =========================================================================
  {
    id: 'unknown_start_01',
    speaker: 'unknown',
    event: 'match_start',
    text: {
      en: 'No names. Just sixty-four squares and a deck.',
      ru: 'Без имён. Только шестьдесят четыре клетки и колода.',
    },
    audio: { en: '/audio/voices/unknown/en/start_01.mp3', ru: '/audio/voices/unknown/ru/start_01.mp3' },
  },
  {
    id: 'unknown_start_02',
    speaker: 'unknown',
    event: 'match_start',
    text: {
      en: 'Watch the hands, not the hat.',
      ru: 'Следи за ходами, а не за шляпой.',
    },
    audio: { en: '/audio/voices/unknown/en/start_02.mp3', ru: '/audio/voices/unknown/ru/start_02.mp3' },
  },
  {
    id: 'unknown_high_01',
    speaker: 'unknown',
    event: 'player_draw_high',
    text: {
      en: 'Many moves. Few right ones.',
      ru: 'Много ходов. Верных — единицы.',
    },
    audio: { en: '/audio/voices/unknown/en/high_01.mp3', ru: '/audio/voices/unknown/ru/high_01.mp3' },
  },
  {
    id: 'unknown_skip_01',
    speaker: 'unknown',
    event: 'player_draw_skip',
    text: {
      en: 'Your silence is my tempo.',
      ru: 'Твоя пауза — мой темп.',
    },
    audio: { en: '/audio/voices/unknown/en/skip_01.mp3', ru: '/audio/voices/unknown/ru/skip_01.mp3' },
  },
  {
    id: 'unknown_reverse_01',
    speaker: 'unknown',
    event: 'reverse_board',
    text: {
      en: 'Sides change. The trap stays.',
      ru: 'Стороны меняются. Ловушка остаётся.',
    },
    audio: { en: '/audio/voices/unknown/en/reverse_01.mp3', ru: '/audio/voices/unknown/ru/reverse_01.mp3' },
  },
  {
    id: 'unknown_resurrect_01',
    speaker: 'unknown',
    event: 'resurrect_pieces',
    text: {
      en: 'Ghosts on the board. Interesting.',
      ru: 'Призраки возвращаются на доску. Любопытно.',
    },
    audio: { en: '/audio/voices/unknown/en/resurrect_01.mp3', ru: '/audio/voices/unknown/ru/resurrect_01.mp3' },
  },
  {
    id: 'unknown_check_p_01',
    speaker: 'unknown',
    event: 'check_to_player',
    text: {
      en: 'Check. You missed the shadow.',
      ru: 'Шах. Ты не заметил тень.',
    },
    audio: { en: '/audio/voices/unknown/en/check_p_01.mp3', ru: '/audio/voices/unknown/ru/check_p_01.mp3' },
  },
  {
    id: 'unknown_check_o_01',
    speaker: 'unknown',
    event: 'check_to_opponent',
    text: {
      en: 'Noted. Let us see what follows.',
      ru: 'Принято. Посмотрим, что дальше.',
    },
    audio: { en: '/audio/voices/unknown/en/check_o_01.mp3', ru: '/audio/voices/unknown/ru/check_o_01.mp3' },
  },
  {
    id: 'unknown_idle_01',
    speaker: 'unknown',
    event: 'idle_taunt',
    text: {
      en: 'Overthinking leaves footprints.',
      ru: 'Долгие раздумья выдают замысел.',
    },
    audio: { en: '/audio/voices/unknown/en/idle_01.mp3', ru: '/audio/voices/unknown/ru/idle_01.mp3' },
  },
  {
    id: 'unknown_loss_01',
    speaker: 'unknown',
    event: 'gameover_loss_checkmate',
    text: {
      en: 'Checkmate. Clean finish, nothing personal.',
      ru: 'Мат. Чистая точка, ничего личного.',
    },
    audio: { en: '/audio/voices/unknown/en/loss_01.mp3', ru: '/audio/voices/unknown/ru/loss_01.mp3' },
  },
  {
    id: 'unknown_win_01',
    speaker: 'unknown',
    event: 'gameover_win',
    text: {
      en: 'Sharp line. You earned this one.',
      ru: 'Точный расчёт. Это было достойно.',
    },
    audio: { en: '/audio/voices/unknown/en/win_01.mp3', ru: '/audio/voices/unknown/ru/win_01.mp3' },
  },

  // =========================================================================
  // HARD MODE OPENING LINES (DEALER — MAXIMUM INTENSITY)
  // =========================================================================
  {
    id: 'dealer_hard_start_01',
    speaker: 'dealer',
    event: 'match_start_hard',
    text: {
      en: 'One heartbeat. No Reverse. Make one mistake and this table keeps you.',
      ru: 'Один удар сердца. Никакого Реверса. Одна ошибка — и этот стол заберёт тебя.',
    },
    audio: { en: '/audio/voices/dealer/en/hard_start_01.mp3', ru: '/audio/voices/dealer/ru/hard_start_01.mp3' },
  },
  {
    id: 'dealer_hard_start_02',
    speaker: 'dealer',
    event: 'match_start_hard',
    text: {
      en: 'Enough warm-ups. Look me in the sockets and play.',
      ru: 'Хватит разминок. Смотри мне в глаза и ходи.',
    },
    audio: { en: '/audio/voices/dealer/en/hard_start_02.mp3', ru: '/audio/voices/dealer/ru/hard_start_02.mp3' },
  },

  // =========================================================================
  // DRAW ACCEPTED / DECLINED & RESIGNATION QUOTES
  // =========================================================================
  {
    id: 'dealer_draw_acc_01',
    speaker: 'dealer',
    event: 'draw_accepted',
    text: {
      en: 'Fine. Walk away from the table while you still have a pulse.',
      ru: 'Ладно. Уходи из-за стола, пока у тебя ещё бьётся пульс.',
    },
    audio: { en: '/audio/voices/dealer/en/draw_accepted_01.mp3', ru: '/audio/voices/dealer/ru/draw_accepted_01.mp3' },
  },
  {
    id: 'dealer_draw_dec_01',
    speaker: 'dealer',
    event: 'draw_declined',
    text: {
      en: 'Not a chance. Finish what you started.',
      ru: 'Ещё рано. Доиграй до конца.',
    },
    audio: { en: '/audio/voices/dealer/en/draw_declined_01.mp3', ru: '/audio/voices/dealer/ru/draw_declined_01.mp3' },
  },
  {
    id: 'dealer_resign_01',
    speaker: 'dealer',
    event: 'player_resigned',
    text: {
      en: 'Tipping your king already? Wise choice... or cowardly.',
      ru: 'Складываешь короля? Разумный выбор... или трусливый.',
    },
    audio: { en: '/audio/voices/dealer/en/resign_01.mp3', ru: '/audio/voices/dealer/ru/resign_01.mp3' },
  },
  {
    id: 'enthusiast_draw_acc_01',
    speaker: 'enthusiast',
    event: 'draw_accepted',
    text: {
      en: 'A draw sounds fair! What a fun match!',
      ru: 'Ничья — справедливо! Было очень весело!',
    },
    audio: { en: '/audio/voices/enthusiast/en/draw_accepted_01.mp3', ru: '/audio/voices/enthusiast/ru/draw_accepted_01.mp3' },
  },
  {
    id: 'enthusiast_draw_dec_01',
    speaker: 'enthusiast',
    event: 'draw_declined',
    text: {
      en: 'Wait, it is just getting exciting! Let us keep playing!',
      ru: 'Постой, самое интересное только начинается! Давай доиграем!',
    },
    audio: { en: '/audio/voices/enthusiast/en/draw_declined_01.mp3', ru: '/audio/voices/enthusiast/ru/draw_declined_01.mp3' },
  },
  {
    id: 'enthusiast_resign_01',
    speaker: 'enthusiast',
    event: 'player_resigned',
    text: {
      en: 'No worries! Ready for a fresh rematch whenever you are!',
      ru: 'Ничего страшного! Сыграем реванш, как только захочешь!',
    },
    audio: { en: '/audio/voices/enthusiast/en/resign_01.mp3', ru: '/audio/voices/enthusiast/ru/resign_01.mp3' },
  },
  {
    id: 'egoist_draw_acc_01',
    speaker: 'egoist',
    event: 'draw_accepted',
    text: {
      en: 'Tch. Fine, take your draw. Next time I will not go easy.',
      ru: 'Тц. Ладно, забирай ничью. В следующий раз пощады не будет.',
    },
    audio: { en: '/audio/voices/egoist/en/draw_accepted_01.mp3', ru: '/audio/voices/egoist/ru/draw_accepted_01.mp3' },
  },
  {
    id: 'egoist_draw_dec_01',
    speaker: 'egoist',
    event: 'draw_declined',
    text: {
      en: 'A draw while I am crushing you? Not a chance.',
      ru: 'Ничья, когда я тебя громлю? Даже не мечтай.',
    },
    audio: { en: '/audio/voices/egoist/en/draw_declined_01.mp3', ru: '/audio/voices/egoist/ru/draw_declined_01.mp3' },
  },
  {
    id: 'egoist_resign_01',
    speaker: 'egoist',
    event: 'player_resigned',
    text: {
      en: 'Smart move saving us both the time. Better luck next game.',
      ru: 'Разумно сэкономил наше время. Удачи в следующей партии.',
    },
    audio: { en: '/audio/voices/egoist/en/resign_01.mp3', ru: '/audio/voices/egoist/ru/resign_01.mp3' },
  },
  {
    id: 'calm_draw_acc_01',
    speaker: 'calm',
    event: 'draw_accepted',
    text: {
      en: 'Agreed. Balance is its own kind of victory.',
      ru: 'Согласен. Равновесие — тоже своего рода победа.',
    },
    audio: { en: '/audio/voices/calm/en/draw_accepted_01.mp3', ru: '/audio/voices/calm/ru/draw_accepted_01.mp3' },
  },
  {
    id: 'calm_draw_dec_01',
    speaker: 'calm',
    event: 'draw_declined',
    text: {
      en: 'There is still a story left on the board. Let us see it through.',
      ru: 'На доске ещё осталась интрига. Давай доведём партию до конца.',
    },
    audio: { en: '/audio/voices/calm/en/draw_declined_01.mp3', ru: '/audio/voices/calm/ru/draw_declined_01.mp3' },
  },
  {
    id: 'calm_resign_01',
    speaker: 'calm',
    event: 'player_resigned',
    text: {
      en: 'Knowing when to concede is wisdom. Well played.',
      ru: 'Умение вовремя признать исход — тоже мудрость. Хорошая игра.',
    },
    audio: { en: '/audio/voices/calm/en/resign_01.mp3', ru: '/audio/voices/calm/ru/resign_01.mp3' },
  },
  {
    id: 'unknown_draw_acc_01',
    speaker: 'unknown',
    event: 'draw_accepted',
    text: {
      en: 'Stalemate of wills. Accepted.',
      ru: 'Равновесие сил. Принято.',
    },
    audio: { en: '/audio/voices/unknown/en/draw_accepted_01.mp3', ru: '/audio/voices/unknown/ru/draw_accepted_01.mp3' },
  },
  {
    id: 'unknown_draw_dec_01',
    speaker: 'unknown',
    event: 'draw_declined',
    text: {
      en: 'No. Play it out.',
      ru: 'Нет. Доиграй до конца.',
    },
    audio: { en: '/audio/voices/unknown/en/draw_declined_01.mp3', ru: '/audio/voices/unknown/ru/draw_declined_01.mp3' },
  },
  {
    id: 'unknown_resign_01',
    speaker: 'unknown',
    event: 'player_resigned',
    text: {
      en: 'Conceded. Until next time.',
      ru: 'Сдался. До следующей партии.',
    },
    audio: { en: '/audio/voices/unknown/en/resign_01.mp3', ru: '/audio/voices/unknown/ru/resign_01.mp3' },
  },
];

export function getDialogueLine(
  speaker: DialogueSpeaker,
  event: DialogueEvent,
  _lang: Language,
  rng: () => number = Math.random,
): VoiceRegistryEntry | null {
  let pool = VOICE_REGISTRY.filter((e) => e.speaker === speaker && e.event === event);
  if (pool.length === 0 && speaker !== 'dealer') {
    pool = VOICE_REGISTRY.filter((e) => e.speaker === 'calm' && e.event === event);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function speakerFromPersonality(
  isSurvival: boolean,
  personality: LightPersonality,
): DialogueSpeaker {
  return isSurvival ? 'dealer' : personality;
}

export interface DialogueSpeakOptions {
  mode: DialogueAudioMode;
  muted: boolean;
  voiceVolume: number;
  immediate?: boolean;
  onSubtitleUpdate: (visibleText: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
}

const BLOCKED_TTS_VOICE_RE = /espeak|festival|flite|mbrola|speechd|pico|robot/i;
const NEURAL_TTS_RE = /natural|online|neural/i;
const PRIORITY_TTS_RE = /google|microsoft|yandex|siri|samantha|dmitry|milena/i;
const QUALITY_TTS_RE = /svetlana|irina|pavel|daniel|karen|alex|aria|guy|jenny|ryan|serena|tatyana|yuri/i;
const MALE_TTS_HINT_RE = /dmitry|pavel|david|mark|daniel|alex|guy|ryan|yuri|male/i;

function scoreTtsVoice(voice: SpeechSynthesisVoice, speaker: DialogueSpeaker): number {
  const haystack = `${voice.name} ${voice.voiceURI}`;
  if (BLOCKED_TTS_VOICE_RE.test(haystack)) {
    return -1;
  }

  let score = 0;
  if (NEURAL_TTS_RE.test(haystack)) score += 45;
  if (PRIORITY_TTS_RE.test(haystack)) score += 30;
  if (QUALITY_TTS_RE.test(haystack)) score += 15;
  if (!voice.localService) score += 10;
  if (speaker === 'dealer' && MALE_TTS_HINT_RE.test(haystack)) score += 8;

  // Accept other non-blocked OS voices only as a low-priority fallback when no blocked synth matched
  return score > 0 ? score : 1;
}

export function selectQualityVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: Language,
  speaker: DialogueSpeaker,
): SpeechSynthesisVoice | null {
  const prefix = lang.toLowerCase();
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of candidates) {
    const s = scoreTtsVoice(voice, speaker);
    if (s > bestScore) {
      bestScore = s;
      best = voice;
    }
  }
  return bestScore > 0 ? best : null;
}

class DialogueController {
  private currentAudio: HTMLAudioElement | null = null;
  private customAudioMap = new Map<string, string>();
  private stepTimer: number | null = null;
  private speakEndTimer: number | null = null;
  private fadeTimer: number | null = null;
  private ttsWaitTimer: number | null = null;
  private sessionId = 0;
  private onSpeakStateCb: ((speaking: boolean) => void) | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private voicesLoaded = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const synth = window.speechSynthesis;
        const initial = synth.getVoices();
        if (initial.length > 0) {
          this.cachedVoices = initial;
          this.voicesLoaded = true;
        }
        const refreshVoices = () => {
          const list = synth.getVoices();
          this.cachedVoices = list;
          this.voicesLoaded = true;
        };
        if (typeof synth.addEventListener === 'function') {
          synth.addEventListener('voiceschanged', refreshVoices);
        } else {
          synth.onvoiceschanged = refreshVoices;
        }
      } catch {
        // Ignore speechSynthesis access issues in restricted environments
      }
    }
  }

  /** Register an optional custom .mp3/.wav/.ogg file override for any voice entry ID + language */
  public registerCustomAudio(entryId: string, lang: Language, url: string): void {
    this.customAudioMap.set(`${entryId}:${lang}`, url);
  }

  public stop(): void {
    this.sessionId++;
    if (this.stepTimer !== null) {
      window.clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.speakEndTimer !== null) {
      window.clearTimeout(this.speakEndTimer);
      this.speakEndTimer = null;
    }
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.ttsWaitTimer !== null) {
      window.clearTimeout(this.ttsWaitTimer);
      this.ttsWaitTimer = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.currentAudio = null;
    }
    soundManager.fadeOutCurrentVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (this.onSpeakStateCb) {
      this.onSpeakStateCb(false);
      this.onSpeakStateCb = null;
    }
  }

  private getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const current = window.speechSynthesis.getVoices();
    if (current.length > 0) {
      this.cachedVoices = current;
      this.voicesLoaded = true;
    }
    return this.cachedVoices;
  }

  public speak(entry: VoiceRegistryEntry, lang: Language, opts: DialogueSpeakOptions): void {
    this.stop();
    const mySession = this.sessionId;
    const voiceLang: 'en' | 'ru' = lang === 'ru' ? 'ru' : 'en';
    const text = entry.text[voiceLang];
    this.onSpeakStateCb = opts.onSpeakingChange;
    soundManager.setVoiceVolume(opts.voiceVolume);

    const audioAllowed = !opts.muted && opts.mode !== 'off' && opts.voiceVolume > 0.01;
    const wantVoice = audioAllowed && opts.mode === 'tts';

    if (opts.immediate) {
      opts.onSubtitleUpdate(text);
    }

    // Priority 1: External pre-recorded audio clip (.mp3 / .ogg / .wav)
    // Checks canonical VOICE_SCRIPT.md path `public/audio/voices/<speaker>/<lang>/<id>.mp3` first, then entry.audio[lang].
    // When present, plays exclusively and completely disables system TTS for this phrase.
    const canonicalPath = `/audio/voices/${entry.speaker}/${voiceLang}/${entry.id}.mp3`;
    const customSrc = this.customAudioMap.get(`${entry.id}:${voiceLang}`);
    const discoveredSrc =
      soundManager.resolveVoiceAsset(canonicalPath) ?? soundManager.resolveVoiceAsset(entry.audio[voiceLang]);
    const extSrc = customSrc ?? discoveredSrc ?? (ENABLE_EXTERNAL_VOICE_AUDIO ? canonicalPath : null);
    if (wantVoice && extSrc && typeof Audio !== 'undefined') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
      try {
        const audio = new Audio(extSrc);
        const targetVol = computeEffectiveVoiceVolume(opts.voiceVolume);
        audio.volume = 0;
        this.currentAudio = audio;
        if (!opts.immediate) {
          this.runSubtitleReveal(entry, text, opts, mySession, true);
        } else {
          opts.onSpeakingChange(true);
        }

        let fellBack = false;
        const fallbackFromAudio = () => {
          if (fellBack || this.sessionId !== mySession) return;
          fellBack = true;
          if (this.fadeTimer !== null) {
            window.clearInterval(this.fadeTimer);
            this.fadeTimer = null;
          }
          this.currentAudio = null;
          this.speakWithTtsOrFallback(entry, lang, text, opts, mySession, wantVoice, audioAllowed);
        };

        audio.onended = () => {
          if (this.fadeTimer !== null) {
            window.clearInterval(this.fadeTimer);
            this.fadeTimer = null;
          }
          if (this.sessionId === mySession) {
            opts.onSpeakingChange(false);
          }
        };
        audio.onerror = fallbackFromAudio;

        audio
          .play()
          .then(() => {
            if (this.sessionId !== mySession) return;
            // Clean smooth fade-in start to avoid audio pops
            const steps = 4;
            let step = 0;
            this.fadeTimer = window.setInterval(() => {
              if (this.sessionId !== mySession || !this.currentAudio) {
                if (this.fadeTimer !== null) {
                  window.clearInterval(this.fadeTimer);
                  this.fadeTimer = null;
                }
                return;
              }
              step++;
              this.currentAudio.volume = Math.min(targetVol, (targetVol * step) / steps);
              if (step >= steps && this.fadeTimer !== null) {
                window.clearInterval(this.fadeTimer);
                this.fadeTimer = null;
              }
            }, 15);
          })
          .catch(fallbackFromAudio);
        return;
      } catch {
        // Fall through cleanly to TTS / quiet SFX fallback
      }
    }

    this.speakWithTtsOrFallback(entry, lang, text, opts, mySession, wantVoice, audioAllowed);
  }

  private speakWithTtsOrFallback(
    entry: VoiceRegistryEntry,
    lang: Language,
    text: string,
    opts: DialogueSpeakOptions,
    mySession: number,
    wantVoice: boolean,
    audioAllowed: boolean,
  ): void {
    if (this.sessionId !== mySession) return;

    // Priority 2: Natural Web Speech API TTS with smart voice selection
    if (wantVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const voices = this.getAvailableVoices();

      // In Chromium, getVoices() populates asynchronously and fires 'voiceschanged'
      if (voices.length === 0 && !this.voicesLoaded) {
        let settled = false;
        const proceed = () => {
          if (settled || this.sessionId !== mySession) return;
          settled = true;
          if (this.ttsWaitTimer !== null) {
            window.clearTimeout(this.ttsWaitTimer);
            this.ttsWaitTimer = null;
          }
          synth.removeEventListener?.('voiceschanged', proceed);
          this.voicesLoaded = true;
          this.trySpeakTtsOrSfx(entry, lang, text, opts, mySession, audioAllowed);
        };
        synth.addEventListener?.('voiceschanged', proceed);
        this.ttsWaitTimer = window.setTimeout(proceed, 180);
        if (!opts.immediate) {
          opts.onSubtitleUpdate('');
        }
        opts.onSpeakingChange(true);
        return;
      }

      if (this.trySpeakTtsOrSfx(entry, lang, text, opts, mySession, audioAllowed)) {
        return;
      }
    }

    // Priority 3: Quiet atmospheric marker without robotic oscillator bleeps
    this.runAtmosphericCueAndSubtitles(entry, text, opts, mySession, audioAllowed);
  }

  private trySpeakTtsOrSfx(
    entry: VoiceRegistryEntry,
    lang: Language,
    text: string,
    opts: DialogueSpeakOptions,
    mySession: number,
    audioAllowed: boolean,
  ): boolean {
    if (this.sessionId !== mySession) return true;
    const synth = window.speechSynthesis;
    const matchingVoice = selectQualityVoice(this.getAvailableVoices(), lang, entry.speaker);
    if (!matchingVoice) {
      this.runAtmosphericCueAndSubtitles(entry, text, opts, mySession, audioAllowed);
      return true;
    }

    try {
      const utt = new SpeechSynthesisUtterance(text);
      utt.voice = matchingVoice;
      utt.lang = matchingVoice.lang || (lang === 'ru' ? 'ru-RU' : 'en-US');
      utt.volume = computeEffectiveVoiceVolume(opts.voiceVolume);
      if (entry.speaker === 'dealer') {
        utt.pitch = 0.78;
        utt.rate = 0.92;
      } else {
        utt.pitch = 1.0;
        utt.rate = 1.0;
      }

      let finished = false;
      const finishSpeaking = () => {
        if (finished) return;
        finished = true;
        if (this.speakEndTimer !== null) {
          window.clearTimeout(this.speakEndTimer);
          this.speakEndTimer = null;
        }
        if (this.sessionId === mySession) {
          opts.onSpeakingChange(false);
        }
      };

      opts.onSpeakingChange(true);
      utt.onend = finishSpeaking;
      utt.onerror = finishSpeaking;
      // Safety timeout in case Chromium fails to fire onend
      const maxSpeakMs = Math.max(2800, text.length * 105);
      this.speakEndTimer = window.setTimeout(finishSpeaking, maxSpeakMs);

      synth.speak(utt);
      if (!opts.immediate) {
        this.runSubtitleReveal(entry, text, opts, mySession, true);
      }
      return true;
    } catch {
      this.runAtmosphericCueAndSubtitles(entry, text, opts, mySession, audioAllowed);
      return true;
    }
  }

  private runAtmosphericCueAndSubtitles(
    entry: VoiceRegistryEntry,
    text: string,
    opts: DialogueSpeakOptions,
    mySession: number,
    audioAllowed: boolean,
  ): void {
    if (this.sessionId !== mySession) return;
    if (audioAllowed) {
      soundManager.playDialogueCue(entry.speaker);
    }

    // Keep isOpponentSpeaking active for ~2-3s so jaw/head animations play in sync with the line
    const speakingHoldMs = Math.min(3000, Math.max(2000, text.length * 48));
    opts.onSpeakingChange(true);
    this.speakEndTimer = window.setTimeout(() => {
      this.speakEndTimer = null;
      if (this.sessionId === mySession) {
        opts.onSpeakingChange(false);
      }
    }, speakingHoldMs);

    if (!opts.immediate) {
      this.runSubtitleReveal(entry, text, opts, mySession, true);
    }
  }

  private runSubtitleReveal(
    entry: VoiceRegistryEntry,
    text: string,
    opts: DialogueSpeakOptions,
    mySession: number,
    keepSpeakingAfterReveal: boolean = false,
  ): void {
    let cursor = 0;
    const baseStepMs =
      entry.speaker === 'enthusiast' ? 30 : entry.speaker === 'egoist' ? 35 : 40;

    opts.onSubtitleUpdate('');
    opts.onSpeakingChange(true);

    const advance = () => {
      if (this.sessionId !== mySession) return;
      if (cursor >= text.length) {
        opts.onSubtitleUpdate(text);
        if (!keepSpeakingAfterReveal) {
          opts.onSpeakingChange(false);
        }
        this.stepTimer = null;
        return;
      }

      const stepSize = cursor + 2 <= text.length && text[cursor + 1] !== ' ' ? 2 : 1;
      const sliceEnd = Math.min(text.length, cursor + stepSize);
      const chunk = text.slice(cursor, sliceEnd);
      cursor = sliceEnd;
      opts.onSubtitleUpdate(text.slice(0, cursor));

      const hasPunctComma = chunk.includes(',') || chunk.includes('—');
      const hasPunctEnd = chunk.includes('.') || chunk.includes('!') || chunk.includes('?');
      const delay = hasPunctEnd ? 150 : hasPunctComma ? 75 : baseStepMs;
      this.stepTimer = window.setTimeout(advance, delay);
    };

    advance();
  }
}

export const dialogueManager = new DialogueController();

export function playDialogueVoice(entry: VoiceRegistryEntry, lang: Language, muted: boolean): void {
  dialogueManager.speak(entry, lang, {
    mode: 'tts',
    muted,
    voiceVolume: soundManager.getVoiceVolume(),
    immediate: true,
    onSubtitleUpdate: () => {},
    onSpeakingChange: () => {},
  });
}
