class_name CosmosSave
extends RefCounted
## Save file format for the Godot build.
##
## Envelope: {format: "cosmos-save", version: 2, engine: "godot", savedAt, state}
## The state uses the same field names and repair rules as TypeScript save v2
## (src/gameplay/save.ts) for the parts both engines persist: flags, skills,
## bonpland, exploration, evidence, dialogues, checks, activeEncounter.
## The browser and Godot saves are not interchangeable yet: the browser save
## also carries the dice-cycle expedition state that Godot does not have.
##
## Policy: an unknown format/version or damaged required fields (flags,
## skills, bonpland) are refused and the game starts fresh; Session keeps a
## copy of the refused file first. Damaged optional fields are repaired one
## by one. A walk in
## progress is not saved: the player reloads standing where they stopped.

const FORMAT := "cosmos-save"
const VERSION := 2
const DEFAULT_SKILLS := {"logic": 2, "empathy": 2, "aesthetics": 2, "political": 1}


static func new_state(spawn: Dictionary) -> Dictionary:
	return {
		"phase": "exploration",
		"currentLocation": "cumana",
		"skills": DEFAULT_SKILLS.duplicate(),
		"flags": [],
		"bonpland": {"health": 100, "morale": 80, "expertise": 70, "relationship": 0},
		"exploration": {"scene": "cumana", "position": {"x": spawn.x, "y": spawn.y}, "heading": CosmosStateRules.DEFAULT_HEADING, "visits": {}},
		"evidence": [],
		"dialogues": {},
		"checks": CosmosGraph.empty_ledger(),
		"activeEncounter": null,
	}


static func encode(state: Dictionary) -> String:
	var envelope := {
		"format": FORMAT, "version": VERSION, "engine": "godot",
		"savedAt": Time.get_datetime_string_from_system(true) + "Z",
		"state": state,
	}
	return JSON.stringify(envelope, "  ", false, true)


static func decode(raw: String) -> Variant:
	if raw.strip_edges() == "":
		return null
	var data = CosmosJson.parse(raw)
	if not data is Dictionary:
		return null
	var envelope: Dictionary = data
	if envelope.get("format") != FORMAT or envelope.get("version") != float(VERSION):
		return null
	var state = envelope.get("state")
	if not state is Dictionary or not is_playable(state):
		return null
	return CosmosStateRules.sanitize(state)


## The fields the game cannot run without. A save missing one is refused,
## and Session never applies a state missing one.
static func is_playable(state: Dictionary) -> bool:
	if not CosmosStateRules._is_string_array(state.get("flags")):
		return false
	var skills = state.get("skills")
	if not skills is Dictionary or skills.values().any(func(v): return not CosmosStateRules._is_finite_number(v)):
		return false
	var bonpland = state.get("bonpland")
	return bonpland is Dictionary and CosmosStateRules._is_finite_number(bonpland.get("relationship")) and CosmosStateRules._is_finite_number(bonpland.get("morale"))
