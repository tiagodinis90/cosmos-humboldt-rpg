class_name CosmosGraph
extends RefCounted
## COSMOS conversation engine. Port of src/narrative/graph-engine.ts, checked
## against tests/parity/graph.json.
##
## Graphs are data: {start, cards}. Card types: line, choice, passive, fork,
## end. Conditions: flag, skill, all, any, not. Checks roll 2d6 + skill +
## modifiers against a difficulty; double six always passes, double one
## always fails. Red checks can be tried once, ever. White checks reopen only
## when the effective score rises above the score of the last attempt. The
## random source is injected so tests are deterministic.
##
## Progress is a Dictionary with the same keys as the TypeScript engine, so a
## save made by either engine describes a conversation the same way.
## The engine never reads display text: content files hold text keys.
##
## Errors: functions that can fail return null and set `last_error` to the
## same message the reference engine throws.

static var last_error := ""


static func _fail(message: String) -> Variant:
	last_error = message
	return null


static func _skill(context: Dictionary, skill: String) -> float:
	return float(context.skills.get(skill, 0))


static func condition_met(condition: Dictionary, context: Dictionary, progress: Dictionary) -> bool:
	match condition.get("op", ""):
		"flag":
			return context.flags.has(condition.name) or progress.get("flags", []).has(condition.name)
		"skill":
			return _skill(context, condition.skill) >= condition.atLeast
		"all":
			for c in condition.conditions:
				if not condition_met(c, context, progress):
					return false
			return true
		"any":
			for c in condition.conditions:
				if condition_met(c, context, progress):
					return true
			return false
		"not":
			return not condition_met(condition.condition, context, progress)
	return false


static func _modifier_total(check: Dictionary, context: Dictionary, progress: Dictionary) -> float:
	var total := 0.0
	for m in check.get("modifiers", []):
		if condition_met(m.when, context, progress):
			total += m.amount
	return total


## Skill score plus every modifier that currently applies to a check.
static func check_score(check: Dictionary, context: Dictionary, progress: Dictionary) -> float:
	return _skill(context, check.skill) + _modifier_total(check, context, progress)


static func _can_attempt(choice: Dictionary, context: Dictionary, progress: Dictionary) -> bool:
	if choice.has("when") and not condition_met(choice.when, context, progress):
		return false
	if not choice.has("check"):
		return true
	var check: Dictionary = choice.check
	if check.kind == "red":
		return not progress.redAttempts.has(check.id)
	if not progress.whiteAttempts.has(check.id):
		return true
	return check_score(check, context, progress) > progress.whiteAttempts[check.id]


static func available_choices(graph: Dictionary, progress: Dictionary, context: Dictionary) -> Array:
	if progress.finished:
		return []
	var card = graph.cards.get(progress.nodeId)
	if card == null or card.type != "choice":
		return []
	return card.choices.filter(func(c): return _can_attempt(c, context, progress))


static func _with(progress: Dictionary, changes: Dictionary) -> Dictionary:
	var out := progress.duplicate()
	out.merge(changes, true)
	return out


static func _arrive(progress: Dictionary, card: Dictionary) -> Dictionary:
	var flags: Array = progress.flags
	if card.has("sets") and not card.sets.is_empty():
		flags = _union(progress.flags, card.sets)
	var transcript: Array = progress.get("transcript", []).duplicate()
	transcript.append({"type": "line", "card": card.id})
	return _with(progress, {"flags": flags, "transcript": transcript})


static func _union(a: Array, b: Array) -> Array:
	var out := a.duplicate()
	for item in b:
		if not out.has(item):
			out.append(item)
	return out


static func _settle(graph: Dictionary, initial: Dictionary, context: Dictionary) -> Variant:
	var progress := initial
	var seen := {}
	for depth in 64:
		var card = graph.cards.get(progress.nodeId)
		if card == null:
			return _fail("Missing dialogue card: " + str(progress.nodeId))
		if card.type == "end":
			return _with(_arrive(progress, card), {"finished": true})
		if card.type == "line":
			return _arrive(progress, card)
		if card.type == "choice":
			return progress
		if seen.has(card.id):
			return _fail("Non-interactive dialogue loop: " + str(card.id))
		seen[card.id] = true
		if card.type == "fork":
			var next: String = card.otherwise
			for route in card.routes:
				if condition_met(route.when, context, progress):
					next = route.next
					break
			progress = _with(progress, {"nodeId": next})
		else:
			var insights: Array = progress.insights.duplicate()
			var transcript: Array = progress.get("transcript", []).duplicate()
			for probe in card.probes:
				var known := insights.any(func(i): return i.id == probe.id)
				if _skill(context, probe.skill) >= probe.atLeast and not known:
					insights.append({"id": probe.id, "skill": probe.skill, "text_key": probe.get("text_key", probe.get("text", ""))})
					transcript.append({"type": "insight", "id": probe.id})
			progress = _with(progress, {"nodeId": card.next, "insights": insights, "transcript": transcript})
	return _fail("Non-interactive dialogue depth exceeded")


static func empty_ledger() -> Dictionary:
	return {"white": {}, "red": []}


static func merge_ledger(ledger, progress: Dictionary) -> Dictionary:
	var base: Dictionary = ledger if ledger is Dictionary else empty_ledger()
	var white: Dictionary = base.white.duplicate()
	for id in progress.whiteAttempts:
		white[id] = maxf(float(white.get(id, -INF)), float(progress.whiteAttempts[id]))
	return {"white": white, "red": _union(base.red, progress.redAttempts)}


## Start a conversation. Pass the ledger so earlier check attempts still count.
static func start(graph: Dictionary, context: Dictionary, ledger = null) -> Variant:
	var white := {}
	var red: Array = []
	if ledger is Dictionary:
		white = ledger.white.duplicate()
		red = ledger.red.duplicate()
	return _settle(graph, {
		"nodeId": graph.start, "finished": false, "flags": [], "insights": [],
		"whiteAttempts": white, "redAttempts": red, "lastRoll": null, "history": [], "transcript": [],
	}, context)


static func continue_line(graph: Dictionary, progress: Dictionary, context: Dictionary) -> Variant:
	if progress.finished:
		return _fail("Dialogue already finished")
	var card = graph.cards.get(progress.nodeId)
	if card == null or card.type != "line":
		return _fail("Current card is not a line")
	var history: Array = progress.history.duplicate()
	history.append(card.id)
	return _settle(graph, _with(progress, {"nodeId": card.next, "history": history}), context)


static func _die(random: Callable) -> Variant:
	var value = random.call()
	if not (value is float or value is int) or not is_finite(value) or value < 0.0 or value >= 1.0:
		return _fail("Random source must return a value in [0,1)")
	return 1 + int(floor(float(value) * 6.0))


static func roll_check(check: Dictionary, context: Dictionary, progress: Dictionary, random: Callable) -> Variant:
	var first = _die(random)
	if first == null:
		return null
	var second = _die(random)
	if second == null:
		return null
	var explanations: Array = []
	for m in check.get("modifiers", []):
		if condition_met(m.when, context, progress):
			explanations.append({"reason_key": m.get("reason_key", m.get("reason", "")), "amount": m.amount})
	var modifier := _modifier_total(check, context, progress)
	var total: float = first + second + _skill(context, check.skill) + modifier
	return {
		"checkId": check.id, "kind": check.kind, "skill": check.skill,
		"first": first, "second": second, "modifier": modifier, "total": total,
		"difficulty": check.difficulty,
		"passed": (first == 6 and second == 6) or (not (first == 1 and second == 1) and total >= check.difficulty),
		"explanations": explanations,
	}


static func choose(graph: Dictionary, progress: Dictionary, context: Dictionary, id: String, random: Callable) -> Variant:
	if progress.finished:
		return _fail("Dialogue already finished")
	var card = graph.cards.get(progress.nodeId)
	if card == null or card.type != "choice":
		return _fail("Current card has no choices")
	var choice = null
	for c in available_choices(graph, progress, context):
		if c.id == id:
			choice = c
			break
	if choice == null:
		return _fail("Unavailable dialogue choice: " + id)
	var next: String = choice.next
	var last_roll = null
	var white_attempts: Dictionary = progress.whiteAttempts.duplicate()
	var red_attempts: Array = progress.redAttempts.duplicate()
	if choice.has("check"):
		var check: Dictionary = choice.check
		last_roll = roll_check(check, context, progress, random)
		if last_roll == null:
			return null
		next = check.success if last_roll.passed else check.failure
		if check.kind == "red":
			red_attempts.append(check.id)
		else:
			white_attempts[check.id] = check_score(check, context, progress)
	var transcript: Array = progress.get("transcript", []).duplicate()
	transcript.append({"type": "choice", "choice": id, "label_key": choice.get("label_key", choice.get("label", ""))})
	if last_roll != null:
		transcript.append({"type": "roll", "roll": last_roll})
	var history: Array = progress.history.duplicate()
	history.append(id)
	return _settle(graph, _with(progress, {
		"nodeId": next,
		"flags": _union(progress.flags, choice.get("flags", [])),
		"whiteAttempts": white_attempts,
		"redAttempts": red_attempts,
		"lastRoll": last_roll,
		"history": history,
		"transcript": transcript,
	}), context)


## Structural problems in a graph, in the same order as the reference engine.
static func validate(graph: Dictionary) -> Array:
	var errors: Array = []
	var cards = graph.get("cards")
	if not cards is Dictionary:
		return ["Missing cards"]
	var reached := {}
	var queue: Array = [graph.get("start", "")]
	var endings := 0
	while queue.size() > 0:
		var id = queue.pop_front()
		if reached.has(id):
			continue
		reached[id] = true
		var card = cards.get(id)
		if not card is Dictionary:
			errors.append("Missing card " + str(id))
			continue
		if card.get("id") != id:
			errors.append("Mismatched card id " + str(id))
		var type = card.get("type")
		if type == "end":
			endings += 1
			continue
		var links: Array = []
		if type == "line" or type == "passive":
			links = [card.get("next")]
		if type == "fork":
			for r in card.get("routes", []):
				links.append(r.get("next") if r is Dictionary else null)
			links.append(card.get("otherwise"))
		if type == "choice":
			var ids := {}
			var choices = card.get("choices", [])
			for choice in choices:
				if not choice is Dictionary:
					continue
				if ids.has(choice.get("id")):
					errors.append("Duplicate choice " + str(id) + ":" + str(choice.get("id")))
				ids[choice.get("id")] = true
				links.append(choice.get("next"))
				if choice.get("check") is Dictionary:
					links.append(choice.check.get("success"))
					links.append(choice.check.get("failure"))
			if choices is Array and choices.is_empty():
				errors.append("No choices " + str(id))
		for link in links:
			if not cards.has(link):
				errors.append("Broken edge " + str(id) + " -> " + str(link))
			else:
				queue.append(link)
	if endings == 0:
		errors.append("No reachable ending")
	for id in cards:
		if not reached.has(id):
			errors.append("Unreachable card " + str(id))
	return errors


## Probability that 2d6 + score passes a difficulty (double six / double one rules).
static func success_chance(score: float, difficulty: float) -> float:
	var passes := 0
	for a in range(1, 7):
		for b in range(1, 7):
			if (a == 6 and b == 6) or (not (a == 1 and b == 1) and a + b + score >= difficulty):
				passes += 1
	return passes / 36.0
