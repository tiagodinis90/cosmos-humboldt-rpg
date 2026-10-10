extends Node2D
## Painted-character visual for artists. Make a scene with this script on the
## root and an AnimatedSprite2D child named "Sprite", give it SpriteFrames, and
## point a figure's "visual" (content/scenes/cumana.json) at the scene.
##
## Animation names, by direction (screen-relative, see figure_visual.gd):
##   idle_s, idle_se, idle_e, idle_ne, idle_n, ... and walk_s, walk_se, ...
## West-facing animations (w, sw, nw) can be left out: the east-facing ones
## are mirrored. Paint s, n and the east side (e, se, ne), or add plain
## "idle" and "walk" animations as a fallback for any direction you skip.
## The sprite's origin (offset) should sit at the character's feet.

const DIRECTIONS := ["e", "se", "s", "sw", "w", "nw", "n", "ne"]
const MIRROR := {"w": "e", "sw": "se", "nw": "ne", "e": "w", "se": "sw", "ne": "nw"}

## World units walked per animation frame while walking.
@export var stride_per_frame := 9.0

var kind := ""
var _sprite: AnimatedSprite2D


func _ready() -> void:
	_sprite = get_node_or_null("Sprite")


func configure(new_kind: String) -> void:
	kind = new_kind


## [animation name, mirrored] for a state ("idle"/"walk") and direction,
## or ["", false] when nothing can be shown.
func _resolve(state: String, dir: String) -> Array:
	var frames := _frames()
	if frames == null:
		return ["", false]
	if frames.has_animation(state + "_" + dir):
		return [state + "_" + dir, false]
	if MIRROR.has(dir) and frames.has_animation(state + "_" + MIRROR[dir]):
		return [state + "_" + MIRROR[dir], true]
	if frames.has_animation(state):
		return [state, false]
	return ["", false]


## True when this visual has something to show for the state and direction
## (used by the content validator).
func can_show(state: String, dir: String) -> bool:
	return _resolve(state, dir)[0] != ""


func _frames() -> SpriteFrames:
	var sprite := _sprite if _sprite != null else get_node_or_null("Sprite") as AnimatedSprite2D
	return sprite.sprite_frames if sprite != null else null


func set_pose(sector: int, moving: bool, stride: float) -> void:
	if _sprite == null or _sprite.sprite_frames == null:
		return
	var base := "walk" if moving else "idle"
	var dir: String = DIRECTIONS[clampi(sector, 0, 7)]
	var resolved := _resolve(base, dir)
	var name: String = resolved[0]
	var flip: bool = resolved[1]
	if name == "":
		return
	_sprite.flip_h = flip
	if _sprite.animation != name:
		_sprite.play(name)
	if moving:
		# Tie the walk cycle to distance walked so feet do not slide.
		var count := _sprite.sprite_frames.get_frame_count(name)
		_sprite.pause()
		_sprite.frame = int(stride / stride_per_frame) % maxi(1, count)


func apply_state(_period: String, _flags: Array) -> void:
	pass
