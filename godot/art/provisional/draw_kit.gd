class_name CosmosDrawKit
extends RefCounted
## Small helpers shared by the provisional vector art. Presentation only:
## all of this can be replaced by painted sprites without touching gameplay.


static func at(x: float, y: float, z := 0.0) -> Vector2:
	return Vector2(x - y, (x + y) / 2.0 - z)


static func poly(points: Array) -> PackedVector2Array:
	return PackedVector2Array(points)


static func ground_ellipse(cx: float, cy: float, r: float, z := 0.0, steps := 28) -> PackedVector2Array:
	var out := PackedVector2Array()
	for i in steps:
		var a := float(i) / steps * TAU
		out.append(at(cx + cos(a) * r, cy + sin(a) * r, z))
	return out


static func quad_bezier(p0: Vector2, p1: Vector2, p2: Vector2, steps := 10) -> PackedVector2Array:
	var out := PackedVector2Array()
	for i in steps + 1:
		var t := float(i) / steps
		out.append(p0.lerp(p1, t).lerp(p1.lerp(p2, t), t))
	return out


static func hull(points: Array) -> PackedVector2Array:
	return Geometry2D.convex_hull(PackedVector2Array(points))


## Deterministic pseudo-random numbers for set dressing.
static func seeded(seed: int) -> Callable:
	var state := [seed]
	return func() -> float:
		state[0] = (state[0] * 16807) % 2147483647
		return float(state[0]) / 2147483647.0


static func ellipse(canvas: CanvasItem, center: Vector2, rx: float, ry: float, color: Color) -> void:
	var pts := PackedVector2Array()
	for i in 20:
		var a := float(i) / 20.0 * TAU
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	canvas.draw_colored_polygon(pts, color)
