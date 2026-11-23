# ChUno — Полный скрипт озвучки персонажей (VOICE_SCRIPT)

> Этот файл автоматически синхронизирован с `src/data/voiceRegistry.ts` и содержит **абсолютно все** реплики всех 5 персонажей игры на русском (RU) и английском (EN) языках.

## Как подключить свою озвучку
1. Запишите фразу в формате `.mp3` (также поддерживаются `.ogg` и `.wav`).
2. Положите файл точно по пути, указанному в столбце **Папка и имя файла RU MP3** или **Папка и имя файла EN MP3** (формат: `public/audio/voices/<speaker>/<lang>/<id>.mp3`).
3. Перезапустите dev/build — Vite автоматически добавит файлы в `/audio/manifest.json`. При наличии `.mp3` он проигрывается с высшим приоритетом и **полностью отключает системный TTS** для этой реплики.

## Сводка по персонажам

| Персонаж | Ключ (`speaker`) | Кол-во фраз | Папка RU | Папка EN |
| :--- | :--- | :---: | :--- | :--- |
| 1. Дилер (The Dealer — Survival Mode) | `dealer` | **29** | `public/audio/voices/dealer/ru/` | `public/audio/voices/dealer/en/` |
| 2. Энтузиаст (Enthusiast — Friendly Mode) | `enthusiast` | **13** | `public/audio/voices/enthusiast/ru/` | `public/audio/voices/enthusiast/en/` |
| 3. Эгоист (The Egoist — Friendly Mode) | `egoist` | **13** | `public/audio/voices/egoist/ru/` | `public/audio/voices/egoist/en/` |
| 4. Спокойный философ (Calm Philosopher — Friendly Mode) | `calm` | **13** | `public/audio/voices/calm/ru/` | `public/audio/voices/calm/en/` |
| 5. Неизвестный (Unknown / Incognito — Friendly Mode) | `unknown` | **14** | `public/audio/voices/unknown/ru/` | `public/audio/voices/unknown/en/` |
| **ИТОГО** | **5 персонажей** | **82** (164 MP3 для RU + EN) | — | — |

---

## 1. Дилер (The Dealer — Survival Mode)

*Характер голоса:* Низкий, холодный, мрачный голос в стиле Buckshot Roulette. На Hard — жёсткий и угрожающий.

| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dealer_match_start_01` | `match_start` | Садись. Сорок карт, тридцать две фигуры и один заряженный барабан. | Sit down. Forty cards, thirty-two pieces, and one loaded cylinder. | `public/audio/voices/dealer/ru/dealer_match_start_01.mp3` | `public/audio/voices/dealer/en/dealer_match_start_01.mp3` |
| `dealer_match_start_02` | `match_start` | Посмотрим, что судьба вытянет из колоды этой ночью. | Let us see what fate pulls from the stack tonight. | `public/audio/voices/dealer/ru/dealer_match_start_02.mp3` | `public/audio/voices/dealer/en/dealer_match_start_02.mp3` |
| `dealer_draw_high_01` | `player_draw_high` | Жадная рука. Четыре или пять ходов не спасут беспечного короля. | Greedy hands. Four or five moves will not save a careless king. | `public/audio/voices/dealer/ru/dealer_draw_high_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_high_01.mp3` |
| `dealer_draw_skip_01` | `player_draw_skip` | Пропуск. Сиди смирно и смотри на мой ход. | Skipped. Sit still and watch me work. | `public/audio/voices/dealer/ru/dealer_draw_skip_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_skip_01.mp3` |
| `dealer_reverse_01` | `reverse_board` | Меняемся сторонами. Теперь защищайся от своих же ловушек. | Swap sides. Now defend the traps you built yourself. | `public/audio/voices/dealer/ru/dealer_reverse_01.mp3` | `public/audio/voices/dealer/en/dealer_reverse_01.mp3` |
| `dealer_resurrect_01` | `resurrect_pieces` | Тащишь мёртвые фигуры обратно на доску? Забавно. | Pulling dead wood back onto the board? Cute. | `public/audio/voices/dealer/ru/dealer_resurrect_01.mp3` | `public/audio/voices/dealer/en/dealer_resurrect_01.mp3` |
| `dealer_bullet_player_01` | `bullet_drawn_by_player` | Ты вытянул Пулю. Подбрасывай латунь — мой черёд угадывать. | You pulled the Bullet. Flip the brass—let me guess. | `public/audio/voices/dealer/ru/dealer_bullet_player_01.mp3` | `public/audio/voices/dealer/en/dealer_bullet_player_01.mp3` |
| `dealer_bullet_opponent_01` | `bullet_drawn_by_opponent` | Моя любимая карта из сорока. Орёл или решка, стратег? | My favorite card in all forty. Heads or tails, strategist? | `public/audio/voices/dealer/ru/dealer_bullet_opponent_01.mp3` | `public/audio/voices/dealer/en/dealer_bullet_opponent_01.mp3` |
| `dealer_coin_survived_01` | `coin_survived` | Тц. Удачный вдох. Камора всё ещё ждёт. | Tch. A lucky breath. The chamber is still waiting. | `public/audio/voices/dealer/ru/dealer_coin_survived_01.mp3` | `public/audio/voices/dealer/en/dealer_coin_survived_01.mp3` |
| `dealer_coin_shot_01` | `coin_shot_hit` | Латунь не врёт. Слышишь этот холодный щелчок курка? | Brass never lies. Hear that cold hammer drop? | `public/audio/voices/dealer/ru/dealer_coin_shot_01.mp3` | `public/audio/voices/dealer/en/dealer_coin_shot_01.mp3` |
| `dealer_check_player_01` | `check_to_player` | Шах. Твоему королю больше негде прятаться. | Check. Your king is running out of dark corners. | `public/audio/voices/dealer/ru/dealer_check_player_01.mp3` | `public/audio/voices/dealer/en/dealer_check_player_01.mp3` |
| `dealer_check_opponent_01` | `check_to_opponent` | Дерзкий шах. Наслаждайся моментом, пока можешь. | A bold check. Enjoy the spark while it lasts. | `public/audio/voices/dealer/ru/dealer_check_opponent_01.mp3` | `public/audio/voices/dealer/en/dealer_check_opponent_01.mp3` |
| `dealer_idle_01` | `idle_taunt` | Если просто сверлить доску взглядом, фигуры сами не пойдут. | Staring at the board will not move the wood for you. | `public/audio/voices/dealer/ru/dealer_idle_01.mp3` | `public/audio/voices/dealer/en/dealer_idle_01.mp3` |
| `dealer_idle_02` | `idle_taunt` | Пошевеливайся. Лампа не будет светить вечно. | Hurry up. The lamp is burning down. | `public/audio/voices/dealer/ru/dealer_idle_02.mp3` | `public/audio/voices/dealer/en/dealer_idle_02.mp3` |
| `dealer_checkmate_01` | `gameover_loss_checkmate` | Ой, как печально, что ты снова проиграл... твоему королю больше некуда бежать. | Oh, how sad that you lost again... your king had nowhere left to run. | `public/audio/voices/dealer/ru/dealer_checkmate_01.mp3` | `public/audio/voices/dealer/en/dealer_checkmate_01.mp3` |
| `dealer_checkmate_02` | `gameover_loss_checkmate` | Мат. Все клетки перекрыты, ни единого выхода для короля. | Checkmate. Every square sealed, every escape cut clean. | `public/audio/voices/dealer/ru/dealer_checkmate_02.mp3` | `public/audio/voices/dealer/en/dealer_checkmate_02.mp3` |
| `dealer_checkmate_03` | `gameover_loss_checkmate` | Оставь павшего короля на доске. Я коллекционирую короны. | Leave your fallen king on the board. I collect crowns. | `public/audio/voices/dealer/ru/dealer_checkmate_03.mp3` | `public/audio/voices/dealer/en/dealer_checkmate_03.mp3` |
| `dealer_revolver_01` | `gameover_loss_revolver` | Твой пульс оборвался быстрее, чем улеглась монета. | Your pulse flatlined faster than the coin settled. | `public/audio/voices/dealer/ru/dealer_revolver_01.mp3` | `public/audio/voices/dealer/en/dealer_revolver_01.mp3` |
| `dealer_revolver_02` | `gameover_loss_revolver` | Шесть стальных камор поставили точку там, где не хватило удачи. | Six steel chambers settle what a chess blunder could not. | `public/audio/voices/dealer/ru/dealer_revolver_02.mp3` | `public/audio/voices/dealer/en/dealer_revolver_02.mp3` |
| `dealer_revolver_03` | `gameover_loss_revolver` | Монета легла чисто. Ты ошибся в последний раз. | Brass spun clean. You guessed wrong one time too many. | `public/audio/voices/dealer/ru/dealer_revolver_03.mp3` | `public/audio/voices/dealer/en/dealer_revolver_03.mp3` |
| `dealer_win_01` | `gameover_win` | Ты пережил этот стол. Не жди пощады в следующей партии. | You outlasted the dark across this table. Do not expect mercy next time. | `public/audio/voices/dealer/ru/dealer_win_01.mp3` | `public/audio/voices/dealer/en/dealer_win_01.mp3` |
| `dealer_draw_hard_01` | `draw_declined_hard` | Ничья? Из-за этого стола уходят либо победителем, либо вперёд ногами. | A draw? You leave this table winning, or in a box. | `public/audio/voices/dealer/ru/dealer_draw_hard_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_hard_01.mp3` |
| `dealer_draw_hard_02` | `draw_declined_hard` | На этой сложности пощады в колоде нет. | Mercy isn't in the deck on this difficulty. | `public/audio/voices/dealer/ru/dealer_draw_hard_02.mp3` | `public/audio/voices/dealer/en/dealer_draw_hard_02.mp3` |
| `dealer_draw_early_01` | `draw_declined_early` | Рано. Сначала пролей немного крови. | Too early. Bleed a little first. | `public/audio/voices/dealer/ru/dealer_draw_early_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_early_01.mp3` |
| `dealer_hard_start_01` | `match_start_hard` | Один удар сердца. Никакого Реверса. Одна ошибка — и этот стол заберёт тебя. | One heartbeat. No Reverse. Make one mistake and this table keeps you. | `public/audio/voices/dealer/ru/dealer_hard_start_01.mp3` | `public/audio/voices/dealer/en/dealer_hard_start_01.mp3` |
| `dealer_hard_start_02` | `match_start_hard` | Хватит разминок. Смотри мне в глаза и ходи. | Enough warm-ups. Look me in the sockets and play. | `public/audio/voices/dealer/ru/dealer_hard_start_02.mp3` | `public/audio/voices/dealer/en/dealer_hard_start_02.mp3` |
| `dealer_draw_acc_01` | `draw_accepted` | Ладно. Уходи из-за стола, пока у тебя ещё бьётся пульс. | Fine. Walk away from the table while you still have a pulse. | `public/audio/voices/dealer/ru/dealer_draw_acc_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_acc_01.mp3` |
| `dealer_draw_dec_01` | `draw_declined` | Ещё рано. Доиграй до конца. | Not a chance. Finish what you started. | `public/audio/voices/dealer/ru/dealer_draw_dec_01.mp3` | `public/audio/voices/dealer/en/dealer_draw_dec_01.mp3` |
| `dealer_resign_01` | `player_resigned` | Складываешь короля? Разумный выбор... или трусливый. | Tipping your king already? Wise choice... or cowardly. | `public/audio/voices/dealer/ru/dealer_resign_01.mp3` | `public/audio/voices/dealer/en/dealer_resign_01.mp3` |

---

## 2. Энтузиаст (Enthusiast — Friendly Mode)

*Характер голоса:* Живой, доброжелательный, азартный и весёлый голос.

| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `enthusiast_start_01` | `match_start` | Какой чудесный ветерок! Сыграем яркую партию в ChUno? | What a lovely breeze! Ready for some wild ChUno? | `public/audio/voices/enthusiast/ru/enthusiast_start_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_start_01.mp3` |
| `enthusiast_high_01` | `player_draw_high` | Ух ты, вот это карта! Покажи красивую комбинацию! | Whoa, look at that card draw! Let us see a brilliant combo! | `public/audio/voices/enthusiast/ru/enthusiast_high_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_high_01.mp3` |
| `enthusiast_skip_01` | `player_draw_skip` | Пропуск! Самое время сделать глоток чая, пока я думаю. | Skipped! Take a sip of tea while I plan my move. | `public/audio/voices/enthusiast/ru/enthusiast_skip_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_skip_01.mp3` |
| `enthusiast_reverse_01` | `reverse_board` | Разворот доски! Обожаю меняться фигурами в разгар игры! | Board spin! I love switching armies mid-game! | `public/audio/voices/enthusiast/ru/enthusiast_reverse_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_reverse_01.mp3` |
| `enthusiast_resurrect_01` | `resurrect_pieces` | Подкрепление! Партия становится ещё интереснее! | Reinforcements! That makes the board so exciting! | `public/audio/voices/enthusiast/ru/enthusiast_resurrect_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_resurrect_01.mp3` |
| `enthusiast_check_01` | `check_to_opponent` | Шах! Какая острая тактическая идея! | Check! What a sharp tactical line! | `public/audio/voices/enthusiast/ru/enthusiast_check_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_check_01.mp3` |
| `enthusiast_check_p_01` | `check_to_player` | Шах! Приглядывай за королём! | Check! Watch your king closely! | `public/audio/voices/enthusiast/ru/enthusiast_check_p_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_check_p_01.mp3` |
| `enthusiast_idle_01` | `idle_taunt` | Просчитываешь шедевр на пять ходов вперёд? Не торопись! | Calculating a five-move masterpiece? Take your time! | `public/audio/voices/enthusiast/ru/enthusiast_idle_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_idle_01.mp3` |
| `enthusiast_loss_01` | `gameover_loss_checkmate` | Отличная партия! Этот мат был потрясающим — реванш? | Good game! That checkmate was genuinely thrilling — rematch? | `public/audio/voices/enthusiast/ru/enthusiast_loss_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_loss_01.mp3` |
| `enthusiast_win_01` | `gameover_win` | Ха-ха, ты меня красиво переиграл! Браво! | Haha, you outplayed me cleanly! Well fought! | `public/audio/voices/enthusiast/ru/enthusiast_win_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_win_01.mp3` |
| `enthusiast_draw_acc_01` | `draw_accepted` | Ничья — справедливо! Было очень весело! | A draw sounds fair! What a fun match! | `public/audio/voices/enthusiast/ru/enthusiast_draw_acc_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_draw_acc_01.mp3` |
| `enthusiast_draw_dec_01` | `draw_declined` | Постой, самое интересное только начинается! Давай доиграем! | Wait, it is just getting exciting! Let us keep playing! | `public/audio/voices/enthusiast/ru/enthusiast_draw_dec_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_draw_dec_01.mp3` |
| `enthusiast_resign_01` | `player_resigned` | Ничего страшного! Сыграем реванш, как только захочешь! | No worries! Ready for a fresh rematch whenever you are! | `public/audio/voices/enthusiast/ru/enthusiast_resign_01.mp3` | `public/audio/voices/enthusiast/en/enthusiast_resign_01.mp3` |

---

## 3. Эгоист (The Egoist — Friendly Mode)

*Характер голоса:* Уверенный, язвительный, самодовольный тон.

| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `egoist_start_01` | `match_start` | Попробуй угнаться. Я редко проигрываю в такую погоду. | Try to keep up. I rarely lose on a sunny afternoon. | `public/audio/voices/egoist/ru/egoist_start_01.mp3` | `public/audio/voices/egoist/en/egoist_start_01.mp3` |
| `egoist_high_01` | `player_draw_high` | Чистое везение. Посмотрим, сумеешь ли ты правильно ими распорядиться. | Pure luck. Let us see if you even use those moves properly. | `public/audio/voices/egoist/ru/egoist_high_01.mp3` | `public/audio/voices/egoist/en/egoist_high_01.mp3` |
| `egoist_skip_01` | `player_draw_skip` | Пропуск! Даже колода понимает, чей ход здесь важнее. | Skipped! Even the deck knows whose turn really matters. | `public/audio/voices/egoist/ru/egoist_skip_01.mp3` | `public/audio/voices/egoist/en/egoist_skip_01.mp3` |
| `egoist_reverse_01` | `reverse_board` | Смена сторон? Неважно, я выигрываю любым цветом. | Switching sides? Does not matter, I win with either color. | `public/audio/voices/egoist/ru/egoist_reverse_01.mp3` | `public/audio/voices/egoist/en/egoist_reverse_01.mp3` |
| `egoist_resurrect_01` | `resurrect_pieces` | Уже возвращаешь фигуры? Пахнет отчаянием. | Bringing pieces back already? Feeling desperate? | `public/audio/voices/egoist/ru/egoist_resurrect_01.mp3` | `public/audio/voices/egoist/en/egoist_resurrect_01.mp3` |
| `egoist_check_01` | `check_to_player` | Шах! Спорим, ты этого не ожидал? | Check! Bet you did not see that coming. | `public/audio/voices/egoist/ru/egoist_check_01.mp3` | `public/audio/voices/egoist/en/egoist_check_01.mp3` |
| `egoist_idle_01` | `idle_taunt` | Давай уже. Солнце сядет раньше, чем ты найдёшь ход. | Any day now. The sun will set before you find a move. | `public/audio/voices/egoist/ru/egoist_idle_01.mp3` | `public/audio/voices/egoist/en/egoist_idle_01.mp3` |
| `egoist_loss_01` | `gameover_loss_checkmate` | Мат, как и ожидалось. Хочешь ещё один урок? | Checkmate, as expected. Want another lesson? | `public/audio/voices/egoist/ru/egoist_loss_01.mp3` | `public/audio/voices/egoist/en/egoist_loss_01.mp3` |
| `egoist_check_opp_01` | `check_to_opponent` | Милый шах. Наслаждайся моментом, пока он не кончился. | Cute check. Enjoy the moment while it lasts. | `public/audio/voices/egoist/ru/egoist_check_opp_01.mp3` | `public/audio/voices/egoist/en/egoist_check_opp_01.mp3` |
| `egoist_win_01` | `gameover_win` | Погоди... серьёзно? Ладно, признаю, это было сильно. | Wait—really? Okay, fine, that was actually pretty slick. | `public/audio/voices/egoist/ru/egoist_win_01.mp3` | `public/audio/voices/egoist/en/egoist_win_01.mp3` |
| `egoist_draw_acc_01` | `draw_accepted` | Тц. Ладно, забирай ничью. В следующий раз пощады не будет. | Tch. Fine, take your draw. Next time I will not go easy. | `public/audio/voices/egoist/ru/egoist_draw_acc_01.mp3` | `public/audio/voices/egoist/en/egoist_draw_acc_01.mp3` |
| `egoist_draw_dec_01` | `draw_declined` | Ничья, когда я тебя громлю? Даже не мечтай. | A draw while I am crushing you? Not a chance. | `public/audio/voices/egoist/ru/egoist_draw_dec_01.mp3` | `public/audio/voices/egoist/en/egoist_draw_dec_01.mp3` |
| `egoist_resign_01` | `player_resigned` | Разумно сэкономил наше время. Удачи в следующей партии. | Smart move saving us both the time. Better luck next game. | `public/audio/voices/egoist/ru/egoist_resign_01.mp3` | `public/audio/voices/egoist/en/egoist_resign_01.mp3` |

---

## 4. Спокойный философ (Calm Philosopher — Friendly Mode)

*Характер голоса:* Размеренный, тёплый, мудрый и спокойный голос.

| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `calm_start_01` | `match_start` | Не спеши. Луг никуда не убежит. | Take your time. The meadow is not going anywhere. | `public/audio/voices/calm/ru/calm_start_01.mp3` | `public/audio/voices/calm/en/calm_start_01.mp3` |
| `calm_high_01` | `player_draw_high` | Щедрая карта. Посмотрим, куда приведёт ритм игры. | A generous draw. Let us see where the rhythm takes us. | `public/audio/voices/calm/ru/calm_high_01.mp3` | `public/audio/voices/calm/en/calm_high_01.mp3` |
| `calm_skip_01` | `player_draw_skip` | Небольшая пауза. Даже шахматам нужен воздух. | A quiet pause. Even chess needs room to breathe. | `public/audio/voices/calm/ru/calm_skip_01.mp3` | `public/audio/voices/calm/en/calm_skip_01.mp3` |
| `calm_reverse_01` | `reverse_board` | Смена перспективы. Полезно взглянуть на доску с другой стороны. | Perspective shifts. Sometimes seeing the other side helps. | `public/audio/voices/calm/ru/calm_reverse_01.mp3` | `public/audio/voices/calm/en/calm_reverse_01.mp3` |
| `calm_resurrect_01` | `resurrect_pieces` | Старые фигуры возвращаются на доску. Всё движется по кругу. | Old pieces return to the board. Everything moves in cycles. | `public/audio/voices/calm/ru/calm_resurrect_01.mp3` | `public/audio/voices/calm/en/calm_resurrect_01.mp3` |
| `calm_check_01` | `check_to_player` | Твоему королю стоит поберечься от этой линии. | Your king should mind the breeze from that diagonal. | `public/audio/voices/calm/ru/calm_check_01.mp3` | `public/audio/voices/calm/en/calm_check_01.mp3` |
| `calm_idle_01` | `idle_taunt` | Послушай ветер в траве — торопиться вовсе некуда. | Listen to the wind in the grass—no rush at all. | `public/audio/voices/calm/ru/calm_idle_01.mp3` | `public/audio/voices/calm/en/calm_idle_01.mp3` |
| `calm_loss_01` | `gameover_loss_checkmate` | Спокойная, достойная партия. Расставим фигуры снова? | A peaceful match well played. Shall we set the pieces again? | `public/audio/voices/calm/ru/calm_loss_01.mp3` | `public/audio/voices/calm/en/calm_loss_01.mp3` |
| `calm_check_opp_01` | `check_to_opponent` | Вдумчивый шах. Позволь мне спокойно отступить. | A thoughtful check. Let me step aside gracefully. | `public/audio/voices/calm/ru/calm_check_opp_01.mp3` | `public/audio/voices/calm/en/calm_check_opp_01.mp3` |
| `calm_win_01` | `gameover_win` | Изящная игра. Заслуженный мат. | Gracefully played. That checkmate was well deserved. | `public/audio/voices/calm/ru/calm_win_01.mp3` | `public/audio/voices/calm/en/calm_win_01.mp3` |
| `calm_draw_acc_01` | `draw_accepted` | Согласен. Равновесие — тоже своего рода победа. | Agreed. Balance is its own kind of victory. | `public/audio/voices/calm/ru/calm_draw_acc_01.mp3` | `public/audio/voices/calm/en/calm_draw_acc_01.mp3` |
| `calm_draw_dec_01` | `draw_declined` | На доске ещё осталась интрига. Давай доведём партию до конца. | There is still a story left on the board. Let us see it through. | `public/audio/voices/calm/ru/calm_draw_dec_01.mp3` | `public/audio/voices/calm/en/calm_draw_dec_01.mp3` |
| `calm_resign_01` | `player_resigned` | Умение вовремя признать исход — тоже мудрость. Хорошая игра. | Knowing when to concede is wisdom. Well played. | `public/audio/voices/calm/ru/calm_resign_01.mp3` | `public/audio/voices/calm/en/calm_resign_01.mp3` |

---

## 5. Неизвестный (Unknown / Incognito — Friendly Mode)

*Характер голоса:* Сдержанный, лаконичный, загадочный полушёпот.

| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `unknown_start_01` | `match_start` | Без имён. Только шестьдесят четыре клетки и колода. | No names. Just sixty-four squares and a deck. | `public/audio/voices/unknown/ru/unknown_start_01.mp3` | `public/audio/voices/unknown/en/unknown_start_01.mp3` |
| `unknown_start_02` | `match_start` | Следи за ходами, а не за шляпой. | Watch the hands, not the hat. | `public/audio/voices/unknown/ru/unknown_start_02.mp3` | `public/audio/voices/unknown/en/unknown_start_02.mp3` |
| `unknown_high_01` | `player_draw_high` | Много ходов. Верных — единицы. | Many moves. Few right ones. | `public/audio/voices/unknown/ru/unknown_high_01.mp3` | `public/audio/voices/unknown/en/unknown_high_01.mp3` |
| `unknown_skip_01` | `player_draw_skip` | Твоя пауза — мой темп. | Your silence is my tempo. | `public/audio/voices/unknown/ru/unknown_skip_01.mp3` | `public/audio/voices/unknown/en/unknown_skip_01.mp3` |
| `unknown_reverse_01` | `reverse_board` | Стороны меняются. Ловушка остаётся. | Sides change. The trap stays. | `public/audio/voices/unknown/ru/unknown_reverse_01.mp3` | `public/audio/voices/unknown/en/unknown_reverse_01.mp3` |
| `unknown_resurrect_01` | `resurrect_pieces` | Призраки возвращаются на доску. Любопытно. | Ghosts on the board. Interesting. | `public/audio/voices/unknown/ru/unknown_resurrect_01.mp3` | `public/audio/voices/unknown/en/unknown_resurrect_01.mp3` |
| `unknown_check_p_01` | `check_to_player` | Шах. Ты не заметил тень. | Check. You missed the shadow. | `public/audio/voices/unknown/ru/unknown_check_p_01.mp3` | `public/audio/voices/unknown/en/unknown_check_p_01.mp3` |
| `unknown_check_o_01` | `check_to_opponent` | Принято. Посмотрим, что дальше. | Noted. Let us see what follows. | `public/audio/voices/unknown/ru/unknown_check_o_01.mp3` | `public/audio/voices/unknown/en/unknown_check_o_01.mp3` |
| `unknown_idle_01` | `idle_taunt` | Долгие раздумья выдают замысел. | Overthinking leaves footprints. | `public/audio/voices/unknown/ru/unknown_idle_01.mp3` | `public/audio/voices/unknown/en/unknown_idle_01.mp3` |
| `unknown_loss_01` | `gameover_loss_checkmate` | Мат. Чистая точка, ничего личного. | Checkmate. Clean finish, nothing personal. | `public/audio/voices/unknown/ru/unknown_loss_01.mp3` | `public/audio/voices/unknown/en/unknown_loss_01.mp3` |
| `unknown_win_01` | `gameover_win` | Точный расчёт. Это было достойно. | Sharp line. You earned this one. | `public/audio/voices/unknown/ru/unknown_win_01.mp3` | `public/audio/voices/unknown/en/unknown_win_01.mp3` |
| `unknown_draw_acc_01` | `draw_accepted` | Равновесие сил. Принято. | Stalemate of wills. Accepted. | `public/audio/voices/unknown/ru/unknown_draw_acc_01.mp3` | `public/audio/voices/unknown/en/unknown_draw_acc_01.mp3` |
| `unknown_draw_dec_01` | `draw_declined` | Нет. Доиграй до конца. | No. Play it out. | `public/audio/voices/unknown/ru/unknown_draw_dec_01.mp3` | `public/audio/voices/unknown/en/unknown_draw_dec_01.mp3` |
| `unknown_resign_01` | `player_resigned` | Сдался. До следующей партии. | Conceded. Until next time. | `public/audio/voices/unknown/ru/unknown_resign_01.mp3` | `public/audio/voices/unknown/en/unknown_resign_01.mp3` |
