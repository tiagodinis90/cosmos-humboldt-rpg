extends CosmosTestCase
## Every scene in the project loads and instantiates, and the scripts that
## replacement art must follow still expose the visual contract.

func _scenes(dir_path: String, out: Array) -> void:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return
	for f in dir.get_files():
		if f.ends_with(".tscn"):
			out.append(dir_path.path_join(f))
	for d in dir.get_directories():
		_scenes(dir_path.path_join(d), out)


func test_all_scenes_instantiate() -> void:
	var scenes: Array = []
	_scenes("res://scenes", scenes)
	_scenes("res://art", scenes)
	ok(scenes.size() >= 5, "found scenes: %s" % [scenes])
	for path in scenes:
		var packed: PackedScene = load(path)
		ok(packed != null, "loads " + path)
		if packed:
			var node := packed.instantiate()
			ok(node != null, "instantiates " + path)
			if node:
				node.free()


func test_visual_contract() -> void:
	for path in ["res://art/provisional/structure_visual.gd", "res://art/sprite_structure.gd"]:
		var s: Script = load(path)
		var methods: Array = s.get_script_method_list().map(func(m): return m.name)
		for m in ["configure", "apply_state"]:
			ok(methods.has(m), "%s has %s()" % [path, m])
	for path in ["res://art/provisional/figure_visual.gd", "res://art/sprite_figure.gd"]:
		var s: Script = load(path)
		var methods: Array = s.get_script_method_list().map(func(m): return m.name)
		for m in ["configure", "set_pose", "apply_state"]:
			ok(methods.has(m), "%s has %s()" % [path, m])


func test_painted_replacements_work_in_the_scene() -> void:
	var tree := Engine.get_main_loop() as SceneTree
	var saved_path: String = Session.save_path
	Session.save_path = "user://test_visuals_save.json"
	Session.autosave = false
	Session.content = reference_content()
	Session.new_game()
	for s in Session.content.scene.structures:
		if s.id == "well":
			s.visual = "res://art/examples/well_painted.tscn"
	Session.content.scene.player = {"visual": "res://art/examples/humboldt_sprites.tscn"}
	var main: Node = load("res://scenes/main.tscn").instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	var world: CosmosWorld = main.get_node("World")
	world.set_process(false)
	var well = world._structures["well"].node
	ok(well.get_script().resource_path == "res://art/sprite_structure.gd", "the well uses the painted scene from content")
	ok(well.get_node("Sprite").texture != null, "with its texture")
	var player: Node2D = world._player
	ok(player.get_script().resource_path == "res://art/sprite_figure.gd", "Humboldt uses the sprite visual when content says so")
	var sprite: AnimatedSprite2D = player.get_node("Sprite")
	world.command({"x": 600.0, "y": 700.0})
	for i in 20:
		world.step(1.0 / 60.0)
	ok(String(sprite.animation).begins_with("walk_"), "walking plays a walk animation (%s)" % sprite.animation)
	for i in 600:
		world.step(1.0 / 60.0)
	ok(String(sprite.animation).begins_with("idle_"), "standing plays an idle animation (%s)" % sprite.animation)
	main.queue_free()
	await tree.process_frame
	Session.content = CosmosContent.load_from()
	Session.autosave = true
	Session.save_path = saved_path
	Session.load_game()
