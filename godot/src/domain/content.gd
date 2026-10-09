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
var load_errors: Array = []


static func load_from(content_root := CONTENT_ROOT, scene_id := "cumana") -> CosmosContent:
	var c := CosmosContent.new()
	c.root = content_root
	c.reload(scene_id)
	return c


func reload(scene_id := "cumana") -> void:
	load_errors = []
	scene = _read_json(root + "/scenes/" + scene_id + ".json")
	map = build_map(scene) if not scene.is_empty() else {}
	encounters = {}
	for file in _list(root + "/dialogue", ".json"):
		var data := _read_json(root + "/dialogue/" + file)
		if not data.is_empty():
			if encounters.has(data.get("id", "")):
				load_errors.append("Two conversation files use the id '%s' (%s)." % [data.id, file])
			encounters[data.get("id", file.get_basename())] = data
	text = {}
	text_sources = {}
	for file in _list(root + "/text", ".csv"):
		_read_csv(root + "/text/" + file, file)


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
		s = entry.get(locale, entry.get("en", ""))
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
	var needed := {}
	for h in scene.hotspots:
		needed[h.label_key] = "hotspot " + h.id
		needed[h.description_key] = "hotspot " + h.id
	for hotspot_id in scene.get("interactions", {}):
		for rule in scene.interactions[hotspot_id]:
			var action: Dictionary = rule.get("do", {})
			if action.has("remark_key"):
				needed[action.remark_key] = "remark at " + hotspot_id
			if action.has("voice"):
				needed[action.voice.text_key] = "voice at " + hotspot_id
			if action.has("encounter") and not encounters.has(action.encounter):
				problems.append("Hotspot '%s' opens conversation '%s', but no file in content/dialogue has that id." % [hotspot_id, action.encounter])
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
					for m in choice.check.get("modifiers", []):
						needed[m.reason_key] = "%s / check %s" % [id, choice.check.id]
			for probe in card.get("probes", []):
				needed[probe.text_key] = "%s / voice %s" % [id, probe.id]
		for rule in e.get("consequences", []):
			if rule.has("evidence"):
				for k in ["content_key", "method_key", "uncertainty_key", "source_key", "location_key"]:
					if rule.evidence.has(k):
						needed[rule.evidence[k]] = "%s / evidence %s" % [id, rule.evidence.id]
	for key in needed:
		if not text.has(key):
			problems.append("Missing text '%s' (used by %s). Add a row to a file in content/text." % [key, needed[key]])
	for s in scene.structures:
		if s.get("visual", "") != "" and not ResourceLoader.exists(s.visual):
			problems.append("Structure '%s' points to a visual that does not exist: %s" % [s.id, s.visual])
	for f in scene.figures:
		if f.get("visual", "") != "" and not ResourceLoader.exists(f.visual):
			problems.append("Figure '%s' points to a visual that does not exist: %s" % [f.id, f.visual])
	return problems


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		load_errors.append("Missing file: " + path)
		return {}
	var raw := FileAccess.get_file_as_string(path)
	var json := JSON.new()
	if json.parse(raw) != OK:
		load_errors.append("%s, line %d: %s" % [path, json.get_error_line(), json.get_error_message()])
		return {}
	if not json.data is Dictionary:
		load_errors.append(path + " must contain a JSON object.")
		return {}
	return json.data


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


func _read_csv(path: String, label: String) -> void:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		load_errors.append("Cannot open " + path)
		return
	var header := f.get_csv_line()
	if header.size() < 2 or header[0] != "key":
		load_errors.append("%s: the first row must be 'key,en' (one column per language)." % label)
		return
	var line := 1
	while not f.eof_reached():
		var row := f.get_csv_line()
		line += 1
		if row.size() == 1 and row[0] == "":
			continue
		var key := row[0].strip_edges()
		if key == "":
			continue
		if text.has(key):
			load_errors.append("Text key '%s' is defined twice (%s and %s:%d)." % [key, text_sources[key], label, line])
		var entry := {}
		for i in range(1, mini(header.size(), row.size())):
			entry[header[i].strip_edges()] = row[i]
		text[key] = entry
		text_sources[key] = "%s:%d" % [label, line]
