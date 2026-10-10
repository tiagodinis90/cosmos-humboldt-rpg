extends CosmosTestCase
## What happens when content or a save is broken: the game explains and
## recovers instead of losing progress or locking up. Content cases edit a
## copy of the reference content under user://, never the real files.

const SCRATCH := "user://test_robustness"


func _session() -> Node:
	return (Engine.get_main_loop() as SceneTree).root.get_node("Session")


func _copy_dir(from: String, to: String) -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(to))
	var dir := DirAccess.open(from)
	for f in dir.get_files():
		if not f.ends_with(".import"):
			DirAccess.copy_absolute(ProjectSettings.globalize_path(from.path_join(f)), ProjectSettings.globalize_path(to.path_join(f)))
	for d in dir.get_directories():
		_copy_dir(from.path_join(d), to.path_join(d))


func _remove_dir(path: String) -> void:
	var dir := DirAccess.open(path)
	if dir == null:
		return
	for f in dir.get_files():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path.path_join(f)))
	for d in dir.get_directories():
		_remove_dir(path.path_join(d))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))


## A copy of the content with one file changed by `edit` (text -> text).
func _content_with(file: String, edit: Callable) -> CosmosContent:
	_remove_dir(SCRATCH)
	_copy_dir(REFERENCE_CONTENT, SCRATCH)
	var path := SCRATCH.path_join(file)
	var text := FileAccess.get_file_as_string(path)
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(edit.call(text))
	f.close()
	return CosmosContent.load_from(SCRATCH)


func _json_edit(change: Callable) -> Callable:
	return func(text: String) -> String:
		var data = CosmosJson.parse(text)
		change.call(data)
		return JSON.stringify(data, "  ", false, true)


func _mentions(problems: Array, words: String) -> bool:
	return problems.any(func(p): return p.contains(words))


func teardown(_t: SceneTree) -> void:
	_remove_dir(SCRATCH)


# --- content mistakes are reported, never "Content OK" -------------------------------

func test_missing_fields_in_a_conversation_are_reported() -> void:
	var c := _content_with("dialogue/bonpland.json", _json_edit(func(d): d.graph.cards["bon.start"].erase("otherwise")))
	var problems := c.validate()
	ok(_mentions(problems, "card 'bon.start': 'otherwise' is missing"), "names the card and field: %s" % [problems])
	ok(not c.encounters.has("bonpland"), "a broken conversation is never handed to the game")
	ok(c.usable(), "the rest of the game still runs")
	ok(not _mentions(problems, "opens conversation 'bonpland', but no file"), "no misleading 'missing file' message")


func test_bad_consequence_condition_is_reported() -> void:
	var c := _content_with("dialogue/bonpland.json", _json_edit(func(d): d.consequences[2].when = "bonpland_method_asked"))
	ok(_mentions(c.validate(), "consequence #3 / when: a condition must be an object"), "a condition written as plain text is caught")


func test_writer_mistakes_have_readable_messages() -> void:
	var cases := {
		"broken next": [_json_edit(func(d): d.graph.cards["bon.helped"].next = "bon.jul_optoins"), "Broken edge bon.helped -> bon.jul_optoins"],
		"unknown op": [_json_edit(func(d): d.graph.cards["bon.jul_options"].choices[0].when = {"op": "flg", "name": "x"}), "unknown condition op 'flg'"],
		"bad check kind": [_json_edit(func(d): d.graph.cards["bon.jul_options"].choices[2].check.kind = "blue"), "\"kind\" must be \"white\" or \"red\""],
		"missing text key": [_json_edit(func(d): d.graph.cards["bon.helped"].text_key = "bonpland.line.nope"), "Missing text 'bonpland.line.nope'"],
		"unknown speaker": [_json_edit(func(d): d.graph.cards["bon.helped"].speaker = "bonplant"), "Missing text 'speaker.bonplant'"],
		"misspelled field": [_json_edit(func(d): d.graph.cards["bon.helped"].text_kye = "x"), "unknown field 'text_kye' (did you mean 'text_key'?)"],
		"unknown skill": [_json_edit(func(d): d.graph.cards["bon.jul_options"].choices[2].check.skill = "empaty"), "unknown skill 'empaty'"],
	}
	for name in cases:
		var c := _content_with("dialogue/bonpland.json", cases[name][0])
		ok(_mentions(c.validate(), cases[name][1]), "%s: %s" % [name, c.validate()])


func test_scene_mistakes_keep_the_game_from_running_broken_data() -> void:
	var syntax := _content_with("scenes/cumana.json", func(t): return t.replace("\"hotspots\": [", "\"hotspots\": [,"))
	ok(not syntax.usable(), "a JSON syntax error makes the scene unusable")
	ok(_mentions(syntax.validate(), "cumana.json, line"), "and the message has the line: %s" % [syntax.validate()])
	var missing := _content_with("scenes/cumana.json", _json_edit(func(d): d.structures[0].erase("footprint")))
	ok(not missing.usable(), "a structure without a footprint makes the scene unusable")
	ok(_mentions(missing.validate(), "structure 'house-west': 'footprint' is missing"), "%s" % [missing.validate()])
	var unknown := _content_with("scenes/cumana.json", _json_edit(func(d): d.interactions.bonpland[0].do.encounter = "bonpland2"))
	ok(_mentions(unknown.validate(), "opens conversation 'bonpland2', but no file"), "unknown conversation in interactions")
	var visual := _content_with("scenes/cumana.json", _json_edit(func(d): d.structures[0].visual = "res://art/painted/nothing.tscn"))
	ok(_mentions(visual.validate(), "Structure 'house-west': the visual res://art/painted/nothing.tscn does not exist"), "broken visual path: %s" % [visual.validate()])


func test_replacement_visuals_are_checked() -> void:
	eq(CosmosContent.visual_problems("res://art/examples/well_painted.tscn", "structure"), [], "the worked structure example is valid")
	eq(CosmosContent.visual_problems("res://art/examples/humboldt_sprites.tscn", "figure"), [], "the worked character example is valid")
	ok(_mentions(CosmosContent.visual_problems("res://scenes/ui/hud.tscn", "structure"), "has no visual script"), "a scene without the visual script is reported")
	var scene := Node2D.new()
	scene.set_script(load("res://art/sprite_figure.gd"))
	var sprite := AnimatedSprite2D.new()
	sprite.name = "Sprite"
	sprite.sprite_frames = SpriteFrames.new()
	sprite.sprite_frames.add_animation("idle_e")
	scene.add_child(sprite)
	sprite.owner = scene
	var packed := PackedScene.new()
	packed.pack(scene)
	scene.free()
	ResourceSaver.save(packed, "user://test_partial_figure.tscn")
	var problems := CosmosContent.visual_problems("user://test_partial_figure.tscn", "figure")
	ok(_mentions(problems, "idle_s") and _mentions(problems, "walk_e") and not _mentions(problems, "idle_w,"), "unpainted directions are listed, mirrored ones are not: %s" % [problems])
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://test_partial_figure.tscn"))


func test_validator_tool_fails_on_broken_content() -> void:
	var c := _content_with("dialogue/bonpland.json", _json_edit(func(d): d.graph.cards["bon.start"].erase("otherwise")))
	ok(not c.validate().is_empty(), "validate() is never empty for broken content")


# --- text tables --------------------------------------------------------------------

func test_csv_reading() -> void:
	var rows := CosmosContent.parse_csv("key,en\na,12\" ruler\nb,\"two\nlines\"\nc,\"say \"\"hi\"\"\"\n\nd,x\n")
	eq(rows.map(func(r): return r.cells), [["key", "en"], ["a", "12\" ruler"], ["b", "two\nlines"], ["c", "say \"hi\""], ["d", "x"]], "quotes, commas and line breaks")
	eq(rows.map(func(r): return r.line), [1, 2, 3, 5, 7], "rows report the line they start on")
	var broken := CosmosContent.parse_csv("key,en\na,\"never closed\nb,x\n")
	ok(broken.back().has("error") and broken.back().line == 2, "an unclosed quote is reported at its line: %s" % [broken])
	var c := _content_with("text/world.csv", func(t): return char(0xFEFF) + t.replace("speaker.bonpland,", "speaker.bonpland,\"oops "))
	ok(_mentions(c.load_errors, "world.csv:3:"), "the unclosed quote is reported with its file and line: %s" % [c.load_errors])
	ok(c.text.has("speaker.narrator"), "a byte-order mark does not hide the first key")


func test_languages_come_from_the_text_tables() -> void:
	var c := _content_with("text/world.csv", func(t): return t.replace("key,en\n", "key,en,pt\n").replace("speaker.bonpland,Bonpland\n", "speaker.bonpland,Bonpland,Bonpland (pt)\n"))
	eq(c.locales, ["en", "pt"], "a new column is a new language")
	c.locale = "pt"
	eq(c.t("speaker.bonpland"), "Bonpland (pt)", "translated cell")
	eq(c.t("speaker.narrator"), "Narrator", "empty cell falls back to English")


# --- broken game state is never saved or shown ------------------------------------------

func test_session_refuses_a_broken_state() -> void:
	var s := _session()
	var saved_path: String = s.save_path
	s.save_path = "user://test_robustness_save.json"
	s.new_game()
	var before := FileAccess.get_file_as_string(s.save_path)
	ok(not s.set_state({}), "an empty state is refused")
	ok(not s.set_state({"flags": "x", "skills": {}, "bonpland": {}}), "a state without required fields is refused")
	eq(FileAccess.get_file_as_string(s.save_path), before, "the save file is untouched")
	ok(s.state.has("flags"), "the game keeps the previous state")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(s.save_path))
	s.save_path = saved_path
	s.load_game()


func test_conversations_that_cannot_start_leave_state_unchanged() -> void:
	var content := reference_content()
	var state := CosmosSave.new_state(content.map.spawn)
	eq(CosmosEncounters.open(state, "nobody", content), null, "unknown conversation")
	content.encounters.bonpland = content.encounters.bonpland.duplicate(true)
	content.encounters.bonpland.graph.cards["bon.start"].routes.insert(0, {"when": {"op": "all", "conditions": []}, "next": "bon.start"})
	eq(CosmosEncounters.open(state, "bonpland", content), null, "a fork loop")


func test_unresumable_conversations_are_closed_on_load() -> void:
	var content := reference_content()
	var state = CosmosEncounters.open(CosmosSave.new_state(content.map.spawn), "bonpland", content)
	state.checks = {"white": {}, "red": ["earlier_red"]}
	var ghost: Dictionary = state.duplicate(true)
	ghost.activeEncounter = "ghost"
	ghost.dialogues = {"ghost": state.dialogues.bonpland}
	var fixed := CosmosEncounters.repair(ghost, content)
	eq(fixed.activeEncounter, null, "a conversation that no longer exists is closed")
	ok(not fixed.dialogues.has("ghost"), "and its progress dropped")
	ok(fixed.checks.red.has("earlier_red"), "checks already tried stay tried")
	var deleted: Dictionary = state.duplicate(true)
	deleted.dialogues.bonpland.nodeId = "bon.deleted_by_writer"
	eq(CosmosEncounters.repair(deleted, content).activeEncounter, null, "a deleted card closes the conversation")
	eq(CosmosEncounters.repair(state, content), state, "a healthy conversation is left alone")
	var odd: Dictionary = state.dialogues.bonpland.duplicate(true)
	odd.transcript = [42]
	ok(not CosmosStateRules.is_graph_progress(odd), "a transcript entry the panel cannot draw is rejected")


# --- saves ------------------------------------------------------------------------------

func test_unreadable_save_is_kept_and_interrupted_save_recovered() -> void:
	var s := _session()
	var saved_path: String = s.save_path
	var dir := "user://test_robustness_saves"
	_remove_dir(dir)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	s.save_path = dir.path_join("save.json")
	var f := FileAccess.open(s.save_path, FileAccess.WRITE)
	f.store_string("{\"format\": \"cosmos-save\", \"version\": 3, \"state\": {}}")
	f.close()
	s.load_game()
	ok(s.last_load_status.begins_with("the save could not be read"), s.last_load_status)
	var copies := Array(DirAccess.get_files_at(dir)).filter(func(n): return n.begins_with("save.unreadable-"))
	eq(copies.size(), 1, "a copy of the refused save is kept before anything can overwrite it")
	# Interrupted save: only the .tmp file holds the newest state.
	DirAccess.remove_absolute(ProjectSettings.globalize_path(s.save_path))
	var state := CosmosSave.new_state({"x": 300.0, "y": 700.0})
	state.flags = ["from_tmp"]
	f = FileAccess.open(s.save_path + ".tmp", FileAccess.WRITE)
	f.store_string(CosmosSave.encode(state))
	f.close()
	s.load_game()
	eq(s.state.flags, ["from_tmp"], "progress is recovered from the .tmp file")
	eq(s.last_load_status, "recovered from an interrupted save")
	_remove_dir(dir)
	s.save_path = saved_path
	s.load_game()


func test_saved_numbers_round_trip_exactly() -> void:
	# 407.59983694574436 is read one bit off by Godot's own JSON parser.
	var b := PackedByteArray([0x79, 0x0e, 0xa0, 0xee, 0x98, 0x79, 0x79, 0x40])
	var x := b.decode_double(0)
	var state := CosmosSave.new_state({"x": x, "y": 700.0})
	state.exploration.heading = 0.1 + 0.2
	var back = CosmosSave.decode(CosmosSave.encode(state))
	ok(back.exploration.position.x == x, "position survives bit for bit")
	ok(back.exploration.heading == 0.1 + 0.2, "heading survives bit for bit")
	# Compared by bits: Godot reads these two literals wrongly too.
	ok(CosmosJson._bits(CosmosJson.to_double("2.2250738585072014e-308")) == 1 << 52, "smallest normal")
	ok(CosmosJson._bits(CosmosJson.to_double("5e-324")) == 1, "smallest subnormal")
	eq(CosmosJson.parse("{\"a\": \"1.5\", \"b\": [1.5, -0.25e1]}"), {"a": "1.5", "b": [1.5, -2.5]}, "numbers inside strings are left alone")
	eq(CosmosJson.parse("[1.2.3]"), null, "malformed numbers are still errors")
