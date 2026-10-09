class_name CosmosWorld
extends Node2D
## The walkable scene. Builds Cumaná from res://content, turns input into
## walker commands, draws markers, sorts depth, fades occluders and moves
## the camera. Every rule (routes, arrival, interaction, consequences) lives
## in the tested domain classes; this node only wires them to Godot.

signal remark_requested(hotspot: Dictionary, result: Dictionary)
signal hint_requested(text: String)

const VIEW_HEIGHT := 620.0
const MARKER_RANGE := 380.0
const OCCLUDERS := ["house", "wall", "seawall", "crates", "tree"]
const STRUCTURE_VISUAL := preload("res://art/provisional/structure_visual.gd")
const FIGURE_VISUAL := preload("res://art/provisional/figure_visual.gd")
const GROUND_VISUAL := preload("res://art/provisional/ground_visual.gd")

var content: CosmosContent
var map: Dictionary
var walker: Dictionary
var view := {"width": 1100.0, "height": VIEW_HEIGHT}
var bounds: Dictionary
var camera_top_left := {"x": 0.0, "y": 0.0}
var show_all := false
var hovered := ""
var ripple := {"pos": Vector2.ZERO, "age": 99.0}

var _keys_moved := false
var _since_commit := 0.0
var _structures := {}      # id -> {node, data, silhouette (PackedVector2Array), alpha}
var _figures := {}         # id -> {node, data}
var _player: Node2D
var _sorted: Node2D
var _overlay: Node2D
var _ground: Node2D
var _camera: Camera2D
var _last_click_ms := -1000


func _ready() -> void:
	_camera = Camera2D.new()
	_camera.name = "Camera"
	add_child(_camera)
	build()
	Session.state_changed.connect(_on_state_changed)
	Session.content_reloaded.connect(build)


## (Re)build every visual from content and restore Humboldt from the save.
func build() -> void:
	content = Session.content
	map = content.map.duplicate(true)
	for child in get_children():
		if child != _camera:
			child.queue_free()
	_structures.clear()
	_figures.clear()
	_ground = _instantiate_visual("", GROUND_VISUAL)
	_ground.name = "Ground"
	add_child(_ground)
	_ground.configure(content.scene)
	_sorted = Node2D.new()
	_sorted.name = "Sorted"
	add_child(_sorted)
	for s in content.scene.structures:
		var node := _instantiate_visual(s.get("visual", ""), STRUCTURE_VISUAL)
		node.name = "Structure_" + s.id
		_sorted.add_child(node)
		node.configure(s)
		var silhouette := PackedVector2Array(CosmosIso.box_silhouette(CosmosIso.box_from(s.footprint, s.height), s.get("roof", 0.0)).map(func(p): return Vector2(p.x, p.y)))
		_structures[s.id] = {"node": node, "data": s, "silhouette": silhouette, "alpha": 1.0}
	for f in content.scene.figures:
		var node := _instantiate_visual(f.get("visual", ""), FIGURE_VISUAL)
		node.name = "Figure_" + f.id
		_sorted.add_child(node)
		node.configure(f.kind)
		node.set_pose(CosmosIso.screen_facing(f.heading), false, 0.0)
		_figures[f.id] = {"node": node, "data": f}
	var player_data: Dictionary = content.scene.get("player", {})
	_player = _instantiate_visual(player_data.get("visual", ""), FIGURE_VISUAL)
	_player.name = "Humboldt"
	_sorted.add_child(_player)
	_player.configure("humboldt")
	_overlay = Node2D.new()
	_overlay.name = "Markers"
	_overlay.z_index = 4000
	_overlay.draw.connect(_draw_overlay)
	add_child(_overlay)
	bounds = CosmosIso.screen_bounds(map.width, map.height, 140.0)
	bounds.minY -= 240.0
	var saved := CosmosStateRules.normalize_exploration(Session.state.get("exploration"), map)
	walker = CosmosWalker.create(saved.position, saved.heading)
	_apply_state_to_visuals()
	_update_view()
	camera_top_left = CosmosIso.camera_target(CosmosIso.to_screen(walker.position, 40.0), view, bounds, _camera_offset())
	_place_camera()
	_update_player_visual()
	_sort_and_fade()


func _instantiate_visual(scene_path: String, fallback: Script) -> Node2D:
	if scene_path != "" and ResourceLoader.exists(scene_path):
		var packed: PackedScene = load(scene_path)
		return packed.instantiate()
	var node := Node2D.new()
	node.set_script(fallback)
	return node


func _on_state_changed() -> void:
	_apply_state_to_visuals()


func _apply_state_to_visuals() -> void:
	var flags: Array = Session.state.flags
	var period := CosmosEncounters.period(flags)
	for entry in _structures.values():
		entry.node.apply_state(period, flags)
	for id in _figures:
		var entry: Dictionary = _figures[id]
		entry.node.apply_state(period, flags)
		var pos: Dictionary = entry.data.position
		# In November Inés has moved her stool into the doorway (presentation only).
		var shift := -14.0 if id == "ines" and period == "november" else 0.0
		var s := CosmosIso.to_screen({"x": pos.x, "y": pos.y + shift})
		entry.node.position = Vector2(s.x, s.y)
	_player.apply_state(period, flags)
	if is_instance_valid(_overlay):
		_overlay.queue_redraw()


# --- input -------------------------------------------------------------------------

func input_blocked() -> bool:
	return Session.state.get("activeEncounter") != null or Session.ui_blocking


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if input_blocked():
			return
		var now := Time.get_ticks_msec()
		var run: bool = event.double_click or now - _last_click_ms < 320
		_last_click_ms = now
		click_screen_point(_scene_point(event.position), run)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion:
		var hit := pick(_scene_point(event.position))
		var id: String = hit.get("hotspot", {}).get("id", "")
		if id != hovered:
			hovered = id
			_overlay.queue_redraw()
	elif event.is_action("cosmos_show_interactions"):
		show_all = event.is_pressed()
		_overlay.queue_redraw()


## Viewport pixels to scene coordinates (accounts for camera position and zoom).
func _scene_point(viewport_position: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform().affine_inverse() * viewport_position


## What is under a point in scene (screen) coordinates, front to back:
## {hotspot} for a person/object, otherwise {ground: world point}.
func pick(screen: Vector2) -> Dictionary:
	for h in map.hotspots:
		if _marker_visible(h):
			var m := CosmosIso.to_screen(h.point, h.markerHeight)
			if screen.distance_to(Vector2(m.x, m.y)) <= 16.0:
				return {"hotspot": h}
	var order := _depth_order()
	for k in range(order.size() - 1, -1, -1):
		var id: String = order[k]
		if _figures.has(id):
			var f: Dictionary = _figures[id].data
			var fs: Vector2 = _figures[id].node.position
			if f.has("hotspot") and absf(screen.x - fs.x) <= 16.0 and screen.y >= fs.y - 72.0 and screen.y <= fs.y + 4.0:
				return {"hotspot": CosmosWalker.find_hotspot(map, f.hotspot)}
		elif _structures.has(id):
			var entry: Dictionary = _structures[id]
			if entry.alpha < 0.6:
				continue
			if Geometry2D.is_point_in_polygon(screen, entry.silhouette):
				var s: Dictionary = entry.data
				if s.has("hotspot"):
					return {"hotspot": CosmosWalker.find_hotspot(map, s.hotspot)}
				var hit = CosmosIso.pick_box({"x": screen.x, "y": screen.y}, CosmosIso.box_from(s.footprint, s.height + s.get("roof", 0.0) * 0.5))
				if hit != null:
					return {"ground": hit}
	return {"ground": CosmosIso.to_world({"x": screen.x, "y": screen.y})}


func click_screen_point(screen: Vector2, run := false) -> void:
	var hit := pick(screen)
	if hit.has("hotspot"):
		command(hit.hotspot.point, hit.hotspot, run)
	else:
		command(hit.ground, null, run)


func command(destination: Dictionary, hotspot = null, run := false) -> void:
	if input_blocked():
		return
	var result := CosmosWalker.walk_to(walker, map, destination, hotspot, run)
	walker = result.walker
	if hotspot == null and (result.event == null or result.event.type != "unreachable"):
		var end: Dictionary = walker.route[walker.route.size() - 1] if not walker.route.is_empty() else destination
		var s := CosmosIso.to_screen(end)
		ripple = {"pos": Vector2(s.x, s.y), "age": 0.0}
	if result.event != null:
		_on_walk_event(result.event)
	else:
		hint_requested.emit("")


# --- simulation ----------------------------------------------------------------------

func _process(delta: float) -> void:
	step(delta)


## One frame of simulation; tests call this directly with fixed steps.
func step(dt: float) -> void:
	var event = null
	var moved := false
	if not input_blocked():
		var dir := CosmosIso.world_direction_for_keys(
			Input.is_action_pressed("cosmos_up"), Input.is_action_pressed("cosmos_down"),
			Input.is_action_pressed("cosmos_left"), Input.is_action_pressed("cosmos_right"))
		if dir.x != 0.0 or dir.y != 0.0:
			var before: Dictionary = walker.position
			walker = CosmosWalker.push(walker, map, dir, dt)
			moved = walker.position != before
			_keys_moved = true
		else:
			if _keys_moved:
				_keys_moved = false
				commit()
			if not walker.route.is_empty():
				var result := CosmosWalker.tick(walker, map, dt)
				walker = result.walker
				event = result.event
				moved = true
	if moved:
		_since_commit += dt
		if _since_commit > 1.5 and event == null:
			commit()
	if event != null:
		_since_commit = 0.0
		_on_walk_event(event)
	ripple.age += dt
	_update_player_visual()
	_sort_and_fade(dt)
	_update_view()
	var target := CosmosIso.camera_target(CosmosIso.to_screen(walker.position, 40.0), view, bounds, _camera_offset())
	camera_top_left = CosmosIso.smooth_camera(camera_top_left, target, dt)
	_place_camera()
	_overlay.queue_redraw()


func _on_walk_event(event: Dictionary) -> void:
	match event.type:
		"interact":
			arrive(event.hotspot)
		"arrived":
			commit()
		"out-of-reach":
			commit()
			hint_requested.emit(content.t("ui.hint.out_of_reach", {"name": content.t(content.hotspot(event.hotspot.id).get("label_key"))}))
		"unreachable":
			hint_requested.emit(content.t("ui.hint.unreachable"))


## Save where Humboldt stands (and which way he faces).
func commit() -> void:
	_since_commit = 0.0
	var state := Session.state.duplicate()
	state.exploration = CosmosStateRules.with_position(CosmosStateRules.normalize_exploration(Session.state.get("exploration"), map), walker.position, walker.heading)
	Session.set_state(state)


## Humboldt reached a hotspot: record the visit and do what the content says.
func arrive(hotspot: Dictionary) -> void:
	_since_commit = 0.0
	var result := CosmosEncounters.resolve(Session.state, hotspot.id, content)
	var state := Session.state.duplicate()
	var exploration := CosmosStateRules.with_position(CosmosStateRules.normalize_exploration(Session.state.get("exploration"), map), walker.position, walker.heading)
	state.exploration = CosmosStateRules.record_visit(exploration, hotspot.id)
	match result.kind:
		"encounter":
			walker = CosmosWalker.stop(walker)
			Session.set_state(CosmosEncounters.open(state, result.id, content))
		"chapter":
			Session.set_state(state)
			var chapter: Dictionary = content.scene.get("chapters", {}).get(result.id, {})
			remark_requested.emit(hotspot, {"kind": "remark", "text_key": chapter.get("note_key", ""), "voice": null})
		_:
			Session.set_state(state)
			remark_requested.emit(hotspot, result)


# --- presentation ----------------------------------------------------------------------

func _update_player_visual() -> void:
	var s := CosmosIso.to_screen(walker.position)
	_player.position = Vector2(s.x, s.y)
	_player.set_pose(CosmosIso.screen_facing(walker.heading), not walker.route.is_empty() or _keys_moved, walker.stride)


func _depth_items() -> Array:
	var items: Array = []
	for id in _structures:
		var f: Dictionary = _structures[id].data.footprint
		items.append({"id": id, "minX": f.x, "minY": f.y, "maxX": f.x + f.width, "maxY": f.y + f.height})
	for id in _figures:
		var c := CosmosContent.figure_collider(_figures[id].data)
		items.append({"id": id, "minX": c.x, "minY": c.y, "maxX": c.x + c.width, "maxY": c.y + c.height})
	var p: Dictionary = walker.position
	items.append({"id": "player", "minX": p.x - 6.0, "minY": p.y - 6.0, "maxX": p.x + 6.0, "maxY": p.y + 6.0})
	return items


func _depth_order() -> Array:
	return CosmosIso.depth_order(_depth_items())


## Assign draw order and fade structures that stand between camera and player.
func _sort_and_fade(dt := 1.0) -> void:
	var order := _depth_order()
	var player_index := order.find("player")
	var head := CosmosIso.to_screen(walker.position, 46.0)
	var feet := CosmosIso.to_screen(walker.position, 6.0)
	for i in order.size():
		var id: String = order[i]
		if id == "player":
			_player.z_index = i + 1
		elif _figures.has(id):
			_figures[id].node.z_index = i + 1
		elif _structures.has(id):
			var entry: Dictionary = _structures[id]
			entry.node.z_index = i + 1
			var hides: bool = i > player_index and OCCLUDERS.has(entry.data.kind) and (
				Geometry2D.is_point_in_polygon(Vector2(head.x, head.y), entry.silhouette) or
				Geometry2D.is_point_in_polygon(Vector2(feet.x, feet.y), entry.silhouette))
			var target := 0.32 if hides else 1.0
			entry.alpha = move_toward(entry.alpha, target, dt * 4.0)
			entry.node.modulate.a = entry.alpha


func is_occluded(structure_id: String) -> bool:
	return _structures.has(structure_id) and _structures[structure_id].alpha < 0.99


func depth_index(id: String) -> int:
	if id == "player":
		return _player.z_index
	if _figures.has(id):
		return _figures[id].node.z_index
	return _structures[id].node.z_index if _structures.has(id) else -1


func _update_view() -> void:
	var size := get_viewport_rect().size
	var aspect := maxf(0.3, size.x / maxf(1.0, size.y))
	if aspect < 0.85:
		view = {"width": 560.0, "height": 560.0 / aspect}
	elif aspect * VIEW_HEIGHT > 1500.0:
		view = {"width": 1500.0, "height": 1500.0 / aspect}
	else:
		view = {"width": aspect * VIEW_HEIGHT, "height": VIEW_HEIGHT}


func _camera_offset() -> Dictionary:
	if Session.state.get("activeEncounter") == null:
		return {"x": 0.0, "y": 0.0}
	var size := get_viewport_rect().size
	if size.x >= size.y * 1.2:
		return {"x": view.width * 0.2, "y": 0.0}
	return {"x": 0.0, "y": view.height * 0.26}


func _place_camera() -> void:
	var size := get_viewport_rect().size
	var zoom: float = size.y / view.height
	_camera.zoom = Vector2(zoom, zoom)
	_camera.position = Vector2(camera_top_left.x + view.width / 2.0, camera_top_left.y + view.height / 2.0)


func _marker_visible(h: Dictionary) -> bool:
	return show_all or hovered == h.id or CosmosNav.distance(walker.position, h.point) < MARKER_RANGE


func _draw_overlay() -> void:
	if not walker.route.is_empty():
		var pts := PackedVector2Array()
		var start := CosmosIso.to_screen(walker.position)
		pts.append(Vector2(start.x, start.y))
		for r in walker.route:
			var s := CosmosIso.to_screen(r)
			pts.append(Vector2(s.x, s.y))
		for i in pts.size() - 1:
			_overlay.draw_dashed_line(pts[i], pts[i + 1], Color("#f4dfa0", 0.7), 2.0, 4.0)
	if ripple.age < 0.6:
		var t: float = ripple.age / 0.6
		var pts := PackedVector2Array()
		for i in 24:
			var a := float(i) / 24.0 * TAU
			pts.append(ripple.pos + Vector2(cos(a) * 16.0, sin(a) * 8.0) * (0.4 + 1.2 * t))
		pts.append(pts[0])
		_overlay.draw_polyline(pts, Color("#f4dfa0", 0.9 * (1.0 - t)), 2.0, true)
	var font := ThemeDB.fallback_font
	var visits: Dictionary = Session.state.get("exploration", {}).get("visits", {}) if Session.state.get("exploration") is Dictionary else {}
	for h in map.hotspots:
		if not _marker_visible(h):
			continue
		var m := CosmosIso.to_screen(h.point, h.markerHeight)
		var c := Vector2(m.x, m.y)
		var active: bool = hovered == h.id
		var seen := float(visits.get(h.id, 0)) > 0.0
		var colour := Color("#f6d27a") if active else (Color("#b9a77f", 0.75) if seen else Color("#efd08b"))
		var diamond := PackedVector2Array([c + Vector2(0, -8), c + Vector2(7, 0), c + Vector2(0, 8), c + Vector2(-7, 0)])
		_overlay.draw_colored_polygon(diamond, colour)
		diamond.append(diamond[0])
		_overlay.draw_polyline(diamond, Color("#2a2116"), 1.2, true)
		if active or show_all:
			var label: String = content.t(content.hotspot(h.id).get("label_key")) + " · " + content.t("ui.verb." + h.kind)
			var size := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13)
			var box := Rect2(c + Vector2(-size.x / 2.0 - 8.0, -40.0), Vector2(size.x + 16.0, 22.0))
			_overlay.draw_rect(box, Color("#121a17", 0.88))
			_overlay.draw_rect(box, Color("#a98a51"), false, 1.0)
			_overlay.draw_string(font, box.position + Vector2(8, 16), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("#efe2c7"))
			if active:
				var description: String = content.t(content.hotspot(h.id).get("description_key"))
				var dsize := font.get_string_size(description, HORIZONTAL_ALIGNMENT_LEFT, -1, 13)
				_overlay.draw_string_outline(font, c + Vector2(-dsize.x / 2.0, 30), description, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, 4, Color("#1a140c"))
				_overlay.draw_string(font, c + Vector2(-dsize.x / 2.0, 30), description, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("#f5ecd6"))


## Where a world point appears in the viewport (for tests and UI anchoring).
func world_to_viewport(world_point: Dictionary, z := 0.0) -> Vector2:
	var s := CosmosIso.to_screen(world_point, z)
	return get_viewport().get_canvas_transform() * Vector2(s.x, s.y)
