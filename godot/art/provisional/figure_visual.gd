extends Node2D
## PROVISIONAL ART. A procedural figure with eight facings, a walk cycle and
## idle breathing. Replace with painted animation by pointing "visual" for a
## figure in content/scenes/cumana.json (or the player in
## content/characters.json) at a scene built on res://art/sprite_figure.gd.
##
## Visual contract (any replacement scene root must provide):
##   configure(kind: String) -> void          "humboldt", "bonpland", ...
##   set_pose(sector: int, moving: bool, stride: float) -> void
##        sector: 0 E, 1 SE, 2 S (towards camera), 3 SW, 4 W, 5 NW, 6 N, 7 NE
##   apply_state(period: String, flags: Array) -> void
## The node's origin is the character's feet.

const PALETTES := {
	"humboldt": {"coat": "#2f4655", "coat_dark": "#22333f", "under": "#d8c08a", "legs": "#ded4bf", "boots": "#2a1d16", "skin": "#e2b996", "hair": "#6b4a32", "hat": "#2d2620", "band": "#5a4a3a"},
	"bonpland": {"coat": "#7a5a3a", "coat_dark": "#5d432b", "under": "#efe8da", "legs": "#8a8070", "boots": "#3a2a1e", "skin": "#e4bb98", "hair": "#3b2a1e", "hat": "#d9c27a", "band": "#8a6a3a"},
	"ines": {"coat": "#efe6d6", "coat_dark": "#d8ccb6", "under": "#a6553a", "legs": "#3e4f7a", "boots": "#2a1f1a", "skin": "#a8714f", "hair": "#2a1f1a", "skirt": "#3e4f7a", "shawl": "#a6553a"},
	"porter": {"coat": "#e8e0cc", "coat_dark": "#cfc5ad", "under": "#cfc5ad", "legs": "#9a8a6a", "boots": "#5a3f2a", "skin": "#6e4630", "hair": "#1f1712", "hat": "#c9b27a", "band": "#8a6a3a"},
	"clerk": {"coat": "#4a3b2e", "coat_dark": "#372b21", "under": "#e9e0cc", "legs": "#5b4e3e", "boots": "#241a13", "skin": "#d6a986", "hair": "#4a3a2c", "hat": "#1f1a16", "band": "#1f1a16"},
}

var _warned := false
var kind := "humboldt"
var sector := 2
var moving := false
var stride := 0.0
var period := "july"
var pose := "stand"
var ledger := false
var _breath := 0.0
var _pal: Dictionary = {}


func configure(new_kind: String) -> void:
	kind = new_kind
	_pal = {}
	for k in PALETTES.get(kind, PALETTES.humboldt):
		_pal[k] = Color(PALETTES.get(kind, PALETTES.humboldt)[k])
	_update_pose_for_kind()
	queue_redraw()


func set_pose(new_sector: int, is_moving: bool, new_stride: float) -> void:
	if new_sector == sector and is_moving == moving and absf(new_stride - stride) < 0.01:
		return
	sector = new_sector
	moving = is_moving
	stride = new_stride
	queue_redraw()


func apply_state(new_period: String, _flags: Array) -> void:
	period = new_period
	_update_pose_for_kind()
	queue_redraw()


func _update_pose_for_kind() -> void:
	match kind:
		"ines":
			pose = "sit"
			ledger = true
		"bonpland":
			pose = "kneel" if period == "july" else "stand"
			ledger = period == "november"
		"porter":
			pose = "carry"
			ledger = false
		"clerk":
			pose = "stand"
			ledger = true
		_:
			pose = "stand"
			ledger = false


func _process(delta: float) -> void:
	_breath += delta
	if not moving:
		queue_redraw()


func _view() -> Array:
	match sector:
		0: return ["side", false]
		1: return ["front3q", false]
		2: return ["front", false]
		3: return ["front3q", true]
		4: return ["side", true]
		5: return ["back3q", true]
		6: return ["back", false]
	return ["back3q", false]


func _draw() -> void:
	if _pal.is_empty():
		configure(kind)
	var view: Array = _view()
	var v: String = view[0]
	var flip: bool = view[1]
	var phase := stride / 10.0
	var swing := sin(phase) if moving else 0.0
	var bob := -absf(cos(phase)) * 1.6 if moving else -absf(sin(_breath * TAU / 3.2)) * 0.7
	var front := v == "front" or v == "front3q"
	var back := v == "back" or v == "back3q"
	var side := v == "side"
	var width := 11.0 if side else (17.0 if v == "front" or v == "back" else 14.0)
	var seated := pose == "sit"
	var kneel := pose == "kneel"
	var hip := -22.0 if seated else (-18.0 if kneel else -30.0)
	var shoulder := hip - 22.0
	var head := shoulder - 9.0
	var p := _pal

	CosmosDrawKit.ellipse(self, Vector2.ZERO, 14, 5.5, Color("#1f160d", 0.32))
	draw_set_transform(Vector2(0, bob), 0.0, Vector2(-1 if flip else 1, 1))
	if seated:
		draw_rect(Rect2(-9, -18, 18, 4), Color("#6b4a2e"))
		draw_line(Vector2(-7, -14), Vector2(-8, 0), Color("#4a3322"), 2.0)
		draw_line(Vector2(7, -14), Vector2(8, 0), Color("#4a3322"), 2.0)
	if back:
		_head(head, front, back, side, v)
	# Legs
	for side_sign in [-1, 1]:
		var s: float = swing * side_sign
		if seated:
			var knee := Vector2(side_sign * 4 + (12 if side else 0), hip + (0 if side else 6))
			draw_polyline(PackedVector2Array([Vector2(side_sign * 4, hip), knee, Vector2(knee.x, -3)]), p.get("skirt", p.legs), 6.0, true)
			CosmosDrawKit.ellipse(self, Vector2(knee.x + 2, -2), 4, 2.4, p.boots)
		elif kneel:
			draw_polyline(PackedVector2Array([Vector2(side_sign * 4, hip), Vector2(side_sign * 4 + 10, -6), Vector2(side_sign * 4 - 4, -4)]), p.legs, 6.0, true)
		elif side:
			var angle := s * 0.5
			var foot := Vector2(sin(angle) * 27.0, hip + cos(angle) * 27.0)
			draw_line(Vector2(0, hip), foot - Vector2(0, 2), p.legs.darkened(0.2) if side_sign < 0 else p.legs, 6.0, true)
			CosmosDrawKit.ellipse(self, foot + Vector2(3, -1), 5, 2.6, p.boots)
		else:
			var lift := maxf(0.0, s) * 4.0
			var lean := -s * 1.5 if back else s * 1.5
			var fx: float = side_sign * 4.5 + (s * 3.0 if v == "front3q" or v == "back3q" else 0.0)
			draw_line(Vector2(side_sign * 4, hip), Vector2(fx + lean, -3 - lift), p.legs, 6.5, true)
			CosmosDrawKit.ellipse(self, Vector2(fx + lean, -2 - lift), 4, 2.5, p.boots)
	# Skirt or coat
	var hem := hip + 4.0 if seated or kneel else hip + 8.0
	if p.has("skirt"):
		var spread := 10.0 if side and seated else 0.0
		_poly(PackedVector2Array([Vector2(-width / 2 - 2, hip - 2), Vector2(-width / 2 - 5 + spread, -3), Vector2(width / 2 + 5 + spread, -3), Vector2(width / 2 + 2, hip - 2)]), p.skirt)
	var body := PackedVector2Array([
		Vector2(-width / 2, shoulder + 2), Vector2(-width / 2 + 3, shoulder - 3), Vector2(width / 2 - 3, shoulder - 3),
		Vector2(width / 2, shoulder + 2), Vector2(width / 2 + 1.5, hem), Vector2(-width / 2 - 1.5, hem),
	])
	_poly(body, p.coat_dark if back else p.coat)
	if back and not p.has("skirt"):
		_poly(PackedVector2Array([Vector2(-4, hip), Vector2(-6, hem + 8), Vector2(-1, hem + 6)]), p.coat_dark)
		_poly(PackedVector2Array([Vector2(4, hip), Vector2(6, hem + 8), Vector2(1, hem + 6)]), p.coat_dark)
	if front and not p.has("skirt"):
		_poly(PackedVector2Array([Vector2(-3, shoulder - 3), Vector2(0, hip - 2), Vector2(3, shoulder - 3)]), p.under)
		_poly(PackedVector2Array([Vector2(-3, shoulder - 3), Vector2(0, shoulder + 3), Vector2(3, shoulder - 3)]), Color("#f4efe2"))
	if p.has("skirt") and front:
		_poly(PackedVector2Array([Vector2(-width / 2, shoulder - 1), Vector2(0, shoulder + 6), Vector2(width / 2, shoulder - 1), Vector2(width / 2, shoulder + 4), Vector2(0, shoulder + 11), Vector2(-width / 2, shoulder + 4)]), p.under)
	# Arms
	for side_sign in [-1, 1]:
		if side and side_sign < 0:
			continue
		var s: float = -swing * side_sign if moving else 0.0
		var ax: float = 0.0 if side else side_sign * (width / 2 + 1)
		var hand := Vector2(ax + (s * 9.0 if side else s * 2.0) + (-side_sign * 5.0 if ledger else 0.0), shoulder + 14.0 if ledger else shoulder + 20.0 - absf(s) * 2.0)
		draw_line(Vector2(ax, shoulder), hand, p.coat_dark if back else p.coat, 5.0, true)
		draw_circle(hand + Vector2(0, 2), 2.3, p.skin)
	if not back:
		_head(head, front, back, side, v)
	if ledger:
		draw_set_transform(Vector2(0, bob + shoulder + 14), deg_to_rad(-8), Vector2(-1 if flip else 1, 1))
		draw_rect(Rect2(-9, -4, 16, 11), Color("#5b3a28"))
		draw_rect(Rect2(-8, -3, 14, 9), Color("#efe6d0"))
		draw_set_transform(Vector2(0, bob), 0.0, Vector2(-1 if flip else 1, 1))
	if pose == "carry":
		draw_rect(Rect2(5, shoulder - 15, 15, 17), Color("#7b5233"))
		CosmosDrawKit.ellipse(self, Vector2(12.5, shoulder - 15), 7.5, 3, Color("#9b6e46"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _head(head: float, front: bool, back: bool, side: bool, v: String) -> void:
	var p := _pal
	draw_rect(Rect2(-2.5, head + 5, 5, 5), p.skin)
	draw_circle(Vector2(0, head), 7.0, p.hair if back else p.skin)
	if not back:
		var fo := 2.5 if v == "front3q" else (4.0 if side else 0.0)
		_poly(PackedVector2Array([Vector2(-7, head - 1), Vector2(-6, head - 8), Vector2(1, head - 8.5), Vector2(7, head - 6), Vector2(7, head - 2), Vector2(fo - 3, head - 6)]), p.hair)
		if side:
			_poly(PackedVector2Array([Vector2(-7, head - 2), Vector2(-8, head + 4), Vector2(-4, head + 6), Vector2(-2, head)]), p.hair)
		draw_circle(Vector2(fo + 2.4, head - 0.5), 0.9, Color("#2a1d16", 0.8))
		if not side:
			draw_circle(Vector2(fo - 2.4, head - 0.5), 0.9, Color("#2a1d16", 0.8))
	if p.has("shawl"):
		_poly(PackedVector2Array([Vector2(-8, head - 3), Vector2(0, head - 10), Vector2(8, head - 3), Vector2(9, head + 9), Vector2(6, head + 2), Vector2(-6, head + 2), Vector2(-9, head + 9)]), Color(p.shawl, 0.95))
	if p.has("hat"):
		CosmosDrawKit.ellipse(self, Vector2(0, head - 5), 12, 3.4, p.hat)
		_poly(PackedVector2Array([Vector2(-6.5, head - 5), Vector2(-6, head - 13), Vector2(0, head - 14.5), Vector2(6, head - 13), Vector2(6.5, head - 5)]), p.hat)
		draw_rect(Rect2(-6.5, head - 8, 13, 2.2), p.band)


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
