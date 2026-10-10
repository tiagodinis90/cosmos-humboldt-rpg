extends CosmosTestCase
## Encounter runtime parity: the content exported from the TypeScript
## encounters (the frozen copy in tests/parity/content) must behave exactly
## like the TypeScript code, including consequences, persistent check
## attempts and routing.

var content: CosmosContent


func setup(_tree) -> void:
	content = reference_content()


func _dice(values: Array) -> Callable:
	var queue := values.duplicate()
	return func():
		return queue.pop_front() if not queue.is_empty() else null


func _summary(s: Dictionary, error) -> Dictionary:
	var a := CosmosEncounters.active(s, content)
	var transcript: Array = []
	var available: Array = []
	if not a.is_empty():
		for t in a.progress.get("transcript", []):
			match t.type:
				"line": transcript.append("line:" + t.card)
				"insight": transcript.append("insight:" + t.id)
				"choice": transcript.append("choice:" + t.choice)
				"roll": transcript.append("roll:%s:%s" % [t.roll.checkId, "true" if t.roll.passed else "false"])
		if not a.progress.finished:
			available = CosmosGraph.available_choices(a.encounter.graph, a.progress, CosmosEncounters.context(s)).map(func(c): return c.id)
	return {
		"flags": s.flags,
		"activeEncounter": s.get("activeEncounter"),
		"bonpland": {"relationship": s.bonpland.relationship, "morale": s.bonpland.morale},
		"checks": s.get("checks"),
		"evidence": (s.get("evidence", []) as Array).map(func(e): return {"id": e.id, "kind": e.kind, "basis": e.get("basis")}),
		"node": a.progress.nodeId if not a.is_empty() else null,
		"finished": a.progress.finished if not a.is_empty() else null,
		"transcript": transcript,
		"available": available,
		"error": error,
	}


## The live content (what writers edit) has no problems.
func test_content_is_valid() -> void:
	eq(CosmosContent.load_from().validate(), [], "content validation problems")


func test_content_map_matches_reference() -> void:
	var reference: Dictionary = load_json("res://tests/parity/nav.json").maps.cumana
	near(content.map, reference, 0.0, "Cumaná map built from content", ["label", "description", "label_key", "description_key", "_grid"])


func test_scenarios() -> void:
	var data: Dictionary = load_json("res://tests/parity/encounters.json")
	for scenario in data.scenarios:
		var s: Dictionary = scenario.start.duplicate(true)
		for i in scenario.steps.size():
			var step: Dictionary = scenario.steps[i]
			var error = null
			var next = s
			CosmosGraph.last_error = ""
			match step.type:
				"open": next = CosmosEncounters.open(s, step.id, content)
				"continue": next = CosmosEncounters.continue_line(s, content)
				"choose": next = CosmosEncounters.choose(s, step.id, _dice(step.get("dice", [])), content)
				"close": next = CosmosEncounters.close(s, content)
				"skills":
					next = s.duplicate()
					next.skills = s.skills.duplicate()
					next.skills.merge(step.skills, true)
			if next == null:
				error = CosmosGraph.last_error
			else:
				s = next
			near(_summary(s, error), scenario.records[i], 0.0, "%s, step %d (%s %s)" % [scenario.name, i, step.type, step.get("id", "")])


func test_routing() -> void:
	var data: Dictionary = load_json("res://tests/parity/encounters.json")
	for c in data.routing:
		var got := CosmosEncounters.resolve(c.state, c.hotspot, content)
		var mapped := {"kind": got.kind}
		if got.kind == "encounter":
			mapped.id = got.id
		elif got.kind == "remark":
			mapped.text = content.t(got.text_key)
			mapped.voice = null if got.voice == null else {"skill": got.voice.skill, "text": content.t(got.voice.text_key)}
		eq(mapped, c.expected, "routing %s with flags %s" % [c.hotspot, c.state.flags])
