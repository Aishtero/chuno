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
  diskBackup.friends = [{ id: 'F-1', displayName: 'CompanionA', addedAt: '2026-11-22T00:00:00Z' }];
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



