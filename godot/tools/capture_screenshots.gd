extends SceneTree
## Plays a short scripted session in a real window and saves screenshots,
## as evidence that the scene renders and the interaction loop works.
##
##   godot --path godot --rendering-driver opengl3 -s res://tools/capture_screenshots.gd -- --out=/tmp/shots
## (On a machine without a display: xvfb-run -s "-screen 0 1280x720x24" ...)
## Uses its own save file; your game save is not touched.

var out_dir := "user://screenshots"
var session: Node
var main: Node
var world: Node2D
var hud: CanvasLayer


func _initialize() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--out="):
			out_dir = arg.substr(6)
	DirAccess.make_dir_recursive_absolute(out_dir)
	_run.call_deferred()


func _frames(n: int) -> void:
	for i in n:
		await process_frame


func _shot(name: String) -> void:
	await _frames(3)
	var image := root.get_texture().get_image()
	var path := out_dir.path_join(name + ".png")
	image.save_png(path)
	print("saved ", path)


func _click_world(point: Dictionary, z := 0.0) -> void:
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = true
	ev.position = world.world_to_viewport(point, z)
	root.push_input(ev, true)
	ev = ev.duplicate()
	ev.pressed = false
	root.push_input(ev, true)


func _key(code: Key) -> void:
	for pressed in [true, false]:
		var ev := InputEventKey.new()
		ev.physical_keycode = code
		ev.keycode = code
		ev.pressed = pressed
		root.push_input(ev, true)
	await _frames(2)


func _wait_until(predicate: Callable, max_frames := 900) -> void:
	for i in max_frames:
		if predicate.call():
			return
		await process_frame


func _run() -> void:
	session = root.get_node("Session")
	session.save_path = "user://screenshot_session.json"
	if FileAccess.file_exists(session.save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(session.save_path))
	session.load_game()
	main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	world = main.get_node("World")
	hud = main.get_node("Hud")
	await _frames(20)
	await _shot("01_arrival")
	world.show_all = true
	await _shot("02_interactions")
	world.show_all = false
	var b: Dictionary = CosmosWalker.find_hotspot(world.map, "bonpland")
	_click_world(b.point, 30.0)
	await _frames(25)
	await _shot("03_walking_to_bonpland")
	await _wait_until(func(): return session.state.get("activeEncounter") == "bonpland")
	await _frames(40)
	await _shot("04_bonpland_dialogue")
	for i in 3:
		await _key(KEY_SPACE)
	await _key(KEY_1)          # help with the press
	await _key(KEY_SPACE)
	session.dice = func() -> float: return 0.9999
	var offered: Array = hud.dialogue.offered_choices()
	await _key(KEY_1 + offered.find("bon.walls"))
	await _frames(10)
	await _shot("05_red_check")
	await _key(KEY_SPACE)
	offered = hud.dialogue.offered_choices()
	await _key(KEY_1 + offered.find("bon.leave"))
	await _key(KEY_SPACE)
	await _frames(30)
	await _shot("06_after_conversation")
	hud.fieldbook.open()
	await _shot("07_fieldbook")
	hud.fieldbook.close()
	# Walk behind the store to show depth sorting and occlusion.
	world.command({"x": 585.0, "y": 70.0})
	await _wait_until(func(): return world.walker.route.is_empty(), 1800)
	await _frames(40)
	await _shot("08_behind_the_store")
	# Reload from disk: same place, same consequences.
	var pos: Dictionary = world.walker.position
	main.queue_free()
	await _frames(2)
	session.load_game()
	main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	world = main.get_node("World")
	hud = main.get_node("Hud")
	await _frames(30)
	await _shot("09_after_reload")
	print("position before reload ", pos, " after ", world.walker.position)
	hud.dev.toggle()
	await _shot("10_playtest_tools")
	hud.dev.toggle()
	hud.get_node("%GraphInspector").open("bonpland")
	await _frames(10)
	await _shot("11_graph_inspector")
	quit()
