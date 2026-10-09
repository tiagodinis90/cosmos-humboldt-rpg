extends Node2D
## Painted-character visual for artists. Make a scene with this script on the
## root and an AnimatedSprite2D child named "Sprite", give it SpriteFrames, and
## point a figure's "visual" (content/scenes/cumana.json) at the scene.
##
## Animation names, by direction (screen-relative, see figure_visual.gd):
##   idle_s, idle_se, idle_e, idle_ne, idle_n, ... and walk_s, walk_se, ...
## Only paint the directions you need: a missing west-facing animation is the
## east-facing one mirrored; a missing direction falls back to "idle"/"walk".
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


func set_pose(sector: int, moving: bool, stride: float) -> void:
	if _sprite == null or _sprite.sprite_frames == null:
		return
	var base := "walk" if moving else "idle"
	var dir: String = DIRECTIONS[clampi(sector, 0, 7)]
	var name := base + "_" + dir
	var flip := false
	if not _sprite.sprite_frames.has_animation(name) and MIRROR.has(dir) and _sprite.sprite_frames.has_animation(base + "_" + MIRROR[dir]):
		name = base + "_" + MIRROR[dir]
		flip = true
	if not _sprite.sprite_frames.has_animation(name):
		name = base
	if not _sprite.sprite_frames.has_animation(name):
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
