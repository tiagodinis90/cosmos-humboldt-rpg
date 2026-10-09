extends CosmosTestCase
## Save repair rules shared with TS save v2, plus the Godot save envelope.

func test_sanitize_matches_reference() -> void:
	var data: Dictionary = load_json("res://tests/parity/save.json")
	for c in data.sanitize:
		var state := {"flags": [], "skills": {}, "bonpland": {}}
		state.merge(c.input, true)
		var out := CosmosStateRules.sanitize(state)
		var got := {
			"exploration": out.exploration, "evidence": out.evidence, "dialogues": out.dialogues.keys(),
			"activeEncounter": out.activeEncounter, "checks": out.checks,
		}
		near(got, c.expected, 0.0, "sanitize %s" % JSON.stringify(c.input).substr(0, 120))


func test_normalize_matches_reference() -> void:
	var data: Dictionary = load_json("res://tests/parity/save.json")
	var map: Dictionary = load_json("res://tests/parity/nav.json").maps.cumana
	for c in data.normalize:
		near(CosmosStateRules.normalize_exploration(c.input, map), c.expected, 1e-9, "normalize %s" % [c.input])


func test_envelope_round_trip_and_rejection() -> void:
	var state := CosmosSave.new_state({"x": 150.0, "y": 720.0})
	state.flags = ["bonpland_helped_press"]
	state.exploration.position = {"x": 700.25, "y": 650.5}
	var raw := CosmosSave.encode(state)
	var back = CosmosSave.decode(raw)
	ok(back != null, "round trip decodes")
	near(back, state, 0.0, "round trip is lossless")
	eq(CosmosSave.decode(""), null, "empty")
	eq(CosmosSave.decode("{oops"), null, "malformed JSON")
	eq(CosmosSave.decode(JSON.stringify({"format": "cosmos-save", "version": 99, "state": state})), null, "unknown version")
	eq(CosmosSave.decode(JSON.stringify({"format": "other", "version": 2, "state": state})), null, "foreign file")
	var broken := state.duplicate(true)
	broken.flags = "nope"
	eq(CosmosSave.decode(JSON.stringify({"format": "cosmos-save", "version": 2, "state": broken})), null, "required field damaged")
	var damaged := state.duplicate(true)
	damaged.exploration = {"scene": "cumana", "position": {"x": "left", "y": 1}, "heading": 0, "visits": {}}
	damaged.checks = "none"
	var repaired = CosmosSave.decode(JSON.stringify({"format": "cosmos-save", "version": 2, "state": damaged}))
	ok(repaired != null, "optional damage is repaired, not fatal")
	eq(repaired.exploration, null, "bad position dropped (scene uses spawn)")
	eq(repaired.checks, {"white": {}, "red": []}, "ledger reset")
	eq(repaired.flags, ["bonpland_helped_press"], "narrative progress kept")
