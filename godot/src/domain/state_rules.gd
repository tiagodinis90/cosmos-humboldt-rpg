class_name CosmosStateRules
extends RefCounted
## Validation and repair rules for persisted state. Port of
## src/exploration/scene-state.ts, src/investigation/evidence.ts and the
## sanitising part of src/gameplay/save.ts; checked against
## tests/parity/save.json.

const EVIDENCE_KINDS := ["measurement", "observation", "testimony", "hypothesis", "inference"]
const DEFAULT_HEADING := PI / 4.0


static func _is_number(v) -> bool:
	return v is float or v is int


static func _is_finite_number(v) -> bool:
	return _is_number(v) and is_finite(v)


static func _is_string_array(v) -> bool:
	if not v is Array:
		return false
	for item in v:
		if not item is String:
			return false
	return true


# --- exploration ---------------------------------------------------------------

static func default_exploration(map: Dictionary) -> Dictionary:
	return {"scene": "cumana", "position": {"x": map.spawn.x, "y": map.spawn.y}, "heading": DEFAULT_HEADING, "visits": {}}


static func is_exploration_state(value) -> bool:
	if not value is Dictionary:
		return false
	if value.get("scene") != "cumana":
		return false
	var p = value.get("position")
	if not p is Dictionary or not _is_finite_number(p.get("x")) or not _is_finite_number(p.get("y")):
		return false
	if not _is_finite_number(value.get("heading")):
		return false
	var visits = value.get("visits")
	if not visits is Dictionary:
		return false
	for n in visits.values():
		if not _is_finite_number(n) or n < 0:
			return false
	return true


## Malformed data falls back to the spawn; a position that is no longer
## walkable moves to the nearest walkable point.
static func normalize_exploration(value, map: Dictionary) -> Dictionary:
	if not is_exploration_state(value):
		return default_exploration(map)
	return {
		"scene": "cumana",
		"position": CosmosNav.nearest_walkable(value.position, map),
		"heading": float(value.heading),
		"visits": value.visits.duplicate(),
	}


static func with_position(state: Dictionary, position: Dictionary, heading: float) -> Dictionary:
	if state.position.x == position.x and state.position.y == position.y and state.heading == heading:
		return state
	var out := state.duplicate()
	out.position = {"x": position.x, "y": position.y}
	out.heading = heading
	return out


static func record_visit(state: Dictionary, hotspot: String) -> Dictionary:
	var out := state.duplicate(true)
	out.visits[hotspot] = int(out.visits.get(hotspot, 0)) + 1
	return out


# --- evidence ---------------------------------------------------------------------

## Evidence records hold text keys (content_key, source_key, ...), not prose.
static func is_evidence(value) -> bool:
	if not value is Dictionary:
		return false
	return value.get("id") is String and EVIDENCE_KINDS.has(value.get("kind")) and \
		(value.get("content") is String or value.get("content_key") is String) and \
		(value.get("source") is String or value.get("source_key") is String) and \
		(value.get("date") is String or value.get("date_key") is String)


## Append without duplicating ids; the first record of an id wins.
static func add_evidence(list: Array, items: Array) -> Array:
	var out := list.duplicate()
	for item in items:
		if not out.any(func(e): return e.id == item.id):
			out.append(item)
	return out


# --- conversations and checks --------------------------------------------------------

static func is_graph_progress(value) -> bool:
	if not value is Dictionary:
		return false
	var v: Dictionary = value
	if not v.get("nodeId") is String or not v.get("finished") is bool:
		return false
	if not _is_string_array(v.get("flags")) or not v.get("insights") is Array or not _is_string_array(v.get("history")):
		return false
	var white = v.get("whiteAttempts")
	if not white is Dictionary:
		return false
	for n in white.values():
		if not _is_number(n):
			return false
	if not _is_string_array(v.get("redAttempts")):
		return false
	var roll = v.get("lastRoll", 0)
	if not (roll == null or roll is Dictionary):
		return false
	for i in v.insights:
		if not i is Dictionary or not i.get("id") is String:
			return false
	# Stricter than the TypeScript check: a transcript entry the dialogue
	# panel cannot draw would leave the conversation impossible to continue.
	if not v.has("transcript"):
		return true
	if not v.transcript is Array:
		return false
	for entry in v.transcript:
		if not entry is Dictionary or not entry.get("type") is String:
			return false
	return true


static func is_ledger(value) -> bool:
	if not value is Dictionary or not value.get("white") is Dictionary:
		return false
	for n in value.white.values():
		if not _is_number(n):
			return false
	return _is_string_array(value.get("red"))


## Repairs the optional, recoverable fields; returns a new state.
static func sanitize(state: Dictionary) -> Dictionary:
	var dialogues := {}
	var raw = state.get("dialogues")
	if raw is Dictionary:
		for id in raw:
			if is_graph_progress(raw[id]):
				dialogues[id] = raw[id]
	var active = state.get("activeEncounter")
	var out := state.duplicate()
	out.exploration = state.exploration if is_exploration_state(state.get("exploration")) else null
	out.evidence = (state.evidence as Array).filter(func(e): return is_evidence(e)) if state.get("evidence") is Array else []
	out.dialogues = dialogues
	out.activeEncounter = active if active is String and dialogues.has(active) else null
	out.checks = state.checks if is_ledger(state.get("checks")) else CosmosGraph.empty_ledger()
	return out
