export interface GodotScriptFile {
  path: string;
  stage: 'Stage 1 — Core' | 'Stage 2 — 3D Scene';
  content: string;
}

export const GODOT_SCRIPTS: GodotScriptFile[] = [
  {
    path: 'res://core/deck/card_data.gd',
    stage: 'Stage 1 — Core',
    content: `class_name CardData
extends RefCounted

enum CardType {
\tNUM_1,
\tNUM_2,
\tNUM_3,
\tNUM_4,
\tNUM_5,
\tSKIP,
\tREVERSE,
\tPLUS_2,
\tPLUS_4,
\tWILD,
\tBULLET,
}

enum GameMode {
\tLIGHT,
\tSURVIVAL,
}

enum Difficulty {
\tEASY,
\tMEDIUM,
\tHARD,
}

static func get_move_count(card: CardType) -> int:
\tmatch card:
\t\tCardType.NUM_1: return 1
\t\tCardType.NUM_2: return 2
\t\tCardType.NUM_3: return 3
\t\tCardType.NUM_4: return 4
\t\tCardType.NUM_5: return 5
\t\t_: return 0

static func get_deck_counts(mode: GameMode, diff: Difficulty) -> Dictionary:
\tif mode == GameMode.LIGHT:
\t\treturn {
\t\t\tCardType.NUM_1: 8, CardType.NUM_2: 8, CardType.NUM_3: 6,
\t\t\tCardType.NUM_4: 4, CardType.NUM_5: 2, CardType.SKIP: 3,
\t\t\tCardType.REVERSE: 3, CardType.PLUS_2: 3, CardType.PLUS_4: 1,
\t\t\tCardType.WILD: 2, CardType.BULLET: 0,
\t\t}
\tif diff == Difficulty.HARD:
\t\treturn {
\t\t\tCardType.NUM_1: 9, CardType.NUM_2: 9, CardType.NUM_3: 6,
\t\t\tCardType.NUM_4: 4, CardType.NUM_5: 2, CardType.SKIP: 3,
\t\t\tCardType.REVERSE: 0, CardType.PLUS_2: 2, CardType.PLUS_4: 1,
\t\t\tCardType.WILD: 2, CardType.BULLET: 2,
\t\t}
\treturn {
\t\tCardType.NUM_1: 8, CardType.NUM_2: 8, CardType.NUM_3: 6,
\t\tCardType.NUM_4: 4, CardType.NUM_5: 2, CardType.SKIP: 3,
\t\tCardType.REVERSE: 2, CardType.PLUS_2: 2, CardType.PLUS_4: 1,
\t\tCardType.WILD: 2, CardType.BULLET: 2,
\t}
`,
  },
  {
    path: 'res://core/deck/deck_manager.gd',
    stage: 'Stage 1 — Core',
    content: `class_name DeckManager
extends RefCounted

var draw_pile: Array[int] = []
var discard_pile: Array[int] = []
var _rng := RandomNumberGenerator.new()

func _init(mode: CardData.GameMode, diff: CardData.Difficulty, seed_val: int = 0) -> void:
\tif seed_val != 0:
\t\t_rng.seed = seed_val
\telse:
\t\t_rng.randomize()
\tbuild_deck(mode, diff)

func build_deck(mode: CardData.GameMode, diff: CardData.Difficulty) -> void:
\tdraw_pile.clear()
\tdiscard_pile.clear()
\tvar counts: Dictionary = CardData.get_deck_counts(mode, diff)
\tfor card_type: int in counts.keys():
\t\tvar amount: int = counts[card_type]
\t\tfor i: int in range(amount):
\t\t\tdraw_pile.append(card_type)
\t_shuffle(draw_pile)

func _shuffle(arr: Array[int]) -> void:
\tfor i: int in range(arr.size() - 1, 0, -1):
\t\tvar j: int = _rng.randi_range(0, i)
\t\tvar tmp: int = arr[i]
\t\tarr[i] = arr[j]
\t\tarr[j] = tmp

func draw_card(half_turn_index: int) -> Dictionary:
\tvar reshuffled: bool = false
\tif draw_pile.is_empty():
\t\treshuffle_discard()
\t\treshuffled = true
\tvar card: int = draw_pile.pop_back()
\tif half_turn_index < 6 and card == CardData.CardType.BULLET:
\t\tvar insert_idx: int = maxi(0, int(draw_pile.size() * 0.35))
\t\tdraw_pile.insert(insert_idx, CardData.CardType.BULLET)
\t\tvar safety: int = 0
\t\tcard = draw_pile.pop_back()
\t\twhile card == CardData.CardType.BULLET and safety < 5 and not draw_pile.is_empty():
\t\t\tdraw_pile.push_front(CardData.CardType.BULLET)
\t\t\tcard = draw_pile.pop_back()
\t\t\tsafety += 1
\tdiscard_pile.append(card)
\treturn {"card": card, "reshuffled": reshuffled}

func reshuffle_discard() -> void:
\tif discard_pile.is_empty():
\t\treturn
\tdraw_pile = discard_pile.duplicate()
\tdiscard_pile.clear()
\t_shuffle(draw_pile)
`,
  },
  {
    path: 'res://core/chess/board_state.gd',
    stage: 'Stage 1 — Core',
    content: `class_name BoardState
extends RefCounted

enum PieceColor { WHITE, BLACK }
enum PieceType { PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING }

class PieceData extends RefCounted:
\tvar id: int
\tvar type: PieceType
\tvar color: PieceColor
\tvar has_moved: bool
\tfunc _init(p_id: int, p_type: PieceType, p_color: PieceColor, p_moved: bool = false) -> void:
\t\tid = p_id
\t\ttype = p_type
\t\tcolor = p_color
\t\thas_moved = p_moved
\tfunc duplicate_piece() -> PieceData:
\t\treturn PieceData.new(id, type, color, has_moved)

var squares: Array[PieceData] = []
var en_passant_target: int = -1
var castling_wk: bool = true
var castling_wq: bool = true
var castling_bk: bool = true
var castling_bq: bool = true
var graveyard_white: Array[PieceData] = []
var graveyard_black: Array[PieceData] = []
var _next_id: int = 1

func _init() -> void:
\tsquares.resize(64)

static func create_initial() -> BoardState:
\tvar b := BoardState.new()
\tb.setup_initial()
\treturn b

static func opposite(c: PieceColor) -> PieceColor:
\treturn PieceColor.BLACK if c == PieceColor.WHITE else PieceColor.WHITE

static func to_sq(row: int, col: int) -> int:
\treturn row * 8 + col

static func sq_row(sq: int) -> int:
\treturn sq / 8

static func sq_col(sq: int) -> int:
\treturn sq % 8

static func in_bounds(row: int, col: int) -> bool:
\treturn row >= 0 and row < 8 and col >= 0 and col < 8

func setup_initial() -> void:
\tfor i: int in range(64):
\t\tsquares[i] = null
\ten_passant_target = -1
\tcastling_wk = true
\tcastling_wq = true
\tcastling_bk = true
\tcastling_bq = true
\tgraveyard_white.clear()
\tgraveyard_black.clear()
\t_next_id = 1
\tvar back: Array[PieceType] = [
\t\tPieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
\t\tPieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
\t]
\tfor c: int in range(8):
\t\tsquares[to_sq(0, c)] = _make_piece(back[c], PieceColor.WHITE)
\t\tsquares[to_sq(1, c)] = _make_piece(PieceType.PAWN, PieceColor.WHITE)
\t\tsquares[to_sq(6, c)] = _make_piece(PieceType.PAWN, PieceColor.BLACK)
\t\tsquares[to_sq(7, c)] = _make_piece(back[c], PieceColor.BLACK)

func _make_piece(p_type: PieceType, p_color: PieceColor) -> PieceData:
\tvar p := PieceData.new(_next_id, p_type, p_color, false)
\t_next_id += 1
\treturn p

func duplicate_state() -> BoardState:
\tvar copy := BoardState.new()
\tfor i: int in range(64):
\t\tcopy.squares[i] = squares[i].duplicate_piece() if squares[i] != null else null
\tcopy.en_passant_target = en_passant_target
\tcopy.castling_wk = castling_wk
\tcopy.castling_wq = castling_wq
\tcopy.castling_bk = castling_bk
\tcopy.castling_bq = castling_bq
\tfor p: PieceData in graveyard_white:
\t\tcopy.graveyard_white.append(p.duplicate_piece())
\tfor p: PieceData in graveyard_black:
\t\tcopy.graveyard_black.append(p.duplicate_piece())
\tcopy._next_id = _next_id
\treturn copy

func find_king(c: PieceColor) -> int:
\tfor i: int in range(64):
\t\tvar p: PieceData = squares[i]
\t\tif p != null and p.color == c and p.type == PieceType.KING:
\t\t\treturn i
\treturn -1

func is_in_check(c: PieceColor) -> bool:
\tvar ksq: int = find_king(c)
\tif ksq == -1:
\t\treturn false
\treturn is_square_attacked(ksq, opposite(c))

func is_square_attacked(sq: int, by_color: PieceColor) -> bool:
\tvar r: int = sq_row(sq)
\tvar c: int = sq_col(sq)
\tvar pawn_dir: int = -1 if by_color == PieceColor.WHITE else 1
\tfor dc: int in [-1, 1]:
\t\tvar pr: int = r + pawn_dir
\t\tvar pc: int = c + dc
\t\tif in_bounds(pr, pc):
\t\t\tvar p: PieceData = squares[to_sq(pr, pc)]
\t\t\tif p != null and p.color == by_color and p.type == PieceType.PAWN:
\t\t\t\treturn true
\tconst KNIGHT_OFFSETS: Array[Vector2i] = [
\t\tVector2i(-2, -1), Vector2i(-2, 1), Vector2i(-1, -2), Vector2i(-1, 2),
\t\tVector2i(1, -2), Vector2i(1, 2), Vector2i(2, -1), Vector2i(2, 1)
\t]
\tfor off: Vector2i in KNIGHT_OFFSETS:
\t\tvar nr: int = r + off.x
\t\tvar nc: int = c + off.y
\t\tif in_bounds(nr, nc):
\t\t\tvar p: PieceData = squares[to_sq(nr, nc)]
\t\t\tif p != null and p.color == by_color and p.type == PieceType.KNIGHT:
\t\t\t\treturn true
\tfor dr: int in range(-1, 2):
\t\tfor dc: int in range(-1, 2):
\t\t\tif dr == 0 and dc == 0:
\t\t\t\tcontinue
\t\t\tvar kr: int = r + dr
\t\t\tvar kc: int = c + dc
\t\t\tif in_bounds(kr, kc):
\t\t\t\tvar p: PieceData = squares[to_sq(kr, kc)]
\t\t\t\tif p != null and p.color == by_color and p.type == PieceType.KING:
\t\t\t\t\treturn true
\tconst ORTHO: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
\tfor dir: Vector2i in ORTHO:
\t\tvar nr: int = r + dir.x
\t\tvar nc: int = c + dir.y
\t\twhile in_bounds(nr, nc):
\t\t\tvar p: PieceData = squares[to_sq(nr, nc)]
\t\t\tif p != null:
\t\t\t\tif p.color == by_color and (p.type == PieceType.ROOK or p.type == PieceType.QUEEN):
\t\t\t\t\treturn true
\t\t\t\tbreak
\t\t\tnr += dir.x
\t\t\tnc += dir.y
\tconst DIAG: Array[Vector2i] = [Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)]
\tfor dir: Vector2i in DIAG:
\t\tvar nr: int = r + dir.x
\t\tvar nc: int = c + dir.y
\t\twhile in_bounds(nr, nc):
\t\t\tvar p: PieceData = squares[to_sq(nr, nc)]
\t\t\tif p != null:
\t\t\t\tif p.color == by_color and (p.type == PieceType.BISHOP or p.type == PieceType.QUEEN):
\t\t\t\t\treturn true
\t\t\t\tbreak
\t\t\tnr += dir.x
\t\t\tnc += dir.y
\treturn false

func apply_move(move: Dictionary) -> PieceData:
\tvar from_sq: int = move["from"]
\tvar to_sq_idx: int = move["to"]
\tvar piece: PieceData = squares[from_sq]
\tvar captured: PieceData = squares[to_sq_idx]
\tif move.get("is_en_passant", false):
\t\tvar dir: int = 1 if piece.color == PieceColor.WHITE else -1
\t\tvar victim_sq: int = to_sq_idx - dir * 8
\t\tcaptured = squares[victim_sq]
\t\tsquares[victim_sq] = null
\tif captured != null:
\t\tif captured.color == PieceColor.WHITE:
\t\t\tgraveyard_white.append(captured.duplicate_piece())
\t\telse:
\t\t\tgraveyard_black.append(captured.duplicate_piece())
\tif piece.type == PieceType.KING:
\t\tif piece.color == PieceColor.WHITE:
\t\t\tcastling_wk = false
\t\t\tcastling_wq = false
\t\telse:
\t\t\tcastling_bk = false
\t\t\tcastling_bq = false
\tif piece.type == PieceType.ROOK:
\t\tif from_sq == to_sq(0, 0): castling_wq = false
\t\tif from_sq == to_sq(0, 7): castling_wk = false
\t\tif from_sq == to_sq(7, 0): castling_bq = false
\t\tif from_sq == to_sq(7, 7): castling_bk = false
\tsquares[from_sq] = null
\tvar moved := piece.duplicate_piece()
\tmoved.has_moved = true
\tif move.has("promotion"):
\t\tmoved.type = move["promotion"]
\tsquares[to_sq_idx] = moved
\tif move.get("is_castle_ks", false):
\t\tvar row: int = sq_row(from_sq)
\t\tvar rk: PieceData = squares[to_sq(row, 7)]
\t\tsquares[to_sq(row, 7)] = null
\t\trk.has_moved = true
\t\tsquares[to_sq(row, 5)] = rk
\telif move.get("is_castle_qs", false):
\t\tvar row: int = sq_row(from_sq)
\t\tvar rk: PieceData = squares[to_sq(row, 0)]
\t\tsquares[to_sq(row, 0)] = null
\t\trk.has_moved = true
\t\tsquares[to_sq(row, 3)] = rk
\ten_passant_target = -1
\tif piece.type == PieceType.PAWN and absi(sq_row(to_sq_idx) - sq_row(from_sq)) == 2:
\t\tvar mid: int = (sq_row(from_sq) + sq_row(to_sq_idx)) / 2
\t\ten_passant_target = to_sq(mid, sq_col(from_sq))
\treturn captured
`,
  },
  {
    path: 'res://core/chess/move_generator.gd',
    stage: 'Stage 1 — Core',
    content: `class_name MoveGenerator
extends RefCounted

static func generate_legal_moves(board: BoardState, color: BoardState.PieceColor) -> Array[Dictionary]:
\tvar legal: Array[Dictionary] = []
\tfor sq: int in range(64):
\t\tvar p: BoardState.PieceData = board.squares[sq]
\t\tif p == null or p.color != color:
\t\t\tcontinue
\t\tfor mv: Dictionary in _generate_pseudo_moves(board, sq):
\t\t\tvar sim: BoardState = board.duplicate_state()
\t\t\tsim.apply_move(mv)
\t\t\tif not sim.is_in_check(color):
\t\t\t\tlegal.append(mv)
\treturn legal

static func is_checkmate(board: BoardState, color: BoardState.PieceColor) -> bool:
\treturn board.is_in_check(color) and generate_legal_moves(board, color).is_empty()

static func is_stalemate(board: BoardState, color: BoardState.PieceColor) -> bool:
\treturn not board.is_in_check(color) and generate_legal_moves(board, color).is_empty()

static func _generate_pseudo_moves(board: BoardState, sq: int) -> Array[Dictionary]:
\tvar moves: Array[Dictionary] = []
\tvar p: BoardState.PieceData = board.squares[sq]
\tif p == null:
\t\treturn moves
\tvar r: int = BoardState.sq_row(sq)
\tvar c: int = BoardState.sq_col(sq)
\tvar enemy: BoardState.PieceColor = BoardState.opposite(p.color)
\tconst PROMOS: Array[int] = [
\t\tBoardState.PieceType.QUEEN, BoardState.PieceType.ROOK,
\t\tBoardState.PieceType.BISHOP, BoardState.PieceType.KNIGHT
\t]
\tif p.type == BoardState.PieceType.PAWN:
\t\tvar dir: int = 1 if p.color == BoardState.PieceColor.WHITE else -1
\t\tvar start_row: int = 1 if p.color == BoardState.PieceColor.WHITE else 6
\t\tvar promo_row: int = 7 if p.color == BoardState.PieceColor.WHITE else 0
\t\tvar r1: int = r + dir
\t\tif BoardState.in_bounds(r1, c) and board.squares[BoardState.to_sq(r1, c)] == null:
\t\t\tvar t1: int = BoardState.to_sq(r1, c)
\t\t\tif r1 == promo_row:
\t\t\t\tfor pr: int in PROMOS:
\t\t\t\t\tmoves.append({"from": sq, "to": t1, "promotion": pr})
\t\t\telse:
\t\t\t\tmoves.append({"from": sq, "to": t1})
\t\t\t\tif r == start_row and board.squares[BoardState.to_sq(r + 2 * dir, c)] == null:
\t\t\t\t\tmoves.append({"from": sq, "to": BoardState.to_sq(r + 2 * dir, c)})
\t\tfor dc: int in [-1, 1]:
\t\t\tvar nc: int = c + dc
\t\t\tif not BoardState.in_bounds(r1, nc):
\t\t\t\tcontinue
\t\t\tvar tc: int = BoardState.to_sq(r1, nc)
\t\t\tvar occ: BoardState.PieceData = board.squares[tc]
\t\t\tif occ != null and occ.color == enemy:
\t\t\t\tif r1 == promo_row:
\t\t\t\t\tfor pr: int in PROMOS:
\t\t\t\t\t\tmoves.append({"from": sq, "to": tc, "promotion": pr})
\t\t\t\telse:
\t\t\t\t\tmoves.append({"from": sq, "to": tc})
\t\t\telif board.en_passant_target == tc:
\t\t\t\tmoves.append({"from": sq, "to": tc, "is_en_passant": true})
\t\treturn moves
\tif p.type == BoardState.PieceType.KNIGHT:
\t\tfor off: Vector2i in [
\t\t\tVector2i(-2,-1), Vector2i(-2,1), Vector2i(-1,-2), Vector2i(-1,2),
\t\t\tVector2i(1,-2), Vector2i(1,2), Vector2i(2,-1), Vector2i(2,1)
\t\t]:
\t\t\tvar nr: int = r + off.x
\t\t\tvar nc: int = c + off.y
\t\t\tif BoardState.in_bounds(nr, nc):
\t\t\t\tvar ts: int = BoardState.to_sq(nr, nc)
\t\t\t\tvar occ: BoardState.PieceData = board.squares[ts]
\t\t\t\tif occ == null or occ.color == enemy:
\t\t\t\t\tmoves.append({"from": sq, "to": ts})
\t\treturn moves
\tif p.type == BoardState.PieceType.KING:
\t\tfor dr: int in range(-1, 2):
\t\t\tfor dc: int in range(-1, 2):
\t\t\t\tif dr == 0 and dc == 0: continue
\t\t\t\tvar nr: int = r + dr
\t\t\t\tvar nc: int = c + dc
\t\t\t\tif BoardState.in_bounds(nr, nc):
\t\t\t\t\tvar ts: int = BoardState.to_sq(nr, nc)
\t\t\t\t\tvar occ: BoardState.PieceData = board.squares[ts]
\t\t\t\t\tif occ == null or occ.color == enemy:
\t\t\t\t\t\tmoves.append({"from": sq, "to": ts})
\t\treturn moves
\tvar dirs: Array[Vector2i] = []
\tif p.type == BoardState.PieceType.ROOK or p.type == BoardState.PieceType.QUEEN:
\t\tdirs.append_array([Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)])
\tif p.type == BoardState.PieceType.BISHOP or p.type == BoardState.PieceType.QUEEN:
\t\tdirs.append_array([Vector2i(1,1), Vector2i(1,-1), Vector2i(-1,1), Vector2i(-1,-1)])
\tfor d: Vector2i in dirs:
\t\tvar nr: int = r + d.x
\t\tvar nc: int = c + d.y
\t\twhile BoardState.in_bounds(nr, nc):
\t\t\tvar ts: int = BoardState.to_sq(nr, nc)
\t\t\tvar occ: BoardState.PieceData = board.squares[ts]
\t\t\tif occ == null:
\t\t\t\tmoves.append({"from": sq, "to": ts})
\t\t\telse:
\t\t\t\tif occ.color == enemy:
\t\t\t\t\tmoves.append({"from": sq, "to": ts})
\t\t\t\tbreak
\t\t\tnr += d.x
\t\t\tnc += d.y
\treturn moves
`,
  },
  {
    path: 'res://core/match/match_engine.gd',
    stage: 'Stage 1 — Core',
    content: `class_name MatchEngine
extends RefCounted

signal match_event(event: Dictionary)

enum Phase {
\tAWAIT_DRAW_CARD,
\tPLAYER_MOVE_LOOP,
\tAWAIT_RESURRECT_PLACEMENT,
\tAWAIT_WILD_ACTION,
\tAWAIT_COIN_CHOICE,
\tMATCH_OVER,
}

var mode: CardData.GameMode
var difficulty: CardData.Difficulty
var board: BoardState
var deck: DeckManager
var phase: Phase = Phase.AWAIT_DRAW_CARD
var active_actor: String = "player"
var player_color: BoardState.PieceColor = BoardState.PieceColor.WHITE
var opponent_color: BoardState.PieceColor = BoardState.PieceColor.BLACK
var player_hp: int = 3
var opponent_hp: int = 3
var half_turn_index: int = 0
var moves_left: int = 0
var _rng := RandomNumberGenerator.new()

func _init(p_mode: CardData.GameMode, p_diff: CardData.Difficulty) -> void:
\tmode = p_mode
\tdifficulty = p_diff
\t_rng.randomize()
\tboard = BoardState.create_initial()
\tdeck = DeckManager.new(p_mode, p_diff)
\tif mode == CardData.GameMode.SURVIVAL:
\t\tplayer_hp = 3 if diff == CardData.Difficulty.EASY else (2 if diff == CardData.Difficulty.MEDIUM else 1)
\t\topponent_hp = player_hp
\telse:
\t\tplayer_hp = 0
\t\topponent_hp = 0

func get_active_color() -> BoardState.PieceColor:
\treturn player_color if active_actor == "player" else opponent_color

func draw_card() -> void:
\tif phase != Phase.AWAIT_DRAW_CARD:
\t\treturn
\tvar res: Dictionary = deck.draw_card(half_turn_index)
\tvar card: int = res["card"]
\temit_signal("match_event", {"type": "CARD_DRAWN", "actor": active_actor, "card": card})
\tmatch card:
\t\tCardData.CardType.NUM_1, CardData.CardType.NUM_2, CardData.CardType.NUM_3, CardData.CardType.NUM_4, CardData.CardType.NUM_5:
\t\t\tmoves_left = CardData.get_move_count(card)
\t\t\tphase = Phase.PLAYER_MOVE_LOOP
\t\tCardData.CardType.SKIP:
\t\t\t_advance_turn()
\t\tCardData.CardType.REVERSE:
\t\t\tvar tmp := player_color
\t\t\tplayer_color = opponent_color
\t\t\topponent_color = tmp
\t\t\temit_signal("match_event", {"type": "BOARD_REVERSED", "player_color": player_color})
\t\t\t_advance_turn()
\t\tCardData.CardType.BULLET:
\t\t\tphase = Phase.AWAIT_COIN_CHOICE
\t\t_:
\t\t\tmoves_left = 1
\t\t\tphase = Phase.PLAYER_MOVE_LOOP

func execute_move(move: Dictionary) -> void:
\tif phase != Phase.PLAYER_MOVE_LOOP:
\t\treturn
\tboard.apply_move(move)
\tmoves_left -= 1
\tvar enemy_color := BoardState.opposite(get_active_color())
\tvar in_check: bool = board.is_in_check(enemy_color)
\tvar checkmated: bool = MoveGenerator.is_checkmate(board, enemy_color)
\tif moves_left > 0 and (in_check or checkmated):
\t\tmoves_left = 0
\temit_signal("match_event", {"type": "PIECE_MOVED", "move": move, "is_check": in_check})
\tif checkmated:
\t\tphase = Phase.MATCH_OVER
\t\temit_signal("match_event", {"type": "MATCH_ENDED", "winner": active_actor, "reason": "checkmate"})
\t\treturn
\tif moves_left <= 0:
\t\t_advance_turn()

func resolve_coin_flip(guessed_heads: bool) -> void:
\tif phase != Phase.AWAIT_COIN_CHOICE:
\t\treturn
\tvar actual_heads: bool = _rng.randf() < 0.5
\tvar guessed_right: bool = guessed_heads == actual_heads
\tvar guesser: String = "opponent" if active_actor == "player" else "player"
\tif not guessed_right:
\t\tif guesser == "player":
\t\t\tplayer_hp = maxi(0, player_hp - 1)
\t\telse:
\t\t\topponent_hp = maxi(0, opponent_hp - 1)
\temit_signal("match_event", {"type": "COIN_RESOLVED", "actual_heads": actual_heads, "guessed_right": guessed_right, "guesser": guesser})
\tif player_hp == 0 or opponent_hp == 0:
\t\tphase = Phase.MATCH_OVER
\t\temit_signal("match_event", {"type": "MATCH_ENDED", "winner": active_actor, "reason": "revolver"})
\t\treturn
\t_advance_turn()

func _advance_turn() -> void:
\tactive_actor = "opponent" if active_actor == "player" else "player"
\thalf_turn_index += 1
\tphase = Phase.AWAIT_DRAW_CARD
`,
  },
  {
    path: 'res://presentation/procedural_assets.gd',
    stage: 'Stage 2 — 3D Scene',
    content: `class_name ProceduralAssets
extends RefCounted

static func create_chess_piece(piece_type: BoardState.PieceType, color: BoardState.PieceColor) -> Node3D:
\tvar root := Node3D.new()
\tvar mat := StandardMaterial3D.new()
\tmat.albedo_color = Color(0.92, 0.88, 0.78) if color == BoardState.PieceColor.WHITE else Color(0.14, 0.14, 0.16)
\tmat.roughness = 0.35
\tvar base := MeshInstance3D.new()
\tvar cyl := CylinderMesh.new()
\tcyl.top_radius = 0.13
\tcyl.bottom_radius = 0.16
\tcyl.height = 0.06
\tbase.mesh = cyl
\tbase.material_override = mat
\tbase.position.y = 0.03
\troot.add_child(base)
\tvar body := MeshInstance3D.new()
\tvar body_mesh := CylinderMesh.new()
\tbody_mesh.top_radius = 0.07
\tbody_mesh.bottom_radius = 0.11
\tbody_mesh.height = 0.32 if piece_type >= BoardState.PieceType.QUEEN else 0.22
\tbody.mesh = body_mesh
\tbody.material_override = mat
\tbody.position.y = 0.2
\troot.add_child(body)
\treturn root

static func create_dealer_rig() -> Node3D:
\tvar root := Node3D.new()
\tvar head := MeshInstance3D.new()
\tvar skull := SphereMesh.new()
\tskull.radius = 0.35
\thead.mesh = skull
\tvar skin := StandardMaterial3D.new()
\tskin.albedo_color = Color(0.42, 0.4, 0.39)
\thead.material_override = skin
\thead.position = Vector3(0.0, 1.7, 0.1)
\troot.add_child(head)
\tvar socket_mat := StandardMaterial3D.new()
\tsocket_mat.albedo_color = Color(0.01, 0.01, 0.01)
\tsocket_mat.roughness = 1.0
\tfor ex: float in [-0.13, 0.13]:
\t\tvar sock := MeshInstance3D.new()
\t\tvar sm := SphereMesh.new()
\t\tsm.radius = 0.08
\t\tsock.mesh = sm
\t\tsock.material_override = socket_mat
\t\tsock.position = Vector3(ex, 0.06, 0.29)
\t\thead.add_child(sock)
\treturn root
`,
  },
  {
    path: 'res://presentation/camera_rig.gd',
    stage: 'Stage 2 — 3D Scene',
    content: `class_name CameraRig
extends Node3D

enum CamState { CAM_IDLE, CAM_BOARD_TACTICAL, CAM_CARD_DRAW, CAM_COIN_FLIP, CAM_REVOLVER }

@onready var camera: Camera3D = $Camera3D
var current_state: CamState = CamState.CAM_IDLE
var _tween: Tween

func set_camera_state(next_state: CamState) -> void:
\tcurrent_state = next_state
\tvar target_pos := Vector3(0.0, 1.82, 2.52)
\tvar target_look := Vector3(0.0, 0.62, -0.68)
\tmatch next_state:
\t\tCamState.CAM_BOARD_TACTICAL:
\t\t\ttarget_pos = Vector3(0.0, 3.55, 0.88)
\t\t\ttarget_look = Vector3.ZERO
\t\tCamState.CAM_CARD_DRAW:
\t\t\ttarget_pos = Vector3(0.28, 1.56, 1.85)
\t\t\ttarget_look = Vector3(0.12, 0.92, 0.85)
\t\tCamState.CAM_COIN_FLIP:
\t\t\ttarget_pos = Vector3(0.88, 1.25, 1.48)
\t\t\ttarget_look = Vector3(1.42, 0.25, 0.68)
\t\tCamState.CAM_REVOLVER:
\t\t\ttarget_pos = Vector3(-0.52, 1.38, 1.65)
\t\t\ttarget_look = Vector3(-0.22, 0.88, -0.82)
\tif _tween:
\t\t_tween.kill()
\t_tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
\t_tween.tween_property(camera, "position", target_pos, 0.48)
\tvar target_basis := Transform3D(Basis(), target_pos).looking_at(target_look, Vector3.UP).basis
\t_tween.tween_property(camera, "quaternion", target_basis.get_rotation_quaternion(), 0.48)
`,
  },
];
