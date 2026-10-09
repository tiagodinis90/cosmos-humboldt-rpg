class_name CosmosIso
extends RefCounted
## 2:1 isometric projection, picking, depth order, occlusion and camera maths.
## Port of src/exploration/iso.ts, checked against tests/parity/iso.json.
##
##   screen.x = world.x - world.y
##   screen.y = (world.x + world.y) / 2 - z
##
## The camera looks from +x/+y: a larger x + y is nearer the viewer.
## Points are Dictionaries {x, y}; presentation code converts to Vector2.


static func to_screen(p: Dictionary, z := 0.0) -> Dictionary:
	return {"x": p.x - p.y, "y": (p.x + p.y) / 2.0 - z}


static func to_world(s: Dictionary, z := 0.0) -> Dictionary:
	var y2: float = s.y + z
	return {"x": y2 + s.x / 2.0, "y": y2 - s.x / 2.0}


static func box_from(r: Dictionary, height: float) -> Dictionary:
	return {"minX": r.x, "minY": r.y, "maxX": r.x + r.width, "maxY": r.y + r.height, "height": height}


## A click on a box's visible faces becomes a ground point just in front of
## the face under the cursor (like a raycast against a facade).
static func pick_box(screen: Dictionary, box: Dictionary) -> Variant:
	var x: float = screen.x + box.maxY
	var z: float = (x + box.maxY) / 2.0 - screen.y
	if x >= box.minX and x <= box.maxX and z >= 0.0 and z <= box.height:
		return {"x": x, "y": box.maxY + 1.0}
	var y: float = box.maxX - screen.x
	z = (box.maxX + y) / 2.0 - screen.y
	if y >= box.minY and y <= box.maxY and z >= 0.0 and z <= box.height:
		return {"x": box.maxX + 1.0, "y": y}
	var top := to_world(screen, box.height)
	if top.x >= box.minX and top.x <= box.maxX and top.y >= box.minY and top.y <= box.maxY:
		if box.maxY - top.y <= box.maxX - top.x:
			return {"x": top.x, "y": box.maxY + 1.0}
		return {"x": box.maxX + 1.0, "y": top.y}
	return null


static func _behind(a: Dictionary, b: Dictionary) -> bool:
	return a.maxX <= b.minX or a.maxY <= b.minY


static func _key(i: Dictionary) -> float:
	return i.minX + i.maxX + i.minY + i.maxY


## Painter's order for non-overlapping footprints {id, minX, minY, maxX, maxY}.
## Returns ids from farthest to nearest.
static func depth_order(items: Array) -> Array:
	var incoming := {}
	var edges := {}
	var by_id := {}
	for i in items:
		incoming[i.id] = 0
		edges[i.id] = []
		by_id[i.id] = i
	for ai in items.size():
		for bi in items.size():
			if ai == bi:
				continue
			var a: Dictionary = items[ai]
			var b: Dictionary = items[bi]
			if _behind(a, b) and not _behind(b, a):
				edges[a.id].append(b.id)
				incoming[b.id] += 1
	var remaining: Array = items.map(func(i): return i.id)
	var order: Array = []
	while remaining.size() > 0:
		var pick = null
		for id in remaining:
			if incoming[id] != 0:
				continue
			if pick == null or _key(by_id[id]) < _key(by_id[pick]):
				pick = id
		if pick == null:
			for id in remaining:
				if pick == null or _key(by_id[id]) < _key(by_id[pick]):
					pick = id
		remaining.erase(pick)
		order.append(pick)
		for next in edges[pick]:
			incoming[next] -= 1
	return order


## Screen-space silhouette of a box; a hipped roof adds eaves at wall height
## and the ridge at height + roof.
static func box_silhouette(box: Dictionary, roof := 0.0, overhang := -1.0) -> Array:
	if overhang < 0.0:
		overhang = 12.0 if roof > 0.0 else 0.0
	var corners: Array = []
	for x in [box.minX, box.maxX]:
		for y in [box.minY, box.maxY]:
			corners.append(to_screen({"x": x, "y": y}, 0.0))
	var x0: float = box.minX - overhang
	var x1: float = box.maxX + overhang
	var y0: float = box.minY - overhang
	var y1: float = box.maxY + overhang
	for x in [x0, x1]:
		for y in [y0, y1]:
			corners.append(to_screen({"x": x, "y": y}, box.height))
	if roof > 0.0:
		var along_x := x1 - x0 >= y1 - y0
		var half := (y1 - y0) / 2.0 if along_x else (x1 - x0) / 2.0
		var ridge := [{"x": x0 + half, "y": (y0 + y1) / 2.0}, {"x": x1 - half, "y": (y0 + y1) / 2.0}] if along_x \
			else [{"x": (x0 + x1) / 2.0, "y": y0 + half}, {"x": (x0 + x1) / 2.0, "y": y1 - half}]
		for r in ridge:
			corners.append(to_screen(r, box.height + roof))
	return convex_hull(corners)


static func _cross(o: Dictionary, a: Dictionary, b: Dictionary) -> float:
	return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)


static func convex_hull(points: Array) -> Array:
	var sorted := points.duplicate()
	sorted.sort_custom(func(a, b): return a.x < b.x or (a.x == b.x and a.y < b.y))
	if sorted.size() < 3:
		return sorted
	var lower: Array = []
	for p in sorted:
		while lower.size() >= 2 and _cross(lower[lower.size() - 2], lower[lower.size() - 1], p) <= 0.0:
			lower.pop_back()
		lower.append(p)
	var upper: Array = []
	for k in range(sorted.size() - 1, -1, -1):
		var p: Dictionary = sorted[k]
		while upper.size() >= 2 and _cross(upper[upper.size() - 2], upper[upper.size() - 1], p) <= 0.0:
			upper.pop_back()
		upper.append(p)
	return lower.slice(0, lower.size() - 1) + upper.slice(0, upper.size() - 1)


static func inside_convex(polygon: Array, p: Dictionary) -> bool:
	if polygon.size() < 3:
		return false
	var sign := 0.0
	for i in polygon.size():
		var a: Dictionary = polygon[i]
		var b: Dictionary = polygon[(i + 1) % polygon.size()]
		var c: float = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
		if absf(c) < 1e-9:
			continue
		if sign == 0.0:
			sign = signf(c)
		elif signf(c) != sign:
			return false
	return true


static func screen_bounds(width: float, height: float, pad := 0.0) -> Dictionary:
	var pts := [to_screen({"x": 0.0, "y": 0.0}), to_screen({"x": width, "y": 0.0}), to_screen({"x": 0.0, "y": height}), to_screen({"x": width, "y": height})]
	var xs: Array = pts.map(func(p): return p.x)
	var ys: Array = pts.map(func(p): return p.y)
	return {"minX": xs.min() - pad, "maxX": xs.max() + pad, "minY": ys.min() - pad, "maxY": ys.max() + pad}


static func _fit(center: float, size: float, lo: float, hi: float) -> float:
	if size >= hi - lo:
		return (lo + hi - size) / 2.0
	return minf(hi - size, maxf(lo, center - size / 2.0))


## Top-left of the view that centres `focus` (plus offset), kept inside bounds.
static func camera_target(focus: Dictionary, view: Dictionary, bounds: Dictionary, offset := {"x": 0.0, "y": 0.0}) -> Dictionary:
	return {
		"x": _fit(focus.x + offset.x, view.width, bounds.minX, bounds.maxX),
		"y": _fit(focus.y + offset.y, view.height, bounds.minY, bounds.maxY),
	}


## Frame-rate independent exponential follow; never overshoots.
static func smooth_camera(current: Dictionary, target: Dictionary, dt: float, half_life := 0.22) -> Dictionary:
	if dt <= 0.0:
		return current
	var k := 1.0 - pow(2.0, -dt / half_life)
	var next := {"x": current.x + (target.x - current.x) * k, "y": current.y + (target.y - current.y) * k}
	var dx: float = target.x - next.x
	var dy: float = target.y - next.y
	if sqrt(dx * dx + dy * dy) < 0.05:
		return {"x": target.x, "y": target.y}
	return next


## Eight screen directions for a world heading, clockwise from screen-right:
## 0 E, 1 SE, 2 S (towards camera), 3 SW, 4 W, 5 NW, 6 N (away), 7 NE.
static func screen_facing(heading: float) -> int:
	var s := to_screen({"x": cos(heading), "y": sin(heading)})
	var angle := atan2(s.y, s.x)
	# Math.round semantics (half rounds up), not GDScript round().
	var sector := int(floor(angle / (PI / 4.0) + 0.5))
	return ((sector % 8) + 8) % 8


## Screen-relative keyboard directions converted to a world direction.
static func world_direction_for_keys(up: bool, down: bool, left: bool, right: bool) -> Dictionary:
	var sx := (1.0 if right else 0.0) - (1.0 if left else 0.0)
	var sy := (1.0 if down else 0.0) - (1.0 if up else 0.0)
	if sx == 0.0 and sy == 0.0:
		return {"x": 0.0, "y": 0.0}
	var w := to_world({"x": sx, "y": sy / 2.0})
	var length := sqrt(w.x * w.x + w.y * w.y)
	return {"x": w.x / length, "y": w.y / length}
