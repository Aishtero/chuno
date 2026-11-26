import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAIMove, chooseAIWildAction } from './chess/chessAI';
import { handleAIWorkerRequest } from './chess/chessAI.worker';
import { BoardState } from './chess/boardState';
import {
  generateLegalMoves,
  generateWildMoves,
  getLegalResurrectSquares,
  isCheckmate,
  isStalemate,
} from './chess/moveGenerator';
import { toSq } from './chess/types';
import { LIGHT_PERSONALITIES } from './deck/cardData';
import { DeckManager } from './deck/deckManager';
import { MatchEngine } from './match/matchEngine';

test('Initial chess board has 20 legal moves for White and castling/en passant work', () => {
  const board = BoardState.createInitial();
  const whiteMoves = generateLegalMoves(board, 'white');
  assert.equal(whiteMoves.length, 20);

  // En passant test: White pawn e2->e4->e5, Black pawn d7->d5, White captures d6
  board.applyMove({ from: toSq(1, 4), to: toSq(3, 4) });
  board.applyMove({ from: toSq(3, 4), to: toSq(4, 4) });
  board.applyMove({ from: toSq(6, 3), to: toSq(4, 3) });
  assert.equal(board.enPassantTarget, toSq(5, 3));

  const legalWhite = generateLegalMoves(board, 'white');
  const epMove = legalWhite.find((m) => m.from === toSq(4, 4) && m.to === toSq(5, 3) && m.isEnPassant);
  assert.ok(epMove, 'En passant capture should be legal immediately after double push');

  // En passant resets after any single half-move
  board.applyMove({ from: toSq(1, 0), to: toSq(2, 0) });
  assert.equal(board.enPassantTarget, null);
});

test('Deck compositions equal exactly 40 cards and Bullet is forbidden in first 3 full turns', () => {
  const lightDeck = new DeckManager('light', 'easy');
  assert.equal(lightDeck.drawPile.length, 40);
  assert.equal(lightDeck.drawPile.filter((c) => c === 'BULLET').length, 0);

  const survMed = new DeckManager('survival', 'medium');
  assert.equal(survMed.drawPile.length, 40);
  assert.equal(survMed.drawPile.filter((c) => c === 'BULLET').length, 2);

  const survHard = new DeckManager('survival', 'hard');
  assert.equal(survHard.drawPile.length, 40);
  assert.equal(survHard.drawPile.filter((c) => c === 'REVERSE').length, 0);
  assert.equal(survHard.drawPile.filter((c) => c === 'BULLET').length, 2);

  // Force Bullet to top of draw pile and verify it is pushed back during halfTurnIndex < 6
  survMed.drawPile = ['NUM_1', 'NUM_2', 'NUM_3', 'BULLET'];
  const drawn = survMed.drawCard(0);
  assert.notEqual(drawn.card, 'BULLET');
});

test('Streak moves (2-5) interrupt immediately when enemy King is placed in check', () => {
  const match = new MatchEngine({
    mode: 'light',
    difficulty: 'easy',
    personality: 'calm',
    rng: () => 0.5,
  });

  // Setup simple board where White Queen can give check on move 1 of a 4-move card
  match.board.squares.fill(null);
  match.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  match.board.squares[toSq(7, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  match.board.squares[toSq(1, 0)] = { id: 3, type: 'queen', color: 'white', hasMoved: true };
  match.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };

  match.deck.drawPile = ['NUM_4'];
  match.drawCard();
  assert.equal(match.phase, 'PLAYER_MOVE_LOOP');
  assert.equal(match.movesLeft, 4);

  // Move White Queen to e2 (toSq(1, 4)) -> checks Black King on e8!
  const events = match.executeMove({ from: toSq(1, 0), to: toSq(1, 4) });
  const moveEvt = events.find((e) => e.type === 'PIECE_MOVED');
  assert.ok(moveEvt && moveEvt.type === 'PIECE_MOVED');
  assert.equal(moveEvt.isCheck, true);
  assert.equal(moveEvt.streakInterrupted, true);
  assert.equal(match.activeActor, 'opponent');
});

test('Reverse swaps player and opponent colors and passes turn', () => {
  const match = new MatchEngine({
    mode: 'survival',
    difficulty: 'easy',
    personality: 'calm',
  });
  assert.equal(match.playerColor, 'white');
  assert.equal(match.opponentColor, 'black');

  match.deck.drawPile = ['REVERSE'];
  const events = match.drawCard();
  assert.ok(events.some((e) => e.type === 'BOARD_REVERSED'));
  assert.equal(match.playerColor, 'black');
  assert.equal(match.opponentColor, 'white');
  assert.equal(match.activeActor, 'opponent');
});

test('Resurrection (+2/+4) respects own half, no pawns on rank 1/8, and falls back to 1 move if empty', () => {
  const match = new MatchEngine({
    mode: 'light',
    difficulty: 'easy',
    personality: 'calm',
  });
  // Graveyard empty -> PLUS_2 converts to 1 move
  match.deck.drawPile = ['PLUS_2'];
  const events = match.drawCard();
  assert.equal(match.phase, 'PLAYER_MOVE_LOOP');
  assert.equal(match.movesLeft, 1);
  assert.ok(
    events.some((e) => e.type === 'CARD_DRAWN' && e.convertedFromResurrect === true),
  );

  // With captured white pawn and knight, check legal resurrect squares
  const board = BoardState.createInitial();
  board.squares[toSq(1, 3)] = null;
  const pawnSquares = getLegalResurrectSquares(board, 'white', 'pawn');
  assert.ok(pawnSquares.every((sq) => sq >= 8 && sq <= 31), 'White pawn must be on ranks 2..4');
  assert.ok(pawnSquares.includes(toSq(2, 0)));
});

test('Wild temporarily transforms piece for 1 move then reverts', () => {
  const match = new MatchEngine({
    mode: 'light',
    difficulty: 'easy',
    personality: 'calm',
  });
  match.deck.drawPile = ['WILD'];
  match.drawCard();
  assert.equal(match.phase, 'AWAIT_WILD_ACTION');

  // Transform white rook on a1 (sq 0) into a knight and jump to c2? c2 has pawn, jump to b3 (toSq(2, 1))
  match.executeWildMove(toSq(0, 0), 'knight', toSq(2, 1));
  const landed = match.board.squares[toSq(2, 1)];
  assert.ok(landed);
  assert.equal(landed.type, 'rook', 'Piece should revert back to Rook after Wild move');
});

test('Bullet 50/50 coin flip reduces HP and Checkmate overrides remaining HP', () => {
  // Bullet kill at 1 HP on Hard
  const hardMatch = new MatchEngine({
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    rng: () => 0.1, // < 0.5 => 'heads'
  });
  assert.equal(hardMatch.playerHp, 1);
  assert.equal(hardMatch.opponentHp, 1);

  hardMatch.halfTurnIndex = 6; // past turn 3
  hardMatch.deck.drawPile = ['BULLET'];
  hardMatch.drawCard();
  assert.equal(hardMatch.phase, 'AWAIT_COIN_CHOICE');

  // AI guesses 'tails' while actual is 'heads' -> AI gets shot -> AI HP becomes 0 -> Player wins!
  const coinEvents = hardMatch.resolveCoinFlip('tails');
  assert.equal(hardMatch.opponentHp, 0);
  assert.equal(hardMatch.phase, 'MATCH_OVER');
  assert.equal(hardMatch.winner, 'player');
  assert.ok(coinEvents.some((e) => e.type === 'MATCH_ENDED' && e.reason === 'revolver_hp_zero'));

  // Checkmate overrides HP even when 3 HP remain
  const easyMatch = new MatchEngine({
    mode: 'survival',
    difficulty: 'easy',
    personality: 'calm',
  });
  assert.equal(easyMatch.opponentHp, 3);
  // Fool's mate setup: f3, e5, g4, Qh4#
  easyMatch.board.applyMove({ from: toSq(1, 5), to: toSq(2, 5) });
  easyMatch.board.applyMove({ from: toSq(6, 4), to: toSq(4, 4) });
  easyMatch.board.applyMove({ from: toSq(1, 6), to: toSq(3, 6) });
  easyMatch.activeActor = 'opponent';
  easyMatch.deck.drawPile = ['NUM_1'];
  easyMatch.drawCard();
  easyMatch.executeMove({ from: toSq(7, 3), to: toSq(3, 7) });
  assert.equal(isCheckmate(easyMatch.board, 'white'), true);
  assert.equal(easyMatch.phase, 'MATCH_OVER');
  assert.equal(easyMatch.winner, 'opponent');
  assert.equal(easyMatch.endReason, 'checkmate');
});

test('Stalemate resets board in Survival Mode without losing HP', () => {
  const match = new MatchEngine({
    mode: 'survival',
    difficulty: 'easy',
    personality: 'calm',
  });
  match.board.squares.fill(null);
  match.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  // Stalemate position: Black King on a8 (56), White Queen on c7 (50), White King on a6 (40)
  match.board.squares[toSq(7, 0)] = { id: 1, type: 'king', color: 'black', hasMoved: true };
  match.board.squares[toSq(6, 2)] = { id: 2, type: 'queen', color: 'white', hasMoved: true };
  match.board.squares[toSq(5, 0)] = { id: 3, type: 'king', color: 'white', hasMoved: true };

  assert.equal(isStalemate(match.board, 'black'), true);
  match.activeActor = 'opponent';
  const evts = match.checkTurnStartConditions();
  assert.ok(evts.some((e) => e.type === 'BOARD_RESET_STALEMATE'));
  assert.equal(match.playerHp, 3);
  assert.equal(match.opponentHp, 3);
  assert.equal(match.phase, 'AWAIT_DRAW_CARD');
});

test('VoiceRegistry covers all 15 DialogueEvents for Dealer, keeps checkmate vs revolver quotes isolated, and contains zero shotgun copy', async () => {
  const { VOICE_REGISTRY } = await import('../data/voiceRegistry');
  const { getTranslations } = await import('./localization');
  const requiredEvents = [
    'match_start',
    'player_draw_high',
    'player_draw_skip',
    'reverse_board',
    'resurrect_pieces',
    'bullet_drawn_by_player',
    'bullet_drawn_by_opponent',
    'coin_survived',
    'coin_shot_hit',
    'check_to_player',
    'check_to_opponent',
    'idle_taunt',
    'gameover_loss_checkmate',
    'gameover_loss_revolver',
    'gameover_win',
  ];

  for (const ev of requiredEvents) {
    const entries = VOICE_REGISTRY.filter((e) => e.speaker === 'dealer' && e.event === ev);
    assert.ok(entries.length >= 1, `Dealer must have entry for ${ev}`);
  }

  const checkmateEntries = VOICE_REGISTRY.filter((e) => e.event === 'gameover_loss_checkmate');
  for (const entry of checkmateEntries) {
    const combined = `${entry.text.en} ${entry.text.ru}`.toLowerCase();
    assert.equal(
      /revolver|shotgun|bullet|coin|gauge|револьвер|дробовик|пуля|монет|калибр/.test(combined),
      false,
      `Checkmate quote ${entry.id} must not reference revolver/bullet/coin`,
    );
  }

  const forbiddenWeaponPattern = /shotgun|twelve-gauge|12-gauge|дробовик|калибр/i;
  for (const entry of VOICE_REGISTRY) {
    assert.equal(
      forbiddenWeaponPattern.test(`${entry.text.en} ${entry.text.ru} ${entry.audio.en} ${entry.audio.ru}`),
      false,
      `Voice entry ${entry.id} must not mention legacy shotgun terminology`,
    );
  }

  for (const lang of ['en', 'ru'] as const) {
    const tr = getTranslations(lang);
    const serialized = JSON.stringify(tr);
    assert.equal(
      forbiddenWeaponPattern.test(serialized),
      false,
      `Localization (${lang}) must not mention legacy shotgun terminology`,
    );
  }
});

test('King can never be captured in legal/wild moves or applyMove, and missing-King failsafe ends match', () => {
  const board = new BoardState();
  board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  board.squares[toSq(7, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  board.squares[toSq(6, 4)] = { id: 3, type: 'rook', color: 'white', hasMoved: true };

  // White Rook on e7 is attacking Black King on e8, yet NO legal move or Wild move may land on e8
  const legalWhite = generateLegalMoves(board, 'white');
  assert.equal(
    legalWhite.some((m) => m.to === toSq(7, 4)),
    false,
    'Enemy King square must never appear in generateLegalMoves',
  );

  const wildWhite = generateWildMoves(board, toSq(6, 4), 'queen', 'white');
  assert.equal(
    wildWhite.some((m) => m.to === toSq(7, 4)),
    false,
    'Enemy King square must never appear in generateWildMoves',
  );

  // Direct BoardState.applyMove hard guard throws if attempting to capture a King
  assert.throws(() => {
    board.applyMove({ from: toSq(6, 4), to: toSq(7, 4) });
  }, /Illegal king capture/i);

  // +2/+4 resurrection cannot place a piece that puts enemy King in check
  board.squares[toSq(6, 4)] = null;
  board.graveyard.white.push({ id: 9, type: 'rook', color: 'white', hasMoved: true });
  const resSquares = getLegalResurrectSquares(board, 'white', 'rook');
  // White half files include e-file (ranks 1..4), e4/e3/e2/e1 all attack empty e-file toward e8
  assert.equal(
    resSquares.includes(toSq(2, 4)),
    false,
    'Resurrection onto open e-file putting Black King in check must be forbidden',
  );

  // Hard missing-King failsafe immediately ends match if a King is absent
  const match = new MatchEngine({ mode: 'survival', difficulty: 'hard', personality: 'calm' });
  match.board.squares.fill(null);
  match.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  match.board.squares[toSq(4, 4)] = { id: 3, type: 'knight', color: 'white', hasMoved: true };
  const evts = match.checkTurnStartConditions();
  assert.equal(match.phase, 'MATCH_OVER');
  assert.equal(match.winner, 'player');
  assert.ok(evts.some((e) => e.type === 'MATCH_ENDED'));
});

test('Hard/Calm AI spots checkmate in 1, converts winning K+Q vs K endgame, and never violates King rules', () => {
  // Back-rank mate in 1: White Kg1, Black Qa2/Kg8 -> Qa2 to a1# or e1#? Let's test Black Queen mate in 1
  const mateBoard = new BoardState();
  mateBoard.squares[toSq(0, 6)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  mateBoard.squares[toSq(1, 5)] = { id: 2, type: 'pawn', color: 'white', hasMoved: false };
  mateBoard.squares[toSq(1, 6)] = { id: 3, type: 'pawn', color: 'white', hasMoved: false };
  mateBoard.squares[toSq(1, 7)] = { id: 4, type: 'pawn', color: 'white', hasMoved: false };
  mateBoard.squares[toSq(7, 6)] = { id: 5, type: 'king', color: 'black', hasMoved: true };
  mateBoard.squares[toSq(4, 0)] = { id: 6, type: 'queen', color: 'black', hasMoved: true };

  for (const diff of ['easy', 'medium', 'hard', 'enthusiast', 'egoist', 'calm', 'unknown'] as const) {
    const mv = chooseAIMove(mateBoard, 'black', diff, () => 0.5, 1, []);
    assert.ok(mv, `${diff} AI should find a move`);
    const sim = mateBoard.clone();
    sim.applyMove(mv);
    assert.equal(isCheckmate(sim, 'white'), true, `${diff} AI should find forced Qa1# mate-in-1`);
  }

  // K+Q vs K Mop-Up: Hard AI drives lone White King to edge/mate and avoids repeating a recent position
  const mopBoard = new BoardState();
  mopBoard.squares[toSq(2, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  mopBoard.squares[toSq(4, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  mopBoard.squares[toSq(5, 3)] = { id: 3, type: 'queen', color: 'black', hasMoved: true };

  const aiMove = chooseAIMove(mopBoard, 'black', 'hard', () => 0.5, 2, []);
  assert.ok(aiMove);
  assert.notEqual(aiMove.to, toSq(2, 4), 'AI must never target enemy King square');

  // Wild action never targets enemy King square
  const wildAction = chooseAIWildAction(mopBoard, 'black', 'hard');
  assert.ok(wildAction);
  assert.notEqual(wildAction.move.to, toSq(2, 4));
});

test('Coin flip randomness stays strictly unbiased 50/50 at 0.5 threshold across difficulties', () => {
  const matchHardHeads = new MatchEngine({
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    rng: () => 0.499,
  });
  matchHardHeads.halfTurnIndex = 6;
  matchHardHeads.deck.drawPile = ['BULLET'];
  matchHardHeads.drawCard();
  const resH = matchHardHeads.resolveCoinFlip('heads');
  const coinEvtH = resH.find((e) => e.type === 'COIN_RESOLVED');
  assert.ok(coinEvtH && coinEvtH.type === 'COIN_RESOLVED');
  assert.equal(coinEvtH.actual, 'heads');
  assert.equal(coinEvtH.guessedRight, true);

  const matchHardTails = new MatchEngine({
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    rng: () => 0.5,
  });
  matchHardTails.halfTurnIndex = 6;
  matchHardTails.deck.drawPile = ['BULLET'];
  matchHardTails.drawCard();
  const resT = matchHardTails.resolveCoinFlip('heads');
  const coinEvtT = resT.find((e) => e.type === 'COIN_RESOLVED');
  assert.ok(coinEvtT && coinEvtT.type === 'COIN_RESOLVED');
  assert.equal(coinEvtT.actual, 'tails');
  assert.equal(coinEvtT.guessedRight, false);
});

test('BoardSnapshot round-trip preserves squares, castlingRights, enPassantTarget, graveyard, and nextPieceId', () => {
  const board = BoardState.createInitial();
  board.applyMove({ from: toSq(1, 4), to: toSq(3, 4) });
  board.applyMove({ from: toSq(6, 3), to: toSq(4, 3) });
  board.applyMove({ from: toSq(3, 4), to: toSq(4, 3) }); // pawn capture -> graveyard entry
  board.applyMove({ from: toSq(6, 0), to: toSq(4, 0) }); // en passant active on a6

  const snap = board.toSnapshot();
  const restored = BoardState.fromSnapshot(snap);

  assert.deepEqual(restored.squares, board.squares);
  assert.deepEqual(restored.castlingRights, board.castlingRights);
  assert.equal(restored.enPassantTarget, board.enPassantTarget);
  assert.deepEqual(restored.graveyard, board.graveyard);
  assert.equal(restored.nextPieceId, board.nextPieceId);
});

test('handleAIWorkerRequest computes legal move, resurrection, and wild responses without DOM/Worker', () => {
  const board = BoardState.createInitial();
  const moveRes = handleAIWorkerRequest({
    id: 1,
    kind: 'move',
    snapshot: board.toSnapshot(),
    aiColor: 'black',
    difficulty: 'medium',
    movesLeft: 1,
    recentPositionKeys: [],
  });
  assert.equal(moveRes.kind, 'move');
  assert.ok(moveRes.result && typeof moveRes.result.from === 'number');

  const wildRes = handleAIWorkerRequest({
    id: 2,
    kind: 'wild',
    snapshot: board.toSnapshot(),
    aiColor: 'black',
    difficulty: 'calm',
  });
  assert.equal(wildRes.kind, 'wild');
  assert.ok(wildRes.result && wildRes.result.targetType);

  board.squares[toSq(6, 0)] = null;
  board.graveyard.black.push({ id: 99, type: 'pawn', color: 'black', hasMoved: true });
  const resRes = handleAIWorkerRequest({
    id: 3,
    kind: 'resurrect',
    snapshot: board.toSnapshot(),
    aiColor: 'black',
  });
  assert.equal(resRes.kind, 'resurrect');
  assert.ok(resRes.result && resRes.result.pieceId === 99);
});

test('Light Mode includes Unknown (Incognito) as 4th standalone opponent with dedicated voice lines', async () => {
  const { VOICE_REGISTRY } = await import('../data/voiceRegistry');
  assert.deepEqual([...LIGHT_PERSONALITIES], ['enthusiast', 'egoist', 'calm', 'unknown']);
  const unknownEntries = VOICE_REGISTRY.filter((e) => e.speaker === 'unknown');
  assert.ok(unknownEntries.length >= 8, 'Unknown opponent must have dedicated EN/RU voice lines');
});

test('Opponent 4-move streak delivering check or exhausting legal moves atomically ends turn without deadlock', () => {
  // Scenario A: Opponent draws 4 Moves (NUM_4) and gives Check on move 1 -> movesLeft becomes 0 & turn passes to player
  const checkMatch = new MatchEngine({
    mode: 'survival',
    difficulty: 'medium',
    personality: 'calm',
    rng: () => 0.5,
  });
  checkMatch.board.squares.fill(null);
  checkMatch.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  checkMatch.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  checkMatch.board.squares[toSq(7, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  checkMatch.board.squares[toSq(6, 0)] = { id: 3, type: 'rook', color: 'black', hasMoved: true };

  checkMatch.activeActor = 'opponent';
  checkMatch.deck.drawPile = ['NUM_4'];
  checkMatch.drawCard();
  assert.equal(checkMatch.phase, 'PLAYER_MOVE_LOOP');
  assert.equal(checkMatch.movesLeft, 4);

  // Black Rook a7 -> e7 gives check to White King on e1 (not checkmate, king can step to d1/f1)
  const evts = checkMatch.executeMove({ from: toSq(6, 0), to: toSq(6, 4) });
  const moveEvt = evts.find((e) => e.type === 'PIECE_MOVED');
  assert.ok(moveEvt && moveEvt.type === 'PIECE_MOVED');
  assert.equal(moveEvt.isCheck, true);
  assert.equal(moveEvt.streakInterrupted, true);
  assert.equal(checkMatch.movesLeft, 0);
  assert.equal(checkMatch.activeActor, 'player');
  assert.equal(checkMatch.phase, 'AWAIT_DRAW_CARD');

  // Scenario B: Opponent draws 4 Moves and after move 1 opponent itself has 0 legal moves -> movesLeft becomes 0 & turn passes cleanly
  const trappedMatch = new MatchEngine({
    mode: 'survival',
    difficulty: 'medium',
    personality: 'calm',
    rng: () => 0.5,
  });
  trappedMatch.board.squares.fill(null);
  trappedMatch.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  // Black King on a8, Black Pawn on a7 (only legal move a7->a6), White Pawn blocks a5,
  // White Rooks on b1 (controls b-file) and h7 (attacks a7 once pawn leaves a7), White King on e1.
  trappedMatch.board.squares[toSq(7, 0)] = { id: 10, type: 'king', color: 'black', hasMoved: true };
  trappedMatch.board.squares[toSq(6, 0)] = { id: 11, type: 'pawn', color: 'black', hasMoved: false };
  trappedMatch.board.squares[toSq(4, 0)] = { id: 12, type: 'pawn', color: 'white', hasMoved: true };
  trappedMatch.board.squares[toSq(0, 1)] = { id: 13, type: 'rook', color: 'white', hasMoved: true };
  trappedMatch.board.squares[toSq(6, 7)] = { id: 14, type: 'rook', color: 'white', hasMoved: true };
  trappedMatch.board.squares[toSq(0, 4)] = { id: 15, type: 'king', color: 'white', hasMoved: true };
  trappedMatch.activeActor = 'opponent';
  trappedMatch.deck.drawPile = ['NUM_4'];
  trappedMatch.drawCard();
  assert.equal(trappedMatch.movesLeft, 4);

  const trapEvts = trappedMatch.executeMove({ from: toSq(6, 0), to: toSq(5, 0) });
  const trapMove = trapEvts.find((e) => e.type === 'PIECE_MOVED');
  assert.ok(trapMove && trapMove.type === 'PIECE_MOVED');
  assert.equal(trapMove.streakInterrupted, true);
  assert.equal(trappedMatch.movesLeft, 0);
  assert.equal(trappedMatch.activeActor, 'player');
  assert.equal(trappedMatch.phase, 'AWAIT_DRAW_CARD');
});

test('ProfileManager defaults and validates music/sfx/voice volumes, legacy migration, unknown audio curve, and day-night curve safely', async () => {
  const { createDefaultProfile, loadProfile, CURRENT_AUDIO_DEFAULTS_VERSION } = await import('./profileManager');
  const { computeEffectiveMusicVolume, CHANNEL_VOLUME_SCALE } = await import('../audio/musicManager');
  const { computeEffectiveSfxVolume } = await import('../audio/soundManager');
  const { computeEffectiveVoiceVolume } = await import('../data/voiceRegistry');
  const { computeUnknownNightTarget } = await import('../presentation/chunoScene');

  assert.equal(CURRENT_AUDIO_DEFAULTS_VERSION, 4);
  const def = createDefaultProfile();
  assert.equal(def.settings.menuMusicEnabled, true);
  assert.equal(def.settings.gameMusicEnabled, true);
  assert.equal(def.settings.musicVolume, 0.3);
  assert.equal(def.settings.sfxVolume, 0.35);
  assert.equal(def.settings.voiceVolume, 0.6);
  assert.equal(def.settings.dialogueAudioMode, 'tts');
  assert.equal(def.settings.audioDefaultsVersion, 4);

  // Verify deep perceptual curves, unknown 0.45x channel multiplier, & exact 0 at 0%
  assert.equal(CHANNEL_VOLUME_SCALE.unknown, 0.45);
  assert.equal(computeEffectiveMusicVolume(0, 'friendly'), 0);
  assert.equal(computeEffectiveMusicVolume(0, 'unknown'), 0);
  assert.ok(Math.abs(computeEffectiveMusicVolume(0.3, 'friendly') - Math.pow(0.3, 2.2) * 0.16) < 1e-6);
  assert.ok(Math.abs(computeEffectiveMusicVolume(0.3, 'unknown') - Math.pow(0.3, 2.2) * 0.16 * 0.45) < 1e-6);
  assert.ok(Math.abs(computeEffectiveMusicVolume(1, 'survival') - 0.16) < 1e-6);
  assert.ok(Math.abs(computeEffectiveMusicVolume(1, 'unknown') - 0.16 * 0.45) < 1e-6);

  assert.equal(computeEffectiveSfxVolume(0), 0);
  assert.ok(Math.abs(computeEffectiveSfxVolume(0.35) - Math.pow(0.35, 2.0) * 0.25) < 1e-6);
  assert.ok(Math.abs(computeEffectiveSfxVolume(1) - 0.25) < 1e-6);

  assert.equal(computeEffectiveVoiceVolume(0), 0);
  assert.ok(Math.abs(computeEffectiveVoiceVolume(0.6) - Math.pow(0.6, 1.8) * 0.45) < 1e-6);
  assert.ok(Math.abs(computeEffectiveVoiceVolume(1) - 0.45) < 1e-6);

  // Verify Unknown turn-based Day -> Sunset -> Night progression curve
  assert.equal(computeUnknownNightTarget(0), 0);
  assert.equal(computeUnknownNightTarget(1), 0);
  assert.equal(computeUnknownNightTarget(2), 0.28);
  assert.equal(computeUnknownNightTarget(3), 0.58);
  assert.equal(computeUnknownNightTarget(4), 0.85);
  assert.equal(computeUnknownNightTarget(5), 1.0);
  assert.equal(computeUnknownNightTarget(12), 1.0);

  // Verify legacy profile (audioDefaultsVersion < 4) migrates music/sfx once to 0.30/0.35,
  // while subsequent manual adjustments at version 4 are preserved.
  const prevWindow = (globalThis as { window?: unknown }).window;
  try {
    const store: Record<string, string> = {
      chuno_profile_v1: JSON.stringify({
        playerId: 'CHUNO-OLD1-OLD2',
        displayName: 'Veteran',
        score: 1200,
        language: 'ru',
        settings: {
          graphicsQuality: 'medium',
          showFps: true,
          musicVolume: 0.4,
          sfxVolume: 0.4,
          voiceVolume: 0.6,
          audioDefaultsVersion: 3,
        },
      }),
    };
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
    };
    const migrated = loadProfile();
    assert.equal(migrated.muted, false);
    assert.equal(migrated.settings.menuMusicEnabled, true);
    assert.equal(migrated.settings.gameMusicEnabled, true);
    assert.equal(migrated.settings.musicVolume, 0.3);
    assert.equal(migrated.settings.sfxVolume, 0.35);
    assert.equal(migrated.settings.voiceVolume, 0.6);
    assert.equal(migrated.settings.audioDefaultsVersion, 4);

    // User manually changes sliders after migration -> preserved on reload
    const updated = {
      ...migrated,
      settings: { ...migrated.settings, musicVolume: 0.72, sfxVolume: 0.65, voiceVolume: 0.85 },
    };
    store.chuno_profile_v1 = JSON.stringify(updated);
    const reloaded = loadProfile();
    assert.equal(reloaded.settings.musicVolume, 0.72);
    assert.equal(reloaded.settings.sfxVolume, 0.65);
    assert.equal(reloaded.settings.voiceVolume, 0.85);
    assert.equal(reloaded.settings.audioDefaultsVersion, 4);
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});

test('selectQualityVoice ignores espeak and prioritizes natural/neural browser voices', async () => {
  const { selectQualityVoice } = await import('../data/voiceRegistry');
  const fakeVoice = (name: string, lang: string, localService = true) =>
    ({ name, lang, voiceURI: name, default: false, localService }) as SpeechSynthesisVoice;

  // Only espeak available -> returns null so quiet atmospheric SFX fallback is used
  assert.equal(
    selectQualityVoice([fakeVoice('eSpeak Russian', 'ru-RU'), fakeVoice('espeak-ng', 'en-US')], 'ru', 'dealer'),
    null,
  );

  // Quality neural/online voice beats generic voice and espeak is excluded
  const pickedRu = selectQualityVoice(
    [
      fakeVoice('espeak ru', 'ru-RU'),
      fakeVoice('Generic Synth', 'ru-RU'),
      fakeVoice('Microsoft Dmitry Online (Natural) - Russian', 'ru-RU', false),
      fakeVoice('Milena', 'ru-RU', true),
    ],
    'ru',
    'dealer',
  );
  assert.ok(pickedRu);
  assert.match(pickedRu.name, /Dmitry/i);

  const pickedEn = selectQualityVoice(
    [
      fakeVoice('espeak en', 'en-US'),
      fakeVoice('Google US English', 'en-US', false),
    ],
    'en',
    'enthusiast',
  );
  assert.ok(pickedEn);
  assert.match(pickedEn.name, /Google/i);
});

test('King vs King Case A: immediate auto-draw when no revival and no Bullet remain', () => {
  const match = new MatchEngine({
    mode: 'light',
    difficulty: 'medium',
    personality: 'calm',
    rng: () => 0.5,
  });
  match.board.squares.fill(null);
  match.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  match.board.graveyard = { white: [], black: [] };
  // White King on e1, Black King on e8, White Pawn on a7 captured? No, put White King e1, Black King e8, Black Pawn e2 -> White King captures e2 -> King vs King with empty deck revivals
  match.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  match.board.squares[toSq(7, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  match.board.squares[toSq(1, 4)] = { id: 3, type: 'pawn', color: 'black', hasMoved: true };
  // Deck has no PLUS_2 / PLUS_4 and no BULLET -> absolute deadlock after pawn capture
  match.deck.drawPile = ['NUM_1', 'NUM_1'];
  match.deck.discardPile = [];

  match.drawCard();
  assert.equal(match.phase, 'PLAYER_MOVE_LOOP');
  const evts = match.executeMove({ from: toSq(0, 4), to: toSq(1, 4) });
  const endEvt = evts.find((e) => e.type === 'MATCH_ENDED');
  assert.ok(endEvt && endEvt.type === 'MATCH_ENDED');
  assert.equal(endEvt.winner, 'draw');
  assert.equal(endEvt.reason, 'insufficient_material');
  assert.equal(match.phase, 'MATCH_OVER');
});

test('King vs King Case B: auto-draw after 3 full moves (6 half-moves) when revival is still in deck', () => {
  const match = new MatchEngine({
    mode: 'light',
    difficulty: 'medium',
    personality: 'calm',
    rng: () => 0.5,
  });
  match.board.squares.fill(null);
  match.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  match.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  match.board.squares[toSq(7, 4)] = { id: 2, type: 'king', color: 'black', hasMoved: true };
  // Put a piece in graveyard AND PLUS_2 in deck so Case A does not fire immediately
  match.board.graveyard = {
    white: [{ id: 9, type: 'rook', color: 'white', hasMoved: true }],
    black: [],
  };
  match.deck.drawPile = ['PLUS_2', 'NUM_1', 'NUM_1', 'NUM_1', 'NUM_1', 'NUM_1', 'NUM_1', 'NUM_1'];

  // 6 half-moves of kings shuffling back and forth (with unique squares to avoid threefold repetition)
  const moves: { from: number; to: number }[] = [
    { from: toSq(0, 4), to: toSq(0, 3) }, // 1 (white)
    { from: toSq(7, 4), to: toSq(7, 3) }, // 2 (black)
    { from: toSq(0, 3), to: toSq(0, 2) }, // 3 (white)
    { from: toSq(7, 3), to: toSq(7, 2) }, // 4 (black)
    { from: toSq(0, 2), to: toSq(0, 1) }, // 5 (white)
    { from: toSq(7, 2), to: toSq(7, 1) }, // 6 (black) -> triggers Case B auto-draw
  ];

  let ended = false;
  for (let i = 0; i < moves.length; i++) {
    match.drawCard();
    const evts = match.executeMove(moves[i]);
    if (i < 5) {
      assert.equal(match.getState().isKingVsKing, true);
      assert.equal(match.phase, 'AWAIT_DRAW_CARD');
    } else {
      const endEvt = evts.find((e) => e.type === 'MATCH_ENDED');
      assert.ok(endEvt && endEvt.type === 'MATCH_ENDED');
      assert.equal(endEvt.winner, 'draw');
      assert.equal(endEvt.reason, 'insufficient_material');
      ended = true;
    }
  }
  assert.equal(ended, true);
});

test('offerDraw enforces strict turn thresholds, hard refusal on Survival Medium/Hard, and 4-turn cooldown', () => {
  // 1. Survival Medium & Hard: Dealer NEVER agrees to a manual draw (even late & losing), and locks button
  for (const diff of ['medium', 'hard'] as const) {
    const match = new MatchEngine({
      mode: 'survival',
      difficulty: diff,
      personality: 'calm',
      rng: () => 0.5,
    });
    match.halfTurnIndex = 40; // 20 full turns
    const res = match.offerDraw(-500);
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'dealer_hard_refusal');
    assert.equal(match.getState().drawOfferLocked, true);
    assert.equal(match.phase, 'AWAIT_DRAW_CARD');

    // Subsequent offer stays locked
    const lockedRes = match.offerDraw(-900);
    assert.equal(lockedRes.accepted, false);
    assert.equal(lockedRes.reason, 'locked');
  }

  // 2. Survival Easy: refuses on turn 0 (< 10 full turns) with 4-turn cooldown; accepts on turn 10+ if <= +50 cp
  const easyMatch = new MatchEngine({
    mode: 'survival',
    difficulty: 'easy',
    personality: 'calm',
    rng: () => 0.5,
  });
  const earlyEasy = easyMatch.offerDraw(0);
  assert.equal(earlyEasy.accepted, false);
  assert.equal(earlyEasy.reason, 'dealer_early_refusal');
  assert.equal(easyMatch.getState().drawOfferCooldownTurns, 4);
  assert.equal(easyMatch.offerDraw(0).reason, 'cooldown');

  easyMatch.drawOfferCooldownTurns = 0;
  easyMatch.halfTurnIndex = 20; // 10 full turns
  const lateEasyAccept = easyMatch.offerDraw(50);
  assert.equal(lateEasyAccept.accepted, true);
  assert.equal(easyMatch.winner, 'draw');
  assert.equal(easyMatch.endReason, 'draw_agreed');

  // 3. Light Mode: turn 0 ALWAYS refused for every personality
  for (const pers of ['enthusiast', 'unknown', 'calm', 'egoist'] as const) {
    const m = new MatchEngine({ mode: 'light', difficulty: 'medium', personality: pers, rng: () => 0.5 });
    const turn0 = m.offerDraw(-200);
    assert.equal(turn0.accepted, false);
    assert.equal(m.getState().drawOfferCooldownTurns, 4);
  }

  // 4. Light Enthusiast accepts at 6+ full turns with equal/slight-edge position (<= 100 cp)
  const entMatch = new MatchEngine({
    mode: 'light',
    difficulty: 'medium',
    personality: 'enthusiast',
    rng: () => 0.5,
  });
  entMatch.halfTurnIndex = 12; // 6 full turns
  const entRes = entMatch.offerDraw(80);
  assert.equal(entRes.accepted, true);
  assert.equal(entMatch.winner, 'draw');
  assert.equal(entMatch.endReason, 'draw_agreed');

  // 5. Light Egoist refuses at turn 12 if equal (0 cp), accepts only when losing (<= -50 cp)
  const egoMatch = new MatchEngine({
    mode: 'light',
    difficulty: 'medium',
    personality: 'egoist',
    rng: () => 0.5,
  });
  egoMatch.halfTurnIndex = 24; // 12 full turns
  assert.equal(egoMatch.offerDraw(0).accepted, false);
  egoMatch.drawOfferCooldownTurns = 0;
  assert.equal(egoMatch.offerDraw(-60).accepted, true);
});

test('Achievements registry has exactly 32 unique achievements and unlocks & scores accurately', async () => {
  const { ACHIEVEMENTS } = await import('./achievements');
  const { createDefaultProfile, recordMatchOutcomeDetailed } = await import('./profileManager');

  assert.equal(ACHIEVEMENTS.length, 32);
  const uniqueIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const uniqueIcons = new Set(ACHIEVEMENTS.map((a) => a.icon));
  assert.equal(uniqueIds.size, 32);
  assert.equal(uniqueIcons.size, 32);

  // Win Survival Hard by bloodless checkmate in 85s after Reverse & Wild checkmate
  const baseProfile = createDefaultProfile();
  const res = recordMatchOutcomeDetailed(baseProfile, {
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    outcome: 'win',
    endReason: 'checkmate',
    coinsSurvived: 1,
    shotsFired: 0,
    playerHpRemaining: 1,
    elapsedSeconds: 85,
    turnsPlayed: 6,
    reverseOccurred: true,
    maxResurrectedSingleCard: 4,
    wonByWildCheckmate: true,
  });

  const unlockedIds = new Set(res.newlyUnlocked.map((a) => a.id));
  assert.ok(unlockedIds.has('first_seat'));
  assert.ok(unlockedIds.has('survive_hard'));
  assert.ok(unlockedIds.has('bloodless_win'));
  assert.ok(unlockedIds.has('necromancer_4'));
  assert.ok(unlockedIds.has('traitor_crown'));
  assert.ok(unlockedIds.has('wild_mate'));
  assert.ok(unlockedIds.has('blitz_win'));

  // Score calculation: Hard base (900 * 1.0) + bloodless (150) + 1 coin (100) + blitz (120) + achievement points
  assert.equal(res.scoreBreakdown.baseWinPoints, 900);
  assert.equal(res.scoreBreakdown.streakMultiplier, 1.0);
  assert.ok(res.scoreBreakdown.styleBonuses.some((b) => b.key === 'bloodless' && b.points === 150));
  assert.ok(res.scoreBreakdown.styleBonuses.some((b) => b.key === 'coins' && b.points === 100));
  assert.ok(res.scoreBreakdown.styleBonuses.some((b) => b.key === 'blitz' && b.points === 120));
  assert.ok(res.profile.score === res.scoreBreakdown.totalAwarded);

  // Losing a match NEVER subtracts score
  const scoreBeforeLoss = res.profile.score;
  const afterLoss = recordMatchOutcomeDetailed(res.profile, {
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    outcome: 'loss',
    endReason: 'checkmate',
    coinsSurvived: 0,
    shotsFired: 1,
    playerHpRemaining: 0,
    elapsedSeconds: 200,
    turnsPlayed: 8,
    reverseOccurred: false,
    maxResurrectedSingleCard: 0,
    wonByWildCheckmate: false,
  });
  assert.equal(afterLoss.profile.score, scoreBeforeLoss);
});

test('LocalLeaderboardProvider ranks player among HOUSE benchmarks across categories', async () => {
  const { LocalLeaderboardProvider } = await import('./leaderboardService');
  const { createDefaultProfile } = await import('./profileManager');

  const provider = new LocalLeaderboardProvider();
  const p = createDefaultProfile();
  p.displayName = 'AceTester';
  p.score = 7200;
  p.stats.survivalHardWins = 30;
  p.stats.bestStreak = 15;

  await provider.submitPlayerSnapshot(p);
  const byScore = await provider.getBoard('score');
  assert.equal(byScore[0].displayName, 'The Dealer');
  assert.equal(byScore[1].displayName, 'AceTester');
  assert.equal(byScore[1].tag, 'YOU');

  const byHard = await provider.getBoard('hard_wins');
  assert.equal(byHard[0].displayName, 'AceTester');

  const byStreak = await provider.getBoard('win_streak');
  assert.equal(byStreak[0].displayName, 'AceTester');
});

test('resign ends match immediately with opponent victory and resignation reason', () => {
  const match = new MatchEngine({
    mode: 'survival',
    difficulty: 'hard',
    personality: 'calm',
    rng: () => 0.5,
  });
  const evts = match.resign('player');
  const endEvt = evts.find((e) => e.type === 'MATCH_ENDED');
  assert.ok(endEvt && endEvt.type === 'MATCH_ENDED');
  assert.equal(endEvt.winner, 'opponent');
  assert.equal(endEvt.reason, 'resignation');
  assert.equal(match.phase, 'MATCH_OVER');
  assert.equal(match.winner, 'opponent');
  assert.equal(match.endReason, 'resignation');
});

test('formatMatchTime formats MM:SS and HH:MM:SS cleanly', async () => {
  const { formatMatchTime } = await import('./localization');
  assert.equal(formatMatchTime(0), '00:00');
  assert.equal(formatMatchTime(65), '01:05');
  assert.equal(formatMatchTime(3661), '01:01:01');
});

test('webGuestGate enforces 0 -> 1 -> 2 -> 3 match progression in browser, resets on version bump, and is disabled in Tauri', async () => {
  const {
    getWebGuestStatus,
    recordWebGuestMatchCompleted,
    MAX_WEB_GUEST_MATCHES,
  } = await import('./webGuestGate');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  // 0. Initial browser state (0/3)
  const s0 = getWebGuestStatus({ appVersion: '0.2.2', storage: mockStorage, isTauri: false });
  assert.equal(s0.isGuestMode, true);
  assert.equal(s0.matchesPlayed, 0);
  assert.equal(s0.maxMatches, MAX_WEB_GUEST_MATCHES);
  assert.equal(s0.remainingMatches, 3);
  assert.equal(s0.isLocked, false);
  assert.equal(s0.promptKind, 'none');

  // 1. After 1st completed match (1/3 -> soft upsell prompt with 2 matches left)
  const s1 = recordWebGuestMatchCompleted({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: false,
  });
  assert.equal(s1.matchesPlayed, 1);
  assert.equal(s1.remainingMatches, 2);
  assert.equal(s1.isLocked, false);
  assert.equal(s1.promptKind, 'after_first');

  // 2. After 2nd completed match (2/3 -> final match reminder with 1 match left)
  const s2 = recordWebGuestMatchCompleted({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: false,
  });
  assert.equal(s2.matchesPlayed, 2);
  assert.equal(s2.remainingMatches, 1);
  assert.equal(s2.isLocked, false);
  assert.equal(s2.promptKind, 'after_second');

  // 3. After 3rd completed match (3/3 -> hard lock, 0 remaining)
  const s3 = recordWebGuestMatchCompleted({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: false,
  });
  assert.equal(s3.matchesPlayed, 3);
  assert.equal(s3.remainingMatches, 0);
  assert.equal(s3.isLocked, true);
  assert.equal(s3.promptKind, 'locked');

  // Reloading page in same version remains locked
  const s3Reload = getWebGuestStatus({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: false,
  });
  assert.equal(s3Reload.isLocked, true);
  assert.equal(s3Reload.matchesPlayed, 3);

  // 4. Version bump (0.2.2 -> 0.2.3) automatically resets guest allowance to 0/3
  const nextVer = getWebGuestStatus({
    appVersion: '0.2.3',
    storage: mockStorage,
    isTauri: false,
  });
  assert.equal(nextVer.matchesPlayed, 0);
  assert.equal(nextVer.remainingMatches, 3);
  assert.equal(nextVer.isLocked, false);
  assert.equal(nextVer.promptKind, 'none');

  // 5. Desktop Tauri runtime completely disables guest gate even if storage had 3/3
  const tauriState = getWebGuestStatus({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: true,
  });
  assert.equal(tauriState.isGuestMode, false);
  assert.equal(tauriState.isLocked, false);
  assert.equal(tauriState.promptKind, 'none');
  assert.equal(tauriState.remainingMatches, Number.POSITIVE_INFINITY);

  const tauriAfterMatch = recordWebGuestMatchCompleted({
    appVersion: '0.2.2',
    storage: mockStorage,
    isTauri: true,
  });
  assert.equal(tauriAfterMatch.isGuestMode, false);
  assert.equal(tauriAfterMatch.isLocked, false);
});

test('mergeProfiles, exportProfileToJson, and parseAndValidateImportedProfile preserve achievements, stats, and forward-compatible fields', async () => {
  const {
    createDefaultProfile,
    mergeProfiles,
    exportProfileToJson,
    parseAndValidateImportedProfile,
  } = await import('./profileManager');

  const local = createDefaultProfile();
  local.displayName = 'Player';
  local.score = 600;
  local.stats.totalMatches = 2;
  local.stats.lightWins = 2;
  local.unlockedAchievements = { first_seat: '2026-11-23T10:00:00Z' };

  const diskBackup = createDefaultProfile();
  diskBackup.playerId = 'CHUNO-DISK-SAVE';
  diskBackup.displayName = 'GrandMaster';
  diskBackup.score = 2400;
  diskBackup.stats.totalMatches = 8;
  diskBackup.stats.survivalHardWins = 3;
  diskBackup.stats.bestStreak = 5;
  diskBackup.stats.fastestWinSec = 74;
  diskBackup.unlockedAchievements = {
    first_seat: '2026-11-20T09:00:00Z',
    survive_hard: '2026-11-21T12:00:00Z',
  };
  diskBackup.friends = [
    {
      friendCode: 'CHUNO-COMP-0001',
      nickname: 'CompanionA',
      avatarId: 'artist',
      addedAt: '2026-11-22T00:00:00Z',
      matchesTogether: 2,
    },
  ];
  diskBackup.futureExpansionField = { guild: 'Buro' };

  const merged = mergeProfiles(local, diskBackup);
  assert.equal(merged.playerId, 'CHUNO-DISK-SAVE');
  assert.equal(merged.displayName, 'GrandMaster');
  assert.equal(merged.score, 2400);
  assert.equal(merged.stats.lightWins, 2);
  assert.equal(merged.stats.survivalHardWins, 3);
  assert.equal(merged.stats.bestStreak, 5);
  assert.equal(merged.stats.fastestWinSec, 74);
  assert.equal(merged.unlockedAchievements.first_seat, '2026-11-20T09:00:00Z');
  assert.ok(merged.unlockedAchievements.survive_hard);
  assert.equal(merged.friends?.length, 1);
  assert.deepEqual(merged.futureExpansionField, { guild: 'Buro' });

  const json = exportProfileToJson(merged);
  const imported = parseAndValidateImportedProfile(json, createDefaultProfile());
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.profile.displayName, 'GrandMaster');
    assert.equal(imported.profile.score, 2400);
    assert.ok(imported.profile.unlockedAchievements.survive_hard);
    assert.equal(imported.profile.friends?.length, 1);
  }

  assert.equal(parseAndValidateImportedProfile('').ok, false);
  assert.equal(parseAndValidateImportedProfile('{corrupt').ok, false);
  assert.equal(parseAndValidateImportedProfile('{"unrelated": 123}').ok, false);
});




test('v0.2.3 profile migration preserves v0.2.2 achievements, stats, and settings without reset', async () => {
  const { normalizeAndMigrateProfile, mergeProfiles, APP_VERSION, getPrivacyPolicyUrl } = await import('./profileManager');
  assert.equal(APP_VERSION, '0.4.2');

  const v022Profile = {
    schemaVersion: 2,
    playerId: 'CHUNO-V022-KEEP',
    displayName: 'Grandmaster',
    score: 4850,
    language: 'ru',
    muted: false,
    settings: {
      graphicsQuality: 'medium',
      showFps: true,
      menuMusicEnabled: true,
      gameMusicEnabled: false,
      musicVolume: 0.42,
      sfxVolume: 0.55,
      voiceVolume: 0.7,
      dialogueAudioMode: 'tts',
      audioDefaultsVersion: 4,
    },
    unlockedAchievements: {
      first_win: '2026-11-22T10:00:00.000Z',
      survival_hard_win: '2026-11-23T12:00:00.000Z',
    },
    stats: {
      totalMatches: 18,
      lightWins: 10,
      survivalHardWins: 3,
      bestStreak: 6,
      fastestWinSec: 92,
    },
  };

  const { profile: migrated } = normalizeAndMigrateProfile(v022Profile);
  assert.equal(migrated.playerId, 'CHUNO-V022-KEEP');
  assert.equal(migrated.displayName, 'Grandmaster');
  assert.equal(migrated.score, 4850);
  assert.equal(migrated.unlockedAchievements.first_win, '2026-11-22T10:00:00.000Z');
  assert.equal(migrated.unlockedAchievements.survival_hard_win, '2026-11-23T12:00:00.000Z');
  assert.equal(migrated.stats.bestStreak, 6);
  assert.equal(migrated.stats.fastestWinSec, 92);
  assert.equal(migrated.settings.musicVolume, 0.42);
  assert.equal(migrated.hasSeenTutorial, false);
  assert.equal(migrated.hasSeenFirstMatchHints, false);

  // Lossless merge preserves tutorial flags once seen
  const seen = { ...migrated, hasSeenTutorial: true, hasSeenFirstMatchHints: true };
  const merged = mergeProfiles(migrated, seen);
  assert.equal(merged.hasSeenTutorial, true);
  assert.equal(merged.hasSeenFirstMatchHints, true);
  assert.equal(merged.score, 4850);

  // Privacy Policy URL strictly uses /{lang}/legal/privacy
  assert.equal(getPrivacyPolicyUrl('en'), 'https://buro-ecosystem-web.pages.dev/en/legal/privacy');
  assert.equal(getPrivacyPolicyUrl('ru'), 'https://buro-ecosystem-web.pages.dev/ru/legal/privacy');
  assert.equal(getPrivacyPolicyUrl('uz'), 'https://buro-ecosystem-web.pages.dev/uz/legal/privacy');
});

test('v0.2.3 visual guide 5-slide navigation and first-match phase hints work cleanly', async () => {
  const {
    GUIDE_SLIDE_COUNT,
    clampGuideSlide,
    nextGuideSlide,
    prevGuideSlide,
    resolveFirstMatchHint,
  } = await import('./tutorialHelper');
  const { getTranslations } = await import('./localization');

  assert.equal(GUIDE_SLIDE_COUNT, 5);
  assert.equal(getTranslations('en').guideSlides.length, 5);
  assert.equal(getTranslations('ru').guideSlides.length, 5);

  assert.equal(clampGuideSlide(-2), 0);
  assert.equal(clampGuideSlide(99), 4);
  assert.equal(nextGuideSlide(0), 1);
  assert.equal(nextGuideSlide(4), 4);
  assert.equal(prevGuideSlide(0), 0);
  assert.equal(prevGuideSlide(3), 2);

  // Phase hints match real MatchEngine phases and stop after 2 cycles or once seen
  const drawHintRu = resolveFirstMatchHint({
    hasSeenFirstMatchHints: false,
    completedCycles: 0,
    phase: 'AWAIT_DRAW_CARD',
    activeActor: 'player',
    language: 'ru',
  });
  assert.ok(drawHintRu && drawHintRu.includes('колоду'));

  const moveHintEn = resolveFirstMatchHint({
    hasSeenFirstMatchHints: false,
    completedCycles: 1,
    phase: 'PLAYER_MOVE_LOOP',
    activeActor: 'player',
    language: 'en',
  });
  assert.ok(moveHintEn && moveHintEn.includes('pieces'));

  assert.equal(
    resolveFirstMatchHint({
      hasSeenFirstMatchHints: false,
      completedCycles: 2,
      phase: 'AWAIT_DRAW_CARD',
      activeActor: 'player',
      language: 'en',
    }),
    null,
  );
  assert.equal(
    resolveFirstMatchHint({
      hasSeenFirstMatchHints: true,
      completedCycles: 0,
      phase: 'AWAIT_DRAW_CARD',
      activeActor: 'player',
      language: 'en',
    }),
    null,
  );
});

test('v0.2.3 webGuestGate resets cleanly on version bump from 0.2.2 and stays disabled in Tauri', async () => {
  const { getWebGuestStatus, getWebGuestStorageKey, recordWebGuestMatchCompleted } = await import('./webGuestGate');
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };

  // Exhaust 0.2.2 guest quota
  recordWebGuestMatchCompleted({ appVersion: '0.2.2', storage, isTauri: false });
  recordWebGuestMatchCompleted({ appVersion: '0.2.2', storage, isTauri: false });
  recordWebGuestMatchCompleted({ appVersion: '0.2.2', storage, isTauri: false });
  assert.equal(getWebGuestStatus({ appVersion: '0.2.2', storage, isTauri: false }).isLocked, true);

  // Default APP_VERSION is now 0.4.2 -> fresh 0/3 guest allowance
  assert.equal(getWebGuestStorageKey(), 'chuno_web_guest_v0.4.2');
  const v023Web = getWebGuestStatus({ storage, isTauri: false });
  assert.equal(v023Web.isGuestMode, true);
  assert.equal(v023Web.matchesPlayed, 0);
  assert.equal(v023Web.isLocked, false);

  // Tauri desktop stays completely unlocked
  const v023Tauri = getWebGuestStatus({ storage, isTauri: true });
  assert.equal(v023Tauri.isGuestMode, false);
  assert.equal(v023Tauri.isLocked, false);
});

test('v0.2.3 profile migrates safely to schema v3 with nickname and avatarId without losing achievements or stats', async () => {
  const {
    CURRENT_PROFILE_SCHEMA_VERSION,
    normalizeAndMigrateProfile,
    mergeProfiles,
    createDefaultProfile,
  } = await import('./profileManager');
  const { DEFAULT_AVATAR_ID } = await import('../data/playerAvatars');

  const legacyV023Save = {
    schemaVersion: 2,
    updatedAt: '2026-11-24T12:00:00.000Z',
    playerId: 'CHUNO-OLD1-SAVE',
    displayName: 'GrandMaster99',
    score: 4850,
    language: 'ru',
    muted: false,
    hasSeenTutorial: true,
    hasSeenFirstMatchHints: true,
    settings: {
      graphicsQuality: 'medium',
      showFps: true,
      menuMusicEnabled: true,
      gameMusicEnabled: false,
      musicVolume: 0.45,
      sfxVolume: 0.5,
      voiceVolume: 0.7,
      dialogueAudioMode: 'sfx',
      audioDefaultsVersion: 4,
    },
    unlockedAchievements: {
      first_seat: '2026-11-20T10:00:00.000Z',
      survive_hard: '2026-11-22T18:30:00.000Z',
    },
    stats: {
      totalMatches: 27,
      lightWins: 14,
      survivalHardWins: 3,
      bestStreak: 6,
      fastestWinSec: 74,
    },
    friends: [{ id: 'CHUNO-FRND-0001', displayName: 'Alice', addedAt: '2026-11-23T09:00:00.000Z' }],
  };

  const { profile, needsSave } = normalizeAndMigrateProfile(legacyV023Save);
  assert.equal(needsSave, true);
  assert.equal(profile.schemaVersion, CURRENT_PROFILE_SCHEMA_VERSION);
  assert.equal(profile.nickname, 'GrandMaster99');
  assert.equal(profile.displayName, 'GrandMaster99');
  assert.equal(profile.avatarId, DEFAULT_AVATAR_ID);
  assert.equal(profile.score, 4850);
  assert.equal(profile.language, 'ru');
  assert.equal(profile.stats.totalMatches, 27);
  assert.equal(profile.stats.survivalHardWins, 3);
  assert.equal(profile.stats.fastestWinSec, 74);
  assert.equal(profile.unlockedAchievements.first_seat, '2026-11-20T10:00:00.000Z');
  assert.equal(profile.unlockedAchievements.survive_hard, '2026-11-22T18:30:00.000Z');
  assert.equal(profile.friends?.length, 1);

  // Merge preserves selected avatarId and custom nickname
  const customized = createDefaultProfile();
  customized.nickname = 'ShadowQueen';
  customized.displayName = 'ShadowQueen';
  customized.avatarId = 'night_lady';
  const merged = mergeProfiles(profile, customized, true);
  assert.equal(merged.nickname, 'ShadowQueen');
  assert.equal(merged.avatarId, 'night_lady');
  assert.equal(merged.score, 4850);
  assert.equal(merged.unlockedAchievements.survive_hard, '2026-11-22T18:30:00.000Z');
});

test('Nickname validation (2-18 chars) and 10-avatar registry integrity (6 male + 4 female, EN/RU/UZ)', async () => {
  const { validateNickname } = await import('./profileManager');
  const {
    PLAYER_AVATARS,
    getAvatarsByGender,
    getPlayerAvatar,
    isValidAvatarId,
  } = await import('../data/playerAvatars');

  assert.equal(validateNickname('   ').valid, false);
  assert.equal(validateNickname('A').valid, false);
  assert.equal(validateNickname('A').error, 'too_short');
  assert.equal(validateNickname('  Alex   Pro  ').valid, true);
  assert.equal(validateNickname('  Alex   Pro  ').normalized, 'Alex Pro');
  assert.equal(validateNickname('1234567890123456789').valid, false);
  assert.equal(validateNickname('1234567890123456789').error, 'too_long');

  assert.equal(PLAYER_AVATARS.length, 10);
  const male = getAvatarsByGender('male');
  const female = getAvatarsByGender('female');
  assert.equal(male.length, 6);
  assert.equal(female.length, 4);
  assert.equal(getAvatarsByGender('all').length, 10);

  const ids = new Set(PLAYER_AVATARS.map((a) => a.id));
  assert.equal(ids.size, 10);

  for (const av of PLAYER_AVATARS) {
    assert.equal(isValidAvatarId(av.id), true);
    assert.ok(av.name.en.length > 0 && av.name.ru.length > 0 && av.name.uz.length > 0);
    assert.ok(av.tagline.en.length > 0 && av.tagline.ru.length > 0 && av.tagline.uz.length > 0);
    assert.ok(av.threeConfig.coatColor.startsWith('#'));
    assert.equal(getPlayerAvatar(av.id).id, av.id);
  }
  assert.equal(isValidAvatarId('unknown_skin'), false);
  assert.equal(getPlayerAvatar('unknown_skin').id, 'strategist');
});

test('Leaderboard/Achievements tab switching and Online 1v1 submodes & demo room codes work cleanly', async () => {
  const {
    ONLINE_SUBMODES,
    buildDemoInviteLink,
    generateDemoRoomCode,
    isValidDemoRoomCode,
    nextLeaderDashboardTab,
  } = await import('./menuNavigation');
  const { getTranslations } = await import('./localization');

  assert.equal(nextLeaderDashboardTab('leaderboard', 'achievements'), 'achievements');
  assert.equal(nextLeaderDashboardTab('achievements', 'leaderboard'), 'leaderboard');

  assert.deepEqual([...ONLINE_SUBMODES], ['online_friendly', 'online_survival']);
  const code = generateDemoRoomCode(() => 0.25);
  assert.equal(isValidDemoRoomCode(code), true);
  assert.ok(code.startsWith('CH-'));
  assert.equal(isValidDemoRoomCode('ch-4829'), true);
  assert.equal(isValidDemoRoomCode('INVALID'), false);

  const friendlyLink = buildDemoInviteLink(code, 'online_friendly');
  const survivalLink = buildDemoInviteLink(code, 'online_survival');
  assert.ok(friendlyLink.includes(`/friendly/${code}`));
  assert.ok(survivalLink.includes(`/survival/${code}`));

  for (const lang of ['en', 'ru', 'uz'] as const) {
    const t = getTranslations(lang);
    assert.ok(t.modeLight.length > 0);
    assert.ok(t.modeSurvival.length > 0);
    assert.ok(t.modeOnline.length > 0);
    assert.ok(t.leaderboardTab.length > 0);
    assert.ok(t.achievementsTab.length > 0);
    assert.ok(t.onlinePreviewNotice.length > 0);
  }
});

test('Online client helpers: formatThinkTimeMs (MM:SS), 1/2/3 HP options, ?room=CH-XXXX parsing, and EN/RU/UZ labels', async () => {
  const {
    STARTING_HP_OPTIONS,
    formatThinkTimeMs,
    parseRoomCodeFromSearch,
    wsUrlToHttpBase,
  } = await import('./onlineClient');
  const { getTranslations } = await import('./localization');

  assert.equal(formatThinkTimeMs(0), '00:00');
  assert.equal(formatThinkTimeMs(102_400), '01:42');
  assert.equal(formatThinkTimeMs(365_000), '06:05');
  assert.equal(formatThinkTimeMs(-500), '00:00');

  assert.deepEqual([...STARTING_HP_OPTIONS], [3, 2, 1]);
  assert.equal(parseRoomCodeFromSearch('?room=ch-4829'), 'CH-4829');
  assert.equal(parseRoomCodeFromSearch('?foo=1&room=CH-AB12'), 'CH-AB12');
  assert.equal(parseRoomCodeFromSearch('?room=bad'), null);
  assert.equal(wsUrlToHttpBase('ws://127.0.0.1:8787'), 'http://127.0.0.1:8787');
  assert.equal(wsUrlToHttpBase('wss://chuno-mp.example.workers.dev'), 'https://chuno-mp.example.workers.dev');

  assert.equal(getTranslations('en').onlineFriendlyTitle, 'Classic');
  assert.equal(getTranslations('ru').onlineFriendlyTitle, 'Классический');
  assert.equal(getTranslations('uz').onlineFriendlyTitle, 'Klassik');
  assert.equal(getTranslations('en').onlineSurvivalTitle, 'Survival');
  assert.equal(getTranslations('ru').onlineSurvivalTitle, 'Выживание');
  assert.equal(getTranslations('uz').onlineSurvivalTitle, 'Omon qolish');
});

test('Desktop update notifications: red dot persists after Later, completely hidden in web browser, 20m cooldown', async () => {
  const {
    UPDATE_CHECK_COOLDOWN_MS,
    computeUpdateIndicatorState,
    shouldRunBackgroundUpdateCheck,
  } = await import('./updateNotificationState');

  // Web browser: never shows red dot or toast and never runs background check
  assert.equal(shouldRunBackgroundUpdateCheck({ isTauri: false, lastCheckedAt: null, now: 1000 }), false);
  assert.deepEqual(
    computeUpdateIndicatorState({ isTauri: false, availableVersion: '0.3.0', toastDismissed: false }),
    { showRedDot: false, showToast: false },
  );

  // Desktop Tauri: shows both red dot & toast when update available
  assert.deepEqual(
    computeUpdateIndicatorState({ isTauri: true, availableVersion: '0.3.0', toastDismissed: false }),
    { showRedDot: true, showToast: true },
  );

  // Clicking "Later" hides toast, but keeps red dot lit
  assert.deepEqual(
    computeUpdateIndicatorState({ isTauri: true, availableVersion: '0.3.0', toastDismissed: true }),
    { showRedDot: true, showToast: false },
  );

  // Background check throttle
  assert.equal(shouldRunBackgroundUpdateCheck({ isTauri: true, lastCheckedAt: null, now: 1000 }), true);
  assert.equal(shouldRunBackgroundUpdateCheck({ isTauri: true, lastCheckedAt: 1000, now: 1000 + 60_000 }), false);
  assert.equal(
    shouldRunBackgroundUpdateCheck({ isTauri: true, lastCheckedAt: 1000, now: 1000 + UPDATE_CHECK_COOLDOWN_MS }),
    true,
  );
});

test('copyTextToClipboard uses async clipboard and cleanly falls back to execCommand when clipboard fails', async () => {
  const { copyTextToClipboard } = await import('./clipboard');
  const { getTranslations } = await import('./localization');

  let written = '';
  const okPrimary = await copyTextToClipboard('CH-9X2K', {
    writeText: async (v) => {
      written = v;
    },
  });
  assert.equal(okPrimary, true);
  assert.equal(written, 'CH-9X2K');

  let fallbackVal = '';
  const okFallback = await copyTextToClipboard('CH-7M4P', {
    writeText: async () => {
      throw new Error('Insecure context');
    },
    execCopyFallback: (v) => {
      fallbackVal = v;
      return true;
    },
  });
  assert.equal(okFallback, true);
  assert.equal(fallbackVal, 'CH-7M4P');

  assert.equal(await copyTextToClipboard(''), false);

  for (const lang of ['en', 'ru', 'uz'] as const) {
    const t = getTranslations(lang);
    assert.ok(t.onlineCopyCode.length > 0);
    assert.ok(t.onlineCodeCopied.length > 0);
  }
});

test('resolveOnlineAutoCamera switches to top-down CAM_BOARD_TACTICAL on player move/wild/revive and returns to CAM_IDLE', async () => {
  const { resolveOnlineAutoCamera } = await import('./onlineCamera');

  // Player draws NUM_2 -> CAM_CARD_DRAW then CAM_BOARD_TACTICAL
  const drawToMove = resolveOnlineAutoCamera({
    prevPhase: 'AWAIT_DRAW_CARD',
    prevActiveSeat: 'host',
    nextPhase: 'PLAYER_MOVE_LOOP',
    nextActiveSeat: 'host',
    yourSeat: 'host',
    events: [{ type: 'CARD_DRAWN', actor: 'host', card: 'NUM_2' }],
  });
  assert.equal(drawToMove.immediatePreset, 'CAM_CARD_DRAW');
  assert.equal(drawToMove.delayedPreset, 'CAM_BOARD_TACTICAL');

  // Direct entry into AWAIT_RESURRECT_PLACEMENT on your turn -> immediate CAM_BOARD_TACTICAL
  const revive = resolveOnlineAutoCamera({
    prevPhase: 'AWAIT_DRAW_CARD',
    prevActiveSeat: 'host',
    nextPhase: 'AWAIT_RESURRECT_PLACEMENT',
    nextActiveSeat: 'host',
    yourSeat: 'host',
  });
  assert.equal(revive.immediatePreset, 'CAM_BOARD_TACTICAL');

  // Turn ends and passes to opponent -> returns to CAM_IDLE
  const passToOpp = resolveOnlineAutoCamera({
    prevPhase: 'PLAYER_MOVE_LOOP',
    prevActiveSeat: 'host',
    nextPhase: 'AWAIT_DRAW_CARD',
    nextActiveSeat: 'guest',
    yourSeat: 'host',
  });
  assert.equal(passToOpp.immediatePreset, 'CAM_IDLE');

  // No phase/turn change -> preserves user manual camera toggle
  const noChange = resolveOnlineAutoCamera({
    prevPhase: 'PLAYER_MOVE_LOOP',
    prevActiveSeat: 'host',
    nextPhase: 'PLAYER_MOVE_LOOP',
    nextActiveSeat: 'host',
    yourSeat: 'host',
  });
  assert.equal(noChange.immediatePreset, null);

  // Survival coin resolved -> CAM_COIN_FLIP then returns to CAM_IDLE
  const coin = resolveOnlineAutoCamera({
    prevPhase: 'AWAIT_COIN_CHOICE',
    prevActiveSeat: 'host',
    nextPhase: 'AWAIT_DRAW_CARD',
    nextActiveSeat: 'guest',
    yourSeat: 'host',
    events: [{ type: 'COIN_RESOLVED', drawer: 'host', guesser: 'guest', actual: 'heads', guessedRight: false }],
  });
  assert.equal(coin.immediatePreset, 'CAM_COIN_FLIP');
  assert.equal(coin.delayedPreset, 'CAM_IDLE');
});

test('Friends list: addFriend validation, duplicate & self protection, removeFriend, match sync, and lossless v4 migration', async () => {
  const {
    CURRENT_PROFILE_SCHEMA_VERSION,
    addFriend,
    createDefaultProfile,
    isFriend,
    normalizeAndMigrateProfile,
    removeFriend,
    syncFriendMatchPresence,
  } = await import('./profileManager');

  assert.equal(CURRENT_PROFILE_SCHEMA_VERSION, 4);

  const me = createDefaultProfile();
  me.playerId = 'CHUNO-SELF-1234';
  me.score = 1900;
  me.unlockedAchievements = { first_win: '2026-11-24T00:00:00Z' };

  // Rejects invalid code and self code
  assert.deepEqual(addFriend(me, { friendCode: 'BAD-CODE' }), { ok: false, error: 'invalid_code' });
  assert.deepEqual(addFriend(me, { friendCode: 'chuno-self-1234' }), { ok: false, error: 'self' });

  // Adds valid friend cleanly
  const r1 = addFriend(me, {
    friendCode: 'chuno-frnd-8888',
    nickname: 'LadyLuna',
    avatarId: 'artist',
  });
  assert.equal(r1.ok, true);
  if (!r1.ok) return;
  assert.equal(r1.alreadyExists, false);
  assert.equal(r1.entry.friendCode, 'CHUNO-FRND-8888');
  assert.equal(r1.entry.nickname, 'LadyLuna');
  assert.equal(r1.entry.avatarId, 'artist');
  assert.equal(r1.entry.matchesTogether, 0);
  assert.equal(isFriend(r1.profile, 'CHUNO-FRND-8888'), true);

  // Duplicate protection updates nickname/avatar without duplicating entry
  const rDup = addFriend(r1.profile, {
    friendCode: 'CHUNO-FRND-8888',
    nickname: 'LunaPro',
    avatarId: 'tactician',
  });
  assert.equal(rDup.ok, true);
  if (!rDup.ok) return;
  assert.equal(rDup.alreadyExists, true);
  assert.equal(rDup.profile.friends?.length, 1);
  assert.equal(rDup.profile.friends?.[0].nickname, 'LunaPro');
  assert.equal(rDup.profile.friends?.[0].avatarId, 'tactician');

  // Re-meeting friend in match updates skin/nick and increments matchesTogether
  const synced = syncFriendMatchPresence(
    rDup.profile,
    { friendCode: 'CHUNO-FRND-8888', nickname: 'LunaGrand', avatarId: 'grandmaster' },
    true,
  );
  assert.equal(synced.friends?.[0].nickname, 'LunaGrand');
  assert.equal(synced.friends?.[0].avatarId, 'grandmaster');
  assert.equal(synced.friends?.[0].matchesTogether, 1);

  // Remove friend cleanly
  const removed = removeFriend(synced, 'CHUNO-FRND-8888');
  assert.equal(removed.friends?.length, 0);
  assert.equal(isFriend(removed, 'CHUNO-FRND-8888'), false);

  // Legacy v3 profile with old { id, displayName } friend migrates losslessly to v4
  const migrated = normalizeAndMigrateProfile({
    schemaVersion: 3,
    playerId: 'CHUNO-V003-USER',
    nickname: 'VeteranOne',
    avatarId: 'veteran',
    score: 3200,
    unlockedAchievements: { first_win: '2026-11-20T00:00:00Z' },
    friends: [{ id: 'CHUNO-OLD1-2222', displayName: 'OldPal', addedAt: '2026-11-21T00:00:00Z' }],
  });
  assert.equal(migrated.profile.schemaVersion, 4);
  assert.equal(migrated.profile.score, 3200);
  assert.ok(migrated.profile.unlockedAchievements.first_win);
  assert.equal(migrated.profile.friends?.length, 1);
  assert.equal(migrated.profile.friends?.[0].friendCode, 'CHUNO-OLD1-2222');
  assert.equal(migrated.profile.friends?.[0].nickname, 'OldPal');
});

test('Online HUD & CRT monitor never show Dealer for real opponent, and public rooms format cleanly in EN/RU/UZ', async () => {
  const { resolveHudOpponentHpLabel } = await import('../components/GameHud');
  const { formatCrtOpponentLabel } = await import('../presentation/proceduralAssets');
  const { formatPublicRoomModeBadge } = await import('./onlineClient');

  // Online match uses real opponent nickname (never Dealer)
  assert.equal(resolveHudOpponentHpLabel('LadyLuna', 'Dealer'), 'LadyLuna');
  assert.notEqual(resolveHudOpponentHpLabel('HostKing', 'Дилер'), 'Дилер');
  // Solo match falls back to Dealer
  assert.equal(resolveHudOpponentHpLabel(null, 'Dealer'), 'Dealer');

  // CRT monitor formats short & long opponent nicknames cleanly
  assert.equal(formatCrtOpponentLabel('HostKing'), 'HOSTKING');
  assert.equal(formatCrtOpponentLabel('VeryLongPlayerNickname'), 'VERYLONG…');
  assert.equal(formatCrtOpponentLabel(null), 'DEALER');

  // Open rooms list badge formatting across EN / RU / UZ
  assert.equal(formatPublicRoomModeBadge({ mode: 'classic', startingHp: 3 }, 'en'), 'Classic');
  assert.equal(formatPublicRoomModeBadge({ mode: 'classic', startingHp: 3 }, 'ru'), 'Классический');
  assert.equal(formatPublicRoomModeBadge({ mode: 'classic', startingHp: 3 }, 'uz'), 'Klassik');
  assert.equal(formatPublicRoomModeBadge({ mode: 'survival', startingHp: 2 }, 'en'), 'Survival · 2 HP');
  assert.equal(formatPublicRoomModeBadge({ mode: 'survival', startingHp: 2 }, 'ru'), 'Выживание · 2 HP');
  assert.equal(formatPublicRoomModeBadge({ mode: 'survival', startingHp: 1 }, 'uz'), 'Omon qolish · 1 HP');
});

test('Emotes registry: 10 animated WebP assets on disk, 6 localized quick phrases, cooldown math, and opponent Mute filter', async () => {
  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const {
    ANIMATED_EMOTES,
    QUICK_PHRASES,
    ALL_EMOTES,
    CLIENT_EMOTE_COOLDOWN_MS,
    isValidEmoteId,
    getEmoteLabel,
    canSendEmote,
    getEmoteCooldownRatio,
    shouldShowIncomingEmote,
    getEmoteUiCopy,
  } = await import('../data/emotes');

  assert.equal(ANIMATED_EMOTES.length, 10);
  assert.equal(QUICK_PHRASES.length, 6);
  assert.equal(ALL_EMOTES.length, 16);

  // Every animated emote has unique ID, localized EN/RU/UZ labels, and an existing WebP asset in public/emotes/
  const ids = new Set<string>();
  for (const em of ANIMATED_EMOTES) {
    assert.equal(ids.has(em.id), false, `Duplicate emote ID: ${em.id}`);
    ids.add(em.id);
    assert.equal(isValidEmoteId(em.id), true);
    assert.ok(getEmoteLabel(em.id, 'en').length > 0);
    assert.ok(getEmoteLabel(em.id, 'ru').length > 0);
    assert.ok(getEmoteLabel(em.id, 'uz').length > 0);
    const rel = em.src.replace(/^\.\//, '');
    assert.equal(
      existsSync(resolve(process.cwd(), 'public', rel)),
      true,
      `Missing animated WebP asset: public/${rel}`,
    );
  }

  for (const ph of QUICK_PHRASES) {
    assert.equal(isValidEmoteId(ph.id), true);
    assert.ok(getEmoteLabel(ph.id, 'en').length > 0);
    assert.ok(getEmoteLabel(ph.id, 'ru').length > 0);
    assert.ok(getEmoteLabel(ph.id, 'uz').length > 0);
  }
  assert.equal(isValidEmoteId('invalid_emote'), false);

  // Client 2.5s cooldown & smooth ratio progression
  assert.equal(canSendEmote(0, 10_000), true);
  assert.equal(canSendEmote(10_000, 11_000), false);
  assert.equal(canSendEmote(10_000, 10_000 + CLIENT_EMOTE_COOLDOWN_MS), true);
  assert.equal(getEmoteCooldownRatio(10_000, 10_000), 1);
  assert.ok(Math.abs(getEmoteCooldownRatio(10_000, 10_000 + CLIENT_EMOTE_COOLDOWN_MS / 2) - 0.5) < 0.01);
  assert.equal(getEmoteCooldownRatio(10_000, 10_000 + CLIENT_EMOTE_COOLDOWN_MS), 0);

  // Mute opponent emotes hides incoming opponent emotes while keeping player's own emotes visible
  assert.equal(shouldShowIncomingEmote('opponent', false), true);
  assert.equal(shouldShowIncomingEmote('opponent', true), false);
  assert.equal(shouldShowIncomingEmote('player', true), true);

  // UI copy localized across EN / RU / UZ
  for (const lang of ['en', 'ru', 'uz'] as const) {
    const copy = getEmoteUiCopy(lang);
    assert.ok(copy.buttonTitle.length > 0);
    assert.ok(copy.muteOpponent.length > 0);
  }
});

test('Runtime policy: Tauri always allows online, browser blocks online by default, DEV unlocks only with ?devOnline=1', async () => {
  const {
    evaluateOnlineFeaturesEnabled,
    getDesktopDownloadPageUrl,
    isDevOnlineQueryActive,
  } = await import('./runtimePolicy');

  // Tauri desktop ALWAYS enables online (regardless of prod/dev or query params)
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: true, isDev: false, search: '' }), true);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: true, isDev: true, search: '' }), true);

  // Production Web (!isTauri && !isDev) ALWAYS disables online — even if ?devOnline=1 is passed!
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: false, search: '' }), false);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: false, search: '?devOnline=1' }), false);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: false, search: '?room=CH-1234' }), false);

  // Local browser DEV disables online by DEFAULT (matches real web build),
  // and unlocks ONLY when ?devOnline=1 (or ?devOnline=true) is explicitly passed
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: true, search: '' }), false);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: true, search: '?room=CH-1234' }), false);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: true, search: '?devOnline=0' }), false);
  assert.equal(evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: true, search: '?devOnline=1' }), true);
  assert.equal(
    evaluateOnlineFeaturesEnabled({ isTauri: false, isDev: true, search: '?devOnline=1&room=CH-1234' }),
    true,
  );
  assert.equal(isDevOnlineQueryActive('?devOnline=true'), true);
  assert.equal(isDevOnlineQueryActive('?devOnline=0'), false);

  // Download page URL localization
  assert.equal(getDesktopDownloadPageUrl('en'), 'https://buro-ecosystem-web.pages.dev/en/chuno');
  assert.equal(getDesktopDownloadPageUrl('ru'), 'https://buro-ecosystem-web.pages.dev/ru/chuno');
  assert.equal(getDesktopDownloadPageUrl('uz'), 'https://buro-ecosystem-web.pages.dev/uz/chuno');
});

test('Social client resolveOpponentRelation distinguishes friend, incoming, outgoing, and none cleanly', async () => {
  const { resolveOpponentRelation } = await import('./socialClient');

  const snapshot = {
    friends: [
      { friendCode: 'CHUNO-FRND-0001', nickname: 'Alice', avatarId: 'strategist', since: 1000 },
    ],
    incomingRequests: [
      {
        fromCode: 'CHUNO-INCM-0002',
        fromNickname: 'Bob',
        fromAvatarId: 'wanderer',
        toCode: 'CHUNO-SELF-9999',
        toNickname: 'Me',
        toAvatarId: 'tactician',
        createdAt: 2000,
      },
    ],
    outgoingRequests: [
      {
        fromCode: 'CHUNO-SELF-9999',
        fromNickname: 'Me',
        fromAvatarId: 'tactician',
        toCode: 'CHUNO-OUTG-0003',
        toNickname: 'Clara',
        toAvatarId: 'artist',
        createdAt: 3000,
      },
    ],
  };

  assert.equal(resolveOpponentRelation('chuno-frnd-0001', snapshot), 'friend');
  assert.equal(resolveOpponentRelation('CHUNO-INCM-0002', snapshot), 'incoming');
  assert.equal(resolveOpponentRelation('CHUNO-OUTG-0003', snapshot), 'outgoing');
  assert.equal(resolveOpponentRelation('CHUNO-NONE-0004', snapshot), 'none');
  assert.equal(resolveOpponentRelation(null, snapshot), 'none');
});

test('All 10 animated WebP emotes run at 2x speed (~1.0s cycle, min frame >= 22ms) with valid RIFF/ANIM headers', async () => {
  const { readFileSync, statSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { ANIMATED_EMOTES } = await import('../data/emotes');

  for (const em of ANIMATED_EMOTES) {
    const rel = em.src.replace(/^\.\//, '');
    const p = resolve(process.cwd(), 'public', rel);
    const stat = statSync(p);
    assert.ok(stat.size > 100_000 && stat.size < 1_200_000, `Unexpected size for ${rel}: ${stat.size}`);
    const buf = readFileSync(p);
    assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(buf.subarray(0, 64).toString('ascii').includes('ANIM'), `Missing ANIM chunk in ${rel}`);

    // Parse ANMF chunk delays
    const delays: number[] = [];
    let pos = 12;
    while (pos + 8 <= buf.length) {
      const fourcc = buf.subarray(pos, pos + 4).toString('ascii');
      const size = buf.readUInt32LE(pos + 4);
      const start = pos + 8;
      if (fourcc === 'ANMF' && size >= 16) {
        const dur = buf[start + 12] | (buf[start + 13] << 8) | (buf[start + 14] << 16);
        delays.push(dur);
      }
      pos = start + size + (size & 1);
    }
    const totalMs = delays.reduce((a, b) => a + b, 0);
    const minDelay = Math.min(...delays);
    assert.ok(delays.length >= 10, `Too few frames in ${rel}: ${delays.length}`);
    assert.ok(minDelay >= 22, `Frame delay < 22ms in ${rel}: ${minDelay}ms (browsers clamp <20ms)`);
    assert.ok(totalMs >= 900 && totalMs <= 1150, `Cycle duration outside ~1.0s in ${rel}: ${totalMs}ms`);
  }
});

test('Free music track switcher: Auto vs manual track selection, cycling, and lossless profile persistence', async () => {
  const {
    MUSIC_TRACK_CATALOG,
    MUSIC_PREFERENCE_ORDER,
    getMusicTrackLabel,
    getNextMusicTrackPreference,
    resolveMusicFolderForPreference,
  } = await import('../audio/musicManager');
  const { normalizeAndMigrateProfile } = await import('./profileManager');

  assert.equal(MUSIC_TRACK_CATALOG.length, 4);
  assert.equal(MUSIC_PREFERENCE_ORDER.length, 5);

  // Auto follows mode folder; manual override sticks to selected track folder
  assert.equal(resolveMusicFolderForPreference('auto', 'friendly_background'), 'friendly_background');
  assert.equal(resolveMusicFolderForPreference('auto', 'survival'), 'survival');
  assert.equal(resolveMusicFolderForPreference('midnight', 'friendly_background'), 'unknown');
  assert.equal(resolveMusicFolderForPreference('iron_girders', 'friendly'), 'survival');
  assert.equal(resolveMusicFolderForPreference('sunlight', 'survival'), 'friendly');
  assert.equal(resolveMusicFolderForPreference('meadow', 'survival'), 'friendly_background');

  // Cycling wraps cleanly forward and backward
  let cur: (typeof MUSIC_PREFERENCE_ORDER)[number] = 'auto';
  for (let i = 0; i < MUSIC_PREFERENCE_ORDER.length; i++) {
    cur = getNextMusicTrackPreference(cur, 1);
  }
  assert.equal(cur, 'auto');
  assert.equal(getNextMusicTrackPreference('auto', -1), 'midnight');

  // Localized labels in EN/RU/UZ
  for (const pref of MUSIC_PREFERENCE_ORDER) {
    assert.ok(getMusicTrackLabel(pref, 'en').length > 0);
    assert.ok(getMusicTrackLabel(pref, 'ru').length > 0);
    assert.ok(getMusicTrackLabel(pref, 'uz').length > 0);
  }

  // Persists musicTrackPreference cleanly without resetting achievements or friends
  const { profile } = normalizeAndMigrateProfile({
    schemaVersion: 4,
    playerId: 'CHUNO-MUS1-2222',
    nickname: 'DJKing',
    score: 2400,
    unlockedAchievements: { first_win: '2026-11-25T00:00:00Z' },
    friends: [{ friendCode: 'CHUNO-PAL1-3333', nickname: 'Pal', avatarId: 'artist', addedAt: '2026-11-25T00:00:00Z', matchesTogether: 2 }],
    settings: {
      musicTrackPreference: 'midnight',
      audioDefaultsVersion: 4,
    },
  });
  assert.equal(profile.settings.musicTrackPreference, 'midnight');
  assert.ok(profile.unlockedAchievements.first_win);
  assert.equal(profile.friends?.length, 1);
});

test('Game invite 20s countdown helpers and friend presence sorting work accurately', async () => {
  const {
    INVITE_DURATION_MS,
    getInviteProgressRatio,
    getInviteRemainingSeconds,
    sortFriendsByPresence,
  } = await import('./socialClient');

  assert.equal(INVITE_DURATION_MS, 20_000);
  const now = 1_000_000;
  const expiresAt = now + 20_000;
  assert.equal(getInviteRemainingSeconds(expiresAt, now), 20);
  assert.equal(getInviteRemainingSeconds(expiresAt, now + 10_000), 10);
  assert.equal(getInviteRemainingSeconds(expiresAt, now + 20_001), 0);
  assert.ok(Math.abs(getInviteProgressRatio(expiresAt, now + 5_000) - 0.75) < 0.001);
  assert.equal(getInviteProgressRatio(expiresAt, now + 25_000), 0);

  const sorted = sortFriendsByPresence([
    { friendCode: 'CHUNO-OFF1-0001', nickname: 'Off', avatarId: 'strategist', since: 300, presenceStatus: 'offline' },
    { friendCode: 'CHUNO-BSY1-0002', nickname: 'Busy', avatarId: 'strategist', since: 200, presenceStatus: 'in_match' },
    { friendCode: 'CHUNO-ONL1-0003', nickname: 'Online', avatarId: 'strategist', since: 100, presenceStatus: 'online' },
  ]);
  assert.deepEqual(
    sorted.map((f) => f.friendCode),
    ['CHUNO-ONL1-0003', 'CHUNO-BSY1-0002', 'CHUNO-OFF1-0001'],
  );
});

test('Dealer bundled RU/EN voice clips resolve accurately, verify OggS files on disk, and avoid 404 on missing EN line', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    VOICE_REGISTRY,
    DEALER_VOICE_IDS_RU,
    DEALER_VOICE_IDS_EN,
    resolveBundledVoicePath,
    getDialogueLine,
  } = await import('../data/voiceRegistry');

  const dealerEntries = VOICE_REGISTRY.filter((e) => e.speaker === 'dealer');
  assert.equal(dealerEntries.length, 29);
  assert.equal(DEALER_VOICE_IDS_RU.size, 29);
  assert.equal(DEALER_VOICE_IDS_EN.size, 28);

  const publicRoot = path.resolve(process.cwd(), 'public');

  // Every RU Dealer clip resolves and exists as a valid Ogg file
  for (const entry of dealerEntries) {
    const ruRel = resolveBundledVoicePath(entry.id, 'ru');
    assert.equal(ruRel, `./audio/voices/ru/dealer/${entry.id}.ogg`);
    const ruDisk = path.join(publicRoot, ruRel!.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(ruDisk), `Missing RU Dealer voice file: ${ruDisk}`);
    const magic = fs.readFileSync(ruDisk).subarray(0, 4).toString('ascii');
    assert.equal(magic, 'OggS', `Invalid Ogg magic bytes in ${ruDisk}`);
  }

  // EN & UZ map to en/dealer (28 files) and cleanly return null for the unrecorded dealer_match_start_01
  assert.equal(resolveBundledVoicePath('dealer_match_start_01', 'en'), null);
  assert.equal(resolveBundledVoicePath('dealer_match_start_01', 'uz'), null);
  for (const id of DEALER_VOICE_IDS_EN) {
    const enRel = resolveBundledVoicePath(id, 'en');
    const uzRel = resolveBundledVoicePath(id, 'uz');
    assert.equal(enRel, `./audio/voices/en/dealer/${id}.ogg`);
    assert.equal(uzRel, enRel);
    const enDisk = path.join(publicRoot, enRel!.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(enDisk), `Missing EN Dealer voice file: ${enDisk}`);
    const magic = fs.readFileSync(enDisk).subarray(0, 4).toString('ascii');
    assert.equal(magic, 'OggS', `Invalid Ogg magic bytes in ${enDisk}`);
  }

  // Non-Dealer entries cleanly return null (fallback path, zero 404s)
  assert.equal(resolveBundledVoicePath('ent_match_start_01', 'en'), null);
  assert.equal(resolveBundledVoicePath('ent_match_start_01', 'ru'), null);

  // On EN match_start, getDialogueLine prefers the voiced clip (dealer_match_start_02)
  const enStartLine = getDialogueLine('dealer', 'match_start', 'en');
  assert.ok(enStartLine);
  assert.equal(enStartLine.id, 'dealer_match_start_02');

  // Bundled voice gain curve gives crisp, clearly audible output at default 60% slider (> 0.5)
  const { computeEffectiveBundledVoiceVolume } = await import('../data/voiceRegistry');
  assert.equal(computeEffectiveBundledVoiceVolume(0), 0);
  assert.ok(computeEffectiveBundledVoiceVolume(0.6) >= 0.6 && computeEffectiveBundledVoiceVolume(0.6) <= 0.72);
  assert.equal(computeEffectiveBundledVoiceVolume(1), 1);
});

test('Offline Check + Skip rule cancels Skip so player or AI in check redraws without losing turn (plus all-Skip fallback)', async () => {
  const { getTranslations } = await import('./localization');
  // Localized Check+Skip notifications exist in EN, RU, and UZ
  assert.ok(getTranslations('en').checkSkipRedraw.length > 5);
  assert.ok(getTranslations('ru').checkSkipRedraw.length > 5);
  assert.ok(getTranslations('uz').checkSkipRedraw.length > 5);

  // Case 1: Player (White) in check draws SKIP -> discarded, stays player AWAIT_DRAW_CARD, next draw NUM_1 works
  const m1 = new MatchEngine({ mode: 'survival', difficulty: 'medium', personality: 'calm', rng: () => 0.5 });
  m1.board.squares.fill(null);
  m1.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  m1.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  m1.board.squares[toSq(7, 4)] = { id: 2, type: 'rook', color: 'black', hasMoved: true };
  m1.board.squares[toSq(7, 0)] = { id: 3, type: 'king', color: 'black', hasMoved: true };
  m1.activeActor = 'player';
  m1.deck.drawPile = ['NUM_1', 'SKIP'];
  m1.deck.discardPile = [];

  const ev1 = m1.drawCard();
  assert.equal(ev1.length, 1);
  assert.equal(ev1[0].type, 'CARD_DRAWN');
  if (ev1[0].type === 'CARD_DRAWN') {
    assert.equal(ev1[0].card, 'SKIP');
    assert.equal(ev1[0].redrawReason, 'check_skip');
  }
  assert.equal(m1.activeActor, 'player');
  assert.equal(m1.phase, 'AWAIT_DRAW_CARD');

  const ev2 = m1.drawCard();
  assert.equal(ev2[0].type, 'CARD_DRAWN');
  assert.equal(m1.activeActor, 'player');
  assert.equal(m1.phase, 'PLAYER_MOVE_LOOP');
  assert.equal(m1.movesLeft, 1);

  // Case 2: Opponent (AI Black) in check draws SKIP -> stays opponent AWAIT_DRAW_CARD for automatic redraw
  const m2 = new MatchEngine({ mode: 'light', difficulty: 'medium', personality: 'calm', rng: () => 0.5 });
  m2.board.squares.fill(null);
  m2.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  m2.board.squares[toSq(7, 4)] = { id: 1, type: 'king', color: 'black', hasMoved: true };
  m2.board.squares[toSq(0, 4)] = { id: 2, type: 'rook', color: 'white', hasMoved: true };
  m2.board.squares[toSq(0, 0)] = { id: 3, type: 'king', color: 'white', hasMoved: true };
  m2.activeActor = 'opponent';
  m2.deck.drawPile = ['NUM_2', 'SKIP'];
  m2.deck.discardPile = [];

  const aiEv = m2.drawCard();
  assert.equal(aiEv[0].type, 'CARD_DRAWN');
  if (aiEv[0].type === 'CARD_DRAWN') {
    assert.equal(aiEv[0].redrawReason, 'check_skip');
  }
  assert.equal(m2.activeActor, 'opponent');
  assert.equal(m2.phase, 'AWAIT_DRAW_CARD');

  // Case 3: Infinite-loop safeguard when only SKIP cards exist -> converts to 1 move
  const m3 = new MatchEngine({ mode: 'survival', difficulty: 'hard', personality: 'calm', rng: () => 0.5 });
  m3.board.squares.fill(null);
  m3.board.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  m3.board.squares[toSq(0, 4)] = { id: 1, type: 'king', color: 'white', hasMoved: true };
  m3.board.squares[toSq(7, 4)] = { id: 2, type: 'rook', color: 'black', hasMoved: true };
  m3.board.squares[toSq(7, 0)] = { id: 3, type: 'king', color: 'black', hasMoved: true };
  m3.activeActor = 'player';
  m3.deck.drawPile = ['SKIP'];
  m3.deck.discardPile = ['SKIP'];

  const fbEv = m3.drawCard();
  assert.equal(fbEv[0].type, 'CARD_DRAWN');
  if (fbEv[0].type === 'CARD_DRAWN') {
    assert.equal(fbEv[0].convertedFromCheckSkip, true);
  }
  assert.equal(m3.phase, 'PLAYER_MOVE_LOOP');
  assert.equal(m3.movesLeft, 1);
});

test('Online coin flip camera holds full 4.35s+7.4s choreography and logo double-click never closes game', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { resolveOnlineAutoCamera } = await import('./onlineCamera');

  // Coin flip camera timings cover the full 4.35s coin flight (+ 2.9s revolver shot)
  const survivedCam = resolveOnlineAutoCamera({
    prevPhase: 'AWAIT_COIN_CHOICE',
    prevActiveSeat: 'host',
    nextPhase: 'AWAIT_DRAW_CARD',
    nextActiveSeat: 'guest',
    yourSeat: 'host',
    events: [{ type: 'COIN_RESOLVED', drawer: 'host', guesser: 'guest', actual: 'heads', guessed: 'heads', guessedRight: true }],
  });
  assert.equal(survivedCam.immediatePreset, 'CAM_COIN_FLIP');
  assert.equal(survivedCam.delayMs, 4950);

  const shotCam = resolveOnlineAutoCamera({
    prevPhase: 'AWAIT_COIN_CHOICE',
    prevActiveSeat: 'host',
    nextPhase: 'AWAIT_DRAW_CARD',
    nextActiveSeat: 'guest',
    yourSeat: 'host',
    events: [{ type: 'COIN_RESOLVED', drawer: 'host', guesser: 'guest', actual: 'tails', guessed: 'heads', guessedRight: false }],
  });
  assert.equal(shotCam.immediatePreset, 'CAM_COIN_FLIP');
  assert.equal(shotCam.delayMs, 7400);

  // Title logo is inert (pointer-events-none, no onClick/onDoubleClick) and Tauri Windows guard blocks HTSYSMENU dblclick
  const titleSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TitleScreen.tsx'), 'utf8');
  assert.match(titleSrc, /data-testid="title-brand-logo"[\s\S]{0,120}pointer-events-none/);
  const hudSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/GameHud.tsx'), 'utf8');
  assert.equal(/onDoubleClick/i.test(hudSrc), false);
  const tauriLib = fs.readFileSync(path.resolve(process.cwd(), 'src-tauri/src/lib.rs'), 'utf8');
  assert.match(tauriLib, /WM_NCLBUTTONDBLCLK/);
  assert.match(tauriLib, /HTSYSMENU/);
});

test('Active online session persistence (chuno_active_online_session), 2-min TTL expiry, reconnect backoff, and countdown helpers', async () => {
  const {
    ACTIVE_ONLINE_SESSION_KEY,
    ACTIVE_ONLINE_SESSION_MAX_AGE_MS,
    saveActiveOnlineSession,
    loadActiveOnlineSession,
    clearActiveOnlineSession,
    computeReconnectBackoffMs,
    getReconnectRemainingSeconds,
  } = await import('./onlineClient');
  const { getTranslations } = await import('./localization');

  assert.equal(ACTIVE_ONLINE_SESSION_KEY, 'chuno_active_online_session');
  assert.equal(ACTIVE_ONLINE_SESSION_MAX_AGE_MS, 120_000);

  // In-memory Storage mock
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  const t0 = 1_700_000_000_000;
  saveActiveOnlineSession(
    {
      roomCode: 'ch-7k2m',
      playerToken: 'PT-RECON-1234',
      mode: 'survival',
      opponentNickname: 'RivalAce',
      updatedAt: t0,
    },
    mockStorage,
  );

  // Valid within 2-minute window
  const loaded = loadActiveOnlineSession({ storage: mockStorage, now: t0 + 45_000 });
  assert.ok(loaded);
  assert.equal(loaded.roomCode, 'CH-7K2M');
  assert.equal(loaded.playerToken, 'PT-RECON-1234');
  assert.equal(loaded.mode, 'survival');
  assert.equal(loaded.opponentNickname, 'RivalAce');

  // Expired after 2 minutes -> automatically removed and returns null
  const expired = loadActiveOnlineSession({ storage: mockStorage, now: t0 + 120_001 });
  assert.equal(expired, null);
  assert.equal(store.has(ACTIVE_ONLINE_SESSION_KEY), false);

  // Explicit clear removes saved session immediately (e.g. on resign / gameover)
  saveActiveOnlineSession(
    { roomCode: 'CH-9999', playerToken: 'PT-CLR-9999', mode: 'classic', opponentNickname: 'Bob', updatedAt: t0 },
    mockStorage,
  );
  assert.equal(store.has(ACTIVE_ONLINE_SESSION_KEY), true);
  clearActiveOnlineSession(mockStorage);
  assert.equal(store.has(ACTIVE_ONLINE_SESSION_KEY), false);

  // Exponential backoff: 1s -> 2s -> 4s (capped at 4s)
  assert.equal(computeReconnectBackoffMs(1), 1000);
  assert.equal(computeReconnectBackoffMs(2), 2000);
  assert.equal(computeReconnectBackoffMs(3), 4000);
  assert.equal(computeReconnectBackoffMs(5), 4000);

  // Countdown helper with server clock offset
  const deadline = t0 + 90_000;
  assert.equal(getReconnectRemainingSeconds(deadline, 0, t0), 90);
  assert.equal(getReconnectRemainingSeconds(deadline, 5_000, t0 + 10_000), 75);
  assert.equal(getReconnectRemainingSeconds(deadline, 0, t0 + 95_000), 0);

  // Localized reconnect strings in EN / RU / UZ
  for (const lang of ['en', 'ru', 'uz'] as const) {
    const t = getTranslations(lang);
    assert.ok(t.onlineReconnectBannerBtn.length > 3);
    assert.ok(t.onlineOpponentDisconnectedBanner.length > 5);
    assert.ok(t.onlineOpponentReconnectedNotice.length > 5);
    assert.ok(t.onlineReconnectingOverlay.length > 5);
  }
});
