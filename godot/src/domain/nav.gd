class_name CosmosNav
extends RefCounted
## Point-and-click navigation on the ground plane. Port of
## src/exploration/world.ts; behaviour is checked against
## tests/parity/nav.json, recorded from the TypeScript implementation.
##
## Points are Dictionaries {x, y} of 64-bit floats. Vector2 is avoided here
## because it is 32-bit and would break exact parity with the reference.
## A map is a Dictionary: width, height, tileSize, margin, spawn, obstacles
## (Array of {x, y, width, height}) and hotspots.

const MAX_SNAP_DISTANCE := 192.0
const _STEPS := [
	[1, 0, 1.0], [-1, 0, 1.0], [0, 1, 1.0], [0, -1, 1.0],
	[1, 1, 1.4142135623730951], [1, -1, 1.4142135623730951],
	[-1, 1, 1.4142135623730951], [-1, -1, 1.4142135623730951],
]


static func pt(x: float, y: float) -> Dictionary:
	return {"x": x, "y": y}


static func distance(a: Dictionary, b: Dictionary) -> float:
	var dx: float = a.x - b.x
	var dy: float = a.y - b.y
	return hypot(dx, dy)


## Math.hypot exactly as V8 computes it (normalise by the larger value, then
## a compensated sum). Plain sqrt(x*x + y*y) differs in the last bit for
## about a third of inputs, which can flip "within reach" at a boundary.
static func hypot(x: float, y: float) -> float:
	if is_nan(x) or is_nan(y):
		return INF if is_inf(x) or is_inf(y) else NAN
	var ax := absf(x)
	var ay := absf(y)
	var m := maxf(ax, ay)
	if m == INF:
		return INF
	if m == 0.0:
		return 0.0
	var sum := 0.0
	var compensation := 0.0
	for v in [ax, ay]:
		var n: float = v / m
		var summand := n * n - compensation
		var preliminary := sum + summand
		compensation = (preliminary - sum) - summand
		sum = preliminary
	return sqrt(sum) * m


static func blocked(p: Dictionary, map: Dictionary) -> bool:
	var m: float = map.margin
	if not is_finite(p.x) or not is_finite(p.y):
		return true
	if p.x < m or p.y < m or p.x > map.width - m or p.y > map.height - m:
		return true
	for r in map.obstacles:
		if p.x > r.x - m and p.x < r.x + r.width + m and p.y > r.y - m and p.y < r.y + r.height + m:
			return true
	return false


## Liang–Barsky: does segment a→b pass through the open interior of the rect?
static func _segment_enters_rect(a: Dictionary, b: Dictionary, min_x: float, min_y: float, max_x: float, max_y: float) -> bool:
	var dx: float = b.x - a.x
	var dy: float = b.y - a.y
	var t0 := 0.0
	var t1 := 1.0
	var edges := [[-dx, a.x - min_x], [dx, max_x - a.x], [-dy, a.y - min_y], [dy, max_y - a.y]]
	for edge in edges:
		var p: float = edge[0]
		var q: float = edge[1]
		if p == 0.0:
			if q <= 0.0:
				return false
			continue
		var t := q / p
		if p < 0.0:
			if t > t0:
				t0 = t
		elif t < t1:
			t1 = t
		if t0 >= t1:
			return false
	return t1 - t0 > 1e-9


## True when a character can walk the straight segment without collision.
static func segment_clear(a: Dictionary, b: Dictionary, map: Dictionary) -> bool:
	if blocked(a, map) or blocked(b, map):
		return false
	var m: float = map.margin
	for r in map.obstacles:
		if _segment_enters_rect(a, b, r.x - m, r.y - m, r.x + r.width + m, r.y + r.height + m):
			return false
	return true


static func _grid(map: Dictionary) -> Dictionary:
	if map.has("_grid"):
		return map["_grid"]
	var tile: float = map.tileSize
	var columns := int(ceil(map.width / tile))
	var rows := int(ceil(map.height / tile))
	var walkable := PackedByteArray()
	walkable.resize(columns * rows)
	for y in rows:
		for x in columns:
			walkable[x + y * columns] = 0 if blocked(_center(x, y, tile), map) else 1
	var grid := {"columns": columns, "rows": rows, "walkable": walkable}
	map["_grid"] = grid
	return grid


static func _center(x: int, y: int, tile: float) -> Dictionary:
	return {"x": (x + 0.5) * tile, "y": (y + 0.5) * tile}


static func _cell_for(p: Dictionary, map: Dictionary, grid: Dictionary) -> Array:
	var tile: float = map.tileSize
	return [
		clampi(int(floor(p.x / tile)), 0, grid.columns - 1),
		clampi(int(floor(p.y / tile)), 0, grid.rows - 1),
	]


## Nearest walkable point: the point itself, or the closest walkable tile centre.
static func nearest_walkable(p: Dictionary, map: Dictionary) -> Dictionary:
	if not blocked(p, map):
		return {"x": p.x, "y": p.y}
	var grid := _grid(map)
	var best = null
	var best_distance := INF
	var probe: Dictionary = p if is_finite(p.x) and is_finite(p.y) else map.spawn
	var walkable: PackedByteArray = grid.walkable
	var columns: int = grid.columns
	for i in walkable.size():
		if walkable[i] == 0:
			continue
		@warning_ignore("integer_division")
		var c := _center(i % columns, i / columns, map.tileSize)
		var d := distance(c, probe)
		if d < best_distance:
			best = c
			best_distance = d
	return best if best != null else {"x": map.spawn.x, "y": map.spawn.y}


## Plan a walk. Returns {status: "here"|"route"|"unreachable", waypoints, snapped}.
## radius > 0 approaches a person/object (preferring tiles at least min_radius
## away); radius == 0 walks to the exact point or the nearest reachable one.
static func plan_route(map: Dictionary, origin: Dictionary, destination: Dictionary, radius := 0.0, min_radius := 0.0) -> Dictionary:
	if not is_finite(destination.x) or not is_finite(destination.y):
		return {"status": "unreachable", "waypoints": []}
	var here: bool = distance(origin, destination) <= radius if radius > 0.0 else distance(origin, destination) < 1.0
	if here:
		return {"status": "here", "waypoints": []}

	var grid := _grid(map)
	var columns: int = grid.columns
	var rows: int = grid.rows
	var walkable: PackedByteArray = grid.walkable
	var tile: float = map.tileSize
	var start := nearest_walkable(origin, map)
	var start_cell := _cell_for(start, map, grid)
	var start_index: int = start_cell[0] + start_cell[1] * columns
	var count := walkable.size()
	var cost := PackedFloat64Array()
	cost.resize(count)
	cost.fill(INF)
	var previous := PackedInt32Array()
	previous.resize(count)
	previous.fill(-1)
	var settled := PackedByteArray()
	settled.resize(count)
	cost[start_index] = 0.0
	previous[start_index] = start_index
	# Dijkstra with a linear-scan frontier, exactly as the reference does it,
	# so that ties resolve identically.
	var frontier: Array[int] = [start_index]
	while frontier.size() > 0:
		var best_at := 0
		for i in range(1, frontier.size()):
			if cost[frontier[i]] < cost[frontier[best_at]]:
				best_at = i
		var current: int = frontier[best_at]
		frontier[best_at] = frontier[frontier.size() - 1]
		frontier.pop_back()
		if settled[current] == 1:
			continue
		settled[current] = 1
		var cx := current % columns
		@warning_ignore("integer_division")
		var cy := current / columns
		for step in _STEPS:
			var dx: int = step[0]
			var dy: int = step[1]
			var nx := cx + dx
			var ny := cy + dy
			if nx < 0 or ny < 0 or nx >= columns or ny >= rows:
				continue
			var next := nx + ny * columns
			if walkable[next] == 0 or settled[next] == 1:
				continue
			if dx != 0 and dy != 0 and (walkable[cx + dx + cy * columns] == 0 or walkable[cx + (cy + dy) * columns] == 0):
				continue
			var candidate: float = cost[current] + step[2]
			if candidate < cost[next]:
				cost[next] = candidate
				previous[next] = current
				frontier.append(next)

	var goal := -1
	var snapped := false
	if radius > 0.0:
		var floors := [min_radius, 0.0] if min_radius > 0.0 else [0.0]
		for floor_distance in floors:
			var best_cost := INF
			for i in count:
				if settled[i] == 0:
					continue
				@warning_ignore("integer_division")
				var d := distance(_center(i % columns, i / columns, tile), destination)
				if d > radius - 2.0 or d < floor_distance:
					continue
				if cost[i] < best_cost:
					best_cost = cost[i]
					goal = i
			if goal >= 0:
				break
	if goal < 0:
		var best_distance := INF
		for i in count:
			if settled[i] == 0:
				continue
			@warning_ignore("integer_division")
			var d := distance(_center(i % columns, i / columns, tile), destination)
			if d < best_distance - 1e-6 or (absf(d - best_distance) <= 1e-6 and goal >= 0 and cost[i] < cost[goal]):
				best_distance = d
				goal = i
		if goal < 0 or best_distance > MAX_SNAP_DISTANCE:
			return {"status": "unreachable", "waypoints": []}
		snapped = radius > 0.0 or blocked(destination, map)

	var cells: Array = []
	var cursor := goal
	while true:
		@warning_ignore("integer_division")
		cells.append(_center(cursor % columns, cursor / columns, tile))
		if cursor == start_index:
			break
		cursor = previous[cursor]
	cells.reverse()

	var points: Array = [origin]
	if blocked(origin, map):
		points.append(start)
	for c in cells:
		if not blocked(c, map):
			points.append(c)
	if radius == 0.0 and not blocked(destination, map) and segment_clear(points[points.size() - 1], destination, map):
		points.append({"x": destination.x, "y": destination.y})
	elif radius == 0.0:
		snapped = true
	else:
		var last: Dictionary = points[points.size() - 1]
		var gap := distance(last, destination) - (radius - 2.0)
		if gap > 0.0:
			var span := gap + radius - 2.0
			var dir := {"x": (destination.x - last.x) / span, "y": (destination.y - last.y) / span}
			var lo := 0.0
			var hi := gap
			if segment_clear(last, _along(last, dir, hi), map):
				lo = hi
			else:
				for i in 12:
					var mid := (lo + hi) / 2.0
					if segment_clear(last, _along(last, dir, mid), map):
						lo = mid
					else:
						hi = mid
			if lo > 0.5:
				points.append(_along(last, dir, lo))
		snapped = distance(points[points.size() - 1], destination) > radius

	var waypoints := _smooth(points, map).slice(1)
	if waypoints.is_empty():
		return {"status": "here", "waypoints": []}
	return {"status": "route", "waypoints": waypoints, "snapped": snapped}


static func _along(from: Dictionary, dir: Dictionary, t: float) -> Dictionary:
	return {"x": from.x + dir.x * t, "y": from.y + dir.y * t}


## String-pulling: keep only the waypoints needed for clear straight segments.
static func _smooth(points: Array, map: Dictionary) -> Array:
	var unique: Array = []
	for i in points.size():
		if i == 0 or distance(points[i], points[i - 1]) > 1e-6:
			unique.append(points[i])
	if unique.size() <= 2:
		return unique
	var out: Array = [unique[0]]
	var anchor := 0
	while anchor < unique.size() - 1:
		var next := anchor + 1
		var j := unique.size() - 1
		while j > anchor + 1:
			if segment_clear(unique[anchor], unique[j], map):
				next = j
				break
			j -= 1
		out.append(unique[next])
		anchor = next
	return out


## Keyboard movement with sliding along walls.
static func step_direct(position: Dictionary, delta: Dictionary, map: Dictionary) -> Dictionary:
	var candidates := [
		{"x": position.x + delta.x, "y": position.y + delta.y},
		{"x": position.x + delta.x, "y": position.y},
		{"x": position.x, "y": position.y + delta.y},
	]
	for c in candidates:
		if distance(c, position) > 1e-9 and segment_clear(position, c, map):
			return c
	return {"x": position.x, "y": position.y}


## Deterministic movement step that never overshoots a waypoint.
static func advance_along_path(position: Dictionary, waypoints: Array, max_distance: float) -> Dictionary:
	var remaining := waypoints.duplicate()
	var current := {"x": position.x, "y": position.y}
	var travel := maxf(0.0, max_distance)
	while remaining.size() > 0:
		var next: Dictionary = remaining[0]
		var span := distance(current, next)
		if span == 0.0:
			remaining.pop_front()
			continue
		if travel < span:
			current = {
				"x": current.x + (next.x - current.x) * (travel / span),
				"y": current.y + (next.y - current.y) * (travel / span),
			}
			travel = 0.0
			break
		current = {"x": next.x, "y": next.y}
		remaining.pop_front()
		travel -= span
	return {"position": current, "remaining": remaining}
