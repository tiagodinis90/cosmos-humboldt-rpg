class_name CosmosContentSchema
extends RefCounted
## Shape checks for authored content, run before anything reads it. Every
## problem is a sentence naming the file and the field, so a writer can fix
## a missing comma or a misspelled field without a programmer. Content that
## fails here is never handed to the game rules.

const CARD_TYPES := ["line", "choice", "passive", "fork", "end"]
const GRAPH_OPS := ["flag", "skill", "all", "any", "not"]
const SCENE_OPS := ["visits", "hasNews"]
const SKILLS := ["logic", "empathy", "aesthetics", "political"]
## Field names each kind of object may use ("note…" fields are always
## allowed, for writers' comments). A misspelled field is reported with
## the nearest correct name.
const FIELDS := {
	"scene": ["id", "map", "shore", "structures", "figures", "player", "hotspots", "interactions", "chapters"],
	"map": ["width", "height", "tileSize", "margin", "spawn", "extra_obstacles"],
	"structure": ["id", "kind", "footprint", "height", "roof", "visual", "hotspot"],
	"figure": ["id", "kind", "position", "heading", "visual", "hotspot"],
	"player": ["kind", "visual"],
	"hotspot": ["id", "kind", "point", "radius", "markerHeight", "label_key", "description_key"],
	"rule": ["when", "do"],
	"do": ["encounter", "chapter", "remark_key", "voice"],
	"voice": ["skill", "text_key", "when"],
	"encounter": ["id", "status", "title_key", "place_key", "exits", "graph", "consequences", "concluded_flag"],
	"card": ["id", "type", "speaker", "text_key", "prompt_key", "next", "sets", "probes", "routes", "otherwise", "choices"],
	"route": ["when", "next"],
	"probe": ["id", "skill", "atLeast", "text_key"],
	"choice": ["id", "label_key", "next", "when", "flags", "check"],
	"check": ["id", "kind", "skill", "difficulty", "success", "failure", "modifiers"],
	"modifier": ["when", "amount", "reason_key"],
	"consequence": ["when", "when_new", "evidence", "bonpland"],
	"evidence": ["id", "kind", "content_key", "method_key", "uncertainty_key", "source_key", "location_key", "date_key", "basis"],
	"bonpland": ["relationship", "morale"],
}


static func _num(v) -> bool:
	return (v is float or v is int) and is_finite(float(v))


static func _str(v) -> bool:
	return v is String and v != ""


class _Report:
	var problems: Array = []
	var file := ""

	func _init(file_label: String) -> void:
		file = file_label

	func add(where: String, message: String) -> void:
		problems.append("%s, %s: %s" % [file, where, message])

	func need(d: Dictionary, field: String, kind: String, where: String) -> bool:
		if not d.has(field):
			add(where, "'%s' is missing." % field)
			return false
		var v = d[field]
		var good := false
		match kind:
			"text": good = CosmosContentSchema._str(v)
			"number": good = CosmosContentSchema._num(v)
			"object": good = v is Dictionary
			"list": good = v is Array
		if not good:
			add(where, "'%s' must be %s." % [field, {"text": "a non-empty text", "number": "a number", "object": "an object { … }", "list": "a list [ … ]"}[kind]])
		return good

	## Report field names that are not used by the game (usually a typo).
	func fields(d: Dictionary, kind: String, where: String) -> void:
		var allowed: Array = CosmosContentSchema.FIELDS[kind]
		for k in d:
			if allowed.has(k) or String(k).begins_with("note"):
				continue
			var best := ""
			var score := 0.0
			for a in allowed:
				var sim := String(k).similarity(a)
				if sim > score:
					score = sim
					best = a
			add(where, "unknown field '%s'%s." % [k, " (did you mean '%s'?)" % best if score >= 0.5 else ""])

	func skill(d: Dictionary, field: String, where: String) -> void:
		if need(d, field, "text", where) and not CosmosContentSchema.SKILLS.has(d[field]):
			add(where, "unknown skill '%s' (use one of: %s)." % [d[field], ", ".join(PackedStringArray(CosmosContentSchema.SKILLS))])

	func optional(d: Dictionary, field: String, kind: String, where: String) -> bool:
		return not d.has(field) or need(d, field, kind, where)

	func point(d: Dictionary, field: String, where: String) -> void:
		if need(d, field, "object", where):
			for axis in ["x", "y"]:
				need(d[field], axis, "number", where + " / " + field)

	func rect(d: Dictionary, where: String) -> void:
		for f in ["x", "y", "width", "height"]:
			need(d, f, "number", where)

	func condition(c, where: String, extra_ops := []) -> void:
		if not c is Dictionary:
			add(where, "a condition must be an object such as {\"op\": \"flag\", \"name\": \"…\"}.")
			return
		var op = c.get("op")
		if not CosmosContentSchema.GRAPH_OPS.has(op) and not extra_ops.has(op):
			add(where, "unknown condition op '%s' (use one of: %s)." % [str(op), ", ".join(PackedStringArray(CosmosContentSchema.GRAPH_OPS + extra_ops))])
			return
		match op:
			"flag":
				need(c, "name", "text", where)
			"skill":
				skill(c, "skill", where)
				need(c, "atLeast", "number", where)
			"all", "any":
				if need(c, "conditions", "list", where):
					for i in c.conditions.size():
						condition(c.conditions[i], "%s / %s #%d" % [where, op, i + 1], extra_ops)
			"not":
				condition(c.get("condition"), where + " / not", extra_ops)
			"visits":
				need(c, "hotspot", "text", where)
				need(c, "atMost", "number", where)
			"hasNews":
				need(c, "encounter", "text", where)


## Problems in a scene file (layout, hotspots, interaction rules).
static func scene(data: Dictionary, file_label: String) -> Array:
	var r := _Report.new(file_label)
	r.fields(data, "scene", "top")
	if r.need(data, "map", "object", "map"):
		var m: Dictionary = data.map
		r.fields(m, "map", "map")
		for f in ["width", "height", "tileSize", "margin"]:
			r.need(m, f, "number", "map")
		r.point(m, "spawn", "map")
		if r.optional(m, "extra_obstacles", "list", "map"):
			for i in m.get("extra_obstacles", []).size():
				var o = m.extra_obstacles[i]
				if o is Dictionary:
					r.rect(o, "map / extra_obstacles #%d" % (i + 1))
				else:
					r.add("map / extra_obstacles #%d" % (i + 1), "must be an object with x, y, width, height.")
	if r.need(data, "shore", "object", "shore"):
		r.need(data.shore, "beach", "number", "shore")
		r.need(data.shore, "water", "number", "shore")
		if r.need(data.shore, "pier", "object", "shore"):
			r.need(data.shore.pier, "from", "number", "shore / pier")
			r.need(data.shore.pier, "to", "number", "shore / pier")
	var hotspot_ids := {}
	if r.need(data, "hotspots", "list", "hotspots"):
		for i in data.hotspots.size():
			var h = data.hotspots[i]
			var where := "hotspot #%d" % (i + 1)
			if not h is Dictionary:
				r.add(where, "must be an object.")
				continue
			if r.need(h, "id", "text", where):
				where = "hotspot '%s'" % h.id
				if hotspot_ids.has(h.id):
					r.add(where, "two hotspots use this id.")
				hotspot_ids[h.id] = true
			r.fields(h, "hotspot", where)
			r.need(h, "kind", "text", where)
			r.point(h, "point", where)
			r.need(h, "radius", "number", where)
			r.need(h, "markerHeight", "number", where)
			r.need(h, "label_key", "text", where)
			r.need(h, "description_key", "text", where)
	for group in ["structures", "figures"]:
		if not r.need(data, group, "list", group):
			continue
		for i in data[group].size():
			var s = data[group][i]
			var where := "%s #%d" % [group, i + 1]
			if not s is Dictionary:
				r.add(where, "must be an object.")
				continue
			if r.need(s, "id", "text", where):
				where = "%s '%s'" % [group.trim_suffix("s"), s.id]
			r.fields(s, group.trim_suffix("s"), where)
			r.need(s, "kind", "text", where)
			if group == "structures":
				if r.need(s, "footprint", "object", where):
					r.rect(s.footprint, where + " / footprint")
				r.need(s, "height", "number", where)
				r.optional(s, "roof", "number", where)
			else:
				r.point(s, "position", where)
				r.need(s, "heading", "number", where)
			if s.has("visual") and not s.visual is String:
				r.add(where, "'visual' must be a path to a scene, or \"\".")
			if r.optional(s, "hotspot", "text", where) and s.has("hotspot") and not hotspot_ids.has(s.hotspot):
				r.add(where, "uses hotspot '%s', which is not in \"hotspots\"." % s.hotspot)
	if data.has("player"):
		if not data.player is Dictionary:
			r.add("player", "must be an object.")
		else:
			r.fields(data.player, "player", "player")
			if data.player.has("visual") and not data.player.visual is String:
				r.add("player", "'visual' must be a path to a scene, or \"\".")
	var chapters: Dictionary = data.get("chapters", {}) if data.get("chapters") is Dictionary else {}
	if data.has("chapters") and not data.chapters is Dictionary:
		r.add("chapters", "must be an object.")
	for id in chapters:
		if not chapters[id] is Dictionary or not _str(chapters[id].get("note_key")):
			r.add("chapter '%s'" % id, "needs a 'note_key'.")
	if r.optional(data, "interactions", "object", "interactions"):
		for hotspot_id in data.get("interactions", {}):
			var where := "interactions / %s" % hotspot_id
			if hotspot_id != "*" and not hotspot_ids.has(hotspot_id):
				r.add(where, "there is no hotspot with this id.")
			var rules = data.interactions[hotspot_id]
			if not rules is Array:
				r.add(where, "must be a list of rules.")
				continue
			for i in rules.size():
				var rule = rules[i]
				var rw := "%s rule #%d" % [where, i + 1]
				if not rule is Dictionary:
					r.add(rw, "must be an object with \"do\".")
					continue
				r.fields(rule, "rule", rw)
				if rule.has("when"):
					r.condition(rule.when, rw + " / when", SCENE_OPS)
				if not r.need(rule, "do", "object", rw):
					continue
				var action: Dictionary = rule.do
				r.fields(action, "do", rw + " / do")
				var kinds := ["encounter", "chapter", "remark_key"].filter(func(k): return action.has(k))
				if kinds.size() != 1:
					r.add(rw, "\"do\" needs exactly one of: encounter, chapter, remark_key.")
				for k in kinds:
					r.need(action, k, "text", rw)
				if action.has("chapter") and action.chapter is String and not chapters.has(action.chapter):
					r.add(rw, "chapter '%s' is not in \"chapters\"." % action.chapter)
				if action.has("voice"):
					if r.need(action, "voice", "object", rw):
						r.fields(action.voice, "voice", rw + " / voice")
						r.skill(action.voice, "skill", rw + " / voice")
						r.need(action.voice, "text_key", "text", rw + " / voice")
						if action.voice.has("when"):
							r.condition(action.voice.when, rw + " / voice / when", SCENE_OPS)
	return r.problems


## Problems in a conversation file. Graph structure (edges, endings) is
## checked afterwards by CosmosGraph.validate.
static func encounter(data: Dictionary, file_label: String) -> Array:
	var r := _Report.new(file_label)
	r.fields(data, "encounter", "top")
	r.need(data, "id", "text", "top")
	r.need(data, "title_key", "text", "top")
	r.need(data, "place_key", "text", "top")
	if r.need(data, "exits", "list", "top"):
		for x in data.exits:
			if not _str(x):
				r.add("exits", "every exit must be a choice id (text).")
	r.optional(data, "concluded_flag", "text", "top")
	if r.need(data, "graph", "object", "top"):
		var g: Dictionary = data.graph
		r.need(g, "start", "text", "graph")
		if r.need(g, "cards", "object", "graph"):
			for id in g.cards:
				_card(r, id, g.cards[id])
	if r.optional(data, "consequences", "list", "top"):
		for i in data.get("consequences", []).size():
			_consequence(r, data.consequences[i], "consequence #%d" % (i + 1))
	return r.problems


static func _card(r: _Report, id: String, card) -> void:
	var where := "card '%s'" % id
	if not card is Dictionary:
		r.add(where, "must be an object.")
		return
	if card.get("id") != id:
		r.add(where, "its \"id\" must be '%s' (the same as its name in \"cards\")." % id)
	var type = card.get("type")
	if not CARD_TYPES.has(type):
		r.add(where, "\"type\" must be one of: %s." % ", ".join(PackedStringArray(CARD_TYPES)))
		return
	r.fields(card, "card", where)
	r.optional(card, "speaker", "text", where)
	r.optional(card, "text_key", "text", where)
	r.optional(card, "prompt_key", "text", where)
	if card.has("sets") and not CosmosStateRules._is_string_array(card.sets):
		r.add(where, "\"sets\" must be a list of flag names.")
	match type:
		"line":
			r.need(card, "next", "text", where)
			r.need(card, "text_key", "text", where)
		"passive":
			r.need(card, "next", "text", where)
			if r.need(card, "probes", "list", where):
				for i in card.probes.size():
					var p = card.probes[i]
					var pw := "%s / voice #%d" % [where, i + 1]
					if not p is Dictionary:
						r.add(pw, "must be an object.")
						continue
					r.fields(p, "probe", pw)
					r.need(p, "id", "text", pw)
					r.skill(p, "skill", pw)
					r.need(p, "atLeast", "number", pw)
					r.need(p, "text_key", "text", pw)
		"fork":
			r.need(card, "otherwise", "text", where)
			if r.need(card, "routes", "list", where):
				for i in card.routes.size():
					var route = card.routes[i]
					var rw := "%s / route #%d" % [where, i + 1]
					if not route is Dictionary:
						r.add(rw, "must be an object with \"when\" and \"next\".")
						continue
					r.fields(route, "route", rw)
					r.condition(route.get("when"), rw + " / when")
					r.need(route, "next", "text", rw)
		"choice":
			if r.need(card, "choices", "list", where):
				for i in card.choices.size():
					_choice(r, card.choices[i], "%s / choice #%d" % [where, i + 1])


static func _choice(r: _Report, choice, where: String) -> void:
	if not choice is Dictionary:
		r.add(where, "must be an object.")
		return
	if r.need(choice, "id", "text", where):
		where = where.get_slice(" / ", 0) + " / choice '%s'" % choice.id
	r.fields(choice, "choice", where)
	r.need(choice, "label_key", "text", where)
	r.need(choice, "next", "text", where)
	if choice.has("when"):
		r.condition(choice.when, where + " / when")
	if choice.has("flags") and not CosmosStateRules._is_string_array(choice.flags):
		r.add(where, "\"flags\" must be a list of flag names.")
	if not choice.has("check"):
		return
	if not r.need(choice, "check", "object", where):
		return
	var k: Dictionary = choice.check
	var kw := where + " / check"
	r.fields(k, "check", kw)
	r.need(k, "id", "text", kw)
	if k.get("kind") != "white" and k.get("kind") != "red":
		r.add(kw, "\"kind\" must be \"white\" or \"red\".")
	r.skill(k, "skill", kw)
	r.need(k, "difficulty", "number", kw)
	r.need(k, "success", "text", kw)
	r.need(k, "failure", "text", kw)
	if r.optional(k, "modifiers", "list", kw):
		for i in k.get("modifiers", []).size():
			var m = k.modifiers[i]
			var mw := "%s / modifier #%d" % [kw, i + 1]
			if not m is Dictionary:
				r.add(mw, "must be an object.")
				continue
			r.fields(m, "modifier", mw)
			r.condition(m.get("when"), mw + " / when")
			r.need(m, "amount", "number", mw)
			r.need(m, "reason_key", "text", mw)


static func _consequence(r: _Report, rule, where: String) -> void:
	if not rule is Dictionary:
		r.add(where, "must be an object.")
		return
	r.fields(rule, "consequence", where)
	if rule.has("when"):
		r.condition(rule.when, where + " / when")
	r.optional(rule, "when_new", "text", where)
	if not rule.has("evidence") and not rule.has("bonpland"):
		r.add(where, "gives nothing: add \"evidence\" or \"bonpland\".")
	if rule.has("evidence") and r.need(rule, "evidence", "object", where):
		var e: Dictionary = rule.evidence
		var ew := where + " / evidence"
		r.fields(e, "evidence", ew)
		r.need(e, "id", "text", ew)
		if not CosmosStateRules.EVIDENCE_KINDS.has(e.get("kind")):
			r.add(ew, "\"kind\" must be one of: %s." % ", ".join(PackedStringArray(CosmosStateRules.EVIDENCE_KINDS)))
		for f in ["content_key", "source_key", "date_key"]:
			r.need(e, f, "text", ew)
		for f in ["method_key", "uncertainty_key", "location_key"]:
			r.optional(e, f, "text", ew)
	if rule.has("bonpland") and r.need(rule, "bonpland", "object", where):
		r.fields(rule.bonpland, "bonpland", where + " / bonpland")
		r.optional(rule.bonpland, "relationship", "number", where + " / bonpland")
		r.optional(rule.bonpland, "morale", "number", where + " / bonpland")
