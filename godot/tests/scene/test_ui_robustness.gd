extends CosmosTestCase
## The interface never traps or misleads the player: keys reach the right
## panel, one panel at a time, F5 shows edited text in place, a new game
## really starts over, and the graph view draws each edge from its row.

const TEST_SAVE := "user://test_ui_save.json"

var tree: SceneTree
var main: Node
var world: CosmosWorld
var hud: CanvasLayer


func setup(t: SceneTree) -> void:
	tree = t
	Session.content = reference_content()
	Session.save_path = TEST_SAVE
	_delete_save()
	Session.autosave = true
	Session.load_game()
	Session.dice = func() -> float: return 0.5
	main = load("res://scenes/main.tscn").instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	world = main.get_node("World")
	hud = main.get_node("Hud")
	world.set_process(false)
	world.step(1.0 / 60.0)


func teardown(_t: SceneTree) -> void:
	main.queue_free()
	await tree.process_frame
	_delete_save()
	Session.save_path = Session.DEFAULT_SAVE_PATH
	Session.ui_blocking = false
	Session.content = CosmosContent.load_from()


func _delete_save() -> void:
	for path in [TEST_SAVE, TEST_SAVE + ".tmp"]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(path))


func _key(code: Key) -> void:
	for pressed in [true, false]:
		var ev := InputEventKey.new()
		ev.physical_keycode = code
		ev.keycode = code
		ev.pressed = pressed
		tree.root.push_input(ev, true)


func _talk() -> void:
	Session.set_state(CosmosEncounters.open(Session.state, "bonpland", Session.content))


func test_buttons_never_take_keyboard_focus() -> void:
	for path in ["%FieldbookButton", "%DevButton"]:
		eq(hud.get_node(path).focus_mode, Control.FOCUS_NONE, path + " is mouse-only")
	_talk()
	await tree.process_frame
	var dialogue: Control = hud.dialogue
	eq(dialogue.get_node("%Continue").focus_mode, Control.FOCUS_NONE, "Continue is mouse-only")
	hud.get_node("%FieldbookButton").pressed.emit()
	ok(not hud.fieldbook.visible, "the fieldbook does not open over a conversation")
	ok(hud.get_node("%FieldbookButton").disabled, "its button is disabled while talking")
	_key(KEY_J)
	ok(not hud.fieldbook.visible, "neither does J")


func test_panels_one_at_a_time_and_world_stays_blocked() -> void:
	_key(KEY_F1)
	ok(hud.dev.visible and world.input_blocked(), "F1 opens the playtest tools and blocks the world")
	hud.get_node("%FieldbookButton").pressed.emit()
	ok(not hud.fieldbook.visible, "the fieldbook does not open on top of them")
	hud.dev.inspect_requested.emit("bonpland")
	var inspector: Control = hud.get_node("%GraphInspector")
	ok(inspector.visible and not hud.dev.visible, "the graph view replaces the tools")
	ok(world.input_blocked(), "the world stays blocked behind the graph view")
	_key(KEY_J)
	_key(KEY_F1)
	ok(not hud.fieldbook.visible and not hud.dev.visible, "J and F1 wait until the graph view is closed")
	Session.set_blocking("graph", false)
	inspector.visible = false
	ok(not world.input_blocked(), "closing the last panel frees the world")
	Session.set_blocking("a", true)
	Session.set_blocking("b", true)
	Session.set_blocking("a", false)
	ok(world.input_blocked(), "one panel closing does not free the world while another is open")
	Session.set_blocking("b", false)


func test_f5_shows_edited_text_in_an_open_conversation() -> void:
	_talk()
	await tree.process_frame
	var a := CosmosEncounters.active(Session.state, Session.content)
	var key: String = a.encounter.graph.cards[a.progress.nodeId].text_key
	Session.content.text[key] = {"en": "EDITED BY A WRITER"}
	Session.content_reloaded.emit()
	ok(hud.dialogue.get_node("%Log").text.contains("EDITED BY A WRITER"), "the panel redraws with the new text")


func test_reload_keeps_humboldt_where_he_is_and_new_game_resets_him() -> void:
	world.command({"x": world.walker.position.x + 200.0, "y": world.walker.position.y})
	for i in 40:
		world.step(1.0 / 60.0)
	var here: Dictionary = world.walker.position.duplicate()
	Session.content_reloaded.emit()
	ok(CosmosNav.distance(world.walker.position, here) < 0.001, "content reload does not move him (%s vs %s)" % [world.walker.position, here])
	Session.new_game()
	near(world.walker.position, Session.content.map.spawn, 1e-9, "a new game puts him at the start")
	world.commit()
	near(Session.state.exploration.position, Session.content.map.spawn, 1e-9, "and the old position is not written back")


func test_a_conversation_that_cannot_resume_does_not_lock_the_game() -> void:
	var state := CosmosSave.new_state(Session.content.map.spawn)
	state = CosmosEncounters.open(state, "bonpland", Session.content)
	state.dialogues = {"ghost": state.dialogues.bonpland}
	state.activeEncounter = "ghost"
	var f := FileAccess.open(TEST_SAVE, FileAccess.WRITE)
	f.store_string(CosmosSave.encode(state))
	f.close()
	Session.load_game()
	eq(Session.state.activeEncounter, null, "the missing conversation is closed on load")
	ok(not world.input_blocked(), "the player can move")
	_key(KEY_F1)
	ok(hud.dev.visible, "and open the playtest tools")


func test_graph_view_draws_each_edge_from_its_row() -> void:
	var inspector: Control = hud.get_node("%GraphInspector")
	inspector.open("bonpland")
	var graph: GraphEdit = inspector._graph
	var checked := 0
	for conn in graph.get_connection_list():
		var from: GraphNode = graph.get_node(NodePath(conn.from_node))
		var slot := from.get_output_port_slot(conn.from_port)
		var card: Dictionary = Session.content.encounter("bonpland").graph.cards[from.title.get_slice("  [", 0)]
		var link: Dictionary = inspector._links(card)[slot - 1]
		eq(String(conn.to_node), link.to.replace(".", "_"), "%s row %d leads to %s" % [from.name, slot, link.to])
		checked += 1
	ok(checked > 10, "edges checked: %d" % checked)
	inspector.visible = false
	Session.set_blocking("graph", false)


func test_an_unreadable_scene_file_is_explained_and_recovered_with_f5() -> void:
	var good := Session.content
	var broken := CosmosContent.new()
	broken.root = good.root
	broken.load_errors = ["scenes/cumana.json, line 3: Expected value"]
	Session.content = broken
	Session.content_reloaded.emit()
	Session.state_changed.emit()
	ok(not world.playable and world.input_blocked(), "nothing is built or playable")
	world.step(1.0 / 60.0)
	ok(hud.get_node("%MessageText").text.contains("line 3: Expected value"), "the HUD explains the problem")
	Session.content = good
	Session.content_reloaded.emit()
	Session.state_changed.emit()
	ok(world.playable and not world.input_blocked(), "reloading working content brings the scene back")
