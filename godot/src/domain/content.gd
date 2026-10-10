class_name CosmosContent
extends RefCounted
## Loads authored content: scenes, conversations and text tables.
## Nothing in here knows what the content says; writers can change files in
## res://content without touching code. `validate()` reports problems in
## plain language for the content validator and the in-game dev panel.

const CONTENT_ROOT := "res://content"

var root := CONTENT_ROOT
var scene: Dictionary = {}
var map: Dictionary = {}
var encounters: Dictionary = {}
var text := {}           # key -> {locale -> text}
var text_sources := {}   # key -> "file.csv:line"
var locale := "en"
## Languages found as columns in the text tables ("en" first).
var locales: Array = ["en"]
var load_errors: Array = []
## Shape problems found before anything reads the files. A scene with
## problems gets no map; a conversation with problems is left out of
## `encounters` (and listed here) so the game never runs broken data.
var scene_problems: Array = []
var broken_encounters := {}  # id -> problems


static func load_from(content_root := CONTENT_ROOT, scene_id := "cumana") -> CosmosContent:
	var c := CosmosContent.new()
	c.root = content_root
	c.reload(scene_id)
	return c


func reload(scene_id := "cumana") -> void:
	load_errors = []
	scene_problems = []
	broken_encounters = {}
	var scene_file := "scenes/" + scene_id + ".json"
	scene = _read_json(root + "/" + scene_file)
	if not scene.is_empty():
		scene_problems = CosmosContentSchema.scene(scene, scene_file)
	map = build_map(scene) if not scene.is_empty() and scene_problems.is_empty() else {}
	encounters = {}
	var files := {}
	for file in _list(root + "/dialogue", ".json"):
		var data := _read_json(root + "/dialogue/" + file)
		if data.is_empty():
			continue
		var id = data.get("id")
		if not id is String or id == "":
			id = file.get_basename()
		if files.has(id):
			load_errors.append("Two conversation files use the id '%s' (%s and %s)." % [id, files[id], file])
		files[id] = file
		var problems := CosmosContentSchema.encounter(data, "dialogue/" + file)
		if problems.is_empty():
			encounters[id] = data
		else:
			broken_encounters[id] = problems
	text = {}
	text_sources = {}
	locales = ["en"]
	for file in _list(root + "/text", ".csv"):
		_read_csv(root + "/text/" + file, file)


## The scene can be played: it was read and has every field the game needs.
func usable() -> bool:
	return not scene.is_empty() and not map.is_empty()


## Colliders come from the authored structures, figures and shore, in the
## same order as the TypeScript map (parity tests rely on it).
static func build_map(scene_data: Dictionary) -> Dictionary:
	var m: Dictionary = scene_data.map
	var obstacles: Array = []
	for s in scene_data.structures:
		obstacles.append(s.footprint.duplicate())
	for f in scene_data.figures:
		obstacles.append(figure_collider(f))
	for o in m.get("extra_obstacles", []):
		obstacles.append(o.duplicate())
	return {
		"width": m.width, "height": m.height, "tileSize": m.tileSize, "margin": m.margin,
		"spawn": m.spawn.duplicate(), "obstacles": obstacles, "hotspots": scene_data.hotspots.duplicate(true),
	}


static func figure_collider(figure: Dictionary) -> Dictionary:
	return {"x": figure.position.x - 12.0, "y": figure.position.y - 11.0, "width": 24.0, "height": 22.0}


## Text for a key in the current locale. Missing text is shown as ⟦key⟧ so
## writers can spot it in-game instead of seeing an empty line.
func t(key, vars := {}) -> String:
	if key == null or str(key) == "":
		return ""
	var entry = text.get(key)
	var s := ""
	if entry is Dictionary:
		s = entry.get(locale, "")
		if s == "":
			s = entry.get("en", "")
	if s == "":
		return "⟦" + str(key) + "⟧"
	for k in vars:
		s = s.replace("{" + str(k) + "}", str(vars[k]))
	return s


func has_text(key) -> bool:
	return key != null and text.has(key)


func encounter(id: String) -> Dictionary:
	return encounters.get(id, {})


func hotspot(id: String) -> Dictionary:
	for h in scene.get("hotspots", []):
		if h.id == id:
			return h
	return {}


## Problems a writer or artist should fix, as readable sentences.
func validate() -> Array:
	var problems: Array = load_errors.duplicate()
	if scene.is_empty():
		problems.append("The scene file could not be read.")
		return problems
	problems.append_array(scene_problems)
	for id in broken_encounters:
		problems.append_array(broken_encounters[id])
	if not scene_problems.is_empty():
		return problems
	var needed := {}
	for h in scene.hotspots:
		needed[h.label_key] = "hotspot " + h.id
		needed[h.description_key] = "hotspot " + h.id
	for hotspot_id in scene.get("interactions", {}):
		for rule in scene.interactions[hotspot_id]:
			var action: Dictionary = rule.do
			if action.has("remark_key"):
				needed[action.remark_key] = "remark at " + hotspot_id
			if action.has("voice"):
				needed[action.voice.text_key] = "voice at " + hotspot_id
			if action.has("encounter") and not encounters.has(action.encounter) and not broken_encounters.has(action.encounter):
				problems.append("Hotspot '%s' opens conversation '%s', but no file in content/dialogue has that id." % [hotspot_id, action.encounter])
	for chapter in scene.get("chapters", {}).values():
		needed[chapter.note_key] = "chapter note"
	for id in encounters:
		var e: Dictionary = encounters[id]
		for err in CosmosGraph.validate(e.graph):
			problems.append("Conversation '%s': %s" % [id, err])
		needed[e.title_key] = "conversation " + id
		needed[e.place_key] = "conversation " + id
		for card in e.graph.cards.values():
			for k in ["text_key", "prompt_key"]:
				if card.has(k):
					needed[card[k]] = "%s / card %s" % [id, card.id]
			if card.has("speaker"):
				needed["speaker." + card.speaker] = "%s / card %s" % [id, card.id]
			for choice in card.get("choices", []):
				needed[choice.label_key] = "%s / choice %s" % [id, choice.id]
				if choice.has("check"):
					needed["ui.check." + choice.check.kind] = "%s / check %s" % [id, choice.check.id]
					for m in choice.check.get("modifiers", []):
						needed[m.reason_key] = "%s / check %s" % [id, choice.check.id]
			for probe in card.get("probes", []):
				needed[probe.text_key] = "%s / voice %s" % [id, probe.id]
		for rule in e.get("consequences", []):
			if rule.has("evidence"):
				for k in ["content_key", "method_key", "uncertainty_key", "source_key", "location_key"]:
					if rule.evidence.has(k):
						needed[rule.evidence[k]] = "%s / evidence %s" % [id, rule.evidence.id]
				for p in ["july", "november"]:
					needed[rule.evidence.date_key.replace("$period", p)] = "%s / evidence %s" % [id, rule.evidence.id]
	for key in needed:
		if not text.has(key):
			problems.append("Missing text '%s' (used by %s). Add a row to a file in content/text." % [key, needed[key]])
	for group in ["structures", "figures"]:
		for s in scene[group]:
			for p in visual_problems(s.get("visual", ""), group.trim_suffix("s")):
				problems.append("%s '%s': %s" % [group.trim_suffix("s").capitalize(), s.id, p])
	var player_visual = scene.get("player", {}).get("visual", "")
	if player_visual is String:
		for p in visual_problems(player_visual, "figure"):
			problems.append("The player: " + p)
	return problems


const VISUAL_METHODS := {
	"structure": ["configure", "apply_state"],
	"figure": ["configure", "set_pose", "apply_state"],
}


## What is wrong with a replacement visual scene, in an artist's words
## ("" means the provisional drawing is used, which is always fine).
static func visual_problems(path: String, role: String) -> Array:
	if path == "":
		return []
	if not ResourceLoader.exists(path):
		return ["the visual %s does not exist." % path]
	var packed = load(path)
	if not packed is PackedScene:
		return ["the visual %s is not a scene (.tscn)." % path]
	var node: Node = packed.instantiate()
	var problems: Array = []
	var missing: Array = VISUAL_METHODS[role].filter(func(m): return not node.has_method(m))
	if not missing.is_empty():
		var script := "res://art/sprite_structure.gd" if role == "structure" else "res://art/sprite_figure.gd"
		problems.append("the visual %s has no visual script on its root node (attach %s)." % [path, script])
	else:
		var sprite := node.get_node_or_null("Sprite")
		var base = node.get_script().resource_path if node.get_script() != null else ""
		if base == "res://art/sprite_structure.gd" and not (sprite is Sprite2D and sprite.texture != null):
			problems.append("the visual %s needs a Sprite2D child named \"Sprite\" with a picture." % path)
		elif base == "res://art/sprite_figure.gd":
			if not (sprite is AnimatedSprite2D and sprite.sprite_frames != null):
				problems.append("the visual %s needs an AnimatedSprite2D child named \"Sprite\" with SpriteFrames." % path)
			else:
				var unpainted: Array = []
				for state in ["idle", "walk"]:
					for dir in node.DIRECTIONS:
						if not node.can_show(state, dir):
							unpainted.append(state + "_" + dir)
				if not unpainted.is_empty():
					problems.append("the visual %s has no animation for %s (paint them, or add plain \"idle\" and \"walk\" animations)." % [path, ", ".join(PackedStringArray(unpainted))])
	node.free()
	return problems


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		load_errors.append("Missing file: " + path)
		return {}
	var parsed := CosmosJson.parse_detailed(FileAccess.get_file_as_string(path))
	if not parsed.ok:
		load_errors.append("%s, line %d: %s" % [path, parsed.line, parsed.message])
		return {}
	if not parsed.data is Dictionary:
		load_errors.append(path + " must contain a JSON object.")
		return {}
	return parsed.data


func _list(dir_path: String, extension: String) -> Array:
	var files: Array = []
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return files
	for f in dir.get_files():
		if f.ends_with(extension):
			files.append(f)
	files.sort()
	return files


## CSV as spreadsheets write it: commas separate cells, a cell in double
## quotes may contain commas, line breaks and "" for a quote. A quote in the
## middle of an unquoted cell is just a character (an inch mark, say).
## Line numbers are the file's real lines, so messages point at the row.
func _read_csv(path: String, label: String) -> void:
	if not FileAccess.file_exists(path):
		load_errors.append("Cannot open " + path)
		return
	var raw := FileAccess.get_file_as_string(path)
	if raw.begins_with("\ufeff"):
		raw = raw.substr(1)
	var rows := parse_csv(raw)
	if rows.is_empty() or rows[0].cells.size() < 2 or rows[0].cells[0].strip_edges() != "key":
		load_errors.append("%s: the first row must be 'key,en' (one column per language)." % label)
		return
	var header: Array = rows[0].cells
	for column in header.slice(1):
		var code := String(column).strip_edges()
		if code != "" and not locales.has(code):
			locales.append(code)
	for r in rows.slice(1):
		if r.has("error"):
			load_errors.append("%s:%d: %s" % [label, r.line, r.error])
			continue
		var row: Array = r.cells
		var key := String(row[0]).strip_edges()
		if key == "":
			continue
		if row.size() > header.size():
			load_errors.append("%s:%d: row '%s' has more cells than the header (%d). Put text with commas in double quotes." % [label, r.line, key, header.size()])
		if text.has(key):
			load_errors.append("Text key '%s' is defined twice (%s and %s:%d)." % [key, text_sources[key], label, r.line])
		var entry := {}
		for i in range(1, mini(header.size(), row.size())):
			entry[String(header[i]).strip_edges()] = row[i]
		text[key] = entry
		text_sources[key] = "%s:%d" % [label, r.line]


## Rows of {cells, line} (line = where the row starts), or {error, line}
## for a quoted cell that is never closed.
static func parse_csv(raw: String) -> Array:
	var rows: Array = []
	var cells: Array = []
	var cell := ""
	var quoted := false
	var at_cell_start := true
	var line := 1
	var row_line := 1
	var i := 0
	var n := raw.length()
	while i < n:
		var ch := raw[i]
		if quoted:
			if ch == "\"":
				if i + 1 < n and raw[i + 1] == "\"":
					cell += "\""
					i += 1
				else:
					quoted = false
			else:
				if ch == "\n":
					line += 1
				cell += ch
		elif ch == "\"" and at_cell_start:
			quoted = true
			at_cell_start = false
		elif ch == ",":
			cells.append(cell)
			cell = ""
			at_cell_start = true
		elif ch == "\n" or ch == "\r":
			if ch == "\r" and i + 1 < n and raw[i + 1] == "\n":
				i += 1
			cells.append(cell)
			if not (cells.size() == 1 and cells[0] == ""):
				rows.append({"cells": cells, "line": row_line})
			cells = []
			cell = ""
			at_cell_start = true
			line += 1
			row_line = line
		else:
			cell += ch
			at_cell_start = false
		i += 1
	if quoted:
		rows.append({"error": "a cell opened with a double quote is never closed (it swallows the rest of the file).", "line": row_line, "cells": []})
		return rows
	if not at_cell_start or cell != "" or not cells.is_empty():
		cells.append(cell)
		if not (cells.size() == 1 and cells[0] == ""):
			rows.append({"cells": cells, "line": row_line})
	return rows
