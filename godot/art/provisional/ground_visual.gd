extends Node2D
## PROVISIONAL ART. The painted ground of Cumaná: backdrop hills, scrub, the
## cobbled lane, the square, beach, sea, pier and cast shadows. Drawn from
## content/scenes/cumana.json. A painter can replace this node with a single
## large texture (see docs/godot-content-workflow.md, "Replacing the ground").

const K := preload("res://art/provisional/draw_kit.gd")

var _warned := false
var scene: Dictionary = {}
var _time := 0.0

@onready var _waves := Node2D.new()


func configure(scene_data: Dictionary) -> void:
	scene = scene_data
	queue_redraw()


func _ready() -> void:
	_waves.draw.connect(_draw_waves)
	add_child(_waves)


func _process(delta: float) -> void:
	_time += delta
	_waves.queue_redraw()


func _square(x0: float, y0: float, x1: float, y1: float) -> PackedVector2Array:
	return K.poly([K.at(x0, y0), K.at(x1, y0), K.at(x1, y1), K.at(x0, y1)])


func _draw() -> void:
	if scene.is_empty():
		return
	var shore: Dictionary = scene.shore
	var w: float = scene.map.width
	var far := [-1400.0, -1400.0, 3000.0, 2600.0]
	_poly(_square(far[0], far[1], far[2], far[3]), Color("#cdb88d"))
	_backdrop()
	_scrub()
	_poly(K.ground_ellipse(760, 360, 420), Color("#dccaa0", 0.35))
	_cobbles([Vector2(0, 620), Vector2(560, 600), Vector2(760, 470), Vector2(1010, 440), Vector2(1300, 430), Vector2(1380, 640), Vector2(1040, 660), Vector2(800, 690), Vector2(520, 770), Vector2(0, 790)], 3)
	_poly(K.ground_ellipse(1130, 520, 150), Color("#bba982"))
	_cobbles([Vector2(1010, 410), Vector2(1260, 410), Vector2(1290, 630), Vector2(990, 640)], 9)
	_poly(_square(far[0], shore.beach, far[2], shore.water), Color("#e3d3a8"))
	_poly(_square(far[0], shore.water - 14, far[2], shore.water), Color("#b9a57c"))
	_poly(_square(far[0], shore.water, far[2], far[3]), Color("#2d6a6e"))
	_poly(_square(far[0], shore.water + 220, far[2], far[3]), Color("#1f4c55", 0.7))
	# Pier
	var pier: Dictionary = shore.pier
	_poly(_square(pier.from, shore.beach + 20, pier.to, 1500), Color("#7c5c3b"))
	for i in 30:
		var y: float = shore.beach + 30 + i * 22
		draw_line(K.at(pier.from, y), K.at(pier.to, y), Color("#5e4329", 0.7), 1.2, true)
	for i in 6:
		var y: float = shore.water + 40 + i * 100
		for x in [pier.from, pier.to]:
			var p := K.at(x, y)
			draw_rect(Rect2(p.x - 3, p.y, 6, 22), Color("#4a3522"))
	for s in scene.structures:
		_shadow(s)


func _draw_waves() -> void:
	if scene.is_empty():
		return
	var water: float = scene.shore.water
	for i in 6:
		var y := water + 26 + i * 54
		var a := K.at(-1400, y)
		var b := K.at(3000, y)
		var dir := (b - a).normalized()
		var dash := 26.0 + i * 6.0
		var gap := 70.0 + i * 18.0
		var offset := fmod(_time * 28.0 + i * 47.0, dash + gap)
		var t := -offset
		var length := a.distance_to(b)
		while t < length:
			var s := maxf(t, 0.0)
			var e := minf(t + dash, length)
			if e > s:
				_waves.draw_line(a + dir * s, a + dir * e, Color("#e9e2c6", 0.45), 2.0, true)
			t += dash + gap
	var foam := 0.35 + 0.35 * (0.5 + 0.5 * sin(_time * TAU / 5.0))
	_waves.draw_line(K.at(-1400, water + 3), K.at(3000, water + 3), Color("#e9e2c6", foam), 3.0, true)


func _backdrop() -> void:
	var r := K.seeded(11)
	for layer in [[520.0, 330.0, Color("#8d9c94")], [260.0, 190.0, Color("#7f8b5c")]]:
		for edge in ["north", "west"]:
			var top := PackedVector2Array()
			var base := PackedVector2Array()
			var t := -500.0
			while t <= 2100.0:
				var far: float = layer[0]
				var h: float = layer[1] * (0.55 + 0.45 * sin(t / 260.0 + far) * sin(t / 97.0 + far * 2.0)) + r.call() * 18.0
				var p := Vector2(t, -far) if edge == "north" else Vector2(-far, t)
				top.append(K.at(p.x, p.y, maxf(10.0, h)))
				base.insert(0, K.at(p.x, p.y, 0))
				t += 80.0
			top.append_array(base)
			_poly(top, layer[2])
	# A fort on the hill, as a silhouette (placement is invented).
	var c := Vector2(-330, 260)
	var z := 150.0
	var wall := [K.at(c.x - 60, c.y - 40, z), K.at(c.x + 60, c.y - 40, z), K.at(c.x + 80, c.y + 10, z), K.at(c.x + 40, c.y + 50, z), K.at(c.x - 50, c.y + 40, z), K.at(c.x - 80, c.y, z)]
	var wall_top := wall.map(func(p): return p - Vector2(0, 22))
	_poly(K.hull(wall + wall_top), Color("#d8ccb2", 0.85))
	_poly(K.poly(wall_top), Color("#e6dcc6", 0.85))
	var tower := K.at(c.x, c.y, z)
	draw_rect(Rect2(tower.x - 8, tower.y - 52, 16, 30), Color("#cdbfa3", 0.9))


func _scrub() -> void:
	var r := K.seeded(5)
	for i in 70:
		var edge: bool = r.call() < 0.5
		var x: float = -40 - r.call() * 200 if edge else r.call() * 1600
		var y: float = r.call() * 900 if edge else -40 - r.call() * 200
		var p := K.at(x, y)
		if r.call() < 0.35:
			var col := Color("#5d7a4a")
			draw_line(p, p + Vector2(0, -22), col, 4.0, true)
			draw_line(p + Vector2(0, -14), p + Vector2(-6, -14), col, 4.0, true)
			draw_line(p + Vector2(-6, -14), p + Vector2(-6, -22), col, 4.0, true)
			draw_line(p + Vector2(0, -14), p + Vector2(6, -14), col, 4.0, true)
			draw_line(p + Vector2(6, -14), p + Vector2(6, -24), col, 4.0, true)
		else:
			K.ellipse(self, p - Vector2(0, 5), 10 + r.call() * 12, 6 + r.call() * 5, Color("#6f8450") if r.call() < 0.5 else Color("#86965d"))


func _cobbles(points: Array, seed_value: int) -> void:
	var projected := PackedVector2Array(points.map(func(p): return K.at(p.x, p.y)))
	_poly(projected, Color("#a99777"))
	var r := K.seeded(seed_value)
	var xs: Array = points.map(func(p): return p.x)
	var ys: Array = points.map(func(p): return p.y)
	for i in 220:
		var x: float = xs.min() + r.call() * (xs.max() - xs.min())
		var y: float = ys.min() + r.call() * (ys.max() - ys.min())
		var p := K.at(x, y)
		if Geometry2D.is_point_in_polygon(p, projected):
			K.ellipse(self, p, 3 + r.call() * 4, 1.6 + r.call() * 1.6, Color("#b8a684", 0.55) if r.call() < 0.5 else Color("#958566", 0.55))


func _shadow(s: Dictionary) -> void:
	var f: Dictionary = s.footprint
	var sun := Vector2(-0.62, 0.28)
	var h: float = s.height + s.get("roof", 0.0) * 0.6
	if s.kind in ["palm", "tree"]:
		var base := Vector2(f.x + f.width / 2.0, f.y + f.height / 2.0)
		var tip: Vector2 = base + sun * s.height * 0.9
		draw_line(K.at(base.x, base.y), K.at(tip.x, tip.y), Color("#2a1c10", 0.18), 6.0, true)
		_poly(K.ground_ellipse(tip.x, tip.y, 70.0 if s.kind == "tree" else 52.0), Color("#2a1c10", 0.16))
		return
	var corners := [Vector2(f.x, f.y), Vector2(f.x + f.width, f.y), Vector2(f.x + f.width, f.y + f.height), Vector2(f.x, f.y + f.height)]
	var all_points: Array = []
	for c in corners:
		all_points.append(K.at(c.x, c.y))
		all_points.append(K.at(c.x + sun.x * h, c.y + sun.y * h))
	_poly(K.hull(all_points), Color("#2a1c10", 0.2))


## Draw a filled polygon; if the shape cannot be triangulated (self-crossing
## or degenerate art data) draw its convex hull instead of failing.
func _poly(points: PackedVector2Array, color: Color) -> void:
	if points.size() < 3:
		return
	if Geometry2D.triangulate_polygon(points).is_empty():
		if OS.is_debug_build() and not _warned:
			_warned = true
			push_warning("%s: a provisional shape could not be triangulated; drawing its hull." % name)
		points = Geometry2D.convex_hull(points)
		if points.size() < 3:
			return
	draw_colored_polygon(points, color)
