extends Node2D
## PROVISIONAL ART. Vector drawing of a structure, generated from its
## authored footprint and height. Replace per structure by setting "visual"
## in content/scenes/cumana.json to a scene (for example one built on
## res://art/sprite_structure.gd with a painted texture).
##
## Visual contract (any replacement scene root must provide):
##   configure(structure: Dictionary) -> void
##   apply_state(period: String, flags: Array) -> void
## The node is positioned at the screen origin of the world; draw relative to
## CosmosDrawKit.at(x, y, z) of the footprint.

const K := preload("res://art/provisional/draw_kit.gd")

const C := {
	"wall_lit": Color("#f1e7d3"), "wall_shade": Color("#d3c5ab"),
	"plinth_lit": Color("#c49a68"), "plinth_shade": Color("#a47c50"),
	"roof_lit": Color("#c96d4a"), "roof_mid": Color("#b35a3b"), "roof_dark": Color("#7e3a27"), "roof_line": Color("#8e4530"),
	"window": Color("#3a2b22"), "wood": Color("#6b4a2e"), "wood_light": Color("#8a6440"), "iron": Color("#2a2320"),
	"stone_lit": Color("#cfc2a6"), "stone_shade": Color("#a99c82"), "stone_top": Color("#ddd2b8"),
	"leaf": Color("#4f7a45"), "leaf_dark": Color("#355a35"), "leaf_light": Color("#79a05a"), "trunk": Color("#7a6248"),
}

var _warned := false
var data: Dictionary = {}
var period := "july"
var flags: Array = []
var _sway := 0.0


func configure(structure: Dictionary) -> void:
	data = structure
	queue_redraw()


func apply_state(new_period: String, new_flags: Array) -> void:
	period = new_period
	flags = new_flags
	queue_redraw()


func _process(delta: float) -> void:
	if data.get("kind") in ["palm", "tree"]:
		_sway += delta
		queue_redraw()


func _faces() -> Dictionary:
	var f: Dictionary = data.footprint
	return {"minX": f.x, "minY": f.y, "maxX": f.x + f.width, "maxY": f.y + f.height}


func _south(f: Dictionary, z0: float, z1: float, x0 = null, x1 = null) -> PackedVector2Array:
	var a: float = f.minX if x0 == null else x0
	var b: float = f.maxX if x1 == null else x1
	return K.poly([K.at(a, f.maxY, z0), K.at(b, f.maxY, z0), K.at(b, f.maxY, z1), K.at(a, f.maxY, z1)])


func _east(f: Dictionary, z0: float, z1: float, y0 = null, y1 = null) -> PackedVector2Array:
	var a: float = f.minY if y0 == null else y0
	var b: float = f.maxY if y1 == null else y1
	return K.poly([K.at(f.maxX, b, z0), K.at(f.maxX, a, z0), K.at(f.maxX, a, z1), K.at(f.maxX, b, z1)])


func _top(f: Dictionary, z: float) -> PackedVector2Array:
	return K.poly([K.at(f.minX, f.minY, z), K.at(f.maxX, f.minY, z), K.at(f.maxX, f.maxY, z), K.at(f.minX, f.maxY, z)])


func _draw() -> void:
	if data.is_empty():
		return
	match data.kind:
		"house": _house()
		"wall": _low_wall()
		"seawall": _sea_wall()
		"crates": _crates()
		"table": _table()
		"press": _press()
		"well": _well()
		"boat": _boat()
		"palm": _palm()
		"tree": _tree()


func _hip_roof(f: Dictionary, z: float, rise: float) -> void:
	var o := 12.0
	var x0: float = f.minX - o
	var x1: float = f.maxX + o
	var y0: float = f.minY - o
	var y1: float = f.maxY + o
	var along_x := x1 - x0 >= y1 - y0
	var half := (y1 - y0) / 2.0 if along_x else (x1 - x0) / 2.0
	var r1 := K.at(x0 + half, (y0 + y1) / 2.0, z + rise) if along_x else K.at((x0 + x1) / 2.0, y0 + half, z + rise)
	var r2 := K.at(x1 - half, (y0 + y1) / 2.0, z + rise) if along_x else K.at((x0 + x1) / 2.0, y1 - half, z + rise)
	var nw := K.at(x0, y0, z)
	var ne := K.at(x1, y0, z)
	var se := K.at(x1, y1, z)
	var sw := K.at(x0, y1, z)
	if along_x:
		_poly(K.poly([nw, ne, r2, r1]), C.roof_dark)
		_poly(K.poly([nw, r1, sw]), C.roof_dark)
		_poly(K.poly([sw, se, r2, r1]), C.roof_mid)
		_courses(sw, se, r1, r2)
		_poly(K.poly([ne, se, r2]), C.roof_lit)
		_courses(se, ne, r2, r2)
	else:
		_poly(K.poly([nw, sw, r2, r1]), C.roof_dark)
		_poly(K.poly([nw, ne, r1]), C.roof_dark)
		_poly(K.poly([sw, se, r2]), C.roof_mid)
		_courses(sw, se, r2, r2)
		_poly(K.poly([ne, se, r2, r1]), C.roof_lit)
		_courses(se, ne, r2, r1)
	draw_line(r1, r2, Color("#e0906a"), 2.0, true)
	draw_polyline(K.poly([sw, se, ne]), Color("#6b3020"), 2.5, true)


func _courses(e0: Vector2, e1: Vector2, g0: Vector2, g1: Vector2) -> void:
	for t in [0.18, 0.36, 0.54, 0.72, 0.88]:
		draw_line(e0.lerp(g0, t), e1.lerp(g1, t), Color(C.roof_line, 0.55), 1.4, true)


func _windows(f: Dictionary, side: String, count: int, z0: float, z1: float, skip := -1) -> void:
	var span: float = (f.maxX - f.minX) if side == "south" else (f.maxY - f.minY)
	var w := 30.0
	for i in count:
		if i == skip:
			continue
		var u: float = (f.minX if side == "south" else f.minY) + (span / count) * (i + 0.5) - w / 2.0
		var quad := _south(f, z0, z1, u, u + w) if side == "south" else _east(f, z0, z1, u, u + w)
		_poly(quad, C.window)
		for t in [0.2, 0.4, 0.6, 0.8]:
			draw_line(quad[0].lerp(quad[1], t), quad[3].lerp(quad[2], t), C.iron, 1.4, true)
		draw_line(quad[0], quad[1], Color("#efe5d0"), 3.0, true)


func _cracks(f: Dictionary, h: float, seed_value: int) -> void:
	var r := K.seeded(seed_value)
	for n in 2:
		var x: float = f.minX + (f.maxX - f.minX) * (0.25 + r.call() * 0.5)
		var z := h - 4.0
		var path := PackedVector2Array([K.at(x, f.maxY, z)])
		while z > h * 0.3:
			x += (r.call() - 0.5) * 22.0
			z -= 8.0 + r.call() * 12.0
			path.append(K.at(x, f.maxY, z))
		draw_polyline(path, Color("#5a4a3a"), 1.6, true)


func _house() -> void:
	var f := _faces()
	var h: float = data.height
	var width: float = f.maxX - f.minX
	var depth: float = f.maxY - f.minY
	var store: bool = data.id == "store"
	var damaged: bool = period == "november" and (data.id == "store" or data.id == "house-west")
	var door_u: float = (f.minX + f.maxX) / 2.0 - 22.0 if store else f.minX + width * 0.5 - 20.0
	_poly(_south(f, 0, h), C.wall_shade)
	_poly(_east(f, 0, h), C.wall_lit)
	_poly(_south(f, 0, 14), C.plinth_shade)
	_poly(_east(f, 0, 14), C.plinth_lit)
	var south_windows: int = max(2, int(width / 85.0))
	_windows(f, "south", south_windows, 46, 96, int(south_windows / 2.0) if store else -1)
	_windows(f, "east", max(1, int(depth / 95.0)), 46, 96)
	_poly(_south(f, 0, 98, door_u, door_u + 44), Color("#4a3324"))
	_poly(_south(f, 4, 94, door_u + 4, door_u + 40), Color("#2e2119") if store else Color("#5b3f2a"))
	_poly(_south(f, h - 9, h), Color(0, 0, 0, 0.12))
	if damaged:
		_cracks(f, h, int(data.footprint.x))
	if store:
		var a := K.poly([K.at(door_u - 30, f.maxY, 112), K.at(door_u + 74, f.maxY, 112), K.at(door_u + 74, f.maxY + 46, 92), K.at(door_u - 30, f.maxY + 46, 92)])
		_poly(a, Color("#a6553a"))
		for i in 7:
			var x := door_u - 30 + i * 15
			draw_line(K.at(x, f.maxY, 112), K.at(x, f.maxY + 46, 92), Color("#e7d2b0", 0.6), 4.0, true)
		for x in [door_u - 26, door_u + 70]:
			draw_line(K.at(x, f.maxY + 44, 0), K.at(x, f.maxY + 44, 92), C.wood, 3.0, true)
	_hip_roof(f, h, data.get("roof", 50.0))


func _low_wall() -> void:
	var f := _faces()
	var nov := period == "november"
	var surveyed := flags.has("cumana_survey_complete")
	var h: float = data.height
	var steps := 12
	var top_south := PackedVector2Array()
	var top_north := PackedVector2Array()
	for i in steps + 1:
		var u := float(i) / steps
		var z := h - 22.0 - sin(u * 30.0) * 6.0 if nov and u > 0.55 else h
		top_south.append(K.at(f.minX + (f.maxX - f.minX) * u, f.maxY, z))
		top_north.append(K.at(f.minX + (f.maxX - f.minX) * u, f.minY, z))
	var top_poly := PackedVector2Array(top_north)
	var rev := top_south.duplicate()
	rev.reverse()
	top_poly.append_array(rev)
	_poly(top_poly, C.stone_top)
	var south_poly := PackedVector2Array([K.at(f.minX, f.maxY, 0), K.at(f.maxX, f.maxY, 0)])
	south_poly.append_array(rev)
	_poly(south_poly, C.stone_shade)
	_poly(_east(f, 0, h - 22.0 - sin(30.0) * 6.0 if nov else h), C.stone_lit)
	for z in [14, 28, 42, 56]:
		if z < h:
			draw_line(K.at(f.minX, f.maxY, z), K.at(f.maxX, f.maxY, z), Color("#8c806a", 0.6), 1.0, true)
	_poly(K.poly([K.at(f.minX + 22, f.maxY, 18), K.at(f.minX + 66, f.maxY, 22), K.at(f.minX + 64, f.maxY, 52), K.at(f.minX + 20, f.maxY, 48)]), Color("#e4dac4", 0.8))
	draw_polyline(K.poly([K.at(f.minX + 70, f.maxY, h - 2), K.at(f.minX + 78, f.maxY, 48), K.at(f.minX + 72, f.maxY, 34), K.at(f.minX + 84, f.maxY, 12)]), Color("#4c4033"), 2.4 if nov else 1.2, true)
	if nov:
		draw_polyline(K.poly([K.at(f.minX + 96, f.maxY, 50), K.at(f.minX + 90, f.maxY, 36), K.at(f.minX + 104, f.maxY, 22), K.at(f.minX + 98, f.maxY, 6)]), Color("#4c4033"), 2.0, true)
		if not surveyed:
			var r := K.seeded(31)
			for i in 9:
				var p := K.at(f.minX + 90 + r.call() * 70, f.maxY + 8 + r.call() * 26, 0)
				_poly(K.poly([p + Vector2(-7, 0), p + Vector2(-2, -7), p + Vector2(7, -3), p + Vector2(5, 3)]), C.stone_shade if i % 2 else C.stone_lit)
	if surveyed and flags.has("wall_survey_reliable"):
		var a := K.at(f.minX + 8, f.maxY + 0.5, 9)
		var b := K.at(f.maxX - 8, f.maxY + 0.5, 9)
		draw_dashed_line(a, b, Color("#fbfbf3"), 2.0, 6.0)
		draw_circle(a, 2.5, Color("#fbfbf3"))
		draw_circle(b, 2.5, Color("#fbfbf3"))
	if surveyed:
		for x in [f.minX + 20, f.maxX - 20]:
			draw_line(K.at(x, f.maxY + 18, 0), K.at(x, f.maxY + 18, h + 26), C.wood, 3.0, true)
		draw_line(K.at(f.minX + 10, f.maxY + 18, h + 6), K.at(f.maxX - 10, f.maxY + 18, h + 6), C.wood_light, 5.0, true)


func _sea_wall() -> void:
	var f := _faces()
	_poly(_south(f, 0, data.height), C.stone_shade)
	_poly(_east(f, -30, data.height), C.stone_lit)
	_poly(_top(f, data.height), C.stone_top)
	for z in [14, 30]:
		draw_line(K.at(f.maxX, f.maxY, z), K.at(f.maxX, f.minY, z), Color("#9c8f76"), 1.0, true)


func _crates() -> void:
	var f := _faces()
	var boxes := [
		[f.minX, f.minY, 50, 40, 34], [f.minX + 56, f.minY + 6, 46, 44, 46],
		[f.minX + 108, f.minY + 2, 56, 40, 30], [f.minX + 10, f.minY + 2, 30, 28, 62],
	]
	for b in boxes:
		var bf := {"minX": b[0], "minY": b[1], "maxX": b[0] + b[2], "maxY": b[1] + b[3]}
		_poly(_south(bf, 0, b[4]), Color("#8a6440"))
		_poly(_east(bf, 0, b[4]), Color("#a77c50"))
		_poly(_top(bf, b[4]), Color("#b98e5e"))
		draw_line(K.at(bf.minX, bf.maxY, b[4] / 2.0), K.at(bf.maxX, bf.maxY, b[4] / 2.0), Color("#5e4329"), 1.2, true)
	for i in 2:
		var p := K.at(f.maxX - 20, f.maxY - 12 - i * 26, 0)
		draw_rect(Rect2(p.x - 11, p.y - 30, 22, 30), Color("#7b5233"))
		K.ellipse(self, Vector2(p.x, p.y - 30), 11, 5, Color("#9b6e46"))
		draw_line(Vector2(p.x - 11, p.y - 10), Vector2(p.x + 11, p.y - 10), Color("#3f2a1b"), 2.0)


func _table() -> void:
	var f := _faces()
	var h: float = data.height
	var lid := {"minX": f.minX + 18, "minY": f.minY + 8, "maxX": f.minX + 60, "maxY": f.minY + 30}
	for leg in [[f.minX + 4, f.maxY - 4], [f.maxX - 4, f.maxY - 4], [f.maxX - 4, f.minY + 4]]:
		draw_line(K.at(leg[0], leg[1], 0), K.at(leg[0], leg[1], h), C.wood, 3.0, true)
	_poly(_south(f, h - 4, h), C.wood)
	_poly(_east(f, h - 4, h), C.wood_light)
	_poly(_top(f, h), Color("#9c7650"))
	_poly(_south(lid, h, h + 10), Color("#3e2b1d"))
	_poly(_east(lid, h, h + 10), Color("#55392a"))
	_poly(_top(lid, h + 10), Color("#6f2e3a"))
	_poly(K.poly([K.at(lid.minX, lid.minY, h + 10), K.at(lid.maxX, lid.minY, h + 10), K.at(lid.maxX, lid.minY - 6, h + 30), K.at(lid.minX, lid.minY - 6, h + 30)]), Color("#4a3022"))
	for t in [0.25, 0.5, 0.75]:
		var a := K.at(lid.minX, lid.minY + 6, h + 11).lerp(K.at(lid.maxX, lid.minY + 6, h + 11), t)
		draw_rect(Rect2(a.x - 1.5, a.y - 6, 3, 12), Color("#d8b56a"))
	if flags.has("reading_sun"):
		var a := K.at(f.minX - 30, f.maxY + 40, 1)
		draw_line(a, K.at(f.minX - 4, f.maxY + 46, 1), Color("#f2efe4"), 2.5, true)
		draw_circle(a, 2.2, Color("#b0282a"))


func _press() -> void:
	var f := _faces()
	var h: float = data.height
	var helped := flags.has("bonpland_helped_press")
	var papers := [[-40, 46], [-8, 58], [28, 52], [-58, 18]]
	var count := 4 if period == "july" else 2
	for i in count:
		var x: float = f.minX + papers[i][0]
		var y: float = f.maxY + papers[i][1] - 30
		var sheet := K.poly([K.at(x, y, 1), K.at(x + 26, y, 1), K.at(x + 26, y + 20, 1), K.at(x, y + 20, 1)])
		_poly(sheet, Color("#d9cdb0") if period == "november" else Color("#efe8d6"))
	_poly(_south(f, 0, h), Color("#7a5a3a"))
	_poly(_east(f, 0, h), Color("#94704a"))
	_poly(_top(f, h), Color("#a8845a"))
	for z in [0, 6, 12, 18]:
		draw_line(K.at(f.minX, f.maxY, z + 3), K.at(f.maxX, f.maxY, z + 3), Color("#e8dfc8"), 1.4, true)
	for t in [0.3, 0.7]:
		var a := K.at(f.minX, f.maxY, 0).lerp(K.at(f.maxX, f.maxY, 0), t)
		draw_rect(Rect2(a.x - 2, a.y - h - 2, 4, h + 2), Color("#2c1f15") if helped else Color("#4a3426"))
	if helped:
		for i in 3:
			var p := K.at(f.maxX + 14, f.minY + 4 + i * 4, 4 + i * 5)
			draw_rect(Rect2(p.x - 14, p.y - 4, 28, 5), Color("#efe8d6"))


func _well() -> void:
	var f: Dictionary = data.footprint
	var c := Vector2(f.x + f.width / 2.0, f.y + f.height / 2.0)
	var r: float = f.width / 2.0
	var rim := K.ground_ellipse(c.x, c.y, r, data.height)
	var base := K.ground_ellipse(c.x, c.y, r, 0)
	var all_points := Array(rim) + Array(base)
	_poly(K.hull(all_points), C.stone_shade)
	_poly(rim, C.stone_top)
	_poly(K.ground_ellipse(c.x, c.y, r * 0.7, data.height), Color("#26343a"))
	var left := K.at(c.x - r * 0.7, c.y + r * 0.7, 0)
	var right := K.at(c.x + r * 0.7, c.y - r * 0.7, 0)
	var top: float = 46.0 + data.height
	draw_polyline(K.poly([left - Vector2(0, data.height), left - Vector2(0, top), right - Vector2(0, top), right - Vector2(0, data.height)]), C.wood, 3.0, true)


func _boat() -> void:
	var f := _faces()
	var mid: float = (f.minY + f.maxY) / 2.0
	var hull_pts := [K.at(f.minX, mid, 14), K.at(f.minX + 30, f.maxY, 0), K.at(f.maxX - 30, f.maxY, 0), K.at(f.maxX, mid, 16), K.at(f.maxX - 30, f.minY, 0), K.at(f.minX + 30, f.minY, 0)]
	var h: float = data.height
	var gunwale := [K.at(f.minX, mid, 16), K.at(f.minX + 30, f.maxY, h), K.at(f.maxX - 30, f.maxY, h), K.at(f.maxX, mid, 18), K.at(f.maxX - 30, f.minY, h), K.at(f.minX + 30, f.minY, h)]
	_poly(K.hull(hull_pts + gunwale), Color("#5b3d26"))
	_poly(K.poly(gunwale), Color("#3a2718"))
	draw_line(gunwale[1], gunwale[2], Color("#8f6a45"), 2.0, true)
	draw_line(K.at(f.minX + 60, mid, 6), K.at(f.minX + 130, mid, 26), Color("#a58052"), 3.0, true)


func _palm() -> void:
	var f: Dictionary = data.footprint
	var c := Vector2(f.x + f.width / 2.0, f.y + f.height / 2.0)
	var base := K.at(c.x, c.y, 0)
	var head := K.at(c.x - 10, c.y + 10, data.height)
	var bend := Vector2((base.x + head.x) / 2.0 + 18.0, (base.y + head.y) / 2.0)
	var left := K.quad_bezier(base + Vector2(-5, 0), bend + Vector2(-4, 0), head + Vector2(-3, 0))
	var right := K.quad_bezier(head + Vector2(3, 0), bend + Vector2(4, 0), base + Vector2(5, 0))
	var trunk := PackedVector2Array(left)
	trunk.append_array(right)
	_poly(trunk, C.trunk)
	for t in [0.2, 0.35, 0.5, 0.65, 0.8]:
		var p := base.lerp(bend, t).lerp(bend.lerp(head, t), t)
		draw_line(p + Vector2(-5, 0), p + Vector2(5, -1), Color("#5d4a36"), 1.5, true)
	var sway := sin(_sway * TAU / 5.5 + c.x) * deg_to_rad(1.7)
	var i := 0
	for deg in [-150, -115, -70, -30, 10, 40, 160, 200]:
		var a := deg_to_rad(deg) + sway
		var length := 62.0 + (i % 3) * 10.0
		var tip := head + Vector2(cos(a) * length, sin(a) * length * 0.55 + 22.0)
		var ctrl := head + Vector2(cos(a) * length * 0.5, sin(a) * length * 0.3 - 16.0)
		var upper := K.quad_bezier(head, ctrl, tip, 8)
		var lower := K.quad_bezier(tip, ctrl + Vector2(0, 9), head + Vector2(0, 3), 8)
		var frond := PackedVector2Array(upper)
		frond.append_array(lower)
		_poly(frond, C.leaf if i % 2 else C.leaf_dark)
		i += 1
	draw_circle(head + Vector2(0, 2), 6.0, Color("#6b5a2e"))


func _tree() -> void:
	var f: Dictionary = data.footprint
	var c := Vector2(f.x + f.width / 2.0, f.y + f.height / 2.0)
	var base := K.at(c.x, c.y, 0)
	var crown := K.at(c.x, c.y, data.height)
	_poly(K.poly([base + Vector2(-7, 0), crown + Vector2(-4, 30), crown + Vector2(4, 30), base + Vector2(7, 0)]), Color("#5e4a35"))
	var s := sin(_sway * TAU / 9.0) * 1.5
	K.ellipse(self, crown + Vector2(-26 + s, 18), 44, 30, C.leaf_dark)
	K.ellipse(self, crown + Vector2(22 + s, 10), 46, 32, C.leaf)
	K.ellipse(self, crown + Vector2(s, -10), 40, 28, Color(C.leaf_light, 0.9))


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
