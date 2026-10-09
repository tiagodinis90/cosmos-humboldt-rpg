extends SceneTree
## Builds example "painted" visuals from the PNG templates, to show artists
## how a replacement scene is put together (run after --import):
##   godot --headless --path godot -s res://tools/build_example_scenes.gd
## Writes art/examples/well_painted.tscn and art/examples/humboldt_sprites.tscn.

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://art/examples"))
	_well()
	_humboldt()
	quit()


func _own(node: Node, owner_node: Node) -> void:
	node.owner = owner_node
	for child in node.get_children():
		_own(child, owner_node)


func _well() -> void:
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://art/templates/structures/well.json"))
	var root := Node2D.new()
	root.name = "WellPainted"
	root.set_script(load("res://art/sprite_structure.gd"))
	root.set("anchor_px", Vector2(meta.anchor_px[0], meta.anchor_px[1]))
	var sprite := Sprite2D.new()
	sprite.name = "Sprite"
	sprite.texture = load("res://art/templates/structures/well.png")
	sprite.centered = false
	root.add_child(sprite)
	_own(sprite, root)
	var packed := PackedScene.new()
	packed.pack(root)
	print("well_painted: ", error_string(ResourceSaver.save(packed, "res://art/examples/well_painted.tscn")))


func _humboldt() -> void:
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://art/templates/characters/humboldt_sheet.json"))
	var sheet: Texture2D = load("res://art/templates/characters/humboldt_sheet.png")
	var cell := Vector2(meta.cell_px[0], meta.cell_px[1])
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for row in meta.rows.size():
		var dir: String = meta.rows[row]
		for base in ["idle", "walk"]:
			var name: String = base + "_" + dir
			frames.add_animation(name)
			frames.set_animation_speed(name, 8.0)
			var columns := [0] if base == "idle" else [1, 2, 3, 4, 5, 6, 7, 8]
			for column in columns:
				var atlas := AtlasTexture.new()
				atlas.atlas = sheet
				atlas.region = Rect2(column * cell.x, row * cell.y, cell.x, cell.y)
				frames.add_frame(name, atlas)
	var root := Node2D.new()
	root.name = "HumboldtSprites"
	root.set_script(load("res://art/sprite_figure.gd"))
	var sprite := AnimatedSprite2D.new()
	sprite.name = "Sprite"
	sprite.sprite_frames = frames
	sprite.centered = false
	sprite.offset = -Vector2(meta.feet_px[0], meta.feet_px[1])
	sprite.animation = "idle_s"
	root.add_child(sprite)
	_own(sprite, root)
	var packed := PackedScene.new()
	packed.pack(root)
	print("humboldt_sprites: ", error_string(ResourceSaver.save(packed, "res://art/examples/humboldt_sprites.tscn")))
