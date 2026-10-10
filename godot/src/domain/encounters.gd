class_name CosmosEncounters
extends RefCounted
## Conversations inside the scene and what they change. Port of the runtime
## part of src/narrative/encounters.ts; the content (graphs, consequences,
## routing rules) is data in res://content. Checked against
## tests/parity/encounters.json.
##
## State is a Dictionary using the same field names as the TypeScript
## GameState: flags, skills, bonpland, exploration, evidence, dialogues,
## checks, activeEncounter. Functions return new state; they never mutate.


static func context(state: Dictionary) -> Dictionary:
	return {"skills": state.skills, "flags": state.flags}


static func period(flags: Array) -> String:
	return "november" if flags.has("cumana_fieldwork_complete") else "july"


static func _copy(state: Dictionary) -> Dictionary:
	return state.duplicate()


## True when walking up to the conversation would offer anything but leaving.
static func has_news(state: Dictionary, id: String, content: CosmosContent) -> bool:
	var e := content.encounter(id)
	if e.is_empty():
		return false
	var ctx := context(state)
	var progress = CosmosGraph.start(e.graph, ctx, state.get("checks"))
	var i := 0
	while progress != null and i < 16 and not progress.finished and e.graph.cards.get(progress.nodeId, {}).get("type") == "line":
		progress = CosmosGraph.continue_line(e.graph, progress, ctx)
		i += 1
	if progress == null:
		return false
	for c in CosmosGraph.available_choices(e.graph, progress, ctx):
		if not e.exits.has(c.id):
			return true
	return false


## Returns the new state, or null with CosmosGraph.last_error set when the
## conversation does not exist or cannot start (the state is then unchanged).
static func open(state: Dictionary, id: String, content: CosmosContent) -> Variant:
	var e := content.encounter(id)
	if e.is_empty() or not e.get("graph") is Dictionary:
		CosmosGraph.last_error = "Unknown encounter " + id
		return null
	var progress = CosmosGraph.start(e.graph, context(state), state.get("checks"))
	if progress == null:
		return null
	var out := _copy(state)
	var dialogues: Dictionary = (state.get("dialogues") if state.get("dialogues") is Dictionary else {}).duplicate()
	dialogues[id] = progress
	out.dialogues = dialogues
	out.activeEncounter = id
	return out


## A conversation that can no longer be shown (its file was removed or
## renamed, or a writer deleted the card the player was on) would leave the
## player stuck: it is closed without consequences, keeping the checks
## already tried. Returns the state unchanged when nothing needs repair.
static func repair(state: Dictionary, content: CosmosContent) -> Dictionary:
	var id = state.get("activeEncounter")
	if id == null:
		return state
	if not active(state, content).is_empty() and _resumable(state.dialogues[id], content.encounter(id)):
		return state
	var out := _copy(state)
	out.activeEncounter = null
	var dialogues: Dictionary = (state.get("dialogues") if state.get("dialogues") is Dictionary else {}).duplicate()
	var progress = dialogues.get(id)
	if progress is Dictionary:
		out.checks = CosmosGraph.merge_ledger(state.get("checks"), progress)
	dialogues.erase(id)
	out.dialogues = dialogues
	push_warning("Conversation '%s' could not be resumed (content changed); it was closed." % str(id))
	return out


static func _resumable(progress: Dictionary, encounter: Dictionary) -> bool:
	var cards = encounter.get("graph", {}).get("cards")
	if not cards is Dictionary:
		return false
	var card = cards.get(progress.nodeId)
	if progress.finished:
		return true
	return card is Dictionary and (card.get("type") == "line" or card.get("type") == "choice")


static func active(state: Dictionary, content: CosmosContent) -> Dictionary:
	var id = state.get("activeEncounter")
	if not id is String or not content.encounters.has(id):
		return {}
	var progress = state.get("dialogues", {}).get(id)
	if not progress is Dictionary:
		return {}
	return {"id": id, "encounter": content.encounter(id), "progress": progress}


static func _with_progress(state: Dictionary, id: String, progress: Dictionary) -> Dictionary:
	var out := _copy(state)
	var dialogues: Dictionary = state.dialogues.duplicate()
	dialogues[id] = progress
	out.dialogues = dialogues
	return out


## Returns the new state, or null with CosmosGraph.last_error set.
static func continue_line(state: Dictionary, content: CosmosContent) -> Variant:
	var a := active(state, content)
	if a.is_empty():
		return state
	var next = CosmosGraph.continue_line(a.encounter.graph, a.progress, context(state))
	return null if next == null else _with_progress(state, a.id, next)


static func choose(state: Dictionary, choice_id: String, random: Callable, content: CosmosContent) -> Variant:
	var a := active(state, content)
	if a.is_empty():
		return state
	var next = CosmosGraph.choose(a.encounter.graph, a.progress, context(state), choice_id, random)
	return null if next == null else _with_progress(state, a.id, next)


static func _union(a: Array, b: Array) -> Array:
	var out := a.duplicate()
	for x in b:
		if not out.has(x):
			out.append(x)
	return out


## Apply a finished conversation's consequences and return to walking.
static func close(state: Dictionary, content: CosmosContent) -> Dictionary:
	var a := active(state, content)
	var out := _copy(state)
	out.activeEncounter = null
	if a.is_empty():
		return out
	var progress: Dictionary = a.progress
	out.checks = CosmosGraph.merge_ledger(state.get("checks"), progress)
	if not progress.finished:
		return out
	var e: Dictionary = a.encounter
	var concluded = e.get("concluded_flag")
	if concluded is String and state.flags.has(concluded):
		return out
	var flags := _union(state.flags, progress.flags)
	if concluded is String:
		flags = _union(flags, [concluded])
	var fresh := {}
	for f in progress.flags:
		if not state.flags.has(f):
			fresh[f] = true
	var ctx := {"skills": state.skills, "flags": flags}
	var gained: Array = []
	var relationship := 0.0
	var morale := 0.0
	var bonpland_changed := false
	for rule in e.get("consequences", []):
		if not rule is Dictionary:
			continue
		var applies := true
		if rule.has("when"):
			applies = rule.when is Dictionary and CosmosGraph.condition_met(rule.when, ctx, {"flags": []})
		if rule.has("when_new"):
			applies = applies and fresh.has(rule.when_new)
		if not applies:
			continue
		if rule.get("evidence") is Dictionary:
			gained.append(_evidence_record(rule.evidence, state.flags))
		if rule.get("bonpland") is Dictionary:
			bonpland_changed = true
			relationship += float(rule.bonpland.get("relationship", 0))
			morale += float(rule.bonpland.get("morale", 0))
	out.flags = flags
	out.evidence = CosmosStateRules.add_evidence(state.get("evidence", []) if state.get("evidence") is Array else [], gained)
	if bonpland_changed:
		var b: Dictionary = state.bonpland.duplicate()
		b.relationship = clampf(float(b.relationship) + relationship, -5.0, 10.0)
		b.morale = clampf(float(b.morale) + morale, 0.0, 100.0)
		out.bonpland = b
	return out


## Evidence records copy the authored keys; "$period" in a date key becomes
## the scene's current period so the fieldbook shows the right month.
static func _evidence_record(template: Dictionary, flags: Array) -> Dictionary:
	var record := template.duplicate(true)
	if record.get("date_key", "") is String:
		record.date_key = str(record.get("date_key", "")).replace("$period", period(flags))
	return record


## What happens when the player arrives at a hotspot. Rules are tried in
## order; the first whose condition holds decides.
##   {kind: "encounter", id} | {kind: "chapter", id} |
##   {kind: "remark", text_key, voice: {skill, text_key} or null}
static func resolve(state: Dictionary, hotspot: String, content: CosmosContent) -> Dictionary:
	var rules: Dictionary = content.scene.get("interactions", {})
	var list: Array = rules.get(hotspot, rules.get("*", []))
	for rule in list:
		if rule.has("when") and not _rule_met(rule.when, state, content):
			continue
		var action: Dictionary = rule.do
		if action.has("encounter"):
			return {"kind": "encounter", "id": action.encounter}
		if action.has("chapter"):
			return {"kind": "chapter", "id": action.chapter}
		var voice = null
		if action.has("voice") and _rule_met(action.voice.get("when", {"op": "all", "conditions": []}), state, content):
			voice = {"skill": action.voice.skill, "text_key": action.voice.text_key}
		return {"kind": "remark", "text_key": action.get("remark_key", ""), "voice": voice}
	return {"kind": "remark", "text_key": "remark.default", "voice": null}


## Graph conditions plus two scene-only ones:
##   {op: "visits", hotspot, atMost}  — the hotspot has been used at most N times
##   {op: "hasNews", encounter}       — the conversation has something new
static func _rule_met(condition: Dictionary, state: Dictionary, content: CosmosContent) -> bool:
	match condition.get("op", ""):
		"visits":
			var exploration = state.get("exploration")
			var visits: Dictionary = exploration.visits if exploration is Dictionary else {}
			return float(visits.get(condition.hotspot, 0)) <= float(condition.atMost)
		"hasNews":
			return has_news(state, condition.encounter, content)
		"all":
			for c in condition.conditions:
				if not _rule_met(c, state, content):
					return false
			return true
		"any":
			for c in condition.conditions:
				if _rule_met(c, state, content):
					return true
			return false
		"not":
			return not _rule_met(condition.condition, state, content)
	return CosmosGraph.condition_met(condition, context(state), {"flags": []})
