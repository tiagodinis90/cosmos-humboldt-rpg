extends CosmosTestCase
## Plays the real main scene through input events: click Bonpland, walk up,
## talk, take a red check with fixed dice, close, reload, and check that the
## position and the consequences survived. Uses a separate save file.

const TEST_SAVE := "user://test_gameplay_save.json"

var tree: SceneTree
var main: Node
var world: CosmosWorld
var hud: CanvasLayer


func setup(t: SceneTree) -> void:
	tree = t
	Session.save_path = TEST_SAVE
	_delete_save()
	Session.autosave = true
	Session.load_game()
	Session.dice = func() -> float: return 0.5
	await _spawn()


func teardown(_t: SceneTree) -> void:
	main.queue_free()
	await tree.process_frame
	_delete_save()
	Session.save_path = Session.DEFAULT_SAVE_PATH
	Session.ui_blocking = false


func _delete_save() -> void:
	if FileAccess.file_exists(TEST_SAVE):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(TEST_SAVE))


func _spawn() -> void:
	main = load("res://scenes/main.tscn").instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	world = main.get_node("World")
	hud = main.get_node("Hud")
	world.set_process(false)  # the test drives time with fixed steps
	world.step(1.0 / 60.0)


func _steps(n: int) -> void:
	for i in n:
		world.step(1.0 / 60.0)


func _click(viewport_pos: Vector2) -> void:
	for pressed in [true, false]:
		var ev := InputEventMouseButton.new()
		ev.button_index = MOUSE_BUTTON_LEFT
		ev.pressed = pressed
		ev.position = viewport_pos
		ev.global_position = viewport_pos
		# Local coordinates: the headless window has no real stretch transform.
		tree.root.push_input(ev, true)


func _key(code: Key) -> void:
	for pressed in [true, false]:
		var ev := InputEventKey.new()
		ev.physical_keycode = code
		ev.keycode = code
		ev.pressed = pressed
		tree.root.push_input(ev, true)


func _walk_until(predicate: Callable, max_steps := 2400) -> bool:
	for i in max_steps:
		if predicate.call():
			return true
		world.step(1.0 / 60.0)
	return predicate.call()


func _bonpland() -> Dictionary:
	return CosmosWalker.find_hotspot(world.map, "bonpland")


func _talk_to_bonpland() -> void:
	var b := _bonpland()
	_click(world.world_to_viewport(b.point, 30.0))
	ok(not world.walker.route.is_empty(), "clicking Bonpland starts a walk (no remote conversation)")
	eq(Session.state.activeEncounter, null, "no dialogue before arrival")
	ok(_walk_until(func(): return Session.state.activeEncounter == "bonpland"), "dialogue opens on arrival")


## Press Space through lines until a choice card is showing.
func _continue_to_choices() -> void:
	for i in 8:
		var a := CosmosEncounters.active(Session.state, Session.content)
		if a.is_empty() or a.encounter.graph.cards[a.progress.nodeId].type != "line":
			return
		_key(KEY_SPACE)


func _choose(id: String) -> void:
	var offered: Array = hud.dialogue.offered_choices()
	var index := offered.find(id)
	ok(index >= 0, "choice %s is offered (offered: %s)" % [id, offered])
	if index >= 0:
		_key(KEY_1 + index)


func test_click_walk_talk_red_check_and_reload() -> void:
	var start: Dictionary = world.walker.position
	await _talk_to_bonpland()
	var b := _bonpland()
	var d := CosmosNav.distance(world.walker.position, b.point)
	ok(d <= b.radius, "stopped inside the interaction radius (%.1f)" % d)
	ok(d >= CosmosWalker.PERSONAL_SPACE - world.map.tileSize, "kept a conversational distance (%.1f)" % d)
	ok(CosmosNav.distance(world.walker.position, start) > 50.0, "Humboldt actually walked")
	var facing := CosmosIso.screen_facing(world.walker.heading)
	var towards := CosmosIso.screen_facing(atan2(b.point.y - world.walker.position.y, b.point.x - world.walker.position.x))
	eq(facing, towards, "faces Bonpland")
	await tree.process_frame
	ok(hud.dialogue.visible, "dialogue panel is visible over the scene")
	ok(world.visible, "the scene stays on screen")
	var position_at_talk: Dictionary = world.walker.position.duplicate()

	# Clicking the world while talking does nothing.
	_click(Vector2(100, 600))
	eq(world.walker.route, [], "world input is paused during dialogue")

	_continue_to_choices()
	_choose("bon.help")
	_continue_to_choices()
	Session.dice = func() -> float: return 0.9999  # double six: always passes
	_choose("bon.walls")
	var progress: Dictionary = Session.state.dialogues.bonpland
	ok(progress.lastRoll != null and progress.lastRoll.passed, "red check rolled and passed with fixed dice")
	eq([progress.lastRoll.first, progress.lastRoll.second], [6, 6], "dice came from the injected source")
	_continue_to_choices()
	ok(not hud.dialogue.offered_choices().has("bon.walls"), "a red check is gone once tried")
	_choose("bon.leave")
	_key(KEY_SPACE)  # end conversation
	eq(Session.state.activeEncounter, null, "conversation closed")
	ok(Session.state.flags.has("bonpland_will_assist_survey"), "consequence: Bonpland will help with the survey")
	ok(Session.state.flags.has("bonpland_helped_press"), "consequence: helped with the press")
	eq(int(Session.state.bonpland.relationship), 1, "relationship changed once")
	ok(Session.state.checks.red.has("bonpland_priorities"), "red check recorded in the persistent ledger")
	ok(Session.state.evidence.any(func(e): return e.id == "bonpland_assist"), "fieldbook entry recorded")
	near(world.walker.position, position_at_talk, 1e-9, "dialogue did not move Humboldt")

	# The save on disk already has all of this.
	var saved = CosmosSave.decode(FileAccess.get_file_as_string(TEST_SAVE))
	ok(saved != null, "save file decodes")
	near(saved.exploration.position, position_at_talk, 1e-6, "saved position")
	ok(saved.flags.has("bonpland_will_assist_survey"), "saved flags")

	# Restart: free the scene, load from disk, build again.
	main.queue_free()
	await tree.process_frame
	Session.load_game()
	await _spawn()
	near(world.walker.position, position_at_talk, 1e-6, "Humboldt is where he stood after reload")
	near(world.walker.heading, saved.exploration.heading, 1e-6, "and faces the same way")
	ok(Session.state.flags.has("bonpland_helped_press"), "consequences survive reload")
	var press = world._structures["plant-press"].node
	ok(press.flags.has("bonpland_helped_press"), "the press visual shows the stacked papers")

	# Talking again: the red check stays consumed across conversations and reloads.
	Session.set_state(CosmosEncounters.open(Session.state, "bonpland", Session.content))
	await tree.process_frame
	_continue_to_choices()
	var offered: Array = hud.dialogue.offered_choices()
	ok(not offered.has("bon.walls"), "red check still unavailable after reload (offered %s)" % [offered])
	ok(not offered.has("bon.help"), "covered topic not repeated")
	ok(offered.has("bon.method"), "new topic still available")


func test_failed_red_check_has_its_own_consequence() -> void:
	await _talk_to_bonpland()
	_continue_to_choices()
	Session.dice = func() -> float: return 0.0  # double one: always fails
	_choose("bon.walls")
	ok(not Session.state.dialogues.bonpland.lastRoll.passed, "failed")
	_continue_to_choices()
	_choose("bon.leave")
	_key(KEY_SPACE)
	ok(Session.state.flags.has("bonpland_resents_priorities"), "Bonpland resents it")
	eq(int(Session.state.bonpland.relationship), -1, "relationship fell")
	ok(not Session.state.flags.has("bonpland_will_assist_survey"), "no help with the survey")


func test_keyboard_walk_collides_and_saves() -> void:
	var before: Dictionary = world.walker.position.duplicate()
	Input.action_press("cosmos_up")
	_steps(90)
	Input.action_release("cosmos_up")
	_steps(1)
	ok(CosmosNav.distance(before, world.walker.position) > 100.0, "WASD moved Humboldt")
	ok(not CosmosNav.blocked(world.walker.position, world.map), "never inside an obstacle")
	var saved = CosmosSave.decode(FileAccess.get_file_as_string(TEST_SAVE))
	near(saved.exploration.position, world.walker.position, 1e-6, "position saved when the key is released")
	# Screen-up is world (-1, -1): into the store's front wall at an angle.
	# Humboldt must stop at the facade and slide along it, never enter.
	world.walker = CosmosWalker.create({"x": 500.0, "y": 440.0})
	Input.action_press("cosmos_up")
	_steps(60)
	Input.action_release("cosmos_up")
	ok(world.walker.position.y >= 432.0, "stopped at the facade (y=%.1f)" % world.walker.position.y)
	ok(world.walker.position.x < 470.0, "slid along it (x=%.1f)" % world.walker.position.x)


func test_depth_order_and_occlusion() -> void:
	world.walker = CosmosWalker.create({"x": 585.0, "y": 70.0})
	_steps(30)
	ok(world.depth_index("player") < world.depth_index("store"), "behind the store: drawn before it")
	ok(world.is_occluded("store"), "the store fades when it hides Humboldt")
	world.walker = CosmosWalker.create({"x": 585.0, "y": 520.0})
	_steps(30)
	ok(world.depth_index("player") > world.depth_index("store"), "in front of the store: drawn after it")
	ok(not world.is_occluded("store"), "no fade when he is in front")


func test_camera_follows_within_bounds() -> void:
	for p in [{"x": 40.0, "y": 40.0}, {"x": 1500.0, "y": 860.0}, {"x": 1205.0, "y": 1000.0}, {"x": 150.0, "y": 720.0}]:
		world.walker = CosmosWalker.create(p)
		_steps(240)
		var cam := world.camera_top_left
		ok(cam.x >= world.bounds.minX - 1e-6 and cam.x + world.view.width <= world.bounds.maxX + 1e-6, "camera x inside bounds at %s" % [p])
		ok(cam.y >= world.bounds.minY - 1e-6 and cam.y + world.view.height <= world.bounds.maxY + 1e-6, "camera y inside bounds at %s" % [p])
	world.walker = CosmosWalker.create({"x": 700.0, "y": 650.0})
	_steps(300)
	var player_on_screen := world.world_to_viewport(world.walker.position, 40.0)
	var size := world.get_viewport_rect().size
	ok(player_on_screen.distance_to(size / 2.0) < 4.0, "camera centres Humboldt away from the edges (%s)" % [player_on_screen])


func test_impossible_click_gives_feedback_and_no_movement() -> void:
	var hints: Array = []
	world.hint_requested.connect(func(t): hints.append(t))
	world.walker = CosmosWalker.create({"x": 600.0, "y": 860.0})
	_steps(240)
	var before: Dictionary = world.walker.position.duplicate()
	world.click_screen_point(Vector2(CosmosIso.to_screen({"x": 300.0, "y": 1300.0}).x, CosmosIso.to_screen({"x": 300.0, "y": 1300.0}).y))
	_steps(60)
	near(world.walker.position, before, 0.0, "no movement")
	ok(hints.has(Session.content.t("ui.hint.unreachable")), "player is told (hints: %s)" % [hints])


func test_remark_hotspot_records_visit() -> void:
	var remarks: Array = []
	world.remark_requested.connect(func(h, r): remarks.append(r))
	world.walker = CosmosWalker.create({"x": 1130.0, "y": 640.0})
	_steps(2)
	var plaza: Dictionary = CosmosWalker.find_hotspot(world.map, "plaza")
	world.command(plaza.point, plaza)
	ok(_walk_until(func(): return not remarks.is_empty()), "the square gives a remark")
	eq(remarks[0].text_key, "remark.plaza.first", "first-visit remark")
	eq(int(Session.state.exploration.visits.plaza), 1, "visit recorded")
	world.command(plaza.point, plaza)
	_steps(2)
	eq(remarks[remarks.size() - 1].text_key, "remark.plaza.again", "second visit differs")
